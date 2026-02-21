import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "@/db/client";
import type { Recipe, Ingredient, Step, ExtractedRecipe } from "@/db/schema";

export function useRecipes() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);

    const loadRecipes = useCallback(async () => {
        try {
            setLoading(true);
            const db = await getDatabase();
            const results = await db.getAllAsync<Recipe>(
                "SELECT * FROM recipes ORDER BY created_at DESC"
            );
            setRecipes(results);
        } catch (error) {
            console.error("Failed to load recipes:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRecipes();
    }, [loadRecipes]);

    const getRecipeById = useCallback(async (id: number) => {
        const db = await getDatabase();
        const recipe = await db.getFirstAsync<Recipe>(
            "SELECT * FROM recipes WHERE id = ?",
            [id]
        );
        if (!recipe) return null;
        const ingredients = await db.getAllAsync<Ingredient>(
            "SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY order_index",
            [id]
        );
        const steps = await db.getAllAsync<Step>(
            "SELECT * FROM steps WHERE recipe_id = ? ORDER BY step_number",
            [id]
        );
        return { recipe, ingredients, steps };
    }, []);

    const insertRecipe = useCallback(
        async (data: ExtractedRecipe, sourceUrl?: string, sourceType: Recipe["source_type"] = "url") => {
            const db = await getDatabase();
            const result = await db.runAsync(
                `INSERT INTO recipes (title, description, image_url, source_url, source_type, servings, prep_time, cook_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.title,
                    data.description || null,
                    data.imageUrl || null,
                    sourceUrl || null,
                    sourceType,
                    data.servings || 4,
                    data.prepTime || null,
                    data.cookTime || null,
                ]
            );
            const recipeId = result.lastInsertRowId;

            // Insert ingredients
            for (let i = 0; i < data.ingredients.length; i++) {
                const ing = data.ingredients[i];
                await db.runAsync(
                    `INSERT INTO ingredients (recipe_id, text, quantity, unit, name, order_index)
           VALUES (?, ?, ?, ?, ?, ?)`,
                    [recipeId, ing.text, ing.quantity || null, ing.unit || null, ing.name, i]
                );
            }

            // Insert steps
            for (const step of data.steps) {
                await db.runAsync(
                    `INSERT INTO steps (recipe_id, text, step_number)
           VALUES (?, ?, ?)`,
                    [recipeId, step.text, step.stepNumber]
                );
            }

            // Insert tags
            if (data.tags) {
                for (const tagName of data.tags) {
                    await db.runAsync(
                        `INSERT OR IGNORE INTO tags (name) VALUES (?)`,
                        [tagName]
                    );
                    const tag = await db.getFirstAsync<{ id: number }>(
                        "SELECT id FROM tags WHERE name = ?",
                        [tagName]
                    );
                    if (tag) {
                        await db.runAsync(
                            `INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)`,
                            [recipeId, tag.id]
                        );
                    }
                }
            }

            // Refresh list
            await loadRecipes();
            return recipeId;
        },
        [loadRecipes]
    );

    const deleteRecipe = useCallback(
        async (id: number) => {
            const db = await getDatabase();
            await db.runAsync("DELETE FROM recipes WHERE id = ?", [id]);
            await loadRecipes();
        },
        [loadRecipes]
    );

    const filterByCollection = useCallback(async (collectionId: number) => {
        const db = await getDatabase();
        const results = await db.getAllAsync<Recipe>(
            `SELECT r.* FROM recipes r
       INNER JOIN recipe_collections rc ON r.id = rc.recipe_id
       WHERE rc.collection_id = ?
       ORDER BY r.created_at DESC`,
            [collectionId]
        );
        setRecipes(results);
    }, []);

    const filterByTag = useCallback(async (tagId: number) => {
        const db = await getDatabase();
        const results = await db.getAllAsync<Recipe>(
            `SELECT r.* FROM recipes r
       INNER JOIN recipe_tags rt ON r.id = rt.recipe_id
       WHERE rt.tag_id = ?
       ORDER BY r.created_at DESC`,
            [tagId]
        );
        setRecipes(results);
    }, []);

    return {
        recipes,
        loading,
        loadRecipes,
        getRecipeById,
        insertRecipe,
        deleteRecipe,
        filterByCollection,
        filterByTag,
    };
}
