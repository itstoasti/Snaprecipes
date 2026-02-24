const activeKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "YOUR_KEY_HERE_BUT_WE_WILL_INJECT";

async function testGeminiDirect() {
    const url = "https://www.instagram.com/p/C1ulXU5q5j5/?igsh=bG1zZ3BjdnFob3Js";
    // Mocking the content extracted earlier
    const contentForAI = `Target URL: ${url}\n\n--- Social Media Metadata / Caption ---\nTitle: Daily Nutrition Tips on Instagram: "Quick & Easy Buffalo Chicken Taquitos🍗🔥\n125 Calories & 14g Protein💪🏼\n\nFollow  @goalnutritiontips for all the best high protein recipes in one place!\n\nBy @_aussiefitness\n\nFind this recipe and more in the Elite Low Calorie & High Protein Cookbook Now 50% off! Link in Bio🔥\n\nIf you’re looking for a quick, easy & healthy snack that you can take to work or school these crispy buffalo chicken taquitos pack 14g of protein each & are only 125 calories! You only need a few ingredients & they’re perfect for meal prep.\n\n(Per Serve - 12 Total)\n125 Calories\n10gC | 2.7gF | 14gP\n\nIngredients:\n480g Cooked & Shredded Chicken Breast\n85ml Buffalo Sauce (Franks Redhot Buffalo Sauce)\n120g Low Fat Cream Cheese (or blended low fat cottage cheese for extra protein)\nSmoked Paprika, Garlic Powder, Onion Powder & Ranch Seasoning (Deliciou)\nFinely Sliced Spring Onion/Scallions\n90g Low Fat Cheese (Bega 50% Less Fat Grated Cheese)\n12 Warm Mini Corn Tortillas (Mission Corn Tortillas)\nLight Cooking Oil Spray (Frylight)\n(Optional Topping) Low Fat Greek Yoghurt + Ranch Seasoning, Chives & Buffalo Sauce\n\nIMPORTANT NOTES:\nPlace half of the tortillas onto a plate with a damp paper towel on top & microwave for 25 - 45 seconds. This step is crucial to ensure the tortillas don’t break when rolling them.\n\nCooking Times:\n\nAir Fry = 10 - 15 Min 200°C or 400°F (flip half way)\nOven Bake = 20 - 25 Min 190°C or 380°F (flip half way)\n(times may vary slightly depending on the air fryer/oven)\n\n#taquitos #mexicanfood #chickenrecipes #chicken  #mexicancuisine #healthy #mealprep #easyrecipe #healthyrecipes #lowcalorie #weightloss #fatloss #gymfood #highprotein #macrofriendly #lowcaloriemeals #highproteinmeals"\n\nIMPORTANT: The original webpage's designated thumbnail image is: https://scontent-lax3-1.cdninstagram.com/v/t51.71878-15/624832090_1681105226191841_9112042845446584573_n.jpg?stp=cmp1_dst. If you cannot find a better photo of the finished dish in the text above, you MUST use this URL as the \`imageUrl\`.`;

    const RECIPE_PROMPT = `You are a world-class recipe extraction expert. Critically analyze the provided content and meticulously extract every piece of recipe information. Return ONLY valid JSON with this exact schema:
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
CRITICAL RULES:
1. Do NOT return an array of recipes. Return exactly ONE JSON object.
2. You MUST include ALL keys defined in the schema in your response. NEVER omit a key.
3. If an array (like ingredients or steps) is not found in the source text, return an empty array []. If a string is missing, return null.
4. Even if there are no step-by-step cooking instructions, you MUST STILL extract the "ingredients" if they are present in the text!
5. Output raw JSON without markdown formatting blocks.`;

    // Fetch the key manually from .env file to make it standalone
    const fs = require('fs');
    const env = fs.readFileSync('.env', 'utf8');
    const geminiKeyLine = env.split('\\n').find((line: string) => line.startsWith('EXPO_PUBLIC_GEMINI_API_KEY='));
    const geminiKey = geminiKeyLine ? geminiKeyLine.split('=')[1].trim() : "";

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

    const payload: any = {
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
        },
        contents: [{ 
            parts: [
                { text: `${RECIPE_PROMPT}\n\n---\n\n${contentForAI}` }
            ] 
        }]
    };

    console.log("Sending...");
    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("RAW GEMINI RESPONSE:");
    console.log(JSON.stringify(data, null, 2));
}

testGeminiDirect();
