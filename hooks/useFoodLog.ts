import { useState, useEffect, useCallback, useMemo } from "react";
import { getDatabase } from "@/db/client";
import type { FoodLog, CustomFood } from "@/db/schema";
import { format } from "@/lib/dateUtils";

import * as SecureStore from "expo-secure-store";
import { USER_GOALS_STORE } from "@/lib/constants";

export interface DailyTotals {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    sugar: number;
    fiber: number;
    sodium: number;
}

export interface DailyGoals {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
}

const DEFAULT_GOALS: DailyGoals = {
    calories: 2000,
    protein: 150,
    fat: 65,
    carbs: 250,
};

export function useFoodLog(selectedDate?: Date) {
    const [logs, setLogs] = useState<FoodLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [goals, setGoals] = useState<DailyGoals>(DEFAULT_GOALS);

    const dateStr = format(selectedDate || new Date(), "yyyy-MM-dd");

    const loadGoals = useCallback(async () => {
        try {
            const saved = await SecureStore.getItemAsync(USER_GOALS_STORE);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.goals) {
                    setGoals(parsed.goals);
                }
            }
        } catch (e) {
            console.warn("Failed to load goals:", e);
        }
    }, []);

    const loadLogs = useCallback(async () => {
        try {
            setLoading(true);
            await loadGoals();
            const db = await getDatabase();
            const results = await db.getAllAsync<FoodLog>(
                `SELECT * FROM food_logs WHERE log_date = ? ORDER BY
                    CASE meal_type
                        WHEN 'breakfast' THEN 1
                        WHEN 'lunch' THEN 2
                        WHEN 'dinner' THEN 3
                        WHEN 'snack' THEN 4
                    END, created_at ASC`,
                [dateStr]
            );
            setLogs(results);
        } catch (error) {
            console.error("Failed to load food logs:", error);
        } finally {
            setLoading(false);
        }
    }, [dateStr]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const dailyTotals = useMemo<DailyTotals>(() => {
        return logs.reduce(
            (acc, log) => ({
                calories: acc.calories + (log.calories * log.serving_qty),
                protein: acc.protein + (log.protein * log.serving_qty),
                fat: acc.fat + (log.fat * log.serving_qty),
                carbs: acc.carbs + (log.carbs * log.serving_qty),
                sugar: acc.sugar + ((log.sugar || 0) * log.serving_qty),
                fiber: acc.fiber + ((log.fiber || 0) * log.serving_qty),
                sodium: acc.sodium + ((log.sodium || 0) * log.serving_qty),
            }),
            { calories: 0, protein: 0, fat: 0, carbs: 0, sugar: 0, fiber: 0, sodium: 0 }
        );
    }, [logs]);

    const mealGroups = useMemo(() => {
        const groups: Record<string, FoodLog[]> = {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: [],
        };
        for (const log of logs) {
            const key = log.meal_type || "snack";
            if (groups[key]) {
                groups[key].push(log);
            } else {
                groups.snack.push(log);
            }
        }
        return groups;
    }, [logs]);

    const addFoodLog = useCallback(
        async (entry: Omit<FoodLog, "id" | "remote_id" | "created_at">) => {
            const db = await getDatabase();
            await db.runAsync(
                `INSERT INTO food_logs (food_name, brand, serving_size, serving_qty, calories, protein, fat, carbs, sugar, fiber, sodium, meal_type, log_date, source_type, source_recipe_id, image_url, barcode)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    entry.food_name,
                    entry.brand || null,
                    entry.serving_size || null,
                    entry.serving_qty,
                    entry.calories,
                    entry.protein,
                    entry.fat,
                    entry.carbs,
                    entry.sugar || null,
                    entry.fiber || null,
                    entry.sodium || null,
                    entry.meal_type,
                    entry.log_date,
                    entry.source_type,
                    entry.source_recipe_id || null,
                    entry.image_url || null,
                    entry.barcode || null,
                ]
            );
            await loadLogs();
        },
        [loadLogs]
    );

    const removeFoodLog = useCallback(
        async (logId: number) => {
            const db = await getDatabase();
            await db.runAsync("DELETE FROM food_logs WHERE id = ?", [logId]);
            await loadLogs();
        },
        [loadLogs]
    );

    const updateServingQty = useCallback(
        async (logId: number, qty: number) => {
            const db = await getDatabase();
            await db.runAsync("UPDATE food_logs SET serving_qty = ? WHERE id = ?", [qty, logId]);
            await loadLogs();
        },
        [loadLogs]
    );

    const updateMealType = useCallback(
        async (logId: number, mealType: "breakfast" | "lunch" | "dinner" | "snack") => {
            const db = await getDatabase();
            await db.runAsync("UPDATE food_logs SET meal_type = ? WHERE id = ?", [mealType, logId]);
            await loadLogs();
        },
        [loadLogs]
    );

    // ── Custom Foods (Saved / Frequent) ──
    const searchCustomFoods = useCallback(async (query: string): Promise<CustomFood[]> => {
        try {
            const db = await getDatabase();
            if (!query.trim()) {
                return db.getAllAsync<CustomFood>(
                    "SELECT * FROM custom_foods ORDER BY use_count DESC LIMIT 6"
                );
            }
            return db.getAllAsync<CustomFood>(
                "SELECT * FROM custom_foods WHERE food_name LIKE ? OR brand LIKE ? ORDER BY use_count DESC LIMIT 30",
                [`%${query}%`, `%${query}%`]
            );
        } catch (e) {
            console.warn("searchCustomFoods error:", e);
            return [];
        }
    }, []);

    const saveCustomFood = useCallback(
        async (food: Omit<CustomFood, "id" | "remote_id" | "use_count" | "created_at">) => {
            const db = await getDatabase();
            await db.runAsync(
                `INSERT OR REPLACE INTO custom_foods (food_name, brand, serving_size, barcode, calories, protein, fat, carbs, sugar, fiber, sodium, image_url, use_count)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT use_count FROM custom_foods WHERE food_name = ? AND brand IS ?), 0) + 1)`,
                [
                    food.food_name,
                    food.brand || null,
                    food.serving_size || null,
                    food.barcode || null,
                    food.calories,
                    food.protein,
                    food.fat,
                    food.carbs,
                    food.sugar || null,
                    food.fiber || null,
                    food.sodium || null,
                    food.image_url || null,
                    food.food_name,
                    food.brand || null,
                ]
            );
        },
        []
    );

    return {
        logs,
        loading,
        dailyTotals,
        mealGroups,
        goals,
        addFoodLog,
        removeFoodLog,
        updateServingQty,
        updateMealType,
        searchCustomFoods,
        saveCustomFood,
        refresh: loadLogs,
    };
}
