import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "@/db/client";
import type { ShoppingItem, Ingredient, MealPlan } from "@/db/schema";
import { aggregateIngredients } from "@/lib/ingredientAggregation";
import { syncNewShoppingItem, syncUpdateShoppingItem, unsyncShoppingItem } from "@/lib/sync";

export function useShoppingList() {
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadItems = useCallback(async () => {
        try {
            setLoading(true);
            const db = await getDatabase();
            const results = await db.getAllAsync<ShoppingItem>(
                "SELECT * FROM shopping_items ORDER BY is_checked ASC, created_at DESC"
            );
            setItems(results);
        } catch (error) {
            console.error("Failed to load shopping list:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const addItem = useCallback(async (name: string, quantity?: string, unit?: string, category: string = "General") => {
        const db = await getDatabase();
        const res = await db.runAsync(
            "INSERT INTO shopping_items (name, quantity, unit, category) VALUES (?, ?, ?, ?)",
            [name, quantity || null, unit || null, category]
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

    const generateFromMealPlan = useCallback(async (startDate: string, endDate: string) => {
        const db = await getDatabase();
        
        // 1. Fetch all meal plans for the range
        const plans = await db.getAllAsync<MealPlan>(
            "SELECT * FROM meal_plans WHERE planned_date BETWEEN ? AND ?",
            [startDate, endDate]
        );

        if (plans.length === 0) return;

        // 2. Fetch all ingredients for these recipes
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

        // 3. Aggregate
        const aggregated = aggregateIngredients(ingredientsWithRecipe);

        // 4. Batch insert
        for (const item of aggregated) {
            const res = await db.runAsync(
                "INSERT INTO shopping_items (name, quantity, unit, category, source_recipe_id) VALUES (?, ?, ?, ?, ?)",
                [(item.name || ""), (item.quantity || null), (item.unit || null), (item.category || "General"), (item.source_recipe_id || null)]
            );
            if (res.lastInsertRowId) {
                syncNewShoppingItem(res.lastInsertRowId);
            }
        }

        await loadItems();
    }, [loadItems]);

    const addItemsFromRecipe = useCallback(async (recipeId: number) => {
        const db = await getDatabase();
        
        // 1. Fetch ingredients for this recipe
        const ingredients = await db.getAllAsync<Ingredient>(
            "SELECT * FROM ingredients WHERE recipe_id = ?",
            [recipeId]
        );

        if (ingredients.length === 0) return;

        // 2. Insert into shopping list
        for (const ing of ingredients) {
            const res = await db.runAsync(
                "INSERT INTO shopping_items (name, quantity, unit, category, source_recipe_id) VALUES (?, ?, ?, ?, ?)",
                [ing.name, ing.quantity || null, ing.unit || null, "General", recipeId]
            );
            if (res.lastInsertRowId) {
                syncNewShoppingItem(res.lastInsertRowId);
            }
        }

        await loadItems();
    }, [loadItems]);

    return {
        items,
        loading,
        addItem,
        toggleItem,
        deleteItem,
        clearChecked,
        generateFromMealPlan,
        addItemsFromRecipe,
    };
}
