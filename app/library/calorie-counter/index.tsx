import React, { useState, useMemo, useCallback, useRef } from "react";
import {
    View,
    Text,
    Pressable,
    FlatList,
    ScrollView,
    Modal,
    Dimensions,
    Alert,
} from "react-native";
import { useRouter, Stack, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFoodLog } from "@/hooks/useFoodLog";
import GlassContainer from "@/components/GlassContainer";
import MacroRing from "@/components/MacroRing";
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, SlideInDown, SlideInRight, SlideOutDown } from "react-native-reanimated";
import { format, addDays, isSameDay } from "@/lib/dateUtils";
import * as Haptics from "expo-haptics";
import MoveMealModal from "@/components/MoveMealModal";
import { BlurView } from "expo-blur";
import { trackEvent } from "@/lib/analytics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MEAL_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
    breakfast: { icon: "sunny", color: "#FBBF24", label: "Breakfast" },
    lunch: { icon: "restaurant", color: "#34D399", label: "Lunch" },
    dinner: { icon: "moon", color: "#818CF8", label: "Dinner" },
    snack: { icon: "cafe", color: "#F472B6", label: "Snacks" },
};

function getDefaultMealType(): "breakfast" | "lunch" | "dinner" | "snack" {
    const hour = new Date().getHours();
    if (hour < 11) return "breakfast";
    if (hour < 15) return "lunch";
    if (hour < 20) return "dinner";
    return "snack";
}

