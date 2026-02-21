import React from "react";
import { View, Text, Pressable, Modal, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import GlassContainer from "./GlassContainer";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface DeleteConfirmationModalProps {
    visible: boolean;
    recipeName: string;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function DeleteConfirmationModal({
    visible,
    recipeName,
    onCancel,
    onConfirm,
}: DeleteConfirmationModalProps) {
    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            <View className="flex-1">
                {/* Backdrop Background */}
                <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    className="absolute inset-0"
                >
                    <BlurView intensity={20} tint="dark" className="flex-1 bg-black/70" />
                </Animated.View>

                {/* Touch Overlay */}
                <Pressable
                    className="flex-1 justify-end"
                    onPress={onCancel}
                >
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        {/* Modal Content */}
                        <Animated.View
                            entering={SlideInDown.springify().damping(20).stiffness(150)}
                            exiting={SlideOutDown}
                            className="pb-10 pt-4 px-5"
                        >
                            <GlassContainer style={{ borderRadius: 24, overflow: "hidden" }}>
                                <View className="p-6 items-center">
                                    {/* Icon */}
                                    <View className="w-16 h-16 rounded-full bg-red-500/10 items-center justify-center mb-4">
                                        <Ionicons name="trash" size={32} color="#EF4444" />
                                    </View>

                                    {/* Text */}
                                    <Text className="text-white font-sans-bold text-xl mb-2 text-center">
                                        Delete Recipe?
                                    </Text>
                                    <Text className="text-surface-300 font-sans text-sm text-center mb-8 px-4 leading-5">
                                        Are you sure you want to delete "{recipeName}"? This action cannot be undone.
                                    </Text>

                                    {/* Actions */}
                                    <View className="flex-row gap-3 w-full">
                                        <Pressable
                                            onPress={() => onCancel()}
                                            className="flex-1 py-4 bg-surface-800 rounded-xl items-center"
                                        >
                                            <Text className="text-white font-sans-semibold text-base">Cancel</Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={onConfirm}
                                            className="flex-1 py-4 bg-red-500 rounded-xl items-center"
                                        >
                                            <Text className="text-white font-sans-semibold text-base">Delete</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </GlassContainer>
                        </Animated.View>
                    </Pressable>
                </Pressable>
            </View>
        </Modal>
    );
}
