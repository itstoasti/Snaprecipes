import React, { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { useOnboarding } from "@/components/onboarding/onboardingContext";

export default function InfluencerSearchScreen() {
    const router = useRouter();
    const { setInfluencerName } = useOnboarding();
    const [query, setQuery] = useState("");

    const handleProceed = () => {
        setInfluencerName(query.trim());
        router.push("/onboarding/recipe-sources");
    };

    return (
        <View className="flex-1 bg-[#FAF7F2] justify-between">
            <OnboardingHeader progress={0.55} />

            <View className="flex-1 px-6 pt-4 justify-between pb-8">
                <View className="space-y-6">
                    <Animated.View entering={FadeIn.duration(600)}>
                        <Text className="text-[#1F2937] font-sans-bold text-3xl text-center">
                            Which influencer 👁️👁️
                        </Text>
                    </Animated.View>

                    {/* Search Input */}
                    <Animated.View entering={SlideInDown.delay(200).duration(800)}>
                        <View className="flex-row items-center bg-[#FFFFFF] rounded-full px-5 py-3.5 border border-gray-200 shadow-sm">
                            <Ionicons name="search" size={20} color="#9CA3AF" className="mr-3" />
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search influencer name"
                                placeholderTextColor="#9CA3AF"
                                className="flex-1 font-sans text-base text-[#1F2937] py-0"
                                returnKeyType="done"
                                onSubmitEditing={handleProceed}
                            />
                        </View>
                    </Animated.View>
                </View>

                {/* Footer Skip Link */}
                <Animated.View entering={SlideInDown.delay(400).duration(800)} className="items-center space-y-2">
                    <Text className="text-[#6B7280] font-sans text-sm">Can't remember?</Text>
                    <Pressable onPress={handleProceed} hitSlop={12} className="py-2 px-4">
                        <Text className="text-[#1F2937] font-sans-semibold text-base underline">Skip</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </View>
    );
}
