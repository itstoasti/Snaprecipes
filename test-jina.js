const fs = require('fs');

async function scrape(url) {
    let markdownContent = "";
    try {
        const response = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "text/event-stream, text/plain",
            },
        });
        markdownContent = await response.text();
    } catch (e) {
        console.error("Jina error", e);
    }

    console.log("MARKDOWN CONTENT PREVIEW:");
    console.log(markdownContent.substring(markdownContent.indexOf("Ingredients") - 100, markdownContent.indexOf("Instructions") + 100));
}

scrape("https://pinchofyum.com/lemongrass-chicken-with-rice-and-zucchini");
