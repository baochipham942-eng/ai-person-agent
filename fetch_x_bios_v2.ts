/**
 * X简介抓取脚本 v2 - 优化版
 * - 增加重试机制（最多3次）
 * - 增加请求间隔（2秒）
 * - 只处理还没有bio的账号
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const PRIORITY_NAMES = [
    'Sam Altman', 'Elon Musk', 'Demis Hassabis', 'Ilya Sutskever', 'Geoffrey Hinton',
    'Yann LeCun', 'Yoshua Bengio', 'Fei-Fei Li', 'Andrew Ng', 'Andrej Karpathy',
    'Greg Brockman', 'Jensen Huang', 'Mark Zuckerberg', 'Sundar Pichai', 'Satya Nadella',
    'Vitalik Buterin', 'Bill Gates', 'Jeff Dean', 'Kai-Fu Lee', 'François Chollet',
    'Hugging Face', 'Daniel Gross', 'Jim Keller', 'John Schulman', 'Dario Amodei',
    'Daniela Amodei', 'Noam Shazeer', 'Aidan Gomez', 'Ashish Vaswani', 'Niki Parmar',
    'Jakob Uszkoreit', 'Llion Jones', 'Lukasz Kaiser', 'Polosukhin'
];

const MAX_RETRIES = 1;
const REQUEST_DELAY = 4000; // 4秒
const RETRY_DELAY = 5000;   // 重试前等待5秒

interface TwitterUserInfo {
    name: string;
    screen_name: string;
    description: string;
    followers_count: number;
}

async function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

async function fetchTwitterBio(username: string, attempt: number = 1): Promise<TwitterUserInfo | null> {
    try {
        const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`;

        const cmd = `curl -s -L --max-time 20 -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Accept: text/html,application/xhtml+xml" -H "Accept-Language: en-US,en;q=0.9" "${url}"`;

        const { stdout } = await execPromise(cmd, { timeout: 25000 });

        if (!stdout || stdout.length < 500) {
            if (attempt < MAX_RETRIES) {
                console.log(`    重试 ${attempt + 1}/${MAX_RETRIES}...`);
                await sleep(RETRY_DELAY);
                return fetchTwitterBio(username, attempt + 1);
            }
            return null;
        }

        // 解析JSON
        const dataMatch = stdout.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (dataMatch) {
            const jsonData = JSON.parse(dataMatch[1]);
            const entries = jsonData?.props?.pageProps?.timeline?.entries || [];

            // 遍历找目标用户
            for (const entry of entries) {
                const user = entry?.content?.tweet?.user;
                if (user && user.screen_name?.toLowerCase() === username.toLowerCase()) {
                    if (user.description) {
                        return {
                            name: user.name || '',
                            screen_name: user.screen_name,
                            description: user.description,
                            followers_count: user.followers_count || 0,
                        };
                    }
                }
            }

            // 兜底：用第一条推文的用户
            const firstUser = entries[0]?.content?.tweet?.user;
            if (firstUser?.description) {
                return {
                    name: firstUser.name || '',
                    screen_name: firstUser.screen_name || username,
                    description: firstUser.description,
                    followers_count: firstUser.followers_count || 0,
                };
            }
        }

        // 解析失败，重试
        if (attempt < MAX_RETRIES) {
            console.log(`    解析失败，重试 ${attempt + 1}/${MAX_RETRIES}...`);
            await sleep(RETRY_DELAY);
            return fetchTwitterBio(username, attempt + 1);
        }

        return null;
    } catch (error) {
        if (attempt < MAX_RETRIES) {
            console.log(`    请求失败，重试 ${attempt + 1}/${MAX_RETRIES}...`);
            await sleep(RETRY_DELAY);
            return fetchTwitterBio(username, attempt + 1);
        }
        return null;
    }
}

async function main() {
    console.log('=== X简介抓取 v2（带优先级） ===\n');

    // 获取所有有X链接但还没有bio的人
    const people = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            officialLinks: true,
            completeness: true // 用于排序
        }
    });

    // 筛选出没有bio的
    const needsFetch: typeof people = [];
    for (const person of people) {
        const links = (person.officialLinks as any[]) || [];
        const xLink = links.find(l =>
            l.platform === 'twitter' ||
            l.type === 'twitter' ||
            l.type === 'x' ||
            (l.url && (l.url.includes('twitter.com') || l.url.includes('x.com')))
        );

        if (xLink && !xLink.bio) {
            needsFetch.push(person);
        }
    }

    // 优先级排序：VIP > Completeness
    needsFetch.sort((a, b) => {
        // 检查 VIP 列表（支持部分匹配）
        const isVipA = PRIORITY_NAMES.some(vip => a.name.includes(vip) || vip.includes(a.name));
        const isVipB = PRIORITY_NAMES.some(vip => b.name.includes(vip) || vip.includes(b.name));

        if (isVipA && !isVipB) return -1;
        if (!isVipA && isVipB) return 1;

        // 如果优先级相同，按 completeness 降序
        return (b.completeness || 0) - (a.completeness || 0);
    });

    // 每次只处理前15个
    const currentBatch = needsFetch.slice(0, 15);
    console.log(`需要抓取简介总数: ${needsFetch.length}`);
    console.log(`本次处理数量: ${currentBatch.length}\n`);

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < currentBatch.length; i++) {
        const person = currentBatch[i];
        const links = (person.officialLinks as any[]) || [];
        const xLinkIndex = links.findIndex(l =>
            l.platform === 'twitter' ||
            l.type === 'twitter' ||
            l.type === 'x' ||
            (l.url && (l.url.includes('twitter.com') || l.url.includes('x.com')))
        );

        const xLink = links[xLinkIndex];
        const urlMatch = xLink.url?.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
        if (!urlMatch) continue;

        const username = urlMatch[1];
        console.log(`[${i + 1}/${needsFetch.length}] ${person.name} (@${username})`);

        const bioInfo = await fetchTwitterBio(username);

        if (bioInfo && bioInfo.description) {
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

            console.log(`  ✅ ${bioInfo.description.slice(0, 60)}...`);
            updated++;
        } else {
            console.log(`  ❌ 无法获取`);
            failed++;
        }

        // 请求间隔
        if (i < needsFetch.length - 1) {
            await sleep(REQUEST_DELAY);
        }
    }

    console.log(`\n=== 完成 ===`);
    console.log(`成功: ${updated}, 失败: ${failed}`);

    // 统计最终结果
    const total = await prisma.people.findMany({ select: { officialLinks: true } });
    let withBio = 0;
    for (const p of total) {
        const links = (p.officialLinks as any[]) || [];
        if (links.find(l => l.platform === 'twitter' && l.bio)) withBio++;
    }
    console.log(`当前有X简介的总人数: ${withBio}`);
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
