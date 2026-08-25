import React, { useEffect } from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "@/lib/notifications";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

const INACTIVITY_REMINDER_ID_KEY = "snap_recipe_inactivity_reminder_id";
const CHANNEL_ID = "inactivity-reminders";
const INACTIVITY_DAYS = 7;
const INACTIVITY_MS = INACTIVITY_DAYS * 24 * 60 * 60 * 1000;

// Curated list of friendly, high-engagement reminder messages tailored to SnapRecipes
export const INACTIVITY_REMINDERS = [
    {
        title: "Time to cook something delicious! 🍳",
        body: "You have recipes waiting in your cookbook. Pick one to cook for dinner tonight.",
        deepLink: "/recipes",
    },
    {
        title: "Seen any great recipes lately? 📲",
        body: "Import recipes directly from Instagram, TikTok, or YouTube with a single link.",
        deepLink: "/",
    },
    {
        title: "Keep up with your nutrition goals! 🥑",
        body: "Log your meals, scan a barcode, or snap a plate to track your calories today.",
        deepLink: "/library/calorie-counter",
    },
    {
        title: "Need dinner inspiration tonight? 🥘",
        body: "Browse your saved recipes or check out what's trending in the community.",
        deepLink: "/",
    },
    {
        title: "Stay on top of your daily macros 🥗",
        body: "Take a quick moment to log today's meals and check your calorie target.",
        deepLink: "/library/calorie-counter",
    },
    {
        title: "Your cookbook is waiting 📖",
        body: "Open SnapRecipes to view your saved dishes and plan your next meal.",
        deepLink: "/recipes",
    },
];

async function cancelExistingInactivityReminder() {
    try {
        const existingId = await SecureStore.getItemAsync(INACTIVITY_REMINDER_ID_KEY);
        if (existingId) {
            await Notifications.cancelScheduledNotificationAsync(existingId);
            await SecureStore.deleteItemAsync(INACTIVITY_REMINDER_ID_KEY);
        }
    } catch (e) {
        console.warn("[InactivityReminder] Failed to cancel existing reminder:", e);
    }
}

export async function scheduleInactivityReminder() {
    const isExpoGo = Constants.appOwnership === "expo";
    if (isExpoGo || !Notifications.isNotificationsAvailable) return;

    try {
        // Check permissions
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") return;

        // Cancel old scheduled reminder before setting a new one
        await cancelExistingInactivityReminder();

        // Setup Android channel
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
                name: "Reminders & Inspiration",
                importance: Notifications.AndroidImportance.DEFAULT,
            });
        }

        // Calculate trigger date (7 days from now at 6:00 PM dinner time)
        const targetDate = new Date(Date.now() + INACTIVITY_MS);
        targetDate.setHours(18, 0, 0, 0); // 6:00 PM local time

        // Pick a random reminder
        const randomIndex = Math.floor(Math.random() * INACTIVITY_REMINDERS.length);
        const reminder = INACTIVITY_REMINDERS[randomIndex];

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: reminder.title,
                body: reminder.body,
                sound: true,
                data: { deepLink: reminder.deepLink },
                ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: targetDate,
            },
        });

        if (id) {
            await SecureStore.setItemAsync(INACTIVITY_REMINDER_ID_KEY, id);
        }
    } catch (e) {
        console.warn("[InactivityReminder] Failed to schedule inactivity reminder:", e);
    }
}

export function useInactivityReminder() {
    const router = useRouter();

    // Deep-link listener when the user taps on the notification
    useEffect(() => {
        const isExpoGo = Constants.appOwnership === "expo";
        if (isExpoGo || !Notifications.isNotificationsAvailable) return;

        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            const deepLink = response?.notification?.request?.content?.data?.deepLink;
            if (deepLink) {
                try {
                    router.push(deepLink as any);
                } catch (e) {
                    console.warn("[InactivityReminder] Failed to handle deep link:", e);
                }
            }
        });

        return () => subscription.remove();
    }, [router]);

    // Reschedule on mount and whenever the app transitions back to 'active'
    useEffect(() => {
        scheduleInactivityReminder();

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === "active") {
                scheduleInactivityReminder();
            }
        };

        const subscription = AppState.addEventListener("change", handleAppStateChange);
        return () => subscription.remove();
    }, []);
}

export const InactivityReminderController: React.FC = () => {
    useInactivityReminder();
    return null;
};
