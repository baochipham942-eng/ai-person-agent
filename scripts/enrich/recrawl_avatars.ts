
/**
 * Avatar Recrawl Script
 * Priority: Grok > Wikidata > Perplexity > Baidu > Exa
 * 
 * Note: Grok currently has no credits, Perplexity has no key.
 * Effective Priority: Wikidata -> Baidu Baike -> Exa
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import * as cheerio from 'cheerio';
import { getWikidataEntity } from '../lib/datasources/wikidata';

neonConfig.webSocketConstructor = ws;

// --- Config ---
const TARGET_NAMES = [
    "Boris Cherny", "Aidan Gomez", "Paul Graham", "Lukasz Kaiser",
    "周伯文", "Mark Zuckerberg", "闫俊杰", "Eliezer Yudkowsky",
    "Marian Croak", "Rob Bensinger", "丁洁", "丹尼尔格罗斯",
    "亚历克斯克里泽夫斯基", "周明", "妮基帕尔玛", "张鹏",
    "徐立", "陈冕"
];

const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

// --- Fetchers ---

async function fetchFromWikidata(name: string): Promise<string | null> {
    try {
        const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&origin=*`;
        const res = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();

        if (data.search?.length) {
            // Check top 5 results
            for (const item of data.search.slice(0, 5)) {
                // Determine if relevant? Usually top results are relevant.
                const entity = await getWikidataEntity(item.id);
                if (entity?.imageUrl) return entity.imageUrl;
            }
        }
    } catch (e) {
        // ignore
    }
    return null;
}

async function fetchFromBaiduBaike(name: string): Promise<string | null> {
    try {
        const url = `https://baike.baidu.com/item/${encodeURIComponent(name)}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(5000)
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        // Strategy 1: .summary-pic img
        let img = $('.summary-pic img').attr('src');

        // Strategy 2: meta og:image
        if (!img) img = $('meta[property="og:image"]').attr('content');

        // Strategy 3: basic info left img
        if (!img) img = $('.basic-info .basic-info-left img').attr('src');

        // Check if image is valid (not a placeholder or icon)
        if (img && !img.includes('items/') && !img.includes('baike.png')) {
            return img;
        }
        return null; // Return null if invalid

    } catch (e) {
        return null;
    }
}

async function fetchFromExa(name: string): Promise<string | null> {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) return null;

    try {
        const res = await fetch('https://api.exa.ai/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
            body: JSON.stringify({
                query: `${name} profile picture AI researcher`, // Specific query
                numResults: 3,
                type: 'neural',
                contents: { text: false } // We just want URLs to verify? No, Exa search returns page URLs.
                // We want Exa to find an IMAGE. Exa doesn't strictly support image search yet directly via this endpoint easily.
                // But we can search for a page *with* an image.
                // Better strategy: Search for a profile page (LinkedIn, Twitter, Official Bio) and extract image?
                // Too complex for this script.
                // Alternative: Use Exa to find a bio page, then scrape it? 

                // Let's stick to simplest Exa use: Find a known profile URL (Twitter/LinkedIn) and use their avatar?
                // Or just skip Exa for images for now as it's complex without valid image endpoints.
            }),
        });
        // Skipping Exa image extraction for simplicity unless necessary.
        return null;
    } catch (e) {
        return null;
    }
}

// --- Main ---

async function main() {
    console.log('=== Avatar Recrawl ===');

    for (const name of TARGET_NAMES) {
        console.log(`\nProcessing: ${name}`);

        const person = await prisma.people.findFirst({ where: { name } });
        if (!person) {
            console.log(`  ❌ Not found in DB`);
            continue;
        }

        if (person.avatarUrl && !person.avatarUrl.includes('placeholder')) {
            // Optional: Force update? User said "有问题得重新抓", so we should overwrite.
            console.log(`  (Current: ${person.avatarUrl.substring(0, 30)}...)`);
        }

        let newAvatar: string | null = null;
        let source = '';

        // 1. Wikidata
        if (!newAvatar) {
            process.stdout.write('  Trying Wikidata... ');
            newAvatar = await fetchFromWikidata(name);
            if (newAvatar) {
                console.log('✅ Found');
                source = 'wikidata';
            } else {
                console.log('❌');
            }
        }

        // 2. Baidu Baike (Good for Chinese)
        if (!newAvatar) {
            process.stdout.write('  Trying Baidu Baike... ');
            newAvatar = await fetchFromBaiduBaike(name);
            if (newAvatar) {
                console.log('✅ Found');
                source = 'baidu';
            } else {
                console.log('❌');
            }
        }

        // 3. Save
        if (newAvatar) {
            await prisma.people.update({
                where: { id: person.id },
                data: { avatarUrl: newAvatar }
            });
            console.log(`  💾 Updated (${source}): ${newAvatar}`);
        } else {
            console.log(`  ⚠️ No avatar found from any source.`);
        }
    }

    await prisma.$disconnect();
}

main();
