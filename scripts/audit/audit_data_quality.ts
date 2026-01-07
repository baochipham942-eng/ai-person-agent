
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Issue {
    personId: string;
    name: string;
    issue: string;
    severity: 'high' | 'medium' | 'low';
}

async function main() {
    console.log('=== 数据库质量审计 ===\n');

    const issues: Issue[] = [];

    const people = await prisma.people.findMany({
        include: {
            rawPoolItems: true
        }
    });

    console.log(`总人数: ${people.length}\n`);

    // 1. Missing Avatars
    const noAvatar = people.filter(p => !p.avatarUrl || p.avatarUrl.trim() === '');
    console.log(`❌ 无头像: ${noAvatar.length} 人`);
    noAvatar.forEach(p => issues.push({ personId: p.id, name: p.name, issue: '无头像', severity: 'high' }));

    // 2. Empty Descriptions
    const noDesc = people.filter(p => !p.description || p.description.trim() === '');
    console.log(`❌ 无描述: ${noDesc.length} 人`);
    noDesc.forEach(p => issues.push({ personId: p.id, name: p.name, issue: '无描述', severity: 'medium' }));

    // 3. officialLinks 格式问题
    const badLinks: typeof people = [];
    for (const p of people) {
        const links = p.officialLinks;
        if (links && typeof links === 'object' && !Array.isArray(links)) {
            // 对象格式 (新格式) - OK
        } else if (Array.isArray(links)) {
            // 数组格式 (旧格式) - 可能需要迁移
        } else if (links === null || links === undefined) {
            // 空 - 可能OK
        } else {
            badLinks.push(p);
        }
    }
    console.log(`⚠️ officialLinks 格式异常: ${badLinks.length} 人`);
    badLinks.forEach(p => issues.push({ personId: p.id, name: p.name, issue: 'officialLinks格式异常', severity: 'medium' }));

    // 4. 无任何社交链接
    const noSocialLinks = people.filter(p => {
        const links = p.officialLinks;
        if (!links) return true;
        if (Array.isArray(links) && links.length === 0) return true;
        if (typeof links === 'object' && Object.keys(links).length === 0) return true;
        return false;
    });
    console.log(`⚠️ 无社交链接: ${noSocialLinks.length} 人`);
    noSocialLinks.forEach(p => issues.push({ personId: p.id, name: p.name, issue: '无社交链接', severity: 'low' }));

    // 5. 无内容 (RawPoolItems)
    const noContent = people.filter(p => p.rawPoolItems.length === 0);
    console.log(`⚠️ 无抓取内容: ${noContent.length} 人`);
    noContent.forEach(p => issues.push({ personId: p.id, name: p.name, issue: '无抓取内容', severity: 'low' }));

    // 6. 低完成度
    const lowCompleteness = people.filter(p => p.completeness < 30);
    console.log(`⚠️ 低完成度(<30%): ${lowCompleteness.length} 人`);
    lowCompleteness.forEach(p => issues.push({ personId: p.id, name: p.name, issue: `完成度仅${p.completeness}%`, severity: 'low' }));

    // 7. 可能的重复 (相似名字)
    const nameMap = new Map<string, typeof people>();
    for (const p of people) {
        const normalized = p.name.toLowerCase().replace(/\s+/g, '');
        if (!nameMap.has(normalized)) {
            nameMap.set(normalized, []);
        }
        nameMap.get(normalized)!.push(p);
    }
    const duplicates = Array.from(nameMap.values()).filter(arr => arr.length > 1);
    console.log(`⚠️ 可能重复: ${duplicates.length} 组`);
    duplicates.forEach(group => {
        const names = group.map(p => `${p.name} (${p.id})`).join(', ');
        issues.push({ personId: group[0].id, name: group[0].name, issue: `可能与以下重复: ${names}`, severity: 'high' });
    });

    // 8. 无职业信息
    const noOccupation = people.filter(p => !p.occupation || p.occupation.length === 0);
    console.log(`⚠️ 无职业信息: ${noOccupation.length} 人`);
    noOccupation.forEach(p => issues.push({ personId: p.id, name: p.name, issue: '无职业信息', severity: 'low' }));

    // 9. 无组织信息
    const noOrg = people.filter(p => !p.organization || p.organization.length === 0);
    console.log(`⚠️ 无组织信息: ${noOrg.length} 人`);
    noOrg.forEach(p => issues.push({ personId: p.id, name: p.name, issue: '无组织信息', severity: 'low' }));

    // === 输出高优先级问题 ===
    console.log('\n=== 高优先级问题 (需立即处理) ===');
    const highIssues = issues.filter(i => i.severity === 'high');
    const grouped = new Map<string, string[]>();
    for (const i of highIssues) {
        if (!grouped.has(i.name)) {
            grouped.set(i.name, []);
        }
        grouped.get(i.name)!.push(i.issue);
    }
    Array.from(grouped.entries()).slice(0, 20).forEach(([name, issues]) => {
        console.log(`  - ${name}: ${issues.join(', ')}`);
    });
    if (grouped.size > 20) {
        console.log(`  ... 还有 ${grouped.size - 20} 人有问题`);
    }

    // === 统计汇总 ===
    console.log('\n=== 统计汇总 ===');
    console.log(`总问题数: ${issues.length}`);
    console.log(`  - 高优先级: ${issues.filter(i => i.severity === 'high').length}`);
    console.log(`  - 中优先级: ${issues.filter(i => i.severity === 'medium').length}`);
    console.log(`  - 低优先级: ${issues.filter(i => i.severity === 'low').length}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
