import type { ExtractedRecipe } from "@/db/schema";

const UNICODE_FRACTIONS = "\u00BC-\u00BE\u2150-\u218E";

const UNITS = [
    "tablespoons", "tablespoon", "teaspoons", "teaspoon", "cups", "cup",
    "ounces", "ounce", "pounds", "pound", "grams", "gram", "kilograms", "kilogram",
    "milliliters", "milliliter", "liters", "liter", "cloves", "clove",
    "cans", "can", "packages", "package", "sticks", "stick", "bunches", "bunch",
    "heads", "head", "sprigs", "sprig", "stalks", "stalk", "bulbs", "bulb",
    "ears", "ear", "slices", "slice", "pieces", "piece", "pinches", "pinch",
    "dashes", "dash", "handfuls", "handful", "wedges", "wedge", "cloves",
    "tbsp", "tbs", "tsp", "oz", "lbs", "lb", "kg", "ml", "g", "l", "pkg",
    "large", "medium", "small", "whole",
];

const UNIT_PATTERN = new RegExp(
    `^(${UNITS.join("|")})\\.?(?:\\s+of)?\\b`,
    "i"
);

const QUANTITY_PATTERN = new RegExp(
    `^(\\d+\\s+\\d+\\/\\d+` +            // mixed fraction: 1 1/2
    `|\\d+\\/\\d+` +                      // plain fraction: 1/2
    `|\\d+(?:[.,]\\d+)?(?:\\s*[-\u2013\u2014]\\s*\\d+(?:[.,]\\d+)?)?(?:\\s+to\\s+\\d+(?:[.,]\\d+)?)?` + // 2, 1.5, 1-2, 1 to 2
    `|\\d+\\s*[${UNICODE_FRACTIONS}]` +   // 1 ½
    `|[${UNICODE_FRACTIONS}](?:\\s*[-\u2013\u2014]\\s*(?:\\d+(?:[.,]\\d+)?|[${UNICODE_FRACTIONS}]))?)` // ½, ½-1
);

export function parseIsoDuration(value: any): string | undefined {
    if (value == null) return undefined;
    if (typeof value === "number") return `${value} min`;
    if (typeof value !== "string") return undefined;
    const v = value.trim();
    if (!v) return undefined;

    const iso = v.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
    if (iso && (iso[1] || iso[2] || iso[3] || iso[4])) {
        const parts: string[] = [];
        const days = parseInt(iso[1] || "0");
        const hours = parseInt(iso[2] || "0");
        const mins = parseInt(iso[3] || "0");
        if (days) parts.push(`${days} day${days > 1 ? "s" : ""}`);
        if (hours) parts.push(`${hours} hr${hours > 1 ? "s" : ""}`);
        if (mins || parts.length === 0) parts.push(`${mins} min`);
        return parts.join(" ");
    }

    const simple = v.match(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?|m\b|h\b)/i);
    if (simple) {
        const n = simple[1];
        const isHour = /^h/i.test(simple[2]);
        return isHour ? `${n} hr${parseFloat(n) > 1 ? "s" : ""}` : `${n} min`;
    }

    if (v.length <= 40) return v;
    return undefined;
}

export function parseServings(value: any): number | undefined {
    if (value == null) return undefined;
    const candidate = Array.isArray(value) ? value[0] : value;
    if (typeof candidate === "number" && candidate > 0) return Math.round(candidate);
    if (typeof candidate === "string") {
        const m = candidate.match(/(\d+)/);
        if (m) {
            const n = parseInt(m[1]);
            if (n > 0 && n <= 100) return n;
        }
    }
    return undefined;
}

export function parseIngredientLine(rawText: string): { quantity?: string; unit?: string; name: string } {
    let text = rawText.trim().replace(/^[-*\u2022]\s+/, "").replace(/^\d+\.\s+/, "").trim();
    if (!text) return { name: "" };

    let quantity: string | undefined;
    const qMatch = text.match(QUANTITY_PATTERN);
    if (qMatch) {
        quantity = qMatch[1].trim();
        text = text.slice(qMatch[0].length).trim();
    }

    let unit: string | undefined;
    const uMatch = text.match(UNIT_PATTERN);
    if (uMatch) {
        unit = uMatch[1].toLowerCase().trim();
        text = text.slice(uMatch[0].length).trim();
    }

    return { quantity, unit, name: text || rawText.trim() };
}

function instructionText(item: any): string {
    if (typeof item === "string") return item.trim();
    if (item && typeof item === "object") {
        return (item.text || item.name || "").trim();
    }
    return "";
}

