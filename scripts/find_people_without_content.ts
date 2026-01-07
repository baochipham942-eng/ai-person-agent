
/**
 * 为无内容的人物触发内容抓取
 * 调用 Inngest 任务或直接抓取
 */

import 'dotenv/config';
import { prisma } from './lib/db/prisma';

// 获取 X handle 从 officialLinks
function getXHandle(officialLinks: any): string | null {
    if (!officialLinks) return null;

    let links: any[] = [];
    if (Array.isArray(officialLinks)) {
        links = officialLinks;
    } else if (typeof officialLinks === 'object') {
        links = Object.values(officialLinks).flat();
    }

    for (const link of links) {
        const url = typeof link === 'string' ? link : link?.url;
        if (!url) continue;

        const match = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/i);
        if (match && match[1] && !['intent', 'search', 'hashtag'].includes(match[1])) {
            return match[1];
        }
    }
    return null;
}

async function main() {
    console.log('=== 查找无内容人物并显示抓取建议 ===\n');

    // 找出没有 RawPoolItems 的人物
    const peopleWithoutContent = await prisma.people.findMany({
        where: {
            rawPoolItems: {
                none: {}
            }
        },
        select: {
            id: true,
            name: true,
            qid: true,
            officialLinks: true,
        }
    });

    console.log(`找到 ${peopleWithoutContent.length} 人无抓取内容\n`);

    // 分类统计
    const withXHandle: { name: string, handle: string }[] = [];
    const withoutXHandle: { name: string }[] = [];

    for (const person of peopleWithoutContent) {
        const handle = getXHandle(person.officialLinks);
        if (handle) {
            withXHandle.push({ name: person.name, handle });
        } else {
            withoutXHandle.push({ name: person.name });
        }
    }

    console.log('=== 有 X handle 的人物 (可抓取 X 动态) ===');
    withXHandle.forEach(p => console.log(`  - ${p.name}: @${p.handle}`));
    console.log(`\n共 ${withXHandle.length} 人\n`);

    console.log('=== 无 X handle 的人物 (需其他来源) ===');
    withoutXHandle.forEach(p => console.log(`  - ${p.name}`));
    console.log(`\n共 ${withoutXHandle.length} 人\n`);

    // 为有 X handle 的人创建一个 handles 列表，用于后续抓取
    if (withXHandle.length > 0) {
        console.log('=== 建议操作 ===');
        console.log('运行以下命令抓取 X 帖子:');
        console.log(`npx tsx fetch_x_posts.ts\n`);

        // 写入 handles 到临时文件
        const handles = withXHandle.map(p => p.handle).join('\n');
        console.log('X 用户列表:');
        console.log(handles);
    }

    // 统计其他可能的来源
    console.log('\n=== 其他抓取建议 ===');
    console.log('对于无 X 账号的人物，可尝试:');
    console.log('1. 学术论文 (OpenAlex): 需要 ORCID 或准确的英文名');
    console.log('2. GitHub 项目: 需要 GitHub username');
    console.log('3. YouTube 视频: 需要频道 ID');
    console.log('4. 新闻文章: 使用 Exa API 搜索');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
