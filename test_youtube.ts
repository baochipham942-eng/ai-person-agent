/**
 * YouTube API 测试脚本
 * 直接测试 YouTube Data API v3 是否能正常工作
 */

import * as fs from 'fs';
import * as path from 'path';

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
                    // 移除引号
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

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
const apiKey = process.env.GOOGLE_API_KEY;

async function testYouTubeAPI() {
    console.log('=== YouTube API 测试 ===\n');
    console.log('API Key configured:', apiKey ? `${apiKey.slice(0, 10)}...` : 'NOT SET');
    console.log('');

    if (!apiKey) {
        console.error('❌ GOOGLE_API_KEY 未配置，请在 .env 文件中添加');
        process.exit(1);
    }

    const testQuery = 'Geoffrey Hinton AI interview';
    console.log(`测试查询: "${testQuery}"\n`);

    try {
        console.log('正在调用 YouTube Search API...\n');

        const params = new URLSearchParams({
            part: 'snippet',
            q: testQuery,
            type: 'video',
            maxResults: '5',
            order: 'relevance',
            key: apiKey,
        });

        const response = await fetch(`${YOUTUBE_API_URL}/search?${params}`);

        console.log('响应状态:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API 错误响应:', errorText);
            return;
        }

        const data = await response.json();
        console.log('\n✅ API 调用成功!\n');

        const items = data.items || [];
        console.log(`找到 ${items.length} 个视频:\n`);

        for (const item of items) {
            console.log(`📺 ${item.snippet?.title}`);
            console.log(`   URL: https://www.youtube.com/watch?v=${item.id?.videoId}`);
            console.log(`   发布时间: ${item.snippet?.publishedAt}`);
            console.log('');
        }

        console.log('=== 配额信息 ===');
        console.log('注意: YouTube Data API v3 每日配额 10,000 单位');
        console.log('search 请求消耗 100 单位/次');

    } catch (error) {
        console.error('❌ API 调用失败:', error);
    }
}

testYouTubeAPI();
