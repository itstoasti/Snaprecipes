import { getDatabase } from "@/db/client";
import { supabase } from "@/lib/supabase";
import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";
import type { Recipe, Ingredient, Step, Collection } from "@/db/schema";

// Shared helper: push one recipe (ingredients + steps) to Supabase and stamp remote_ids locally
async function pushSingleRecipe(
    db: SQLiteDatabase,
    userId: string,
    recipe: Recipe
): Promise<void> {
    const recipeRemoteId = Crypto.randomUUID();

    const ingredients = await db.getAllAsync<Ingredient>("SELECT * FROM ingredients WHERE recipe_id = ?", [recipe.id]);
    const steps = await db.getAllAsync<Step>("SELECT * FROM steps WHERE recipe_id = ?", [recipe.id]);

    const recipePayload = {
        id: recipeRemoteId,
        owner_id: userId,
        title: recipe.title,
        description: recipe.description,
        image_url: recipe.image_url,
        source_url: recipe.source_url,
        source_type: recipe.source_type,
        servings: recipe.servings,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
    };

    const ingredientsPayload = ingredients.map(ing => {
        const ingRemoteId = Crypto.randomUUID();
        db.runAsync(`UPDATE ingredients SET remote_id = ? WHERE id = ?`, [ingRemoteId, ing.id]);
        return {
            id: ingRemoteId,
            owner_id: userId,
            recipe_id: recipeRemoteId,
            text: ing.text,
            quantity: ing.quantity,
            unit: ing.unit,
            name: ing.name,
            order_index: ing.order_index,
        };
    });

    const stepsPayload = steps.map(step => {
        const stepRemoteId = Crypto.randomUUID();
        db.runAsync(`UPDATE steps SET remote_id = ? WHERE id = ?`, [stepRemoteId, step.id]);
        return {
            id: stepRemoteId,
            owner_id: userId,
            recipe_id: recipeRemoteId,
            text: step.text,
            step_number: step.step_number,
        };
    });

    await db.runAsync(`UPDATE recipes SET remote_id = ?, sync_status = 'synced' WHERE id = ?`, [recipeRemoteId, recipe.id]);

    const { error: rErr } = await supabase.from('recipes').insert(recipePayload);
    if (rErr) throw rErr;

    if (ingredientsPayload.length > 0) {
        const { error: iErr } = await supabase.from('ingredients').insert(ingredientsPayload);
        if (iErr) console.error("Error inserting ingredients:", iErr);
    }

    if (stepsPayload.length > 0) {
        const { error: sErr } = await supabase.from('steps').insert(stepsPayload);
        if (sErr) console.error("Error inserting steps:", sErr);
    }
}

// Shared helper: push one collection to Supabase and stamp remote_id locally
async function pushSingleCollection(
    db: SQLiteDatabase,
    userId: string,
    collection: Collection
): Promise<void> {
    const collectionRemoteId = Crypto.randomUUID();

    const payload = {
        id: collectionRemoteId,
        owner_id: userId,
        name: collection.name,
        color: collection.color,
        icon_name: collection.icon_name,
    };

    await db.runAsync(`UPDATE collections SET remote_id = ? WHERE id = ?`, [collectionRemoteId, collection.id]);

    const { error } = await supabase.from('collections').insert(payload);
    if (error) throw error;
}

export async function initialSync(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const db = await getDatabase();

    try {
        // Sync recipes
        const localRecipes = await db.getAllAsync<Recipe>("SELECT * FROM recipes WHERE remote_id IS NULL");
        if (localRecipes.length > 0) {
            if (__DEV__) console.log(`Starting initial sync of ${localRecipes.length} recipes to Supabase...`);
            for (const recipe of localRecipes) {
                await pushSingleRecipe(db, user.id, recipe);
            }
        }

        // Sync collections
        const localCollections = await db.getAllAsync<Collection>("SELECT * FROM collections WHERE remote_id IS NULL");
        if (localCollections.length > 0) {
            if (__DEV__) console.log(`Syncing ${localCollections.length} collections...`);
            for (const col of localCollections) {
                await pushSingleCollection(db, user.id, col);
            }
        }

        // Sync recipe_collections associations (only for recipes & collections that have remote_ids)
        const localAssociations = await db.getAllAsync<{ recipe_id: number; collection_id: number }>(
            "SELECT rc.recipe_id, rc.collection_id FROM recipe_collections rc"
        );
        for (const assoc of localAssociations) {
            const recipe = await db.getFirstAsync<{ remote_id: string | null }>("SELECT remote_id FROM recipes WHERE id = ?", [assoc.recipe_id]);
            const collection = await db.getFirstAsync<{ remote_id: string | null }>("SELECT remote_id FROM collections WHERE id = ?", [assoc.collection_id]);
            if (recipe?.remote_id && collection?.remote_id) {
                await supabase.from('recipe_collections').upsert({
                    owner_id: user.id,
                    recipe_id: recipe.remote_id,
                    collection_id: collection.remote_id,
                }, { onConflict: 'recipe_id,collection_id' });
            }
        }

        if (__DEV__) console.log("Initial sync completed.");
    } catch (e) {
        console.error("Initial Sync Failed:", e);
    }
}

