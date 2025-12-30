/**
 * Grok API 测试脚本
 * 直接测试 Grok API 是否能通过代理正常工作
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
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    }
}

loadEnv();

const XAI_API_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const apiKey = process.env.XAI_API_KEY;

async function testGrokAPI() {
    console.log('=== Grok API 测试 ===\n');
    console.log('API Base URL:', XAI_API_URL);
    console.log('API Key configured:', apiKey ? `${apiKey.slice(0, 10)}...` : 'NOT SET');
    console.log('');

    if (!apiKey) {
        console.error('❌ XAI_API_KEY 未配置，请在 .env 文件中添加');
        process.exit(1);
    }

    const testQuery = 'Geoffrey Hinton AI research latest developments';
    console.log(`测试查询: "${testQuery}"\n`);

    try {
        console.log('正在调用 Grok API...\n');

        const response = await fetch(`${XAI_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'grok-beta',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a research assistant. Search for recent posts and discussions about the given topic on X (Twitter). Provide a summary of the key points and list the sources.',
                    },
                    {
                        role: 'user',
                        content: `Search for recent posts about: ${testQuery}. Focus on insights, opinions, and discussions. Limit to 10 most relevant posts.`,
                    },
                ],
                temperature: 0.3,
            }),
        });

        console.log('响应状态:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API 错误响应:', errorText);
            return;
        }

        const data = await response.json();
        console.log('\n✅ API 调用成功!\n');

        const content = data.choices?.[0]?.message?.content || '';
        console.log('=== 返回内容 ===\n');
        console.log(content);
        console.log('\n=== 原始响应结构 ===');
        console.log('Model:', data.model);
        console.log('Usage:', JSON.stringify(data.usage, null, 2));

    } catch (error) {
        console.error('❌ API 调用失败:', error);
    }
}

testGrokAPI();
