
async function test() {
    try {
        const url = "https://r.jina.ai/https://www.instagram.com/reel/C8q_wPkuJ2g/";
        const res = await fetch(url, {
            headers: {
                "X-Return-Format": "html"
            }
        });
        const html = await res.text();
        console.log("Jina HTML length:", html.length);
        const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"[^>]*>/i) || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"[^>]*>/i);
        if (ogMatch) {
            console.log("Found Jina og:image:", ogMatch[1]);
        } else {
            console.log("No og:image found in Jina HTML");
            // let us look at all meta tags
            const metas = html.match(/<meta[^>]*>/gi);
            if (metas) console.log(metas.slice(0, 10));
        }
    } catch (e) {
        console.log(e);
    }
}
test();

