
import { prisma } from '../lib/db/prisma';
import { searchExa } from '../lib/datasources/exa';
import { extractTimelineFromText } from '../lib/ai/timelineExtractor';

// Initialize Prisma

async function main() {
    console.log('Starting Deep Data Enrichment for missing dates...');

    // 1. Identify roles with missing start/end dates
    const roles = await prisma.personRole.findMany({
        where: {
            OR: [
                { startDate: null },
                { endDate: null }
            ]
        },
        include: {
            organization: true,
            person: true
        }
    });

    console.log(`Found ${roles.length} roles with missing dates.`);

    // Group by person to avoid redundant searches for the same person
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const personRolesMap = new Map<string, any[]>();
    for (const role of roles) {
        if (!personRolesMap.has(role.personId)) {
            personRolesMap.set(role.personId, []);
        }
        personRolesMap.get(role.personId)?.push(role);
    }

    let updatedCount = 0;

    for (const [personId, personRoles] of personRolesMap) {
        const personName = personRoles[0].person.name;
        const searchName = personName;

        console.log(`\nProcessing ${personName} (${personRoles.length} items)...`);

        for (const role of personRoles) {
            const orgName = role.organization.name; // English name preferred
            const roleName = role.role || '';

            // Skip if start date exists (we mainly care about start date for "Active" status)
            // But if user wants completeness, we check if startDate is null
            if (role.startDate) {
                // If only endDate is missing, it might be "present". 
                // We'll skip for now to focus on the most critical: missing start date.
                continue;
            }

            console.log(`  - Fetching dates for: ${orgName} (${roleName})...`);

            // 2. Active Search
            // Query: "PersonName OrganizationName start date joined"
            const query = `"${searchName}" ${orgName} ${roleName} start date joined when`;

            // Wait a bit to avoid rate limits
            await new Promise(r => setTimeout(r, 1000));

            const results = await searchExa({
                query,
                numResults: 3,
                type: 'neural', // Use neural for better semantic match
                useAutoprompt: true
            });

            if (results.length === 0) {
                console.log('    -> No search results found.');
                continue;
            }

            // 3. AI Extraction
            // Combine texts
            const combinedText = results.map(r => `${r.title}\n${r.text}`).join('\n\n');
            const extractedEvents = await extractTimelineFromText(searchName, combinedText);

            // 4. Match and Update
            // Find the event that matches our current org/role
            const match = extractedEvents.find(e => {
                const eTitle = e.title.toLowerCase();
                const oTitle = orgName.toLowerCase();
                // Simple inclusion check
                return eTitle.includes(oTitle) || oTitle.includes(eTitle);
            });

            if (match && match.startDate) {
                console.log(`    -> Found match: Start=${match.startDate}, End=${match.endDate}, Confidence=${match.confidence}`);

                if (match.confidence > 0.6) {
                    await prisma.personRole.update({
                        where: { id: role.id },
                        data: {
                            startDate: new Date(match.startDate),
                            endDate: match.endDate && match.endDate !== 'present' ? new Date(match.endDate) : null,
                            // We can store metadata about the fix if we had a column, but we don't.
                        }
                    });
                    console.log('    -> Database updated.');
                    updatedCount++;
                } else {
                    console.log('    -> Confidence too low, skipping update.');
                }
            } else {
                console.log('    -> No matching event extracted.');
            }
        }
    }

    console.log(`\nEnrichment complete. Updated ${updatedCount} roles.`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
