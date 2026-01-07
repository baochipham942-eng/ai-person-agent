
import { prisma } from './lib/db/prisma';
import { searchBiographyContent } from './lib/datasources/exa';
import { chatStructuredCompletion } from './lib/ai/deepseek';
import './setup_env';

interface ExtractedRole {
    organization: string;
    role: string;
    startDate?: string;
    endDate?: string;
}

async function main() {
    if (!process.env.EXA_API_KEY) {
        console.error('❌ EXA_API_KEY is missing');
        process.exit(1);
    }

    // Find people with 0 PersonRoles
    const targetPeople = await prisma.people.findMany({
        where: {
            roles: {
                none: {}
            },
            status: { not: 'error' }
        },
        select: { id: true, name: true }
    });

    console.log(`Found ${targetPeople.length} people with 0 roles.`);

    for (const person of targetPeople) {
        console.log(`\n🤖 Processing ${person.name}...`);
        try {
            await enrichPersonWithLLM(person);
        } catch (e) {
            console.error(`   Error processing ${person.name}:`, e);
        }
        // Rate limit
        await new Promise(r => setTimeout(r, 1000));
    }
}

async function enrichPersonWithLLM(person: { id: string; name: string }) {
    console.log(`   Searching biography...`);
    const allResults = await searchBiographyContent(person.name);

    // Filter results for relevance
    const results = allResults.filter(r =>
        r.title.includes(person.name) ||
        (r.text && r.text.includes(person.name))
    );

    if (results.length === 0) {
        console.log(`   ❌ No relevant biography content found.`);
        return;
    }

    // Prepare Prompt
    const context = results.slice(0, 5).map(r =>
        `Title: ${r.title}\nURL: ${r.url}\nPublished: ${r.publishedDate}\nContent: ${r.text.slice(0, 3000)}`
    ).join('\n\n---\n\n');

    console.log(`   Calling DeepSeek LLM...`);
    const systemPrompt = `
You are an expert biographer. Extract the career and education history of "${person.name}" from the provided text.
Return a valid JSON object with a "roles" array. Each item should have:
- organization: string (Company or University name)
- role: string (Job title or Degree)
- startDate: string (YYYY-MM or YYYY, optional)
- endDate: string (YYYY-MM or YYYY, optional, "Present" if current)

Rules:
1. Only extract explicit facts.
2. Translate Organization/Role to Chinese if appropriate.
3. Sort by date descending.
4. Limit to top 10 most important roles.
    `;

    const response = await chatStructuredCompletion<{ roles: ExtractedRole[] }>(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: context }
        ],
        { temperature: 0.1 }
    );

    if (!response || !response.roles || response.roles.length === 0) {
        console.log(`   ⚠️ LLM returned no roles.`);
        return;
    }

    const roles = response.roles;
    console.log(`   ✅ Extracted ${roles.length} roles.`);

    // Save to DB
    for (const item of roles) {
        // Find/Create Organization
        let org = await prisma.organization.findFirst({ where: { name: item.organization } });
        if (!org) {
            org = await prisma.organization.create({
                data: {
                    name: item.organization,
                    type: item.organization.toLowerCase().includes('university') ? 'University' : 'Company'
                }
            });
        }

        const exists = await prisma.personRole.findFirst({
            where: {
                personId: person.id,
                organizationId: org.id,
                role: item.role
            }
        });

        if (!exists) {
            await prisma.personRole.create({
                data: {
                    person: { connect: { id: person.id } },
                    organization: { connect: { id: org.id } },
                    role: item.role,
                    startDate: parseDate(item.startDate),
                    endDate: parseDate(item.endDate),
                    source: 'llm_extraction',
                    confidence: 0.8
                }
            });
        }
    }
}

function parseDate(dateStr?: string): Date | undefined {
    if (!dateStr || dateStr.toLowerCase() === 'present') return undefined;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? undefined : d;
}

main().finally(() => prisma.$disconnect());
