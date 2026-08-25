// @ts-nocheck — dev-only Node harness; project has no @types/node
/**
 * Extraction pipeline benchmark.
 *
 * Compares the OLD sequential client scrape (preview -> jina -> direct fetch)
 * against the NEW parallel scrape + deterministic JSON-LD fast path, and
 * measures the full end-to-end time including the edge-function AI call when
 * the fast path is not available.
 *
 * Run: npx ts-node --transpile-only bench-extract.ts
 */

import * as fs from "fs";
import * as path from "path";
import {
    mapJsonLdToExtractedRecipe,
    findIngredientsWindow,
    groupIngredientsFromWindow,
} from "./lib/jsonLdRecipe";

// ── Load .env ────────────────────────────────────────────────────────
try {
    const envFile = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
    for (const line of envFile.split("\n")) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
} catch {}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36";

const TEST_URLS = [
    "https://pinchofyum.com/lemongrass-chicken-with-rice-and-zucchini",
    "https://www.bbcgoodfood.com/recipes/brilliant-banana-loaf",
    "https://cookieandkate.com/vegetarian-stuffed-peppers-recipe/",
    "https://www.allrecipes.com/recipe/23600/banana-banana-bread/",
    "https://www.simplyrecipes.com/recipes/banana_bread/",
];

// ── Scrapers (mirror lib/extract.ts) ─────────────────────────────────

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

function htmlToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<li[^>]*>/gi, "\n- ")
        .replace(/<\/?(h[1-6]|p|div|li|ul|ol|section|article|table|tr|br|header|footer|main|figure|figcaption)[^>]*>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/&#x27;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&frac12;/g, "\u00BD")
        .replace(/&frac14;/g, "\u00BC")
        .replace(/&frac34;/g, "\u00BE")
        .split("\n")
        .map((l) => l.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n")
        .substring(0, 150000);
}

async function scrapePreview(url: string): Promise<{ ogImage: string; ms: number }> {
    const t = Date.now();
    let ogImage = "";
    try {
        const resp = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
            const html = await resp.text();
            const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
            if (m) ogImage = m[1];
        }
    } catch {}
    return { ogImage, ms: Date.now() - t };
}

async function scrapeJina(url: string, signal?: AbortSignal): Promise<{ markdown: string; ok: boolean; ms: number }> {
    const t = Date.now();
    try {
        const resp = await fetch(`https://r.jina.ai/${url}`, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; SnapRecipes/1.0)", "Accept": "text/event-stream, text/plain" },
            signal: signal ?? AbortSignal.timeout(25000),
        });
        if (!resp.ok) return { markdown: "", ok: false, ms: Date.now() - t };
        const markdown = await resp.text();
        const captcha = markdown.includes("Just a moment") || markdown.includes("challenge-platform") || markdown.length < 200;
        return { markdown, ok: !captcha, ms: Date.now() - t };
    } catch {
        return { markdown: "", ok: false, ms: Date.now() - t };
    }
}

