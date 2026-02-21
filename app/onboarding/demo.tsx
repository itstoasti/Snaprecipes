import React, { useEffect } from "react";
import { View, Text, Platform, StatusBar, Image } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeOut, SlideInRight, SlideInUp, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, Easing, withSequence } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function DemoScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Animation Values
    const urlY = useSharedValue(50);
    const urlOpacity = useSharedValue(0);
    const sparkleScale = useSharedValue(0);
    const cardScale = useSharedValue(0.9);
    const cardOpacity = useSharedValue(0);

    useEffect(() => {
        // 1. URL drops in (Header reads: Paste any link. Extract instantly.)
        urlY.value = withDelay(400, withSpring(0, { damping: 20, stiffness: 80 }));
        urlOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));

        // 2. Give them time to read the URL, then it disappears into sparkles
        urlY.value = withDelay(2800, withTiming(-20, { duration: 400, easing: Easing.in(Easing.ease) }));
        urlOpacity.value = withDelay(2800, withTiming(0, { duration: 400 }));

        // 3. Sparkles pop
        sparkleScale.value = withDelay(3000, withSequence(
            withSpring(1.2, { damping: 14, stiffness: 100 }),
            withTiming(0, { duration: 400 })
        ));

        // 4. Clean recipe card appears
        cardScale.value = withDelay(3200, withSpring(1, { damping: 22, stiffness: 80 }));
        cardOpacity.value = withDelay(3200, withTiming(1, { duration: 600 }));

        // 5. Give them time to admire the clean parsed card before final transition
        const timer = setTimeout(() => {
            router.replace("/onboarding/first-save");
        }, 6500);

        return () => clearTimeout(timer);
    }, [router]);

    const urlStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: urlY.value }],
        opacity: urlOpacity.value,
        position: 'absolute'
    }));

    const sparkleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: sparkleScale.value }],
        position: 'absolute'
    }));

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
        opacity: cardOpacity.value,
        position: 'absolute'
    }));

    return (
        <View
            className="flex-1 bg-surface-950 items-center justify-center px-6"
            style={{ paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) }}
        >
            <Animated.Text entering={FadeIn.delay(200)} className="text-white font-sans-bold text-4xl mb-6 text-center">
                Paste any link.{"\n"}
                <Text className="text-accent font-sans-bold">Extract instantly.</Text>
            </Animated.Text>

            <View className="w-full items-center justify-center relative h-[360px]">

                {/* 1. The messy URL */}
                <Animated.View style={urlStyle} className="bg-surface-800 rounded-full px-5 py-3 flex-row items-center border border-surface-700">
                    <Ionicons name="link" size={18} color="#6E6E85" className="mr-2" />
                    <Text className="text-surface-400 font-sans text-sm" numberOfLines={1}>
                        https://blog.com/10-page-story/recipe...
                    </Text>
                </Animated.View>

                {/* 2. Extraction Magic */}
                <Animated.View style={sparkleStyle} className="w-20 h-20 rounded-full bg-accent/20 items-center justify-center">
                    <Ionicons name="sparkles" size={32} color="#FF6B35" />
                </Animated.View>

                {/* 3. The Clean Result */}
                <Animated.View style={cardStyle} className="bg-surface-900 rounded-3xl w-full max-w-[280px] overflow-hidden border border-surface-800 shadow-xl">
                    <View className="h-32 bg-surface-800 relative">
                        <Image
                            source={{ uri: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&q=80" }}
                            className="absolute inset-0 w-full h-full"
                            style={{ resizeMode: 'cover' }}
                        />
                        {/* Subtle dark gradient overlay to make text pop if added over image */}
                        <View className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface-900/80 to-transparent" />
                    </View>
                    <View className="p-5">
                        <Text className="text-white font-sans-bold text-lg mb-2">Perfect Chocolate Chip Cookies</Text>
                        <View className="flex-row items-center mb-4">
                            <Ionicons name="time-outline" size={14} color="#6E6E85" />
                            <Text className="text-surface-400 font-sans text-xs ml-1 mr-4">15m</Text>
                            <Ionicons name="people-outline" size={14} color="#6E6E85" />
                            <Text className="text-surface-400 font-sans text-xs ml-1">24 cookies</Text>
                        </View>

                        {/* Mock ingredients */}
                        <View className="space-y-2">
                            <View className="flex-row py-1 border-b border-surface-800"><Text className="text-accent font-sans-semibold w-12 text-xs">2 cups</Text><Text className="text-white font-sans text-xs">Flour</Text></View>
                            <View className="flex-row py-1 border-b border-surface-800"><Text className="text-accent font-sans-semibold w-12 text-xs">1 cup</Text><Text className="text-white font-sans text-xs">Butter</Text></View>
                            <View className="flex-row py-1"><Text className="text-accent font-sans-semibold w-12 text-xs">2 cups</Text><Text className="text-white font-sans text-xs">Chocolate Chips</Text></View>
                        </View>
                    </View>
                </Animated.View>

            </View>
        </View>
    );
}