export function flattenInstructions(instructions: any): { text: string; stepNumber: number }[] {
    const steps: { text: string; stepNumber: number }[] = [];

    const walk = (node: any) => {
        if (node == null) return;
        if (typeof node === "string") {
            for (const line of node.split(/\n+/)) {
                const cleaned = line.trim().replace(/^\d+[.)]\s+/, "").trim();
                if (cleaned.length > 1) steps.push({ text: cleaned, stepNumber: 0 });
            }
            return;
        }
        if (Array.isArray(node)) {
            for (const item of node) walk(item);
            return;
        }
        if (typeof node === "object") {
            const type = node["@type"];
            const types = Array.isArray(type) ? type : [type];
            if (types.includes("HowToSection") || types.includes("HowToStepList") || node.itemListElement) {
                walk(node.itemListElement || node.hasPart);
                return;
            }
            const text = instructionText(node);
            if (text.length > 1) steps.push({ text, stepNumber: 0 });
            if (node.subSteps) walk(node.subSteps);
        }
    };

    walk(instructions);
    return steps.map((s, i) => ({ text: s.text, stepNumber: i + 1 }));
}

export function parseNutritionValue(value: any, isCalories = false): number | undefined {
    if (value == null) return undefined;
    if (typeof value === "number") return value;
    if (typeof value === "object") {
        // Some publishers emit structured QuantitativeValue objects
        // ({ value, unitCode }) instead of flat strings.
        return parseNutritionValue(value.value ?? value["@value"], isCalories);
    }
    if (typeof value !== "string") return undefined;
    const cleaned = value.replace(/,/g, "");
    const m = cleaned.match(/(\d+(?:\.\d+)?)/);
    if (!m) return undefined;
    let n = parseFloat(m[1]);
    if (isCalories && /kj|kilojoule/i.test(cleaned)) {
        n = Math.round(n / 4.184);
    }
    return n;
}

/**
 * Total fat is often published only as a breakdown (saturated/trans/unsaturated)
 * without a flat `fatContent` value. Fall back to summing the components.
 */
export function parseFatValue(nutrition: Record<string, any>): number | undefined {
    const flat = parseNutritionValue(nutrition.fatContent ?? nutrition.fat ?? nutrition.totalFat);
    if (flat != null) return flat;
    const parts = [
        nutrition.saturatedFatContent,
        nutrition.transFatContent,
        nutrition.unsaturatedFatContent,
    ].map((v) => parseNutritionValue(v));
    const known = parts.filter((v): v is number => v != null);
    if (known.length === 0) return undefined;
    return Number(known.reduce((a, b) => a + b, 0).toFixed(1));
}

export function extractImageUrl(image: any): string | undefined {
    if (!image) return undefined;
    if (typeof image === "string") return image;
    if (Array.isArray(image)) {
        for (const item of image) {
            const url = extractImageUrl(item);
            if (url) return url;
        }
        return undefined;
    }
    if (typeof image === "object") {
        return image.url || image.contentUrl || undefined;
    }
    return undefined;
}

const TAG_DICTIONARY: Record<string, string[]> = {
    chicken: ["chicken", "poultry"],
    turkey: ["turkey", "poultry"],
    duck: ["duck", "poultry"],
    beef: ["beef", "meat"],
    steak: ["steak", "meat"],
    pork: ["pork", "meat"],
    lamb: ["lamb", "meat"],
    veal: ["veal", "meat"],
    venison: ["venison", "meat"],
    bacon: ["bacon", "meat"],
    sausage: ["sausage", "meat"],
    salmon: ["salmon", "fish"],
    tuna: ["tuna", "fish"],
    cod: ["cod", "fish"],
    tilapia: ["tilapia", "fish"],
    halibut: ["halibut", "fish"],
    trout: ["trout", "fish"],
    snapper: ["snapper", "fish"],
    haddock: ["haddock", "fish"],
    shrimp: ["shrimp", "seafood"],
    prawn: ["prawn", "seafood"],
    prawns: ["prawn", "seafood"],
    crab: ["crab", "seafood"],
    lobster: ["lobster", "seafood"],
    scallop: ["scallop", "seafood"],
    scallops: ["scallop", "seafood"],
    mussel: ["mussel", "seafood"],
    mussels: ["mussel", "seafood"],
    clam: ["clam", "seafood"],
    clams: ["clam", "seafood"],
    oyster: ["oyster", "seafood"],
    oysters: ["oyster", "seafood"],
    tofu: ["tofu"],
    pasta: ["pasta"],
    rice: ["rice"],
    potato: ["potatoes"],
    potatoes: ["potatoes"],
};

