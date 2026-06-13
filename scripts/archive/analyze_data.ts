/**
 * 时光轴数据质量分析脚本
 *
 * 目的：找出可能存在重名人物数据混淆的时光轴记录
 * 策略：
 * 1. 获取所有人物及其时光轴数据
 * 2. 使用 DeepSeek 验证每个人的时光轴是否与其身份匹配
 * 3. 输出可疑数据列表
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

interface PersonWithRoles {
    id: string;
    name: string;
    nameZh: string | null;
    qid: string | null;
    bio: string | null;
    bioZh: string | null;
    occupation: string[];
    organization: string[];
    roles: {
        id: string;
        role: string;
        roleZh: string | null;
        startDate: Date | null;
        endDate: Date | null;
        source: string;
        organization: {
            name: string;
            nameZh: string | null;
            type: string;
        };
    }[];
}

async function analyzeWithDeepSeek(person: PersonWithRoles): Promise<{
    isValid: boolean;
    confidence: number;
    issues: string[];
    analysis: string;
}> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    // 处理 API URL，移除可能重复的 /v1 后缀
    let apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com';
    // 如果 URL 已经包含 /v1，则不再添加
    if (apiUrl.endsWith('/v1')) {
        apiUrl = apiUrl; // 保持原样，后面拼接 /chat/completions
    } else if (apiUrl.endsWith('/')) {
        apiUrl = apiUrl + 'v1';
    } else {
        apiUrl = apiUrl + '/v1';
    }

    if (!apiKey) {
        return { isValid: true, confidence: 0, issues: ['No API key'], analysis: '' };
    }

    const rolesText = person.roles.map(r => {
        const start = r.startDate ? r.startDate.getFullYear() : '?';
        const end = r.endDate ? r.endDate.getFullYear() : '至今';
        return `- ${r.organization.name} (${r.organization.nameZh || r.organization.type}): ${r.role} (${start}-${end}) [来源: ${r.source}]`;
    }).join('\n');

    const prompt = `你是一个数据质量审核专家。请分析以下 AI 领域人物的时光轴数据是否准确。

## 人物信息
- 姓名: ${person.name} (${person.nameZh || '无中文名'})
- Wikidata QID: ${person.qid || '无'}
- 简介: ${person.bio || person.bioZh || '无'}
- 职业: ${person.occupation.join(', ') || '无'}
- 所属机构: ${person.organization.join(', ') || '无'}

## 时光轴数据
${rolesText || '无时光轴数据'}

## 分析任务
请判断时光轴数据是否属于这个人物本身，而不是其他同名人物的数据。

重点检查：
1. 时光轴中的机构/公司是否与该人物的 AI/科技领域背景匹配
2. 职位是否合理（例如一个 AI 研究员不应该有"演员"、"运动员"等职位）
3. 时间线是否合理（例如不应该有古代或明显不属于当代的记录）
4. 是否有明显的数据混淆迹象（如同时在完全不相关的领域工作）

## 输出格式 (JSON)
{
  "isValid": true/false,  // 数据是否准确
  "confidence": 0.0-1.0,  // 置信度
  "issues": ["问题1", "问题2"],  // 发现的具体问题
  "analysis": "简短分析说明"
}

只返回 JSON，不要其他内容。`;

    try {
        const res = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`  API Error: ${res.status} - ${errorText}`);
            return { isValid: true, confidence: 0, issues: [`API Error: ${res.status}`], analysis: '' };
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';

        // 解析 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return { isValid: true, confidence: 0, issues: ['无法解析响应'], analysis: content };
    } catch (e: any) {
        console.error(`  DeepSeek Error: ${e.message}`);
        return { isValid: true, confidence: 0, issues: [e.message], analysis: '' };
    }
}

async function main() {
    console.log('=== 时光轴数据质量分析 ===\n');

    const db = getClient();

    try {
        // 获取所有有时光轴数据的人物
        console.log('正在获取人物数据...');
        const people = await db.people.findMany({
            where: {
                roles: {
                    some: {}  // 至少有一条时光轴记录
                }
            },
            include: {
                roles: {
                    include: {
                        organization: true
                    },
                    orderBy: {
                        startDate: 'desc'
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        console.log(`共找到 ${people.length} 个有时光轴数据的人物\n`);

        const suspiciousPeople: {
            person: PersonWithRoles;
            result: Awaited<ReturnType<typeof analyzeWithDeepSeek>>;
        }[] = [];

        // 分析每个人物
        for (let i = 0; i < people.length; i++) {
            const person = people[i] as PersonWithRoles;
            console.log(`[${i + 1}/${people.length}] 分析: ${person.name} (${person.nameZh || '-'})`);
            console.log(`  时光轴条数: ${person.roles.length}`);

            const result = await analyzeWithDeepSeek(person);

            console.log(`  置信度: ${result.confidence}`);
            console.log(`  是否有效: ${result.isValid}`);

            if (!result.isValid || result.confidence < 0.7) {
                console.log(`  ⚠️ 发现问题: ${result.issues.join(', ')}`);
                suspiciousPeople.push({ person, result });
            } else {
                console.log(`  ✓ 数据正常`);
            }

            console.log('');

            // 限速
            await new Promise(r => setTimeout(r, 500));
        }

        // 输出汇总报告
        console.log('\n========================================');
        console.log('=== 数据质量分析报告 ===');
        console.log('========================================\n');

        console.log(`总人数: ${people.length}`);
        console.log(`可疑数据: ${suspiciousPeople.length}`);
        console.log(`通过率: ${((people.length - suspiciousPeople.length) / people.length * 100).toFixed(1)}%\n`);

        if (suspiciousPeople.length > 0) {
            console.log('=== 可疑数据列表 ===\n');

            for (const { person, result } of suspiciousPeople) {
                console.log(`----------------------------------------`);
                console.log(`人物: ${person.name} (${person.nameZh || '-'})`);
                console.log(`QID: ${person.qid || '无'}`);
                console.log(`置信度: ${result.confidence}`);
                console.log(`问题:`);
                result.issues.forEach(issue => console.log(`  - ${issue}`));
                console.log(`分析: ${result.analysis}`);
                console.log(`时光轴数据:`);
                person.roles.forEach(r => {
                    const start = r.startDate ? r.startDate.getFullYear() : '?';
                    const end = r.endDate ? r.endDate.getFullYear() : '至今';
                    console.log(`  - ${r.organization.name}: ${r.role} (${start}-${end})`);
                });
                console.log('');
            }
        }

    } catch (e: any) {
        console.error('Error:', e.message);
    } finally {
        await db.$disconnect();
    }
}

main();
