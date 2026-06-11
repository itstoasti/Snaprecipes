import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonrepair } from "https://esm.sh/jsonrepair";

const DEFAULT_GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const DEFAULT_OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") || "";

const RECIPE_PROMPT = `You are a world-class recipe extraction expert. Critically analyze the provided content and meticulously extract every piece of recipe information.
Return exactly ONE valid JSON object matching this schema structure. Do not omit any keys.
{
  "title": "recipe name",
  "description": "brief description or null",
  "imageUrl": "valid url or null",
  "servings": 4,
  "prepTime": "15 min",
  "cookTime": "30 min",
  "ingredients": [
    // Extract ALL available ingredients as objects in this array
    { "text": "full ingredient line", "quantity": "string", "unit": "string", "name": "string", "section": "string or null" }
  ],
  "steps": [
    // Extract ALL available step-by-step instructions as objects in this array
    { "text": "full step instruction", "stepNumber": 1 }
  ],
  "tags": ["tag1", "tag2"],
  "calories": 450, // per serving; ESTIMATE if missing from text
  "protein": 25,  // in grams; ESTIMATE if missing from text
  "fat": 15,      // in grams; ESTIMATE if missing from text
  "carbs": 50      // in grams; ESTIMATE if missing from text
}

CRITICAL RULES:
1. You MUST include EVERY key from the schema above. NEVER omit 'ingredients' or 'steps'.
2. If an array is missing from the text (e.g. no step-by-step instructions exist), you MUST output an empty array: "steps": [].
3. If an ingredient list is present but instructions are missing, you MUST STILL extract the ENTIRE ingredients list!
4. Output raw JSON ONLY. No markdown blocks.
5. NEVER truncate or abbreviate. Include EVERY SINGLE step and ingredient. If there are 10 steps, output all 10. If there are 30 ingredients, output all 30.
6. For social media content (TikTok, Instagram), infer the recipe from the caption/description. The caption often describes the full recipe even without a structured format.
7. For imageUrl: select the URL showing the finished food dish. NEVER use profile pictures, logos, or avatars.
8. INGREDIENT SECTIONS: If ingredients are grouped under headings or sub-headings in the "Rendered webpage content" (e.g. "#### Chicken:", "### Sauce:", "## Dressing:"), you MUST set the "section" field to that heading name. Clean the heading name (remove "#", colons, and "For the" prefix — e.g. "#### Sauce:" becomes "Sauce"). If an ingredient is NOT under a specific sub-heading, set "section" to null. CRITICAL: The appended JSON-LD structured data is flat and loses these groupings — you MUST rely on the markdown headers in the "Rendered webpage content" to determine the sections!
9. NUTRITIONAL ACCURACY & MANDATORY ESTIMATION: If the recipe page includes nutritional information, extract the per-serving values as numbers. If nutrition info is NOT available, you MUST ESTIMATE the per-serving values based ONLY on the extracted ingredients. STRICT LITERALISM: DO NOT assume extra ingredients like butter, oil, milk, or seasoning during estimation unless they are explicitly listed in the ingredient list. Your estimation must be a clinical, literal reflection of the provided ingredients only. NEVER return null or zero for calories, protein, fat, or carbs if ingredients are present — always provide a realistic, best-effort calculation. Accuracy is critical for user health tracking.`;

const SLIDESHOW_RECIPE_PROMPT = `You are a world-class recipe extraction expert. You are analyzing images from a social media slideshow/carousel post (TikTok or Instagram).

These images contain recipe information as TEXT OVERLAID ON IMAGES. Your task is to:
1. READ all text visible in every image (OCR)
2. Identify ALL recipe names, ingredients, instructions, and nutritional info from the text
3. Return ALL recipes found as a JSON array

Return a JSON object with this schema:
{
  "recipes": [
    {
      "title": "recipe name",
      "description": "brief description or null",
      "imageUrl": null,
      "servings": 4,
      "prepTime": "15 min",
      "cookTime": "30 min",
      "ingredients": [
        { "text": "full ingredient line", "quantity": "string", "unit": "string", "name": "string", "section": "string or null" }
      ],
      "steps": [
        { "text": "full step instruction", "stepNumber": 1 }
      ],
      "tags": ["tag1", "tag2"],
      "calories": 450,
      "protein": 25,
      "fat": 15,
      "carbs": 50,
      "slideIndex": 2
    }
  ]
}

CRITICAL RULES:
- Extract ALL recipes visible across ALL images. A slideshow may contain 1, 2, or more recipes.
- READ all text from ALL images — ingredient lists and instructions are often on separate slides.
- The first slide is usually a title/cover — recipe details are on subsequent slides.
- slideIndex should be the 0-based index of the slide that contains the food PHOTO for that recipe (not the text card).
- Output raw JSON ONLY. No markdown blocks.
- NEVER truncate. Include EVERY ingredient and step visible in the images.
- If nutritional info (macros, calories) is visible in the images, extract those exact values.
- If no recipe is found in the images, return { "recipes": [] }.
- NUTRITIONAL ESTIMATION: If nutrition info is NOT visible in the images, ESTIMATE values based on the extracted ingredients. NEVER return null for calories/protein/fat/carbs if ingredients are present.`;

/**
 * Server-side scrape: fetch the URL from the Deno edge function with browser headers.
 * Prioritizes JSON-LD structured recipe data.
 */
