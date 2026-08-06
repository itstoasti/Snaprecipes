import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { useOnboarding } from "@/components/onboarding/onboardingContext";

const SOURCES = [
    {
        id: "social",
        label: "Social media",
        icons: [
            { name: "logo-instagram", color: "#E4405F" },
            { name: "logo-tiktok", color: "#000000" },
            { name: "logo-facebook", color: "#1877F2" },
            { name: "logo-pinterest", color: "#E60023" },
        ],
    },
    {
        id: "websites",
        label: "Recipe websites",
        icons: [
            { name: "globe-outline", color: "#0284C7" },
            { name: "logo-google", color: "#EA4335" },
        ],
    },
    {
        id: "printed",
        label: "Printed/handwritten recipes",
        icons: [
            { name: "book-outline", color: "#DC2626" },
            { name: "pencil-outline", color: "#EAB308" },
        ],
    },
];

export default function RecipeSourcesScreen() {
    const router = useRouter();
    const { state, setRecipeSources } = useOnboarding();
    const [selected, setSelected] = useState<string[]>(
        state.recipeSources.length ? state.recipeSources : ["social", "websites"]
    );

    const toggleSource = (id: string) => {
        if (selected.includes(id)) {
            if (selected.length > 1) {
                setSelected(selected.filter((item) => item !== id));
            }
        } else {
            setSelected([...selected, id]);
        }
    };

    const handleContinue = () => {
        setRecipeSources(selected);
        router.push("/onboarding/import-teaser");
    };

    return (
        <View className="flex-1 bg-[#FAF7F2] justify-between">
            <OnboardingHeader progress={0.6} />

            <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
                <Animated.View entering={FadeIn.duration(600)} className="mb-6">
                    <Text className="text-[#1F2937] font-sans-bold text-3xl mb-2 text-center">
                        Where do you get your recipes from?
                    </Text>
                    <Text className="text-[#6B7280] font-sans text-base text-center">
                        Select all that apply
                    </Text>
                </Animated.View>

                {/* Option Cards */}
                <Animated.View entering={SlideInDown.delay(200).duration(800)} className="space-y-4">
                    {SOURCES.map((item) => {
                        const isSelected = selected.includes(item.id);
                        return (
                            <Pressable
                                key={item.id}
                                onPress={() => toggleSource(item.id)}
                                style={[styles.card, isSelected ? styles.cardSelected : styles.cardUnselected]}
                            >
                                <Text style={styles.label}>{item.label}</Text>
                                <View style={styles.iconsRow}>
                                    {item.icons.map((ic, idx) => (
                                        <Ionicons key={idx} name={ic.name as any} size={20} color={ic.color} />
                                    ))}
                                </View>
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
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 2,
        backgroundColor: "#FFFFFF",
        marginBottom: 14,
        borderColor: "#F3F4F6",
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
    label: {
        fontSize: 17,
        fontFamily: "Inter_600SemiBold",
        color: "#1F2937",
        flex: 1,
    },
    iconsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
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
