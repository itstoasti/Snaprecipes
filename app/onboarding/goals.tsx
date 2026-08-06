import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { useOnboarding } from "@/components/onboarding/onboardingContext";

const GOAL_OPTIONS = [
    { id: "eat_healthier", label: "Eat healthier", icon: "🥗" },
    { id: "save_money", label: "Save money", icon: "💰" },
    { id: "improve_skills", label: "Improve cooking skills", icon: "🔪" },
    { id: "organize_recipes", label: "Organize recipes", icon: "📁" },
    { id: "plan_meals", label: "Plan out meals", icon: "📅" },
    { id: "try_cuisines", label: "Try new cuisines", icon: "🥢" },
];

export default function GoalsScreen() {
    const router = useRouter();
    const { state, setGoals } = useOnboarding();
    const [selected, setSelected] = useState<string[]>(state.goals.length ? state.goals : ["eat_healthier"]);

    const toggleGoal = (id: string) => {
        if (selected.includes(id)) {
            if (selected.length > 1) {
                setSelected(selected.filter((item) => item !== id));
            }
        } else {
            setSelected([...selected, id]);
        }
    };

    const handleContinue = () => {
        setGoals(selected);
        router.push("/onboarding/goal-stat");
    };

    return (
        <View className="flex-1 bg-[#FAF7F2] justify-between">
            <OnboardingHeader progress={0.2} />

            <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
                <Animated.View entering={FadeIn.duration(600)} className="mb-6">
                    <Text className="text-[#1F2937] font-sans-bold text-3xl mb-2 text-center">
                        What are your goals?
                    </Text>
                    <Text className="text-[#6B7280] font-sans text-base text-center">
                        Select all that apply
                    </Text>
                </Animated.View>

                {/* Goals Option List */}
                <Animated.View entering={SlideInDown.delay(200).duration(800)} className="space-y-3">
                    {GOAL_OPTIONS.map((item) => {
                        const isSelected = selected.includes(item.id);
                        return (
                            <Pressable
                                key={item.id}
                                onPress={() => toggleGoal(item.id)}
                                style={[styles.card, isSelected ? styles.cardSelected : styles.cardUnselected]}
                            >
                                <View style={styles.cardLeft}>
                                    <Text style={styles.icon}>{item.icon}</Text>
                                    <Text style={styles.label}>{item.label}</Text>
                                </View>
                                {isSelected ? (
                                    <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
                                ) : null}
                            </Pressable>
                        );
                    })}
                </Animated.View>
            </ScrollView>

            <View className="px-6 pb-8 pt-2 bg-[#FAF7F2]">
                <Pressable
                    onPress={handleContinue}
                    disabled={selected.length === 0}
                    style={[styles.button, selected.length > 0 ? styles.buttonEnabled : styles.buttonDisabled]}
                >
                    <Text style={styles.buttonText}>Continue</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: "100%",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 2,
        backgroundColor: "#FFFFFF",
        marginBottom: 14,
    },
    cardSelected: {
        borderColor: "#FF6B35",
        shadowColor: "#FF6B35",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardUnselected: {
        borderColor: "#E5E7EB",
    },
    cardLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    icon: {
        fontSize: 24,
    },
    label: {
        fontSize: 17,
        fontFamily: "Inter_600SemiBold",
        color: "#1F2937",
    },
    button: {
        width: "100%",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
    },
    buttonEnabled: {
        backgroundColor: "#FF6B35",
    },
    buttonDisabled: {
        backgroundColor: "#D1D5DB",
    },
    buttonText: {
        color: "#FFFFFF",
        fontFamily: "Inter_700Bold",
        fontSize: 18,
    },
});
