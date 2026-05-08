import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import GlassContainer from "./GlassContainer";
import * as Haptics from "expo-haptics";

const MEAL_OPTIONS: {
    key: "breakfast" | "lunch" | "dinner" | "snack";
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    label: string;
}[] = [
    { key: "breakfast", icon: "sunny", color: "#FBBF24", label: "Breakfast" },
    { key: "lunch", icon: "restaurant", color: "#34D399", label: "Lunch" },
    { key: "dinner", icon: "moon", color: "#818CF8", label: "Dinner" },
    { key: "snack", icon: "cafe", color: "#F472B6", label: "Snacks" },
];

interface MoveMealModalProps {
    visible: boolean;
    foodName: string;
    currentMealType: string;
    onSelect: (mealType: "breakfast" | "lunch" | "dinner" | "snack") => void;
    onClose: () => void;
}

export default function MoveMealModal({
    visible,
    foodName,
    currentMealType,
    onSelect,
    onClose,
}: MoveMealModalProps) {
    if (!visible) return null;

    const options = MEAL_OPTIONS.filter((m) => m.key !== currentMealType);

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            <View className="flex-1">
                {/* Backdrop */}
                <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    className="absolute inset-0"
                >
                    <BlurView intensity={20} tint="dark" className="flex-1 bg-black/70" />
                </Animated.View>

                {/* Touch Overlay */}
                <Pressable
                    className="flex-1 justify-end"
                    onPress={onClose}
                >
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <Animated.View
                            entering={SlideInDown.duration(300)}
                            exiting={SlideOutDown}
                            className="pb-10 pt-4 px-5"
                        >
                            <GlassContainer style={{ borderRadius: 24, overflow: "hidden" }}>
                                <View className="p-5">
                                    {/* Header */}
                                    <Text className="text-white font-sans-bold text-lg text-center mb-1">
                                        Move Item
                                    </Text>
                                    <Text className="text-surface-400 font-sans text-xs text-center mb-5" numberOfLines={1}>
                                        {foodName}
                                    </Text>

                                    {/* Meal Options */}
                                    <View style={{ gap: 8 }}>
                                        {options.map((meal) => (
                                            <Pressable
                                                key={meal.key}
                                                onPress={() => {
                                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                    onSelect(meal.key);
                                                }}
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    backgroundColor: `${meal.color}12`,
                                                    borderWidth: 1,
                                                    borderColor: `${meal.color}25`,
                                                    borderRadius: 16,
                                                    paddingVertical: 14,
                                                    paddingHorizontal: 16,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 12,
                                                        backgroundColor: `${meal.color}20`,
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        marginRight: 14,
                                                    }}
                                                >
                                                    <Ionicons name={meal.icon} size={18} color={meal.color} />
                                                </View>
                                                <Text className="text-white font-sans-bold text-base flex-1">
                                                    {meal.label}
                                                </Text>
                                                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                                            </Pressable>
                                        ))}
                                    </View>

                                    {/* Cancel */}
                                    <Pressable
                                        onPress={onClose}
                                        className="py-3 mt-3 items-center"
                                    >
                                        <Text className="text-surface-400 font-sans-semibold text-sm">Cancel</Text>
                                    </Pressable>
                                </View>
                            </GlassContainer>
                        </Animated.View>
                    </Pressable>
                </Pressable>
            </View>
        </Modal>
    );
}
