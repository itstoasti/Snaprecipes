import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import Svg, { Defs, ClipPath, Path, Image as SvgImage } from "react-native-svg";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { useOnboarding } from "@/components/onboarding/onboardingContext";

const GOAL_LABELS: Record<string, string> = {
    eat_healthier: "eat healthier",
    save_money: "save money",
    improve_skills: "improve cooking skills",
    organize_recipes: "organize recipes",
    plan_meals: "plan out meals",
    try_cuisines: "try new cuisines",
};

export default function GoalAffirmationScreen() {
    const router = useRouter();
    const { state } = useOnboarding();

    const selectedGoals = state.goals.length ? state.goals : ["eat_healthier", "save_money"];
    const goalTextList = selectedGoals.map((id) => GOAL_LABELS[id] || "eat healthier");

    let formattedGoalString = goalTextList[0];
    if (goalTextList.length === 2) {
        formattedGoalString = `${goalTextList[0]} and ${goalTextList[1]}`;
    } else if (goalTextList.length > 2) {
        formattedGoalString = `${goalTextList.slice(0, -1).join(", ")}, and ${goalTextList[goalTextList.length - 1]}`;
    }

    const handleContinue = () => {
        router.push("/onboarding/cooking-time");
    };

    // Smooth organic cloud/scalloped shape matching ReciMe
    const scallopPath = `
        M 100 10
        C 122 2, 148 10, 162 28
        C 176 46, 192 64, 188 88
        C 194 112, 180 138, 164 154
        C 148 170, 122 182, 100 176
        C 78 182, 52 170, 36 154
        C 20 138, 6 112, 12 88
        C 8 64, 24 46, 38 28
        C 52 10, 78 2, 100 10 Z
    `;

    return (
        <View className="flex-1 bg-[#FAF7F2] justify-between">
            <OnboardingHeader progress={0.35} />

            <View className="flex-1 px-6 pt-4 pb-8 justify-between">
                {/* Bigger Title & Subtitle Section */}
                <Animated.View entering={FadeIn.duration(600)} className="space-y-3 items-center">
                    <Text className="text-[#1F2937] font-sans-bold text-4xl text-center">
                        Let's make your goals happen!
                    </Text>
                    <Text className="text-[#4B5563] font-sans text-xl text-center leading-relaxed px-1">
                        You want to <Text className="font-sans-bold text-[#1F2937]">{formattedGoalString}</Text> — we'll help you get there.
                    </Text>
                </Animated.View>

                {/* Significantly Larger Organic Scalloped Lifestyle Photo Container */}
                <Animated.View
                    entering={SlideInDown.delay(200).duration(800)}
                    className="items-center justify-center my-auto space-y-6"
                >
                    <View className="w-[330px] h-[330px] items-center justify-center shadow-xl shadow-black/10">
                        <Svg width={330} height={330} viewBox="0 0 200 190">
                            <Defs>
                                <ClipPath id="scallopClip2">
                                    <Path d={scallopPath} />
                                </ClipPath>
                            </Defs>
                            <SvgImage
                                href={require("../../assets/recime_lifestyle_2.jpg")}
                                width="200"
                                height="190"
                                preserveAspectRatio="xMidYMid slice"
                                clipPath="url(#scallopClip2)"
                            />
                        </Svg>
                    </View>

                    <Text className="text-[#1F2937] font-sans-bold text-2xl text-center leading-snug">
                        We're here to help you{"\n"}with your goals 🤝
                    </Text>
                </Animated.View>

                {/* Bottom CTA */}
                <Animated.View entering={SlideInDown.delay(400).duration(800)}>
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
