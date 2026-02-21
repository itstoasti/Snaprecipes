const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://omfmcjmebejcsityvtgx.supabase.co'
const supabaseKey = 'sb_publishable_Fo9XJu4kuLhwcR81nvuxWw_JiCXHXsJ'

async function checkDeployStatus() {
    console.log('Checking if the Edge Function is reachable...')
    try {
        const res = await fetch(`${supabaseUrl}/functions/v1/extract-recipe`, {
            method: 'OPTIONS', // Just a preflight to verify it's up without hitting AI
            headers: {
                'Authorization': `Bearer ${supabaseKey}`
            }
        })
        console.log(`Preflight Status: ${res.status}`)
        const text = await res.text()
        console.log(`Preflight Body: ${text}`)
    } catch (err) {
        console.error('Fetch Error:', err)
    }
}

checkDeployStatus()
