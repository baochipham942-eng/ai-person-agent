
/**
 * 批量从 Wikidata 填充 occupation 和 organization 数据
 */

import 'dotenv/config';
import { prisma } from './lib/db/prisma';

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

async function getEntityLabels(entityIds: string[]): Promise<Record<string, string>> {
    if (entityIds.length === 0) return {};

    const params = new URLSearchParams({
        action: 'wbgetentities',
        ids: entityIds.join('|'),
        props: 'labels',
        languages: 'zh|en',
        format: 'json',
        origin: '*',
    });

    try {
        const response = await fetch(`${WIKIDATA_API}?${params}`, {
            headers: { 'User-Agent': 'AI-Person-Agent/1.0' },
        });
        const data = await response.json();

        const result: Record<string, string> = {};
        for (const [id, entity] of Object.entries(data.entities || {})) {
            const e = entity as any;
            result[id] = e.labels?.zh?.value || e.labels?.en?.value || id;
        }
        return result;
    } catch (error) {
        console.error('Error fetching labels:', error);
        return {};
    }
}

async function fetchOccupationOrganization(qid: string): Promise<{ occupation: string[], organization: string[] }> {
    try {
        const params = new URLSearchParams({
            action: 'wbgetentities',
            ids: qid,
            props: 'claims',
            format: 'json',
            origin: '*',
        });

        const response = await fetch(`${WIKIDATA_API}?${params}`, {
            headers: { 'User-Agent': 'AI-Person-Agent/1.0' },
        });

        const data = await response.json();
        const entity = data.entities?.[qid];
        if (!entity) return { occupation: [], organization: [] };

        // P106 = occupation
        const occupationIds = entity.claims?.P106?.map((claim: any) =>
            claim.mainsnak?.datavalue?.value?.id
        ).filter(Boolean) || [];

        // P108 = employer (organization)
        const organizationIds = entity.claims?.P108?.map((claim: any) =>
            claim.mainsnak?.datavalue?.value?.id
        ).filter(Boolean) || [];

        // Get labels for all entity IDs
        const allIds = [...new Set([...occupationIds, ...organizationIds])];
        const labels = await getEntityLabels(allIds);

        return {
            occupation: occupationIds.map((id: string) => labels[id] || id).slice(0, 5), // Max 5
            organization: organizationIds.map((id: string) => labels[id] || id).slice(0, 5), // Max 5
        };
    } catch (error) {
        console.error(`Error fetching ${qid}:`, error);
        return { occupation: [], organization: [] };
    }
}

async function main() {
    console.log('=== 批量填充 occupation/organization ===\n');

    // 获取需要补全的人物
    const people = await prisma.people.findMany({
        where: {
            qid: { startsWith: 'Q' },
            OR: [
                { occupation: { isEmpty: true } },
                { organization: { isEmpty: true } },
            ]
        },
        select: {
            id: true,
            name: true,
            qid: true,
            occupation: true,
            organization: true,
        }
    });

    console.log(`找到 ${people.length} 人需要补全\n`);

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < people.length; i++) {
        const person = people[i];
        console.log(`[${i + 1}/${people.length}] ${person.name} (${person.qid})`);

        const info = await fetchOccupationOrganization(person.qid);

        const updateData: any = {};

        if (person.occupation.length === 0 && info.occupation.length > 0) {
            updateData.occupation = info.occupation;
            console.log(`  职业: ${info.occupation.join(', ')}`);
        }

        if (person.organization.length === 0 && info.organization.length > 0) {
            updateData.organization = info.organization;
            console.log(`  组织: ${info.organization.join(', ')}`);
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.people.update({
                where: { id: person.id },
                data: updateData
            });
            console.log(`  ✅ 已更新`);
            updated++;
        } else {
            console.log(`  - 无新数据`);
            failed++;
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n=== 完成 ===`);
    console.log(`更新: ${updated}`);
    console.log(`无数据: ${failed}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
