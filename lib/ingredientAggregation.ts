import type { Ingredient, ShoppingItem } from "@/db/schema";

/**
 * Normalizes an ingredient name for better matching.
 * E.g., "Green Peppers" -> "green pepper", "Large Onions, chopped" -> "onion"
 */
export function normalizeIngredientName(name: string): string {
    // 1. Remove everything after a comma or inside parentheses
    let normalized = name.split(',')[0].split('(')[0].toLowerCase();

    // 2. Define strippable terms (prep methods and adjectives)
    const strippable = [
        "chopped", "minced", "diced", "sliced", "shredded", "grated", "crushed", 
        "melted", "strips", "cubes", "thinly", "finely", "boneless", "skinless", 
        "organic", "large", "medium", "small", "fresh", "frozen", "sprigs", "cloves"
    ];

    // 3. Remove strippable terms
    const strippableRegex = new RegExp(`\\b(${strippable.join('|')})\\b`, 'g');
    normalized = normalized.replace(strippableRegex, '');

    // 4. Basic plural removal (more cautious: only 's' at the end of words > 4 chars)
    normalized = normalized.replace(/([a-z]{4,})s\b/g, "$1");

    return normalized.trim().replace(/\s+/g, " ");
}

/**
 * Attempts to parse a quantity string into a number.
 * E.g., "1 1/2" -> 1.5, "0.5" -> 0.5
 */
function parseQuantity(q: string | null): number {
    if (!q) return 0;
    
    // Handle fractions like 1 1/2
    if (q.includes(" ")) {
        const parts = q.split(" ");
        return parts.reduce((acc, p) => acc + parseQuantity(p), 0);
    }
    
    if (q.includes("/")) {
        const [num, den] = q.split("/").map(Number);
        return num / den;
    }
    
    return parseFloat(q) || 0;
}

/**
 * Formats a number back into a readable quantity string.
 */
function formatQuantity(n: number): string {
    if (n === 0) return "";
    if (Number.isInteger(n)) return n.toString();
    
    // Simple fraction check for common ones
    const decimal = n % 1;
    const whole = Math.floor(n);
    let fraction = "";
    
    if (Math.abs(decimal - 0.5) < 0.01) fraction = "1/2";
    else if (Math.abs(decimal - 0.25) < 0.01) fraction = "1/4";
    else if (Math.abs(decimal - 0.75) < 0.01) fraction = "3/4";
    else if (Math.abs(decimal - 0.33) < 0.02) fraction = "1/3";
    else if (Math.abs(decimal - 0.66) < 0.02) fraction = "2/3";
    
    if (fraction) {
        return whole > 0 ? `${whole} ${fraction}` : fraction;
    }
    
    return n.toFixed(2).replace(/\.?0+$/, "");
}

interface AggregatedIngredient {
    name: string;
    quantity: number;
    unit: string | null;
    originalNames: Set<string>;
    sourceRecipeIds: Set<number>;
}

export function aggregateIngredients(
    ingredientsWithRecipe: { ingredient: Ingredient; mealPlanServings: number; recipeServings: number }[]
): Partial<ShoppingItem>[] {
    const registry: Record<string, AggregatedIngredient> = {};

    for (const { ingredient, mealPlanServings, recipeServings } of ingredientsWithRecipe) {
        const normalized = normalizeIngredientName(ingredient.name);
        const scaleFactor = mealPlanServings / (recipeServings || 4);
        const qty = parseQuantity(ingredient.quantity) * scaleFactor;
        const unit = ingredient.unit?.toLowerCase() || null;
        
        // Key is normalized name + unit to prevent mixing "cups" and "grams"
        const key = `${normalized}_${unit || "none"}`;

        if (!registry[key]) {
            registry[key] = {
                name: ingredient.name, // Keep one of the original names
                quantity: 0,
                unit: unit,
                originalNames: new Set([ingredient.name]),
                sourceRecipeIds: new Set([ingredient.recipe_id]),
            };
        }

        registry[key].quantity += qty;
        registry[key].originalNames.add(ingredient.name);
        registry[key].sourceRecipeIds.add(ingredient.recipe_id);
    }

    return Object.values(registry).map(agg => ({
        name: Array.from(agg.originalNames).sort((a, b) => a.length - b.length)[0], // Use shortest name
        quantity: agg.quantity > 0 ? formatQuantity(agg.quantity) : null,
        unit: agg.unit,
        is_checked: false,
        category: "General", // Placeholder for categorization logic
        source_recipe_id: agg.sourceRecipeIds.size === 1 ? Array.from(agg.sourceRecipeIds)[0] : null,
    }));
}
