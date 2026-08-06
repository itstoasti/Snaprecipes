import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { useOnboarding } from "@/components/onboarding/onboardingContext";

const CHANNELS = [
    { id: "youtube", label: "YouTube", icon: "logo-youtube", color: "#FF0000", isSocial: false },
    { id: "instagram", label: "Instagram", icon: "logo-instagram", color: "#E4405F", isSocial: true },
    { id: "google_play", label: "Search on Google Play", icon: "logo-google-playstore", color: "#00E676", isSocial: false },
    { id: "tiktok", label: "TikTok", icon: "logo-tiktok", color: "#000000", isSocial: true },
    { id: "facebook", label: "Facebook", icon: "logo-facebook", color: "#1877F2", isSocial: true },
    { id: "friend", label: "Through a friend", icon: "people-outline", color: "#4B5563", isSocial: false },
    { id: "google_search", label: "Google Search", icon: "search-outline", color: "#4285F4", isSocial: false },
    { id: "other", label: "Other", icon: "ellipsis-horizontal", color: "#6B7280", isSocial: false },
];

export default function AttributionScreen() {
    const router = useRouter();
    const { setAcquisitionChannel } = useOnboarding();

    const handleSelectChannel = (channel: typeof CHANNELS[0]) => {
        setAcquisitionChannel(channel.id);
        if (channel.isSocial) {
            router.push("/onboarding/attribution-social");
        } else {
            router.push("/onboarding/recipe-sources");
        }
    };

    const handleReferralCode = () => {
        router.push("/onboarding/referral-code");
    };

    return (
        <View className="flex-1 bg-[#FAF7F2] justify-between">
            <OnboardingHeader progress={0.48} />

            <ScrollView className="flex-1 px-6 pt-2" contentContainerStyle={{ paddingBottom: 32 }}>
                <Animated.View entering={FadeIn.duration(600)} className="mb-5 items-center">
                    <Text className="text-[#1F2937] font-sans-bold text-3xl mb-3 text-center">
                        How did you hear about us?
                    </Text>

                    <Pressable onPress={handleReferralCode} hitSlop={8} className="py-1">
                        <Text className="text-[#FF6B35] font-sans-bold text-base underline">
                            I have a referral code
                        </Text>
                    </Pressable>
                </Animated.View>

                {/* Acquisition Options with generous spacing */}
                <Animated.View entering={SlideInDown.delay(200).duration(800)}>
                    {CHANNELS.map((item) => (
                        <Pressable
                            key={item.id}
                            onPress={() => handleSelectChannel(item)}
                            style={styles.card}
                        >
                            <Ionicons name={item.icon as any} size={26} color={item.color} style={styles.icon} />
                            <Text style={styles.label}>
                                {item.label}
                            </Text>
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
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 18,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    icon: {
        marginRight: 14,
    },
    label: {
        flex: 1,
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
        color: "#1F2937",
    },
});
