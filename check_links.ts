import { prisma } from './lib/db/prisma';

async function main() {
    console.log('=== Checking all people for officialLinks issues ===\n');

    const people = await prisma.people.findMany({
        where: {
            officialLinks: { not: { equals: null } }
        },
        select: {
            id: true,
            name: true,
            officialLinks: true
        }
    });

    const problemPeople: any[] = [];

    for (const person of people) {
        const links = person.officialLinks as any[];
        if (!links || links.length === 0) continue;

        for (const link of links) {
            // Check if link uses platform instead of type
            if (link.platform && !link.type) {
                problemPeople.push({
                    id: person.id,
                    name: person.name,
                    issue: `Uses 'platform' (${link.platform}) instead of 'type'`,
                    link
                });
            }
            // Check if neither type nor platform exists
            if (!link.type && !link.platform) {
                problemPeople.push({
                    id: person.id,
                    name: person.name,
                    issue: 'Missing both type and platform',
                    link
                });
            }
        }
    }

    console.log(`Found ${problemPeople.length} link issues in ${people.length} people:\n`);

    for (const p of problemPeople) {
        console.log(`- ${p.name} (${p.id}): ${p.issue}`);
        console.log(`  Link: ${JSON.stringify(p.link)}`);
    }

    // Check for people missing content channel handles
    console.log('\n\n=== People missing content channel info ===\n');

    const allPeople = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            officialLinks: true,
            _count: {
                select: { rawPoolItems: true }
            }
        },
        orderBy: { name: 'asc' }
    });

    const missingChannels = [];
    for (const p of allPeople) {
        const links = (p.officialLinks as any[]) || [];
        const hasTwitter = links.some(l => (l.type === 'twitter' || l.platform === 'twitter'));
        const hasGithub = links.some(l => (l.type === 'github'));
        const hasYoutube = links.some(l => (l.type === 'youtube'));
        const hasWebsite = links.some(l => (l.type === 'website' || l.type === 'blog'));

        const missingList = [];
        if (!hasTwitter) missingList.push('Twitter');
        if (!hasGithub) missingList.push('GitHub');
        if (!hasYoutube) missingList.push('YouTube');
        if (!hasWebsite) missingList.push('Website');

        if (missingList.length > 0) {
            missingChannels.push({
                name: p.name,
                id: p.id,
                missing: missingList,
                rawPoolItems: p._count.rawPoolItems
            });
        }
    }

    console.log(`People missing channels: ${missingChannels.length} / ${allPeople.length}\n`);
    for (const p of missingChannels) {
        console.log(`- ${p.name}: Missing [${p.missing.join(', ')}] (${p.rawPoolItems} items)`);
    }
}

main().catch(console.error).finally(() => process.exit(0));
