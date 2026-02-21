import React, { useEffect } from "react";
import { View, Text, Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeOut, SlideInDown, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function WelcomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Automatically transition to the next demo screen after reading time
    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace("/onboarding/demo");
        }, 4500); // Increased from 3500 so they can actually read it
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <View
            className="flex-1 bg-surface-950 items-center justify-center px-6"
            style={{ paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) }}
        >
            <Animated.View entering={FadeIn.duration(1000)} className="items-center mb-12">
                <Text className="text-6xl mb-4">🍳</Text>
                <Text className="text-white font-sans-bold text-4xl">SnapRecipes</Text>
            </Animated.View>

            <View className="space-y-8 w-full max-w-sm">
                <Animated.View entering={SlideInDown.delay(600).springify().damping(26).stiffness(70)} className="flex-row items-center justify-center">
                    <Ionicons name="sparkles" size={26} color="#FF6B35" className="mr-3" />
                    <Text className="text-white font-sans-semibold text-xl">Get clean recipes.</Text>
                </Animated.View>

                <Animated.View entering={SlideInDown.delay(1200).springify().damping(26).stiffness(70)} className="flex-row items-center justify-center">
                    <Ionicons name="ban" size={26} color="#34D399" className="mr-3" />
                    <Text className="text-white font-sans-semibold text-xl">No annoying ads.</Text>
                </Animated.View>

                <Animated.View entering={SlideInDown.delay(1800).springify().damping(26).stiffness(70)} className="flex-row items-center justify-center">
                    <Ionicons name="reader" size={26} color="#818CF8" className="mr-3" />
                    <Text className="text-white font-sans-semibold text-xl">No 10-page life stories.</Text>
                </Animated.View>
            </View>
        </View>
    );
}
