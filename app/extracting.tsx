import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { extractFromUrl, cleanUrlForDuplicateCheck } from "@/lib/extract";
import { useRecipes } from "@/hooks/useRecipes";
import { getDatabase } from "@/db/client";
import { incrementUsage, canExtractRecipe, getCurrentUsage } from "@/lib/usage";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { trackEvent } from "@/lib/analytics";
import ExtractionProgress from "@/components/ExtractionProgress";

export default function ExtractingScreen() {
    const { url, share } = useLocalSearchParams<{ url: string; share?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { insertRecipe, shareRecipeToCommunity } = useRecipes();
    const { isPro, entitlementsReady } = useRevenueCat();

    const [status, setStatus] = useState<"loading" | "error" | "paywall">("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const [stage, setStage] = useState<string | null>(null);
    const [aiText, setAiText] = useState("");
    const [snippet, setSnippet] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const hasStarted = useRef(false);
    const duplicateRedirected = useRef(false);

    useEffect(() => {
        if (status === "loading") {
            activateKeepAwakeAsync("extraction");
            return () => { deactivateKeepAwake("extraction"); };
        }
    }, [status]);

    // Fast path: duplicate check needs only the local DB, so run it immediately
    // instead of waiting for RevenueCat to resolve.
    useEffect(() => {
        if (!url) return;
        (async () => {
            try {
                const db = await getDatabase();
                const cleanedInputUrl = cleanUrlForDuplicateCheck(url);
                const localRecipes = await db.getAllAsync<{ id: number; source_url: string | null }>(
                    "SELECT id, source_url FROM recipes WHERE source_url IS NOT NULL"
                );
                const existingRecipe = localRecipes.find(r => {
                    if (!r.source_url) return false;
                    return cleanUrlForDuplicateCheck(r.source_url) === cleanedInputUrl;
                });

                if (existingRecipe && !hasStarted.current) {
                    duplicateRedirected.current = true;
                    router.replace(`/recipe/${existingRecipe.id}`);
                }
            } catch (dbErr) {
                console.warn("[Extracting] Duplicate check failed:", dbErr);
            }
        })();
    }, [url, attempt]);

    useEffect(() => {
        if (!url || hasStarted.current || duplicateRedirected.current) return;

        (async () => {
            try {
                const currentUsage = await getCurrentUsage();
                const underFreeLimit = currentUsage < 10;

                // If user has hit the free limit, verify Pro entitlements before proceeding
                if (!underFreeLimit) {
                    if (!entitlementsReady) {
                        return; // Wait for RevenueCat to settle
                    }
                    const allowed = await canExtractRecipe(isPro);
                    if (!allowed) {
                        setStatus("paywall");
                        return;
                    }
                }

                hasStarted.current = true;

                const recipes = await extractFromUrl(url, false, {
                    onStage: setStage,
                    onToken: setAiText,
                    onContext: setSnippet,
                });
                const shouldShare = share !== "0";
                let firstRecipeId: number | undefined;
                for (const recipe of recipes) {
                    const recipeId = await insertRecipe(recipe, url, "url");
                    if (!firstRecipeId && recipeId) firstRecipeId = recipeId;
                    if (shouldShare) {
                        await shareRecipeToCommunity(recipe);
                    }
                }
                await incrementUsage();

                trackEvent("recipe_imported", { source: "url" });

                if (firstRecipeId) {
                    router.replace(`/recipe/${firstRecipeId}?isNew=true`);
                } else {
                    router.replace("/");
                }
            } catch (error: any) {
                setErrorMessage(error.message || "Could not extract recipe from this URL.");
                setStatus("error");
            }
        })();
    }, [url, entitlementsReady, isPro, attempt]);

    const handleRetry = async () => {
        if (!url) return;
        setStage(null);
        setAiText("");
        setSnippet(null);
        setStatus("loading");
        hasStarted.current = false;
        setAttempt((a) => a + 1);
    };

    const handleDismiss = () => {
        router.replace("/");
    };

    if (!url) {
        return (
            <View className="flex-1 bg-surface-950 items-center justify-center">
                <ActivityIndicator size="large" color="#FF6B35" />
            </View>
        );
    }

    return (
        <View
            className="flex-1 bg-surface-950 items-center justify-center px-6"
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
            {status === "loading" && (
                <Animated.View entering={FadeIn.duration(400)} className="items-center w-full">
                    <ExtractionProgress stage={stage} aiText={aiText} contextSnippet={snippet} />
                </Animated.View>
            )}

            {status === "error" && (
                <Animated.View entering={FadeIn.duration(400)} className="items-center">
                    <View className="w-20 h-20 rounded-full bg-red-500/20 items-center justify-center mb-6 border border-red-500/40">
                        <Ionicons name="alert-circle" size={36} color="#EF4444" />
                    </View>

                    <Text className="text-white font-sans-bold text-xl text-center mb-2">
                        Extraction Failed
                    </Text>
                    <Text className="text-surface-400 font-sans text-sm text-center mb-8 leading-5">
                        {errorMessage}
                    </Text>

                    <Pressable
                        onPress={handleRetry}
                        className="bg-accent px-8 py-4 rounded-2xl mb-3 w-full items-center"
                    >
                        <Text className="text-[#FFFFFF] font-sans-semibold text-base">
                            Try Again
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleDismiss}
                        className="px-8 py-4 rounded-2xl w-full items-center"
                    >
                        <Text className="text-surface-400 font-sans-medium text-base">
                            Dismiss
                        </Text>
                    </Pressable>
                </Animated.View>
            )}

            {status === "paywall" && (
                <Animated.View entering={FadeIn.duration(400)} className="items-center">
                    <View className="w-20 h-20 rounded-full bg-amber-500/20 items-center justify-center mb-6 border border-amber-500/40">
                        <Ionicons name="lock-closed" size={32} color="#F59E0B" />
                    </View>

                    <Text className="text-white font-sans-bold text-xl text-center mb-2">
                        Monthly Limit Reached
                    </Text>
                    <Text className="text-surface-400 font-sans text-sm text-center mb-8 leading-5">
                        Upgrade to Pro for unlimited recipe extractions.
                    </Text>

                    <Pressable
                        onPress={() => router.replace("/paywall")}
                        className="bg-accent px-8 py-4 rounded-2xl mb-3 w-full items-center"
                    >
                        <Text className="text-[#FFFFFF] font-sans-semibold text-base">
                            Upgrade to Pro
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleDismiss}
                        className="px-8 py-4 rounded-2xl w-full items-center"
                    >
                        <Text className="text-surface-400 font-sans-medium text-base">
                            Go Home
                        </Text>
                    </Pressable>
                </Animated.View>
            )}
        </View>
    );
}
