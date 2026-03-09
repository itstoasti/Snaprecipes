import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import GlassContainer from "./GlassContainer";

interface StatusModalProps {
    visible: boolean;
    type: "success" | "error";
    title: string;
    message: string;
    buttonText?: string;
    onClose: () => void;
}

export default function StatusModal({
    visible,
    type,
    title,
    message,
    buttonText = "Got it",
    onClose,
}: StatusModalProps) {
    if (!visible) return null;

    const isSuccess = type === "success";
    const iconName = isSuccess ? "checkmark-circle" : "alert-circle";
    const iconColor = isSuccess ? "#34D399" : "#EF4444";
    const iconBg = isSuccess ? "bg-green-500/10" : "bg-red-500/10";

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            <View className="flex-1 justify-center items-center px-6">
                {/* Backdrop Background */}
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    className="absolute inset-0"
                >
                    <BlurView intensity={30} tint="dark" className="flex-1 bg-black/40" />
                </Animated.View>

                {/* Modal Content */}
                <Animated.View
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(200)}
                    className="w-full max-w-sm"
                >
                    <GlassContainer style={{ borderRadius: 32, overflow: "hidden" }}>
                        <View className="p-8 items-center">
                            {/* Icon */}
                            <View className={`w-20 h-20 rounded-full ${iconBg} items-center justify-center mb-6`}>
                                <Ionicons name={iconName} size={42} color={iconColor} />
                            </View>

                            {/* Text */}
                            <Text className="text-white font-sans-bold text-2xl mb-3 text-center">
                                {title}
                            </Text>
                            <Text className="text-surface-300 font-sans text-base text-center mb-8 px-2 leading-6">
                                {message}
                            </Text>

                            {/* Action Button */}
                            <Pressable
                                onPress={onClose}
                                className={`w-full py-4 rounded-2xl items-center ${isSuccess ? 'bg-accent shadow-lg shadow-accent/20' : 'bg-surface-800 border border-surface-700'}`}
                            >
                                <Text className="text-white font-sans-bold text-base">
                                    {buttonText}
                                </Text>
                            </Pressable>
                        </View>
                    </GlassContainer>
                </Animated.View>
            </View>
        </Modal>
    );
}
