import * as SecureStore from 'expo-secure-store';

const USAGE_MONTH_KEY = "current_usage_month";
const USAGE_COUNT_KEY = "current_usage_count";

export const FREE_TIER_LIMIT = 5;

// Basic usage tracker for the Freemium hook
export const getMonthlyUsage = async (): Promise<number> => {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const storedMonth = await SecureStore.getItemAsync(USAGE_MONTH_KEY);

        // If it's a new month, reset the counter
        if (storedMonth !== currentMonth) {
            await SecureStore.setItemAsync(USAGE_MONTH_KEY, currentMonth);
            await SecureStore.setItemAsync(USAGE_COUNT_KEY, "0");
            return 0;
        }

        const countStr = await SecureStore.getItemAsync(USAGE_COUNT_KEY);
        return countStr ? parseInt(countStr, 10) : 0;
    } catch (e) {
        console.warn("Error reading usage:", e);
        return 0;
    }
};

export const incrementMonthlyUsage = async () => {
    try {
        const current = await getMonthlyUsage();
        await SecureStore.setItemAsync(USAGE_COUNT_KEY, (current + 1).toString());
    } catch (e) {
        console.warn("Error incrementing usage:", e);
    }
};

export const hasReachedFreeLimit = async (): Promise<boolean> => {
    const current = await getMonthlyUsage();
    return current >= FREE_TIER_LIMIT;
};
