import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { useOnboarding } from "@/components/onboarding/onboardingContext";

interface TimeOption {
    id: string;
    label: string;
    icon: string;
}

const TIME_OPTIONS: TimeOption[] = [
    { id: "morning_of", label: "In the morning", icon: "sunny-outline" },
    { id: "right_before", label: "Right before I cook", icon: "restaurant-outline" },
    { id: "days_ahead", label: "A few days ahead", icon: "calendar-outline" },
    { id: "never_plan", label: "I never plan ahead", icon: "help-circle-outline" },
];

export default function CookingTimeScreen() {
    const router = useRouter();
    const { state, setCookingThoughtTime } = useOnboarding();
    const [selectedId, setSelectedId] = useState<string>(state.cookingThoughtTime || "right_before");

    const handleSelect = (id: string) => {
        setSelectedId(id);
    };

    const handleContinue = () => {
        setCookingThoughtTime(selectedId);
        router.push("/onboarding/notifications");
    };

    return (
        <View className="flex-1 bg-[#FAF7F2] justify-between">
            <OnboardingHeader progress={0.38} />

            <View className="flex-1 px-6 pt-4 pb-8 justify-between">
                {/* Title Section */}
                <Animated.View entering={FadeIn.duration(600)} className="space-y-3 mb-4">
                    <Text className="text-[#1F2937] font-sans-bold text-3xl text-center leading-snug">
                        When do you usually think about what to cook?
                    </Text>
                </Animated.View>

                {/* Option Cards List */}
                <ScrollView className="flex-1 my-auto" showsVerticalScrollIndicator={false}>
                    <View className="space-y-3.5 pt-2">
                        {TIME_OPTIONS.map((opt) => {
                            const isSelected = selectedId === opt.id;
                            return (
                                <Pressable
                                    key={opt.id}
                                    onPress={() => handleSelect(opt.id)}
                                    style={[styles.card, isSelected ? styles.cardSelected : styles.cardUnselected]}
                                >
                                    <View style={styles.cardLeft}>
                                        <View style={[styles.iconCircle, isSelected ? styles.iconActive : styles.iconInactive]}>
                                            <Ionicons name={opt.icon as any} size={22} color={isSelected ? "#FF6B35" : "#4B5563"} />
                                        </View>
                                        <Text style={styles.label}>{opt.label}</Text>
                                    </View>
                                    <Ionicons
                                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                                        size={24}
                                        color={isSelected ? "#FF6B35" : "#D1D5DB"}
                                    />
                                </Pressable>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* Bottom CTA */}
                <Animated.View entering={SlideInDown.delay(200).duration(800)}>
                    <Pressable
                        onPress={handleContinue}
                        style={styles.button}
                    >
                        <Text style={styles.buttonText}>Continue</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: "100%",
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 20,
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
        gap: 14,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    iconActive: {
        backgroundColor: "#FFF7ED",
    },
    iconInactive: {
        backgroundColor: "#F3F4F6",
    },
    label: {
        fontSize: 17,
        fontFamily: "Inter_600SemiBold",
        color: "#1F2937",
    },
    button: {
        width: "100%",
        backgroundColor: "#FF6B35",
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: "center",
    },
    buttonText: {
        color: "#FFFFFF",
        fontFamily: "Inter_700Bold",
        fontSize: 18,
    },
});