async function serverSideScrape(url: string): Promise<string> {
    // Strategy 1: Try Jina Reader from server (different IP than client, may succeed)
    try {
        console.log(`[Server Scrape] Trying Jina Reader from server...`);
        const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; SnapRecipes/1.0)",
                "Accept": "text/plain",
            },
        });
        if (jinaResponse.ok) {
            const jinaText = await jinaResponse.text();
            const looksLikeCaptcha = jinaText.includes("Just a moment") || 
                jinaText.includes("Verification successful") ||
                jinaText.includes("challenge-platform") ||
                jinaText.length < 300;
            if (!looksLikeCaptcha) {
                console.log(`[Server Scrape] Jina Reader returned ${jinaText.length} chars of real content`);
                return `--- Server-side Jina Reader content ---\n${jinaText.substring(0, 15000)}`;
            }
        }
    } catch (e) {
        console.log(`[Server Scrape] Jina Reader from server failed:`, e);
    }

    // Strategy 2: Direct fetch with multiple UAs
    const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
        "Googlebot/2.1 (+http://www.google.com/bot.html)",
    ];

    for (const ua of userAgents) {
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": ua,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Cache-Control": "no-cache",
                },
                redirect: "follow",
            });

            if (!response.ok) {
                console.log(`[Server Scrape] UA "${ua.substring(0, 30)}..." returned ${response.status}`);
                continue;
            }

            const html = await response.text();

            // Fixed CAPTCHA detection: use OR, not AND
            if (html.includes("Just a moment") || html.includes("challenge-platform") || html.includes("cf-chl-bypass") || html.length < 500) {
                console.log(`[Server Scrape] UA "${ua.substring(0, 30)}..." hit CAPTCHA/empty page`);
                continue;
            }

            // Try JSON-LD extraction first (most recipe sites have this)
            const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
            if (jsonLdMatches) {
                for (const match of jsonLdMatches) {
                    const jsonContent = match.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
                    try {
                        const parsed = JSON.parse(jsonContent);
                        const recipe = findRecipeInJsonLd(parsed);
                        if (recipe) {
                            return `--- Structured Recipe Data (JSON-LD from server) ---\n${JSON.stringify(recipe, null, 2)}`;
                        }
                    } catch {
                        // Not valid JSON, skip
                    }
                }
            }

            // Fallback: strip HTML to text
            const textContent = html
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();

            if (textContent.length > 200) {
                return textContent.substring(0, 15000);
            }
        } catch (e) {
            console.log(`[Server Scrape] UA "${ua.substring(0, 30)}..." failed:`, e);
        }
    }

    // Strategy 3: Bing search enrichment — search for the recipe URL and extract result snippets
    // Bing often surfaces recipe ingredients and instructions in its search results
    try {
        console.log(`[Server Scrape] Trying Bing search enrichment...`);
        // Extract a human-readable search query from the URL
        const urlPath = url.split("/").pop()?.replace(/-/g, " ").replace(/\d+/g, "").trim() || "";
        const domain = new URL(url).hostname.replace("www.", "");
        const searchQuery = encodeURIComponent(`site:${domain} ${urlPath} recipe ingredients instructions`);
        
        const bingResp = await fetch(`https://www.bing.com/search?q=${searchQuery}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "text/html",
                "Accept-Language": "en-US,en;q=0.9",
            }
        });
        
        if (bingResp.ok) {
            const bingHtml = await bingResp.text();
            // Strip to text — the AI can extract recipe info from search result snippets
            const bingText = bingHtml
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
            
            if (bingText.length > 500 && (bingText.toLowerCase().includes("ingredient") || bingText.toLowerCase().includes("instruction"))) {
                console.log(`[Server Scrape] Bing search returned ${bingText.length} chars with recipe data`);
                return `--- Recipe data extracted from Bing search results for: ${url} ---\n${bingText.substring(0, 15000)}`;
            }
        }
    } catch (e) {
        console.log(`[Server Scrape] Bing search enrichment failed:`, e);
    }

    return "";
}

function findRecipeInJsonLd(data: any): any | null {
    if (!data) return null;
    if (data["@type"] === "Recipe" || (Array.isArray(data["@type"]) && data["@type"].includes("Recipe"))) return data;
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
 * Extract carousel/slideshow image URLs from an Instagram post.
 * Tries Instagram's GraphQL endpoint and falls back to HTML scraping.
 */
async function scrapeInstagramCarousel(url: string): Promise<string[]> {
    // Extract shortcode from URL
    const shortcodeMatch = url.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
    if (!shortcodeMatch) {
        console.log(`[IG Carousel] Could not extract shortcode from URL: ${url}`);
        return [];
    }
    const shortcode = shortcodeMatch[2];
    console.log(`[IG Carousel] Extracted shortcode: ${shortcode}`);

    // Strategy 1: Try fetching the post page and extracting embedded JSON data
    try {
        const resp = await fetch(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            },
            redirect: "follow",
        });

        if (resp.ok) {
            const html = await resp.text();
            
            // Try to find image URLs in the embed page
            // Instagram embeds often contain the carousel images in <img> tags or in embedded JSON
            const imageUrls: string[] = [];
            
            // Pattern 1: Look for display_url in embedded JSON
            const displayUrlMatches = html.matchAll(/"display_url"\s*:\s*"([^"]+)"/g);
            for (const match of displayUrlMatches) {
                const decoded = match[1].replaceAll("\\u0026", "&").replaceAll("\\/", "/");
                if (!imageUrls.includes(decoded)) imageUrls.push(decoded);
            }

            // Pattern 2: Look for high-res image URLs in img tags
            if (imageUrls.length === 0) {
                const imgMatches = html.matchAll(/class="[^"]*EmbeddedMediaImage[^"]*"[^>]*src="([^"]+)"/g);
                for (const match of imgMatches) {
                    const decoded = match[1].replace(/&amp;/g, "&");
                    if (!imageUrls.includes(decoded)) imageUrls.push(decoded);
                }
            }
            
            // Pattern 3: Look for scontent URLs (Instagram CDN)
            if (imageUrls.length === 0) {
                const scontentMatches = html.matchAll(/(https:\/\/scontent[^"'\s]+)/g);
                for (const match of scontentMatches) {
                    const decoded = match[1].replace(/&amp;/g, "&");
                    // Filter out tiny thumbnails
                    if (!decoded.includes("s150x150") && !decoded.includes("s320x320") && !imageUrls.includes(decoded)) {
                        imageUrls.push(decoded);
                    }
                }
            }

            if (imageUrls.length > 0) {
                console.log(`[IG Carousel] Found ${imageUrls.length} images from embed page`);
                return imageUrls;
            }
        }
    } catch (e) {
        console.log(`[IG Carousel] Embed scrape failed:`, e);
    }

    // Strategy 2: Try the post page directly
    try {
        const resp = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "text/html",
                "Accept-Language": "en-US,en;q=0.9",
            },
            redirect: "follow",
        });

        if (resp.ok) {
            const html = await resp.text();
            const imageUrls: string[] = [];
            
            // Look for carousel images in any embedded data
            const displayUrlMatches = html.matchAll(/"display_url"\s*:\s*"([^"]+)"/g);
            for (const match of displayUrlMatches) {
                const decoded = match[1].replaceAll("\\u0026", "&").replaceAll("\\/", "/");
                if (!imageUrls.includes(decoded)) imageUrls.push(decoded);
            }
            
            if (imageUrls.length > 0) {
                console.log(`[IG Carousel] Found ${imageUrls.length} images from post page`);
                return imageUrls;
            }
        }
    } catch (e) {
        console.log(`[IG Carousel] Direct page scrape failed:`, e);
    }

    console.log(`[IG Carousel] All strategies failed for shortcode: ${shortcode}`);
    return [];
}

function scrapeVideoUrlFromHtml(url: string, html: string): string | null {
    if (!html) return null;
    
    // --- Universal: og:video meta tag (most reliable for Instagram, Facebook, etc.) ---
    const ogVideoMatch = html.match(/<meta[^>]*property=["']og:video(?::url)?["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:video(?::url)?["']/i);
    if (ogVideoMatch) {
        const videoUrl = ogVideoMatch[1].replaceAll("&amp;", "&");
        if (videoUrl.includes(".mp4") || videoUrl.includes("video")) {
            console.log(`[Video Scrape] Found og:video: ${videoUrl.substring(0, 80)}...`);
            return videoUrl;
        }
    }
    
    if (url.includes("instagram.com")) {
        // Pattern 1: video_url in JSON-LD / embedded scripts
        const videoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/i);
        if (videoMatch) return videoMatch[1].replaceAll("\\u0026", "&").replaceAll("\\/", "/");
        
        // Pattern 2: contentUrl in JSON-LD
        const contentUrlMatch = html.match(/"contentUrl"\s*:\s*"([^"]+)"/i);
        if (contentUrlMatch) return contentUrlMatch[1].replaceAll("\\u0026", "&").replaceAll("\\/", "/");
        
        // Pattern 3: video_versions array
        const videoVersionMatch = html.match(/"video_versions"\s*:\s*\[\s*\{[^}]*"url"\s*:\s*"([^"]+)"/i);
        if (videoVersionMatch) return videoVersionMatch[1].replaceAll("\\u0026", "&").replaceAll("\\/", "/");
        
        // Pattern 4: direct scontent mp4 links
        const mp4Match = html.match(/(https:\/\/scontent[^"'\s]+\.mp4[^"'\s]*)/i);
        if (mp4Match) return mp4Match[1].replaceAll("&amp;", "&");
    }
    
    if (url.includes("facebook.com") || url.includes("fb.watch")) {
        // Pattern 1: HD native URL
        const hdMatch = html.match(/"browser_native_hd_url"\s*:\s*"([^"]+)"/i);
        if (hdMatch) return hdMatch[1].replaceAll("\\u0026", "&").replaceAll("\\/", "/");
        
        // Pattern 2: SD native URL
        const sdMatch = html.match(/"browser_native_sd_url"\s*:\s*"([^"]+)"/i);
        if (sdMatch) return sdMatch[1].replaceAll("\\u0026", "&").replaceAll("\\/", "/");
        
        // Pattern 3: playable_url in JSON
        const playableMatch = html.match(/"playable_url(?:_quality_hd)?"\s*:\s*"([^"]+)"/i);
        if (playableMatch) return playableMatch[1].replaceAll("\\u0026", "&").replaceAll("\\/", "/");
        
        // Pattern 4: direct scontent mp4 links
        const mp4Match = html.match(/(https:\/\/scontent[^"'\s]+\.mp4[^"'\s]*)/i);
        if (mp4Match) return mp4Match[1].replaceAll("&amp;", "&");
    }
    
    return null;
}

async function fetchVideoUrlFromServer(url: string): Promise<string | null> {
    // --- Strategy 1: Instagram embed page ---
    if (url.includes("instagram.com")) {
        // Try multiple Instagram URL variants
        const shortcodeMatch = url.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
        const urlsToTry = [
            // Original URL with mobile UA
            url,
        ];
        
        if (shortcodeMatch) {
            // Embed page (sometimes has video data)
            urlsToTry.push(`https://www.instagram.com/p/${shortcodeMatch[2]}/embed/captioned/`);
            // Direct reel URL
            urlsToTry.push(`https://www.instagram.com/reel/${shortcodeMatch[2]}/`);
        }
        
        for (const fetchUrl of urlsToTry) {
            try {
                console.log(`[Video Scrape] Trying Instagram URL: ${fetchUrl}`);
                const resp = await fetch(fetchUrl, {
                    headers: {
                        // Use mobile UA — Instagram serves simpler pages with og:video to mobile
                        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.9",
                    },
                    redirect: "follow",
                });
                
                if (resp.ok) {
                    const html = await resp.text();
                    const videoUrl = scrapeVideoUrlFromHtml(url, html);
                    if (videoUrl) {
                        console.log(`[Video Scrape] Found Instagram video URL from ${fetchUrl}: ${videoUrl.substring(0, 80)}...`);
                        return videoUrl;
                    }
                }
            } catch (e) {
                console.log(`[Video Scrape] Failed for ${fetchUrl}:`, e);
            }
        }
        
        console.log(`[Video Scrape] All Instagram strategies failed for: ${url}`);
        return null;
    }
    
    // --- Strategy 2: Generic fetch for Facebook/other ---
    try {
        console.log(`[Video Scrape] Attempting to scrape video URL for: ${url}`);
        const resp = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            redirect: "follow",
        });
        
        if (resp.ok) {
            const html = await resp.text();
            const videoUrl = scrapeVideoUrlFromHtml(url, html);
            if (videoUrl) {
                console.log(`[Video Scrape] Found video URL: ${videoUrl.substring(0, 80)}...`);
                return videoUrl;
            }
        }
    } catch (e) {
        console.error(`[Video Scrape] Failed to scrape video URL:`, e);
    }
    return null;
}

