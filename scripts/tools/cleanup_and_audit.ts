/**
 * 数据库清理与污染检测脚本
 * 
 * 功能：
 * 1. 删除所有人的中学/高中经历
 * 2. 识别并删除同名数据污染（如历史人物数据）
 * 3. 统计受影响人物的剩余时间线数量
 */

import { prisma } from '../lib/db/prisma';

async function main() {
    console.log('=== 开始数据库清理与审计 ===\n');

    // --- 1. 删除中学/高中经历 ---

    const schoolKeywords = [
        'High School', 'Middle School', 'Secondary School', 'Grammar School',
        'Gymnasium', 'Preparatory School', 'Prep School',
        '中学', '高中', '初中', '一中', '二中', '三中', '四中', '附中',
        '外国语学校', 'Public School'
    ];

    console.log('--- 1. 扫描中学/高中经历 ---');

    // 获取所有角色用于检查
    const allRoles = await prisma.personRole.findMany({
        include: {
            organization: true,
            person: true
        }
    });

    const highSchoolRoleIds: string[] = [];

    for (const role of allRoles) {
        const orgName = (role.organization?.name || '').toLowerCase();
        const orgNameZh = (role.organization?.nameZh || '').toLowerCase();

        const isHighSchool = schoolKeywords.some(kw => {
            const kwl = kw.toLowerCase();
            return orgName.includes(kwl) || orgNameZh.includes(kwl);
        });

        if (isHighSchool) {
            highSchoolRoleIds.push(role.id);
            // console.log(`  [待删除] ${role.person.name}: ${role.organization?.nameZh || role.organization?.name}`);
        }
    }

    if (highSchoolRoleIds.length > 0) {
        const deleteResult = await prisma.personRole.deleteMany({
            where: { id: { in: highSchoolRoleIds } }
        });
        console.log(`✅ 已删除 ${deleteResult.count} 条中学/高中记录\n`);
    } else {
        console.log('未发现中学/高中记录\n');
    }

    // --- 2. 识别数据污染 (基于年份和关键词) ---

    console.log('--- 2. 扫描数据污染 (同名异义/历史人物) ---');

    // 规则：
    // 1. 开始时间早于 1950 年 (AI 领域人物不太可能早于此活跃，除非是图灵 ?)
    //    注：Alan Turing 生于 1912，但我们先列出看看。
    // 2. 包含特定历史关键词

    const historicalKeywords = [
        '后唐', '后晋', '皇帝', '节度使', '太原', '侍卫', '亲军'
    ];

    const suspiciousRoles = await prisma.personRole.findMany({
        where: {
            OR: [
                { startDate: { lt: new Date('1960-01-01') } }, // 早于 1960
                {
                    organization: {
                        OR: [
                            { name: { contains: 'Dynasty' } },
                            { nameZh: { in: historicalKeywords } } // 简单匹配
                        ]
                    }
                }
            ]
        },
        include: {
            person: true,
            organization: true
        }
    });

    const pollutionIds: string[] = [];

    // 过滤掉真正的早期先驱 (如 Turing, Shannon 等，如果有)
    // 简单的白名单，或者人工确认。这里我们先打印出来。

    console.log(`发现 ${suspiciousRoles.length} 条疑似异常早期/历史记录:`);

    for (const role of suspiciousRoles) {
        // 针对刘知远的历史数据进行特判删除
        const isLiuZhiyuanHistorical = role.person.name === '刘知远' && (
            role.startDate?.getFullYear()! < 1980 ||
            historicalKeywords.some(kw => role.organization?.nameZh?.includes(kw))
        );

        // 针对沈向洋等人的早期记录 (1980s) 可能是真实的，需保留
        // 这里主要针对显然错误的年代 (如 < 1900)
        const isAncient = role.startDate && role.startDate.getFullYear() < 1900;

        if (isLiuZhiyuanHistorical || isAncient) {
            console.log(`  [确认污染/待删除] ${role.person.name}: ${role.organization?.nameZh || role.organization?.name} (${role.startDate?.getFullYear()})`);
            pollutionIds.push(role.id);
        } else {
            console.log(`  [疑似/保留] ${role.person.name}: ${role.organization?.nameZh || role.organization?.name} (${role.startDate?.getFullYear()})`);
        }
    }

    if (pollutionIds.length > 0) {
        const deletePollution = await prisma.personRole.deleteMany({
            where: { id: { in: pollutionIds } }
        });
        console.log(`✅ 已删除 ${deletePollution.count} 条污染记录\n`);
    } else {
        console.log('未发现需删除的污染记录\n');
    }

    // --- 3. 统计剩余时间线并生成规划 ---

    console.log('--- 3. 剩余时间线健康度检查 ---');

    // 统计每个人剩余的角色数量
    const personRoleCounts = await prisma.personRole.groupBy({
        by: ['personId'],
        _count: {
            id: true
        }
    });

    const personMap = new Map<string, number>();
    personRoleCounts.forEach(p => personMap.set(p.personId, p._count.id));

    // 获取所有人名
    const people = await prisma.people.findMany({
        select: { id: true, name: true }
    });

    const lowDataPeople = [];

    for (const person of people) {
        const count = personMap.get(person.id) || 0;
        if (count < 3) { // 阈值：少于3条经历被认为数据薄弱
            lowDataPeople.push({ name: person.name, count });
        }
    }

    console.log(`\n经清理后，以下人物 (${lowDataPeople.length}人) 时间线数据稀缺 (<3条):`);
    lowDataPeople.sort((a, b) => a.count - b.count);

    lowDataPeople.forEach(p => {
        console.log(`  - ${p.name}: 剩 ${p.count} 条`);
    });

    console.log('\n--- 重新抓取规划建议 ---');
    console.log('1. 对于由"同名污染"导致清空的人 (如刘知远):');
    console.log('   - 建议使用 Exa/Google Search 结合 "AI" "NLP" "Professor" 等限定词重新定向抓取。');
    console.log('2. 对于数据原本稀缺的人:');
    console.log('   - 建议使用 Perplexity 针对性询问 "Career history of [Name]"。');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
