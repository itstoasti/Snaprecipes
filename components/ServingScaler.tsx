import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

interface ServingScalerProps {
    originalServings: number;
    currentMultiplier: number;
    onMultiplierChange: (multiplier: number) => void;
}

const MULTIPLIERS = [0.5, 1, 2, 4];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function MultiplierButton({
    value,
    isActive,
    onPress,
}: {
    value: number;
    isActive: boolean;
    onPress: () => void;
}) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <AnimatedPressable
            style={animatedStyle}
            onPressIn={() => { scale.value = withSpring(0.9); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            onPress={onPress}
            className={`px-5 py-2.5 rounded-xl mr-2 ${isActive ? "bg-accent" : "bg-surface-700"
                }`}
        >
            <Text
                className={`font-sans-bold text-sm ${isActive ? "text-white" : "text-surface-300"
                    }`}
            >
                {value}x
            </Text>
        </AnimatedPressable>
    );
}

export default function ServingScaler({
    originalServings,
    currentMultiplier,
    onMultiplierChange,
}: ServingScalerProps) {
    const scaledServings = Math.round(originalServings * currentMultiplier);

    return (
        <View className="bg-surface-800/60 rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
                <Text className="text-surface-400 font-sans text-xs uppercase tracking-wider">
                    Servings
                </Text>
                <Text className="text-white font-sans-bold text-lg">
                    {scaledServings}
                </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {MULTIPLIERS.map((m) => (
                    <MultiplierButton
                        key={m}
                        value={m}
                        isActive={currentMultiplier === m}
                        onPress={() => onMultiplierChange(m)}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

/**
 * Scale ingredient quantity by a multiplier.
 * Handles fractions like "1/2", "1 1/2", decimals, and plain integers.
 */
export function scaleQuantity(
    quantity: string | null,
    multiplier: number
): string {
    if (!quantity || multiplier === 1) return quantity || "";

    // Try to parse mixed numbers like "1 1/2"
    const mixedMatch = quantity.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
        const whole = parseInt(mixedMatch[1]);
        const num = parseInt(mixedMatch[2]);
        const den = parseInt(mixedMatch[3]);
        const value = (whole + num / den) * multiplier;
        return formatNumber(value);
    }

    // Try simple fraction "1/2"
    const fractionMatch = quantity.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
        const num = parseInt(fractionMatch[1]);
        const den = parseInt(fractionMatch[2]);
        const value = (num / den) * multiplier;
        return formatNumber(value);
    }

    // Try number
    const num = parseFloat(quantity);
    if (!isNaN(num)) {
        const value = num * multiplier;
        return formatNumber(value);
    }

    return quantity;
}

function formatNumber(value: number): string {
    // Check for common fractions
    const fractions: Record<string, string> = {
        "0.25": "¼",
        "0.33": "⅓",
        "0.5": "½",
        "0.67": "⅔",
        "0.75": "¾",
    };

    const whole = Math.floor(value);
    const decimal = value - whole;
    const decimalStr = decimal.toFixed(2);

    if (decimal === 0) return whole.toString();

    const fraction = fractions[decimalStr];
    if (fraction) {
        return whole > 0 ? `${whole} ${fraction}` : fraction;
    }

    // Fall back to decimal
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
}
