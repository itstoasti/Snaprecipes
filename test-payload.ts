import { getLinkPreview } from "link-preview-js";

async function testExtraction() {
    const url = "https://www.instagram.com/p/C1ulXU5q5j5/?igsh=bG1zZ3BjdnFob3Js";
    let markdownContent = "";
    let socialCaption = "";
    let ogImage = "";

    try {
        const preview: any = await getLinkPreview(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; SnapRecipes/1.0)" },
            timeout: 5000,
        });
        if (preview && preview.images && preview.images.length > 0) {
            ogImage = preview.images[0];
        }
        if (preview && preview.description) {
            socialCaption = `\n\n--- Social Media Metadata / Caption ---\nTitle: ${preview.title || "Unknown"}\nCaption: ${preview.description}`;
        }
    } catch (e) {
        console.log("Failed OG", e);
    }

    try {
        const response = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; SnapRecipes/1.0)",
                "Accept": "text/event-stream, text/plain",
            },
        });
        markdownContent = await response.text();
    } catch (e) {
        console.log("Failed Jina", e);
    }

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

    console.log("Sending payload...");
    const supabaseUrl = 'https://omfmcjmebejcsityvtgx.supabase.co';
    const supabaseKey = 'sb_publishable_Fo9XJu4kuLhwcR81nvuxWw_JiCXHXsJ';
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

    try {
        const res = await fetch(`${supabaseUrl}/functions/v1/extract-recipe`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                url, 
                contentForAI,
                prompt: RECIPE_PROMPT,
                provider: 'gemini',
                geminiModel: 'gemini-2.5-flash'
            })
        });
        
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response Body:\n${text}`);
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

testExtraction();