// Call this after inserting a new recipe locally to push it to Supabase immediately.
// Safe to call without awaiting — errors are caught internally.
export async function syncNewRecipe(recipeId: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const db = await getDatabase();
    const recipe = await db.getFirstAsync<Recipe>(
        "SELECT * FROM recipes WHERE id = ? AND remote_id IS NULL",
        [recipeId]
    );
    if (!recipe) return; // not logged in previously or already synced

    try {
        await pushSingleRecipe(db, user.id, recipe);
    } catch (e) {
        console.error(`syncNewRecipe failed for recipe ${recipeId}:`, e);
    }
}

// Push a newly-created collection to Supabase immediately.
export async function syncNewCollection(collectionId: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const db = await getDatabase();
    const collection = await db.getFirstAsync<Collection>(
        "SELECT * FROM collections WHERE id = ? AND remote_id IS NULL",
        [collectionId]
    );
    if (!collection) return;

    try {
        await pushSingleCollection(db, user.id, collection);
    } catch (e) {
        console.error(`syncNewCollection failed for collection ${collectionId}:`, e);
    }
}

// Push a recipe<->collection association to Supabase.
export async function syncRecipeToCollection(recipeId: number, collectionId: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const db = await getDatabase();
    const recipe = await db.getFirstAsync<{ remote_id: string | null }>("SELECT remote_id FROM recipes WHERE id = ?", [recipeId]);
    const collection = await db.getFirstAsync<{ remote_id: string | null }>("SELECT remote_id FROM collections WHERE id = ?", [collectionId]);

    if (!recipe?.remote_id || !collection?.remote_id) return;

    try {
        const { error } = await supabase.from('recipe_collections').upsert({
            owner_id: user.id,
            recipe_id: recipe.remote_id,
            collection_id: collection.remote_id,
        }, { onConflict: 'recipe_id,collection_id' });
        if (error) console.error('syncRecipeToCollection error:', error);
    } catch (e) {
        console.error(`syncRecipeToCollection failed:`, e);
    }
}

// Remove a recipe<->collection association from Supabase.
export async function unsyncRecipeFromCollection(recipeId: number, collectionId: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const db = await getDatabase();
    const recipe = await db.getFirstAsync<{ remote_id: string | null }>("SELECT remote_id FROM recipes WHERE id = ?", [recipeId]);
    const collection = await db.getFirstAsync<{ remote_id: string | null }>("SELECT remote_id FROM collections WHERE id = ?", [collectionId]);

    if (!recipe?.remote_id || !collection?.remote_id) return;

    try {
        const { error } = await supabase.from('recipe_collections').delete()
            .eq('recipe_id', recipe.remote_id)
            .eq('collection_id', collection.remote_id);
        if (error) console.error('unsyncRecipeFromCollection error:', error);
    } catch (e) {
        console.error(`unsyncRecipeFromCollection failed:`, e);
    }
}

// Background sync: push local pending changes to Supabase
export async function pushPendingChanges(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const db = await getDatabase();
    const pending = await db.getAllAsync<any>(
        "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC"
    );

    if (pending.length === 0) return;

    for (const item of pending) {
        try {
            // For MVP, we will rely on initialSync() and manual pullRemoteChanges() for major structural syncs,
            // but this is where incremental pushes would be parsed from `payload` and sent to Supabase.
            
            // Mark as synced to clean the queue
            await db.runAsync("UPDATE sync_queue SET status = 'synced' WHERE id = ?", [item.id]);
        } catch (error) {
            console.error(`Sync failed for queue item ${item.id}:`, error);
        }
    }
}

