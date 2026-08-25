import { useEffect, useState, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, AppState, AppStateStatus } from "react-native";
import { ThemeProvider } from "@react-navigation/native";
import { ThemeProvider as AppThemeProvider, useTheme } from "@/hooks/useTheme";
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
import { pushPendingChanges, pullRemoteChanges, deduplicateLocalRecipes } from "@/lib/sync";
import { RevenueCatProvider } from "@/hooks/useRevenueCat";
import { TrialReminderController } from "@/hooks/useTrialReminder";
import { InactivityReminderController } from "@/hooks/useInactivityReminder";
import { getDatabase } from "@/db/client";
import { ShareIntentProvider, useShareIntent } from "expo-share-intent";
import { initAnalytics, trackScreenView } from "@/lib/analytics";
import { OnboardingProvider } from "@/components/onboarding/onboardingContext";
import "../global.css";

// Helper component inside ShareIntentProvider
function ShareIntentHandler({ isReady, fontsLoaded }: { isReady: boolean; fontsLoaded: boolean }) {
    const router = useRouter();
    try {
        const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
        useEffect(() => {
            if (hasShareIntent && shareIntent?.text && isReady && fontsLoaded) {
                const urlMatch = shareIntent.text.match(/https?:\/\/[^\s]+/);
                const sharedUrl = urlMatch ? urlMatch[0] : shareIntent.text.trim();
                if (sharedUrl) {
                    resetShareIntent();
                    // Go straight to extraction; the /share screen is only a
                    // fallback for direct deep links.
                    router.push({ pathname: "/extracting", params: { url: sharedUrl } });
                }
            }
        }, [hasShareIntent, shareIntent, isReady, fontsLoaded]);
    } catch (e) {
        // Safe fallback in standard Expo Go where native share-intent is omitted
        console.warn("ShareIntent native module not available in current environment");
    }
    return null;
}

function ThemedRoot() {
    const { colors, navTheme } = useTheme();
    return (
        <ThemeProvider value={navTheme}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <StatusBar style={colors.statusBar} />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.bg },
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
        </ThemeProvider>
    );
}

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
            SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY).then(val => {
                if (val === "true") {
                    setHasOnboarded(true);
                } else {
                    console.log("[Router action] replacing with /onboarding/welcome");
                    router.replace("/onboarding/welcome");
                }
            });
        } else if (hasOnboarded && inOnboardingGroup) {
            console.log("[Router action] replacing with /");
            router.replace("/");
        }
    }, [isReady, fontsLoaded, hasOnboarded, segments]);

    // Handle AppState changes for background sync
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (nextAppState === "active") {
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

    // Initialize the database once on mount
    useEffect(() => {
        (async () => {
            try {
                await getDatabase();
                await deduplicateLocalRecipes();
            } catch (e) {
                console.error("Error setting up database / deduplicating:", e);
            }
        })();
    }, []);

    // Initialize Amplitude analytics
    useEffect(() => {
        initAnalytics();
    }, []);

    // Auto-track screen views on navigation changes
    const prevSegmentsRef = useRef<string>("");
    useEffect(() => {
        const currentScreen = segments.join("/") || "(tabs)";
        if (currentScreen !== prevSegmentsRef.current) {
            prevSegmentsRef.current = currentScreen;
            trackScreenView(currentScreen);
        }
    }, [segments]);

    return (
        <ShareIntentProvider>
            <ShareIntentHandler isReady={isReady} fontsLoaded={fontsLoaded} />
            <SafeAreaProvider>
                <RevenueCatProvider>
                    <OnboardingProvider>
                        <TrialReminderController />
                        <InactivityReminderController />
                        <AppThemeProvider>
                            {/* Providers stay mounted while fonts/onboarding state
                                load so RevenueCat, Supabase and DB init overlap the
                                boot wait — shared links reach extraction faster. */}
                            {!fontsLoaded || !isReady ? <BootSplash /> : <ThemedRoot />}
                        </AppThemeProvider>
                    </OnboardingProvider>
                </RevenueCatProvider>
            </SafeAreaProvider>
        </ShareIntentProvider>
    );
}

function BootSplash() {
    const { colors } = useTheme();
    return (
        <View
            style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.bg,
            }}
        >
            <ActivityIndicator size="large" color="#FF6B35" />
        </View>
    );
}
