/**
 * 使用 Grok API 继续查找剩余无链接人物的 X 账号
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const XAI_API_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

// 已经处理过的人（无X账号）
const ALREADY_PROCESSED = [
    '杨植麟', 'Paul Graham', 'Eliezer Yudkowsky', '朱啸虎', '肖弘',
    '沈向洋', '贾佳亚', '印奇', 'Jeremy Howard'
];

async function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

async function findXHandleViaGrok(personName: string, aliases: string[]): Promise<{ handle?: string; error?: string }> {
    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
        return { error: 'XAI_API_KEY not configured' };
    }

    try {
        const aliasStr = aliases.length > 0 ? ` (also known as: ${aliases.join(', ')})` : '';
        const prompt = `Find the official, verified Twitter/X handle for "${personName}"${aliasStr}. This person is likely a notable figure in AI, tech, or academia.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "handle": "@username",
  "confidence": "high" | "medium" | "low"
}

If you cannot find their X account or they don't have one, return:
{
  "handle": null,
  "reason": "explanation"
}`;

        const response = await fetch(`${XAI_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'grok-2-1212',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that finds official X/Twitter handles for notable people. Return ONLY valid JSON.' },
                    { role: 'user', content: prompt },
                ],
                search_parameters: {
                    mode: 'on',
                    return_citations: false,
                    sources: ['x', 'web'],
                },
                temperature: 0.1,
            }),
        });

        if (!response.ok) {
            return { error: `API error: ${response.status}` };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart === -1) {
            return { error: 'No JSON found' };
        }

        const parsed = JSON.parse(content.substring(jsonStart, jsonEnd + 1));

        if (parsed.handle && parsed.handle !== 'null' && parsed.handle !== null) {
            const cleanHandle = parsed.handle.replace('@', '').trim();
            return { handle: cleanHandle };
        }

        return { error: parsed.reason || 'Handle not found' };
    } catch (error) {
        return { error: `Exception: ${(error as Error).message}` };
    }
}

async function main() {
    console.log('=== Grok API 继续查找剩余无链接人物 ===\n');

    const people = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            aliases: true,
            officialLinks: true
        }
    });

    // 筛选出没有 X 链接且没有被处理过的人
    const noXLink: { id: string; name: string; aliases: string[]; links: any[] }[] = [];

    for (const person of people) {
        const links = (person.officialLinks as any[]) || [];
        const xLink = links.find(l =>
            l.platform === 'twitter' ||
            l.type === 'twitter' ||
            l.type === 'x' ||
            (l.url && (l.url.includes('twitter.com') || l.url.includes('x.com')))
        );

        if (!xLink && !ALREADY_PROCESSED.includes(person.name)) {
            noXLink.push({ id: person.id, name: person.name, aliases: person.aliases || [], links });
        }
    }

    console.log(`待处理人数: ${noXLink.length}\n`);

    let success = 0;
    for (let i = 0; i < noXLink.length; i++) {
        const person = noXLink[i];
        console.log(`[${i + 1}/${noXLink.length}] ${person.name}`);

        const result = await findXHandleViaGrok(person.name, person.aliases);

        if (result.handle && !result.error) {
            person.links.push({
                platform: 'twitter',
                type: 'twitter',
                url: `https://x.com/${result.handle}`,
                foundVia: 'grok',
                addedAt: new Date().toISOString()
            });

            await prisma.people.update({
                where: { id: person.id },
                data: { officialLinks: person.links }
            });

            console.log(`  ✅ 找到账号: @${result.handle}`);
            success++;
        } else {
            console.log(`  ❌ ${result.error || '未找到'}`);
        }

        await sleep(1500);
    }

    console.log(`\n=== 完成 ===`);
    console.log(`成功: ${success}/${noXLink.length}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
