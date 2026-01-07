/**
 * 使用 Exa 搜索 + AI 提取 补充缺失的职业时间线日期
 * 
 * 流程：
 * 1. 找出所有缺少 startDate 的记录，按人物分组
 * 2. 对每个人使用 Exa 搜索传记内容
 * 3. 使用 DeepSeek AI 从搜索结果中提取时间线
 * 4. 匹配并更新数据库
 * 
 * 预估成本：~$0.50 (Exa 搜索 + DeepSeek API)
 */

import 'dotenv/config';
import { prisma } from '../lib/db/prisma';
import { searchBiographyContent } from '../lib/datasources/exa';
import { extractTimelineFromSources, ExtractedTimelineEvent } from '../lib/ai/timelineExtractor';

/**
 * 规范化名称用于匹配
 */
function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * 在提取的时间线中查找匹配的事件
 */
function findMatchingEvent(
    orgName: string,
    events: ExtractedTimelineEvent[]
): ExtractedTimelineEvent | null {
    const normalizedOrg = normalizeName(orgName);

    for (const event of events) {
        const normalizedTitle = normalizeName(event.title);

        // 完全匹配或包含匹配
        if (normalizedTitle === normalizedOrg ||
            normalizedTitle.includes(normalizedOrg) ||
            normalizedOrg.includes(normalizedTitle)) {
            return event;
        }
    }

    return null;
}

async function main() {
    console.log('=== 使用 Exa + AI 补充时间线日期 ===\n');

    // 1. 找出所有缺少开始日期的记录，按人物分组
    const missingStartDateRoles = await prisma.personRole.findMany({
        where: { startDate: null },
        include: {
            person: { select: { id: true, name: true, qid: true, aliases: true } },
            organization: { select: { id: true, name: true, nameZh: true } }
        }
    });

    console.log(`共有 ${missingStartDateRoles.length} 条记录缺少开始日期`);

    // 按人物分组
    const byPerson = new Map<string, typeof missingStartDateRoles>();
    for (const role of missingStartDateRoles) {
        const personId = role.personId;
        if (!byPerson.has(personId)) {
            byPerson.set(personId, []);
        }
        byPerson.get(personId)!.push(role);
    }

    console.log(`涉及 ${byPerson.size} 个人物\n`);

    let updatedCount = 0;
    let searchedCount = 0;
    let noResultsCount = 0;
    let noMatchCount = 0;

    // 2. 对每个人搜索并提取时间线
    for (const [personId, roles] of byPerson) {
        const person = roles[0].person;
        console.log(`\n处理: ${person.name}`);
        console.log(`  缺失日期的角色数: ${roles.length}`);

        // 列出需要补充的组织
        const orgNames = roles.map(r => r.organization.nameZh || r.organization.name);
        console.log(`  需补充: ${orgNames.join(', ')}`);

        try {
            // 使用 Exa 搜索传记内容
            console.log(`  搜索传记内容...`);
            const searchResults = await searchBiographyContent(person.name);
            searchedCount++;

            if (searchResults.length === 0) {
                console.log(`  ⚠️ 未找到传记内容`);
                noResultsCount++;
                continue;
            }

            console.log(`  找到 ${searchResults.length} 篇相关内容`);

            // 使用 AI 提取时间线
            console.log(`  提取时间线...`);
            const sources = searchResults.map(r => ({ title: r.title, text: r.text }));
            const extractedEvents = await extractTimelineFromSources(person.name, sources);

            if (extractedEvents.length === 0) {
                console.log(`  ⚠️ 未能提取到时间线事件`);
                noMatchCount++;
                continue;
            }

            console.log(`  提取到 ${extractedEvents.length} 个时间线事件:`);
            extractedEvents.slice(0, 5).forEach(e => {
                console.log(`    - ${e.title}: ${e.startDate || 'no-start'} ~ ${e.endDate || 'no-end'} (${e.type})`);
            });

            // 3. 匹配并更新数据库
            for (const role of roles) {
                const orgName = role.organization.name;
                const orgNameZh = role.organization.nameZh;

                // 尝试用英文名和中文名匹配
                let match = findMatchingEvent(orgName, extractedEvents);
                if (!match && orgNameZh) {
                    match = findMatchingEvent(orgNameZh, extractedEvents);
                }

                if (match && match.startDate) {
                    // 解析日期
                    const startDate = new Date(match.startDate);
                    if (!isNaN(startDate.getTime())) {
                        const endDate = match.endDate && match.endDate !== 'present'
                            ? new Date(match.endDate)
                            : null;

                        await prisma.personRole.update({
                            where: { id: role.id },
                            data: {
                                startDate,
                                endDate: endDate && !isNaN(endDate.getTime()) ? endDate : undefined
                            }
                        });

                        console.log(`  ✅ 更新: ${orgNameZh || orgName} -> ${match.startDate}`);
                        updatedCount++;
                    }
                } else {
                    console.log(`  ❌ 未匹配: ${orgNameZh || orgName}`);
                }
            }

            // 避免请求过快
            await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            console.error(`  ❌ 处理失败:`, error);
        }
    }

    console.log('\n=== 统计 ===');
    console.log(`搜索人物数: ${searchedCount}`);
    console.log(`更新成功: ${updatedCount} 条`);
    console.log(`无搜索结果: ${noResultsCount} 人`);
    console.log(`无法匹配: ${noMatchCount} 人`);

    // 重新统计
    const remaining = await prisma.personRole.count({ where: { startDate: null } });
    console.log(`\n剩余缺失开始日期: ${remaining} 条`);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('脚本失败:', e);
    process.exit(1);
});