export function deriveTags(ingredientNames: string[], keywords?: string[]): string[] {
    const tags = new Set<string>();
    if (keywords) {
        for (const k of keywords) {
            const clean = k.toLowerCase().trim();
            if (clean && clean.length <= 24) tags.add(clean);
        }
    }
    const haystack = ingredientNames.join(" ").toLowerCase();
    for (const [word, tagList] of Object.entries(TAG_DICTIONARY)) {
        if (new RegExp(`\\b${word}\\b`, "i").test(haystack)) {
            for (const t of tagList) tags.add(t);
        }
    }
    return Array.from(tags).slice(0, 15);
}

function stripHtml(value: string): string {
    return value
        .replace(/<[^>]+>/g, " ")
        .replace(/&frac12;/g, "\u00BD")
        .replace(/&frac14;/g, "\u00BC")
        .replace(/&frac34;/g, "\u00BE")
        .replace(/&#189;/g, "\u00BD")
        .replace(/&#188;/g, "\u00BC")
        .replace(/&#190;/g, "\u00BE")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function mapJsonLdToExtractedRecipe(ld: any): ExtractedRecipe | null {
    if (!ld || typeof ld !== "object") return null;

    const title = typeof ld.name === "string" ? stripHtml(ld.name) : "";
    if (!title) return null;

    const rawIngredients: any[] = Array.isArray(ld.recipeIngredient)
        ? ld.recipeIngredient
        : typeof ld.recipeIngredient === "string" && ld.recipeIngredient.trim()
            ? ld.recipeIngredient.split(/\n+/)
            : [];
    const ingredients = rawIngredients
        .map((line) => {
            const text = typeof line === "string" ? stripHtml(line) : "";
            if (!text) return null;
            const parsed = parseIngredientLine(text);
            if (!parsed.name) return null;
            return {
                text,
                quantity: parsed.quantity,
                unit: parsed.unit,
                name: parsed.name,
                section: undefined as string | undefined,
            };
        })
        .filter((i): i is NonNullable<typeof i> => i !== null);

    const steps = flattenInstructions(ld.recipeInstructions);

    if (ingredients.length === 0 || steps.length === 0) return null;

    const nutrition = ld.nutrition && typeof ld.nutrition === "object" ? ld.nutrition : {};
    const description = typeof ld.description === "string" ? stripHtml(ld.description).substring(0, 500) : undefined;

    const keywords = Array.isArray(ld.keywords)
        ? ld.keywords.filter((k: any) => typeof k === "string")
        : typeof ld.keywords === "string"
            ? ld.keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
            : undefined;

    return {
        title,
        description: description || undefined,
        imageUrl: extractImageUrl(ld.image),
        servings: parseServings(ld.recipeYield),
        prepTime: parseIsoDuration(ld.prepTime),
        cookTime: parseIsoDuration(ld.cookTime),
        ingredients,
        steps,
        tags: deriveTags(ingredients.map((i) => i.name), keywords),
        calories: parseNutritionValue(nutrition.calories ?? nutrition.energy, true),
        protein: parseNutritionValue(nutrition.proteinContent ?? nutrition.protein),
        fat: parseFatValue(nutrition),
        carbs: parseNutritionValue(nutrition.carbohydrateContent ?? nutrition.carbohydrate ?? nutrition.carbs ?? nutrition.totalCarbohydrate),
        sugar: parseNutritionValue(nutrition.sugarContent ?? nutrition.sugar),
        fiber: parseNutritionValue(nutrition.fiberContent ?? nutrition.fiber),
        sodium: parseNutritionValue(nutrition.sodiumContent ?? nutrition.sodium),
    };
}

export interface IngredientsWindow {
    text: string;
    lines: string[];
    headings: string[];
    lineSections: (string | null)[];
}

const END_WORDS = "(instructions|directions|method|steps|preparation|procedure|how to make|nutrition|notes)";
const END_MARKER = new RegExp(`^#{1,6}\\s*${END_WORDS}\\b`, "i");
const END_MARKER_BOLD = new RegExp(`^\\*{1,2}${END_WORDS}\\b`, "i");
const END_MARKER_PLAIN = new RegExp(`^${END_WORDS}\\s*:?\\s*$`, "i");
const INGREDIENTS_MARKER = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2})?\s*ingredients\s*(?:\*{1,2})?\s*:?\s*(?:\n|$)/i;
const HEADING_MD = /^#{2,6}\s+(.+?)\s*:?\s*$/;
const HEADING_BOLD = /^\*{1,2}([^*\n]{3,60})\*{1,2}\s*:?\s*$/;
const HEADING_COLON = /^([A-Z][^:\n]{2,60}):$/;
const HEADING_PLAIN = /^[A-Z][A-Za-z0-9 '&,-]{2,50}$/;

export function cleanSectionName(raw: string): string {
    return raw
        .replace(/^#{1,6}\s*/, "")
        .replace(/\*{1,2}/g, "")
        .replace(/:$/, "")
        .replace(/^for the\s+/i, "")
        .replace(/^for\s+/i, "")
        .trim();
}

function isListLine(line: string): boolean {
    const t = line.trim();
    return /^[-*\u2022]\s+/.test(t) || /^\d+[.)]\s+/.test(t);
}

/** Returns a heading candidate name, or null if the line is not heading-like. */
function candidateHeading(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 60) return null;
    if (isListLine(trimmed)) return null;
    if (QUANTITY_PATTERN.test(trimmed)) return null;
    if (END_MARKER_PLAIN.test(trimmed)) return null;
    const md = trimmed.match(HEADING_MD);
    if (md) return cleanSectionName(md[1]);
    const bold = trimmed.match(HEADING_BOLD);
    if (bold) return cleanSectionName(bold[1]);
    const colon = trimmed.match(HEADING_COLON);
    if (colon) return cleanSectionName(colon[1]);
    const plain = trimmed.match(HEADING_PLAIN);
    if (plain) return cleanSectionName(trimmed);
    return null;
}

/** A heading only counts when a list item follows within the next two lines. */
function followedByList(lines: string[], idx: number): boolean {
    for (let i = idx + 1; i <= Math.min(idx + 2, lines.length - 1); i++) {
        if (isListLine(lines[i])) return true;
        if (lines[i].trim().length > 0 && !isListLine(lines[i]) && i > idx + 1) break;
    }
    return false;
}

export function findIngredientsWindow(text: string): IngredientsWindow | null {
    if (!text) return null;
    const marker = text.match(INGREDIENTS_MARKER);
    const searchFrom = marker ? (marker.index || 0) + marker[0].length : 0;

    const sourceLines = text.slice(searchFrom).split("\n");
    const lines: string[] = [];
    let foundListLine = false;

    for (const line of sourceLines) {
        const trimmed = line.trim();
        if (END_MARKER.test(trimmed) || END_MARKER_BOLD.test(trimmed) || END_MARKER_PLAIN.test(trimmed)) break;
        if (isListLine(trimmed)) foundListLine = true;
        lines.push(line);
        if (lines.length > 300) break;
    }

    if (!foundListLine && !marker) return null;

    const headings: string[] = [];
    const headingAtLine: (string | null)[] = lines.map(() => null);
    for (let i = 0; i < lines.length; i++) {
        const name = candidateHeading(lines[i]);
        if (name && followedByList(lines, i)) {
            headings.push(name);
            headingAtLine[i] = name;
        }
    }

    const lineSections: (string | null)[] = [];
    let currentSection: string | null = null;
    for (let i = 0; i < lines.length; i++) {
        if (headingAtLine[i]) currentSection = headingAtLine[i];
        lineSections.push(currentSection);
    }

    return { text: lines.join("\n").substring(0, 8000), lines, headings, lineSections };
}

function normalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function groupIngredientsFromWindow(
    ingredients: ExtractedRecipe["ingredients"],
    window: IngredientsWindow
): { ingredients: ExtractedRecipe["ingredients"]; matched: number; sections: number } {
    const lines = window.lines;

    let matched = 0;
    const result = ingredients.map((ing) => {
        const ingNorm = normalize(ing.text || ing.name);
        const keyNorm = normalize(ing.name);
        const keyWords = keyNorm.split(" ");
        const headWords = keyWords.length >= 3 ? keyWords.slice(0, 2).join(" ") : "";
        let bestIdx = -1;
        let bestScore = 0;
        for (let i = 0; i < lines.length; i++) {
            const lineNorm = normalize(lines[i]);
            if (!lineNorm || lineNorm.length < 3) continue;
            let score = 0;
            if (keyNorm.length >= 3 && lineNorm.includes(keyNorm)) score = keyNorm.length;
            if (ingNorm.length >= 6 && lineNorm.includes(ingNorm)) score = Math.max(score, ingNorm.length);
            if (score === 0 && headWords.length >= 6 && lineNorm.includes(headWords)) score = headWords.length;
            if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }
        if (bestIdx !== -1 && window.lineSections[bestIdx]) {
            matched++;
            return { ...ing, section: window.lineSections[bestIdx]! };
        }
        return ing;
    });

    const sections = new Set(result.map((i) => i.section).filter(Boolean)).size;
    return { ingredients: result, matched, sections };
}
