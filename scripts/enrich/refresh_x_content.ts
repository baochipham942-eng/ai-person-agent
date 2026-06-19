/**
 * 刷新所有人物的X推文内容
 * 删除旧的X内容，使用新的Live Search重新抓取
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { fetchXPostsWithXaiSearch } from '../../lib/datasources/xai-x-search';

// 手动加载 .env 文件
function loadEnv() {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    let value = valueParts.join('=').trim();
                    if ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    process.env[key.trim()] = value;
                }
            }
        });
    }
}

loadEnv();

const prisma = new PrismaClient();

interface XPost {
    id: string;
    text: string;
    date: string;
    url: string;
    author?: string;
}

async function fetchXPosts(personName: string, xHandle?: string): Promise<XPost[]> {
    if (!process.env.XAI_API_KEY) {
        console.error('XAI_API_KEY not configured');
        return [];
    }

    try {
        const result = await fetchXPostsWithXaiSearch({
            query: personName,
            maxResults: 15,
            xHandle,
        });
        return result.posts;
    } catch (error) {
        console.error('Grok API failed:', error);
        return [];
    }
}

async function refreshPersonXContent(personId: string, personName: string, xHandle?: string) {
    console.log(`\n=== 刷新: ${personName} ===`);

    // 1. 删除旧的X内容
    const deleted = await prisma.rawPoolItem.deleteMany({
        where: {
            personId,
            sourceType: 'x',
        },
    });
    console.log(`  删除旧X内容: ${deleted.count} 条`);

    // 2. 获取新的X推文
    console.log(`  正在抓取新推文... (xHandle: ${xHandle || 'none'})`);
    const posts = await fetchXPosts(personName, xHandle);
    console.log(`  获取到推文: ${posts.length} 条`);

    // 3. 保存新推文
    for (const post of posts) {
        const urlHash = crypto.createHash('md5').update(post.url).digest('hex');
        const contentHash = crypto.createHash('md5').update((post.text || post.url).slice(0, 1000)).digest('hex');

        await prisma.rawPoolItem.upsert({
            where: { urlHash },
            create: {
                personId,
                sourceType: 'x',
                url: post.url,
                urlHash,
                contentHash,
                title: post.text || `Post by @${post.author}`,
                text: post.text,
                publishedAt: (() => {
                    if (!post.date) return new Date();
                    const parsed = new Date(post.date);
                    return isNaN(parsed.getTime()) ? new Date() : parsed;
                })(),
                metadata: {
                    author: post.author,
                    postId: post.id,
                },
                fetchStatus: 'success',
            },
            update: {
                title: post.text || `Post by @${post.author}`,
                text: post.text,
                metadata: {
                    author: post.author,
                    postId: post.id,
                },
                fetchedAt: new Date(),
            },
        });
    }

    console.log(`  ✅ 保存完成: ${posts.length} 条推文`);

    // 打印前3条
    posts.slice(0, 3).forEach((p, i) => {
        console.log(`    ${i + 1}. @${p.author}: ${(p.text || '').slice(0, 40)}...`);
        console.log(`       ${p.url}`);
    });
}

async function main() {
    console.log('=== 刷新所有人物的X内容 ===\n');

    // 获取所有人物及其X Handle
    const persons = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            officialLinks: true,
        },
    });

    console.log(`找到 ${persons.length} 个人物\n`);

    for (const person of persons) {
        // 从 officialLinks 中提取 X handle
        const links = person.officialLinks as any[] || [];
        const xLink = links.find(l => l.type === 'x');
        const xHandle = xLink?.handle;

        await refreshPersonXContent(person.id, person.name, xHandle);

        // 避免API限流，稍作等待
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n=== 全部完成 ===');
    await prisma.$disconnect();
}

main().catch(console.error);
