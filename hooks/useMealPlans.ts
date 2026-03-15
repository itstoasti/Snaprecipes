import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "@/db/client";
import type { MealPlan, Recipe } from "@/db/schema";
import { syncNewMealPlan, syncUpdateMealPlan, unsyncMealPlan } from "@/lib/sync";
import { supabase } from "@/lib/supabase";

export type MealPlanWithRecipe = MealPlan & { recipe: Recipe };

export function useMealPlans() {
    const [plans, setPlans] = useState<MealPlanWithRecipe[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPlans = useCallback(async (startDate?: string, endDate?: string) => {
        try {
            setLoading(true);
            const db = await getDatabase();
            
            let query = `
                SELECT mp.*, r.title, r.image_url, r.servings as recipe_servings
                FROM meal_plans mp
                JOIN recipes r ON mp.recipe_id = r.id
            `;
            const params: any[] = [];

            if (startDate && endDate) {
                query += " WHERE mp.planned_date BETWEEN ? AND ?";
                params.push(startDate, endDate);
            } else if (startDate) {
                query += " WHERE mp.planned_date >= ?";
                params.push(startDate);
            }

            query += " ORDER BY mp.planned_date ASC, mp.meal_type ASC";

            const results = await db.getAllAsync<any>(query, params);
            
            // Map results to the expected type
            const mappedResults = results.map(row => ({
                id: row.id,
                remote_id: row.remote_id,
                recipe_id: row.recipe_id,
                planned_date: row.planned_date,
                meal_type: row.meal_type,
                servings: row.servings,
                created_at: row.created_at,
                recipe: {
                    id: row.recipe_id,
                    title: row.title,
                    image_url: row.image_url,
                    servings: row.recipe_servings,
                } as Recipe
            }));

            setPlans(mappedResults);
        } catch (error) {
            console.error("Failed to load meal plans:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    const addRecipeToPlan = useCallback(async (
        recipeId: number, 
        date: string, 
        mealType: MealPlan["meal_type"] = "dinner",
        servings: number = 4
    ) => {
        const db = await getDatabase();
        const res = await db.runAsync(
            "INSERT INTO meal_plans (recipe_id, planned_date, meal_type, servings) VALUES (?, ?, ?, ?)",
            [recipeId, date, mealType, servings]
        );
        if (res.lastInsertRowId) {
            syncNewMealPlan(res.lastInsertRowId);
        }
        await loadPlans();
    }, [loadPlans]);

    const removeFromPlan = useCallback(async (planId: number) => {
        const db = await getDatabase();
        // Get remote_id before deleting
        const plan = await db.getFirstAsync<{ remote_id: string | null }>("SELECT remote_id FROM meal_plans WHERE id = ?", [planId]);
        
        await db.runAsync("DELETE FROM meal_plans WHERE id = ?", [planId]);
        
        if (plan?.remote_id) {
            unsyncMealPlan(plan.remote_id);
        }
        
        await loadPlans();
    }, [loadPlans]);

    const updatePlanServings = useCallback(async (planId: number, servings: number) => {
        const db = await getDatabase();
        await db.runAsync("UPDATE meal_plans SET servings = ? WHERE id = ?", [servings, planId]);
        syncUpdateMealPlan(planId);
        await loadPlans();
    }, [loadPlans]);

    return {
        plans,
        loading,
        loadPlans,
        addRecipeToPlan,
        removeFromPlan,
        updatePlanServings,
    };
}