async function transcribeVideoOpenAI(videoUrl: string, apiKey: string): Promise<string> {
    try {
        console.log(`[Whisper] Downloading video for transcription: ${videoUrl}`);
        const response = await fetch(videoUrl);
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const byteLength = arrayBuffer.byteLength;
        console.log(`[Whisper] Downloaded video size: ${Math.round(byteLength / 1024)} KB`);
        
        if (byteLength > 25 * 1024 * 1024) {
            throw new Error(`Video file too large for Whisper (${Math.round(byteLength / 1024 / 1024)} MB)`);
        }
        
        const formData = new FormData();
        const blob = new Blob([arrayBuffer], { type: "video/mp4" });
        formData.append("file", blob, "video.mp4");
        formData.append("model", "whisper-1");
        
        console.log(`[Whisper] Sending video to OpenAI Whisper API...`);
        const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            },
            body: formData,
        });
        
        if (!whisperResp.ok) {
            const errText = await whisperResp.text();
            throw new Error(`Whisper API error: ${whisperResp.status} - ${errText}`);
        }
        
        const result = await whisperResp.json();
        console.log(`[Whisper] Transcription completed successfully. Length: ${result.text?.length || 0} chars`);
        return result.text || "";
    } catch (e) {
        console.error(`[Whisper] Transcription failed:`, e);
        return "";
    }
}

async function downloadVideoBase64(videoUrl: string): Promise<{ base64: string; mimeType: string } | null> {
    try {
        console.log(`[Gemini Video] Downloading video: ${videoUrl}`);
        const response = await fetch(videoUrl);
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
        }
        const base64 = btoa(binary);
        const mimeType = response.headers.get("content-type")?.split(";")[0] || "video/mp4";
        console.log(`[Gemini Video] Downloaded ${Math.round(buffer.byteLength / 1024)} KB base64 video`);
        return { base64, mimeType };
    } catch (e) {
        console.error(`[Gemini Video] Download failed:`, e);
        return null;
    }
}

