
const { getLinkPreview } = require("link-preview-js");

async function test() {
    try {
        const url = "https://www.instagram.com/reel/C8q_wPkuJ2g/";
        console.log("Fetching with link-preview-js...");
        const preview = await getLinkPreview(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            }
        });
        console.log("Preview images:", preview.images);
        console.log("Preview video poster?", preview.videos);
        console.log("Entire preview:", preview);
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();

