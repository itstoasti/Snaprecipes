import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("url");
    if (!url) {
        return new NextResponse("Missing url parameter", { status: 400 });
    }

    try {
        // Validate URL
        new URL(url);
    } catch {
        return new NextResponse("Invalid URL", { status: 400 });
    }

    try {
        // First try: Jina Reader API (returns clean markdown)
        const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                "Accept": "text/plain",
                "User-Agent": "Mozilla/5.0 (compatible; SnapRecipes/1.0)",
            },
            signal: AbortSignal.timeout(15000),
        });

        if (jinaRes.ok) {
            const text = await jinaRes.text();
            if (text && text.length > 200 && !text.includes("Just a moment") && !text.includes("challenge-platform")) {
                return new NextResponse(text, {
                    status: 200,
                    headers: { "Content-Type": "text/plain" },
                });
            }
        }

        // Second try: Direct fetch with browser-like UA + JSON-LD extraction
        const directRes = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(10000),
        });

        if (directRes.ok) {
            const html = await directRes.text();
            if (html.includes("Just a moment") || html.includes("challenge-platform") || html.length < 500) {
                return new NextResponse("Captcha or blocked page", { status: 502 });
            }

            // Try to extract JSON-LD recipe data
            const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
            let jsonLdContent = "";
            if (jsonLdMatches) {
                for (const match of jsonLdMatches) {
                    const jsonContent = match.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
                    try {
                        const parsed = JSON.parse(jsonContent);
                        if (JSON.stringify(parsed).toLowerCase().includes("recipe")) {
                            jsonLdContent += `\n\n--- Structured Recipe Data (JSON-LD) ---\n${JSON.stringify(parsed, null, 2)}`;
                        }
                    } catch {
                        // Not valid JSON, skip
                    }
                }
            }

            // Strip HTML to text
            const textContent = html
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();

            const result = jsonLdContent
                ? `${textContent.substring(0, 10000)}${jsonLdContent}`
                : textContent.substring(0, 15000);

            return new NextResponse(result, {
                status: 200,
                headers: { "Content-Type": "text/plain" },
            });
        }

        return new NextResponse("Failed to scrape", { status: 502 });
    } catch (e: any) {
        console.error("Scrape proxy error:", e);
        return new NextResponse(e.message || "Scrape failed", { status: 502 });
    }
}
