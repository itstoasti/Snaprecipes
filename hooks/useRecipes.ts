import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "@/db/client";
import { syncNewRecipe } from "@/lib/sync";
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

            // Push to cloud if user is signed in (fire-and-forget)
            syncNewRecipe(recipeId);

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

    const updateRecipe = useCallback(
        async (
            recipeId: number,
            updates: {
                title?: string;
                description?: string;
                servings?: number;
                prep_time?: string;
                cook_time?: string;
                image_url?: string;
            },
            ingredients?: { id?: number; text: string; quantity?: string; unit?: string; name: string }[],
            steps?: { id?: number; text: string; step_number: number }[]
        ) => {
            const db = await getDatabase();

            // Update recipe fields
            const updateFields: string[] = [];
            const updateValues: (string | number | null)[] = [];

            if (updates.title !== undefined) {
                updateFields.push("title = ?");
                updateValues.push(updates.title);
            }
            if (updates.description !== undefined) {
                updateFields.push("description = ?");
                updateValues.push(updates.description || null);
            }
            if (updates.servings !== undefined) {
                updateFields.push("servings = ?");
                updateValues.push(updates.servings);
            }
            if (updates.prep_time !== undefined) {
                updateFields.push("prep_time = ?");
                updateValues.push(updates.prep_time || null);
            }
            if (updates.cook_time !== undefined) {
                updateFields.push("cook_time = ?");
                updateValues.push(updates.cook_time || null);
            }
            if (updates.image_url !== undefined) {
                updateFields.push("image_url = ?");
                updateValues.push(updates.image_url || null);
            }

            if (updateFields.length > 0) {
                updateFields.push("updated_at = datetime('now')");
                updateValues.push(recipeId);
                await db.runAsync(
                    `UPDATE recipes SET ${updateFields.join(", ")} WHERE id = ?`,
                    updateValues
                );
            }

            // Update ingredients if provided
            if (ingredients) {
                // Get existing ingredient IDs
                const existingIngredients = await db.getAllAsync<{ id: number }>(
                    "SELECT id FROM ingredients WHERE recipe_id = ?",
                    [recipeId]
                );
                const existingIds = new Set(existingIngredients.map((i) => i.id));
                const updatedIds = new Set(ingredients.filter((i) => i.id).map((i) => i.id));

                // Delete removed ingredients
                for (const existing of existingIngredients) {
                    if (!updatedIds.has(existing.id)) {
                        await db.runAsync("DELETE FROM ingredients WHERE id = ?", [existing.id]);
                    }
                }

                // Update existing and insert new ingredients
                for (let i = 0; i < ingredients.length; i++) {
                    const ing = ingredients[i];
                    if (ing.id && existingIds.has(ing.id)) {
                        // Update existing
                        await db.runAsync(
                            `UPDATE ingredients SET text = ?, quantity = ?, unit = ?, name = ?, order_index = ? WHERE id = ?`,
                            [ing.text, ing.quantity || null, ing.unit || null, ing.name, i, ing.id]
                        );
                    } else {
                        // Insert new
                        await db.runAsync(
                            `INSERT INTO ingredients (recipe_id, text, quantity, unit, name, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
                            [recipeId, ing.text, ing.quantity || null, ing.unit || null, ing.name, i]
                        );
                    }
                }
            }

            // Update steps if provided
            if (steps) {
                // Get existing step IDs
                const existingSteps = await db.getAllAsync<{ id: number }>(
                    "SELECT id FROM steps WHERE recipe_id = ?",
                    [recipeId]
                );
                const existingIds = new Set(existingSteps.map((s) => s.id));
                const updatedIds = new Set(steps.filter((s) => s.id).map((s) => s.id));

                // Delete removed steps
                for (const existing of existingSteps) {
                    if (!updatedIds.has(existing.id)) {
                        await db.runAsync("DELETE FROM steps WHERE id = ?", [existing.id]);
                    }
                }

                // Update existing and insert new steps
                for (const step of steps) {
                    if (step.id && existingIds.has(step.id)) {
                        // Update existing
                        await db.runAsync(
                            `UPDATE steps SET text = ?, step_number = ? WHERE id = ?`,
                            [step.text, step.step_number, step.id]
                        );
                    } else {
                        // Insert new
                        await db.runAsync(
                            `INSERT INTO steps (recipe_id, text, step_number) VALUES (?, ?, ?)`,
                            [recipeId, step.text, step.step_number]
                        );
                    }
                }
            }

            await loadRecipes();
        },
        [loadRecipes]
    );

    return {
        recipes,
        loading,
        loadRecipes,
        getRecipeById,
        insertRecipe,
        deleteRecipe,
        updateRecipe,
        filterByCollection,
        filterByTag,
    };
}
