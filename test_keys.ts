
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        env[match[1].trim()] = value;
    }
});

const GOOGLE_API_KEY = env.GOOGLE_API_KEY;
const XAI_API_KEY = env.XAI_API_KEY;

async function testYouTube() {
    console.log('Testing YouTube API...');
    if (!GOOGLE_API_KEY) {
        console.error('❌ GOOGLE_API_KEY not found');
        return;
    }
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=Elon+Musk&type=video&maxResults=1&key=${GOOGLE_API_KEY}`);
        const data = await response.json();
        if (response.ok) {
            console.log('✅ YouTube API working. Found:', data.items?.length, 'videos');
        } else {
            console.error('❌ YouTube API failed:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('❌ YouTube API error:', e);
    }
}

async function testGrok() {
    console.log('\nTesting Grok/XAI API...');
    if (!XAI_API_KEY) {
        console.error('❌ XAI_API_KEY not found');
        return;
    }
    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${XAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'grok-beta',
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10
            }),
        });
        const data = await response.json();
        if (response.ok) {
            console.log('✅ Grok API working.');
        } else {
            console.error('❌ Grok API failed:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('❌ Grok API error:', e);
    }
}

async function main() {
    await testYouTube();
    await testGrok();
}

main();
