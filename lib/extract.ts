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

Here is the content to extract the recipe from:
`;

/**
 * Extract a recipe from a URL using Gemini or OpenAI
 */
export async function extractFromUrl(url: string): Promise<ExtractedRecipe> {
    let markdownContent = "";
    let ogImage = "";
    let socialCaption = "";

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

    if (!isTikTok) {
        try {
            // Use Jina Reader API to bypass bot protections and render JS-heavy pages (like Instagram)
            const response = await fetch(`https://r.jina.ai/${url}`, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; SnapRecipes/1.0)",
                    "Accept": "text/event-stream, text/plain",
                },
            });

            if (!response.ok) {
                console.warn(`Jina Reader API error: ${response.status}. Falling back to metadata extraction.`);
            } else {
                markdownContent = await response.text();
            }
        } catch (error) {
            console.warn(`Failed to fetch URL content via Jina: ${error}. Proceeding with available metadata.`);
        }
    }

    // Limit to ~15,000 characters to ensure it fits within context limits without exploding token cost
    let contentForAI = `Target URL: ${url}\n\n`;
    if (markdownContent) {
        contentForAI += `Rendered webpage content:\n\n${markdownContent.substring(0, 15000)}`;
    } else {
        contentForAI += `(Webpage content could not be directly extracted due to bot protections. Rely on the social metadata below if available.)`;
    }

    if (socialCaption) {
        contentForAI += socialCaption;
    }

    if (ogImage) {
        contentForAI += `\n\nIMPORTANT: The original webpage's designated thumbnail image is: ${ogImage}. If you cannot find a better photo of the finished dish in the text above, you MUST use this URL as the \`imageUrl\`. Note: if it is a video thumbnail with a play button, that is perfectly fine. DO NOT attempt to remove the play button or alter the URL. Use the URL exactly as provided.`;
    }

    const provider = await SecureStore.getItemAsync(AI_PROVIDER_STORE) || "gemini";

    const { data, error } = await supabase.functions.invoke("extract-recipe", {
        body: { url, contentForAI, prompt: RECIPE_EXTRACTION_PROMPT, provider },
    });

    if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
    }

    return validateRecipe(data);
}

/**
 * Extract a recipe from a camera image using Gemini Vision or GPT-4o Vision
 */
export async function extractFromImage(base64Image: string): Promise<ExtractedRecipe> {
    const provider = await SecureStore.getItemAsync(AI_PROVIDER_STORE) || "gemini";

    const { data, error } = await supabase.functions.invoke("extract-recipe", {
        body: { imageBase64: base64Image, provider },
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
    return {
        title: data.title || "Untitled Recipe",
        description: data.description || undefined,
        imageUrl: data.imageUrl || undefined,
        servings: data.servings || 4,
        prepTime: data.prepTime || undefined,
        cookTime: data.cookTime || undefined,
        ingredients: Array.isArray(data.ingredients)
            ? data.ingredients.map((ing: any, i: number) => ({
                text: ing.text || `${ing.quantity || ""} ${ing.unit || ""} ${ing.name || ""}`.trim(),
                quantity: ing.quantity || null,
                unit: ing.unit || null,
                name: ing.name || ing.text || `Ingredient ${i + 1}`,
            }))
            : [],
        steps: Array.isArray(data.steps)
            ? data.steps.map((step: any, i: number) => ({
                text: step.text || step.instruction || `Step ${i + 1}`,
                stepNumber: step.stepNumber || i + 1,
            }))
            : [],
        tags: Array.isArray(data.tags) ? data.tags : undefined,
    };
}
