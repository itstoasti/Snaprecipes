/**
 * Scale ingredient quantity by a multiplier.
 * Handles fractions like "1/2", "1 1/2", decimals, and plain integers.
 */
export function scaleQuantity(
    quantity: string | null,
    multiplier: number
): string {
    if (!quantity || multiplier === 1) return quantity || "";

    // Mixed numbers like "1 1/2"
    const mixedMatch = quantity.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
        const whole = parseInt(mixedMatch[1], 10);
        const num = parseInt(mixedMatch[2], 10);
        const den = parseInt(mixedMatch[3], 10);
        const value = (whole + num / den) * multiplier;
        return formatNumber(value);
    }

    // Simple fraction "1/2"
    const fractionMatch = quantity.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
        const num = parseInt(fractionMatch[1], 10);
        const den = parseInt(fractionMatch[2], 10);
        const value = (num / den) * multiplier;
        return formatNumber(value);
    }

    // Plain number
    const num = parseFloat(quantity);
    if (!isNaN(num)) {
        const value = num * multiplier;
        return formatNumber(value);
    }

    return quantity;
}

/**
 * Scales an entire ingredient text string by scaling any leading quantity found.
 * Example: "1/2 cup olive oil" with multiplier 2 -> "1 cup olive oil"
 * Example: "1 1/2 tbsp sugar" with multiplier 2 -> "3 tbsp sugar"
 */
export function scaleIngredientText(
    text: string,
    multiplier: number
): string {
    if (!text || multiplier === 1) return text || "";

    // Regex matching leading mixed numbers, fractions, or plain integers/decimals
    return text.replace(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/, (match) => {
        return scaleQuantity(match, multiplier);
    });
}

function formatNumber(value: number): string {
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

    return value % 1 === 0 ? value.toString() : value.toFixed(1);
}
