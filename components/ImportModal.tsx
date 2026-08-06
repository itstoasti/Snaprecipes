import React, { useState, useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import {
    View,
    Text,
    TextInput,
    Pressable,
    Modal,
    Alert,
    Platform,
    Keyboard,
    Dimensions,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import GlassContainer from "./GlassContainer";
import { getCurrentUsage } from "@/lib/usage";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useTheme } from "@/hooks/useTheme";

interface ImportModalProps {
    visible: boolean;
    onClose: () => void;
    onImportSuccess?: () => void;
}
export default function ImportModal({ visible, onClose }: ImportModalProps) {
    const [url, setUrl] = useState("");
    const [mode, setMode] = useState<"choose" | "url">("choose");
    const router = useRouter();
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const { isPro } = useRevenueCat();
    const { colors } = useTheme();
    const [shareToCommunity, setShareToCommunity] = useState(true);
    const [usageCount, setUsageCount] = useState(0);

    useEffect(() => {
        if (visible) {
            trackEvent("recipe_import_opened");
        }
        if (visible && !isPro) {
            getCurrentUsage().then(setUsageCount).catch(console.error);
        }
    }, [visible, isPro]);

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

    const handleExtractUrl = () => {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
            Alert.alert("Error", "Please enter a URL");
            return;
        }

        trackEvent("recipe_import_started", { source: "url" });
        const shouldShare = !isPro || shareToCommunity;
        setUrl("");
        setMode("choose");
        onClose();
        router.push({
            pathname: "/extracting",
            params: { url: trimmedUrl, share: shouldShare ? "1" : "0" },
        });
    };

    const handleCamera = () => {
        trackEvent("recipe_import_method_selected", { method: "camera" });
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
                className="flex-1 bg-black/60 justify-center items-center p-6"
            >
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        style={{ width: SCREEN_WIDTH - 40 }}
                    >
                        <GlassContainer
                            className="p-8 rounded-[40px] overflow-hidden"
                        >

                            {mode === "choose" ? (
                                <>
                                    <Text className="text-white font-sans-bold text-2xl mb-2">
                                        Import Recipe
                                    </Text>
                                    <Text className="text-surface-400 font-sans text-base mb-5">
                                        Choose how you'd like to add a recipe
                                    </Text>

                                    {!isPro && (
                                        <Pressable
                                            onPress={() => {
                                                handleClose();
                                                router.push("/paywall");
                                            }}
                                            className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5"
                                        >
                                            <View className="flex-row justify-between items-center mb-2">
                                                <Text className="text-surface-400 font-sans-bold text-[10px] uppercase tracking-widest">Monthly Free Saves</Text>
                                                <Text className="text-white font-sans-bold text-xs">{usageCount} / 10 used</Text>
                                            </View>
                                            <View className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                                                <View style={{ width: `${(usageCount / 10) * 100}%` }} className="h-full bg-accent rounded-full" />
                                            </View>
                                            <View className="flex-row justify-between items-center">
                                                <Text className="text-surface-500 font-sans text-[10px]">
                                                    {usageCount >= 10 ? "Limit reached" : `${10 - usageCount} free saves left this month`}
                                                </Text>
                                                <Text className="text-accent font-sans-bold text-[10px]">Go Pro for Unlimited →</Text>
                                            </View>
                                        </Pressable>
                                    )}

                                    {/* URL Option */}
                                    <Pressable
                                        onPress={() => {
                                        trackEvent("recipe_import_method_selected", { method: "url" });
                                        setMode("url");
                                    }}
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
                                        <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
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
                                        <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
                                    </Pressable>

                                    {/* Manual Option */}
                                    <Pressable
                                        onPress={handleManual}
                                        className="flex-row items-center p-4 bg-surface-800/60 rounded-2xl"
                                    >
                                        <View className="w-12 h-12 rounded-full bg-surface-600/40 items-center justify-center mr-4">
                                            <Ionicons name="create-outline" size={24} color={colors.text} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white font-sans-semibold text-base">
                                                Add Manually
                                            </Text>
                                            <Text className="text-surface-400 font-sans text-xs mt-0.5">
                                                Type or paste text directly into a form
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
                                    </Pressable>
                                </>
                            ) : (
                                <>
                                    {/* Back button */}
                                    <Pressable
                                        onPress={() => setMode("choose")}
                                        className="flex-row items-center mb-4"
                                    >
                                        <Ionicons name="arrow-back" size={20} color="#FF6B35" />
                                        <Text className="font-sans-medium text-sm ml-1 text-accent">
                                            Back
                                        </Text>
                                    </Pressable>

                                    <Animated.View entering={FadeIn}>
                                            <Text className="text-white font-sans-bold text-2xl mb-2">
                                                Paste Recipe URL
                                            </Text>
                                            <Text className="text-surface-400 font-sans text-base mb-6">
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
                                                onPress={() => isPro && setShareToCommunity(!shareToCommunity)}
                                                className={`flex-row items-center p-4 rounded-2xl mb-6 ${shareToCommunity || !isPro ? 'bg-surface-800' : 'bg-surface-900'}`}
                                            >
                                                <View className={`w-6 h-6 rounded-md items-center justify-center mr-3 ${shareToCommunity || !isPro ? 'bg-accent' : 'border border-surface-600'}`}>
                                                    {(shareToCommunity || !isPro) && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-white font-sans-semibold text-sm mb-0.5">Share to Community Library</Text>
                                                    <Text className="text-surface-400 font-sans text-xs">
                                                        {!isPro ? "Free users automatically share imported and manual recipes to the community." : "Allow others to discover and use this recipe."}
                                                    </Text>
                                                </View>
                                                {!isPro && (
                                                    <Ionicons name="lock-closed" size={16} color={colors.textFaint} />
                                                )}
                                            </Pressable>

                                            <Pressable
                                                onPress={handleExtractUrl}
                                                disabled={!url.trim()}
                                                className={`p-4 rounded-2xl items-center ${!url.trim() ? "bg-accent/40" : "bg-accent"}`}
                                            >
                                                <Text className="text-[#FFFFFF] font-sans-semibold text-base">
                                                    Extract Recipe
                                                </Text>
                                            </Pressable>
                                    </Animated.View>
                                </>
                            )}
                        </GlassContainer>
                    </Animated.View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
