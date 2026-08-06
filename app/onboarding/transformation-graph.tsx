import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
    FadeIn,
    SlideInDown,
    useSharedValue,
    useAnimatedProps,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSpring,
    withRepeat,
    withSequence,
    Easing,
    interpolate,
} from "react-native-reanimated";
import Svg, { Path, Circle, Line } from "react-native-svg";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const PATH_LENGTH = 360;

export default function TransformationGraphScreen() {
    const router = useRouter();

    // Animation values
    const progress = useSharedValue(1); // 1 = hidden (dashoffset = length), 0 = full line
    const goalPop = useSharedValue(0);
    const dashedLineProgress = useSharedValue(0);
    const pulseAnim = useSharedValue(0);

    useEffect(() => {
        // 1. Line draws smoothly over 1.6s
        progress.value = withDelay(
            300,
            withTiming(0, { duration: 1600, easing: Easing.out(Easing.quad) })
        );

        // 2. Vertical dashed guide line drops down as the curve nears the end
        dashedLineProgress.value = withDelay(
            1400,
            withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
        );

        // 3. Goal badge & dot pop in
        goalPop.value = withDelay(
            1500,
            withSpring(1, { damping: 12, stiffness: 120 })
        );

        // 4. Continuous pulsing ring around the goal dot starting at 1.8s
        pulseAnim.value = withDelay(
            1800,
            withRepeat(
                withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
                -1,
                false
            )
        );
    }, []);

    const animatedPathProps = useAnimatedProps(() => ({
        strokeDashoffset: progress.value * PATH_LENGTH,
    }));

    const animatedDashedLineProps = useAnimatedProps(() => ({
        strokeDashoffset: (1 - dashedLineProgress.value) * 140,
    }));

    // SVG Pulsing Circle Props — perfectly locked at cx=230, cy=36
    const pulseCircleProps = useAnimatedProps(() => {
        const r = interpolate(pulseAnim.value, [0, 1], [6, 24]);
        const strokeOpacity = interpolate(pulseAnim.value, [0, 0.3, 1], [0.9, 0.6, 0]);
        return {
            r,
            strokeOpacity,
        };
    });

    const goalBadgeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: goalPop.value }],
        opacity: goalPop.value,
    }));

    const handleContinue = () => {
        router.push("/onboarding/paywall-sequence");
    };

    return (
        <View style={s.root}>
            <OnboardingHeader progress={0.94} />

            <View style={s.body}>
                {/* Title Section */}
                <Animated.View entering={FadeIn.duration(600)} style={s.titleWrap}>
                    <Text style={s.title}>
                        Become a better cook, with SnapRecipes
                    </Text>
                </Animated.View>

                {/* Graph Stage — Pure Cream Background */}
                <View style={s.graphStage}>
                    <View style={s.graphContainer}>
                        {/* Horizontal Grid Lines */}
                        <View style={s.gridLines}>
                            <View style={s.gridLine} />
                            <View style={s.gridLine} />
                            <View style={s.gridLine} />
                            <View style={s.gridLine} />
                            <View style={s.gridLine} />
                        </View>

                        {/* "Scattered recipes" Badge at Start Point */}
                        <Animated.View entering={FadeIn.delay(300).duration(400)} style={s.startBadge}>
                            <Text style={s.startBadgeText}>Scattered recipes</Text>
                        </Animated.View>

                        {/* "Organized recipes" Goal Badge at End Point */}
                        <Animated.View style={[s.goalBadge, goalBadgeStyle]}>
                            <Text style={s.goalBadgeText}>Organized recipes</Text>
                        </Animated.View>

                        {/* Animated SVG Graph — Single Coordinate System */}
                        <Svg height="200" width={SCREEN_WIDTH - 64} viewBox="0 0 280 200" style={s.svgLayer}>
                            {/* Vertical Dashed Line from Goal Dot to Axis */}
                            <AnimatedLine
                                x1="230"
                                y1="36"
                                x2="230"
                                y2="170"
                                stroke="#93C5FD"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                                animatedProps={animatedDashedLineProps}
                            />

                            {/* Exponential Growth Curve Line */}
                            <AnimatedPath
                                d="M 30 145 C 90 142, 170 135, 230 36"
                                fill="none"
                                stroke="#FF6B35"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={PATH_LENGTH}
                                animatedProps={animatedPathProps}
                            />

                            {/* "Now" Dot (Orange) */}
                            <Circle cx="30" cy="145" r="5" fill="#FF6B35" />

                            {/* Pulsing Outer Ring (SVG AnimatedCircle — 100% Centered at cx=230, cy=36) */}
                            <AnimatedCircle
                                cx="230"
                                cy="36"
                                fill="none"
                                stroke="#3B82F6"
                                strokeWidth="2.5"
                                animatedProps={pulseCircleProps}
                            />

                            {/* "Your Goal" Solid Center Dot (Blue) */}
                            <Circle cx="230" cy="36" r="6" fill="#3B82F6" />
                        </Svg>

                        {/* X-Axis Labels */}
                        <View style={s.axisLabels}>
                            <Text style={s.axisNow}>Now</Text>
                            <Text style={s.axisGoal}>Your goal</Text>
                        </View>
                    </View>
                </View>

                {/* Subtext & Bottom CTA */}
                <Animated.View entering={SlideInDown.delay(300).duration(600)} style={s.bottomSection}>
                    <Text style={s.subtext}>
                        You're on your way! Watch as your cooking habits evolve and your kitchen experience gets easier.
                    </Text>

                    <Pressable onPress={handleContinue} style={s.button}>
                        <Text style={s.buttonText}>Continue</Text>
                    </Pressable>
                </Animated.View>
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
        paddingBottom: 24,
        justifyContent: "space-between",
    },
    titleWrap: {
        alignItems: "center",
        marginTop: 8,
    },
    title: {
        color: "#1F2937",
        fontFamily: "Inter_700Bold",
        fontSize: 28,
        textAlign: "center",
        lineHeight: 36,
    },
    graphStage: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 12,
    },
    graphContainer: {
        width: "100%",
        height: 250,
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
    },
    gridLines: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "space-between",
        paddingVertical: 18,
    },
    gridLine: {
        width: "100%",
        height: 1,
        backgroundColor: "#E5E7EB",
        opacity: 0.6,
    },
    svgLayer: {
        position: "relative",
        zIndex: 10,
    },
    startBadge: {
        position: "absolute",
        left: 0,
        top: 106,
        backgroundColor: "#FFEDD5",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FED7AA",
        zIndex: 20,
    },
    startBadgeText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 12,
        color: "#C2410C",
    },
    goalBadge: {
        position: "absolute",
        right: 0,
        top: 8,
        backgroundColor: "#3B82F6",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        zIndex: 20,
    },
    goalBadgeText: {
        fontFamily: "Inter_700Bold",
        fontSize: 12,
        color: "#FFFFFF",
    },
    axisLabels: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 12,
    },
    axisNow: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 12,
        color: "#F97316",
    },
    axisGoal: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 12,
        color: "#3B82F6",
    },
    bottomSection: {
        gap: 16,
        alignItems: "center",
    },
    subtext: {
        color: "#4B5563",
        fontFamily: "Inter_400Regular",
        fontSize: 15,
        textAlign: "center",
        lineHeight: 22,
        paddingHorizontal: 8,
    },
    button: {
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
    buttonText: {
        color: "#FFFFFF",
        fontFamily: "Inter_700Bold",
        fontSize: 18,
    },
});
