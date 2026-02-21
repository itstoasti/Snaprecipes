
async function test() {
    try {
        const url = "https://api.dub.co/metatags?url=https://www.instagram.com/reel/C8q_wPkuJ2g/";
        const res = await fetch(url);
        const json = await res.json();
        console.log("Dub image:", json.image);
    } catch (e) {
        console.log(e);
    }
}
test();

