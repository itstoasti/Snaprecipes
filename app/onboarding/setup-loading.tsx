import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
    FadeIn,
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    ZoomIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const LOADING_MESSAGES = [
    "Customizing your experience...",
    "Tailoring recipe imports for you...",
    "Preparing your personal recipe vault...",
    "Finalizing your setup...",
];

export default function SetupLoadingScreen() {
    const router = useRouter();
    const [msgIndex, setMsgIndex] = useState(0);

    // Animation values
    const spin = useSharedValue(0);
    const pulse = useSharedValue(1);
    const sparkle = useSharedValue(0);

    useEffect(() => {
        // Continuous orbit rotation
        spin.value = withRepeat(
            withTiming(1, { duration: 3200, easing: Easing.linear }),
            -1,
            false
        );

        // Center pulse
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.95, { duration: 900, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        // Sparkle scale
        sparkle.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 600 }),
                withTiming(0.2, { duration: 600 })
            ),
            -1,
            true
        );

        // Cycle loading messages
        const msgTimer = setInterval(() => {
            setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 850);

        // Transition to next screen
        const navTimer = setTimeout(() => {
            router.replace("/onboarding/transformation-graph");
        }, 3500);

        return () => {
            clearInterval(msgTimer);
            clearTimeout(navTimer);
        };
    }, []);

    const orbitStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${spin.value * 360}deg` }],
    }));

    const centerPulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    const sparkleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: sparkle.value }],
        opacity: sparkle.value,
    }));

    return (
        <View style={s.root}>
            <OnboardingHeader progress={0.88} />

            <View style={s.body}>
                {/* Title */}
                <Animated.View entering={FadeIn.duration(600)} style={s.titleWrap}>
                    <Text style={s.title}>We're setting everything up for you</Text>
                </Animated.View>

                {/* SnapRecipes Cooking Extraction Magic Stage */}
                <View style={s.stage}>
                    <Animated.View entering={ZoomIn.duration(500)} style={s.magicContainer}>
                        {/* Outer Glow Aura */}
                        <View style={s.glowAura} />

                        {/* Orbiting Ingredient Spheres */}
                        <Animated.View style={[s.orbitContainer, orbitStyle]}>
                            {/* Herb Green Node */}
                            <View style={[s.node, s.nodeGreen, { top: 0, left: "50%", marginLeft: -18 }]}>
                                <Ionicons name="leaf-outline" size={18} color="#FFF" />
                            </View>

                            {/* Citrus Orange Node */}
                            <View style={[s.node, s.nodeOrange, { top: "50%", right: 0, marginTop: -18 }]}>
                                <Ionicons name="restaurant-outline" size={18} color="#FFF" />
                            </View>

                            {/* Lemon Yellow Node */}
                            <View style={[s.node, s.nodeYellow, { bottom: 0, left: "50%", marginLeft: -18 }]}>
                                <Ionicons name="flame-outline" size={18} color="#FFF" />
                            </View>

                            {/* Berry Purple Node */}
                            <View style={[s.node, s.nodePurple, { top: "50%", left: 0, marginTop: -18 }]}>
                                <Ionicons name="nutrition-outline" size={18} color="#FFF" />
                            </View>
                        </Animated.View>

                        {/* Central Glowing SnapRecipes Hub */}
                        <Animated.View style={[s.centerHub, centerPulseStyle]}>
                            <Ionicons name="sparkles" size={36} color="#FF6B35" />
                        </Animated.View>

                        {/* Corner Sparkle accents */}
                        <Animated.View style={[s.sparkleBadge, { top: 12, right: 16 }, sparkleStyle]}>
                            <Ionicons name="sparkles" size={16} color="#FBBF24" />
                        </Animated.View>

                        <Animated.View style={[s.sparkleBadge, { bottom: 16, left: 14 }, sparkleStyle]}>
                            <Ionicons name="sparkles" size={14} color="#C084FC" />
                        </Animated.View>
                    </Animated.View>

                    {/* Animated Cycling Text */}
                    <View style={s.textContainer}>
                        <Animated.Text
                            key={msgIndex}
                            entering={FadeIn.duration(300)}
                            exiting={FadeOut.duration(200)}
                            style={s.loadingMessage}
                        >
                            {LOADING_MESSAGES[msgIndex]}
                        </Animated.Text>
                    </View>
                </View>

                {/* Progress Bar at Bottom */}
                <View style={s.progressWrap}>
                    <View style={s.progressBarTrack}>
                        <Animated.View style={s.progressBarFill} />
                    </View>
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#FAF7F2",
        justifyContent: "space-between",
    },
    body: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 32,
        justifyContent: "space-between",
        alignItems: "center",
    },
    titleWrap: {
        alignItems: "center",
        marginTop: 12,
    },
    title: {
        color: "#1F2937",
        fontFamily: "Inter_700Bold",
        fontSize: 28,
        textAlign: "center",
        lineHeight: 36,
    },
    stage: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
    },
    magicContainer: {
        width: 220,
        height: 220,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
    },
    glowAura: {
        position: "absolute",
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: "rgba(255,107,53,0.08)",
    },
    orbitContainer: {
        width: 200,
        height: 200,
        position: "absolute",
    },
    node: {
        width: 36,
        height: 36,
        borderRadius: 18,
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
    },
    nodeGreen: { backgroundColor: "#10B981" },
    nodeOrange: { backgroundColor: "#FF6B35" },
    nodeYellow: { backgroundColor: "#F59E0B" },
    nodePurple: { backgroundColor: "#8B5CF6" },

    centerHub: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#FF6B35",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: "rgba(255,107,53,0.15)",
    },
    sparkleBadge: {
        position: "absolute",
    },
    textContainer: {
        height: 30,
        marginTop: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingMessage: {
        fontFamily: "serif",
        fontStyle: "italic",
        color: "#6B7280",
        fontSize: 18,
        textAlign: "center",
    },
    progressWrap: {
        width: "100%",
        alignItems: "center",
    },
    progressBarTrack: {
        width: 180,
        height: 5,
        backgroundColor: "#E5E7EB",
        borderRadius: 3,
        overflow: "hidden",
    },
    progressBarFill: {
        width: "80%",
        height: "100%",
        backgroundColor: "#FF6B35",
        borderRadius: 3,
    },
});
