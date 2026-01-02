import { prisma } from './lib/db/prisma';
import { searchExa } from './lib/datasources/exa';

// Rate limit helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function searchUrlWithExa(name: string, type: 'github' | 'youtube' | 'website'): Promise<{ url: string, handle?: string, title?: string } | null> {
    const typeQueries = {
        github: `site:github.com "${name}"`,
        youtube: `site:youtube.com "${name}" channel`,
        website: `"${name}" personal website blog homepage`
    };

    // For GitHub and YouTube, we can use specific domain constraints
    let includeDomains = undefined;
    if (type === 'github') includeDomains = ['github.com'];
    if (type === 'youtube') includeDomains = ['youtube.com'];

    try {
        const results = await searchExa({
            query: typeQueries[type],
            numResults: 3,
            includeDomains,
            type: 'keyword' // validation: keyword search is often better availability for exact profile matches
        });

        if (!results || results.length === 0) return null;

        // Filter best result
        for (const res of results) {
            const url = res.url;

            if (type === 'github') {
                const match = url.match(/^https:\/\/github\.com\/([a-zA-Z0-9-]+)\/?$/);
                if (match && !match[1].includes('topics') && !match[1].includes('search') && !match[1].includes('orgs')) {
                    return { url, handle: match[1], title: 'GitHub' };
                }
            } else if (type === 'youtube') {
                if (url.includes('/@') || url.includes('/channel/') || url.includes('/user/')) {
                    return { url, title: 'YouTube' };
                }
            } else if (type === 'website') {
                // Heuristics for personal website
                if (!url.includes('wikipedia') && !url.includes('linkedin') && !url.includes('twitter')) {
                    return { url, title: 'Website' };
                }
            }
        }

    } catch (e) {
        console.error(`Error searching ${type} for ${name}:`, e);
    }
    return null;
}

async function main() {
    console.log('=== Accelerated Missing Channel Retrieval (Exa Powered) ===\n');

    const allPeople = await prisma.people.findMany({
        orderBy: { name: 'asc' }
    });

    // Batch process to avoid overwhelming
    const BATCH_SIZE = 1;

    for (let i = 0; i < allPeople.length; i += BATCH_SIZE) {
        const batch = allPeople.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${i + 1} - ${i + batch.length} / ${allPeople.length}...`);

        await Promise.all(batch.map(async (person) => {
            const links = (person.officialLinks as any[]) || [];

            // Check what's missing (Skip Twitter/X)
            const hasGithub = links.some(l => l.type === 'github');
            const hasYoutube = links.some(l => l.type === 'youtube');
            const hasWebsite = links.some(l => l.type === 'website' || l.type === 'blog');

            if (hasGithub && hasYoutube && hasWebsite) return;

            // Parallel search for this person
            const queries = [];
            if (!hasGithub) queries.push(searchUrlWithExa(person.name, 'github').then(res => res ? { ...res, type: 'github' } : null));
            if (!hasYoutube) queries.push(searchUrlWithExa(person.name, 'youtube').then(res => res ? { ...res, type: 'youtube' } : null));
            if (!hasWebsite) queries.push(searchUrlWithExa(person.name, 'website').then(res => res ? { ...res, type: 'website' } : null));

            if (queries.length === 0) return;

            const results = await Promise.all(queries);
            const foundLinks = results.filter(Boolean);

            if (foundLinks.length > 0) {
                console.log(`✅ ${person.name}: Found ${foundLinks.map((l: any) => l.type).join(', ')}`);
                // Append new links
                const updatedLinks = [...links, ...foundLinks];

                await prisma.people.update({
                    where: { id: person.id },
                    data: { officialLinks: updatedLinks }
                });
            } else {
                console.log(`⚪️ ${person.name}: No new valid links found`);
            }
        }));

        // Small buffer between batches
        await sleep(1000);
    }
}

main().catch(console.error).finally(() => process.exit(0));
