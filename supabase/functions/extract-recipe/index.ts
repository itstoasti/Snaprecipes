import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";

const DEFAULT_GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const DEFAULT_OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") || "";

const RECIPE_PROMPT = `You are a recipe extraction expert. Analyze the provided content and extract a structured recipe. Return ONLY valid JSON with this exact schema:
{
  "title": "string - recipe title",
  "description": "string - brief description",
  "imageUrl": "string or null - critically analyze all image URLs in the content. Select the URL that MOST clearly shows the finished food dish or recipe result. DO NOT select profile pictures, logos, avatars, or images of people. If no food image is found, return null.",
  "servings": number,
  "prepTime": "string - e.g. '15 min'",
  "cookTime": "string - e.g. '30 min'",
  "ingredients": [
    { "text": "full ingredient line", "quantity": "number as string", "unit": "cup/tbsp/etc", "name": "ingredient name" }
  ],
  "steps": [
    { "text": "full step instruction", "stepNumber": number }
  ],
  "tags": ["string array of dietary/category tags like 'vegetarian', 'dessert', 'quick', etc"]
}
If any field is unknown, use null for strings and reasonable defaults for numbers. Ensure ingredients have properly parsed quantities. Output raw JSON without markdown formatting blocks.`;

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
                    maxOutputTokens: 4096,
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

        // Parse and return (let the client handle standard validation)
        let parsedData;
        try {
            parsedData = JSON.parse(aiResponseText);
        } catch {
            const jsonMatch = aiResponseText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) parsedData = JSON.parse(jsonMatch[1]);
            else throw new Error("Could not parse JSON from AI response.");
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
