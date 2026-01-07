/**
 * 重新抓取数据稀缺人物的职业经历
 * 针对时间线记录 < 3 的人物
 * 包含强化的防污染(Anti-Pollution)逻辑
 */

import 'dotenv/config';
import { prisma } from '../lib/db/prisma';
import { searchExa } from '../lib/datasources/exa';
import { generateText } from 'ai';
import { deepseek } from '../lib/ai/deepseek';

// 定义时间线事件接口
interface ExtractedTimelineEvent {
    title: string;           // Organization name
    role?: string;           // Position
    startDate?: string;      // YYYY or YYYY-MM
    endDate?: string;        // YYYY or YYYY-MM or "present"
    type: 'career' | 'education' | 'founding';
    confidence: number;
}

/**
 * 强化的 AI 提取函数，包含防污染指令
 */
async function extractTimelineWithAntiPollution(
    personName: string,
    text: string
): Promise<ExtractedTimelineEvent[]> {
    try {
        const prompt = `You are a strict data extractor for AI Researchers and Tech Professionals.
Target Person: "${personName}"

Task: Extract career and education timeline events from the provided text.

CRITICAL ANTI-POLLUTION RULES:
1. IGNORE any information related to historical figures, emperors, dynasties, or ancient history (e.g., AD 900s, Tang/Song/Jin dynasties).
2. ONLY extract events related to: 
   - Modern Education (Universities, Colleges)
   - Tech Career (Companies like Google, OpenAI, Microsoft, startups)
   - Academic Research (Labs, Institutes, Professorships)
3. If the text describes a historical figure with the same name, return an empty array [].

For each valid event, extract:
- title: Organization name (Official English or Chinese name)
- role: Position/Degree (e.g., "PhD Student", "Research Scientist", "Co-founder")
- startDate: YYYY or YYYY-MM (or null)
- endDate: YYYY or YYYY-MM or "present" (or null)
- type: "career" | "education" | "founding"
- confidence: 0.0-1.0

Text to Analyze:
${text.slice(0, 8000)}

Return ONLY a JSON array. Example:
[{"title": "Google DeepMind", "role": "Research Scientist", "startDate": "2018", "endDate": "present", "type": "career", "confidence": 0.95}]
`;

        const result = await generateText({
            model: deepseek('deepseek-chat'),
            prompt,
            temperature: 0.0, // 降低创造性，提高准确性
            maxTokens: 2000,
        } as any);

        const content = result.text?.trim() || '[]';
        let jsonStr = content;
        if (content.startsWith('```')) {
            jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        }

        return JSON.parse(jsonStr) as ExtractedTimelineEvent[];

    } catch (error) {
        console.error(`Error extracting for ${personName}:`, error);
        return [];
    }
}

async function main() {
    console.log('=== 开始重新抓取稀缺数据 (Anti-Pollution Mode) ===\n');

    // 1. 找出数据稀缺的人物 (< 3 条记录)
    const personRoleCounts = await prisma.personRole.groupBy({
        by: ['personId'],
        _count: { id: true }
    });

    const countMap = new Map<string, number>();
    personRoleCounts.forEach(p => countMap.set(p.personId, p._count.id));

    const allPeople = await prisma.people.findMany({
        select: { id: true, name: true, occupation: true }
    });

    const targets = allPeople.filter(p => (countMap.get(p.id) || 0) < 3);

    console.log(`共发现 ${targets.length} 位数据稀缺人物，准备开始抓取...\n`);

    let processedCount = 0;
    let addedRolesCount = 0;

    for (const person of targets) {
        processedCount++;
        console.log(`[${processedCount}/${targets.length}] 处理: ${person.name}`);

        try {
            // 2. Exa 搜索 (添加负向关键词排除历史干扰)
            const query = `"${person.name}" AI career history biography linkedin -history -emperor -dynasty -ancient -novel`;

            // 搜索结果
            const searchResults = await searchExa({
                query,
                numResults: 5, // 取前5条最相关的
                type: 'neural', // 使用 neural 搜索以获得更好的语义匹配
                useAutoprompt: true
            });

            if (searchResults.length === 0) {
                console.log('  ⚠️ 无搜索结果');
                continue;
            }

            // 合并文本 (限制长度)
            const combinedText = searchResults.map(r =>
                `Source: ${r.title}\n${r.text.slice(0, 2000)}`
            ).join('\n\n');

            // 3. AI 提取
            const events = await extractTimelineWithAntiPollution(person.name, combinedText);

            if (events.length === 0) {
                console.log('  ⚠️ AI 未提取到有效事件');
                continue;
            }

            console.log(`  ✅ 提取到 ${events.length} 个事件`);

            // 4. 入库
            for (const event of events) {
                // 跳过信心不足的
                if (event.confidence < 0.6) continue;
                if (!event.title) continue;

                // 查找或创建组织
                // 先尝试模糊匹配组织名
                let org = await prisma.organization.findFirst({
                    where: {
                        OR: [
                            { name: { equals: event.title, mode: 'insensitive' } },
                            { nameZh: { equals: event.title, mode: 'insensitive' } }
                        ]
                    }
                });

                if (!org) {
                    // 推断类型
                    const isSchool = /university|college|institute|school|academy/i.test(event.title);

                    // 创建新组织
                    org = await prisma.organization.create({
                        data: {
                            name: event.title,
                            // 简单的中英文判断
                            nameZh: /[\u4e00-\u9fa5]/.test(event.title) ? event.title : undefined,
                            type: isSchool ? 'school' : 'company'
                        }
                    });
                }

                // 创建角色 (检查是否已存在类似记录以免重复)
                const existingRole = await prisma.personRole.findFirst({
                    where: {
                        personId: person.id,
                        organizationId: org.id,
                        // 如果角色名相近，视为同一条
                        role: { contains: event.role || '', mode: 'insensitive' }
                    }
                });

                if (!existingRole) {
                    // 解析日期
                    const start = event.startDate ? new Date(event.startDate) : null;
                    let end = event.endDate ? new Date(event.endDate) : null;
                    if (event.endDate === 'present') end = null; // null 表示至今? 或者我们需要确认业务逻辑
                    // 业务逻辑通常 startDate not null, endDate null 且业务层显示"至今"
                    // 但这里为了准确，如果 AI 说 present, 我们就留 null

                    if (start && isNaN(start.getTime())) continue; // 无效日期跳过
                    if (end && isNaN(end.getTime())) continue;

                    await prisma.personRole.create({
                        data: {
                            personId: person.id,
                            organizationId: org.id,
                            role: event.role || 'Member',
                            startDate: start,
                            endDate: end,
                            source: 'AI_RECRAWL',
                            confidence: event.confidence
                        }
                    });
                    addedRolesCount++;
                    console.log(`    + 添加: ${event.title} (${event.startDate} - ${event.endDate})`);
                }
            }

            // 避免 API 速率限制
            await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            console.error(`  ❌ 处理失败:`, error);
        }
    }

    console.log('\n=== 抓取完成 ===');
    console.log(`处理人物: ${processedCount}`);
    console.log(`新增记录: ${addedRolesCount}`);
}

main().catch(console.error);
