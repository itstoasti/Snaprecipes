import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { useOnboarding } from "@/components/onboarding/onboardingContext";

export default function ReferralCodeScreen() {
    const router = useRouter();
    const { setReferralCode } = useOnboarding();
    const [code, setCode] = useState("");

    const handleContinue = () => {
        setReferralCode(code.trim());
        router.push("/onboarding/setup-loading");
    };

    return (
        <View className="flex-1 bg-[#FAF7F2] justify-between">
            <OnboardingHeader progress={0.82} />

            <View className="flex-1 px-6 pt-4 justify-between pb-8">
                <View className="space-y-6">
                    <Animated.View entering={FadeIn.duration(600)}>
                        <Text className="text-[#1F2937] font-sans-bold text-3xl text-center mb-2">
                            Enter referral code
                        </Text>
                        <Text className="text-[#6B7280] font-sans text-base text-center">
                            If a friend invited you, enter their code below
                        </Text>
                    </Animated.View>

                    {/* Referral Input */}
                    <Animated.View entering={SlideInDown.delay(200).duration(800)} className="space-y-4">
                        <View className="flex-row items-center bg-[#FFFFFF] rounded-2xl px-5 py-4 border border-gray-200 shadow-sm">
                            <Ionicons name="gift-outline" size={24} color="#FF6B35" className="mr-3" />
                            <TextInput
                                value={code}
                                onChangeText={setCode}
                                placeholder="Enter code (e.g. FRIEND2026)"
                                placeholderTextColor="#9CA3AF"
                                className="flex-1 font-sans-semibold text-lg text-[#1F2937] uppercase py-0"
                                autoCapitalize="characters"
                                returnKeyType="done"
                                onSubmitEditing={handleContinue}
                            />
                        </View>
                    </Animated.View>
                </View>

                {/* Bottom Actions */}
                <Animated.View entering={SlideInDown.delay(400).duration(800)} className="space-y-4">
                    <Pressable
                        onPress={handleContinue}
                        style={styles.button}
                    >
                        <Text style={styles.buttonText}>
                            {code.trim().length > 0 ? "Apply code & continue" : "Continue"}
                        </Text>
                    </Pressable>

                    <Pressable onPress={handleContinue} hitSlop={12} className="py-2 items-center">
                        <Text className="text-[#6B7280] font-sans text-base">
                            Don't have a code? <Text className="font-sans-bold text-[#FF6B35]">Skip</Text>
                        </Text>
                    </Pressable>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        width: "100%",
        backgroundColor: "#FF6B35",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
    },
    buttonText: {
        color: "#FFFFFF",
        fontFamily: "Inter_700Bold",
        fontSize: 18,
    },
});
