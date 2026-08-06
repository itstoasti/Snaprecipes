import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Dimensions,
    Linking,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import Animated, {
    FadeIn,
    SlideInDown,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { ONBOARDING_COMPLETE_KEY } from "./first-save";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function CreateAccountScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [emailTouched, setEmailTouched] = useState(false);

    // Subtle pulse glow on the center icon
    const pulseScale = useSharedValue(1);
    useEffect(() => {
        pulseScale.value = withRepeat(
            withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);
    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const showError = emailTouched && email.length > 0 && !isValidEmail;

    const finishOnboarding = async (targetRoute: string = "/") => {
        try {
            await SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, "true");
        } catch (e) {
            console.warn("Failed saving onboarding completion state:", e);
        }
        router.replace(targetRoute as any);
    };

    const handleContinueWithEmail = () => {
        if (isValidEmail) {
            finishOnboarding("/auth");
        }
    };

    const handleSkip = () => {
        finishOnboarding("/(tabs)/");
    };

    return (
        <KeyboardAvoidingView
            style={s.root}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <OnboardingHeader progress={1.0} />

            <View style={s.body}>
                {/* Title Section */}
                <Animated.View entering={FadeIn.duration(600)} style={s.titleSection}>
                    <Text style={s.headline}>Create an account</Text>
                    <Pressable onPress={() => finishOnboarding("/auth")} hitSlop={8}>
                        <Text style={s.loginPrompt}>
                            Already have an account?{" "}
                            <Text style={s.loginLink}>Log in</Text>
                        </Text>
                    </Pressable>
                </Animated.View>

                {/* Visual — Stacked Recipe Cards */}
                <Animated.View entering={ZoomIn.delay(200).duration(600)} style={s.cardsArea}>
                    {/* Back card (tilted left) */}
                    <View style={[s.previewCard, s.cardBack, { transform: [{ rotate: "-6deg" }, { translateY: 6 }] }]}>
                        <View style={s.cardIconRow}>
                            <Text style={{ fontSize: 20 }}>🥗</Text>
                            <View style={s.cardLines}>
                                <View style={[s.cardLine, { width: 60 }]} />
                                <View style={[s.cardLine, { width: 40, opacity: 0.5 }]} />
                            </View>
                        </View>
                    </View>

                    {/* Middle card (tilted right) */}
                    <View style={[s.previewCard, s.cardMiddle, { transform: [{ rotate: "4deg" }, { translateY: -4 }] }]}>
                        <View style={s.cardIconRow}>
                            <Text style={{ fontSize: 20 }}>🍝</Text>
                            <View style={s.cardLines}>
                                <View style={[s.cardLine, { width: 56 }]} />
                                <View style={[s.cardLine, { width: 36, opacity: 0.5 }]} />
                            </View>
                        </View>
                    </View>

                    {/* Front card (center) */}
                    <View style={[s.previewCard, s.cardFront]}>
                        <View style={s.cardIconRow}>
                            <Text style={{ fontSize: 20 }}>🍳</Text>
                            <View style={s.cardLines}>
                                <View style={[s.cardLine, { width: 64, backgroundColor: "#FF6B35" }]} />
                                <View style={[s.cardLine, { width: 44, backgroundColor: "#FDBA74" }]} />
                            </View>
                        </View>
                    </View>

                    {/* Center Pulse Icon */}
                    <Animated.View style={[s.centerBadge, pulseStyle]}>
                        <Ionicons name="cloud-done" size={22} color="#FF6B35" />
                    </Animated.View>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(350).duration(500)} style={s.subtextRow}>
                    <Text style={s.illustrationSubtext}>
                        Sync your saved recipes across all devices
                    </Text>
                </Animated.View>

                {/* Email Input + CTA */}
                <Animated.View entering={SlideInDown.delay(300).duration(600)} style={s.formSection}>
                    {/* Email Input */}
                    <View style={[s.inputWrapper, showError && s.inputWrapperError]}>
                        <Ionicons
                            name="mail-outline"
                            size={20}
                            color={showError ? "#EF4444" : "#9CA3AF"}
                            style={{ marginRight: 10 }}
                        />
                        <TextInput
                            style={s.emailInput}
                            placeholder="Enter your email address"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            value={email}
                            onChangeText={setEmail}
                            onBlur={() => setEmailTouched(true)}
                        />
                        {isValidEmail && (
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        )}
                    </View>
                    {showError && (
                        <Text style={s.errorText}>Please enter a valid email address</Text>
                    )}

                    {/* Continue Button */}
                    <Pressable
                        onPress={handleContinueWithEmail}
                        style={[s.continueButton, !isValidEmail && s.continueButtonDisabled]}
                        disabled={!isValidEmail}
                    >
                        <Text style={s.continueButtonText}>Continue with Email</Text>
                    </Pressable>

                    {/* Skip */}
                    <Pressable onPress={handleSkip} hitSlop={12} style={s.skipButton}>
                        <Text style={s.skipText}>Skip</Text>
                    </Pressable>
                </Animated.View>

                {/* Footer Security Disclaimer */}
                <Animated.View entering={FadeIn.delay(500).duration(600)} style={s.footer}>
                    <Text style={s.footerText}>
                        🔒 Your information is 100% secure. We don't sell your personal
                        information. By submitting your email address, you agree to our{" "}
                        <Text
                            style={s.footerLink}
                            onPress={() => Linking.openURL("https://snaprecipes.xyz/terms.html").catch(() => {})}
                        >
                            Terms
                        </Text>{" "}
                        and{" "}
                        <Text
                            style={s.footerLink}
                            onPress={() => Linking.openURL("https://snaprecipes.xyz/privacy.html").catch(() => {})}
                        >
                            Privacy
                        </Text>
                        .
                    </Text>
                </Animated.View>
            </View>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#FAF7F2",
    },
    body: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 24,
        justifyContent: "space-between",
    },
    titleSection: {
        alignItems: "center",
        paddingTop: 8,
        gap: 8,
    },
    headline: {
        fontFamily: "Inter_700Bold",
        fontSize: 28,
        color: "#1F2937",
        textAlign: "center",
    },
    loginPrompt: {
        fontFamily: "Inter_400Regular",
        fontSize: 15,
        color: "#4B5563",
    },
    loginLink: {
        fontFamily: "Inter_700Bold",
        color: "#3B82F6",
    },

    /* Stacked Card Illustration */
    cardsArea: {
        alignItems: "center",
        justifyContent: "center",
        height: 120,
        position: "relative",
    },
    previewCard: {
        position: "absolute",
        width: 140,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    cardBack: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
        zIndex: 1,
    },
    cardMiddle: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        zIndex: 2,
    },
    cardFront: {
        shadowColor: "#FF6B35",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 4,
        zIndex: 3,
        borderColor: "#FFEDD5",
        borderWidth: 1.5,
    },
    cardIconRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    cardLines: {
        gap: 5,
    },
    cardLine: {
        height: 4,
        borderRadius: 2,
        backgroundColor: "#E5E7EB",
    },
    centerBadge: {
        position: "absolute",
        bottom: -4,
        right: SCREEN_WIDTH / 2 - 86,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FFF7ED",
        borderWidth: 2,
        borderColor: "#FFEDD5",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        shadowColor: "#FF6B35",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    subtextRow: {
        alignItems: "center",
        marginTop: -4,
    },
    illustrationSubtext: {
        fontFamily: "Inter_500Medium",
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
    },

    /* Form */
    formSection: {
        gap: 12,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
    },
    inputWrapperError: {
        borderColor: "#FCA5A5",
    },
    emailInput: {
        flex: 1,
        fontFamily: "Inter_500Medium",
        fontSize: 16,
        color: "#1F2937",
    },
    errorText: {
        fontFamily: "Inter_500Medium",
        fontSize: 12,
        color: "#EF4444",
        paddingLeft: 4,
        marginTop: -4,
    },
    continueButton: {
        width: "100%",
        backgroundColor: "#FF6B35",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: "#FF6B35",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    continueButtonDisabled: {
        opacity: 0.5,
    },
    continueButtonText: {
        fontFamily: "Inter_700Bold",
        fontSize: 18,
        color: "#FFFFFF",
    },
    skipButton: {
        paddingVertical: 8,
        alignItems: "center",
    },
    skipText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 15,
        color: "#6B7280",
    },

    /* Footer */
    footer: {
        alignItems: "center",
        paddingHorizontal: 8,
    },
    footerText: {
        fontFamily: "Inter_400Regular",
        fontSize: 12,
        color: "#9CA3AF",
        textAlign: "center",
        lineHeight: 18,
    },
    footerLink: {
        textDecorationLine: "underline",
        color: "#6B7280",
    },
});
