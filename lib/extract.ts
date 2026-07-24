import { supabase } from "./supabase";
import type { ExtractedRecipe } from "@/db/schema";
import * as SecureStore from "expo-secure-store";
import { getLinkPreview } from "link-preview-js";
import { AI_PROVIDER_STORE } from "./constants";

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
        section?: string; // e.g. "Chicken", "Sauce", "Dressing" or null
    }[];
    steps: {
        text: string; // full step instruction
        stepNumber: number;
    }[];
    tags?: string[]; // e.g. 'vegetarian', 'dessert', 'quick'
    calories?: number; // per serving, e.g. 350
    protein?: number; // grams per serving
    fat?: number; // grams per serving
    carbs?: number; // grams per serving
    sugar?: number; // grams per serving
    fiber?: number; // grams per serving
    sodium?: number; // milligrams per serving
}

Here are the rules you MUST follow:
- If any field is unknown, use null for strings and reasonable defaults for numbers.
- Ensure ingredients have properly parsed quantities.
- Output raw JSON without markdown formatting blocks.
- For 'imageUrl', critically analyze all image URLs in the content. Select the URL that MOST clearly shows the finished food dish or recipe result. DO NOT select profile pictures, logos, avatars, or images of people. If no food image is found, return null.
- If an 'IMPORTANT' note about an 'imageUrl' is provided, you MUST use that URL if you cannot find a better food image in the content.
- NEVER truncate or abbreviate. You MUST include EVERY SINGLE step and ingredient. If there are 10 steps, output all 10. If there are 30 ingredients, output all 30. Do not stop early.
- For social media content (TikTok, Instagram), infer and reconstruct the full recipe from the caption/description. Captions often describe the full recipe in a narrative format — parse it into structured ingredients and steps.
- INGREDIENT SECTIONS: If ingredients are grouped under headings or sub-headings in the "Rendered webpage content" (e.g. "#### Chicken:", "### Sauce:", "## Dressing:"), you MUST set the "section" field to that heading name. Clean the heading name (remove "#", colons, and "For the" prefix — e.g. "#### Sauce:" becomes "Sauce"). If an ingredient is NOT under a specific sub-heading, set "section" to null. CRITICAL: The appended JSON-LD structured data is flat and loses these groupings — you MUST rely on the markdown headers in the "Rendered webpage content" to determine the sections!
- NUTRITION: If the recipe page includes nutritional information (calories, protein, fat, carbs, sugar, fiber, sodium), extract the per-serving values as numbers. If nutrition info is not available, set all nutrition fields to null.

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
        if (__DEV__) console.log(`[Smart Truncation] Found recipe section at char ${earliestRecipeStart}, extracting from ${windowStart}`);
        return content.substring(windowStart, windowStart + maxChars);
    }

    // No markers found — fall back to first maxChars
    if (__DEV__) console.log("[Smart Truncation] No recipe markers found, using first " + maxChars + " chars");
    return content.substring(0, maxChars);
}

/**
 * Extract a recipe from a URL using Gemini or OpenAI
 */