function extractYouTubeVideoId(url: string): string | null {
    // Standard watch URL: youtube.com/watch?v=ID
    const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];
    // Short URL: youtu.be/ID
    const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    // Embed URL: youtube.com/embed/ID
    const embedMatch = url.match(/\/embed\/([A-Za-z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    // Shorts URL: youtube.com/shorts/ID
    const shortsMatch = url.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    return null;
}

async function fetchYouTubePageData(videoId: string): Promise<{ transcript: string; audioBuffer: ArrayBuffer | null; audioMimeType: string; description: string }> {
    const result = { transcript: "", audioBuffer: null as ArrayBuffer | null, audioMimeType: "audio/mp4", description: "" };
    
    try {
        console.log(`[YouTube Page] Fetching watch page for video: ${videoId}`);
        
        // Fetch the YouTube watch page to extract ytInitialPlayerResponse
        const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });

        if (!pageResp.ok) {
            console.log(`[YouTube Page] Watch page returned ${pageResp.status}`);
            return result;
        }

        const html = await pageResp.text();
        console.log(`[YouTube Page] Got ${html.length} chars of HTML`);

        // Extract ytInitialPlayerResponse from the page
        const playerRespMatch = html.match(/var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*var\s/s)
            || html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var|let|const)\s/s);
        
        if (!playerRespMatch) {
            console.log(`[YouTube Page] Could not find ytInitialPlayerResponse in HTML`);
            return result;
        }

        let playerData: any;
        try {
            playerData = JSON.parse(playerRespMatch[1]);
            result.description = playerData?.videoDetails?.shortDescription || "";
        } catch (e) {
            console.log(`[YouTube Page] Failed to parse ytInitialPlayerResponse JSON:`, e);
            return result;
        }

        // ── STEP 1: Try to get captions (including auto-generated) ──
        const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (captionTracks && captionTracks.length > 0) {
            console.log(`[YouTube Captions] Found ${captionTracks.length} caption track(s)`);
            
            // Prefer English, fall back to first available
            const enTrack = captionTracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en"))
                || captionTracks[0];
            
            if (enTrack?.baseUrl) {
                try {
                    // Request JSON3 format for easier parsing
                    const captionUrl = enTrack.baseUrl + "&fmt=json3";
                    const captionResp = await fetch(captionUrl);
                    
                    if (captionResp.ok) {
                        const captionData = await captionResp.json();
                        const events = captionData?.events || [];
                        const texts: string[] = [];
                        
                        for (const event of events) {
                            if (event.segs) {
                                const segText = event.segs.map((s: any) => s.utf8 || "").join("");
                                if (segText.trim()) texts.push(segText.trim());
                            }
                        }
                        
                        result.transcript = texts.join(" ").replace(/\s+/g, " ").trim();
                        console.log(`[YouTube Captions] Extracted ${result.transcript.length} chars of caption text`);
                        
                        if (result.transcript.length >= 50) {
                            return result; // Captions found, no need to download audio
                        }
                    }
                } catch (e) {
                    console.log(`[YouTube Captions] Failed to fetch caption track:`, e);
                }
            }
        } else {
            console.log(`[YouTube Captions] No caption tracks available`);
        }

        // ── STEP 2: Try to get streaming data from page ──
        const streamingData = playerData?.streamingData;
        if (streamingData) {
            console.log(`[YouTube Page] Found streamingData in page response`);
            const audioResult = await tryExtractAudioFromStreamingData(streamingData);
            if (audioResult) {
                result.audioBuffer = audioResult.buffer;
                result.audioMimeType = audioResult.mimeType;
                return result;
            }
        } else {
            console.log(`[YouTube Page] No streamingData in page HTML (YouTube strips it for server requests)`);
        }

        // ── STEP 3: Try InnerTube API with multiple client contexts ──
        // YouTube strips streaming data from server-rendered HTML, so we
        // call the InnerTube player API with different client identities.
        const clients = [
            {
                name: "WEB",
                body: {
                    context: {
                        client: {
                            clientName: "WEB",
                            clientVersion: "2.20250601.00.00",
                            hl: "en",
                            gl: "US",
                        },
                    },
                    videoId: videoId,
                },
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                    "Origin": "https://www.youtube.com",
                    "Referer": "https://www.youtube.com/",
                    "X-Youtube-Client-Name": "1",
                    "X-Youtube-Client-Version": "2.20250601.00.00",
                },
            },
            {
                name: "IOS",
                body: {
                    context: {
                        client: {
                            clientName: "IOS",
                            clientVersion: "19.29.1",
                            deviceModel: "iPhone16,2",
                            userAgent: "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)",
                            osVersion: "17.5.1.21F90",
                            hl: "en",
                            gl: "US",
                        },
                    },
                    videoId: videoId,
                },
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)",
                },
            },
            {
                name: "TV_EMBED",
                body: {
                    context: {
                        client: {
                            clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
                            clientVersion: "2.0",
                            hl: "en",
                            gl: "US",
                        },
                        thirdParty: {
                            embedUrl: "https://www.google.com",
                        },
                    },
                    videoId: videoId,
                },
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                },
            },
        ];

        for (const client of clients) {
            try {
                console.log(`[YouTube InnerTube ${client.name}] Trying player API...`);
                const resp = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
                    method: "POST",
                    headers: client.headers,
                    body: JSON.stringify(client.body),
                });

                if (!resp.ok) {
                    console.log(`[YouTube InnerTube ${client.name}] Returned ${resp.status}`);
                    continue;
                }

                const data = await resp.json();

                if (data?.videoDetails?.shortDescription && !result.description) {
                    result.description = data.videoDetails.shortDescription;
                }
 
                // Check for captions first (fast, cheap)
                const apiCaptions = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                if (apiCaptions && apiCaptions.length > 0 && !result.transcript) {
                    console.log(`[YouTube InnerTube ${client.name}] Found ${apiCaptions.length} caption tracks`);
                    const enTrack = apiCaptions.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en"))
                        || apiCaptions[0];
                    
                    if (enTrack?.baseUrl) {
                        try {
                            const captionResp = await fetch(enTrack.baseUrl + "&fmt=json3");
                            if (captionResp.ok) {
                                const captionData = await captionResp.json();
                                const texts: string[] = [];
                                for (const event of (captionData?.events || [])) {
                                    if (event.segs) {
                                        const segText = event.segs.map((s: any) => s.utf8 || "").join("");
                                        if (segText.trim()) texts.push(segText.trim());
                                    }
                                }
                                result.transcript = texts.join(" ").replace(/\s+/g, " ").trim();
                                console.log(`[YouTube InnerTube ${client.name}] Extracted ${result.transcript.length} chars of captions`);
                                if (result.transcript.length >= 50) {
                                    return result;
                                }
                            }
                        } catch (e) {
                            console.log(`[YouTube InnerTube ${client.name}] Caption fetch failed:`, e);
                        }
                    }
                }

                // Check for streaming data with direct URLs
                const apiStreamingData = data?.streamingData;
                if (apiStreamingData && !result.audioBuffer) {
                    const audioResult = await tryExtractAudioFromStreamingData(apiStreamingData);
                    if (audioResult) {
                        console.log(`[YouTube InnerTube ${client.name}] Got audio from streaming data`);
                        result.audioBuffer = audioResult.buffer;
                        result.audioMimeType = audioResult.mimeType;
                        return result;
                    }
                }
            } catch (e) {
                console.log(`[YouTube InnerTube ${client.name}] Failed:`, e);
            }
        }

        // ── STEP 4: Try Cobalt API (open-source media downloader proxy) ──
        // Cobalt handles signature deciphering server-side and returns direct URLs
        const cobaltInstances = [
            "https://dog.kittycat.boo",
            "https://rue-cobalt.xenon.zone",
        ];

        for (const instance of cobaltInstances) {
            try {
                console.log(`[YouTube Cobalt] Trying ${instance}...`);
                const cobResponse = await fetch(instance, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
                    },
                    body: JSON.stringify({
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        downloadMode: "audio",
                        audioFormat: "mp3",
                        audioBitrate: "128"
                    }),
                    signal: AbortSignal.timeout(8000), // 8s timeout
                });

                if (cobResponse.ok) {
                    const cobData = await cobResponse.json();
                    if (cobData && cobData.url) {
                        console.log(`[YouTube Cobalt] Got download URL from ${instance}: ${cobData.url}`);
                        const audioResp = await fetch(cobData.url);
                        if (audioResp.ok) {
                            const buffer = await audioResp.arrayBuffer();
                            if (buffer.byteLength > 0) {
                                console.log(`[YouTube Cobalt] Downloaded audio: ${Math.round(buffer.byteLength / 1024)} KB`);
                                result.audioBuffer = buffer;
                                result.audioMimeType = "audio/mp3";
                                return result;
                            } else {
                                console.log(`[YouTube Cobalt] Downloaded 0 bytes from ${instance} (likely blocked by YouTube signature/po_token enforcement)`);
                            }
                        } else {
                            console.log(`[YouTube Cobalt] Download from URL failed: ${audioResp.status}`);
                        }
                    } else {
                        console.log(`[YouTube Cobalt] Invalid response format from ${instance}:`, cobData);
                    }
                } else {
                    const errText = await cobResponse.text();
                    console.log(`[YouTube Cobalt] ${instance} returned status ${cobResponse.status}: ${errText.substring(0, 100)}`);
                }
            } catch (e) {
                console.log(`[YouTube Cobalt] ${instance} failed:`, e);
            }
        }

        console.log(`[YouTube] All extraction strategies exhausted`);
        return result;
    } catch (e) {
        console.error(`[YouTube Page] Failed:`, e);
        return result;
    }
}

// Helper: try to find and download an audio stream from YouTube streaming data
async function tryExtractAudioFromStreamingData(streamingData: any): Promise<{ buffer: ArrayBuffer; mimeType: string } | null> {
    const allFormats = [...(streamingData.adaptiveFormats || []), ...(streamingData.formats || [])];
    
    // Prefer audio-only streams with direct URLs (much smaller)
    const audioStreams = allFormats
        .filter((f: any) => f.url && f.mimeType?.startsWith("audio/"))
        .sort((a: any, b: any) => (parseInt(a.contentLength) || Infinity) - (parseInt(b.contentLength) || Infinity));
    
    // Fallback to smallest video+audio stream with direct URL
    const videoStreams = allFormats
        .filter((f: any) => f.url && f.mimeType?.startsWith("video/") && f.audioQuality)
        .sort((a: any, b: any) => (parseInt(a.contentLength) || Infinity) - (parseInt(b.contentLength) || Infinity));

    const targetStream = audioStreams[0] || videoStreams[0];
    
    if (!targetStream?.url) {
        const cipherCount = allFormats.filter((f: any) => f.signatureCipher).length;
        const directCount = allFormats.filter((f: any) => f.url).length;
        console.log(`[YouTube Stream] ${directCount} direct URLs, ${cipherCount} cipher-protected`);
        return null;
    }

    const mimeType = targetStream.mimeType?.split(";")[0] || "audio/mp4";
    const estimatedSizeMB = Math.round((parseInt(targetStream.contentLength) || 0) / 1024 / 1024 * 10) / 10;
    console.log(`[YouTube Stream] Found direct stream: ${mimeType}, ~${estimatedSizeMB} MB`);

    if (parseInt(targetStream.contentLength) > 25 * 1024 * 1024) {
        console.log(`[YouTube Stream] Too large (${estimatedSizeMB} MB), skipping`);
        return null;
    }

    try {
        const audioResp = await fetch(targetStream.url);
        if (audioResp.ok) {
            const buffer = await audioResp.arrayBuffer();
            console.log(`[YouTube Stream] Downloaded ${Math.round(buffer.byteLength / 1024)} KB`);
            return { buffer, mimeType };
        } else {
            console.log(`[YouTube Stream] Download failed: ${audioResp.status}`);
        }
    } catch (e) {
        console.log(`[YouTube Stream] Download error:`, e);
    }

    return null;
}

