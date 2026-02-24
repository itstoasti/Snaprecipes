import { supabase } from "./supabase";
import type { ExtractedRecipe } from "@/db/schema";
import * as SecureStore from "expo-secure-store";
import { getLinkPreview } from "link-preview-js";
import { AI_PROVIDER_STORE } from "@/app/(tabs)/settings";

const RECIPE_EXTRACTION_PROMPT = `You are an expert recipe extractor. Your task is to extract recipe information from the provided webpage content or social media metadata.
You MUST respond with a JSON object matching the following TypeScript interface:

interface ExtractedRecipe {
    title: string;
    description?: string;
    imageUrl?: string;
    servings?: number;
    prepTime?: string; // e.g. '15 min'
    cookTime?: string; // e.g. '30 min'
    ingredients: {
        text: string; // full ingredient line
        quantity?: string; // number as string, e.g. "1", "0.5", "1 1/2"
        unit?: string; // e.g. "cup", "tbsp", "g", "ml"
        name?: string; // e.g. "flour", "sugar"
    }[];
    steps: {
        text: string; // full step instruction
        stepNumber: number;
    }[];
    tags?: string[]; // e.g. 'vegetarian', 'dessert', 'quick'
}

Here are the rules you MUST follow:
- If any field is unknown, use null for strings and reasonable defaults for numbers.
- Ensure ingredients have properly parsed quantities.
- Output raw JSON without markdown formatting blocks.
- For 'imageUrl', critically analyze all image URLs in the content. Select the URL that MOST clearly shows the finished food dish or recipe result. DO NOT select profile pictures, logos, avatars, or images of people. If no food image is found, return null.
- If an 'IMPORTANT' note about an 'imageUrl' is provided, you MUST use that URL if you cannot find a better food image in the content.
- NEVER truncate or abbreviate. You MUST include EVERY SINGLE step and ingredient. If there are 10 steps, output all 10. If there are 30 ingredients, output all 30. Do not stop early.
- For social media content (TikTok, Instagram), infer and reconstruct the full recipe from the caption/description. Captions often describe the full recipe in a narrative format — parse it into structured ingredients and steps.

Here is the content to extract the recipe from:
`;

/**
 * Attempt a direct fetch of the URL with browser-like headers as a fallback
 * when Jina Reader is blocked (403/CAPTCHA).
 * Prioritizes JSON-LD structured recipe data if available.
 */
async function directFetchFallback(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Cache-Control": "no-cache",
            },
        });

        if (!response.ok) {
            console.warn(`Direct fetch failed with status ${response.status}`);
            return "";
        }

        const html = await response.text();

        // Quick check: if the page is a CAPTCHA/challenge, bail
        if (html.includes("Just a moment") && html.includes("challenge")) {
            console.warn("Direct fetch hit CAPTCHA, returning empty");
            return "";
        }

        // Extract JSON-LD structured recipe data if available (most recipe sites embed this)
        const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
        if (jsonLdMatches) {
            for (const match of jsonLdMatches) {
                const jsonContent = match.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
                try {
                    const parsed = JSON.parse(jsonContent);
                    const recipe = findRecipeInJsonLd(parsed);
                    if (recipe) {
                        return `--- Structured Recipe Data (JSON-LD) ---\n${JSON.stringify(recipe, null, 2)}`;
                    }
                } catch {
                    // Not valid JSON, skip
                }
            }
        }

        // Fallback: strip HTML tags and return raw text (limited)
        const textContent = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        return textContent.substring(0, 15000);
    } catch (error) {
        console.warn("Direct fetch fallback failed:", error);
        return "";
    }
}

/**
 * Search for Recipe schema in JSON-LD data (handles @graph arrays and nested structures)
 */
function findRecipeInJsonLd(data: any): any | null {
    if (!data) return null;

    if (data["@type"] === "Recipe" || (Array.isArray(data["@type"]) && data["@type"].includes("Recipe"))) {
        return data;
    }

    if (data["@graph"] && Array.isArray(data["@graph"])) {
        for (const item of data["@graph"]) {
            const found = findRecipeInJsonLd(item);
            if (found) return found;
        }
    }

    if (Array.isArray(data)) {
        for (const item of data) {
            const found = findRecipeInJsonLd(item);
            if (found) return found;
        }
    }

    return null;
}

/**
 * Intelligently extract the recipe-relevant portion from long page content.
 * Recipe sites like AllRecipes have 30K+ chars of navigation/header/ads before the actual recipe.
 * This finds recipe section markers and extracts a window around them.
 */
