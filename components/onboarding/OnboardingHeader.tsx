import React from "react";
import { View, Text, Pressable, Platform, StatusBar, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface OnboardingHeaderProps {
    progress?: number; // 0 to 1
    showBack?: boolean;
    showSkip?: boolean;
    onBack?: () => void;
    onSkip?: () => void;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
    progress,
    showBack = true,
    showSkip = false,
    onBack,
    onSkip,
}) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (router.canGoBack()) {
            router.back();
        }
    };

    return (
        <View
            style={{ paddingTop: Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight || 0 : 12) }}
            className="w-full bg-[#FAF7F2] px-6 pb-2"
        >
            {/* Top Logo & App Branding using official assets/icon.png */}
            <View className="items-center justify-center py-2 mb-2">
                <View className="flex-row items-center justify-center space-x-2">
                    <View className="w-8 h-8 rounded-xl overflow-hidden shadow-sm border border-gray-200">
                        <Image
                            source={require("../../assets/icon.png")}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    </View>
                    <Text className="text-[#1F2937] font-sans-bold text-2xl tracking-tight">SnapRecipes</Text>
                </View>
            </View>

            {/* Navigation & Progress Bar Row */}
            <View className="flex-row items-center justify-between min-h-[32px] px-1">
                {showBack ? (
                    <Pressable
                        onPress={handleBack}
                        hitSlop={12}
                        className="w-8 h-8 items-center justify-center rounded-full bg-[#FFFFFF] border border-gray-200 active:bg-gray-100 shadow-sm"
                    >
                        <Ionicons name="arrow-back" size={20} color="#1F2937" />
                    </Pressable>
                ) : (
                    <View className="w-8" />
                )}

                {/* Progress Bar */}
                {progress !== undefined ? (
                    <View className="flex-1 mx-4 h-2 bg-gray-200/80 rounded-full overflow-hidden">
                        <View
                            className="h-full bg-[#FF6B35] rounded-full"
                            style={{ width: `${Math.min(Math.max(progress * 100, 5), 100)}%` }}
                        />
                    </View>
                ) : (
                    <View className="flex-1 mx-4" />
                )}

                {showSkip ? (
                    <Pressable onPress={onSkip} hitSlop={12} className="px-2 py-1">
                        <Text className="text-[#4B5563] font-sans-semibold text-base">Skip</Text>
                    </Pressable>
                ) : (
                    <View className="w-8" />
                )}
            </View>
        </View>
    );
};