async function extractYouTubeData(url: string): Promise<{ title: string; thumbnailUrl: string; transcript: string; audioData: { buffer: ArrayBuffer; mimeType: string } | null; description?: string } | null> {
    try {
        // 1. oEmbed metadata
        let title = "";
        let thumbnailUrl = "";
        try {
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const oembedResp = await fetch(oembedUrl);
            if (oembedResp.ok) {
                const oembedData = await oembedResp.json();
                title = oembedData.title || "";
                thumbnailUrl = oembedData.thumbnail_url || "";
            }
        } catch (e) {
            console.log(`[YouTube oEmbed] Failed:`, e);
        }

        // 2. Scrape the YouTube page for captions and/or streaming data
        const videoId = extractYouTubeVideoId(url);
        let transcript = "";
        let audioData: { buffer: ArrayBuffer; mimeType: string } | null = null;
        let description = "";
        
        if (videoId) {
            const pageData = await fetchYouTubePageData(videoId);
            transcript = pageData.transcript;
            description = pageData.description;
            
            if (pageData.audioBuffer) {
                audioData = { buffer: pageData.audioBuffer, mimeType: pageData.audioMimeType };
            }
        }

        // 3. If page scraping didn't get captions, try the npm transcript library as fallback
        if (!transcript || transcript.length < 50) {
            try {
                const mod = await import("npm:@danielxceron/youtube-transcript");
                const YoutubeTranscript = mod.YoutubeTranscript || mod.default || mod;
                const lines = await YoutubeTranscript.fetchTranscript(url);
                const npmTranscript = lines.map((l: any) => l.text).join(" ");
                if (npmTranscript.length > transcript.length) {
                    transcript = npmTranscript;
                    console.log(`[YouTube Transcript NPM] Got transcript: ${transcript.length} chars`);
                }
            } catch (e) {
                console.log(`[YouTube Transcript NPM] Failed:`, e);
            }
        }

        return { title, thumbnailUrl, transcript, audioData, description };
    } catch (e) {
        console.error(`[YouTube] extractYouTubeData failed:`, e);
        return null;
    }
}

function isRecipeLink(urlStr: string): boolean {
    try {
        const url = new URL(urlStr);
        const host = url.hostname.toLowerCase();
        
        const blacklistDomains = [
            "youtube.com", "youtu.be", "instagram.com", "facebook.com", "twitter.com", "x.com", 
            "pinterest.com", "tiktok.com", "snapchat.com", "reddit.com", "linkedin.com", "threads.net", 
            "t.co", "amazon.com", "amazon.ca", "amazon.co.uk", "a.co", "amzn.to", "barnesandnoble.com", 
            "bookshop.org", "booksamillion.com", "target.com", "walmart.com", "apple.co", "play.google.com", 
            "spotify.com", "apple.com", "netflix.com", "patreon.com", "paypal.me", "ko-fi.com", 
            "linktr.ee", "lnk.bio", "bio.link", "flow.page", "linkin.bio"
        ];
        
        if (blacklistDomains.some(d => host === d || host.endsWith("." + d))) {
            return false;
        }
        
        const path = url.pathname.toLowerCase();
        const blacklistKeywords = ["/shop", "/store", "/merch", "/subscribe", "/newsletter", "/patreon", "/book"];
        if (blacklistKeywords.some(kw => path.includes(kw))) {
            return false;
        }
        
        return true;
    } catch {
        return false;
    }
}