// Pull all remote recipes for this user and upsert locally
export async function pullRemoteChanges(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const db = await getDatabase();
    
    try {
        if (__DEV__) console.log(`Pulling remote changes from Supabase...`);
        
        // 1. Fetch remote recipes
        const { data: remoteRecipes, error: rErr } = await supabase.from('recipes').select('*').eq('owner_id', user.id);
        if (rErr) throw rErr;
        
        if (!remoteRecipes || remoteRecipes.length === 0) return;

        // Fetch remote ingredients and steps
        const { data: remoteIngredients, error: iErr } = await supabase.from('ingredients').select('*').eq('owner_id', user.id);
        if (iErr) throw iErr;

        const { data: remoteSteps, error: sErr } = await supabase.from('steps').select('*').eq('owner_id', user.id);
        if (sErr) throw sErr;

        // 2. Insert or Update Local DB based on remote_id
        for (const rRecipe of remoteRecipes) {
            // Check if recipe exists locally by remote_id
            const existing = await db.getFirstAsync<Recipe>("SELECT id FROM recipes WHERE remote_id = ?", [rRecipe.id]);
            
            let localRecipeId;
            
            if (existing) {
                // Update
                localRecipeId = existing.id;
                await db.runAsync(
                    `UPDATE recipes SET title=?, description=?, image_url=?, source_url=?, source_type=?, servings=?, prep_time=?, cook_time=?, sync_status='synced' WHERE id=?`,
                    [rRecipe.title, rRecipe.description, rRecipe.image_url, rRecipe.source_url, rRecipe.source_type, rRecipe.servings, rRecipe.prep_time, rRecipe.cook_time, existing.id]
                );
            } else {
                // Insert
                const res = await db.runAsync(
                    `INSERT INTO recipes (remote_id, title, description, image_url, source_url, source_type, servings, prep_time, cook_time, sync_status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
                    [rRecipe.id, rRecipe.title, rRecipe.description, rRecipe.image_url, rRecipe.source_url, rRecipe.source_type, rRecipe.servings, rRecipe.prep_time, rRecipe.cook_time]
                );
                localRecipeId = res.lastInsertRowId;
            }

            // Sync Ingredients
            if (remoteIngredients) {
                const recipeMates = remoteIngredients.filter((ing: any) => ing.recipe_id === rRecipe.id);
                for (const rIng of recipeMates) {
                    const eIng = await db.getFirstAsync<{id: number}>("SELECT id FROM ingredients WHERE remote_id = ?", [rIng.id]);
                    if (eIng) {
                        await db.runAsync(`UPDATE ingredients SET text=?, quantity=?, unit=?, name=?, order_index=? WHERE id=?`, 
                            [rIng.text, rIng.quantity, rIng.unit, rIng.name, rIng.order_index, eIng.id]);
                    } else {
                        await db.runAsync(`INSERT INTO ingredients (remote_id, recipe_id, text, quantity, unit, name, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                            [rIng.id, localRecipeId, rIng.text, rIng.quantity, rIng.unit, rIng.name, rIng.order_index]);
                    }
                }
            }

            // Sync Steps
            if (remoteSteps) {
                const stepMates = remoteSteps.filter((step: any) => step.recipe_id === rRecipe.id);
                for (const rStep of stepMates) {
                    const eStep = await db.getFirstAsync<{id: number}>("SELECT id FROM steps WHERE remote_id = ?", [rStep.id]);
                    if (eStep) {
                        await db.runAsync(`UPDATE steps SET text=?, step_number=? WHERE id=?`, [rStep.text, rStep.step_number, eStep.id]);
                    } else {
                        await db.runAsync(`INSERT INTO steps (remote_id, recipe_id, text, step_number) VALUES (?, ?, ?, ?)`, 
                            [rStep.id, localRecipeId, rStep.text, rStep.step_number]);
                    }
                }
            }
        }

        // 3. Pull collections
        const { data: remoteCollections, error: cErr } = await supabase.from('collections').select('*').eq('owner_id', user.id);
        if (cErr) throw cErr;

        if (remoteCollections && remoteCollections.length > 0) {
            for (const rCol of remoteCollections) {
                const existing = await db.getFirstAsync<{ id: number }>(
                    "SELECT id FROM collections WHERE remote_id = ?", [rCol.id]
                );

                if (existing) {
                    await db.runAsync(
                        `UPDATE collections SET name=?, color=?, icon_name=? WHERE id=?`,
                        [rCol.name, rCol.color, rCol.icon_name, existing.id]
                    );
                } else {
                    await db.runAsync(
                        `INSERT INTO collections (remote_id, name, color, icon_name) VALUES (?, ?, ?, ?)`,
                        [rCol.id, rCol.name, rCol.color, rCol.icon_name]
                    );
                }
            }
        }

        // 4. Pull recipe_collections associations
        const { data: remoteRC, error: rcErr } = await supabase.from('recipe_collections').select('*').eq('owner_id', user.id);
        if (rcErr) throw rcErr;

        if (remoteRC && remoteRC.length > 0) {
            for (const rAssoc of remoteRC) {
                const localRecipe = await db.getFirstAsync<{ id: number }>("SELECT id FROM recipes WHERE remote_id = ?", [rAssoc.recipe_id]);
                const localCol = await db.getFirstAsync<{ id: number }>("SELECT id FROM collections WHERE remote_id = ?", [rAssoc.collection_id]);
                if (localRecipe && localCol) {
                    await db.runAsync(
                        `INSERT OR IGNORE INTO recipe_collections (recipe_id, collection_id) VALUES (?, ?)`,
                        [localRecipe.id, localCol.id]
                    );
                }
            }
        }
        
        if (__DEV__) console.log("Pull sync completed successfully.");
    } catch (e) {
        console.error("Pull Sync Failed:", e);
    }
}

export async function enqueueSync(
    tableName: string,
    recordId: number,
    operation: "insert" | "update" | "delete",
    payload?: Record<string, unknown>
): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT INTO sync_queue (table_name, record_id, operation, payload)
         VALUES (?, ?, ?, ?)`,
        [tableName, recordId, operation, payload ? JSON.stringify(payload) : null]
    );
}
