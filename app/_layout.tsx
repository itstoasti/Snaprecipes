import { useEffect, useState, useCallback } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, AppState, AppStateStatus } from "react-native";
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { ONBOARDING_COMPLETE_KEY } from "./onboarding/first-save";
import {
    useFonts,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
} from "@expo-google-fonts/inter";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { pushPendingChanges, pullRemoteChanges } from "@/lib/sync";
import { RevenueCatProvider } from "@/hooks/useRevenueCat";
import { SQLiteProvider, type SQLiteDatabase } from "expo-sqlite";
import { getDatabase } from "@/db/client";
import "../global.css";

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    const [isReady, setIsReady] = useState(false);
    const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
    const router = useRouter();
    const segments = useSegments();

    // 1. Fetch onboarding state once on mount
    useEffect(() => {
        SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY)
            .then((val) => {
                setHasOnboarded(!!val);
            })
            .catch((e) => {
                console.warn("Error reading onboarding status:", e);
                setHasOnboarded(false);
            })
            .finally(() => {
                setIsReady(true);
            });
    }, []);

    // 2. Perform navigation only when everything is loaded and mounted
    useEffect(() => {
        if (!isReady || !fontsLoaded || hasOnboarded === null) return;

        const inOnboardingGroup = segments[0] === "onboarding";
        console.log("[Router Details] isReady:", isReady, "hasOnboarded:", hasOnboarded, "segments:", segments, "inOnboardingGroup:", inOnboardingGroup);

        if (!hasOnboarded && !inOnboardingGroup) {
            // Re-check secure store just in case they just finished onboarding
            // and the state hasn't updated in this component yet
            SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY).then(val => {
                if (val === "true") {
                    setHasOnboarded(true);
                } else {
                    console.log("[Router action] replacing with /onboarding/welcome");
                    router.replace("/onboarding/welcome");
                }
            });
        } else if (hasOnboarded && inOnboardingGroup) {
            // Push out of onboarding if they have already done it
            console.log("[Router action] replacing with /");
            router.replace("/");
        }
    }, [isReady, fontsLoaded, hasOnboarded, segments]);

    // Handle AppState changes for background sync
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (nextAppState === "active") {
                // Background sync trigger when app comes to foreground
                try {
                    await pushPendingChanges();
                    await pullRemoteChanges();
                } catch (e) {
                    console.log("Background sync skipped/failed:", e);
                }
            }
        };

        const subscription = AppState.addEventListener("change", handleAppStateChange);
        return () => subscription.remove();
    }, []);

    const initDb = useCallback(async (db: SQLiteDatabase) => {
        // Initialize schema natively inside SQLiteProvider context
        try {
            await getDatabase();
        } catch (e) {
            console.error("Error setting up database:", e);
        }
    }, []);

    if (!fontsLoaded || !isReady) {
        return (
            <View className="flex-1 items-center justify-center bg-surface-950">
                <ActivityIndicator size="large" color="#FF6B35" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <RevenueCatProvider>
                <ThemeProvider value={DarkTheme}>
                    <SQLiteProvider databaseName="snaprecipes.db" onInit={initDb}>
                        <GestureHandlerRootView style={{ flex: 1 }}>
                            <StatusBar style="light" />
                            <Stack
                                screenOptions={{
                                    headerShown: false,
                                    contentStyle: { backgroundColor: "#0A0A0F" },
                                    animation: "slide_from_right",
                                }}
                            >
                                <Stack.Screen
                                    name="paywall"
                                    options={{
                                        presentation: "modal",
                                        animation: "slide_from_bottom"
                                    }}
                                />
                                <Stack.Screen
                                    name="auth"
                                    options={{
                                        presentation: "modal",
                                        animation: "slide_from_bottom"
                                    }}
                                />
                            </Stack>
                        </GestureHandlerRootView>
                    </SQLiteProvider>
                </ThemeProvider>
            </RevenueCatProvider>
        </SafeAreaProvider>
    );
}
