import React, { useState } from "react";
import { View, Text, Platform, StatusBar, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ImportModal from "@/components/ImportModal";

export const ONBOARDING_COMPLETE_KEY = "has_completed_onboarding";

export default function FirstSaveScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [importModalVisible, setImportModalVisible] = useState(false);

    // Completes onboarding and drops them into the actual main app
    const completeOnboarding = async () => {
        await SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, "true");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)/");
    };

    const handleStartImport = () => {
        Haptics.selectionAsync();
        setImportModalVisible(true);
    };

    return (
        <View
            className="flex-1 bg-surface-950 items-center justify-center px-6"
            style={{ paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) }}
        >
            <View className="flex-1 items-center justify-center w-full max-w-sm">

                <Animated.View entering={FadeIn.delay(300)} className="w-24 h-24 rounded-full bg-accent/20 items-center justify-center mb-8 border-2 border-accent/40">
                    <Ionicons name="bookmark" size={40} color="#FF6B35" />
                </Animated.View>

                <Animated.Text entering={SlideInDown.delay(500).springify()} className="text-white font-sans-bold text-3xl text-center mb-3">
                    Your collection{"\n"}starts here.
                </Animated.Text>

                <Animated.Text entering={SlideInDown.delay(700).springify()} className="text-surface-400 font-sans text-base text-center mb-12 px-4 leading-6">
                    Grab a recipe URL from TikTok, Instagram, or any blog and paste it in. We'll do the rest.
                </Animated.Text>

                <Animated.View entering={SlideInDown.delay(900).springify()} className="w-full">
                    <Pressable
                        onPress={handleStartImport}
                        className="bg-accent w-full py-4 rounded-2xl items-center flex-row justify-center shadow-lg shadow-accent/30"
                    >
                        <Ionicons name="add-circle" size={24} color="#FFFFFF" className="mr-2" />
                        <Text className="text-white font-sans-bold text-lg">Save First Recipe</Text>
                    </Pressable>

                    <Pressable
                        onPress={completeOnboarding}
                        className="w-full py-4 rounded-2xl items-center mt-4"
                    >
                        <Text className="text-surface-400 font-sans-semibold text-sm">Skip for now</Text>
                    </Pressable>
                </Animated.View>

            </View>

            {/* We re-use our global ImportModal so the UX matches */}
            <ImportModal
                visible={importModalVisible}
                onClose={() => {
                    setImportModalVisible(false);
                    // Standard onClose might trigger after a successful save
                    // To ensure they don't get stuck, we mark onboarding complete
                    completeOnboarding();
                }}
            />
        </View>
    );
}