function extractRecipeSection(content: string, maxChars: number = 40000): string {
    if (content.length <= maxChars) return content;

    // Look for common recipe section markers (case-insensitive search)
    const markers = [
        /#+\s*Ingredients/i,
        /\bIngredients\b/i,
        /#+\s*Directions/i,
        /\bDirections\b/i,
        /#+\s*Instructions/i,
        /\bInstructions\b/i,
        /#+\s*Steps\b/i,
        /\bRecipe\s+Instructions\b/i,
        /\bHow\s+to\s+Make\b/i,
    ];

    let earliestRecipeStart = -1;
    for (const marker of markers) {
        const match = content.search(marker);
        if (match !== -1 && (earliestRecipeStart === -1 || match < earliestRecipeStart)) {
            earliestRecipeStart = match;
        }
    }

    if (earliestRecipeStart !== -1) {
        // Found recipe content! Extract a window:
        // Start 2000 chars before the marker (to get title/description/servings)
        // and take maxChars from there
        const windowStart = Math.max(0, earliestRecipeStart - 2000);
        console.log(`[Smart Truncation] Found recipe section at char ${earliestRecipeStart}, extracting from ${windowStart}`);
        return content.substring(windowStart, windowStart + maxChars);
    }

    // No markers found — fall back to first maxChars
    console.log("[Smart Truncation] No recipe markers found, using first " + maxChars + " chars");
    return content.substring(0, maxChars);
}

/**
 * Extract a recipe from a URL using Gemini or OpenAI
 */
export async function extractFromUrl(url: string): Promise<ExtractedRecipe> {
    let markdownContent = "";
    let ogImage = "";
    let socialCaption = "";
    let scrapeFailed = true; // Track if actual page content was scraped

    // Step 1: Handle TikTok URLs specifically since they aggressively block Jina and OpenGraph scrapers
    const isTikTok = url.includes("tiktok.com");
    if (isTikTok) {
        try {
            const tikwmResponse = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
                headers: { "User-Agent": "Mozilla/5.0 (compatible; SnapRecipes/1.0)" },
            });
            const tikwmData = await tikwmResponse.json();
            if (tikwmData && tikwmData.data) {
                if (tikwmData.data.title) {
                    socialCaption = `\n\n--- TikTok Video Caption ---\nCaption: ${tikwmData.data.title}`;
                }
                if (tikwmData.data.cover) {
                    ogImage = tikwmData.data.cover;
                }
            }
        } catch (e) {
            console.log("Failed to fetch TikTok data via TikWM", e);
        }
    }

    // Step 2: Attempt to grab the OpenGraph image directly as a reliable fallback thumbnail (if not TikTok)
    if (!isTikTok && !ogImage) {
        try {
            const preview: any = await getLinkPreview(url, {
                headers: { "User-Agent": "Mozilla/5.0 (compatible; SnapRecipes/1.0)" },
                timeout: 5000,
            });
            if (preview && preview.images && preview.images.length > 0) {
                ogImage = preview.images[0];
            }
            if (preview && preview.description) {
                // Social media captions are usually injected into the OG description
                socialCaption = `\n\n--- Social Media Metadata / Caption ---\nTitle: ${preview.title || "Unknown"}\nCaption: ${preview.description}`;
            }
        } catch (e) {
            console.log("Failed to fetch OG fallback data", e);
        }
    }

    // Step 3: Fetch page content via Jina Reader (for all URLs including TikTok as supplement)
    try {
        const response = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; SnapRecipes/1.0)",
                "Accept": "text/event-stream, text/plain",
            },
        });

        if (!response.ok) {
            console.warn(`Jina Reader API error: ${response.status}`);
        } else {
            markdownContent = await response.text();
            // Detect if Jina likely returned CAPTCHA — still pass content to AI but hint the server
            const looksLikeCaptcha = markdownContent.includes("Just a moment") || 
                markdownContent.includes("Verification successful") || 
                markdownContent.includes("challenge-platform") ||
                markdownContent.length < 200;
            if (!looksLikeCaptcha) {
                scrapeFailed = false; // Jina got real content
            }
            // Always keep markdownContent — pass everything to the AI
        }
    } catch (error) {
        console.warn(`Failed to fetch URL content via Jina: ${error}`);
    }

    // Smart truncation: find the recipe-relevant section instead of blindly taking the first 15K chars
    // Recipe sites like AllRecipes have 30K+ chars of navigation/ads BEFORE the actual recipe
    let contentForAI = `Target URL: ${url}\n\n`;
    if (markdownContent) {
        contentForAI += `Rendered webpage content:\n\n${extractRecipeSection(markdownContent)}`;
    } else {
        contentForAI += `(Webpage content could not be directly extracted due to bot protections. Rely on the social metadata below if available.)`;
    }

    if (socialCaption) {
        contentForAI += socialCaption;
    }

    if (ogImage) {
        console.log("OG Image URL captured:", ogImage);
        contentForAI += `\n\nIMPORTANT: The original webpage's designated thumbnail image is: ${ogImage}. If you cannot find a better photo of the finished dish in the text above, you MUST use this URL as the \`imageUrl\`. Note: if it is a video thumbnail with a play button, that is perfectly fine. DO NOT attempt to remove the play button or alter the URL. Use the URL exactly as provided.`;
    }

    const provider = await SecureStore.getItemAsync(AI_PROVIDER_STORE) || "gemini";

    // Use raw fetch temporarily to get the exact textual error from the Edge Function
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://omfmcjmebejcsityvtgx.supabase.co";
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Fo9XJu4kuLhwcR81nvuxWw_JiCXHXsJ";

    const response = await fetch(`${supabaseUrl}/functions/v1/extract-recipe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ url, contentForAI, scrapeFailed, prompt: RECIPE_EXTRACTION_PROMPT, provider, geminiModel: 'gemini-2.5-flash' })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Detailed Edge Function Error: ${errorText} (Status: ${response.status})`);
    }

    const data = await response.json();

    // Debug: Log raw response from AI to diagnose Gemini issues
    console.log("=== RAW AI RESPONSE ===");
    console.log("Provider:", provider);
    console.log("Has imageUrl:", !!data.imageUrl);
    console.log("Has steps:", !!data.steps, "Length:", data.steps?.length || 0);
    console.log("Has ingredients:", !!data.ingredients, "Length:", data.ingredients?.length || 0);
    console.log("=== END DEBUG ===");

    const recipe = validateRecipe(data);

    // Instagram/TikTok CDN URLs often fail to load in apps (require cookies/headers)
    // Check if the extracted image is from a problematic CDN
    const isProblematicCdn = recipe.imageUrl && (
        recipe.imageUrl.includes("cdninstagram.com") ||
        recipe.imageUrl.includes("fbcdn.net") ||
        recipe.imageUrl.includes("scontent") ||
        recipe.imageUrl.includes("tiktokcdn.com")
    );

    // For problematic CDN URLs, try to use a cleaner fallback
    // Note: ogImage might also be from the same CDN, but it's worth trying
    if (isProblematicCdn) {
        console.log("Detected problematic CDN image URL, this may not load in the app");
        // Keep the URL anyway - expo-image might be able to load it
        // The user will see a placeholder if it fails
    }

    // If no image was extracted, use OG image as fallback
    if (!recipe.imageUrl && ogImage) {
        console.log("Using OG image fallback:", ogImage);
        recipe.imageUrl = ogImage;
    }

    return recipe;
}

