import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInDown, ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { useOnboarding } from "@/components/onboarding/onboardingContext";

export default function NotificationsScreen() {
    const router = useRouter();
    const { setNotificationAllowed } = useOnboarding();
    const [simulatedChoice, setSimulatedChoice] = useState<boolean>(true);
    const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

    const handleCardChoice = () => {
        handleHelpStayOnTrack();
    };

    const handleHelpStayOnTrack = () => {
        setShowCustomModal(true);
    };

    const handleModalPermission = (allowed: boolean) => {
        setShowCustomModal(false);
        setNotificationAllowed(allowed);
        router.push("/onboarding/attribution");
    };

    return (
        <View className="flex-1 bg-[#FAF7F2] justify-between">
            <OnboardingHeader progress={0.4} />

            <View className="flex-1 px-6 pt-4 justify-between pb-8">
                {/* Title Section */}
                <Animated.View entering={FadeIn.duration(600)} className="space-y-2 items-center">
                    <Text className="text-[#1F2937] font-sans-bold text-3xl text-center">
                        Get the right recipe at the right time
                    </Text>
                    <Text className="text-[#6B7280] font-sans text-base text-center px-2">
                        We'll send you a recipe idea at the time that works for you.
                    </Text>
                </Animated.View>

                {/* Main Choice Card */}
                <Animated.View
                    entering={SlideInDown.delay(200).duration(800)}
                    className="bg-[#FFFFFF] rounded-3xl p-6 shadow-sm border border-gray-200/80 my-auto items-center space-y-5"
                >
                    <View className="w-14 h-14 rounded-full bg-orange-50 items-center justify-center border border-orange-100">
                        <Ionicons name="notifications" size={28} color="#FF6B35" />
                    </View>

                    <Text className="text-[#1F2937] font-sans-bold text-xl text-center px-2 leading-snug">
                        Allow SnapRecipes to send you notifications?
                    </Text>

                    <View className="w-full space-y-3 pt-2">
                        <Pressable
                            onPress={handleHelpStayOnTrack}
                            style={[styles.optionBtn, styles.optionActive]}
                        >
                            <Text style={[styles.optionText, styles.optionTextActive]}>
                                Allow
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={handleHelpStayOnTrack}
                            style={[styles.optionBtn, styles.optionInactive]}
                        >
                            <Text style={[styles.optionText, styles.optionTextInactive]}>
                                Don't allow
                            </Text>
                        </Pressable>
                    </View>
                </Animated.View>

                {/* Bottom Action */}
                <Animated.View entering={SlideInDown.delay(400).duration(800)} className="space-y-4">
                    <Text className="text-[#6B7280] font-sans text-xs text-center">
                        Turn off notifications anytime
                    </Text>

                    <Pressable
                        onPress={handleHelpStayOnTrack}
                        style={styles.button}
                    >
                        <Text style={styles.buttonText}>Help me stay on track</Text>
                    </Pressable>
                </Animated.View>
            </View>

            {/* Custom Styled Permission Modal matching SnapRecipes branding */}
            <Modal
                transparent
                visible={showCustomModal}
                animationType="fade"
                onRequestClose={() => setShowCustomModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View entering={ZoomIn.duration(300)} style={styles.modalCard}>
                        {/* Icon Badge */}
                        <View style={styles.modalIconBadge}>
                            <Ionicons name="notifications" size={32} color="#FF6B35" />
                        </View>

                        <Text style={styles.modalTitle}>
                            "SnapRecipes" Would Like to Send You Notifications
                        </Text>

                        <Text style={styles.modalBody}>
                            Notifications may include recipe reminders, meal ideas, and personalized cooking alerts.
                        </Text>

                        {/* Action Buttons */}
                        <View style={styles.modalActions}>
                            <Pressable
                                onPress={() => handleModalPermission(true)}
                                style={styles.modalPrimaryBtn}
                            >
                                <Text style={styles.modalPrimaryText}>Allow</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => handleModalPermission(false)}
                                style={styles.modalSecondaryBtn}
                            >
                                <Text style={styles.modalSecondaryText}>Don't Allow</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    optionBtn: {
        width: "100%",
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
    },
    optionActive: {
        backgroundColor: "#FF6B35",
    },
    optionInactive: {
        backgroundColor: "#FFF7ED",
        borderWidth: 1,
        borderColor: "#FFEDD5",
    },
    optionText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 16,
    },
    optionTextActive: {
        color: "#FFFFFF",
    },
    optionTextInactive: {
        color: "#FF6B35",
    },
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

    // Modal Styling
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    modalCard: {
        width: "100%",
        backgroundColor: "#FAF7F2",
        borderRadius: 28,
        padding: 24,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#FFEDD5",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    modalIconBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#FFF7ED",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#FFEDD5",
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: "Inter_700Bold",
        color: "#1F2937",
        textAlign: "center",
        marginBottom: 10,
        lineHeight: 26,
    },
    modalBody: {
        fontSize: 15,
        fontFamily: "Inter_400Regular",
        color: "#4B5563",
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 22,
    },
    modalActions: {
        width: "100%",
        gap: 10,
    },
    modalPrimaryBtn: {
        width: "100%",
        backgroundColor: "#FF6B35",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
    },
    modalPrimaryText: {
        color: "#FFFFFF",
        fontFamily: "Inter_700Bold",
        fontSize: 17,
    },
    modalSecondaryBtn: {
        width: "100%",
        backgroundColor: "#FFFFFF",
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    modalSecondaryText: {
        color: "#4B5563",
        fontFamily: "Inter_600SemiBold",
        fontSize: 16,
    },
});
