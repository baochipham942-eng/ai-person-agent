/**
 * 刷新所有人物的 YouTube 内容
 * 删除旧的 YouTube 内容，重新抓取
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

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
                    // 处理引号
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
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

async function searchYouTubeVideos(query: string, maxResults: number = 10) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.warn('GOOGLE_API_KEY not configured');
        return [];
    }

    try {
        const params = new URLSearchParams({
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: String(maxResults),
            order: 'relevance',
            key: apiKey,
        });

        const response = await fetch(`${YOUTUBE_API_URL}/search?${params}`);
        if (!response.ok) {
            console.error('YouTube search error:', await response.text());
            return [];
        }

        const data = await response.json();
        return (data.items || []).map((item: any) => ({
            id: item.id?.videoId || '',
            title: item.snippet?.title || '',
            description: item.snippet?.description || '',
            publishedAt: item.snippet?.publishedAt || '',
            url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
            thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
        }));
    } catch (error) {
        console.error('YouTube search error:', error);
        return [];
    }
}

async function refreshPersonYouTube(personId: string, personName: string) {
    console.log(`\n=== 刷新 YouTube: ${personName} ===`);

    // 1. 删除旧内容
    const deleted = await prisma.rawPoolItem.deleteMany({
        where: {
            personId,
            sourceType: 'youtube',
        },
    });
    console.log(`  删除旧数据: ${deleted.count} 条`);

    // 2. 重新抓取
    console.log(`  正在搜索 YouTube: "${personName}"`);
    // 使用英文名搜索可能更好，但这里先用名字
    const videos = await searchYouTubeVideos(personName, 10);
    console.log(`  获取到视频: ${videos.length} 条`);

    // 3. 保存
    for (const v of videos) {
        // 创建唯一hash
        const urlHash = crypto.createHash('md5').update(v.url).digest('hex');
        const contentHash = crypto.createHash('md5').update((v.description || v.title).slice(0, 1000)).digest('hex');

        await prisma.rawPoolItem.upsert({
            where: { urlHash },
            create: {
                personId,
                sourceType: 'youtube',
                url: v.url,
                urlHash,
                contentHash,
                title: v.title,
                text: v.description,
                publishedAt: v.publishedAt ? new Date(v.publishedAt) : new Date(),
                metadata: {
                    videoId: v.id,
                    thumbnailUrl: v.thumbnailUrl,
                },
                fetchStatus: 'success',
            },
            update: {
                title: v.title,
                text: v.description,
                metadata: {
                    videoId: v.id,
                    thumbnailUrl: v.thumbnailUrl,
                },
                fetchedAt: new Date(),
            },
        });
    }
    console.log(`  ✅ 保存完成`);
}

async function main() {
    const persons = await prisma.people.findMany();
    console.log(`找到 ${persons.length} 个人物\n`);

    for (const person of persons) {
        await refreshPersonYouTube(person.id, person.name);
        await new Promise(r => setTimeout(r, 1000));
    }

    await prisma.$disconnect();
}

main().catch(console.error);
