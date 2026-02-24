const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://omfmcjmebejcsityvtgx.supabase.co';
const supabaseKey = 'sb_publishable_Fo9XJu4kuLhwcR81nvuxWw_JiCXHXsJ';

async function testFullExtraction() {
    const url = 'https://www.instagram.com/p/C1ulXU5q5j5/?igsh=bG1zZ3BjdnFob3Js';

    console.log(`Scraping URL via Jina...`);
    let markdownContent = "";
    try {
        const response = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; SnapRecipes/1.0)",
                "Accept": "text/event-stream, text/plain",
            },
        });
        markdownContent = await response.text();
    } catch (e) {
        console.error("Jina error", e);
    }

    let contentForAI = `Target URL: ${url}\n\n`;
    if (markdownContent) {
        contentForAI += `Rendered webpage content:\n\n${markdownContent.substring(0, 15000)}`;
    }

    console.log(`Sending payload of length ${contentForAI.length} to Edge Function...`);
    // Output the raw Jina content so we can see if Instagram is blocking it
    console.log("=== RAW JINA CONTENT START ===");
    console.log(markdownContent);
    console.log("=== RAW JINA CONTENT END ===\n");

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
                provider: 'gemini',
                geminiModel: 'gemini-2.5-flash'
            })
        });

        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response Body: ${text.substring(0, 1000)}`);
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

testFullExtraction();
