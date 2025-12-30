/**
 * Grok API 真实搜索测试
 * 测试 search_parameters 模式获取真实X推文和引用链接
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

const XAI_API_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const apiKey = process.env.XAI_API_KEY;

async function testGrokLiveSearch() {
    console.log('=== Grok Live Search 测试 ===\n');
    console.log('API Base URL:', XAI_API_URL);
    console.log('API Key configured:', apiKey ? `${apiKey.slice(0, 10)}...` : 'NOT SET');
    console.log('');

    if (!apiKey) {
        console.error('❌ XAI_API_KEY 未配置');
        process.exit(1);
    }

    const testQuery = 'Elon Musk recent tweets about AI';
    console.log(`测试查询: "${testQuery}"\n`);

    try {
        console.log('正在调用 Grok API (带 search_parameters)...\n');

        const response = await fetch(`${XAI_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'grok-3',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant. When providing X/Twitter posts, always include the direct URL to each post.',
                    },
                    {
                        role: 'user',
                        content: testQuery,
                    },
                ],
                // 启用实时搜索
                search_parameters: {
                    mode: 'on',  // 强制启用搜索
                    return_citations: true,  // 返回引用链接
                    max_search_results: 10,
                    sources: ['x'],  // 只搜索X
                },
                temperature: 0.3,
            }),
        });

        console.log('响应状态:', response.status, response.statusText);

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ API 错误:', JSON.stringify(data, null, 2));
            return;
        }

        console.log('\n✅ API 调用成功!\n');

        const content = data.choices?.[0]?.message?.content || '';
        console.log('=== 返回内容 ===\n');
        console.log(content);

        // 检查是否有 citations
        console.log('\n=== Citations (引用链接) ===');
        if (data.citations) {
            console.log(JSON.stringify(data.citations, null, 2));
        } else if (data.choices?.[0]?.citations) {
            console.log(JSON.stringify(data.choices[0].citations, null, 2));
        } else {
            console.log('未找到 citations 字段');
            console.log('\n完整响应结构:');
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('❌ API 调用失败:', error);
    }
}

testGrokLiveSearch();
