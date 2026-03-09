import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    Modal,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
    FadeIn,
    SlideInDown,
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing
} from "react-native-reanimated";
import GlassContainer from "./GlassContainer";
import { extractFromUrl } from "@/lib/extract";
import { useRecipes } from "@/hooks/useRecipes";
import { canExtractRecipe, incrementUsage } from "@/lib/usage";
import { useRevenueCat } from "@/hooks/useRevenueCat";

interface ImportModalProps {
    visible: boolean;
    onClose: () => void;
}
const LOADING_STEPS = [
    "Analyzing source URL...",
    "Reading recipe structure...",
    "Extracting ingredients...",
    "Formatting instructions...",
    "Adding some magic...",
    "Sprinkling a pinch of salt...",
    "Simmering gently...",
    "Letting the flavors meld...",
    "Almost ready...",
    "Perfecting the details...",
    "Garnishing the final product...",
];

function ExtractionLoader() {
    const [stepIndex, setStepIndex] = useState(0);
    const stepCountRef = useRef(0);
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

        const interval = setInterval(() => {
            stepCountRef.current += 1;
            const nextTotal = stepCountRef.current;

            if (nextTotal < LOADING_STEPS.length) {
                progress.value = withTiming((nextTotal + 1) / LOADING_STEPS.length, { duration: 500 });
                setStepIndex(nextTotal);
            } else {
                // Loop back to index 4 ("Adding some magic...") and cycle through the rest
                const loopIndex = 4 + ((nextTotal - LOADING_STEPS.length) % (LOADING_STEPS.length - 4));
                progress.value = withTiming(0.95, { duration: 500 });
                setStepIndex(loopIndex);
            }
        }, 2200);

        // Intial progress bar pop
        progress.value = withTiming(1 / LOADING_STEPS.length, { duration: 500 });

        return () => clearInterval(interval);
    }, []);

    const animatedSparkleStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: pulse.value },
            { rotate: `${rotate.value}deg` }
        ]
    }));

    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`
    }));

    return (
        <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(400)} className="items-center justify-center py-6 mt-2">
            <View className="relative items-center justify-center mb-8">
                {/* Glow behind */}
                <Animated.View
                    style={[animatedSparkleStyle]}
                    className="absolute w-24 h-24 rounded-full bg-accent/20"
                />
                <Animated.View style={animatedSparkleStyle} className="w-16 h-16 rounded-full bg-accent/20 items-center justify-center border border-accent/50">
                    <Ionicons name="sparkles" size={28} color="#FF6B35" />
                </Animated.View>
            </View>

            <Animated.Text
                key={stepIndex}
                entering={FadeIn.duration(400)}
                exiting={FadeOut.duration(400)}
                className="text-white font-sans-semibold text-lg text-center"
            >
                {LOADING_STEPS[stepIndex]}
            </Animated.Text>

            <View className="w-48 h-1.5 bg-surface-800 rounded-full mt-8 overflow-hidden">
                {/* Progress bar */}
                <Animated.View
                    style={[animatedProgressStyle]}
                    className="absolute top-0 bottom-0 left-0 bg-accent rounded-full"
                />
            </View>
        </Animated.View>
    );
}

export default function ImportModal({ visible, onClose }: ImportModalProps) {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"choose" | "url" | "api_error" | "duplicate_error">("choose");
    const [duplicateId, setDuplicateId] = useState<number | null>(null);
    const { insertRecipe, recipes } = useRecipes();
    const router = useRouter();
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const { isPro } = useRevenueCat();

    useEffect(() => {
        const showSubscription = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            (e) => setKeyboardHeight(e.endCoordinates.height)
        );
        const hideSubscription = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
            () => setKeyboardHeight(0)
        );

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const handleExtractUrl = async () => {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
            Alert.alert("Error", "Please enter a URL");
            return;
        }

        // --- Duplicate Check ---
        // Normalize URL to ignore changing query parameters like ?igshid= or ?share=
        let baseUrl = trimmedUrl;
        try {
            const parsed = new URL(trimmedUrl);
            baseUrl = `${parsed.origin}${parsed.pathname}`;
        } catch (e) {
            // Ignore invalid URL
        }

        const existingRecipe = recipes.find(r => {
            if (!r.source_url) return false;
            try {
                const rUrl = new URL(r.source_url);
                return `${rUrl.origin}${rUrl.pathname}`.toLowerCase() === baseUrl.toLowerCase();
            } catch (e) {
                return r.source_url.toLowerCase() === trimmedUrl.toLowerCase();
            }
        });

        if (existingRecipe) {
            setDuplicateId(existingRecipe.id);
            setMode("duplicate_error");
            return;
        }

        const canExtract = await canExtractRecipe(isPro);
        if (!canExtract) {
            Alert.alert(
                "Usage Limit Reached",
                "You've reached your free limit of 5 recipe extractions for this month. Upgrade to SnapRecipes Pro for unlimited extractions!",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Upgrade", onPress: () => { onClose(); router.push("/paywall"); } }
                ]
            );
            return;
        }

        setLoading(true);
        try {
            const recipe = await extractFromUrl(trimmedUrl);
            const recipeId = await insertRecipe(recipe, trimmedUrl, "url");

            // Tick up the free usage counter
            await incrementUsage();

            setUrl("");
            setMode("choose");

            // Note: the review prompt handles its own visibility via state.
            onClose();
            if (recipeId) {
                router.push(`/recipe/${recipeId}?isNew=true`);
            }
        } catch (error: any) {
            const errorMsg = error.message || "Could not extract recipe from this URL";

            // Catch API rate limits (429) and quota exhaustion errors
            if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("too many requests")) {
                setMode("api_error");
            } else if (errorMsg.toLowerCase().includes("network request failed")) {
                Alert.alert(
                    "Extraction Interrupted",
                    "The connection was dropped because the app went into the background. Please keep SnapRecipes open while extracting."
                );
            } else {
                Alert.alert("Extraction Failed", errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCamera = () => {
        setMode("choose");
        onClose();
        router.push("/camera");
    };

    const handleManual = () => {
        setMode("choose");
        onClose();
        router.push("/recipe/new");
    };

    const handleClose = () => {
        setUrl("");
        setMode("choose");
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <Pressable
                onPress={handleClose}
                className="flex-1 bg-black/60 justify-end"
            >
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <Animated.View
                        entering={SlideInDown.springify().damping(26).stiffness(70)}
                    >
                        <GlassContainer
                            style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
                            className="p-6 pb-12"
                        >
                            {/* Handle */}
                            <View className="self-center w-10 h-1 bg-surface-500 rounded-full mb-5" />

                            {mode === "api_error" ? (
                                <Animated.View entering={FadeIn}>
                                    <View className="items-center mb-6 mt-2">
                                        <View className="w-16 h-16 rounded-full bg-surface-800 items-center justify-center border border-surface-700 shadow-xl mb-4">
                                            <Animated.View entering={FadeIn.delay(300)}>
                                                <Text style={{ fontSize: 32 }}>😅</Text>
                                            </Animated.View>
                                        </View>

                                        <Text className="text-white font-sans-bold text-2xl text-center mb-2">
                                            Uh oh!
                                        </Text>
                                        <Text className="text-surface-400 font-sans text-center text-sm px-2">
                                            Looks like we are more popular than we expected right now and hit our extraction limits!
                                        </Text>
                                        <Text className="text-surface-400 font-sans text-center text-sm px-2 mt-2">
                                            Tip: Try switching your AI Engine in the Settings tab, or you can use the Manual Import feature.
                                        </Text>
                                    </View>

                                    <View className="space-y-3 gap-3">
                                        <Pressable
                                            onPress={() => {
                                                handleClose();
                                                setTimeout(() => router.push("/(tabs)/settings"), 300);
                                            }}
                                            className="w-full py-4 rounded-xl items-center bg-accent shadow-lg shadow-accent/20 flex-row justify-center"
                                        >
                                            <Ionicons name="settings" size={18} color="white" className="mr-2" style={{ marginRight: 8 }} />
                                            <Text className="text-white font-sans-bold text-base">Go to Settings</Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={() => setMode("choose")}
                                            className="w-full py-4 rounded-xl items-center bg-surface-800 border border-surface-700"
                                        >
                                            <Text className="text-surface-300 font-sans-semibold text-base">Back to Import</Text>
                                        </Pressable>
                                    </View>
                                </Animated.View>
                            ) : mode === "duplicate_error" ? (
                                <Animated.View entering={FadeIn}>
                                    <View className="items-center mb-6 mt-2">
                                        <View className="w-16 h-16 rounded-full bg-surface-800 items-center justify-center border border-surface-700 shadow-xl mb-4">
                                            <Animated.View entering={FadeIn.delay(300)}>
                                                <Ionicons name="documents" size={32} color="#818CF8" />
                                            </Animated.View>
                                        </View>

                                        <Text className="text-white font-sans-bold text-2xl text-center mb-2">
                                            Already Saved
                                        </Text>
                                        <Text className="text-surface-400 font-sans text-center text-sm px-2">
                                            Looks like you have already added this recipe to your collection!
                                        </Text>
                                    </View>

                                    <View className="space-y-3 gap-3">
                                        <Pressable
                                            onPress={() => {
                                                if (duplicateId) {
                                                    handleClose();
                                                    setTimeout(() => router.push(`/recipe/${duplicateId}`), 100);
                                                }
                                            }}
                                            className="w-full py-4 rounded-xl items-center bg-[#818CF8] shadow-lg shadow-[#818CF8]/20 flex-row justify-center"
                                        >
                                            <Ionicons name="arrow-forward" size={18} color="white" className="mr-2" style={{ marginRight: 8 }} />
                                            <Text className="text-white font-sans-bold text-base">View Recipe</Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={() => setMode("choose")}
                                            className="w-full py-4 rounded-xl items-center bg-surface-800 border border-surface-700"
                                        >
                                            <Text className="text-surface-300 font-sans-semibold text-base">Wait, let me pick a different URL</Text>
                                        </Pressable>
                                    </View>
                                </Animated.View>
                            ) : mode === "choose" ? (
                                <>
                                    <Text className="text-white font-sans-bold text-xl mb-1">
                                        Import Recipe
                                    </Text>
                                    <Text className="text-surface-400 font-sans text-sm mb-6">
                                        Choose how you'd like to add a recipe
                                    </Text>

                                    {/* URL Option */}
                                    <Pressable
                                        onPress={() => setMode("url")}
                                        className="flex-row items-center p-4 bg-surface-800/60 rounded-2xl mb-3"
                                    >
                                        <View className="w-12 h-12 rounded-full bg-accent/20 items-center justify-center mr-4">
                                            <Ionicons name="link" size={24} color="#FF6B35" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white font-sans-semibold text-base">
                                                Paste URL
                                            </Text>
                                            <Text className="text-surface-400 font-sans text-xs mt-0.5">
                                                Import from any website, TikTok, Instagram, Reddit
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#6E6E85" />
                                    </Pressable>

                                    {/* Camera Option */}
                                    <Pressable
                                        onPress={handleCamera}
                                        className="flex-row items-center p-4 bg-surface-800/60 rounded-2xl mb-3"
                                    >
                                        <View className="w-12 h-12 rounded-full bg-mint/20 items-center justify-center mr-4">
                                            <Ionicons name="camera" size={24} color="#34D399" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white font-sans-semibold text-base">
                                                Scan Recipe
                                            </Text>
                                            <Text className="text-surface-400 font-sans text-xs mt-0.5">
                                                Take a photo of a printed or handwritten recipe
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#6E6E85" />
                                    </Pressable>

                                    {/* Manual Option */}
                                    <Pressable
                                        onPress={handleManual}
                                        className="flex-row items-center p-4 bg-surface-800/60 rounded-2xl"
                                    >
                                        <View className="w-12 h-12 rounded-full bg-surface-600/40 items-center justify-center mr-4">
                                            <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white font-sans-semibold text-base">
                                                Add Manually
                                            </Text>
                                            <Text className="text-surface-400 font-sans text-xs mt-0.5">
                                                Type or paste text directly into a form
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#6E6E85" />
                                    </Pressable>
                                </>
                            ) : (
                                <>
                                    {/* Back button */}
                                    <Pressable
                                        onPress={() => setMode("choose")}
                                        className="flex-row items-center mb-4"
                                        disabled={loading}
                                    >
                                        <Ionicons name="arrow-back" size={20} color={loading ? "#6E6E85" : "#FF6B35"} />
                                        <Text className={`font-sans-medium text-sm ml-1 ${loading ? "text-surface-500" : "text-accent"}`}>
                                            Back
                                        </Text>
                                    </Pressable>

                                    {loading ? (
                                        <ExtractionLoader />
                                    ) : (
                                        <Animated.View entering={FadeIn}>
                                            <Text className="text-white font-sans-bold text-xl mb-1">
                                                Paste Recipe URL
                                            </Text>
                                            <Text className="text-surface-400 font-sans text-sm mb-4">
                                                Works with most recipe websites and social media
                                            </Text>

                                            <TextInput
                                                value={url}
                                                onChangeText={setUrl}
                                                placeholder="https://www.allrecipes.com/recipe/..."
                                                placeholderTextColor="#6E6E85"
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                                keyboardType="url"
                                                returnKeyType="go"
                                                onSubmitEditing={handleExtractUrl}
                                                className="bg-surface-800 text-white font-sans p-4 rounded-2xl mb-4 text-sm"
                                            />

                                            <Pressable
                                                onPress={handleExtractUrl}
                                                disabled={!url.trim()}
                                                className={`p-4 rounded-2xl items-center ${!url.trim() ? "bg-accent/40" : "bg-accent"}`}
                                            >
                                                <Text className="text-white font-sans-semibold text-base">
                                                    Extract Recipe
                                                </Text>
                                            </Pressable>
                                        </Animated.View>
                                    )}
                                </>
                            )}
                        </GlassContainer>
                    </Animated.View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
