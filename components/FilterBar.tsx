import React from "react";
import { ScrollView, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

interface FilterItem {
    id: string;
    label: string;
    type: "all" | "collection" | "tag" | "source";
}

interface FilterBarProps {
    filters: FilterItem[];
    activeFilter: string;
    onFilterSelect: (id: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function FilterChip({
    item,
    isActive,
    onPress,
}: {
    item: FilterItem;
    isActive: boolean;
    onPress: () => void;
}) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <AnimatedPressable
            entering={FadeIn}
            style={animatedStyle}
            onPressIn={() => { scale.value = withSpring(0.93); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            onPress={onPress}
            className={`px-4 py-2 rounded-full mr-2 ${isActive
                    ? "bg-accent"
                    : "bg-surface-800 border border-surface-600"
                }`}
        >
            <Text
                className={`font-sans-medium text-xs ${isActive ? "text-white" : "text-surface-300"
                    }`}
            >
                {item.label}
            </Text>
        </AnimatedPressable>
    );
}

export default function FilterBar({
    filters,
    activeFilter,
    onFilterSelect,
}: FilterBarProps) {
    return (
        <View className="py-3">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12 }}
            >
                {filters.map((filter) => (
                    <FilterChip
                        key={filter.id}
                        item={filter}
                        isActive={activeFilter === filter.id}
                        onPress={() => onFilterSelect(filter.id)}
                    />
                ))}
            </ScrollView>
        </View>
    );
}
