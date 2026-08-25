import React from "react";
import { View, Platform, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/hooks/useTheme";

interface GlassContainerProps {
    children: React.ReactNode;
    intensity?: number;
    style?: StyleProp<ViewStyle>;
    className?: string;
}

/**
 * Glass container: BlurView on iOS, semi-transparent View on Android.
 * Use for chrome elements only — never for reading surfaces.
 */
export default function GlassContainer({
    children,
    intensity = 60,
    style,
    className,
}: GlassContainerProps) {
    const { isDark } = useTheme();

    if (Platform.OS === "ios") {
        return (
            <BlurView
                intensity={intensity}
                tint={isDark ? "dark" : "light"}
                style={[
                    {
                        overflow: "hidden",
                        borderWidth: 0.5,
                        borderColor: isDark
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(28, 25, 20, 0.08)",
                    },
                    style,
                ]}
                className={className}
            >
                {children}
            </BlurView>
        );
    }

    return (
        <View
            style={[
                {
                    backgroundColor: isDark
                        ? "rgba(26, 26, 38, 0.92)"
                        : "rgba(247, 244, 235, 0.92)",
                    overflow: "hidden",
                    borderWidth: 0.5,
                    borderColor: isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(28, 25, 20, 0.06)",
                },
                style,
            ]}
            className={className}
        >
            {children}
        </View>
    );
}
