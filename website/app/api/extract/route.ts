import { NextRequest, NextResponse } from "next/server";

function extractRecipeSection(content: string, maxChars: number = 40000): string {
    if (content.length <= maxChars) return content;

    const markers = [
        /\n#+\s*Ingredients\b/i,
        /\n\s*\*\*Ingredients\*\*/i,
        /\n\s*Ingredients\s*(?:\n|:)/i,
        /\n#+\s*Directions\b/i,
        /\n#+\s*Instructions\b/i,
        /\n\s*\*\*Instructions\*\*/i,
        /\n\s*Instructions\s*(?:\n|:)/i,
        /\n#+\s*Steps\b/i,
        /\n#+\s*How\s+to\s+Make\b/i,
    ];

    let earliestRecipeStart = -1;
    for (const marker of markers) {
        const match = content.search(marker);
        if (match !== -1 && (earliestRecipeStart === -1 || match < earliestRecipeStart)) {
            earliestRecipeStart = match;
        }
    }

    if (earliestRecipeStart !== -1) {
        const windowStart = Math.max(0, earliestRecipeStart - 1500);
        return content.substring(windowStart, windowStart + maxChars);
    }

    const fallbackMatch = content.search(/\bIngredients\b/i);
    if (fallbackMatch !== -1) {
        const windowStart = Math.max(0, fallbackMatch - 1500);
        return content.substring(windowStart, windowStart + maxChars);
    }

    return content.substring(0, maxChars);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "Please enter a valid recipe URL" }, { status: 400 });
        }

        const trimmedUrl = url.trim();
        try {
            new URL(trimmedUrl);
        } catch {
            return NextResponse.json({ error: "Please enter a valid recipe URL" }, { status: 400 });
        }

        let contentForAI = "";
        let scrapeFailed = true;

        // Step 1: Try server-side Jina scrape first
        try {
            const jinaRes = await fetch(`https://r.jina.ai/${trimmedUrl}`, {
                headers: {
                    "Accept": "text/plain",
                    "User-Agent": "Mozilla/5.0 (compatible; SnapRecipes/1.0)",
                },
                signal: AbortSignal.timeout(15000),
            });

            if (jinaRes.ok) {
                const markdown = await jinaRes.text();
                if (markdown && markdown.length > 200 && !markdown.includes("Just a moment") && !markdown.includes("challenge-platform")) {
                    contentForAI = `Target URL: ${trimmedUrl}\n\nRendered webpage content:\n\n${extractRecipeSection(markdown)}`;
                    scrapeFailed = false;
                }
            }
        } catch (e) {
            console.warn("[Extract API] Jina scrape failed/timed out, falling back to edge function server scrape:", e);
        }

        // Step 2: Call Supabase Edge Function server-to-server
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://omfmcjmebejcsityvtgx.supabase.co";
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

        // Extract Authorization header passed from client session if available
        const clientAuthHeader = request.headers.get("authorization");
        const authHeader = clientAuthHeader || `Bearer ${anonKey}`;

        const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/extract-recipe`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": anonKey,
                "Authorization": authHeader,
            },
            body: JSON.stringify({
                url: trimmedUrl,
                contentForAI,
                scrapeFailed,
            }),
            signal: AbortSignal.timeout(90000), // 90s server timeout
        });

        if (!edgeResponse.ok) {
            const errorText = await edgeResponse.text();
            console.error("[Extract API] Edge function error response:", edgeResponse.status, errorText);
            return NextResponse.json(
                { error: errorText || `Extraction failed with status ${edgeResponse.status}` },
                { status: edgeResponse.status }
            );
        }

        const data = await edgeResponse.json();
        return NextResponse.json(data);
    } catch (err: any) {
        console.error("[Extract API] Server exception:", err);
        if (err?.name === "TimeoutError" || err?.name === "AbortError") {
            return NextResponse.json(
                { error: "Extraction timed out while processing the recipe site. Please try again." },
                { status: 504 }
            );
        }
        return NextResponse.json(
            { error: err?.message || "An unexpected error occurred during extraction." },
            { status: 500 }
        );
    }
}
