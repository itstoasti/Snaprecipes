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
4. Output raw JSON ONLY. No markdown blocks.`;

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { url, contentForAI, imageBase64, prompt, provider, geminiModel } = await req.json();

        const activeProvider = provider || "gemini";
        const activeKey = activeProvider === "openai" ? DEFAULT_OPENAI_KEY : DEFAULT_GEMINI_KEY;
        const activePrompt = prompt || RECIPE_PROMPT;

        if (!activeKey) {
            return new Response(JSON.stringify({ error: `Missing API key for ${activeProvider}. Please configure Supabase Edge Function Secrets.` }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
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
                    maxOutputTokens: 8192,
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
