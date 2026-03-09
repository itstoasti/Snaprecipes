import React, { useState } from "react";
import { View, Text, Modal, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, SlideInDown, FadeOut } from "react-native-reanimated";
import GlassContainer from "./GlassContainer";

interface ReviewPromptModalProps {
    visible: boolean;
    onRespond: (isPositive: boolean | null) => void;
}

export default function ReviewPromptModal({ visible, onRespond }: ReviewPromptModalProps) {
    const [showFeedback, setShowFeedback] = useState(false);

    if (!visible) return null;

    const handleNeedsWork = () => {
        setShowFeedback(true);
    };

    const handleEmailSupport = () => {
        Linking.openURL("mailto:singlesourcedigitalmarketing@gmail.com?subject=SnapRecipes Feedback");
        setShowFeedback(false);
        onRespond(false);
    };

    const handleNoThanks = () => {
        setShowFeedback(false);
        onRespond(false);
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 bg-black/70 justify-center px-6">
                <Animated.View entering={SlideInDown.springify().damping(24).stiffness(100)} exiting={FadeOut}>
                    <GlassContainer style={{ borderRadius: 24 }} className="p-6 overflow-hidden">
                        {/* Decorative Background Elements */}
                        <View className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-accent/20 blur-3xl" />

                        {!showFeedback ? (
                            <>
                                <View className="items-center mb-6 mt-2">
                                    <View className="w-16 h-16 rounded-full bg-surface-800 items-center justify-center border border-surface-700 shadow-xl mb-4">
                                        <Animated.View entering={FadeIn.delay(300)}>
                                            <Ionicons name="heart" size={32} color="#FF6B35" />
                                        </Animated.View>
                                    </View>

                                    <Text className="text-white font-sans-bold text-2xl text-center mb-2">
                                        Enjoying SnapRecipes?
                                    </Text>
                                    <Text className="text-surface-400 font-sans text-center text-sm px-2">
                                        You've saved a few recipes now! Are you enjoying saving your favorite meals with no ads, no clutter, and no life stories?
                                    </Text>
                                </View>

                                <View className="space-y-3 gap-3">
                                    <Pressable
                                        onPress={() => onRespond(true)}
                                        className="w-full py-4 rounded-xl items-center bg-accent shadow-lg shadow-accent/20 flex-row justify-center"
                                    >
                                        <Ionicons name="star" size={18} color="white" className="mr-2" style={{ marginRight: 8 }} />
                                        <Text className="text-white font-sans-bold text-base">Yes, I love it!</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={handleNeedsWork}
                                        className="w-full py-4 rounded-xl items-center bg-surface-800 border border-surface-700"
                                    >
                                        <Text className="text-surface-300 font-sans-semibold text-base">Needs some work</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => onRespond(null)}
                                        className="w-full py-3 mt-1 rounded-xl items-center"
                                    >
                                        <Text className="text-surface-500 font-sans text-sm">Not right now</Text>
                                    </Pressable>
                                </View>
                            </>
                        ) : (
                            <Animated.View entering={FadeIn}>
                                <View className="items-center mb-6 mt-2">
                                    <View className="w-16 h-16 rounded-full bg-surface-800 items-center justify-center border border-surface-700 shadow-xl mb-4">
                                        <Ionicons name="build" size={32} color="#A78BFA" />
                                    </View>

                                    <Text className="text-white font-sans-bold text-2xl text-center mb-2">
                                        We want to fix it! 🛠️
                                    </Text>
                                    <Text className="text-surface-400 font-sans text-center text-sm px-2">
                                        We are sorry to hear that. Could you send us a quick email so our developer can fix your issue right away?
                                    </Text>
                                </View>

                                <View className="space-y-3 gap-3">
                                    <Pressable
                                        onPress={handleEmailSupport}
                                        className="w-full py-4 rounded-xl items-center bg-accent shadow-lg shadow-accent/20 flex-row justify-center"
                                        style={{ backgroundColor: "#A78BFA" }}
                                    >
                                        <Ionicons name="mail" size={18} color="white" className="mr-2" style={{ marginRight: 8 }} />
                                        <Text className="text-white font-sans-bold text-base">Email Support</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={handleNoThanks}
                                        className="w-full py-4 rounded-xl items-center bg-surface-800 border border-surface-700"
                                    >
                                        <Text className="text-surface-300 font-sans-semibold text-base">No thanks</Text>
                                    </Pressable>
                                </View>
                            </Animated.View>
                        )}
                    </GlassContainer>
                </Animated.View>
            </View>
        </Modal>
    );
}
