import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";

const NARRATION_PROMPT = `You are a warm, witty sous-chef in a home kitchen keeping a home cook entertained while their recipe is cooking in the pot.

You will receive a snippet of context about a recipe being imported (title, caption, or scraped text). Write 5 short, delightful cooking-focused one-liners about food, cooking, ingredients, and flavor.

RULES:
- Each line MUST be 70 characters or fewer.
- Focus strictly on cooking, culinary techniques, flavor, ingredients, and kitchen joy.
- NEVER mention AI, tech, algorithms, neural networks, robots, or software.
- Tie the humor/warmth to the SPECIFIC dish or ingredients when the context makes it obvious. If vague, use general cooking & food passion.
- Tone: warm, encouraging, witty, like a friendly chef sidekick.
- Vary the style across the 5 lines: one culinary pun, one kitchen tip, one ingredient compliment, one cooking observation, one wildcard.
- No emojis. No quotation marks around the lines.
- Return raw JSON only: {"lines": ["...", "...", "...", "...", "..."]}`;

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { snippet } = await req.json();

        if (!snippet || typeof snippet !== "string" || !snippet.trim()) {
            return new Response(JSON.stringify({ error: "Provide a non-empty snippet" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!GEMINI_KEY) {
            return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                generationConfig: {
                    temperature: 0.95,
                    maxOutputTokens: 1024,
                    responseMimeType: "application/json",
                },
                contents: [{
                    parts: [{
                        text: `${NARRATION_PROMPT}\n\n--- Recipe context ---\n${snippet.substring(0, 1200)}`,
                    }],
                }],
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini Error: ${err}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty response from AI");

        let parsed;
        try {
            parsed = JSON.parse(text.trim());
        } catch {
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1].trim());
            } else {
                throw new Error("Failed to parse AI response as JSON");
            }
        }

        const lines = Array.isArray(parsed.lines)
            ? parsed.lines.filter((l: any) => typeof l === "string" && l.trim().length > 0).slice(0, 6)
            : [];

        return new Response(JSON.stringify({ lines }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
