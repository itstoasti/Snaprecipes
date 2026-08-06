import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";

interface MacroRingProps {
    label: string;
    current: number;
    goal: number;
    color: string;
    size?: number;
    strokeWidth?: number;
    unit?: string;
    /** If true, renders a large hero-size ring */
    hero?: boolean;
}

export default function MacroRing({
    label,
    current,
    goal,
    color,
    size = 80,
    strokeWidth = 6,
    unit = "g",
    hero = false,
}: MacroRingProps) {
    const { colors, isDark } = useTheme();
    const effectiveSize = hero ? 160 : size;
    const effectiveStroke = hero ? 10 : strokeWidth;

    const radius = (effectiveSize - effectiveStroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(current / Math.max(goal, 1), 1);
    const strokeDashoffset = circumference * (1 - progress);
    const isOver = current > goal;

    return (
        <Animated.View entering={FadeIn} style={{ alignItems: "center" }}>
            <View style={{ width: effectiveSize, height: effectiveSize }}>
                <Svg width={effectiveSize} height={effectiveSize}>
                    {/* Background track */}
                    <Circle
                        cx={effectiveSize / 2}
                        cy={effectiveSize / 2}
                        r={radius}
                        stroke={colors.hairline}
                        strokeWidth={effectiveStroke}
                        fill="none"
                    />
                    {/* Progress arc */}
                    <Circle
                        cx={effectiveSize / 2}
                        cy={effectiveSize / 2}
                        r={radius}
                        stroke={isOver ? "#EF4444" : color}
                        strokeWidth={effectiveStroke}
                        strokeLinecap="round"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={strokeDashoffset}
                        fill="none"
                        rotation="-90"
                        origin={`${effectiveSize / 2}, ${effectiveSize / 2}`}
                    />
                </Svg>
                {/* Center text */}
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text
                        style={{
                            color: colors.text,
                            fontFamily: "Inter_700Bold",
                            fontSize: hero ? 28 : 14,
                        }}
                    >
                        {Math.round(current)}
                    </Text>
                    {hero && (
                        <Text
                            style={{
                                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(28,25,20,0.5)",
                                fontFamily: "Inter_400Regular",
                                fontSize: 11,
                                marginTop: 2,
                            }}
                        >
                            / {goal} {unit}
                        </Text>
                    )}
                </View>
            </View>
            <Text
                style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(28,25,20,0.6)",
                    fontFamily: "Inter_500Medium",
                    fontSize: hero ? 13 : 11,
                    marginTop: hero ? 8 : 4,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                }}
            >
                {label}
            </Text>
            {!hero && (
                <Text
                    style={{
                        color: isDark ? "rgba(255,255,255,0.35)" : "rgba(28,25,20,0.35)",
                        fontFamily: "Inter_400Regular",
                        fontSize: 10,
                        marginTop: 1,
                    }}
                >
                    / {goal}{unit}
                </Text>
            )}
        </Animated.View>
    );
}
