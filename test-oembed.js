
async function test() {
    try {
        const url = "https://graph.facebook.com/v18.0/instagram_oembed?url=https://www.instagram.com/reel/C8q_wPkuJ2g/&access_token=123";
        // IG oembed requires access tokens now. Let us try the ?__a=1&__d=dis endpoint
        const api1 = "https://www.instagram.com/reel/C8q_wPkuJ2g/?__a=1&__d=dis";
        const res1 = await fetch(api1, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            },
             signal: AbortSignal.timeout(5000)
        });
        const json = await res1.json();
        console.log("JSON KEYS:", Object.keys(json));
        if (json.items && json.items[0]) {
             console.log("Image:", json.items[0].image_versions2);
        }
    } catch (e) {
        console.log(e);
    }
}
test();

