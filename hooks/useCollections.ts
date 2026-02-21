import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "@/db/client";
import type { Collection } from "@/db/schema";

export function useCollections() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);

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
            return result.lastInsertRowId;
        },
        [loadCollections]
    );

    const deleteCollection = useCallback(
        async (id: number) => {
            const db = await getDatabase();
            await db.runAsync("DELETE FROM collections WHERE id = ?", [id]);
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
        },
        []
    );

    const removeRecipeFromCollection = useCallback(
        async (recipeId: number, collectionId: number) => {
            const db = await getDatabase();
            await db.runAsync(
                `DELETE FROM recipe_collections WHERE recipe_id = ? AND collection_id = ?`,
                [recipeId, collectionId]
            );
        },
        []
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
