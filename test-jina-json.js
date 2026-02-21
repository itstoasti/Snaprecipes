
async function test() {
    try {
        const url = "https://r.jina.ai/https://www.instagram.com/reel/C8q_wPkuJ2g/";
        const res = await fetch(url, {
            headers: {
                "Accept": "application/json"
            },
           signal: AbortSignal.timeout(10000)
        });
        const json = await res.json();
        console.log("Jina JSON title:", json.data.title);
        console.log("Jina JSON image in data?", !!json.data.image);
        if (json.data.image) {
            console.log("Image URL:", json.data.image);
        }
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();