/**
 * Extract a recipe from a camera image using Gemini Vision or GPT-4o Vision
 */
export async function extractFromImage(base64Image: string): Promise<ExtractedRecipe> {
    const provider = await SecureStore.getItemAsync(AI_PROVIDER_STORE) || "gemini";

    const { data, error } = await supabase.functions.invoke("extract-recipe", {
        body: { imageBase64: base64Image, provider, geminiModel: 'gemini-2.5-flash' },
    });

    if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
    }

    return validateRecipe(data);
}

/**
 * Parse AI JSON response into ExtractedRecipe
 */
function parseAIResponse(text: string | null | undefined): ExtractedRecipe {
    if (!text) {
        throw new Error("No response from AI API");
    }

    try {
        const parsed = JSON.parse(text);
        return validateRecipe(parsed);
    } catch {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1]);
            return validateRecipe(parsed);
        }
        throw new Error("Failed to parse recipe data from AI response");
    }
}

/**
 * Ensure required fields exist with defaults
 */
function validateRecipe(data: any): ExtractedRecipe {
    const rawIngredients = data.ingredients || data.ingredient || [];
    const ingredientsArray = Array.isArray(rawIngredients) ? rawIngredients : [];

    const rawSteps = data.steps || data.instructions || data.instruction || data.method || [];
    const stepsArray = Array.isArray(rawSteps) ? rawSteps : [];

    // Filter out empty/invalid ingredients
    const validIngredients = ingredientsArray.filter((ing: any) => {
        const text = ing.text || ing.name || "";
        return text.trim().length > 0;
    });

    // Filter out empty/invalid steps
    const validSteps = stepsArray.filter((step: any) => {
        const text = step.text || step.instruction || step.description || "";
        return text.trim().length > 0;
    });

    return {
        title: data.title || "Untitled Recipe",
        description: data.description || undefined,
        imageUrl: data.imageUrl || undefined,
        servings: data.servings || 4,
        prepTime: data.prepTime || undefined,
        cookTime: data.cookTime || undefined,
        ingredients: validIngredients.map((ing: any, i: number) => ({
            text: ing.text || `${ing.quantity || ""} ${ing.unit || ""} ${ing.name || ""}`.trim(),
            quantity: ing.quantity || null,
            unit: ing.unit || null,
            name: ing.name || ing.text || `Ingredient ${i + 1}`,
        })),
        steps: validSteps.map((step: any, i: number) => ({
            text: step.text || step.instruction || step.description || `Step ${i + 1}`,
            stepNumber: step.stepNumber || step.number || i + 1,
        })),
        tags: Array.isArray(data.tags) ? data.tags : undefined,
    };
}
