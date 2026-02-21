
const { getLinkPreview } = require("link-preview-js");

async function test() {
    try {
        const url = "https://www.instagram.com/reel/C8q_wPkuJ2g/";
        console.log("Fetching with link-preview-js...");
        const preview = await getLinkPreview(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
            },
            followRedirects: "follow",
            timeout: 10000
        });
        console.log("Preview:", JSON.stringify(preview, null, 2));
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();

