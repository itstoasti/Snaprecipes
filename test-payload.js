const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://omfmcjmebejcsityvtgx.supabase.co'
const supabaseKey = 'sb_publishable_Fo9XJu4kuLhwcR81nvuxWw_JiCXHXsJ'

async function checkBody() {
    console.log('Sending mock payload...')
    try {
        const res = await fetch(`${supabaseUrl}/functions/v1/extract-recipe`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: 'https://www.allrecipes.com/recipe/212721/indian-chicken-curry-murgh-kari/',
                contentForAI: 'Recipe Title: Chicken Curry',
                provider: 'gemini'
            })
        })

        console.log(`Payload Status: ${res.status}`)
        const text = await res.text()
        console.log(`Payload Body: ${text.substring(0, 500)}`)
    } catch (err) {
        console.error('Fetch Error:', err)
    }
}

checkBody()
