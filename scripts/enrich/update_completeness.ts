
/**
 * 自动计算并更新人物 completeness 分数
 * 
 * 计算公式:
 * - 头像 (avatarUrl): 15%
 * - 描述 (description): 10%
 * - 职业 (occupation): 10%
 * - 组织 (organization): 10%
 * - 官方链接 (officialLinks): 10%
 * - 性别/国家 (gender/country): 5%
 * - 抓取内容 (RawPoolItems): 20%
 * - 职业经历 (PersonRoles): 10%
 * - 卡片 (Cards): 10%
 */

import 'dotenv/config';
import { prisma } from './lib/db/prisma';

interface CompletenessBreakdown {
    avatar: number;        // 15
    description: number;   // 10
    occupation: number;    // 10
    organization: number;  // 10
    officialLinks: number; // 10
    genderCountry: number; // 5
    rawPoolItems: number;  // 20
    personRoles: number;   // 10
    cards: number;         // 10
    total: number;         // 100
}

function calculateCompleteness(person: any): CompletenessBreakdown {
    const breakdown: CompletenessBreakdown = {
        avatar: 0,
        description: 0,
        occupation: 0,
        organization: 0,
        officialLinks: 0,
        genderCountry: 0,
        rawPoolItems: 0,
        personRoles: 0,
        cards: 0,
        total: 0,
    };

    // 头像 (15%)
    if (person.avatarUrl && person.avatarUrl.length > 0) {
        breakdown.avatar = 15;
    }

    // 描述 (10%)
    if (person.description && person.description.length > 20) {
        breakdown.description = 10;
    }

    // 职业 (10%)
    if (person.occupation && person.occupation.length > 0) {
        breakdown.occupation = 10;
    }

    // 组织 (10%)
    if (person.organization && person.organization.length > 0) {
        breakdown.organization = 10;
    }

    // 官方链接 (10%)
    let linksCount = 0;
    if (Array.isArray(person.officialLinks)) {
        linksCount = person.officialLinks.length;
    } else if (typeof person.officialLinks === 'object' && person.officialLinks) {
        linksCount = Object.keys(person.officialLinks).filter(k => person.officialLinks[k]).length;
    }
    if (linksCount > 0) {
        breakdown.officialLinks = Math.min(10, linksCount * 3); // 每个链接 3%，最多 10%
    }

    // 性别/国家 (5%)
    if (person.gender) breakdown.genderCountry += 2.5;
    if (person.country) breakdown.genderCountry += 2.5;

    // 抓取内容 (20%) - 基于数量
    const itemCount = person._count?.rawPoolItems || 0;
    if (itemCount > 0) {
        breakdown.rawPoolItems = Math.min(20, itemCount * 2); // 每条内容 2%，最多 20%
    }

    // 职业经历 (10%)
    const roleCount = person._count?.roles || 0;
    if (roleCount > 0) {
        breakdown.personRoles = Math.min(10, roleCount * 3); // 每条经历 3%，最多 10%
    }

    // 卡片 (10%)
    const cardCount = person._count?.cards || 0;
    if (cardCount > 0) {
        breakdown.cards = Math.min(10, cardCount * 2); // 每张卡 2%，最多 10%
    }

    // 总分
    breakdown.total = Math.round(
        breakdown.avatar +
        breakdown.description +
        breakdown.occupation +
        breakdown.organization +
        breakdown.officialLinks +
        breakdown.genderCountry +
        breakdown.rawPoolItems +
        breakdown.personRoles +
        breakdown.cards
    );

    return breakdown;
}

async function main() {
    console.log('=== 更新所有人物 completeness 分数 ===\n');

    const people = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            avatarUrl: true,
            description: true,
            occupation: true,
            organization: true,
            officialLinks: true,
            gender: true,
            country: true,
            completeness: true,
            _count: {
                select: {
                    rawPoolItems: true,
                    roles: true,
                    cards: true,
                }
            }
        }
    });

    console.log(`处理 ${people.length} 人\n`);

    let updated = 0;
    const distribution: Record<string, number> = {
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0,
    };

    for (const person of people) {
        const breakdown = calculateCompleteness(person);

        // 统计分布
        if (breakdown.total <= 20) distribution['0-20']++;
        else if (breakdown.total <= 40) distribution['21-40']++;
        else if (breakdown.total <= 60) distribution['41-60']++;
        else if (breakdown.total <= 80) distribution['61-80']++;
        else distribution['81-100']++;

        // 如果分数有变化，更新数据库
        if (breakdown.total !== person.completeness) {
            await prisma.people.update({
                where: { id: person.id },
                data: { completeness: breakdown.total }
            });
            updated++;

            if (updated <= 10) {
                console.log(`${person.name}: ${person.completeness}% -> ${breakdown.total}%`);
            }
        }
    }

    if (updated > 10) {
        console.log(`... 还有 ${updated - 10} 人已更新\n`);
    }

    console.log('\n=== 完成度分布 ===');
    for (const [range, count] of Object.entries(distribution)) {
        const bar = '█'.repeat(Math.round(count / 5));
        console.log(`${range}%: ${count} 人 ${bar}`);
    }

    console.log(`\n总更新: ${updated} 人`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
