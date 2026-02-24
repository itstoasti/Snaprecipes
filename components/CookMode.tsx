import React from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    Platform,
    StatusBar as RNStatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlassContainer from "./GlassContainer";
import { scaleQuantity } from "./ServingScaler";
import type { Ingredient, Step } from "@/db/schema";

interface CookModeProps {
    recipeName: string;
    ingredients: Ingredient[];
    steps: Step[];
    multiplier: number;
    checkedIngredients: Set<number>;
    checkedSteps: Set<number>;
    onToggleIngredient: (id: number) => void;
    onToggleStep: (id: number) => void;
    onExit: () => void;
}

export default function CookMode({
    recipeName,
    ingredients,
    steps,
    multiplier,
    checkedIngredients,
    checkedSteps,
    onToggleIngredient,
    onToggleStep,
    onExit,
}: CookModeProps) {
    const insets = useSafeAreaInsets();

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            className="absolute inset-0 bg-surface-950 z-50"
            style={{ paddingTop: Math.max(insets.top, RNStatusBar.currentHeight || 0) + 20 }}
        >
            {/* Header */}
            <View className="px-6 mb-4">
                <Text className="text-accent font-sans text-xs uppercase tracking-widest mb-1">
                    Cook Mode
                </Text>
                <Text className="text-white font-sans-bold text-2xl" numberOfLines={2}>
                    {recipeName}
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Ingredients Section */}
                <View className="mb-8">
                    <Text className="text-surface-400 font-sans-semibold text-sm uppercase tracking-wider mb-4">
                        Ingredients
                    </Text>
                    {ingredients.map((ing, index) => {
                        const isChecked = checkedIngredients.has(ing.id);
                        const scaledQty = scaleQuantity(ing.quantity, multiplier);
                        return (
                            <Animated.View key={ing.id} entering={SlideInUp.delay(index * 40).springify()}>
                                <Pressable
                                    onPress={() => onToggleIngredient(ing.id)}
                                    className={`flex-row items-center py-3.5 border-b border-surface-800 ${isChecked ? "opacity-40" : ""
                                        }`}
                                >
                                    {/* Checkbox */}
                                    <View
                                        className={`w-7 h-7 rounded-lg mr-4 items-center justify-center ${isChecked ? "bg-mint" : "border-2 border-surface-500"
                                            }`}
                                    >
                                        {isChecked && (
                                            <Ionicons name="checkmark" size={18} color="#0A0A0F" />
                                        )}
                                    </View>

                                    {/* Quantity and Unit Column */}
                                    <View className="min-w-[110px] flex-shrink-0 flex-row items-baseline mr-1">
                                        {scaledQty ? (
                                            <Text
                                                className={`font-sans-bold text-xl mr-1.5 ${isChecked
                                                    ? "text-surface-500 line-through"
                                                    : "text-accent"
                                                    }`}
                                            >
                                                {scaledQty}
                                            </Text>
                                        ) : null}
                                        {ing.unit ? (
                                            <Text
                                                className={`font-sans text-base ${isChecked
                                                    ? "text-surface-500 line-through"
                                                    : "text-surface-400"
                                                    }`}
                                            >
                                                {ing.unit}
                                            </Text>
                                        ) : null}
                                    </View>

                                    {/* Name */}
                                    <Text
                                        className={`font-sans text-lg flex-1 leading-snug ${isChecked
                                            ? "text-surface-500 line-through"
                                            : "text-white"
                                            }`}
                                    >
                                        {ing.name}
                                    </Text>
                                </Pressable>
                            </Animated.View>
                        );
                    })}
                </View>

                {/* Steps Section */}
                <View>
                    <Text className="text-surface-400 font-sans-semibold text-sm uppercase tracking-wider mb-4">
                        Steps
                    </Text>
                    {steps.map((step, index) => {
                        const isChecked = checkedSteps.has(step.id);
                        return (
                            <Animated.View key={step.id} entering={SlideInUp.delay((ingredients.length + index) * 40).springify()}>
                                <Pressable
                                    onPress={() => onToggleStep(step.id)}
                                    className={`flex-row py-4 border-b border-surface-800 ${isChecked ? "opacity-40" : ""
                                        }`}
                                >
                                    {/* Step number */}
                                    <View
                                        className={`w-9 h-9 rounded-full mr-4 items-center justify-center ${isChecked
                                            ? "bg-mint"
                                            : "bg-accent/20"
                                            }`}
                                    >
                                        {isChecked ? (
                                            <Ionicons name="checkmark" size={20} color="#0A0A0F" />
                                        ) : (
                                            <Text className="text-accent font-sans-bold text-base">
                                                {step.step_number}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Step text */}
                                    <Text
                                        className={`font-sans text-lg flex-1 leading-7 ${isChecked
                                            ? "text-surface-500 line-through"
                                            : "text-white"
                                            }`}
                                    >
                                        {step.text}
                                    </Text>
                                </Pressable>
                            </Animated.View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Exit Button */}
            <View
                className="absolute bottom-0 left-0 right-0 p-6"
                style={{ paddingBottom: Math.max(insets.bottom, 20) + 10 }}
            >
                <GlassContainer
                    style={{ borderRadius: 20, overflow: "hidden" }}
                >
                    <Pressable
                        onPress={onExit}
                        className="flex-row items-center justify-center py-4"
                    >
                        <Ionicons name="close-circle" size={22} color="#FF6B35" />
                        <Text className="text-accent font-sans-semibold text-base ml-2">
                            Exit Cook Mode
                        </Text>
                    </Pressable>
                </GlassContainer>
            </View>
        </Animated.View>
    );
}
