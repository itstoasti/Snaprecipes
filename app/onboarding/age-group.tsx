import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { useOnboarding } from "@/components/onboarding/onboardingContext";

const AGE_BRACKETS = [
    { id: "under_24", label: "24 and under" },
    { id: "25_34", label: "25-34" },
    { id: "35_44", label: "35-44" },
    { id: "45_54", label: "45-54" },
    { id: "55_plus", label: "55+" },
];

export default function AgeGroupScreen() {
    const router = useRouter();
    const { setAgeGroup } = useOnboarding();

    const handleSelectAge = (age: string) => {
        setAgeGroup(age);
        router.push("/onboarding/referral-code");
    };

    return (
        <View className="flex-1 bg-[#FAF7F2] justify-between">
            <OnboardingHeader progress={0.78} />

            <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
                <Animated.View entering={FadeIn.duration(600)} className="mb-6">
                    <Text className="text-[#1F2937] font-sans-bold text-3xl mb-2 text-center">
                        How old are you?
                    </Text>
                    <Text className="text-[#6B7280] font-sans text-base text-center">
                        We only use this information to personalize your experience
                    </Text>
                </Animated.View>

                {/* Age Option Cards with generous spacing */}
                <Animated.View entering={SlideInDown.delay(200).duration(800)}>
                    {AGE_BRACKETS.map((item) => (
                        <Pressable
                            key={item.id}
                            onPress={() => handleSelectAge(item.id)}
                            style={styles.card}
                        >
                            <Text style={styles.label}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                        </Pressable>
                    ))}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: "100%",
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    label: {
        fontSize: 17,
        fontFamily: "Inter_600SemiBold",
        color: "#1F2937",
    },
});
