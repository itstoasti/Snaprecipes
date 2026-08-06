import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { useOnboarding } from "@/components/onboarding/onboardingContext";

export default function AttributionSocialScreen() {
    const router = useRouter();
    const { setSocialSource } = useOnboarding();

    const handleSelectOption = (option: string) => {
        setSocialSource(option);
        if (option === "influencer") {
            router.push("/onboarding/influencer-search");
        } else {
            router.push("/onboarding/recipe-sources");
        }
    };

    return (
        <View className="flex-1 bg-[#FAF7F2] justify-between">
            <OnboardingHeader progress={0.52} />

            <View className="flex-1 px-6 pt-4 justify-start">
                <Animated.View entering={FadeIn.duration(600)} className="mb-6">
                    <Text className="text-[#1F2937] font-sans-bold text-3xl text-center">
                        How did you hear about us?
                    </Text>
                </Animated.View>

                {/* Sub-Options Grid with generous spacing */}
                <Animated.View entering={SlideInDown.delay(200).duration(800)}>
                    <View style={styles.row}>
                        <Pressable
                            onPress={() => handleSelectOption("ad")}
                            style={styles.gridCard}
                        >
                            <Ionicons name="megaphone-outline" size={32} color="#FF6B35" style={styles.iconMargin} />
                            <Text style={styles.gridLabel}>
                                Social Media Ad
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => handleSelectOption("influencer")}
                            style={styles.gridCard}
                        >
                            <Ionicons name="person-circle-outline" size={32} color="#FF6B35" style={styles.iconMargin} />
                            <Text style={styles.gridLabel}>
                                Influencer
                            </Text>
                        </Pressable>
                    </View>

                    <Pressable
                        onPress={() => handleSelectOption("other")}
                        style={styles.fullCard}
                    >
                        <Text style={styles.fullLabel}>Other</Text>
                        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                    </Pressable>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        gap: 14,
        marginBottom: 14,
    },
    gridCard: {
        flex: 1,
        paddingVertical: 24,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#F3F4F6",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    fullCard: {
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
    iconMargin: {
        marginBottom: 10,
    },
    gridLabel: {
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
        color: "#1F2937",
        textAlign: "center",
    },
    fullLabel: {
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
        color: "#1F2937",
    },
});
