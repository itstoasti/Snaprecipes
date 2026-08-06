import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import GlassContainer from "./GlassContainer";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";

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
    brand?: string | null;
    servingSize?: string | null;
    initialServingQty: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    currentMealType: "breakfast" | "lunch" | "dinner" | "snack";
    onSave: (servingQty: number, mealType: "breakfast" | "lunch" | "dinner" | "snack") => void;
    onClose: () => void;
}

export default function MoveMealModal({
    visible,
    foodName,
    brand,
    servingSize,
    initialServingQty,
    calories,
    protein,
    carbs,
    fat,
    currentMealType,
    onSave,
    onClose,
}: MoveMealModalProps) {
    const [servingQtyStr, setServingQtyStr] = useState("1");
    const [selectedMealType, setSelectedMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("snack");
    const { isDark, colors } = useTheme();

    useEffect(() => {
        if (visible) {
            setServingQtyStr(initialServingQty.toString());
            setSelectedMealType(currentMealType);
        }
    }, [visible, initialServingQty, currentMealType]);

    if (!visible) return null;

    const qty = parseFloat(servingQtyStr) || 0;

    const displayCal = Math.round(calories * qty);
    const displayPro = Math.round(protein * qty * 10) / 10;
    const displayCarb = Math.round(carbs * qty * 10) / 10;
    const displayFat = Math.round(fat * qty * 10) / 10;

    const handleIncrement = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const nextVal = (qty + 0.5);
        setServingQtyStr(nextVal.toString());
    };

    const handleDecrement = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const nextVal = Math.max(0.1, qty - 0.5);
        setServingQtyStr(nextVal.toString());
    };

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                className="flex-1"
            >
                <View className="flex-1">
                    {/* Backdrop */}
                    <Animated.View
                        entering={FadeIn}
                        exiting={FadeOut}
                        className="absolute inset-0"
                    >
                        <BlurView intensity={20} tint={isDark ? "dark" : "light"} className="flex-1 bg-black/70" />
                    </Animated.View>

                    {/* Touch Overlay to Close */}
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
                                    <View className="p-6">
                                        {/* Header */}
                                        <View className="items-center mb-5">
                                            {brand ? (
                                                <Text className="text-surface-500 font-sans text-[10px] uppercase tracking-tighter mb-1">
                                                    {brand}
                                                </Text>
                                            ) : null}
                                            <Text className="text-white font-sans-bold text-lg text-center" numberOfLines={2}>
                                                {foodName}
                                            </Text>
                                            <Text className="text-surface-400 font-sans text-xs mt-1 text-center">
                                                Base serving: {servingSize || "1 serving"}
                                            </Text>
                                        </View>

                                        {/* Macros Grid */}
                                        <View className="flex-row justify-around mb-6 bg-white/5 rounded-2xl py-4 border border-white/5">
                                            <View className="items-center">
                                                <Text style={{ color: "#EF4444", fontFamily: "Inter_700Bold", fontSize: 18 }}>{displayCal}</Text>
                                                <Text className="text-surface-500 font-sans text-[10px] mt-1">Calories</Text>
                                            </View>
                                            <View className="items-center">
                                                <Text style={{ color: "#60A5FA", fontFamily: "Inter_700Bold", fontSize: 18 }}>{displayPro}g</Text>
                                                <Text className="text-surface-500 font-sans text-[10px] mt-1">Protein</Text>
                                            </View>
                                            <View className="items-center">
                                                <Text style={{ color: "#FBBF24", fontFamily: "Inter_700Bold", fontSize: 18 }}>{displayCarb}g</Text>
                                                <Text className="text-surface-500 font-sans text-[10px] mt-1">Carbs</Text>
                                            </View>
                                            <View className="items-center">
                                                <Text style={{ color: "#F472B6", fontFamily: "Inter_700Bold", fontSize: 18 }}>{displayFat}g</Text>
                                                <Text className="text-surface-500 font-sans text-[10px] mt-1">Fat</Text>
                                            </View>
                                        </View>

                                        {/* Stepper + Input */}
                                        <View className="flex-row items-center justify-between bg-white/5 rounded-2xl px-5 py-4 mb-6 border border-white/5">
                                            <View>
                                                <Text className="text-white font-sans-bold text-sm">Number of Servings</Text>
                                                <Text className="text-surface-500 font-sans text-[10px] mt-0.5">Adjust quantity to scale macros</Text>
                                            </View>
                                            <View className="flex-row items-center" style={{ gap: 12 }}>
                                                <Pressable 
                                                    onPress={handleDecrement} 
                                                    className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center border border-white/5"
                                                >
                                                    <Ionicons name="remove" size={20} color={colors.text} />
                                                </Pressable>
                                                <TextInput
                                                    value={servingQtyStr}
                                                    onChangeText={(v) => {
                                                        const sanitized = v.replace(/[^0-9.]/g, "");
                                                        setServingQtyStr(sanitized);
                                                    }}
                                                    keyboardType="decimal-pad"
                                                    keyboardAppearance={isDark ? "dark" : "light"}
                                                    className="text-white font-sans-bold text-lg text-center bg-surface-900 px-3 py-1.5 rounded-lg min-w-[50px] max-w-[80px]"
                                                />
                                                <Pressable 
                                                    onPress={handleIncrement} 
                                                    className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center border border-white/5"
                                                >
                                                    <Ionicons name="add" size={20} color={colors.text} />
                                                </Pressable>
                                            </View>
                                        </View>

                                        {/* Meal Category Selection */}
                                        <View className="mb-6">
                                            <Text className="text-white font-sans-bold text-sm mb-2 px-1">Meal Category</Text>
                                            <View className="flex-row bg-white/5 rounded-2xl p-1 border border-white/5">
                                                {MEAL_OPTIONS.map((t) => {
                                                    const isSelected = selectedMealType === t.key;
                                                    return (
                                                        <Pressable
                                                            key={t.key}
                                                            onPress={() => {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                setSelectedMealType(t.key);
                                                            }}
                                                            className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
                                                            style={isSelected ? { backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 1, borderColor: "rgba(239,68,68,0.25)" } : undefined}
                                                        >
                                                            <Ionicons name={t.icon as any} size={14} color={isSelected ? "#EF4444" : colors.textFaint} />
                                                            <Text className="font-sans-bold text-[10px] ml-1" style={{ color: isSelected ? "#EF4444" : colors.textFaint }}>
                                                                {t.label}
                                                            </Text>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>
                                        </View>

                                        {/* Action Buttons */}
                                        <View className="flex-row" style={{ gap: 12 }}>
                                            <Pressable
                                                onPress={onClose}
                                                style={{ flex: 1, paddingVertical: 14, backgroundColor: colors.hairline, borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: colors.hairline }}
                                            >
                                                <Text className="text-white font-sans-semibold text-base">Cancel</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => {
                                                    if (qty <= 0) {
                                                        Alert.alert("Invalid Quantity", "Please enter a quantity greater than 0.");
                                                        return;
                                                    }
                                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                    onSave(qty, selectedMealType);
                                                }}
                                                style={{ flex: 1, paddingVertical: 14, backgroundColor: "#EF4444", borderRadius: 14, alignItems: "center" }}
                                            >
                                                <Text className="text-[#FFFFFF] font-sans-semibold text-base">Save Changes</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </GlassContainer>
                            </Animated.View>
                        </Pressable>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
