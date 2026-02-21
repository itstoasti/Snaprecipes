import React, { useCallback } from "react";
import { Pressable, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withSequence,
    FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface FloatingActionButtonProps {
    onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function FloatingActionButton({ onPress }: FloatingActionButtonProps) {
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);
    const insets = useSafeAreaInsets();
    const bottomPadding = insets.bottom > 0 ? insets.bottom : (Platform.OS === "ios" ? 28 : 12);
    const tabBarHeight = 60 + bottomPadding;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
    }));

    const handlePress = useCallback(() => {
        scale.value = withSequence(
            withSpring(0.9, { damping: 16, stiffness: 100 }),
            withSpring(1, { damping: 16, stiffness: 100 })
        );
        rotation.value = withSequence(
            withSpring(45, { damping: 16, stiffness: 100 }),
            withSpring(0, { damping: 16, stiffness: 100 })
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
    }, [onPress, scale, rotation]);

    return (
        <AnimatedPressable
            entering={FadeIn.delay(300).springify()}
            style={[
                animatedStyle,
                {
                    position: "absolute",
                    bottom: tabBarHeight + 20,
                    right: 20,
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    overflow: "hidden",
                    shadowColor: "#FF6B35",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 10,
                },
            ]}
            onPress={handlePress}
        >
            {Platform.OS === "ios" ? (
                <BlurView
                    intensity={60}
                    tint="dark"
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255, 107, 53, 0.75)",
                    }}
                >
                    <Ionicons name="add" size={32} color="#FFFFFF" />
                </BlurView>
            ) : (
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#FF6B35",
                        borderRadius: 30,
                    }}
                >
                    <Ionicons name="add" size={32} color="#FFFFFF" />
                </View>
            )}
        </AnimatedPressable>
    );
}
