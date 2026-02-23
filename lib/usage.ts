import * as SecureStore from "expo-secure-store";

const FREE_TIER_LIMIT = 5;
const USAGE_COUNT_KEY = "snapshot_usage_count";
const USAGE_MONTH_KEY = "snapshot_usage_month"; // Tracks the month integer (0-11)

/**
 * Gets the current usage count for the month. Resets if the month has changed.
 */
export async function getCurrentUsage(): Promise<number> {
    const currentMonth = new Date().getMonth().toString();
    const storedMonth = await SecureStore.getItemAsync(USAGE_MONTH_KEY);

    if (storedMonth !== currentMonth) {
        // New month, reset logic
        await SecureStore.setItemAsync(USAGE_MONTH_KEY, currentMonth);
        await SecureStore.setItemAsync(USAGE_COUNT_KEY, "0");
        return 0;
    }

    const storedCount = await SecureStore.getItemAsync(USAGE_COUNT_KEY);
    return storedCount ? parseInt(storedCount, 10) : 0;
}

/**
 * Checks if the user is allowed to extract a new recipe.
 */
export async function canExtractRecipe(isPro: boolean): Promise<boolean> {
    if (isPro) return true; // Pro users always pass

    const currentUsage = await getCurrentUsage();
    return currentUsage < FREE_TIER_LIMIT;
}

/**
 * Increments the user's monthly usage count.
 * Call this AFTER a successful extraction.
 */
export async function incrementUsage(): Promise<void> {
    const currentUsage = await getCurrentUsage();
    await SecureStore.setItemAsync(USAGE_COUNT_KEY, (currentUsage + 1).toString());
}
