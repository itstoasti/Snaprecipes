import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";

const FOOD_ANALYSIS_PROMPT = `You are an expert clinical dietitian and food identification specialist. Your job is to identify foods with extreme precision and provide USDA-grade nutritional data. Accuracy is critical — users depend on this for health and diet tracking.

Return exactly ONE valid JSON object matching this schema:
{
  "items": [
    {
      "food_name": "the MOST SPECIFIC name possible (see rules below)",
      "serving_size": "standard serving with weight (e.g. '1 medium (182g)', '1 cup (240ml)', '100g')",
      "calories": 95,
      "protein": 0.5,
      "fat": 0.3,
      "carbs": 25
    }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": "any relevant notes about assumptions made"
}

CRITICAL IDENTIFICATION RULES:
1. FOOD NAME PRECISION: Use the most specific, descriptive name you can. NEVER use a generic name when a more specific one applies:
   - BAD: "Donut" → GOOD: "Glazed Cinnamon Roll Donut"
   - BAD: "Chicken" → GOOD: "Grilled Chicken Breast, Skinless"
   - BAD: "Salad" → GOOD: "Caesar Salad with Croutons and Parmesan"
   - BAD: "Coffee" → GOOD: "Latte, Whole Milk, 16oz"
   Include the preparation method (grilled, fried, baked), variety (Fuji apple vs Granny Smith), toppings, glazes, fillings, and style.

2. For TEXT QUERIES: Cross-reference your knowledge of USDA FoodData Central nutritional data. Return the most commonly consumed version of that food unless the user specifies otherwise. Always use realistic serving sizes.

3. For IMAGES — LOOK CAREFULLY:
   a. First, mentally describe every detail you see: shape, color, texture, glaze, frosting, toppings, layers, size relative to surroundings.
   b. Identify the SPECIFIC type/variant — not just the category. A cinnamon roll-shaped donut with glaze is NOT the same as a plain glazed ring donut.
   c. Estimate portion size using visual cues (plate size, hand for scale, utensils, packaging).
   d. If you see multiple items, list each one separately.
   e. Note the preparation method visible (fried = darker/crispier vs baked = lighter).

4. NUTRITIONAL ACCURACY:
   - All macro values are per the stated serving size.
   - Protein, fat, carbs in grams.
   - Use standard USDA serving sizes when possible.
   - When estimating for restaurant/bakery items, account for the fact that they typically contain MORE fat, carbs, and calories than home-prepared versions.
   - Round to 1 decimal place for macros, whole numbers for calories.

5. CONFIDENCE LEVELS:
   - "high": Common food, clearly identified, USDA data available
   - "medium": Food identified but portion estimated, or slight ambiguity in preparation
   - "low": Unclear image, unusual food, or significant estimation required

6. If multiple items are in a query (e.g. "chicken rice and beans"), return separate items in the array.

7. Output raw JSON only. No markdown code blocks. No extra text.`;

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!GEMINI_KEY) {
            return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { imageBase64, textDescription } = await req.json();

        if (!imageBase64 && !textDescription) {
            return new Response(JSON.stringify({ error: "Provide imageBase64 or textDescription" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`;

        const parts: any[] = [{ text: FOOD_ANALYSIS_PROMPT }];

        if (imageBase64) {
            parts.push({
                inline_data: { mime_type: "image/jpeg", data: imageBase64 },
            });
        } else if (textDescription) {
            parts.push({
                text: `\n\nProvide accurate nutritional information for: "${textDescription}"`,
            });
        }

        const payload = {
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
            },
            contents: [{ parts }],
        };

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
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiText) throw new Error("Empty response from Gemini");

        let parsed;
        try {
            parsed = JSON.parse(aiText.trim());
        } catch {
            const jsonMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1].trim());
            } else {
                throw new Error("Failed to parse AI response as JSON");
            }
        }

        // ── Save to global foods database (fire-and-forget) ──
        if (parsed.items && Array.isArray(parsed.items) && textDescription) {
            try {
                const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
                const serviceClient = createClient(
                    Deno.env.get("SUPABASE_URL")!,
                    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
                );

                for (const item of parsed.items) {
                    const nameKey = (item.food_name || "").toLowerCase().trim();
                    if (!nameKey) continue;

                    await serviceClient
                        .from("global_foods")
                        .upsert({
                            food_name: item.food_name,
                            food_name_lower: nameKey,
                            serving_size: item.serving_size || "1 serving",
                            calories: item.calories || 0,
                            protein: item.protein || 0,
                            fat: item.fat || 0,
                            carbs: item.carbs || 0,
                            sugar: item.sugar || null,
                            fiber: item.fiber || null,
                            sodium: item.sodium || null,
                            source: "ai",
                            lookup_count: 1,
                        }, { onConflict: "food_name_lower", ignoreDuplicates: false })
                        .then(({ error }) => {
                            if (error) {
                                // If upsert failed (table may not exist yet), just log it
                                console.log(`[Global Foods] Upsert skipped:`, error.message);
                            } else {
                                console.log(`[Global Foods] Saved: ${item.food_name}`);
                            }
                        });
                }
            } catch (e) {
                // Fire-and-forget — never block the response
                console.log(`[Global Foods] Pipeline error (non-blocking):`, e);
            }
        }

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
