/**
 * 使用 Perplexity 补充缺失的职业时间线日期
 * 
 * Perplexity 优势：
 * - 直接联网搜索，结果更准确
 * - 可以精确提问特定时间信息
 * 
 * 成本：~$0.005/请求，140条 ≈ $0.70
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { prisma } from '../lib/db/prisma';
import { searchPerplexity } from '../lib/datasources/perplexity';

interface DateResult {
    startYear?: number;
    endYear?: number | 'present';
}

/**
 * 解析 Perplexity 返回的年份信息
 */
function parseDateResponse(content: string): DateResult | null {
    try {
        // 尝试提取年份
        const startMatch = content.match(/start[:\s]*(\d{4})/i) || content.match(/(\d{4})\s*[-–~]\s*/);
        const endMatch = content.match(/end[:\s]*(\d{4}|present)/i) || content.match(/[-–~]\s*(\d{4}|present)/i);

        // 或者直接找整个响应中的年份
        const years = content.match(/\d{4}/g);

        if (startMatch || (years && years.length > 0)) {
            const startYear = startMatch ? parseInt(startMatch[1]) : (years ? parseInt(years[0]) : undefined);
            let endYear: number | 'present' | undefined;

            if (endMatch) {
                endYear = endMatch[1].toLowerCase() === 'present' ? 'present' : parseInt(endMatch[1]);
            } else if (years && years.length > 1) {
                endYear = parseInt(years[years.length - 1]);
            }

            // 验证年份合理性
            if (startYear && startYear > 1900 && startYear < 2030) {
                return { startYear, endYear };
            }
        }

        return null;
    } catch {
        return null;
    }
}

async function main() {
    console.log('=== 使用 Perplexity 补充时间线日期 ===\n');

    // 检查 API Key
    if (!process.env.PERPLEXITY_API_KEY) {
        console.error('❌ PERPLEXITY_API_KEY 未配置');
        process.exit(1);
    }

    // 1. 找出所有缺少开始日期的记录
    const missingDates = await prisma.personRole.findMany({
        where: { startDate: null },
        include: {
            person: { select: { id: true, name: true } },
            organization: { select: { id: true, name: true, nameZh: true } }
        }
    });

    console.log(`共有 ${missingDates.length} 条记录缺少开始日期`);

    // 按人物分组，避免重复搜索同一个人
    const byPerson = new Map<string, typeof missingDates>();
    for (const role of missingDates) {
        const personId = role.personId;
        if (!byPerson.has(personId)) {
            byPerson.set(personId, []);
        }
        byPerson.get(personId)!.push(role);
    }

    console.log(`涉及 ${byPerson.size} 个人物\n`);

    let updatedCount = 0;
    let searchCount = 0;
    let notFoundCount = 0;

    // 2. 对每个人的每个缺失记录进行搜索
    for (const [personId, roles] of byPerson) {
        const person = roles[0].person;
        console.log(`\n处理: ${person.name}`);
        console.log(`  缺失日期的角色数: ${roles.length}`);

        for (const role of roles) {
            const orgName = role.organization.name;
            const orgNameZh = role.organization.nameZh;
            const displayOrg = orgNameZh || orgName;

            try {
                // 构造精确的提问
                const query = `When did ${person.name} work at or attend ${orgName}? Please provide the start year and end year if available. Answer format: Start: YYYY, End: YYYY or present`;

                console.log(`  搜索: ${displayOrg}...`);
                searchCount++;

                const response = await searchPerplexity(query,
                    'You are a research assistant. Provide only the years in format "Start: YYYY, End: YYYY" or say "Unknown" if not found.',
                    { temperature: 0.1 }
                );

                // 解析结果
                const dateResult = parseDateResponse(response.content);

                if (dateResult?.startYear) {
                    const startDate = new Date(dateResult.startYear, 0, 1);
                    const endDate = dateResult.endYear === 'present'
                        ? null
                        : (typeof dateResult.endYear === 'number' ? new Date(dateResult.endYear, 11, 31) : null);

                    await prisma.personRole.update({
                        where: { id: role.id },
                        data: {
                            startDate,
                            ...(endDate ? { endDate } : {})
                        }
                    });

                    console.log(`  ✅ 更新: ${displayOrg} -> ${dateResult.startYear}${dateResult.endYear ? ` - ${dateResult.endYear}` : ''}`);
                    updatedCount++;
                } else {
                    console.log(`  ❌ 未找到: ${displayOrg} (响应: ${response.content.slice(0, 50)}...)`);
                    notFoundCount++;
                }

                // 避免请求过快
                await new Promise(r => setTimeout(r, 500));

            } catch (error: any) {
                console.error(`  ❌ 搜索失败: ${displayOrg} - ${error.message}`);
                notFoundCount++;
            }
        }
    }

    console.log('\n=== 统计 ===');
    console.log(`搜索次数: ${searchCount}`);
    console.log(`更新成功: ${updatedCount} 条`);
    console.log(`未找到: ${notFoundCount} 条`);

    // 重新统计
    const remaining = await prisma.personRole.count({ where: { startDate: null } });
    console.log(`\n剩余缺失开始日期: ${remaining} 条`);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('脚本失败:', e);
    process.exit(1);
});
