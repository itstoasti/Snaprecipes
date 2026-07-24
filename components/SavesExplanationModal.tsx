import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import GlassContainer from "./GlassContainer";

interface SavesExplanationModalProps {
    visible: boolean;
    usageCount: number;
    onClose: () => void;
}

export default function SavesExplanationModal({
    visible,
    usageCount,
    onClose,
}: SavesExplanationModalProps) {
    const router = useRouter();

    if (!visible) return null;

    const progressPercent = Math.min((usageCount / 5) * 100, 100);
    const savesLeft = Math.max(5 - usageCount, 0);

    const handleUpgrade = () => {
        onClose();
        router.push("/paywall");
    };

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            <View className="flex-1 justify-center items-center px-6">
                {/* Backdrop Blur */}
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    className="absolute inset-0"
                >
                    <BlurView intensity={30} tint="dark" className="flex-1 bg-black/40" />
                </Animated.View>

                {/* Modal Container */}
                <Animated.View
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(200)}
                    className="w-full max-w-sm"
                >
                    <GlassContainer style={{ borderRadius: 32, overflow: "hidden" }}>
                        <View className="p-8 items-center">
                            {/* Icon Badge */}
                            <View className="w-16 h-16 rounded-full bg-accent/10 items-center justify-center mb-5 border border-accent/20">
                                <Ionicons name="sparkles" size={30} color="#FF6B35" />
                            </View>

                            {/* Title & Explanation */}
                            <Text className="text-white font-sans-bold text-2xl mb-3 text-center">
                                Monthly Free Saves
                            </Text>
                            <Text className="text-surface-300 font-sans text-sm text-center mb-6 px-1 leading-5">
                                Free users receive 5 recipe saves or web imports every calendar month. This resets on the 1st of each month.
                            </Text>

                            {/* Progress Card */}
                            <View className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 mb-6">
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-surface-400 font-sans-bold text-[10px] uppercase tracking-widest">
                                        Usage Tracker
                                    </Text>
                                    <Text className="text-white font-sans-bold text-xs">
                                        {usageCount} / 5 saves
                                    </Text>
                                </View>
                                <View className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                                    <View 
                                        style={{ width: `${progressPercent}%` }} 
                                        className="h-full bg-accent rounded-full" 
                                    />
                                </View>
                                <Text className="text-surface-500 font-sans text-[10px]">
                                    {usageCount >= 5 
                                        ? "Monthly limit reached" 
                                        : `${savesLeft} free saves left this month`
                                    }
                                </Text>
                            </View>

                            {/* Actions */}
                            <View className="w-full" style={{ gap: 10 }}>
                                <Pressable
                                    onPress={handleUpgrade}
                                    className="w-full py-4 rounded-2xl bg-accent items-center justify-center shadow-lg shadow-accent/20"
                                >
                                    <Text className="text-white font-sans-bold text-base">
                                        Go Pro for Unlimited
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={onClose}
                                    className="w-full py-4 rounded-2xl bg-surface-800 border border-surface-700 items-center justify-center"
                                >
                                    <Text className="text-surface-300 font-sans-semibold text-base">
                                        Maybe Later
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </GlassContainer>
                </Animated.View>
            </View>
        </Modal>
    );
}
