/**
 * 批量填充所有 pending 人物的职业数据 (via Wikidata SPARQL)
 * 改进版：自动修复错误的 QID (BAIKE_...)
 */
import { prisma } from './lib/db/prisma';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

interface CareerItem {
    role: string;
    orgName: string;
    orgType: string;
    startDate?: string;
    endDate?: string;
}

// 搜索 Wikidata 获取真实 QID
async function searchWikidataId(name: string): Promise<string | null> {
    try {
        const url = `${WIKIDATA_API}?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&limit=1&type=item`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.search && data.search.length > 0) {
            return data.search[0].id; // e.g., "Q12345"
        }
        return null;
    } catch (e) {
        console.error(`Error searching Wikidata for ${name}:`, e);
        return null;
    }
}

async function fetchCareerFromWikidata(qid: string): Promise<CareerItem[]> {
    // Simple SPARQL query: employer + educated at
    const query = `
SELECT ?orgLabel ?roleLabel ?startTime ?endTime ?orgTypeLabel WHERE {
  {
    wd:${qid} wdt:P108 ?org .
    OPTIONAL { ?org wdt:P31 ?orgType . }
    BIND("Employee" AS ?role)
  } UNION {
    wd:${qid} wdt:P69 ?org .
    OPTIONAL { ?org wdt:P31 ?orgType . }
    BIND("Student" AS ?role)
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 30
    `;

    try {
        const res = await fetch(SPARQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/sparql-results+json',
                'User-Agent': 'AI-Person-Agent/1.0'
            },
            body: `query=${encodeURIComponent(query)}`
        });

        if (!res.ok) {
            // Don't log 400s too noisily, often means invalid QID
            return [];
        }

        const data = await res.json();
        const results: CareerItem[] = [];

        for (const binding of data.results?.bindings || []) {
            results.push({
                role: binding.roleLabel?.value || 'Employee',
                orgName: binding.orgLabel?.value || '',
                orgType: binding.orgTypeLabel?.value || 'Company',
                startDate: binding.startTime?.value?.split('T')[0],
                endDate: binding.endTime?.value?.split('T')[0]
            });
        }

        // Deduplicate by org name
        const seen = new Set<string>();
        return results.filter(r => {
            if (seen.has(r.orgName)) return false;
            seen.add(r.orgName);
            return r.orgName.length > 0;
        });
    } catch (e: any) {
        console.error(`Error fetching ${qid}:`, e.message);
        return [];
    }
}

async function enrichPerson(person: { id: string; name: string; qid: string | null }) {
    let targetQid = person.qid;
    let qidFixed = false;

    // 1. 检查并修复 QID
    if (!targetQid || !targetQid.startsWith('Q')) {
        console.log(`🔍 Resolving QID for ${person.name} (current: ${targetQid})...`);
        const foundQid = await searchWikidataId(person.name);

        if (foundQid) {
            console.log(`   -> Found QID: ${foundQid}`);
            targetQid = foundQid;
            qidFixed = true;

            // 更新数据库
            await prisma.people.update({
                where: { id: person.id },
                data: { qid: foundQid }
            });
        } else {
            console.log(`   -> ❌ No QID found for ${person.name}`);
            return 0;
        }
    }

    // 2. 获取职业数据
    const careers = await fetchCareerFromWikidata(targetQid!);
    if (careers.length === 0) {
        console.log(`📭 No careers found for ${person.name} (${targetQid})`);
        return 0;
    }

    let count = 0;
    for (const career of careers) {
        if (!career.orgName) continue;

        // Find or create organization
        let org = await prisma.organization.findFirst({
            where: { name: career.orgName }
        });

        if (!org) {
            org = await prisma.organization.create({
                data: {
                    name: career.orgName,
                    type: career.orgType.includes('university') ? 'University' : 'Company'
                }
            });
        }

        // Check if role already exists
        const existingRole = await prisma.personRole.findFirst({
            where: {
                personId: person.id,
                organizationId: org.id,
                role: career.role
            }
        });

        if (!existingRole) {
            await prisma.personRole.create({
                data: {
                    person: { connect: { id: person.id } },
                    organization: { connect: { id: org.id } },
                    role: career.role,
                    startDate: career.startDate,
                    endDate: career.endDate,
                    source: 'wikidata',
                    confidence: 0.9
                }
            });
            count++;
        }
    }

    // Update status to ready if we added roles
    if (count > 0) {
        await prisma.people.update({
            where: { id: person.id },
            data: { status: 'ready' }
        });
    }

    console.log(`✅ ${person.name}: added ${count} roles`);
    return count;
}

async function main() {
    // 处理所有 pending 的人，或者 qid 是 BAIKE 开头的人
    const people = await prisma.people.findMany({
        where: {
            OR: [
                { status: 'pending' },
                { qid: { startsWith: 'BAIKE' } }
            ]
        },
        select: { id: true, name: true, qid: true }
    });

    console.log(`\n🚀 Starting batch enrichment for ${people.length} people...\n`);

    let totalRoles = 0;
    let processed = 0;

    for (const person of people) {
        const added = await enrichPerson(person);
        totalRoles += added;
        processed++;

        // Rate limiting
        if (processed % 5 === 0) {
            console.log(`\n--- Progress: ${processed}/${people.length} ---\n`);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log(`\n✨ Done! Processed ${processed} people, added ${totalRoles} total roles.\n`);
}

main().finally(() => prisma.$disconnect());
