import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
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
import { getDatabase } from "@/db/client";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    const [isReady, setIsReady] = useState(false);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        // Initialize database on app start
        getDatabase().catch(console.error);
    }, []);

    useEffect(() => {
        if (!fontsLoaded) return;

        const checkOnboarding = async () => {
            try {
                const hasOnboarded = await SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY);
                const inOnboardingGroup = segments[0] === "onboarding";

                if (!hasOnboarded && !inOnboardingGroup) {
                    router.replace("/onboarding/welcome");
                }
            } catch (e) {
                console.warn("Error reading onboarding status:", e);
            } finally {
                setIsReady(true);
            }
        };

        checkOnboarding();
    }, [fontsLoaded, segments]);

    if (!fontsLoaded || !isReady) {
        return (
            <View className="flex-1 items-center justify-center bg-surface-950">
                <ActivityIndicator size="large" color="#FF6B35" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <ThemeProvider value={DarkTheme}>
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
                    </Stack>
                </GestureHandlerRootView>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
