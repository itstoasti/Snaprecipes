import React, { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "@/lib/notifications";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useOnboarding } from "@/components/onboarding/onboardingContext";

const REMINDER_IDS_KEY = "snap_recipe_trial_reminder_ids";
const CHANNEL_ID = "trial-reminders";
const REMINDER_LEAD_MS = 48 * 60 * 60 * 1000;

if (Constants.appOwnership !== "expo") {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
        }),
    });
}

async function cancelExistingReminders() {
    try {
        const raw = await SecureStore.getItemAsync(REMINDER_IDS_KEY);
        if (raw) {
            const ids: string[] = JSON.parse(raw);
            await Promise.all(
                ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
            );
        }
        await SecureStore.deleteItemAsync(REMINDER_IDS_KEY);
    } catch (e) {
        console.warn("Failed to cancel existing trial reminders:", e);
    }
}

export function useTrialReminder() {
    const router = useRouter();
    const { customerInfo, isReady } = useRevenueCat();
    const { state } = useOnboarding();
    const reminderEnabled = state.reminderEnabled;

    // Deep-link to the paywall when the reminder is tapped
    useEffect(() => {
        const isExpoGo = Constants.appOwnership === "expo";
        if (isExpoGo) return;

        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            if (response.notification.request.content.data?.deepLink === "paywall") {
                router.push("/paywall");
            }
        });
        return () => subscription.remove();
    }, [router]);

    useEffect(() => {
        const isExpoGo = Constants.appOwnership === "expo";
        if (isExpoGo) return;
        if (!isReady || !customerInfo) return;

        (async () => {
            try {
                const active = customerInfo.entitlements?.active ?? {};
                const entitlement = Object.values(active)[0];
                const expiration = entitlement?.expirationDate
                    ? new Date(entitlement.expirationDate)
                    : null;
                const reminderDate = expiration
                    ? new Date(expiration.getTime() - REMINDER_LEAD_MS)
                    : null;

                await cancelExistingReminders();

                const shouldSchedule =
                    !!expiration &&
                    !!reminderDate &&
                    reminderDate.getTime() > Date.now() &&
                    reminderEnabled;

                if (!shouldSchedule) return;

                const { status } = await Notifications.getPermissionsAsync();
                if (status !== "granted") return;

                if (Platform.OS === "android") {
                    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
                        name: "Trial reminders",
                        importance: Notifications.AndroidImportance.DEFAULT,
                    });
                }

                const dateLabel = expiration!.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                });

                const id = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "Your SnapRecipes trial is ending soon",
                        body: `Your trial ends on ${dateLabel}. Keep your saved recipes and meal plans.`,
                        sound: false,
                        data: { deepLink: "paywall" },
                        ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.DATE,
                        date: reminderDate!,
                    },
                });

                await SecureStore.setItemAsync(REMINDER_IDS_KEY, JSON.stringify([id]));
            } catch (e) {
                console.warn("Trial reminder scheduling failed:", e);
            }
        })();
    }, [isReady, customerInfo, reminderEnabled]);
}

export const TrialReminderController: React.FC = () => {
    useTrialReminder();
    return null;
};