export default function CalorieCounterScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const { logs, loading, dailyTotals, mealGroups, goals, removeFoodLog, updateMealType, updateFoodLog, refresh } =
        useFoodLog(selectedDate);

    // Re-fetch food logs every time this screen comes into focus
    // (e.g. after adding food on the add-food screen)
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;
    useFocusEffect(
        useCallback(() => {
            refreshRef.current();
        }, [])
    );

    // Generate next 14 days
    const dates = useMemo(
        () => Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i - 3)),
        []
    );

    const remaining = goals.calories - dailyTotals.calories;

    const handleAddFood = useCallback(
        (mealType?: string) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({
                pathname: "/library/calorie-counter/add-food",
                params: {
                    date: format(selectedDate, "yyyy-MM-dd"),
                    mealType: mealType || getDefaultMealType(),
                },
            });
        },
        [selectedDate, router]
    );

    // ── Delete modal state ──
    const [deleteTarget, setDeleteTarget] = useState<{ logId: number; foodName: string } | null>(null);

    const handleDeleteLog = useCallback(
        (logId: number, foodName: string) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setDeleteTarget({ logId, foodName });
        },
        []
    );

    // ── Move-meal modal state ──
    const [moveTarget, setMoveTarget] = useState<typeof logs[0] | null>(null);

    const [showGoalInfo, setShowGoalInfo] = useState(false);

    const handleMoveMeal = useCallback(
        (item: typeof logs[0]) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setMoveTarget(item);
        },
        []
    );

    const renderMealSection = (mealType: string, items: typeof logs) => {
        const meal = MEAL_ICONS[mealType];
        const mealCals = items.reduce((sum, l) => sum + l.calories * l.serving_qty, 0);

        return (
            <Animated.View
                key={mealType}
                entering={FadeInDown.delay(
                    mealType === "breakfast" ? 100 : mealType === "lunch" ? 150 : mealType === "dinner" ? 200 : 250
                )}
                className="mb-5"
            >
                <Pressable
                    onPress={() => handleAddFood(mealType)}
                    className="flex-row items-center justify-between mb-2 px-1"
                >
                    <View className="flex-row items-center">
                        <View
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 10,
                                backgroundColor: `${meal.color}20`,
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 10,
                            }}
                        >
                            <Ionicons name={meal.icon} size={16} color={meal.color} />
                        </View>
                        <Text className="text-white font-sans-bold text-base">{meal.label}</Text>
                        {mealCals > 0 && (
                            <Text className="text-surface-400 font-sans text-xs ml-2">
                                {Math.round(mealCals)} cal
                            </Text>
                        )}
                    </View>
                    <View
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: `${meal.color}20`,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Ionicons name="add" size={18} color={meal.color} />
                    </View>
                </Pressable>

                {items.length > 0 ? (
                    items.map((item, idx) => (
                        <Animated.View key={item.id} entering={SlideInRight.delay(idx * 50)}>
                            <Pressable
                                onLongPress={() => handleMoveMeal(item)}
                                delayLongPress={400}
                            >
                                <GlassContainer
                                    className="flex-row items-center p-3 mb-2 rounded-2xl overflow-hidden"
                                    style={{ borderColor: `${meal.color}15` }}
                                >
                                    <View className="flex-1 mr-3">
                                        <Text className="text-white font-sans-bold text-sm" numberOfLines={1}>
                                            {item.food_name}
                                        </Text>
                                        <View className="flex-row items-center mt-1">
                                            {item.brand && (
                                                <Text className="text-surface-400 font-sans text-[10px] mr-2">
                                                    {item.brand}
                                                </Text>
                                            )}
                                            <Text className="text-surface-500 font-sans text-[10px]">
                                                {item.serving_qty > 1 ? `${item.serving_qty}× ` : ""}
                                                {item.serving_size || "1 serving"}
                                            </Text>
                                        </View>
                                        {/* Macro breakdown */}
                                        <View className="flex-row items-center mt-1.5" style={{ gap: 8 }}>
                                            <Text style={{ color: "#60A5FA", fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
                                                {Math.round(item.protein * item.serving_qty)}g Protein
                                            </Text>
                                            <Text style={{ color: "#FBBF24", fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
                                                {Math.round(item.carbs * item.serving_qty)}g Carbs
                                            </Text>
                                            <Text style={{ color: "#F472B6", fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
                                                {Math.round(item.fat * item.serving_qty)}g Fat
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Calorie badge */}
                                    <View className="items-center mr-2">
                                        <Text className="text-white font-sans-bold text-sm">
                                            {Math.round(item.calories * item.serving_qty)}
                                        </Text>
                                        <Text className="text-surface-500 font-sans text-[9px]">cal</Text>
                                    </View>

                                    <Pressable
                                        onPress={() => handleDeleteLog(item.id, item.food_name)}
                                        hitSlop={12}
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 10,
                                            backgroundColor: "rgba(239,68,68,0.1)",
                                            borderWidth: 1,
                                            borderColor: "rgba(239,68,68,0.15)",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                    </Pressable>
                                </GlassContainer>
                            </Pressable>
                        </Animated.View>
                    ))
                ) : (
                    <Pressable
                        onPress={() => handleAddFood(mealType)}
                        style={{
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.06)",
                            borderStyle: "dashed",
                            borderRadius: 16,
                            paddingVertical: 14,
                            alignItems: "center",
                        }}
                    >
                        <Text className="text-surface-500 font-sans text-xs">
                            Tap to add {meal.label.toLowerCase()}
                        </Text>
                    </Pressable>
                )}
            </Animated.View>
        );
    };

    return (
        <View className="flex-1 bg-surface-950" style={{ paddingTop: Math.max(insets.top, 20) + 10 }}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-5 flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                    <Pressable
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center mr-3"
                    >
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                    </Pressable>
                    <Text className="text-white font-sans-bold text-2xl">Calorie Counter</Text>
                </View>
            </View>

            {/* Date Scroller */}
            <View className="mb-5">
                <FlatList
                    data={dates}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    keyExtractor={(item) => item.toISOString()}
                    initialScrollIndex={3}
                    getItemLayout={(_, index) => ({ length: 67, offset: 67 * index, index })}
                    renderItem={({ item }) => {
                        const active = isSameDay(item, selectedDate);
                        const hasLogs = logs.length > 0 && isSameDay(item, selectedDate);
                        return (
                            <Pressable
                                onPress={() => setSelectedDate(item)}
                                style={{
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 52,
                                    height: 80,
                                    borderRadius: 22,
                                    marginRight: 10,
                                    backgroundColor: active ? "#EF4444" : "rgba(255,255,255,0.04)",
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 10,
                                        textTransform: "uppercase",
                                        fontFamily: "Inter_600SemiBold",
                                        color: active ? "#FFF" : "#6E6E85",
                                    }}
                                >
                                    {format(item, "EEE")}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 18,
                                        fontFamily: "Inter_700Bold",
                                        color: "#FFF",
                                        marginTop: 2,
                                    }}
                                >
                                    {format(item, "d")}
                                </Text>
                            </Pressable>
                        );
                    }}
                />
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Card: Calories + Macros */}
                <Animated.View entering={FadeInUp.duration(500)}>
                    <GlassContainer
                        style={{
                            borderRadius: 28,
                            backgroundColor: "rgba(239,68,68,0.06)",
                            borderColor: "rgba(239,68,68,0.15)",
                        }}
                        className="p-5 mb-6"
                    >
                        <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-surface-500 font-sans text-[10px] uppercase tracking-widest">Daily Goals</Text>
                            <Pressable 
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowGoalInfo(true);
                                }}
                                hitSlop={10}
                            >
                                <Ionicons name="information-circle-outline" size={18} color="#9D9DB0" />
                            </Pressable>
                        </View>
                        <View className="items-center mb-4">
                            <MacroRing
                                label="Calories"
                                current={dailyTotals.calories}
                                goal={goals.calories}
                                color="#EF4444"
                                unit="kcal"
                                hero
                            />
                            <Text
                                style={{
                                    color: remaining >= 0 ? "rgba(255,255,255,0.4)" : "#EF4444",
                                    fontFamily: "Inter_500Medium",
                                    fontSize: 12,
                                    marginTop: 6,
                                }}
                            >
                                {remaining >= 0
                                    ? `${Math.round(remaining)} kcal remaining`
                                    : `${Math.round(Math.abs(remaining))} kcal over`}
                            </Text>
                        </View>

                        {/* Macro row */}
                        <View className="flex-row justify-around">
                            <MacroRing
                                label="Protein"
                                current={dailyTotals.protein}
                                goal={goals.protein}
                                color="#60A5FA"
                            />
                            <MacroRing
                                label="Carbs"
                                current={dailyTotals.carbs}
                                goal={goals.carbs}
                                color="#FBBF24"
                            />
                            <MacroRing
                                label="Fat"
                                current={dailyTotals.fat}
                                goal={goals.fat}
                                color="#F472B6"
                            />
                        </View>
                    </GlassContainer>
                </Animated.View>

                {/* Meal Sections */}
                {(["breakfast", "lunch", "dinner", "snack"] as const).map((mt) =>
                    renderMealSection(mt, mealGroups[mt] || [])
                )}
            </ScrollView>

            {/* FAB */}
            <Pressable
                onPress={() => handleAddFood()}
                style={{
                    position: "absolute",
                    bottom: insets.bottom + 24,
                    right: 20,
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: "#EF4444",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#EF4444",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 10,
                }}
            >
                <Ionicons name="add" size={32} color="#FFF" />
            </Pressable>

            {/* Backdrop Glows */}
            <View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    top: -80,
                    right: -80,
                    width: 250,
                    height: 250,
                    backgroundColor: "#EF4444",
                    borderRadius: 125,
                    opacity: 0.04,
                    zIndex: -1,
                }}
            />

            {/* Move Meal Modal */}
            <MoveMealModal
                visible={moveTarget !== null}
                foodName={moveTarget?.food_name || ""}
                brand={moveTarget?.brand}
                servingSize={moveTarget?.serving_size}
                initialServingQty={moveTarget?.serving_qty || 1}
                calories={moveTarget?.calories || 0}
                protein={moveTarget?.protein || 0}
                carbs={moveTarget?.carbs || 0}
                fat={moveTarget?.fat || 0}
                currentMealType={moveTarget?.meal_type || "snack"}
                onSave={async (newQty, newMealType) => {
                    if (moveTarget) {
                        await updateFoodLog(moveTarget.id, {
                            serving_qty: newQty,
                            meal_type: newMealType,
                        });
                        trackEvent("food_log_updated", {
                            meal_type: newMealType,
                            serving_qty: newQty,
                            food_name: moveTarget.food_name,
                        });
                    }
                    setMoveTarget(null);
                }}
                onClose={() => setMoveTarget(null)}
            />

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <Modal transparent visible animationType="none" statusBarTranslucent>
                    <View className="flex-1">
                        <Animated.View entering={FadeIn} exiting={FadeOut} className="absolute inset-0">
                            <BlurView intensity={20} tint="dark" className="flex-1 bg-black/70" />
                        </Animated.View>
                        <Pressable className="flex-1 justify-end" onPress={() => setDeleteTarget(null)}>
                            <Pressable onPress={(e) => e.stopPropagation()}>
                                <Animated.View entering={SlideInDown.duration(300)} exiting={SlideOutDown} className="pb-10 pt-4 px-5">
                                    <GlassContainer style={{ borderRadius: 24, overflow: "hidden" }}>
                                        <View className="p-6 items-center">
                                            <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
                                                <Ionicons name="trash" size={32} color="#EF4444" />
                                            </View>
                                            <Text className="text-white font-sans-bold text-xl mb-2 text-center">Remove Entry?</Text>
                                            <Text className="text-surface-300 font-sans text-sm text-center mb-8 px-4 leading-5">
                                                Remove "{deleteTarget.foodName}" from your log?
                                            </Text>
                                            <View className="flex-row w-full" style={{ gap: 12 }}>
                                                <Pressable
                                                    onPress={() => setDeleteTarget(null)}
                                                    style={{ flex: 1, paddingVertical: 14, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}
                                                >
                                                    <Text className="text-white font-sans-semibold text-base">Cancel</Text>
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => {
                                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                        removeFoodLog(deleteTarget.logId);
                                                        trackEvent("food_log_deleted", {
                                                            food_name: deleteTarget.foodName,
                                                        });
                                                        setDeleteTarget(null);
                                                    }}
                                                    style={{ flex: 1, paddingVertical: 14, backgroundColor: "#EF4444", borderRadius: 14, alignItems: "center" }}
                                                >
                                                    <Text className="text-white font-sans-semibold text-base">Remove</Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    </GlassContainer>
                                </Animated.View>
                            </Pressable>
                        </Pressable>
                    </View>
                </Modal>
            )}
            {/* Goals Info Modal */}
            <Modal visible={showGoalInfo} transparent animationType="fade">
                <BlurView intensity={40} tint="dark" className="flex-1 items-center justify-center px-8">
                    <Animated.View entering={FadeInDown} exiting={FadeOut}>
                        <GlassContainer className="w-full p-7 rounded-[32px] border border-white/10 overflow-hidden">
                            <View className="items-center mb-4">
                                <View className="w-14 h-14 rounded-full bg-accent/15 items-center justify-center mb-5">
                                    <Ionicons name="information-circle" size={32} color="#FF6B35" />
                                </View>
                                <Text className="text-white font-sans-bold text-2xl mb-3 text-center">Personalized Goals</Text>
                                <Text className="text-surface-400 font-sans text-base text-center leading-6 mb-8 px-2">
                                    The 2000 kcal baseline is just a general standard. For results tailored to your body type and activity, fill out your profile in settings.
                                </Text>
                            </View>
                            <View className="gap-3">
                                <Pressable 
                                    onPress={() => {
                                        setShowGoalInfo(false);
                                        trackEvent("goals_info_settings_clicked");
                                        router.push("/settings");
                                    }}
                                    className="bg-accent py-4 rounded-2xl items-center shadow-lg shadow-accent/20"
                                >
                                    <Text className="text-white font-sans-bold text-base">Go to Settings</Text>
                                </Pressable>
                                <Pressable 
                                    onPress={() => setShowGoalInfo(false)}
                                    className="py-3 items-center"
                                >
                                    <Text className="text-surface-500 font-sans-bold text-sm">Maybe Later</Text>
                                </Pressable>
                            </View>
                        </GlassContainer>
                    </Animated.View>
                </BlurView>
            </Modal>
        </View>
    );
}
