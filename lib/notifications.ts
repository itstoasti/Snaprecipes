import { Platform } from "react-native";
import Constants from "expo-constants";

let NotificationsModule: typeof import("expo-notifications") | null = null;

try {
    // Expo Go removed native push notifications in recent SDKs, which throws
    // 'Cannot find native module ExpoPushTokenManager'. Guard dynamic require.
    if (Constants.appOwnership !== "expo") {
        NotificationsModule = require("expo-notifications");
    }
} catch (e) {
    console.warn("[Notifications] Native module not available, using safe fallback:", e);
    NotificationsModule = null;
}

export const isNotificationsAvailable = !!NotificationsModule;

export const SchedulableTriggerInputTypes = NotificationsModule?.SchedulableTriggerInputTypes ?? {
    DATE: "date" as any,
    TIME_INTERVAL: "timeInterval" as any,
    DAILY: "daily" as any,
    WEEKLY: "weekly" as any,
    MONTHLY: "monthly" as any,
    YEARLY: "yearly" as any,
    CALENDAR: "calendar" as any,
};

export const AndroidImportance = NotificationsModule?.AndroidImportance ?? {
    DEFAULT: 3 as any,
    HIGH: 4 as any,
    LOW: 2 as any,
    MAX: 5 as any,
    MIN: 1 as any,
    NONE: 0 as any,
    UNSPECIFIED: -1000 as any,
};

export function setNotificationHandler(handler: any) {
    if (!NotificationsModule) return;
    try {
        NotificationsModule.setNotificationHandler(handler);
    } catch (e) {
        console.warn("[Notifications] setNotificationHandler failed:", e);
    }
}

export async function requestPermissionsAsync() {
    if (!NotificationsModule) return { status: "denied" as const, granted: false, canAskAgain: false, expires: "never" as const };
    try {
        return await NotificationsModule.requestPermissionsAsync();
    } catch (e) {
        console.warn("[Notifications] requestPermissionsAsync failed:", e);
        return { status: "denied" as const, granted: false, canAskAgain: false, expires: "never" as const };
    }
}

export async function getPermissionsAsync() {
    if (!NotificationsModule) return { status: "denied" as const, granted: false, canAskAgain: false, expires: "never" as const };
    try {
        return await NotificationsModule.getPermissionsAsync();
    } catch (e) {
        console.warn("[Notifications] getPermissionsAsync failed:", e);
        return { status: "denied" as const, granted: false, canAskAgain: false, expires: "never" as const };
    }
}

export async function scheduleNotificationAsync(request: any): Promise<string> {
    if (!NotificationsModule) return "";
    try {
        return await NotificationsModule.scheduleNotificationAsync(request);
    } catch (e) {
        console.warn("[Notifications] scheduleNotificationAsync failed:", e);
        return "";
    }
}

export async function cancelScheduledNotificationAsync(identifier: string): Promise<void> {
    if (!NotificationsModule) return;
    try {
        await NotificationsModule.cancelScheduledNotificationAsync(identifier);
    } catch (e) {
        console.warn("[Notifications] cancelScheduledNotificationAsync failed:", e);
    }
}

export async function setNotificationChannelAsync(channelId: string, channel: any) {
    if (!NotificationsModule) return null;
    try {
        return await NotificationsModule.setNotificationChannelAsync(channelId, channel);
    } catch (e) {
        console.warn("[Notifications] setNotificationChannelAsync failed:", e);
        return null;
    }
}

export function addNotificationResponseReceivedListener(listener: (event: any) => void) {
    if (!NotificationsModule) return { remove: () => {} };
    try {
        return NotificationsModule.addNotificationResponseReceivedListener(listener);
    } catch (e) {
        console.warn("[Notifications] addNotificationResponseReceivedListener failed:", e);
        return { remove: () => {} };
    }
}
