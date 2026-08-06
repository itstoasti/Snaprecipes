import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "@/db/client";
import type { ShoppingItem, ShoppingCategory, Ingredient, MealPlan } from "@/db/schema";
import { aggregateIngredients } from "@/lib/ingredientAggregation";
import { categorizeIngredient } from "@/lib/ingredientCategorizer";
import { syncNewShoppingItem, syncUpdateShoppingItem, unsyncShoppingItem } from "@/lib/sync";

export function useShoppingList() {
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [categories, setCategories] = useState<ShoppingCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const loadItems = useCallback(async () => {
        try {
            setLoading(true);
            const db = await getDatabase();
            const results = await db.getAllAsync<ShoppingItem>(
                "SELECT * FROM shopping_items ORDER BY created_at ASC"
            );
            setItems(results);
        } catch (error) {
            console.error("Failed to load shopping list:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadCategories = useCallback(async () => {
        try {
            const db = await getDatabase();
            const results = await db.getAllAsync<ShoppingCategory>(
                "SELECT * FROM shopping_categories ORDER BY sort_order ASC, name ASC"
            );
            setCategories(results);
        } catch (error) {
            console.error("Failed to load shopping categories:", error);
        }
    }, []);

    useEffect(() => {
        loadItems();
        loadCategories();
    }, [loadItems, loadCategories]);

    const addItem = useCallback(async (name: string, quantity?: string, unit?: string, category?: string) => {
        const db = await getDatabase();
        const resolvedCategory = category || categorizeIngredient(name);
        const res = await db.runAsync(
            "INSERT INTO shopping_items (name, quantity, unit, category) VALUES (?, ?, ?, ?)",
            [name, quantity || null, unit || null, resolvedCategory]
        );
        if (res.lastInsertRowId) {
            syncNewShoppingItem(res.lastInsertRowId);
        }
        await loadItems();
    }, [loadItems]);

    const toggleItem = useCallback(async (id: number, isChecked: boolean) => {
        const db = await getDatabase();
        await db.runAsync("UPDATE shopping_items SET is_checked = ? WHERE id = ?", [isChecked ? 1 : 0, id]);
        syncUpdateShoppingItem(id);
        await loadItems();
    }, [loadItems]);

    const updateItemCategory = useCallback(async (id: number, category: string) => {
        const db = await getDatabase();
        await db.runAsync("UPDATE shopping_items SET category = ? WHERE id = ?", [category, id]);
        syncUpdateShoppingItem(id);
        await loadItems();
    }, [loadItems]);

    const deleteItem = useCallback(async (id: number) => {
        const db = await getDatabase();
        const item = await db.getFirstAsync<{ remote_id: string | null }>("SELECT remote_id FROM shopping_items WHERE id = ?", [id]);

        await db.runAsync("DELETE FROM shopping_items WHERE id = ?", [id]);

        if (item?.remote_id) {
            unsyncShoppingItem(item.remote_id);
        }

        await loadItems();
    }, [loadItems]);

    const clearChecked = useCallback(async () => {
        const db = await getDatabase();
        const checkedItems = await db.getAllAsync<{ remote_id: string | null }>("SELECT remote_id FROM shopping_items WHERE is_checked = 1");

        await db.runAsync("DELETE FROM shopping_items WHERE is_checked = 1");

        for (const item of checkedItems) {
            if (item.remote_id) {
                unsyncShoppingItem(item.remote_id);
            }
        }

        await loadItems();
    }, [loadItems]);

    const clearAll = useCallback(async () => {
        const db = await getDatabase();
        const allItems = await db.getAllAsync<{ remote_id: string | null }>("SELECT remote_id FROM shopping_items");

        await db.runAsync("DELETE FROM shopping_items");

        for (const item of allItems) {
            if (item.remote_id) {
                unsyncShoppingItem(item.remote_id);
            }
        }

        await loadItems();
    }, [loadItems]);

    const addCategory = useCallback(async (name: string, emoji: string, tint: string) => {
        const db = await getDatabase();
        const trimmed = name.trim();
        if (!trimmed) return false;
        const existing = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM shopping_categories WHERE name = ?",
            [trimmed]
        );
        if (existing) return false;
        const maxOrder = await db.getFirstAsync<{ max: number | null }>(
            "SELECT MAX(sort_order) as max FROM shopping_categories"
        );
        await db.runAsync(
            "INSERT INTO shopping_categories (name, emoji, tint, sort_order, is_builtin) VALUES (?, ?, ?, ?, 0)",
            [trimmed, emoji, tint, (maxOrder?.max ?? 0) + 1]
        );
        await loadCategories();
        return true;
    }, [loadCategories]);

    const renameCategory = useCallback(async (id: number, name: string, emoji: string) => {
        const db = await getDatabase();
        const trimmed = name.trim();
        if (!trimmed) return;
        const current = await db.getFirstAsync<{ name: string }>(
            "SELECT name FROM shopping_categories WHERE id = ?",
            [id]
        );
        if (!current) return;

        await db.runAsync(
            "UPDATE shopping_categories SET name = ?, emoji = ? WHERE id = ?",
            [trimmed, emoji, id]
        );

        if (current.name !== trimmed) {
            const affected = await db.getAllAsync<{ id: number; remote_id: string | null }>(
                "SELECT id, remote_id FROM shopping_items WHERE category = ?",
                [current.name]
            );
            await db.runAsync("UPDATE shopping_items SET category = ? WHERE category = ?", [trimmed, current.name]);
            for (const item of affected) {
                if (item.remote_id) syncUpdateShoppingItem(item.id);
            }
        }

        await loadCategories();
        await loadItems();
    }, [loadCategories, loadItems]);

    const deleteCategory = useCallback(async (id: number) => {
        const db = await getDatabase();
        const target = await db.getFirstAsync<{ name: string; is_builtin: boolean }>(
            "SELECT name, is_builtin FROM shopping_categories WHERE id = ?",
            [id]
        );
        if (!target || target.is_builtin) return;

        const affected = await db.getAllAsync<{ id: number; remote_id: string | null }>(
            "SELECT id, remote_id FROM shopping_items WHERE category = ?",
            [target.name]
        );
        await db.runAsync("UPDATE shopping_items SET category = 'Other' WHERE category = ?", [target.name]);
        for (const item of affected) {
            if (item.remote_id) syncUpdateShoppingItem(item.id);
        }

        await db.runAsync("DELETE FROM shopping_categories WHERE id = ?", [id]);
        await loadCategories();
        await loadItems();
    }, [loadCategories, loadItems]);

    const generateFromMealPlan = useCallback(async (startDate: string, endDate: string): Promise<number> => {
        const db = await getDatabase();

        const plans = await db.getAllAsync<MealPlan>(
            "SELECT * FROM meal_plans WHERE planned_date BETWEEN ? AND ?",
            [startDate, endDate]
        );

        if (plans.length === 0) return 0;

        const ingredientsWithRecipe: any[] = [];
        for (const plan of plans) {
            const recipe = await db.getFirstAsync<{ servings: number }>(
                "SELECT servings FROM recipes WHERE id = ?",
                [plan.recipe_id]
            );
            const ingredients = await db.getAllAsync<Ingredient>(
                "SELECT * FROM ingredients WHERE recipe_id = ?",
                [plan.recipe_id]
            );

            for (const ing of ingredients) {
                ingredientsWithRecipe.push({
                    ingredient: ing,
                    mealPlanServings: plan.servings,
                    recipeServings: recipe?.servings || 4
                });
            }
        }

        const aggregated = aggregateIngredients(ingredientsWithRecipe);

        let addedCount = 0;
        for (const item of aggregated) {
            const res = await db.runAsync(
                "INSERT INTO shopping_items (name, quantity, unit, category, source_recipe_id) VALUES (?, ?, ?, ?, ?)",
                [
                    (item.name || ""),
                    (item.quantity || null),
                    (item.unit || null),
                    categorizeIngredient(item.name),
                    (item.source_recipe_id || null),
                ]
            );
            if (res.lastInsertRowId) {
                syncNewShoppingItem(res.lastInsertRowId);
                addedCount++;
            }
        }

        await loadItems();
        return addedCount;
    }, [loadItems]);

    const addItemsFromRecipe = useCallback(async (recipeId: number) => {
        const db = await getDatabase();

        const ingredients = await db.getAllAsync<Ingredient>(
            "SELECT * FROM ingredients WHERE recipe_id = ?",
            [recipeId]
        );

        if (ingredients.length === 0) return;

        for (const ing of ingredients) {
            const res = await db.runAsync(
                "INSERT INTO shopping_items (name, quantity, unit, category, source_recipe_id) VALUES (?, ?, ?, ?, ?)",
                [ing.name, ing.quantity || null, ing.unit || null, categorizeIngredient(ing.name), recipeId]
            );
            if (res.lastInsertRowId) {
                syncNewShoppingItem(res.lastInsertRowId);
            }
        }

        await loadItems();
    }, [loadItems]);

    return {
        items,
        categories,
        loading,
        addItem,
        toggleItem,
        updateItemCategory,
        deleteItem,
        clearChecked,
        clearAll,
        addCategory,
        renameCategory,
        deleteCategory,
        generateFromMealPlan,
        addItemsFromRecipe,
    };
}
