import React, { useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

interface RecipeCardProps {
    id: number;
    title: string;
    imageUrl: string | null;
    prepTime: string | null;
    cookTime: string | null;
    sourceType: string;
    index: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RecipeCard({
    id,
    title,
    imageUrl,
    prepTime,
    cookTime,
    sourceType,
    index,
}: RecipeCardProps) {
    const router = useRouter();
    const scale = useSharedValue(1);
    const [imageError, setImageError] = useState(false);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.96, { damping: 15 });
    }, [scale]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 15 });
    }, [scale]);

    const handlePress = useCallback(() => {
        router.push(`/recipe/${id}`);
    }, [router, id]);

    const timeLabel = [prepTime, cookTime].filter(Boolean).join(" + ") || null;

    const sourceIcon =
        sourceType === "camera" ? "📷" : sourceType === "url" ? "🔗" : "✏️";

    return (
        <AnimatedPressable
            entering={FadeInDown.delay(index * 80).springify()}
            style={animatedStyle}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            className="flex-1 m-1.5 rounded-3xl overflow-hidden bg-surface-800"
        >
            {/* Image */}
            <View className="aspect-[4/3] bg-surface-700 overflow-hidden">
                {imageUrl && !imageError ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                        transition={300}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <View className="flex-1 items-center justify-center bg-surface-700">
                        <Text className="text-4xl">🍳</Text>
                    </View>
                )}
            </View>

            {/* Content */}
            <View className="p-3 gap-1.5">
                <Text
                    className="text-white font-sans-semibold text-sm leading-tight"
                    numberOfLines={2}
                >
                    {title}
                </Text>

                <View className="flex-row items-center justify-between">
                    {timeLabel && (
                        <Text className="text-surface-400 font-sans text-xs">
                            ⏱ {timeLabel}
                        </Text>
                    )}
                    <Text className="text-xs">{sourceIcon}</Text>
                </View>
            </View>
        </AnimatedPressable>
    );
}
