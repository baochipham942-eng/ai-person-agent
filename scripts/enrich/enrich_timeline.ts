/**
 * 时光轴数据补充脚本
 *
 * 使用 Wikidata 和 Perplexity 来补充和修正时光轴数据
 *
 * 使用: npx tsx scripts/enrich/enrich_timeline.ts [--person-name="姚顺宇"] [--dry-run]
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL!;

function getClient() {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter });
}

// ============== Wikidata 数据源 ==============

interface CareerEntry {
    organization: string;
    role: string;
    startDate?: string;
    endDate?: string;
    source: string;
}

async function fetchFromWikidata(qid: string): Promise<CareerEntry[]> {
    if (!qid || qid.startsWith('manual') || qid.startsWith('local') || qid.startsWith('BAIKE') || qid.startsWith('CUSTOM')) {
        return [];
    }

    try {
        // 获取职业经历 (P108: employer, P69: educated at, P39: position held)
        const sparql = `
            SELECT DISTINCT ?orgLabel ?roleLabel ?startTime ?endTime WHERE {
                {
                    wd:${qid} p:P108 ?stmt .
                    ?stmt ps:P108 ?org .
                    OPTIONAL { ?stmt pq:P580 ?startTime }
                    OPTIONAL { ?stmt pq:P582 ?endTime }
                    OPTIONAL { ?stmt pq:P512 ?role }
                    OPTIONAL { wd:${qid} wdt:P106 ?role }
                }
                UNION
                {
                    wd:${qid} p:P69 ?stmt2 .
                    ?stmt2 ps:P69 ?org .
                    OPTIONAL { ?stmt2 pq:P580 ?startTime }
                    OPTIONAL { ?stmt2 pq:P582 ?endTime }
                    BIND("Student" AS ?role)
                }
                UNION
                {
                    wd:${qid} p:P39 ?stmt3 .
                    ?stmt3 ps:P39 ?role .
                    OPTIONAL { ?stmt3 pq:P580 ?startTime }
                    OPTIONAL { ?stmt3 pq:P582 ?endTime }
                    OPTIONAL { ?stmt3 pq:P642 ?org }
                }
                SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh". }
            }
            LIMIT 30
        `;

        const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'AI-Person-Agent/1.0' }
        });

        if (!res.ok) {
            console.log(`    Wikidata API error: ${res.status}`);
            return [];
        }

        const data = await res.json();
        const results: CareerEntry[] = [];

        for (const binding of data.results?.bindings || []) {
            const org = binding.orgLabel?.value;
            if (!org) continue;

            results.push({
                organization: org,
                role: binding.roleLabel?.value || 'Member',
                startDate: binding.startTime?.value?.substring(0, 4),
                endDate: binding.endTime?.value?.substring(0, 4),
                source: 'wikidata_enrich',
            });
        }

        return results;
    } catch (e: any) {
        console.log(`    Wikidata fetch error: ${e.message}`);
        return [];
    }
}

// ============== Perplexity 数据源 ==============

async function fetchFromPerplexity(personName: string, context: string): Promise<CareerEntry[]> {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
        console.log('    No Perplexity API key');
        return [];
    }

    try {
        const prompt = `请提供 ${personName} 的完整职业经历，这是一位AI/科技领域的人物。
${context ? `已知信息: ${context}` : ''}

请以JSON数组格式返回，每个条目包含:
- organization: 公司/机构名称
- role: 职位
- startDate: 开始年份 (YYYY格式)
- endDate: 结束年份 (YYYY格式，如果是现在则为null)

只返回JSON数组，不要其他内容。格式示例:
[{"organization": "腾讯", "role": "AI研究员", "startDate": "2020", "endDate": null}]`;

        const res = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    { role: 'system', content: '你是一个专业的人物履历研究助手。只返回JSON格式的数据，不要任何解释。' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
            }),
        });

        if (!res.ok) {
            console.log(`    Perplexity API error: ${res.status}`);
            return [];
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';

        // 解析 JSON
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.log('    Perplexity: No JSON found in response');
            return [];
        }

        const entries = JSON.parse(jsonMatch[0]);
        return entries.map((e: any) => ({
            organization: e.organization,
            role: e.role || 'Member',
            startDate: e.startDate,
            endDate: e.endDate,
            source: 'perplexity_enrich',
        }));
    } catch (e: any) {
        console.log(`    Perplexity fetch error: ${e.message}`);
        return [];
    }
}

// ============== 数据合并逻辑 ==============

function mergeCareerEntries(existing: CareerEntry[], newEntries: CareerEntry[]): CareerEntry[] {
    const merged: CareerEntry[] = [...existing];

    for (const newEntry of newEntries) {
        // 检查是否已存在相似的记录
        const isDuplicate = existing.some(e => {
            const orgMatch = e.organization.toLowerCase().includes(newEntry.organization.toLowerCase()) ||
                newEntry.organization.toLowerCase().includes(e.organization.toLowerCase());
            const roleMatch = e.role.toLowerCase().includes(newEntry.role.toLowerCase()) ||
                newEntry.role.toLowerCase().includes(e.role.toLowerCase());
            return orgMatch && roleMatch;
        });

        if (!isDuplicate) {
            merged.push(newEntry);
        }
    }

    return merged;
}

// ============== 主函数 ==============

async function enrichPerson(personId: string, personName: string, qid: string | null, dryRun: boolean) {
    const db = getClient();

    try {
        console.log(`\n处理: ${personName} (QID: ${qid || '无'})`);

        // 获取现有时光轴数据
        const existingRoles = await db.personRole.findMany({
            where: { personId },
            include: { organization: true },
        });

        const existingEntries: CareerEntry[] = existingRoles.map(r => ({
            organization: r.organization.name,
            role: r.role,
            startDate: r.startDate?.getFullYear().toString(),
            endDate: r.endDate?.getFullYear().toString(),
            source: r.source,
        }));

        console.log(`  现有记录: ${existingEntries.length} 条`);

        // 从 Wikidata 获取数据
        let wikidataEntries: CareerEntry[] = [];
        if (qid && !qid.startsWith('manual') && !qid.startsWith('local')) {
            console.log('  从 Wikidata 获取数据...');
            wikidataEntries = await fetchFromWikidata(qid);
            console.log(`    获取到 ${wikidataEntries.length} 条`);
        }

        // 从 Perplexity 获取数据
        console.log('  从 Perplexity 获取数据...');
        const context = existingEntries.length > 0
            ? `已知经历: ${existingEntries.slice(0, 3).map(e => `${e.organization} - ${e.role}`).join(', ')}`
            : '';
        const perplexityEntries = await fetchFromPerplexity(personName, context);
        console.log(`    获取到 ${perplexityEntries.length} 条`);

        // 合并数据
        const allNewEntries = [...wikidataEntries, ...perplexityEntries];
        const newEntries = allNewEntries.filter(newEntry => {
            const isDuplicate = existingEntries.some(e => {
                const orgMatch = e.organization.toLowerCase().includes(newEntry.organization.toLowerCase()) ||
                    newEntry.organization.toLowerCase().includes(e.organization.toLowerCase());
                return orgMatch;
            });
            return !isDuplicate;
        });

        console.log(`  新增记录: ${newEntries.length} 条`);

        if (newEntries.length === 0) {
            console.log('  无新数据需要添加');
            return;
        }

        // 显示新数据
        for (const entry of newEntries) {
            const start = entry.startDate || '?';
            const end = entry.endDate || '至今';
            console.log(`    + ${entry.organization}: ${entry.role} (${start}-${end}) [${entry.source}]`);
        }

        if (dryRun) {
            console.log('  [DRY RUN] 跳过保存');
            return;
        }

        // 保存新数据
        for (const entry of newEntries) {
            // 确保机构存在
            let org = await db.organization.findFirst({
                where: { name: { contains: entry.organization, mode: 'insensitive' } }
            });

            if (!org) {
                org = await db.organization.create({
                    data: {
                        name: entry.organization,
                        type: entry.role.toLowerCase().includes('student') ? 'university' : 'company',
                    }
                });
            }

            // 创建角色记录
            const startDate = entry.startDate ? new Date(`${entry.startDate}-01-01`) : null;
            const endDate = entry.endDate ? new Date(`${entry.endDate}-01-01`) : null;

            await db.personRole.create({
                data: {
                    personId,
                    organizationId: org.id,
                    role: entry.role,
                    startDate,
                    endDate,
                    source: entry.source,
                    confidence: 0.8,
                }
            });
        }

        console.log(`  ✓ 已保存 ${newEntries.length} 条新记录`);
    } finally {
        await db.$disconnect();
    }
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const personNameArg = args.find(a => a.startsWith('--person-name='));
    const targetName = personNameArg ? personNameArg.split('=')[1].replace(/"/g, '') : null;

    console.log('=== 时光轴数据补充 ===');
    if (dryRun) console.log('[DRY RUN 模式]');
    if (targetName) console.log(`目标人物: ${targetName}`);

    const db = getClient();

    try {
        // 获取需要补充数据的人物
        const whereClause = targetName
            ? { OR: [{ name: { contains: targetName } }, { nameZh: { contains: targetName } }] }
            : {
                roles: { some: {} },  // 只处理已有时光轴数据的人物
            };

        const people = await db.people.findMany({
            where: whereClause,
            select: { id: true, name: true, qid: true },
            take: targetName ? 10 : 20,  // 限制处理数量
        });

        console.log(`\n找到 ${people.length} 个人物需要处理\n`);

        for (const person of people) {
            await enrichPerson(person.id, person.name, person.qid, dryRun);
            // 限速
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log('\n=== 完成 ===');
    } finally {
        await db.$disconnect();
    }
}

main().catch(console.error);
