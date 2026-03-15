import React from "react";
import { View, Text, Pressable, ScrollView, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlassContainer from "@/components/GlassContainer";
import Animated, { FadeInDown } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface LibraryTileProps {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    description: string;
    onPress: () => void;
    index: number;
}

function LibraryTile({ title, icon, color, description, onPress, index }: LibraryTileProps) {
    const tileSize = (SCREEN_WIDTH - 52) / 2; // 2 tiles per row with spacing

    return (
        <Animated.View 
            entering={FadeInDown.delay(index * 50)}
            style={{ width: tileSize, height: tileSize }}
            className="mb-3"
        >
            <Pressable onPress={onPress} className="flex-1">
                <GlassContainer 
                    style={{ 
                        borderRadius: 32, 
                        flex: 1,
                        backgroundColor: `${color}25`, // Increased background tint for more pop
                        borderColor: `${color}45`,      // Increased border tint
                    }}
                    className="items-center justify-center p-4"
                >
                    <Ionicons name={icon} size={48} color={color} className="mb-2" />
                    <Text className="text-white font-sans-bold text-center text-base">{title}</Text>
                    <Text 
                        className="text-white/60 font-sans text-center text-xs mt-1.5 px-2"
                        numberOfLines={2}
                    >
                        {description}
                    </Text>
                </GlassContainer>
            </Pressable>
        </Animated.View>
    );
}

export default function LibraryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const tiles = [
        {
            title: "Collections",
            icon: "folder" as const,
            color: "#818CF8", // Indigo
            description: "Recipe themes",
            onPress: () => router.push("/library/collections"),
        },
        {
            title: "Meal Prep",
            icon: "calendar" as const,
            color: "#34D399", // Emerald
            description: "Weekly plans",
            onPress: () => router.push("/library/meal-prep"),
        },
        {
            title: "Shopping List",
            icon: "cart" as const,
            color: "#F472B6", // Rose
            description: "Ingredient lists",
            onPress: () => router.push("/library/shopping-list"),
        },
        {
            title: "All Recipes",
            icon: "book" as const,
            color: "#FF6B35", // Orange
            description: "Your cookbook",
            onPress: () => router.push("/(tabs)/"),
        },
    ];

    return (
        <View className="flex-1 bg-surface-950" style={{ paddingTop: Math.max(insets.top, 20) + 10 }}>
            <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="mb-8 px-1">
                    <Text className="text-surface-400 font-sans text-xs uppercase tracking-widest">
                        Your Hub
                    </Text>
                    <Text className="text-white font-sans-bold text-4xl mt-1">
                        Library
                    </Text>
                </View>

                <View className="flex-row flex-wrap justify-between">
                    {tiles.map((tile, index) => (
                        <LibraryTile key={tile.title} {...tile} index={index} />
                    ))}
                </View>

                {/* Aesthetic Backdrop Glows */}
                <View 
                    style={{
                        position: 'absolute',
                        top: -100,
                        right: -100,
                        width: 300,
                        height: 300,
                        backgroundColor: '#FF6B35',
                        borderRadius: 150,
                        opacity: 0.05,
                        zIndex: -1,
                    }}
                />
                <View 
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: -100,
                        width: 300,
                        height: 300,
                        backgroundColor: '#818CF8',
                        borderRadius: 150,
                        opacity: 0.05,
                        zIndex: -1,
                    }}
                />
            </ScrollView>
        </View>
    );
}
