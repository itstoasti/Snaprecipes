import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "@/db/client";
import { syncNewCollection, syncRecipeToCollection, unsyncRecipeFromCollection } from "@/lib/sync";
import { supabase } from "@/lib/supabase";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import type { Collection } from "@/db/schema";

export function useCollections() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const { isPro } = useRevenueCat();

    const loadCollections = useCallback(async () => {
        try {
            setLoading(true);
            const db = await getDatabase();
            const results = await db.getAllAsync<Collection>(
                "SELECT * FROM collections ORDER BY created_at DESC"
            );
            setCollections(results);
        } catch (error) {
            console.error("Failed to load collections:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCollections();
    }, [loadCollections]);

    const createCollection = useCallback(
        async (name: string, color: string = "#FF6B35", iconName: string = "folder") => {
            const db = await getDatabase();
            const result = await db.runAsync(
                `INSERT INTO collections (name, color, icon_name) VALUES (?, ?, ?)`,
                [name, color, iconName]
            );
            await loadCollections();

            // Push to cloud if user is Pro (fire-and-forget)
            if (isPro) {
                syncNewCollection(result.lastInsertRowId);
            }

            return result.lastInsertRowId;
        },
        [loadCollections, isPro]
    );

    const deleteCollection = useCallback(
        async (id: number) => {
            const db = await getDatabase();

            // Check if collection was synced to Supabase
            const col = await db.getFirstAsync<{ remote_id: string | null }>(
                "SELECT remote_id FROM collections WHERE id = ?",
                [id]
            );

            await db.runAsync("DELETE FROM collections WHERE id = ?", [id]);

            // Also delete from Supabase if synced (fire-and-forget)
            if (col?.remote_id) {
                (async () => {
                    try {
                        await supabase.from('recipe_collections').delete().eq('collection_id', col.remote_id);
                        const { error } = await supabase.from('collections').delete().eq('id', col.remote_id);
                        if (error) console.error("Failed to delete collection from Supabase:", error);
                    } catch (e) {
                        console.error("Supabase collection delete failed:", e);
                    }
                })();
            }

            await loadCollections();
        },
        [loadCollections]
    );

    const addRecipeToCollection = useCallback(
        async (recipeId: number, collectionId: number) => {
            const db = await getDatabase();
            await db.runAsync(
                `INSERT OR IGNORE INTO recipe_collections (recipe_id, collection_id) VALUES (?, ?)`,
                [recipeId, collectionId]
            );

            // Push association to cloud if Pro (fire-and-forget)
            if (isPro) {
                syncRecipeToCollection(recipeId, collectionId);
            }
        },
        [isPro]
    );

    const removeRecipeFromCollection = useCallback(
        async (recipeId: number, collectionId: number) => {
            const db = await getDatabase();
            await db.runAsync(
                `DELETE FROM recipe_collections WHERE recipe_id = ? AND collection_id = ?`,
                [recipeId, collectionId]
            );

            // Remove association from cloud if Pro (fire-and-forget)
            if (isPro) {
                unsyncRecipeFromCollection(recipeId, collectionId);
            }
        },
        [isPro]
    );

    return {
        collections,
        loading,
        loadCollections,
        createCollection,
        deleteCollection,
        addRecipeToCollection,
        removeRecipeFromCollection,
    };
}
