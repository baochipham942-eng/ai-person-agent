
import 'dotenv/config';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateText } from 'ai';

// Mock candidates known for having courses
const CANDIDATES = [
    'Andrew Ng',       // Coursera, DeepLearning.ai
    'Andrej Karpathy', // YouTube (CS231n), Zero to Hero
    'Fei-Fei Li',      // Stanford CS231n
    'Yann LeCun'       // NYU Deep Learning
];

async function fetchFromPerplexity(personName: string) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
        console.log('Skipping Perplexity (No API Key)');
        return null;
    }

    console.log(`\n--- Querying Perplexity for ${personName} ---`);
    try {
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    { role: 'system', content: 'You are a helpful research assistant. Return strictly JSON.' },
                    {
                        role: 'user', content: `List online courses created or taught by "${personName}".
Categorize them by Level (Beginner/Intermediate/Advanced) and suggest a recommended learning order.
Include columns: Title, Platform, Link (URL), Type (Public/Paid), Level, Prerequisite.
Return strictly a JSON object: { 
  "courses": [{ 
    "title": "...", 
    "platform": "...", 
    "url": "...", 
    "type": "Public" | "Paid",
    "level": "Beginner" | "Intermediate" | "Advanced",
    "order": 1, // Recommended learning sequence number
    "prerequisite": "..." // Optional title of prerequisite course
  }] 
}`
                    }
                ],
                temperature: 0.1,
            }),
        });

        if (!res.ok) {
            console.error('Perplexity Error:', res.status, await res.text());
            return null;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';

        // Clean markdown code blocks if present
        const jsonStr = content.replace(/```json|```/g, '').trim();
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.log('Raw content (parse failed):', content);
            return null;
        }
    } catch (e) {
        console.error('Fetch error:', e);
        return null;
    }
}

async function fetchFromExa(personName: string) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
        console.log('Skipping Exa (No API Key)');
        return null;
    }

    console.log(`\n--- Querying Exa for ${personName} ---`);
    try {
        const res = await fetch('https://api.exa.ai/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
            body: JSON.stringify({
                query: `"${personName}" online courses coursera udemy edx stanford public paid`,
                numResults: 5,
                type: 'neural',
                contents: {
                    text: { maxCharacters: 2000 }
                }
            }),
        });

        if (!res.ok) {
            console.error('Exa Error:', res.status, await res.text());
            return null;
        }

        const data = await res.json();
        return data.results;
    } catch (e) {
        console.error('Fetch error:', e);
        return null;
    }
}

// ... (imports)
async function extractWithDeepSeek(text: string) {
    try {
        const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });
        const { text: result } = await generateText({
            model: deepseek('deepseek-chat'),
            prompt: `Extract online courses from the following text.
Categorize into "Public" (Free) or "Paid".
Return strictly JSON object: { "courses": [{ "title": "...", "platform": "...", "url": "...", "type": "Public" | "Paid" }] }
Text: ${text.slice(0, 10000)}`
        });
        const jsonStr = result.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('DeepSeek error:', e);
        return null;
    }
}

async function main() {
    const person = 'Andrew Ng';
    console.log(`\n================================`);
    console.log(`Analyzing: ${person}`);
    console.log(`================================`);

    const pplxResult = await fetchFromPerplexity(person);
    if (pplxResult && pplxResult.courses) {
        console.log('\nPerplexity Results:');
        console.log(JSON.stringify(pplxResult.courses, null, 2));
    } else {
        console.log('No results found.');
    }
}

main();
