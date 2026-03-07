import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { extractFromUrl } from "@/lib/extract";
import { useRecipes } from "@/hooks/useRecipes";
import { incrementUsage } from "@/lib/usage";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { canExtractRecipe } from "@/lib/usage";

const LOADING_STEPS = [
    "Receiving shared link...",
    "Analyzing source URL...",
    "Reading recipe structure...",
    "Extracting ingredients...",
    "Formatting instructions...",
    "Almost there...",
];

export default function ShareScreen() {
    const { url } = useLocalSearchParams<{ url: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { insertRecipe } = useRecipes();
    const { isPro } = useRevenueCat();

    const [status, setStatus] = useState<"loading" | "error" | "paywall">("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const [stepIndex, setStepIndex] = useState(0);
    const hasStarted = useRef(false);

    // Animated values
    const pulse = useSharedValue(1);
    const rotate = useSharedValue(0);
    const progress = useSharedValue(0);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
        rotate.value = withRepeat(
            withTiming(360, { duration: 8000, easing: Easing.linear }),
            -1,
            false
        );
        progress.value = withTiming(1 / LOADING_STEPS.length, { duration: 500 });

        const interval = setInterval(() => {
            setStepIndex((prev) => {
                const next = Math.min(prev + 1, LOADING_STEPS.length - 1);
                progress.value = withTiming((next + 1) / LOADING_STEPS.length, { duration: 500 });
                return next;
            });
        }, 2200);

        return () => clearInterval(interval);
    }, []);

    const animatedSparkleStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: pulse.value },
            { rotate: `${rotate.value}deg` },
        ],
    }));

    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    // Auto-extract on mount
    useEffect(() => {
        if (!url || hasStarted.current) return;
        hasStarted.current = true;

        (async () => {
            // Check usage limits first
            const allowed = await canExtractRecipe(isPro);
            if (!allowed) {
                setStatus("paywall");
                return;
            }

            try {
                const recipe = await extractFromUrl(url);
                const recipeId = await insertRecipe(recipe, url, "url");
                await incrementUsage();

                if (recipeId) {
                    router.replace(`/recipe/${recipeId}`);
                } else {
                    router.replace("/");
                }
            } catch (error: any) {
                setErrorMessage(error.message || "Could not extract recipe from this URL.");
                setStatus("error");
            }
        })();
    }, [url]);

    const handleRetry = async () => {
        if (!url) return;
        setStatus("loading");
        setStepIndex(0);
        hasStarted.current = false;
    };

    const handleDismiss = () => {
        router.replace("/");
    };

    return (
        <View
            className="flex-1 bg-surface-950 items-center justify-center px-8"
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
            {status === "loading" && (
                <Animated.View entering={FadeIn.duration(400)} className="items-center">
                    {/* Animated sparkle icon */}
                    <View className="relative items-center justify-center mb-8">
                        <Animated.View
                            style={[animatedSparkleStyle]}
                            className="absolute w-28 h-28 rounded-full bg-accent/20"
                        />
                        <Animated.View
                            style={animatedSparkleStyle}
                            className="w-20 h-20 rounded-full bg-accent/20 items-center justify-center border border-accent/50"
                        >
                            <Ionicons name="sparkles" size={32} color="#FF6B35" />
                        </Animated.View>
                    </View>

                    {/* Status text */}
                    <Animated.Text
                        key={stepIndex}
                        entering={FadeIn.duration(400)}
                        className="text-white font-sans-semibold text-lg text-center mb-2"
                    >
                        {LOADING_STEPS[stepIndex]}
                    </Animated.Text>

                    {/* URL preview */}
                    <Text
                        className="text-surface-500 font-sans text-xs text-center mb-8"
                        numberOfLines={1}
                    >
                        {url}
                    </Text>

                    {/* Progress bar */}
                    <View className="w-56 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                        <Animated.View
                            style={[animatedProgressStyle]}
                            className="absolute top-0 bottom-0 left-0 bg-accent rounded-full"
                        />
                    </View>
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
                        <Text className="text-white font-sans-semibold text-base">
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
                        onPress={() => {
                            router.replace("/paywall");
                        }}
                        className="bg-accent px-8 py-4 rounded-2xl mb-3 w-full items-center"
                    >
                        <Text className="text-white font-sans-semibold text-base">
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