function findBestRecipeUrl(text: string): string | null {
    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    const uniqueUrls = [...new Set(urls)];
    const candidates = uniqueUrls.filter(isRecipeLink);
    
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    
    const lines = text.split("\n");
    let bestUrl = candidates[0];
    let bestScore = -1;
    
    for (const url of candidates) {
        let score = 0;
        if (url.toLowerCase().includes("recipe")) score += 2;
        
        for (const line of lines) {
            if (line.includes(url)) {
                const lowerLine = line.toLowerCase();
                if (lowerLine.includes("recipe")) score += 5;
                if (lowerLine.includes("written")) score += 3;
                if (lowerLine.includes("ingredients")) score += 3;
                if (lowerLine.includes("steps")) score += 3;
                if (lowerLine.includes("blog")) score += 2;
                if (lowerLine.includes("full")) score += 2;
                if (lowerLine.includes("here")) score += 1;
            }
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestUrl = url;
        }
    }
    
    return bestUrl;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // ── AUTH GATE ──────────────────────────────────────────────
        // Verify the caller's identity when a real JWT is provided.
        // Free-tier users call with the anon key only (no user JWT).
        // The anon key itself is verified by Supabase's infrastructure.
        const authHeader = req.headers.get("Authorization");
        let callerUserId: string | null = null;

        if (authHeader && !authHeader.includes(Deno.env.get("SUPABASE_ANON_KEY") || "")) {
            // A real user JWT was provided — verify it
            const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
            const supabaseAdmin = createClient(
                Deno.env.get("SUPABASE_URL")!,
                Deno.env.get("SUPABASE_ANON_KEY")!,
                { global: { headers: { Authorization: authHeader } } }
            );
            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
            if (authError || !user) {
                return new Response(JSON.stringify({ error: "Invalid auth token" }), {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            callerUserId = user.id;
            console.log(`[Auth] Authenticated user: ${callerUserId}`);
        } else {
            console.log(`[Auth] Anonymous (free-tier) request`);
        }
        // ── END AUTH GATE ──────────────────────────────────────────

        const body = await req.json();

        // ── ACTION: SHARE TO COMMUNITY ────────────────────────────
        // Handle manual sharing of a recipe to the community
        if (body.action === "share" && body.recipe) {
            console.log(`[Share] Received request to share recipe: ${body.recipe.title}`);
            const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
            const serviceClient = createClient(
                Deno.env.get("SUPABASE_URL")!,
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            );

            const recipe = body.recipe;

            // Generate content hash for deduplication
            const ingNames = (recipe.ingredients || [])
                .slice(0, 3)
                .map((i: any) => (i.name || i.text || "").toLowerCase().trim())
                .join("|");
            const contentHash = `${recipe.title.toLowerCase().trim()}::${ingNames}`;

            // Generate slug from title
            const baseSlug = recipe.title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "")
                .substring(0, 80) || "recipe";
            const slugSuffix = Math.random().toString(36).substring(2, 6);
            const slug = `${baseSlug}-${slugSuffix}`;

            const { data, error } = await serviceClient
                .from("public_recipes")
                .upsert({
                    title: recipe.title,
                    description: recipe.description || null,
                    image_url: recipe.imageUrl || recipe.image_url || null,
                    servings: recipe.servings || null,
                    prep_time: recipe.prepTime || recipe.prep_time || null,
                    cook_time: recipe.cookTime || recipe.cook_time || null,
                    ingredients: recipe.ingredients || [],
                    steps: recipe.steps || [],
                    tags: recipe.tags || [],
                    source_url: recipe.sourceUrl || recipe.source_url || null,
                    source_domain: "community",
                    content_hash: contentHash,
                    slug: slug,
                    calories: recipe.calories || null,
                    protein: recipe.protein || null,
                    fat: recipe.fat || null,
                    carbs: recipe.carbs || null,
                }, { onConflict: "content_hash", ignoreDuplicates: false })
                .select();

            if (error) {
                console.error("[Share] Failed to share recipe:", error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ success: true, data }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { 
            url, 
            contentForAI: clientContent, 
            scrapeFailed, 
            imageBase64, 
            prompt, 
            provider, 
            geminiModel,
            reCacheOnly,
            ogImageUrl,
            slideshowImageUrls,
            isInstagram,
            videoUrl: payloadVideoUrl
        } = body;

        const activeProvider = provider || "gemini";
        const activeKey = activeProvider === "openai" ? DEFAULT_OPENAI_KEY : DEFAULT_GEMINI_KEY;
        const activePrompt = prompt || RECIPE_PROMPT;

        if (!activeKey) {
            return new Response(JSON.stringify({ error: `Missing API key for ${activeProvider}. Please configure Supabase Edge Function Secrets.` }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // ----- Server-side scraping fallback -----
        // If client signals scrape failure, try from the server to supplement content
        let contentForAI = clientContent || "";
        
        // ── YOUTUBE INTERCEPTOR ─────────────────────────────────────
        const isYouTube = url && (url.includes("youtube.com") || url.includes("youtu.be"));
        let youtubeData = null;
        let youtubeHasTranscript = false;
        let youtubeHasRecipeScrape = false;
        
        if (isYouTube && !imageBase64) {
            console.log(`[YouTube] Detected YouTube URL: ${url}`);
            youtubeData = await extractYouTubeData(url);
            if (youtubeData) {
                // Try to find and scrape any recipe link in the description
                let scrapedRecipeContent = "";
                if (youtubeData.description) {
                    const recipeUrl = findBestRecipeUrl(youtubeData.description);
                    if (recipeUrl) {
                        console.log(`[YouTube] Found potential recipe link in description: ${recipeUrl}`);
                        try {
                            const scraped = await serverSideScrape(recipeUrl);
                            if (scraped && scraped.length > 200) {
                                scrapedRecipeContent = scraped;
                                youtubeHasRecipeScrape = true;
                                console.log(`[YouTube] Successfully scraped external recipe page (${scraped.length} chars)`);
                            }
                        } catch (scrapeErr) {
                            console.log(`[YouTube] Failed to scrape description recipe link:`, scrapeErr);
                        }
                    }
                }

                // Only treat transcript as successful if it has real content
                youtubeHasTranscript = !!(youtubeData.transcript && youtubeData.transcript.length >= 50);
                
                if (youtubeHasRecipeScrape) {
                    contentForAI = `--- Scraped Recipe Website Content ---\n${scrapedRecipeContent}\n\n--- YouTube Video Data ---\nTitle: ${youtubeData.title}\nThumbnail URL: ${youtubeData.thumbnailUrl}\n\nTranscript:\n${youtubeData.transcript || "(Skipped/Not available, using scraped recipe page)"}\n\n--- Additional metadata ---\n${contentForAI}`;
                    console.log(`[YouTube] Scraped external recipe website, skipping video download/audio pipeline`);
                } else if (youtubeHasTranscript) {
                    contentForAI = `--- YouTube Video Data ---\nTitle: ${youtubeData.title}\nThumbnail URL: ${youtubeData.thumbnailUrl}\n\nTranscript:\n${youtubeData.transcript}\n\n--- Additional metadata ---\n${contentForAI}`;
                    console.log(`[YouTube] Got transcript (${youtubeData.transcript.length} chars), skipping video download`);
                } else {
                    contentForAI = `--- YouTube Video Data ---\nTitle: ${youtubeData.title}\nThumbnail URL: ${youtubeData.thumbnailUrl}\n\n(No transcript or external recipe page available — video audio will be processed)\n\n--- Additional metadata ---\n${contentForAI}`;
                    console.log(`[YouTube] No transcript or recipe page available, will try audio extraction pipeline`);
                }
                
                if (youtubeData.thumbnailUrl) {
                    contentForAI += `\n\nIMPORTANT: The original webpage's designated thumbnail image is: ${youtubeData.thumbnailUrl}. If you cannot find a better photo of the finished dish in the text above, you MUST use this URL as the \`imageUrl\`. Note: if it is a video thumbnail with a play button, that is perfectly fine. DO NOT attempt to remove the play button or alter the URL. Use the URL exactly as provided.`;
                }
            }
        }
        
        if (url && scrapeFailed && !imageBase64 && !isYouTube) {
            console.log(`[Server Scrape] Client scrape failed, attempting server-side fetch for: ${url}`);
            try {
                const scraped = await serverSideScrape(url);
                if (scraped && scraped.length > 200) {
                    // Prepend server content — keep client OG metadata as fallback
                    contentForAI = `${scraped}\n\n--- Additional client-provided metadata ---\n${contentForAI}`;
                    console.log(`[Server Scrape] Successfully scraped ${scraped.length} chars`);
                } else {
                    console.log(`[Server Scrape] Server scrape also returned sparse content`);
                }
            } catch (e) {
                console.error(`[Server Scrape] Failed:`, e);
            }
        }

        // ── VIDEO URL RESOLVER ──────────────────────────────────────
        let resolvedVideoUrl = payloadVideoUrl;
        
        // Instagram/Facebook: try server-side video URL scraping
        if (!resolvedVideoUrl && url && (url.includes("instagram.com") || url.includes("facebook.com") || url.includes("fb.watch"))) {
            resolvedVideoUrl = await fetchVideoUrlFromServer(url);
        }
        
        // ── VIDEO PROCESSING PIPELINE ────────────────────────────────
        let videoBase64: string | undefined = undefined;
        let videoMimeType: string | undefined = undefined;
        
        // YouTube audio: already downloaded as buffer by youtubei.js
        if (isYouTube && !youtubeHasTranscript && !youtubeHasRecipeScrape && youtubeData?.audioData && !imageBase64) {
            console.log(`[YouTube Pipeline] Processing pre-downloaded audio (${Math.round(youtubeData.audioData.buffer.byteLength / 1024)} KB)`);
            if (activeProvider === "openai") {
                if (DEFAULT_OPENAI_KEY) {
                    // Send pre-downloaded buffer directly to Whisper
                    try {
                        const formData = new FormData();
                        const blob = new Blob([youtubeData.audioData.buffer], { type: youtubeData.audioData.mimeType });
                        const ext = youtubeData.audioData.mimeType.includes("webm") ? "webm" : "mp4";
                        formData.append("file", blob, `audio.${ext}`);
                        formData.append("model", "whisper-1");
                        
                        console.log(`[Whisper] Sending YouTube audio to Whisper API...`);
                        const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                            method: "POST",
                            headers: { "Authorization": `Bearer ${DEFAULT_OPENAI_KEY}` },
                            body: formData,
                        });
                        
                        if (whisperResp.ok) {
                            const result = await whisperResp.json();
                            if (result.text) {
                                contentForAI = `--- Transcribed Video Audio ---\n${result.text}\n\n${contentForAI}`;
                                console.log(`[Whisper] YouTube transcription success: ${result.text.length} chars`);
                            }
                        } else {
                            const errText = await whisperResp.text();
                            console.error(`[Whisper] YouTube transcription failed: ${whisperResp.status} - ${errText}`);
                        }
                    } catch (e) {
                        console.error(`[Whisper] YouTube audio processing failed:`, e);
                    }
                }
            } else {
                // Gemini: convert pre-downloaded buffer to base64
                const bytes = new Uint8Array(youtubeData.audioData.buffer);
                let binary = "";
                const chunkSize = 8192;
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
                }
                videoBase64 = btoa(binary);
                videoMimeType = youtubeData.audioData.mimeType;
                console.log(`[Gemini] YouTube audio converted to base64 for multimodal processing`);
            }
        }
        
        // TikTok/Instagram/Facebook video: download from URL
        if (resolvedVideoUrl && !imageBase64 && !videoBase64) {
            console.log(`[Video Pipeline] Processing video from: ${resolvedVideoUrl.substring(0, 80)}...`);
            if (activeProvider === "openai") {
                if (DEFAULT_OPENAI_KEY) {
                    const transcript = await transcribeVideoOpenAI(resolvedVideoUrl, DEFAULT_OPENAI_KEY);
                    if (transcript) {
                        contentForAI = `--- Transcribed Video Audio ---\n${transcript}\n\n${contentForAI}`;
                    }
                } else {
                    console.log("[Whisper] Cannot transcribe: OpenAI API key missing");
                }
            } else {
                // Gemini: download video/audio as base64 for native multimodal processing
                const videoData = await downloadVideoBase64(resolvedVideoUrl);
                if (videoData) {
                    videoBase64 = videoData.base64;
                    videoMimeType = videoData.mimeType;
                }
            }
        }

        // --- Fast Path: Re-Cache Only (Skip AI) ---
        if (reCacheOnly && url) {
            console.log(`[Fast Path] reCacheOnly mode enabled for: ${url}`);
            
            // Priority 1: Use ogImageUrl passed from client
            // Priority 2: Try to find a fresh one by scraping the server side
            let imageToCache = ogImageUrl;

            if (!imageToCache) {
                console.log(`[Fast Path] No ogImageUrl provided, attempting server-side scrape...`);
                // We'll use a very basic scrape to find the first large JPEG or og:image
                try {
                    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }});
                    if (resp.ok) {
                        const html = await resp.text();
                        const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
                        if (ogMatch) imageToCache = ogMatch[1];
                    }
                } catch (e) {
                    console.log(`[Fast Path] Server scrape failed:`, e);
                }
            }

            if (imageToCache) {
                // Remove any trailing dots or punctuation that might have leaked in
                imageToCache = imageToCache.trim().replace(/[.,!?;]+$/, "");
                
                const result = await performImageCaching(imageToCache, url);
                return new Response(JSON.stringify({ imageUrl: result || imageToCache }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            } else {
                console.log(`[Fast Path] Failed to find any image URL to cache.`);
                return new Response(JSON.stringify({ error: "Failed to find image" }), {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        // ── SLIDESHOW VISION PIPELINE ──────────────────────────────
        // Handle TikTok slideshows and Instagram carousels by downloading
        // all slide images and sending them to Gemini Vision for OCR
        let resolvedSlideshowUrls: string[] = slideshowImageUrls || [];
        
        // If Instagram carousel, try to scrape carousel images server-side
        if (isInstagram && resolvedSlideshowUrls.length === 0 && url) {
            console.log(`[Slideshow] Instagram carousel detected, attempting server-side scrape...`);
            resolvedSlideshowUrls = await scrapeInstagramCarousel(url);
        }

        if (resolvedSlideshowUrls.length > 1) {
            console.log(`[Slideshow] Processing ${resolvedSlideshowUrls.length} slideshow images via Gemini Vision`);
            
            // Download all images server-side and convert to base64
            const imageParts: { base64: string; mimeType: string }[] = [];
            for (const imgUrl of resolvedSlideshowUrls.slice(0, 10)) {
                try {
                    const imgResp = await fetch(imgUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                        },
                    });
                    if (imgResp.ok) {
                        const buffer = await imgResp.arrayBuffer();
                        const bytes = new Uint8Array(buffer);
                        // Convert to base64 in chunks to avoid call stack issues
                        let binary = "";
                        const chunkSize = 8192;
                        for (let i = 0; i < bytes.length; i += chunkSize) {
                            binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
                        }
                        const base64 = btoa(binary);
                        const mimeType = imgResp.headers.get("content-type")?.split(";")[0] || "image/jpeg";
                        imageParts.push({ base64, mimeType });
                        console.log(`[Slideshow] Downloaded image ${imageParts.length}/${resolvedSlideshowUrls.length} (${Math.round(buffer.byteLength / 1024)}KB)`);
                    } else {
                        console.log(`[Slideshow] Failed to download image: HTTP ${imgResp.status}`);
                    }
                } catch (e) {
                    console.log(`[Slideshow] Failed to download image:`, e);
                }
            }

            if (imageParts.length > 0) {
                let visionText = "";

                if (activeProvider === "openai") {
                    // Build multi-image OpenAI request
                    const messages = [
                        { role: "system", content: SLIDESHOW_RECIPE_PROMPT }
                    ];
                    
                    const userContent: any[] = [];
                    for (let i = 0; i < imageParts.length; i++) {
                        userContent.push({
                            type: "text",
                            text: `--- Slide ${i + 1} of ${imageParts.length} ---`
                        });
                        userContent.push({
                            type: "image_url",
                            image_url: { url: `data:${imageParts[i].mimeType};base64,${imageParts[i].base64}` }
                        });
                    }
                    
                    if (clientContent) {
                        userContent.push({
                            type: "text",
                            text: `\n\n--- Additional context (caption/metadata) ---\n${clientContent}`
                        });
                    }
                    
                    messages.push({ role: "user", content: userContent });
                    
                    const payload = {
                        model: "gpt-4o",
                        response_format: { type: "json_object" },
                        temperature: 0.1,
                        messages
                    };
                    
                    console.log(`[Slideshow] Sending ${imageParts.length} images to OpenAI gpt-4o...`);
                    const response = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${activeKey}`,
                        },
                        body: JSON.stringify(payload),
                    });
                    
                    if (!response.ok) {
                        const err = await response.text();
                        throw new Error(`OpenAI Slideshow Error: ${err}`);
                    }
                    
                    const data = await response.json();
                    visionText = data.choices?.[0]?.message?.content;
                } else {
                    // Build multi-image Gemini Vision request
                    const targetModel = geminiModel || "gemini-2.5-flash";
                    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`;
                    
                    const parts: any[] = [{ text: SLIDESHOW_RECIPE_PROMPT }];
                    for (let i = 0; i < imageParts.length; i++) {
                        parts.push({
                            text: `--- Slide ${i + 1} of ${imageParts.length} ---`
                        });
                        parts.push({
                            inline_data: { mime_type: imageParts[i].mimeType, data: imageParts[i].base64 }
                        });
                    }

                    // Add caption context if available
                    if (clientContent) {
                        parts.push({ text: `\n\n--- Additional context (caption/metadata) ---\n${clientContent}` });
                    }

                    const visionPayload = {
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 65536,
                            responseMimeType: "application/json",
                        },
                        contents: [{ parts }],
                    };

                    console.log(`[Slideshow] Sending ${imageParts.length} images to Gemini Vision...`);
                    const visionResponse = await fetch(endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(visionPayload),
                    });

                    if (!visionResponse.ok) {
                        const err = await visionResponse.text();
                        throw new Error(`Gemini Vision Error: ${err}`);
                    }

                    const visionData = await visionResponse.json();
                    visionText = visionData.candidates?.[0]?.content?.parts?.[0]?.text;
                }

                if (!visionText) {
                    throw new Error("Empty response from Vision AI model");
                }

                // Parse the response
                let cleanVisionText = visionText.trim();
                const visionJsonMatch = cleanVisionText.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (visionJsonMatch) cleanVisionText = visionJsonMatch[1].trim();

                let visionParsed;
                try {
                    const repaired = jsonrepair(cleanVisionText);
                    visionParsed = JSON.parse(repaired);
                } catch (e) {
                    throw new Error(`Could not parse slideshow JSON. Raw: ${cleanVisionText.substring(0, 300)}`);
                }

                // Extract recipes array
                let recipes = visionParsed.recipes || (Array.isArray(visionParsed) ? visionParsed : [visionParsed]);
                if (!Array.isArray(recipes)) recipes = [recipes];

                console.log(`[Slideshow] Extracted ${recipes.length} recipe(s) from slideshow`);

                // Assign food photo images to each recipe and cache them
                for (const recipe of recipes) {
                    // Use the slideIndex to pick the food photo for this recipe
                    const photoIdx = recipe.slideIndex;
                    if (typeof photoIdx === "number" && photoIdx >= 0 && photoIdx < resolvedSlideshowUrls.length) {
                        recipe.imageUrl = resolvedSlideshowUrls[photoIdx];
                    } else {
                        // Fallback: use the first image (usually cover/food photo)
                        recipe.imageUrl = resolvedSlideshowUrls[0];
                    }
                    delete recipe.slideIndex;

                    // Cache the image if from ephemeral source
                    if (recipe.imageUrl && url) {
                        recipe.imageUrl = recipe.imageUrl.trim().replace(/[.,!?;]+$/, "");
                        const cachedUrl = await performImageCaching(recipe.imageUrl, url);
                        if (cachedUrl) recipe.imageUrl = cachedUrl;
                    }
                }

                // Return the array of recipes directly
                // The client will handle saving each one
                return new Response(JSON.stringify({ slideshow: true, recipes }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            } else {
                console.log(`[Slideshow] No images could be downloaded, falling back to text-based extraction`);
            }
        }
        // ── END SLIDESHOW VISION PIPELINE ──────────────────────────

        let aiResponseText = "";

        if (activeProvider === "openai") {
            // ----- OpenAI Logic -----
            const payload: any = {
                model: "gpt-4o",
                response_format: { type: "json_object" },
                temperature: 0.1,
                messages: [
                    { role: "system", content: activePrompt }
                ]
            };

            if (imageBase64) {
                payload.messages.push({
                    role: "user",
                    content: [
                        { type: "text", text: "Extract the recipe from this image:" },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                    ]
                });
            } else if (contentForAI) {
                payload.messages.push({
                    role: "user",
                    content: `Please extract the recipe from the following text and metadata:\n\n${contentForAI}`
                });
            } else {
                return new Response(JSON.stringify({ error: "Provide contentForAI or imageBase64" }), { status: 400, headers: corsHeaders });
            }

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${activeKey}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`OpenAI Error: ${err}`);
            }

            const data = await response.json();
            aiResponseText = data.choices?.[0]?.message?.content;

        } else {
            // ----- Gemini Logic -----
            const targetModel = geminiModel || "gemini-3-flash-preview";
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`;

            const payload: any = {
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 65536,
                    responseMimeType: "application/json",
                },
                contents: [{ parts: [] }]
            };

            if (videoBase64) {
                payload.contents[0].parts.push({ text: activePrompt });
                payload.contents[0].parts.push({
                    inline_data: { mime_type: videoMimeType || "video/mp4", data: videoBase64 }
                });
                if (contentForAI) {
                    payload.contents[0].parts.push({
                        text: `Additional webpage context/metadata:\n\n${contentForAI}`
                    });
                }
            } else if (imageBase64) {
                payload.contents[0].parts.push({ text: activePrompt });
                payload.contents[0].parts.push({
                    inline_data: { mime_type: "image/jpeg", data: imageBase64 }
                });
            } else if (contentForAI) {
                payload.contents[0].parts.push({
                    text: `${activePrompt}\n\n---\n\n${contentForAI}`
                });
            } else {
                return new Response(JSON.stringify({ error: "Provide contentForAI, videoBase64 or imageBase64" }), { status: 400, headers: corsHeaders });
            }

            let geminiSuccess = false;
            try {
                console.log(`[Gemini] Attempting extraction using model: ${targetModel}`);
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    const data = await response.json();
                    aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (aiResponseText) {
                        geminiSuccess = true;
                    }
                } else {
                    const err = await response.text();
                    console.error(`[Gemini] API returned error status ${response.status}: ${err}`);
                }
            } catch (e) {
                console.error(`[Gemini] API fetch failed:`, e);
            }

            if (!geminiSuccess) {
                throw new Error("Gemini model is currently experiencing high demand. Please try again later, or switch to OpenAI in Settings.");
            }
        }

        if (!aiResponseText) {
            throw new Error("Empty response from AI engine");
        }

        // Robust JSON Parsing
        let cleanText = aiResponseText.trim();
        const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            cleanText = jsonMatch[1].trim();
        }

        let parsedData;
        try {
            // Use jsonrepair to violently fix trailing commas, bracket mismatches, unquoted keys, and array/object hallucinations
            const repairedJsonString = jsonrepair(cleanText);
            parsedData = JSON.parse(repairedJsonString);
        } catch (error) {
            throw new Error(`Could not parse JSON. Raw Gemini Output: ${cleanText.substring(0, 300)}`);
        }

        // If it still returned an array of objects despite the prompt, unwrap it
        if (Array.isArray(parsedData)) {
            if (parsedData.length > 0) parsedData = parsedData[0];
            else throw new Error("AI returned an empty JSON array.");
        }

        // ── IMAGE CACHING PIPELINE ─────────────────────────────────
        // Cache images from ephemeral sources like Instagram/TikTok
        if (parsedData.imageUrl && url) {
            // Hard clean the URL
            parsedData.imageUrl = parsedData.imageUrl.trim().replace(/[.,!?;]+$/, "");
            
            const cachedUrl = await performImageCaching(parsedData.imageUrl, url);
            if (cachedUrl) {
                parsedData.imageUrl = cachedUrl;
            }
        }
        // ── END IMAGE CACHING PIPELINE ──────────────────────────────

        // ── COMMUNITY RECIPE PIPELINE ──────────────────────────────
        // For anonymous (free-tier) users, store an anonymized copy
        // in public_recipes for the future Discover feature.
        if (!callerUserId && parsedData.title && url) {
            try {
                const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
                const serviceClient = createClient(
                    Deno.env.get("SUPABASE_URL")!,
                    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
                );

                // Build a content hash for deduplication
                const ingNames = (parsedData.ingredients || [])
                    .slice(0, 3)
                    .map((i: any) => (i.name || i.text || "").toLowerCase().trim())
                    .join("|");
                const contentHash = `${parsedData.title.toLowerCase().trim()}::${ingNames}`;

                // Extract domain from URL
                let sourceDomain = "";
                try { sourceDomain = new URL(url).hostname.replace("www.", ""); } catch {}

                // Generate SEO-friendly slug from title
                const baseSlug = parsedData.title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "")
                    .substring(0, 80);
                const slugSuffix = Math.random().toString(36).substring(2, 6);
                const slug = `${baseSlug}-${slugSuffix}`;

                // Try insert; on duplicate hash, increment save_count
                const { error: insertErr } = await serviceClient
                    .from("public_recipes")
                    .upsert({
                        title: parsedData.title,
                        description: parsedData.description || null,
                        image_url: parsedData.imageUrl || null,
                        servings: parsedData.servings || null,
                        prep_time: parsedData.prepTime || null,
                        cook_time: parsedData.cookTime || null,
                        ingredients: parsedData.ingredients || [],
                        steps: parsedData.steps || [],
                        tags: parsedData.tags || [],
                        source_url: url,
                        source_domain: sourceDomain,
                        content_hash: contentHash,
                        slug: slug,
                        calories: parsedData.calories || null,
                        protein: parsedData.protein || null,
                        fat: parsedData.fat || null,
                        carbs: parsedData.carbs || null,
                        sugar: parsedData.sugar || null,
                        fiber: parsedData.fiber || null,
                        sodium: parsedData.sodium || null,
                    }, { onConflict: "content_hash", ignoreDuplicates: false });

                if (insertErr) {
                    // If upsert failed, try to just increment save_count on existing
                    await serviceClient.rpc("increment_save_count", { hash: contentHash }).catch(() => {});
                    console.log(`[Community] Duplicate recipe, incremented save_count`);
                } else {
                    console.log(`[Community] Stored new community recipe: ${parsedData.title}`);
                }
            } catch (e) {
                // Fire-and-forget — never block the user's response
                console.log(`[Community] Pipeline error (non-blocking):`, e);
            }
        }
        // ── END COMMUNITY PIPELINE ─────────────────────────────────

        return new Response(JSON.stringify(parsedData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});

/**
 * Shared logic to download an image from an ephemeral URL and upload to Supabase Storage.
 */
async function performImageCaching(imageUrl: string, sourceUrl: string): Promise<string | null> {
    try {
        const problematicDomains = ["instagram.com", "tiktok.com", "facebook.com", "fb.watch", "pinterest.com"];
        let sourceDomain = "";
        try { sourceDomain = new URL(sourceUrl).hostname.replace("www.", ""); } catch {}

        const isEphemeral = problematicDomains.some(d => sourceDomain.includes(d));
        if (!isEphemeral && !imageUrl.includes("tiktokcdn") && !imageUrl.includes("cdninstagram.com") && !imageUrl.includes("scontent")) {
            return null;
        }

        console.log(`[Storage] Image caching started for: ${sourceDomain}`);
        
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const serviceClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // 1. Download the image
        const imgResp = await fetch(imageUrl.trim().replace(/[.,!?;]+$/, ""), {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" }
        });
        
        if (!imgResp.ok) {
            console.error(`[Storage] Failed to download image: ${imgResp.status}`);
            return null;
        }

        const contentType = imgResp.headers.get("content-type") || "image/jpeg";
        const buffer = await imgResp.arrayBuffer();
        
        // 2. Generate unique filename based on the URL hash
        const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(imageUrl));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
        const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
        const fileName = `social-cache/${hashHex}.${ext}`;

        // 3. Upload to Supabase Storage
        const { data: uploadData, error: uploadErr } = await serviceClient.storage
            .from("recipe-images")
            .upload(fileName, buffer, {
                contentType,
                upsert: true
            });

        if (uploadErr) {
            console.error(`[Storage] Upload failed:`, uploadErr);
            return null;
        }

        // 4. Return the public URL
        const { data: { publicUrl } } = serviceClient.storage
            .from("recipe-images")
            .getPublicUrl(fileName);
        
        console.log(`[Storage] Image cached successfully: ${publicUrl}`);
        return publicUrl;
    } catch (e) {
        console.error(`[Storage] performImageCaching error:`, e);
        return null;
    }
}
