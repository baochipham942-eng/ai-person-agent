
/**
 * X简介抓取脚本
 * 使用twitter syndication API获取用户信息
 * 
 * 数据存储在 officialLinks 的 twitter 条目中:
 * {
 *   platform: 'twitter',
 *   url: 'https://x.com/username',
 *   bio: '用户简介...',
 *   name: '显示名称',
 *   followers: 1000000,
 *   fetchedAt: '2026-01-02T00:00:00Z'
 * }
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

interface TwitterUserInfo {
    name: string;
    screen_name: string;
    description: string;
    followers_count: number;
    profile_image_url_https: string;
}

async function fetchTwitterBio(username: string): Promise<TwitterUserInfo | null> {
    try {
        // 使用 Twitter syndication API（公开接口）
        const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`;

        const cmd = `curl -s -L -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" "${url}"`;
        const { stdout } = await execPromise(cmd, { timeout: 10000 });

        if (!stdout || stdout.includes('error')) {
            console.log(`  syndication API failed, trying alternative...`);
            return null;
        }

        // 解析HTML中的用户信息
        // Twitter会返回HTML，其中包含JSON数据
        const dataMatch = stdout.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (dataMatch) {
            const jsonData = JSON.parse(dataMatch[1]);
            const user = jsonData?.props?.pageProps?.timeline?.entries?.[0]?.content?.tweet?.user;
            if (user) {
                return {
                    name: user.name,
                    screen_name: user.screen_name,
                    description: user.description,
                    followers_count: user.followers_count,
                    profile_image_url_https: user.profile_image_url_https
                };
            }
        }

        return null;
    } catch (error) {
        console.error(`  Error fetching Twitter bio: ${(error as Error).message}`);
        return null;
    }
}

async function fetchTwitterBioAlternative(username: string): Promise<{ bio: string; name?: string; followers?: number } | null> {
    try {
        // 备选方案：直接访问X页面并提取meta标签
        const url = `https://x.com/${username}`;

        const cmd = `curl -s -L --max-time 10 -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Accept-Language: en-US,en;q=0.9" "${url}"`;
        const { stdout } = await execPromise(cmd, { timeout: 15000 });

        if (!stdout) return null;

        // 尝试提取 meta description
        const descMatch = stdout.match(/<meta name="description" content="([^"]+)"/);
        if (descMatch) {
            // 从description中提取bio（通常格式是 "Posts from @username. bio content here."）
            let bio = descMatch[1];
            // 清理常见前缀
            bio = bio.replace(/^Posts from @\w+\.\s*/, '');
            bio = bio.replace(/^The latest.*from @\w+\.\s*/, '');

            if (bio && bio.length > 10) {
                return { bio };
            }
        }

        // 尝试从 og:description 提取
        const ogDescMatch = stdout.match(/<meta property="og:description" content="([^"]+)"/);
        if (ogDescMatch) {
            let bio = ogDescMatch[1];
            bio = bio.replace(/^Posts from @\w+\.\s*/, '');
            bio = bio.replace(/^The latest.*from @\w+\.\s*/, '');

            if (bio && bio.length > 10) {
                return { bio };
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

async function main() {
    console.log('=== 抓取X用户简介 ===\n');

    // 获取所有有X链接的人
    const people = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            officialLinks: true
        }
    });

    let updated = 0;
    let failed = 0;

    for (const person of people) {
        const links = (person.officialLinks as any[]) || [];
        const xLinkIndex = links.findIndex(l =>
            l.platform === 'twitter' ||
            l.type === 'twitter' ||
            l.type === 'x' ||
            (l.url && (l.url.includes('twitter.com') || l.url.includes('x.com')))
        );

        if (xLinkIndex === -1) continue;

        const xLink = links[xLinkIndex];

        // 如果已经有bio且不是今天抓取的，跳过
        if (xLink.bio && xLink.fetchedAt) {
            const fetchedDate = new Date(xLink.fetchedAt);
            const today = new Date();
            if (fetchedDate.toDateString() === today.toDateString()) {
                continue;
            }
        }

        // 提取用户名
        const urlMatch = xLink.url?.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
        if (!urlMatch) continue;

        const username = urlMatch[1];
        console.log(`处理: ${person.name} (@${username})`);

        // 尝试获取简介
        let bioInfo = await fetchTwitterBio(username);

        if (!bioInfo) {
            const altInfo = await fetchTwitterBioAlternative(username);
            if (altInfo) {
                bioInfo = {
                    name: '',
                    screen_name: username,
                    description: altInfo.bio,
                    followers_count: altInfo.followers || 0,
                    profile_image_url_https: ''
                };
            }
        }

        if (bioInfo && bioInfo.description) {
            // 更新link
            links[xLinkIndex] = {
                ...xLink,
                platform: 'twitter',
                bio: bioInfo.description,
                displayName: bioInfo.name || xLink.displayName,
                followers: bioInfo.followers_count || xLink.followers,
                fetchedAt: new Date().toISOString()
            };

            await prisma.people.update({
                where: { id: person.id },
                data: { officialLinks: links }
            });

            console.log(`  ✅ 简介: ${bioInfo.description.slice(0, 50)}...`);
            updated++;
        } else {
            console.log(`  ❌ 无法获取简介`);
            failed++;
        }

        // 避免请求太快
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n=== 完成 ===`);
    console.log(`成功: ${updated}, 失败: ${failed}`);
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
