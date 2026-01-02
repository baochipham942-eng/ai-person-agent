/**
 * 分析仍有数据问题的人物及其知名度
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeProblematicPeople() {
    console.log('🔍 分析仍有问题的人物数据...\n');
    console.log('='.repeat(70));

    const people = await prisma.people.findMany({
        include: {
            roles: { include: { organization: true } },
            rawPoolItems: {
                select: { sourceType: true }
            }
        }
    });

    // 分类问题人物
    const issues = {
        noRoles: [] as any[],              // 没有任何经历
        noWorkExperience: [] as any[],     // 只有教育没有工作
        noEducation: [] as any[],          // 只有工作没有教育
        noDates: [] as any[],              // 有经历但没有日期
        placeholderQid: [] as any[],       // 使用占位符 QID 且数据不完整
    };

    for (const person of people) {
        const roles = person.roles;
        const educationRoles = roles.filter((r: any) =>
            r.organization.type === 'university' ||
            r.role.toLowerCase().includes('student') ||
            r.role.includes('学生')
        );
        const workRoles = roles.filter((r: any) =>
            r.organization.type === 'company' &&
            !r.role.toLowerCase().includes('student') &&
            !r.role.includes('学生')
        );
        const rolesWithDates = roles.filter((r: any) => r.startDate || r.endDate);

        // 计算内容丰富度（基于 rawPoolItems 数量和来源多样性）
        const contentCount = person.rawPoolItems.length;
        const sourceTypes = new Set(person.rawPoolItems.map((r: any) => r.sourceType));

        const personInfo = {
            name: person.name,
            qid: person.qid,
            description: person.description?.slice(0, 50) || '',
            contentCount,
            sourceCount: sourceTypes.size,
            roleCount: roles.length,
            aliases: person.aliases,
        };

        // 分类问题
        if (roles.length === 0) {
            issues.noRoles.push(personInfo);
        } else if (workRoles.length === 0 && educationRoles.length > 0) {
            issues.noWorkExperience.push(personInfo);
        } else if (educationRoles.length === 0 && workRoles.length > 0) {
            issues.noEducation.push(personInfo);
        }

        if (roles.length > 0 && rolesWithDates.length === 0) {
            issues.noDates.push(personInfo);
        }

        if ((person.qid.includes('BAIKE') || person.qid.includes('PLACEHOLDER')) && roles.length < 3) {
            issues.placeholderQid.push(personInfo);
        }
    }

    // 输出分析结果
    console.log('\n📊 问题分类统计：\n');
    console.log(`  ❌ 没有任何经历记录: ${issues.noRoles.length} 人`);
    console.log(`  📚 只有教育经历: ${issues.noWorkExperience.length} 人`);
    console.log(`  💼 只有工作经历: ${issues.noEducation.length} 人`);
    console.log(`  📅 有经历但没有日期: ${issues.noDates.length} 人`);
    console.log(`  🔖 占位符 QID 数据不完整: ${issues.placeholderQid.length} 人`);

    // 详细列表
    const printList = (title: string, list: any[], icon: string) => {
        if (list.length === 0) return;

        console.log('\n' + '='.repeat(70));
        console.log(`\n${icon} ${title} (${list.length} 人)\n`);

        // 按内容丰富度排序（内容越多越重要）
        const sorted = [...list].sort((a, b) => b.contentCount - a.contentCount);

        console.log('| 序号 | 人物名称 | 内容数 | 数据源数 | 知名度评估 | QID |');
        console.log('|------|----------|--------|----------|------------|-----|');

        sorted.forEach((p, i) => {
            // 知名度评估
            let fame = '⭐';
            if (p.contentCount >= 50) fame = '⭐⭐⭐⭐⭐';
            else if (p.contentCount >= 30) fame = '⭐⭐⭐⭐';
            else if (p.contentCount >= 15) fame = '⭐⭐⭐';
            else if (p.contentCount >= 5) fame = '⭐⭐';

            const qidShort = p.qid.length > 15 ? p.qid.slice(0, 12) + '...' : p.qid;
            console.log(`| ${(i + 1).toString().padStart(4)} | ${p.name.padEnd(15).slice(0, 15)} | ${p.contentCount.toString().padStart(6)} | ${p.sourceCount.toString().padStart(8)} | ${fame.padEnd(10)} | ${qidShort} |`);
        });
    };

    printList('没有任何经历记录', issues.noRoles, '❌');
    printList('只有教育经历（缺工作）', issues.noWorkExperience, '📚');
    printList('只有工作经历（缺教育）', issues.noEducation, '💼');
    printList('有经历但完全没有日期', issues.noDates, '📅');
    printList('占位符 QID 数据不完整', issues.placeholderQid, '🔖');

    // 总结建议
    console.log('\n' + '='.repeat(70));
    console.log('\n💡 修复优先级建议：\n');

    // 高知名度但有问题的人（内容多但数据不完整）
    const allIssues = [...new Set([
        ...issues.noRoles,
        ...issues.noWorkExperience,
        ...issues.noDates,
        ...issues.placeholderQid,
    ])];

    const highPriority = allIssues
        .filter(p => p.contentCount >= 10)
        .sort((a, b) => b.contentCount - a.contentCount)
        .slice(0, 10);

    if (highPriority.length > 0) {
        console.log('🔴 高优先级修复（知名度高但数据不完整）：');
        highPriority.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.name} (${p.contentCount} 条内容)`);
        });
    }

    const lowImportance = allIssues
        .filter(p => p.contentCount <= 3)
        .sort((a, b) => a.contentCount - b.contentCount);

    if (lowImportance.length > 0) {
        console.log('\n🟢 低优先级（知名度较低，可考虑忽略或删除）：');
        lowImportance.slice(0, 10).forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.name} (${p.contentCount} 条内容)`);
        });
    }

    await prisma.$disconnect();
}

analyzeProblematicPeople().catch(console.error);
