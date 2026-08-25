import React, { useState, useRef, useCallback, useMemo } from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    Platform,
    StatusBar as RNStatusBar,
    Image,
    Dimensions,
    LayoutAnimation,
    UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    FadeIn,
    FadeOut,
    FadeInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import GlassContainer from "./GlassContainer";
import { scaleQuantity } from "./ServingScaler";
import type { Ingredient, Step } from "@/db/schema";
import { useTheme } from "@/hooks/useTheme";
import { trackEvent } from "@/lib/analytics";

// Enable LayoutAnimation on legacy Android architecture
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental && !(global as any).nativeFabricUIManager) {
    try {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    } catch {
        // no-op on new architecture
    }
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Types ──────────────────────────────────────────────────────

interface Task {
    id: string;
    title: string;
    type: "ingredients" | "step";
    stepData?: Step;
    ingredients?: Ingredient[];
}

interface CookModeProps {
    recipeName: string;
    imageUrl?: string | null;
    ingredients: Ingredient[];
    steps: Step[];
    multiplier: number;
    checkedIngredients: Set<number>;
    checkedSteps: Set<number>;
    onToggleIngredient: (id: number) => void;
    onToggleStep: (id: number) => void;
    onExit: () => void;
}

// ── Smooth toggle animation config ─────────────────────────────
const toggleAnimation = {
    duration: 250,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
};

// ── Component ──────────────────────────────────────────────────

export default function CookMode({
    recipeName,
    imageUrl,
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
    const [expandedTaskIndex, setExpandedTaskIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const { colors } = useTheme();

    React.useEffect(() => {
        trackEvent("cook_mode_viewed", {
            recipe_name: recipeName,
            total_steps: steps.length,
            ingredients_count: ingredients.length,
            multiplier,
        });
    }, []);

    // Build unified task list: Ingredients first, then each step
    const tasks: Task[] = useMemo(() => {
        const list: Task[] = [];

        if (ingredients.length > 0) {
            list.push({
                id: "ingredients",
                title: "Prepare ingredients",
                type: "ingredients",
                ingredients,
            });
        }

        for (const step of steps) {
            list.push({
                id: `step-${step.id}`,
                title: step.text.length > 45
                    ? step.text.substring(0, 45).trim() + "…"
                    : step.text,
                type: "step",
                stepData: step,
            });
        }

        return list;
    }, [ingredients, steps]);

    const totalTasks = tasks.length;

    // Check if a task is "complete"
    const isTaskComplete = useCallback(
        (task: Task): boolean => {
            if (task.type === "ingredients") {
                return (
                    task.ingredients!.length > 0 &&
                    task.ingredients!.every((ing) => checkedIngredients.has(ing.id))
                );
            }
            return checkedSteps.has(task.stepData!.id);
        },
        [checkedIngredients, checkedSteps]
    );

    const toggleExpand = useCallback(
        (index: number) => {
            LayoutAnimation.configureNext(toggleAnimation);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExpandedTaskIndex((prev) => (prev === index ? -1 : index));
        },
        []
    );

    const goToTask = useCallback(
        (index: number) => {
            if (index < 0 || index >= totalTasks) return;
            LayoutAnimation.configureNext(toggleAnimation);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExpandedTaskIndex(index);
        },
        [totalTasks]
    );

    const goNext = () => goToTask(expandedTaskIndex + 1);
    const goPrev = () => goToTask(expandedTaskIndex - 1);

    // ── Render ─────────────────────────────────────────────────

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            className="absolute inset-0 bg-surface-950 z-50"
        >
            {/* Header */}
            <View
                className="flex-row items-center justify-between px-5"
                style={{ paddingTop: Math.max(insets.top, RNStatusBar.currentHeight || 0) + 8 }}
            >
                <Pressable
                    onPress={onExit}
                    className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center"
                >
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </Pressable>
                <Text className="text-white font-sans-bold text-lg">Cook Mode</Text>
                <Pressable
                    onPress={onExit}
                    className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center"
                >
                    <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
                </Pressable>
            </View>

            <ScrollView
                ref={scrollRef}
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 16 }}
            >
                {/* Hero Image */}
                <View
                    className="mx-4 mt-3 rounded-3xl overflow-hidden bg-surface-800"
                    style={{ height: SCREEN_WIDTH * 0.55 }}
                >
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="flex-1 items-center justify-center">
                            <Text className="text-5xl">🍽️</Text>
                            <Text className="text-surface-500 font-sans text-sm mt-2">{recipeName}</Text>
                        </View>
                    )}
                    <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.4)"]}
                        className="absolute bottom-0 left-0 right-0 h-16"
                    />
                </View>

                {/* ── Step Counter & Nav Buttons ──────────────── */}
                {expandedTaskIndex >= 0 && expandedTaskIndex < totalTasks && (
                    <View className="mx-4 mt-4 mb-2">
                        <GlassContainer className="rounded-2xl px-5 py-3 bg-surface-900/80 border-surface-800">
                            <View className="flex-row items-center justify-between">
                                {/* Step label */}
                                <Text className="text-[#34D399] font-sans-bold text-sm">
                                    {tasks[expandedTaskIndex]?.type === "ingredients"
                                        ? "Prep"
                                        : `Step ${steps.findIndex((s) => s.id === tasks[expandedTaskIndex]?.stepData?.id) + 1} of ${steps.length}`}
                                </Text>

                                {/* Nav buttons */}
                                <View className="flex-row gap-2">
                                    <Pressable
                                        onPress={goPrev}
                                        disabled={expandedTaskIndex === 0}
                                        className={`px-5 py-2 rounded-xl ${expandedTaskIndex === 0 ? "bg-surface-800/50" : "bg-surface-700"}`}
                                    >
                                        <Text className={`font-sans-semibold text-sm ${expandedTaskIndex === 0 ? "text-surface-600" : "text-white"}`}>
                                            Previous
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={goNext}
                                        disabled={expandedTaskIndex === totalTasks - 1}
                                        className={`px-5 py-2 rounded-xl ${expandedTaskIndex === totalTasks - 1 ? "bg-[#34D399]/30" : "bg-[#34D399]"}`}
                                    >
                                        <Text className={`font-sans-bold text-sm ${expandedTaskIndex === totalTasks - 1 ? "text-[#34D399]/60" : "text-[#0A0A0F]"}`}>
                                            Next
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </GlassContainer>
                    </View>
                )}

                {/* ── Accordion Task List ─────────────────────── */}
                <View className="mx-4 mt-2">
                    {tasks.map((task, index) => {
                        const complete = isTaskComplete(task);
                        const isExpanded = index === expandedTaskIndex;
                        const stepNumber = task.type === "step"
                            ? steps.findIndex((s) => s.id === task.stepData!.id) + 1
                            : null;

                        return (
                            <View
                                key={task.id}
                                className={`mb-2 rounded-2xl overflow-hidden ${isExpanded ? "bg-surface-800/60" : "bg-surface-900/40"}`}
                                style={{
                                    borderWidth: isExpanded ? 1 : 0,
                                    borderColor: isExpanded ? "rgba(52, 211, 153, 0.3)" : "transparent",
                                }}
                            >
                                {/* ── Task Header Row ── */}
                                <Pressable
                                    onPress={() => toggleExpand(index)}
                                    className="flex-row items-center py-4 px-4"
                                >
                                    {/* Status circle */}
                                    <View
                                        className={`w-7 h-7 rounded-full items-center justify-center mr-3 ${
                                            complete
                                                ? "bg-[#34D399]"
                                                : isExpanded
                                                    ? "border-2 border-[#34D399]"
                                                    : "border-2 border-surface-600"
                                        }`}
                                    >
                                        {complete && (
                                            <Ionicons name="checkmark" size={16} color="#FFF" />
                                        )}
                                    </View>

                                    {/* Task title */}
                                    <Text
                                        className={`flex-1 font-sans-semibold text-base ${
                                            complete
                                                ? "text-surface-400"
                                                : isExpanded
                                                    ? "text-white"
                                                    : "text-surface-300"
                                        }`}
                                        numberOfLines={1}
                                    >
                                        {task.type === "ingredients"
                                            ? "Prepare ingredients"
                                            : `Step ${stepNumber}: ${task.title}`}
                                    </Text>

                                    {/* Chevron */}
                                    <Ionicons
                                        name={isExpanded ? "chevron-up" : "chevron-forward"}
                                        size={18}
                                        color={isExpanded ? "#34D399" : "#6E6E85"}
                                    />
                                </Pressable>

                                {/* ── Expanded Content ── */}
                                {isExpanded && (
                                    <View className="px-4 pb-4">
                                        {task.type === "ingredients" ? (
                                            // ── Ingredient Checklist ──
                                            <View>
                                                {(() => {
                                                    const groups: { section: string | null; items: Ingredient[] }[] = [];
                                                    let currentSection: string | null | undefined = undefined;
                                                    for (const ing of task.ingredients!) {
                                                        if (groups.length === 0 || ing.section !== currentSection) {
                                                            currentSection = ing.section;
                                                            groups.push({ section: ing.section, items: [ing] });
                                                        } else {
                                                            groups[groups.length - 1].items.push(ing);
                                                        }
                                                    }

                                                    return groups.map((group, gi) => (
                                                        <View key={`section-${gi}`}>
                                                            {group.section ? (
                                                                <Text className="text-[#34D399] font-sans-bold text-xs uppercase tracking-widest pt-3 pb-1.5">
                                                                    {group.section}
                                                                </Text>
                                                            ) : null}
                                                            {group.items.map((ing) => {
                                                                const isChecked = checkedIngredients.has(ing.id);
                                                                const scaledQty = scaleQuantity(ing.quantity, multiplier);
                                                                return (
                                                                    <Pressable
                                                                        key={ing.id}
                                                                        onPress={() => {
                                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                            trackEvent("cook_mode_ingredient_toggled", {
                                                                                ingredient_name: ing.name,
                                                                                recipe_name: recipeName,
                                                                                checked: !isChecked,
                                                                            });
                                                                            onToggleIngredient(ing.id);
                                                                        }}
                                                                        className={`flex-row items-center py-2.5 border-b border-surface-700/40 ${isChecked ? "opacity-50" : ""}`}
                                                                    >
                                                                        <View
                                                                            className={`w-5 h-5 rounded-full items-center justify-center mr-3 ${isChecked ? "bg-[#34D399]" : "border-2 border-surface-500"}`}
                                                                        >
                                                                            {isChecked && (
                                                                                <Ionicons name="checkmark" size={13} color="#0A0A0F" />
                                                                            )}
                                                                        </View>
                                                                        <View className="flex-row items-baseline flex-1 flex-wrap">
                                                                            {scaledQty ? (
                                                                                <Text className={`font-sans-bold text-sm mr-1 ${isChecked ? "text-surface-500 line-through" : "text-[#34D399]"}`}>
                                                                                    {scaledQty}
                                                                                </Text>
                                                                            ) : null}
                                                                            {ing.unit ? (
                                                                                <Text className={`font-sans text-sm mr-1.5 ${isChecked ? "text-surface-500 line-through" : "text-surface-400"}`}>
                                                                                    {ing.unit}
                                                                                </Text>
                                                                            ) : null}
                                                                            <Text className={`font-sans text-sm ${isChecked ? "text-surface-500 line-through" : "text-white"}`}>
                                                                                {ing.name}
                                                                            </Text>
                                                                        </View>
                                                                    </Pressable>
                                                                );
                                                            })}
                                                        </View>
                                                    ));
                                                })()}
                                            </View>
                                        ) : task.type === "step" ? (
                                            // ── Step Instruction ──
                                            <Pressable
                                                onPress={() => {
                                                    const isCurrentlyChecked = checkedSteps.has(task.stepData!.id);
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                    trackEvent("cook_mode_step_toggled", {
                                                        step_number: task.stepData!.step_number,
                                                        recipe_name: recipeName,
                                                        checked: !isCurrentlyChecked,
                                                    });
                                                    onToggleStep(task.stepData!.id);
                                                }}
                                                className="flex-row items-start"
                                            >
                                                <View className="flex-1 mr-4">
                                                    <Text className="text-white font-sans text-base leading-6">
                                                        {task.stepData!.text}
                                                    </Text>
                                                </View>
                                                <View
                                                    className={`w-9 h-9 rounded-full items-center justify-center mt-0.5 ${checkedSteps.has(task.stepData!.id) ? "bg-[#34D399]" : "border-2 border-surface-500"}`}
                                                >
                                                    {checkedSteps.has(task.stepData!.id) && (
                                                        <Ionicons name="checkmark" size={20} color="#0A0A0F" />
                                                    )}
                                                </View>
                                            </Pressable>
                                        ) : null}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* ── Exit Cook Mode ────────────────────────────── */}
                <View className="mx-4 mt-4">
                    <Pressable
                        onPress={() => {
                            trackEvent("cook_mode_exited", {
                                recipe_name: recipeName,
                                steps_completed: checkedSteps.size,
                                total_steps: steps.length,
                                all_steps_done: checkedSteps.size >= steps.length,
                            });
                            onExit();
                        }}
                        className="flex-row items-center justify-center py-4 rounded-2xl bg-surface-800 border border-surface-700"
                    >
                        <Ionicons name="close-circle" size={20} color="#FF6B35" />
                        <Text className="text-accent font-sans-semibold text-base ml-2">
                            Exit Cook Mode
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </Animated.View>
    );
}
