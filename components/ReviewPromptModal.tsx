import React, { useState, useEffect } from "react";
import { View, Text, Modal, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import GlassContainer from "./GlassContainer";

interface ReviewPromptModalProps {
    visible: boolean;
    onRespond: (isPositive: boolean | null) => void;
}

export default function ReviewPromptModal({ visible, onRespond }: ReviewPromptModalProps) {
    const [showFeedback, setShowFeedback] = useState(false);

    useEffect(() => {
        if (!visible) {
            setShowFeedback(false);
        }
    }, [visible]);

    const handleNeedsWork = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowFeedback(true);
    };

    const handleEmailSupport = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Linking.openURL("mailto:singlesourcedigitalmarketing@gmail.com?subject=SnapRecipes Feedback").catch(() => {});
        setShowFeedback(false);
        onRespond(false);
    };

    const handleNoThanks = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowFeedback(false);
        onRespond(false);
    };

    const handleYesLoveIt = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowFeedback(false);
        onRespond(true);
    };

    const handleNotRightNow = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowFeedback(false);
        onRespond(null);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleNotRightNow}
        >
            <View className="flex-1 bg-black/70 justify-center px-6">
                <View className="w-full">
                    <GlassContainer style={{ borderRadius: 24 }} className="p-6 overflow-hidden">
                        {/* Decorative Background Elements */}
                        <View className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-accent/20 blur-3xl" />

                        {!showFeedback ? (
                            <View className="w-full">
                                <View className="items-center mb-6 mt-2">
                                    <View className="w-16 h-16 rounded-full bg-surface-800 items-center justify-center border border-surface-700 shadow-xl mb-4">
                                        <Ionicons name="heart" size={32} color="#FF6B35" />
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
                                        onPress={handleYesLoveIt}
                                        className="w-full py-4 rounded-xl items-center bg-accent shadow-lg shadow-accent/20 flex-row justify-center active:opacity-80"
                                    >
                                        <Ionicons name="star" size={18} color="white" style={{ marginRight: 8 }} />
                                        <Text className="text-[#FFFFFF] font-sans-bold text-base">Yes, I love it!</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={handleNeedsWork}
                                        className="w-full py-4 rounded-xl items-center bg-surface-800 border border-surface-700 active:opacity-80"
                                    >
                                        <Text className="text-surface-300 font-sans-semibold text-base">Needs some work</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={handleNotRightNow}
                                        className="w-full py-3 mt-1 rounded-xl items-center active:opacity-80"
                                    >
                                        <Text className="text-surface-500 font-sans text-sm">Not right now</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <View className="w-full">
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
                                        className="w-full py-4 rounded-xl items-center bg-accent shadow-lg shadow-accent/20 flex-row justify-center active:opacity-80"
                                        style={{ backgroundColor: "#A78BFA" }}
                                    >
                                        <Ionicons name="mail" size={18} color="white" style={{ marginRight: 8 }} />
                                        <Text className="text-[#FFFFFF] font-sans-bold text-base">Email Support</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={handleNoThanks}
                                        className="w-full py-4 rounded-xl items-center bg-surface-800 border border-surface-700 active:opacity-80"
                                    >
                                        <Text className="text-surface-300 font-sans-semibold text-base">No thanks</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </GlassContainer>
                </View>
            </View>
        </Modal>
    );
}