async function scrapeDirect(url: string): Promise<{ jsonLd: any; htmlText: string; ms: number }> {
    const t = Date.now();
    try {
        const resp = await fetch(url, {
            headers: { "User-Agent": UA, "Accept": "text/html" },
            redirect: "follow",
            signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok) return { jsonLd: null, htmlText: "", ms: Date.now() - t };
        const html = await resp.text();
        let jsonLd: any = null;
        const matches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
        if (matches) {
            for (const match of matches) {
                const jsonContent = match.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
                try {
                    const found = findRecipeInJsonLd(JSON.parse(jsonContent));
                    if (found) { jsonLd = found; break; }
                } catch {}
            }
        }
        return { jsonLd, htmlText: htmlToText(html), ms: Date.now() - t };
    } catch {
        return { jsonLd: null, htmlText: "", ms: Date.now() - t };
    }
}

function extractRecipeSection(content: string, maxChars: number = 40000): string {
    if (content.length <= maxChars) return content;
    const idx = content.search(/#+\s*Ingredients|\bIngredients\b/i);
    if (idx !== -1) {
        const start = Math.max(0, idx - 2000);
        return content.substring(start, start + maxChars);
    }
    return content.substring(0, maxChars);
}

async function edgeAiCall(url: string, markdown: string, jsonLd: any, scrapeFailed: boolean, ogImage: string): Promise<{ ms: number; title: string }> {
    const t = Date.now();
    let contentForAI = `Target URL: ${url}\n\n`;
    contentForAI += markdown
        ? `Rendered webpage content:\n\n${extractRecipeSection(markdown)}`
        : `(Webpage content could not be directly extracted due to bot protections.)`;
    if (jsonLd) {
        const ld = { ...jsonLd };
        if (markdown && !scrapeFailed) {
            delete ld.recipeIngredient;
            delete ld.recipeInstructions;
        }
        contentForAI += `\n\n--- Structured Recipe Data (JSON-LD) ---\n${JSON.stringify(ld, null, 2)}`;
    }
    if (ogImage) {
        contentForAI += `\n\nIMPORTANT: The original webpage's designated thumbnail image is: ${ogImage}.`;
    }

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/extract-recipe`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "apikey": SUPABASE_KEY,
        },
        body: JSON.stringify({
            url,
            contentForAI,
            scrapeFailed,
            provider: "gemini",
            geminiModel: "gemini-2.5-flash",
            ogImageUrl: ogImage,
        }),
    });
    if (!resp.ok) {
        return { ms: Date.now() - t, title: `EDGE ERROR ${resp.status}` };
    }
    const data = await resp.json();
    return { ms: Date.now() - t, title: data.title || "?" };
}

// ── Benchmark runner ─────────────────────────────────────────────────

interface Row {
    url: string;
    oldSequentialMs: number;
    newParallelMs: number;
    path: string;
    edgeMs: number;
    oldTotalMs: number;
    newTotalMs: number;
    title: string;
    ingredients: number;
    steps: number;
    sections: number;
    hasNutrition: boolean;
}

async function benchUrl(url: string): Promise<Row> {
    console.log(`\n▶ ${url}`);

    // OLD flow: sequential scrapes
    const s1 = Date.now();
    const oldPreview = await scrapePreview(url);
    const oldJina = await scrapeJina(url);
    const oldDirect = await scrapeDirect(url);
    const oldSequentialMs = Date.now() - s1;
    console.log(`  old sequential scrape: ${oldSequentialMs}ms (preview ${oldPreview.ms} / jina ${oldJina.ms} / direct ${oldDirect.ms})`);

    // NEW flow: parallel scrapes with early abort
    const p0 = Date.now();
    const jinaAbort = new AbortController();
    let fastRecipe: any = null;
    let htmlText = "";
    const previewTask = scrapePreview(url);
    const jinaTask = scrapeJina(url, jinaAbort.signal);
    const directTask = scrapeDirect(url).then((r) => {
        htmlText = r.htmlText;
        if (r.jsonLd) {
            fastRecipe = mapJsonLdToExtractedRecipe(r.jsonLd);
            if (fastRecipe) jinaAbort.abort();
            return r;
        }
        return r;
    });
    const [previewRes, jinaRes, directRes] = await Promise.allSettled([previewTask, jinaTask, directTask]);
    const newParallelMs = Date.now() - p0;

    const preview = previewRes.status === "fulfilled" ? previewRes.value : { ogImage: "", ms: 0 };
    const jina = jinaRes.status === "fulfilled" ? jinaRes.value : { markdown: "", ok: false, ms: 0 };
    const direct = directRes.status === "fulfilled" ? directRes.value : { jsonLd: null, htmlText: "", ms: 0 };
    console.log(`  new parallel scrape:    ${newParallelMs}ms`);

    const scrapeFailed = !jina.ok;

    if (fastRecipe) {
        // Deterministic section grouping (edge sections:ai mode not yet deployed)
        let sections = 0;
        const window = findIngredientsWindow(htmlText);
        if (window && window.headings.length >= 1) {
            const grouped = groupIngredientsFromWindow(fastRecipe.ingredients, window);
            if (grouped.sections >= 2 && grouped.matched >= Math.max(2, Math.floor(fastRecipe.ingredients.length * 0.5))) {
                fastRecipe.ingredients = grouped.ingredients;
            }
            sections = new Set(fastRecipe.ingredients.map((i: any) => i.section).filter(Boolean)).size;
        }
        const total = newParallelMs;
        console.log(`  FAST PATH — "${fastRecipe.title}" | ${fastRecipe.ingredients.length} ingredients, ${fastRecipe.steps.length} steps, ${sections} sections | total ${total}ms`);
        return {
            url, oldSequentialMs, newParallelMs, path: "FAST", edgeMs: 0,
            oldTotalMs: oldSequentialMs, newTotalMs: total,
            title: fastRecipe.title,
            ingredients: fastRecipe.ingredients.length,
            steps: fastRecipe.steps.length,
            sections,
            hasNutrition: fastRecipe.calories != null,
        };
    }

    // AI path — single edge call shared by both totals
    const ogImage = preview.ogImage;
    const edge = await edgeAiCall(url, jina.markdown, direct.jsonLd, scrapeFailed, ogImage);
    console.log(`  AI PATH — "${edge.title}" | edge ${edge.ms}ms`);
    return {
        url, oldSequentialMs, newParallelMs, path: "AI", edgeMs: edge.ms,
        oldTotalMs: oldSequentialMs + edge.ms,
        newTotalMs: newParallelMs + edge.ms,
        title: edge.title,
        ingredients: 0, steps: 0, sections: 0, hasNutrition: false,
    };
}

async function main() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env");
        process.exit(1);
    }

    console.log("Snap Recipes extraction benchmark");
    console.log(`Edge: ${SUPABASE_URL}/functions/v1/extract-recipe\n`);

    const rows: Row[] = [];
    for (const url of TEST_URLS) {
        try {
            rows.push(await benchUrl(url));
        } catch (e: any) {
            console.error(`  FAILED: ${e?.message || e}`);
        }
    }

    console.log("\n════════════════════ SUMMARY ════════════════════");
    console.log("path | old scrape | new scrape | edge  | OLD total | NEW total | title");
    for (const r of rows) {
        const host = new URL(r.url).hostname.replace("www.", "");
        console.log(
            `${r.path.padEnd(4)} | ${String(r.oldSequentialMs).padStart(6)}ms | ${String(r.newParallelMs).padStart(6)}ms | ${String(r.edgeMs).padStart(5)}ms | ${String(r.oldTotalMs).padStart(6)}ms | ${String(r.newTotalMs).padStart(6)}ms | ${host} — ${r.title.substring(0, 44)}`
        );
        if (r.path === "FAST") {
            console.log(`       quality: ${r.ingredients} ingredients, ${r.steps} steps, ${r.sections} sections, nutrition=${r.hasNutrition}`);
        }
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
