import React from "react";
import { View, Platform, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";

interface GlassContainerProps {
    children: React.ReactNode;
    intensity?: number;
    style?: StyleProp<ViewStyle>;
    className?: string;
}

/**
 * Glass container: BlurView on iOS, semi-transparent dark View on Android.
 * Use for chrome elements only — never for reading surfaces.
 */
export default function GlassContainer({
    children,
    intensity = 60,
    style,
    className,
}: GlassContainerProps) {
    if (Platform.OS === "ios") {
        return (
            <BlurView
                intensity={intensity}
                tint="dark"
                style={[
                    {
                        overflow: "hidden",
                        borderWidth: 0.5,
                        borderColor: "rgba(255, 255, 255, 0.1)",
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
                    backgroundColor: "rgba(26, 26, 38, 0.92)",
                    overflow: "hidden",
                    borderWidth: 0.5,
                    borderColor: "rgba(255, 255, 255, 0.08)",
                },
                style,
            ]}
            className={className}
        >
            {children}
        </View>
    );
}
