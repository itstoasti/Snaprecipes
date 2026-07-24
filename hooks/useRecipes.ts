import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "@/db/client";
import { syncNewRecipe, pushPendingChanges, pullRemoteChanges, syncUpdateRecipe } from "@/lib/sync";
import { extractFromUrl } from "@/lib/extract";
import { supabase } from "@/lib/supabase";
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
                `INSERT INTO recipes (title, description, image_url, source_url, source_type, servings, prep_time, cook_time, calories, protein, fat, carbs, sugar, fiber, sodium)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.title,
                    data.description || null,
                    data.imageUrl || null,
                    sourceUrl || null,
                    sourceType,
                    data.servings || 4,
                    data.prepTime || null,
                    data.cookTime || null,
                    data.calories || null,
                    data.protein || null,
                    data.fat || null,
                    data.carbs || null,
                    data.sugar || null,
                    data.fiber || null,
                    data.sodium || null,
                ]
            );
            const recipeId = result.lastInsertRowId;

            // Insert ingredients
            for (let i = 0; i < data.ingredients.length; i++) {
                const ing = data.ingredients[i];
                await db.runAsync(
                    `INSERT INTO ingredients (recipe_id, text, quantity, unit, name, section, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [recipeId, ing.text, ing.quantity || null, ing.unit || null, ing.name, ing.section || null, i]
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

            // Check if the recipe has been synced to Supabase
            const recipe = await db.getFirstAsync<{ remote_id: string | null }>(
                "SELECT remote_id FROM recipes WHERE id = ?",
                [id]
            );

            // Delete locally (with manual cascades to prevent foreign key errors on older SQLite setups)
            await db.runAsync("DELETE FROM ingredients WHERE recipe_id = ?", [id]);
            await db.runAsync("DELETE FROM steps WHERE recipe_id = ?", [id]);
            await db.runAsync("DELETE FROM recipe_collections WHERE recipe_id = ?", [id]);
            await db.runAsync("DELETE FROM recipe_tags WHERE recipe_id = ?", [id]);
            await db.runAsync("DELETE FROM meal_plans WHERE recipe_id = ?", [id]);
            await db.runAsync("UPDATE shopping_items SET source_recipe_id = NULL WHERE source_recipe_id = ?", [id]);
            await db.runAsync("UPDATE food_logs SET source_recipe_id = NULL WHERE source_recipe_id = ?", [id]);
            await db.runAsync("DELETE FROM recipes WHERE id = ?", [id]);

            // Also delete from Supabase if it was synced (fire-and-forget)
            if (recipe?.remote_id) {
                (async () => {
                    try {
                        await supabase.from('steps').delete().eq('recipe_id', recipe.remote_id);
                        await supabase.from('ingredients').delete().eq('recipe_id', recipe.remote_id);
                        const { error } = await supabase.from('recipes').delete().eq('id', recipe.remote_id);
                        if (error) console.error("Failed to delete recipe from Supabase:", error);
                        else console.log("Recipe deleted from Supabase:", recipe.remote_id);
                    } catch (e) {
                        console.error("Supabase delete failed:", e);
                    }
                })();
            }

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
            ingredients?: { id?: number; text: string; quantity?: string; unit?: string; name: string; section?: string }[],
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
                            `UPDATE ingredients SET text = ?, quantity = ?, unit = ?, name = ?, section = ?, order_index = ? WHERE id = ?`,
                            [ing.text, ing.quantity || null, ing.unit || null, ing.name, ing.section || null, i, ing.id]
                        );
                    } else {
                        // Insert new
                        await db.runAsync(
                            `INSERT INTO ingredients (recipe_id, text, quantity, unit, name, section, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [recipeId, ing.text, ing.quantity || null, ing.unit || null, ing.name, ing.section || null, i]
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

            // Push update to cloud (fire-and-forget)
            syncUpdateRecipe(recipeId);
        },
        [loadRecipes]
    );

    const getCommunityRecipeById = useCallback(async (id: string) => {
        const { data, error } = await supabase
            .from("public_recipes")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) {
            console.error("Failed to fetch community recipe:", error);
            return null;
        }

        // Map public_recipes schema to internal Recipe/Ingredient/Step schema
        const recipe: Recipe = {
            id: 0, // Placeholder
            remote_id: null,
            title: data.title,
            description: data.description,
            image_url: data.image_url,
            source_url: data.source_url,
            source_type: "url",
            servings: data.servings,
            prep_time: data.prep_time,
            cook_time: data.cook_time,
            calories: data.calories,
            protein: data.protein,
            fat: data.fat,
            carbs: data.carbs,
            sugar: data.sugar,
            fiber: data.fiber,
            sodium: data.sodium,
            sync_status: "synced",
            created_at: data.created_at,
            updated_at: data.created_at
        };

        const ingredients: Ingredient[] = (data.ingredients || []).map((ing: any, idx: number) => ({
            id: idx,
            remote_id: null,
            recipe_id: 0,
            text: ing.text,
            quantity: ing.quantity,
            unit: ing.unit,
            name: ing.name,
            section: ing.section,
            order_index: idx,
            checked: false
        }));

        const steps: Step[] = (data.steps || []).map((step: any, idx: number) => ({
            id: idx,
            remote_id: null,
            recipe_id: 0,
            text: step.text,
            step_number: step.step_number || (idx + 1),
            checked: false
        }));

        return { recipe, ingredients, steps };
    }, []);

    const saveCommunityRecipe = useCallback(async (publicId: string) => {
        const data = await getCommunityRecipeById(publicId);
        if (!data) return null;

        const newId = await insertRecipe({
            title: data.recipe.title,
            description: data.recipe.description || "",
            imageUrl: data.recipe.image_url || "",
            servings: data.recipe.servings,
            prepTime: data.recipe.prep_time || "",
            cookTime: data.recipe.cook_time || "",
            calories: data.recipe.calories ?? undefined,
            protein: data.recipe.protein ?? undefined,
            fat: data.recipe.fat ?? undefined,
            carbs: data.recipe.carbs ?? undefined,
            ingredients: data.ingredients.map(i => ({
                text: i.text,
                name: i.name,
                quantity: i.quantity || "",
                unit: i.unit || "",
                section: i.section || ""
            })),
            steps: data.steps.map(s => ({
                text: s.text,
                stepNumber: s.step_number
            }))
        }, data.recipe.source_url || undefined, "url");

        return newId;
    }, [getCommunityRecipeById, insertRecipe]);

    const searchCommunityRecipes = useCallback(async (query: string) => {
        if (!query.trim()) {
            const { data, error } = await supabase
                .from("public_recipes")
                .select("*")
                .not("calories", "is", null)
                .order("created_at", { ascending: false })
                .limit(20);
            if (error) throw error;
            return data || [];
        }

        const cleanQuery = query.trim().replace(/,+/g, "").replace(/\s+/g, " ");
        let words = cleanQuery.toLowerCase().split(" ").filter(w => w.length > 2);

        // Broad category expansion dictionary to map group names to specific ingredients/tags
        const CATEGORY_MAP: Record<string, string[]> = {
            fish: ["salmon", "tuna", "cod", "tilapia", "halibut", "trout", "snapper", "haddock", "bass", "seafood"],
            seafood: ["shrimp", "prawn", "crab", "lobster", "scallop", "mussel", "clam", "oyster", "squid", "octopus", "fish", "salmon", "tuna", "cod", "tilapia", "halibut", "trout", "snapper", "haddock", "bass"],
            poultry: ["chicken", "turkey", "duck"],
            meat: ["beef", "pork", "steak", "lamb", "veal", "venison", "chicken", "turkey"],
        };

        // Expand search words if any match a broad category key
        const expandedWords = new Set<string>(words);
        words.forEach(w => {
            if (CATEGORY_MAP[w]) {
                CATEGORY_MAP[w].forEach(term => expandedWords.add(term));
            }
        });
        words = Array.from(expandedWords);

        // Build PostgREST .or filter checking both title and tags
        let orFilter = `title.ilike.%${cleanQuery}%`;

        words.forEach(word => {
            orFilter += `,tags.cs.{${word}}`;
            const withHyphens = word.replace(/\s+/g, "-");
            if (withHyphens !== word) {
                orFilter += `,tags.cs.{${withHyphens}}`;
            }
        });

        const fullNormalized = cleanQuery.toLowerCase();
        const fullWithHyphens = fullNormalized.replace(/\s+/g, "-");
        orFilter += `,tags.cs.{${fullNormalized}},tags.cs.{${fullWithHyphens}}`;

        const { data, error } = await supabase
            .from("public_recipes")
            .select("*")
            .not("calories", "is", null)
            .or(orFilter)
            .limit(100);

        if (error) throw error;
        if (!data) return [];

        // Rank the results:
        // Tier 1: Title matches exact query (case-insensitive)
        // Tier 2: Title starts with query
        // Tier 3: Title contains full query
        // Tier 4: Title contains a higher number of the individual search words
        // Tier 5: Fallback relevance (quality_score or save_count)
        const lowerQuery = cleanQuery.toLowerCase();
        const queryWords = lowerQuery.split(" ");

        return data.sort((a, b) => {
            const aTitle = a.title.toLowerCase();
            const bTitle = b.title.toLowerCase();

            // Tier 1: Exact title match
            const aExact = aTitle === lowerQuery;
            const bExact = bTitle === lowerQuery;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            // Tier 2: Starts with title
            const aStarts = aTitle.startsWith(lowerQuery);
            const bStarts = bTitle.startsWith(lowerQuery);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            // Tier 3: Contains full query in title
            const aContains = aTitle.includes(lowerQuery);
            const bContains = bTitle.includes(lowerQuery);
            if (aContains && !bContains) return -1;
            if (!aContains && bContains) return 1;

            // Tier 4: Count of word matches in the title
            const getWordMatches = (title: string) => {
                let matches = 0;
                queryWords.forEach(w => {
                    if (w.length > 2 && title.includes(w)) matches++;
                });
                return matches;
            };
            const aMatches = getWordMatches(aTitle);
            const bMatches = getWordMatches(bTitle);
            if (bMatches !== aMatches) return bMatches - aMatches;

            // Tier 5: Fallback: Quality score and save count
            const aScore = a.quality_score || 0;
            const bScore = b.quality_score || 0;
            if (bScore !== aScore) return bScore - aScore;

            const aSaves = a.save_count || 0;
            const bSaves = b.save_count || 0;
            if (bSaves !== aSaves) return bSaves - aSaves;

            // Fallback: Created date (newest first)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, []);

    const shareRecipeToCommunity = useCallback(async (recipeData: ExtractedRecipe) => {
        try {
            const { error } = await supabase.rpc('share_to_community_rpc', {
                recipe_data: recipeData
            });

            if (error) {
                console.warn("Failed to share recipe to community:", error);
                return false;
            }
            return true;
        } catch (e) {
            console.error("Error sharing to community:", e);
            return false;
        }
    }, []);

    return {
        recipes,
        loading,
        loadRecipes,
        getRecipeById,
        getCommunityRecipeById,
        searchCommunityRecipes,
        saveCommunityRecipe,
        shareRecipeToCommunity,
        insertRecipe,
        deleteRecipe,
        updateRecipe,
        filterByCollection,
        filterByTag,
        repairBrokenImages: useCallback(async () => {
            const db = await getDatabase();
            const recipesToRepair = await db.getAllAsync<Recipe>(
                `SELECT * FROM recipes 
                 WHERE source_url IS NOT NULL 
                 AND (
                    image_url IS NULL 
                    OR image_url LIKE '%cdninstagram.com%' 
                    OR image_url LIKE '%fbcdn.net%' 
                    OR image_url LIKE '%scontent%' 
                    OR image_url LIKE '%fb.watch%'
                    OR image_url LIKE '%tiktokcdn%' 
                    OR image_url LIKE '%tiktok.com%'
                    OR image_url LIKE '%pinterest.com%'
                 )`
            );

            // Debug: Log if there are ANY recipes that AREN'T being picked up but seem suspicious
            if (__DEV__) {
                const total = await db.getAllAsync<Recipe>("SELECT * FROM recipes WHERE source_url IS NOT NULL");
                const excluded = total.filter(r => !recipesToRepair.some(tr => tr.id === r.id));
                const suspicious = excluded.filter(r => 
                    r.image_url && (r.image_url.includes("p16-") || r.image_url.includes("byteimg.com"))
                );
                if (suspicious.length > 0) {
                    console.log(`[Repair] Found ${suspicious.length} suspicious but excluded recipes:`, suspicious.map(s => s.title));
                }
            }

            console.log(`[Repair] Found ${recipesToRepair.length} recipes to repair.`);
            let successCount = 0;
            for (const recipe of recipesToRepair) {
                try {
                        console.log(`[Repair] Checking recipe ${recipe.id}: ${recipe.title}`);
                        if (!recipe.source_url) {
                            console.log(`[Repair] No source URL for recipe ${recipe.id}, skipping.`);
                            continue;
                        }
                        const extractedArr = await extractFromUrl(recipe.source_url, true);
                        const extracted = extractedArr[0];
                        if (extracted.imageUrl && extracted.imageUrl !== recipe.image_url) {
                        console.log(`[Repair] Updating image for recipe ${recipe.id}: ${extracted.imageUrl}`);
                        await db.runAsync(
                            "UPDATE recipes SET image_url = ?, updated_at = ? WHERE id = ?",
                            [extracted.imageUrl, new Date().toISOString(), recipe.id]
                        );
                        // Await sync to cloud for repair persistence
                        try {
                            await syncUpdateRecipe(recipe.id);
                            successCount++;
                            console.log(`[Repair] Successfully synced recipe ${recipe.id}`);
                        } catch (syncErr) {
                            console.error(`[Repair] Failed to sync recipe ${recipe.id} to cloud:`, syncErr);
                            // We keep the local update, but won't count it as a "full" success
                            // or maybe we should to show visual progress? Let's count it since local DB is updated.
                            successCount++; 
                        }
                    }
                } catch (e) {
                    console.error(`Failed to repair recipe ${recipe.id}:`, e);
                }
            }
            await loadRecipes();
            return successCount;
        }, [loadRecipes]),
    };
}
