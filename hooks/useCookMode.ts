import { useState, useCallback } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { getDatabase } from "@/db/client";

export function useCookMode() {
    const [isCookMode, setIsCookMode] = useState(false);
    const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
    const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

    const enterCookMode = useCallback(async (recipeId: number) => {
        // Load existing checked state from DB
        const db = await getDatabase();
        const ingredients = await db.getAllAsync<{ id: number; checked: number }>(
            "SELECT id, checked FROM ingredients WHERE recipe_id = ? AND checked = 1",
            [recipeId]
        );
        const steps = await db.getAllAsync<{ id: number; checked: number }>(
            "SELECT id, checked FROM steps WHERE recipe_id = ? AND checked = 1",
            [recipeId]
        );
        setCheckedIngredients(new Set(ingredients.map((i) => i.id)));
        setCheckedSteps(new Set(steps.map((s) => s.id)));
        setIsCookMode(true);
        await activateKeepAwakeAsync("cook-mode");
    }, []);

    const exitCookMode = useCallback(() => {
        setIsCookMode(false);
        deactivateKeepAwake("cook-mode");
    }, []);

    const toggleIngredient = useCallback(async (ingredientId: number) => {
        const db = await getDatabase();
        setCheckedIngredients((prev) => {
            const next = new Set(prev);
            const isChecked = next.has(ingredientId);
            if (isChecked) {
                next.delete(ingredientId);
            } else {
                next.add(ingredientId);
            }
            // Persist to DB (fire-and-forget)
            db.runAsync("UPDATE ingredients SET checked = ? WHERE id = ?", [
                isChecked ? 0 : 1,
                ingredientId,
            ]);
            return next;
        });
    }, []);

    const toggleStep = useCallback(async (stepId: number) => {
        const db = await getDatabase();
        setCheckedSteps((prev) => {
            const next = new Set(prev);
            const isChecked = next.has(stepId);
            if (isChecked) {
                next.delete(stepId);
            } else {
                next.add(stepId);
            }
            db.runAsync("UPDATE steps SET checked = ? WHERE id = ?", [
                isChecked ? 0 : 1,
                stepId,
            ]);
            return next;
        });
    }, []);

    const resetChecks = useCallback(async (recipeId: number) => {
        const db = await getDatabase();
        await db.runAsync("UPDATE ingredients SET checked = 0 WHERE recipe_id = ?", [recipeId]);
        await db.runAsync("UPDATE steps SET checked = 0 WHERE recipe_id = ?", [recipeId]);
        setCheckedIngredients(new Set());
        setCheckedSteps(new Set());
    }, []);

    return {
        isCookMode,
        checkedIngredients,
        checkedSteps,
        enterCookMode,
        exitCookMode,
        toggleIngredient,
        toggleStep,
        resetChecks,
    };
}
