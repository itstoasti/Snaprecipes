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
    { "text": "full ingredient line", "quantity": "string", "unit": "string", "name": "string" }
  ],
  "steps": [
    // Extract ALL available step-by-step instructions as objects in this array
    { "text": "instruction step", "stepNumber": 1 }
  ],
  "tags": ["category list"]
}

CRITICAL RULES:
1. You MUST include EVERY key from the schema above. NEVER omit 'ingredients' or 'steps'.
2. If an array is missing from the text (e.g. no step-by-step instructions exist), you MUST output an empty array: "steps": [].
3. If an ingredient list is present but instructions are missing, you MUST STILL extract the ENTIRE ingredients list!
4. Output raw JSON ONLY. No markdown blocks.
5. NEVER truncate or abbreviate. Include EVERY SINGLE step and ingredient. If there are 10 steps, output all 10. If there are 30 ingredients, output all 30.
6. For social media content (TikTok, Instagram), infer the recipe from the caption/description. The caption often describes the full recipe even without a structured format.
7. For imageUrl: select the URL showing the finished food dish. NEVER use profile pictures, logos, or avatars.`;

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

        const { url, contentForAI: clientContent, scrapeFailed, imageBase64, prompt, provider, geminiModel } = await req.json();

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
        
        if (url && scrapeFailed && !imageBase64) {
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
            const targetModel = geminiModel || "gemini-2.5-flash";
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`;

            const payload: any = {
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 65536,
                    responseMimeType: "application/json",
                },
                contents: [{ parts: [] }]
            };

            if (imageBase64) {
                payload.contents[0].parts.push({ text: activePrompt });
                payload.contents[0].parts.push({
                    inline_data: { mime_type: "image/jpeg", data: imageBase64 }
                });
            } else if (contentForAI) {
                payload.contents[0].parts.push({
                    text: `${activePrompt}\n\n---\n\n${contentForAI}`
                });
            } else {
                return new Response(JSON.stringify({ error: "Provide contentForAI or imageBase64" }), { status: 400, headers: corsHeaders });
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Gemini Error: ${err}`);
            }

            const data = await response.json();
            aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
