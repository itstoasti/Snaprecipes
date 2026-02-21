import React, { useState, useEffect } from "react";
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
import { hasReachedFreeLimit, incrementMonthlyUsage } from "@/lib/usage";

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
];

function ExtractionLoader() {
    const [stepIndex, setStepIndex] = useState(0);
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
            setStepIndex((prev) => {
                const next = Math.min(prev + 1, LOADING_STEPS.length - 1);
                progress.value = withTiming((next + 1) / LOADING_STEPS.length, { duration: 500 });
                return next;
            });
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
    const [mode, setMode] = useState<"choose" | "url">("choose");
    const { insertRecipe } = useRecipes();
    const router = useRouter();

    const handleExtractUrl = async () => {
        if (!url.trim()) {
            Alert.alert("Error", "Please enter a URL");
            return;
        }

        const reachedLimit = await hasReachedFreeLimit();
        if (reachedLimit) {
            onClose();
            router.push("/paywall");
            return;
        }

        setLoading(true);
        try {
            const recipe = await extractFromUrl(url.trim());
            const recipeId = await insertRecipe(recipe, url.trim(), "url");

            await incrementMonthlyUsage();

            setUrl("");
            setMode("choose");
            onClose();
            if (recipeId) {
                router.push(`/recipe/${recipeId}`);
            }
        } catch (error: any) {
            Alert.alert("Extraction Failed", error.message || "Could not extract recipe from this URL");
        } finally {
            setLoading(false);
        }
    };

    const handleCamera = async () => {
        const reachedLimit = await hasReachedFreeLimit();
        if (reachedLimit) {
            onClose();
            router.push("/paywall");
            return;
        }

        setMode("choose");
        onClose();
        router.push("/camera");
    };

    const handleManual = async () => {
        const reachedLimit = await hasReachedFreeLimit();
        if (reachedLimit) {
            onClose();
            router.push("/paywall");
            return;
        }

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
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <Pressable
                    onPress={handleClose}
                    className="flex-1 bg-black/60 justify-end"
                >
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <Animated.View entering={SlideInDown.springify().damping(26).stiffness(70)}>
                            <GlassContainer
                                style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
                                className="p-6 pb-12"
                            >
                                {/* Handle */}
                                <View className="self-center w-10 h-1 bg-surface-500 rounded-full mb-5" />

                                {mode === "choose" ? (
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
            </KeyboardAvoidingView>
        </Modal>
    );
}