export async function extractFromUrl(url: string, reCacheOnly = false): Promise<ExtractedRecipe[]> {
    let markdownContent = "";
    let ogImage = "";
    let socialCaption = "";
    let scrapeFailed = true; // Track if actual page content was scraped
    let slideshowImages: string[] = []; // TikTok/IG slideshow image URLs
    let tiktokVideoUrl: string | undefined = undefined;

    // Step 1: Handle TikTok URLs specifically since they aggressively block Jina and OpenGraph scrapers
    const isTikTok = url.includes("tiktok.com");
    const isInstagram = url.includes("instagram.com");
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
                // Detect TikTok slideshow (photo carousel) — TikWM returns images[] array
                if (tikwmData.data.images && Array.isArray(tikwmData.data.images) && tikwmData.data.images.length > 0) {
                    slideshowImages = tikwmData.data.images;
                    if (__DEV__) console.log(`[Slideshow] TikTok slideshow detected with ${slideshowImages.length} slides`);
                    // Use the first slide as the recipe thumbnail
                    ogImage = tikwmData.data.images[0];
                } else if (tikwmData.data.play) {
                    tiktokVideoUrl = tikwmData.data.play;
                }
            }
        } catch (e) {
            if (__DEV__) console.log("Failed to fetch TikTok data via TikWM", e);
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
            if (__DEV__) console.log("Failed to fetch OG fallback data", e);
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

    // Step 4: Always try to extract JSON-LD structured data (contains nutrition info that Jina misses)
    let jsonLdContent = "";
    if (!isTikTok) {
        try {
            const jsonLdData = await directFetchFallback(url);
            if (jsonLdData && jsonLdData.includes("Structured Recipe Data")) {
                jsonLdContent = jsonLdData;
                if (__DEV__) console.log("[JSON-LD] Found structured recipe data with potential nutrition info");
            }
        } catch (e) {
            if (__DEV__) console.log("JSON-LD extraction failed (non-blocking):", e);
        }
    }

    // Smart truncation: find the recipe-relevant section instead of blindly taking the first 15K chars
    // Recipe sites like AllRecipes have 30K+ chars of navigation/ads BEFORE the actual recipe
    let contentForAI = `Target URL: ${url}\n\n`;
    if (markdownContent) {
        contentForAI += `Rendered webpage content:\n\n${extractRecipeSection(markdownContent)}`;
    } else {
        contentForAI += `(Webpage content could not be directly extracted due to bot protections. Rely on the social metadata below if available.)`;
    }

    // Append JSON-LD structured data — this often contains nutrition info not in the rendered text
    if (jsonLdContent) {
        // If Jina scrape succeeded, we have the full text with section headers.
        // We MUST strip the flat ingredient/instruction arrays from JSON-LD so the AI doesn't
        // lazily copy them and lose the section groupings.
        if (markdownContent && !scrapeFailed) {
            try {
                // Use regex to strip any prefix, making it more robust against prefix variations
                const jsonStr = jsonLdContent.replace(/^--- Structured Recipe Data .* ---\n/i, "");
                const parsedLd = JSON.parse(jsonStr);
                delete parsedLd.recipeIngredient;
                delete parsedLd.recipeInstructions;
                jsonLdContent = `--- Structured Recipe Data (JSON-LD) ---\n${JSON.stringify(parsedLd, null, 2)}`;
            } catch (e) {
                if (__DEV__) console.log("Failed to strip JSON-LD ingredient list", e);
            }
        }
        contentForAI += `\n\n${jsonLdContent}`;
    }

    if (socialCaption) {
        contentForAI += socialCaption;
    }

    if (ogImage) {
        if (__DEV__) console.log("OG Image URL captured:", ogImage);
        contentForAI += `\n\nIMPORTANT: The original webpage's designated thumbnail image is: ${ogImage}. If you cannot find a better photo of the finished dish in the text above, you MUST use this URL as the \`imageUrl\`. Note: if it is a video thumbnail with a play button, that is perfectly fine. DO NOT attempt to remove the play button or alter the URL. Use the URL exactly as provided.`;
    }

    const provider = await SecureStore.getItemAsync(AI_PROVIDER_STORE) || "gemini";

    // Use raw fetch temporarily to get the exact textual error from the Edge Function
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase environment variables are not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
    }

    // Get the user's auth token to pass to the Edge Function
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token || supabaseKey;

    const response = await fetch(`${supabaseUrl}/functions/v1/extract-recipe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'apikey': supabaseKey
        },
        body: JSON.stringify({ 
            url, 
            contentForAI, 
            scrapeFailed, 
            prompt: RECIPE_EXTRACTION_PROMPT, 
            provider, 
            geminiModel: 'gemini-2.5-flash',
            reCacheOnly,
            ogImageUrl: ogImage,
            slideshowImageUrls: slideshowImages.length > 0 ? slideshowImages : undefined,
            isInstagram: isInstagram || undefined,
            videoUrl: tiktokVideoUrl
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Detailed Edge Function Error: ${errorText} (Status: ${response.status})`);
    }

    const data = await response.json();

    // Debug: Log raw response from AI to diagnose Gemini issues
    if (__DEV__) {
        console.log("=== RAW AI RESPONSE ===");
        console.log("Provider:", provider);
        console.log("Is slideshow:", !!data.slideshow);
        if (data.slideshow) {
            console.log("Recipes found:", data.recipes?.length || 0);
        } else {
            console.log("Has imageUrl:", !!data.imageUrl);
            console.log("Has steps:", !!data.steps, "Length:", data.steps?.length || 0);
            console.log("Has ingredients:", !!data.ingredients, "Length:", data.ingredients?.length || 0);
        }
        console.log("=== END DEBUG ===");
    }

    // Handle slideshow multi-recipe response
    if (data.slideshow && data.recipes && Array.isArray(data.recipes)) {
        if (__DEV__) console.log(`[Slideshow] Received ${data.recipes.length} recipes from slideshow extraction`);
        return data.recipes.map((r: any) => validateRecipe(r));
    }

    // Single recipe flow (normal extraction)
    const recipe = validateRecipe(data);

    // Instagram/Facebook CDN URLs often fail to load in apps due to expiring signatures in query params
    // Check if the extracted image is from a problematic CDN.
    // NOTE: We do NOT include TikTok here anymore, because TikTok images *need* their query params to load correctly,
    // and the wsrv.nl proxy strips them and breaks the image entirely.
    const isProblematicCdn = recipe.imageUrl && (
        recipe.imageUrl.includes("cdninstagram.com") ||
        recipe.imageUrl.includes("fbcdn.net") ||
        recipe.imageUrl.includes("scontent")
    );

    if (isProblematicCdn && recipe.imageUrl) {
        if (__DEV__) console.log("Detected problematic CDN image URL, attempting to clean it.");
        try {
            // Option 1: Strip query parameters that cause 403 Forbidden on expiring signatures
            const urlObj = new URL(recipe.imageUrl);
            const cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
            
            // Option 2: Wrap it in a reliable image proxy that bypasses CDN hotlink protection
            // We use wsrv.nl (images.weserv.nl) which is a free caching proxy often used for mobile apps
            recipe.imageUrl = `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}`;
            if (__DEV__) console.log("Proxied Cleaned URL:", recipe.imageUrl);
        } catch (e) {
            console.warn("Failed to clean/proxy CDN URL", e);
        }
    }

    // If no image was extracted or if the AI returned a messy one, and we have a clean OG image fallback
    if ((!recipe.imageUrl || recipe.imageUrl === "") && ogImage) {
        if (__DEV__) console.log("Using OG image fallback:", ogImage);
        recipe.imageUrl = ogImage;
    } else if (ogImage && recipe.imageUrl && recipe.imageUrl.includes("cdninstagram")) {
         // Even after cleaning, IG URLs can be very stubborn over time.
         // If we successfully grabbed a generic OG image earlier, it is much safer
         // to use it as a fallback instead of a proxy-wrapped CDN image.
         if (__DEV__) console.log("Replacing stubborn IG CDN url with clean OG image fallback");
         recipe.imageUrl = ogImage;
    }

    return [recipe];
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
            section: ing.section || null,
        })),
        steps: validSteps.map((step: any, i: number) => ({
            text: step.text || step.instruction || step.description || `Step ${i + 1}`,
            stepNumber: step.stepNumber || step.number || i + 1,
        })),
        tags: Array.isArray(data.tags) ? data.tags : undefined,
        calories: typeof data.calories === 'number' ? data.calories : (parseInt(data.calories) || undefined),
        protein: typeof data.protein === 'number' ? data.protein : (parseFloat(data.protein) || undefined),
        fat: typeof data.fat === 'number' ? data.fat : (parseFloat(data.fat) || undefined),
        carbs: typeof data.carbs === 'number' ? data.carbs : (parseFloat(data.carbs) || undefined),
        sugar: typeof data.sugar === 'number' ? data.sugar : (parseFloat(data.sugar) || undefined),
        fiber: typeof data.fiber === 'number' ? data.fiber : (parseFloat(data.fiber) || undefined),
        sodium: typeof data.sodium === 'number' ? data.sodium : (parseFloat(data.sodium) || undefined),
    };
}

export function cleanUrlForDuplicateCheck(urlStr: string): string {
    try {
        const parsed = new URL(urlStr);
        const host = parsed.hostname.toLowerCase();
        
        // Handle YouTube video links uniquely
        if (host.includes("youtube.com") || host === "youtube.com") {
            const vParam = parsed.searchParams.get("v");
            if (vParam) {
                return `youtube::${vParam}`;
            }
        }
        
        // Handle youtu.be links
        if (host === "youtu.be") {
            const vParam = parsed.pathname.substring(1);
            if (vParam) {
                return `youtube::${vParam}`;
            }
        }
        
        // Handle YouTube shorts
        if (parsed.pathname.startsWith("/shorts/")) {
            const parts = parsed.pathname.split("/");
            const vParam = parts[2];
            if (vParam) {
                return `youtube::${vParam}`;
            }
        }

        // Handle YouTube embed
        if (parsed.pathname.startsWith("/embed/")) {
            const parts = parsed.pathname.split("/");
            const vParam = parts[2];
            if (vParam) {
                return `youtube::${vParam}`;
            }
        }
        
        return `${parsed.origin}${parsed.pathname}`.toLowerCase();
    } catch {
        return urlStr.toLowerCase();
    }
}

