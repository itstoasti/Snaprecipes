import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";

interface ReviewItem {
    id: number;
    title: string;
    quote: string;
    author: string;
    role: string;
    initials: string;
    stars: number;
}

const REVIEWS: ReviewItem[] = [
    {
        id: 1,
        title: "Life-changing for my recipe collection!",
        quote: "Finally, all my scattered recipes are in one place. I just paste links from Instagram and Pinterest, and it extracts the clean ingredients instantly.",
        author: "Sarah J.",
        role: "Home Cook & Busy Mom",
        initials: "SJ",
        stars: 5,
    },
    {
        id: 2,
        title: "No ads, no 10-page life stories!",
        quote: "Finding dinner ideas is so easy now. Just the step-by-step instructions and ingredients. Saved me hours of planning every single week.",
        author: "Mark L.",
        role: "Meal Prep Enthusiast",
        initials: "ML",
        stars: 5,
    },
    {
        id: 3,
        title: "My daily cooking companion",
        quote: "SnapRecipes makes grocery shopping a breeze. The ingredients auto-format into clean shopping lists. Absolutely essential in my kitchen!",
        author: "Emily R.",
        role: "Home Chef",
        initials: "ER",
        stars: 5,
    },
];

export default function ReviewsScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);

    // Automatically cycle through reviews every 4 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % REVIEWS.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const currentReview = REVIEWS[currentIndex];

    const handleContinue = () => {
        router.push("/onboarding/goals");
    };

    return (
        <View className="flex-1 bg-[#FAF7F2] justify-between">
            <OnboardingHeader progress={0.1} />

            <View className="flex-1 px-6 pt-2 pb-8 justify-between">
                {/* Title Section with Tighter Padding */}
                <Animated.View entering={FadeIn.duration(600)} className="space-y-1 mb-2">
                    <Text className="text-[#1F2937] font-sans-bold text-3xl leading-tight">
                        Loved by home cooks to <Text className="text-[#FF6B35]">stay organized</Text>
                    </Text>
                    <Text className="text-[#4B5563] font-sans text-base">
                        and save time in the kitchen
                    </Text>
                </Animated.View>

                {/* Larger Rotating Review Slideshow Card filling vertical space */}
                <View className="flex-1 justify-center py-2">
                    <Animated.View
                        key={currentReview.id}
                        entering={SlideInRight.duration(400)}
                        exiting={SlideOutLeft.duration(400)}
                        className="bg-[#FFFFFF] rounded-3xl p-7 shadow-md border border-gray-200/80 relative justify-between"
                    >
                        {/* Big Quote Marker */}
                        <Text className="text-orange-100 font-serif text-7xl leading-none absolute -top-5 left-6 select-none">
                            “
                        </Text>

                        <View className="pt-2">
                            {/* Star Rating */}
                            <View className="flex-row space-x-1.5 mb-4">
                                {[...Array(currentReview.stars)].map((_, i) => (
                                    <Ionicons key={i} name="star" size={26} color="#FF6B35" />
                                ))}
                            </View>

                            <Text className="text-[#1F2937] font-sans-bold text-xl mb-4 leading-snug">
                                {currentReview.title}
                            </Text>

                            <Text className="text-[#374151] font-sans text-lg leading-relaxed mb-8">
                                "{currentReview.quote}"
                            </Text>
                        </View>

                        <View className="border-t border-gray-100 pt-5 flex-row items-center space-x-4">
                            <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center border-2 border-orange-200">
                                <Text className="font-sans-bold text-[#FF6B35] text-lg">{currentReview.initials}</Text>
                            </View>
                            <View>
                                <Text className="text-[#1F2937] font-sans-bold text-lg">{currentReview.author}</Text>
                                <Text className="text-[#6B7280] font-sans text-sm">{currentReview.role}</Text>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Pagination Indicators / Dots */}
                    <View className="flex-row justify-center space-x-2.5 mt-5">
                        {REVIEWS.map((_, idx) => (
                            <Pressable
                                key={idx}
                                onPress={() => setCurrentIndex(idx)}
                                className={`h-3 rounded-full transition-all ${
                                    idx === currentIndex ? "w-9 bg-[#FF6B35]" : "w-3 bg-gray-300"
                                }`}
                            />
                        ))}
                    </View>
                </View>

                {/* Bottom CTA */}
                <Animated.View className="pt-2">
                    <Pressable
                        onPress={handleContinue}
                        className="w-full bg-[#FF6B35] active:bg-[#E85A24] py-4 rounded-2xl items-center shadow-lg shadow-orange-500/25"
                    >
                        <Text className="text-[#FFFFFF] font-sans-bold text-lg">Continue</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </View>
    );
}
