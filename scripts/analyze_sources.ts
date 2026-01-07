/**
 * 分析内容来源缺失情况
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PersonSource {
    name: string;
    hasX: boolean;
    hasXLink: boolean;
    hasYouTube: boolean;
    hasGitHub: boolean;
    hasGitHubLink: boolean;
    hasPapers: boolean;
    hasCards: boolean;
}

async function main() {
    console.log('=== 内容来源分析 ===\n');

    const people = await prisma.people.findMany({
        include: {
            rawPoolItems: { select: { sourceType: true } },
            cards: { select: { id: true } }
        }
    });

    const sources: PersonSource[] = [];

    // 统计
    let hasXLink = 0, hasXContent = 0;
    let hasGitHubLink = 0, hasGitHubContent = 0;
    let hasYouTubeContent = 0;
    let hasPaperContent = 0;

    for (const person of people) {
        const links = (person.officialLinks as any[]) || [];
        const items = person.rawPoolItems || [];

        const xLink = links.some(l => l.type === 'x' || l.type === 'twitter');
        const xContent = items.some(i => i.sourceType === 'x');
        const githubLink = links.some(l => l.type === 'github');
        const githubContent = items.some(i => i.sourceType === 'github');
        const youtubeContent = items.some(i => i.sourceType === 'youtube');
        const paperContent = items.some(i => i.sourceType === 'paper' || i.sourceType === 'openalex');

        if (xLink) hasXLink++;
        if (xContent) hasXContent++;
        if (githubLink) hasGitHubLink++;
        if (githubContent) hasGitHubContent++;
        if (youtubeContent) hasYouTubeContent++;
        if (paperContent) hasPaperContent++;

        sources.push({
            name: person.name,
            hasX: xContent,
            hasXLink: xLink,
            hasYouTube: youtubeContent,
            hasGitHub: githubContent,
            hasGitHubLink: githubLink,
            hasPapers: paperContent,
            hasCards: (person.cards?.length || 0) > 0
        });
    }

    console.log('=== 整体覆盖率 ===');
    console.log(`X链接: ${hasXLink}/${people.length} (${Math.round(hasXLink / people.length * 100)}%)`);
    console.log(`X内容: ${hasXContent}/${people.length} (${Math.round(hasXContent / people.length * 100)}%)`);
    console.log(`GitHub链接: ${hasGitHubLink}/${people.length} (${Math.round(hasGitHubLink / people.length * 100)}%)`);
    console.log(`GitHub内容: ${hasGitHubContent}/${people.length} (${Math.round(hasGitHubContent / people.length * 100)}%)`);
    console.log(`YouTube内容: ${hasYouTubeContent}/${people.length} (${Math.round(hasYouTubeContent / people.length * 100)}%)`);
    console.log(`论文内容: ${hasPaperContent}/${people.length} (${Math.round(hasPaperContent / people.length * 100)}%)`);

    // 有链接但没内容的（需要抓取）
    const needXFetch = sources.filter(s => s.hasXLink && !s.hasX);
    const needGitHubFetch = sources.filter(s => s.hasGitHubLink && !s.hasGitHub);

    console.log('\n=== 有链接但没抓取内容 (需要触发抓取) ===');
    console.log(`X: ${needXFetch.length} 人`);
    needXFetch.slice(0, 10).forEach(s => console.log(`  - ${s.name}`));
    console.log(`GitHub: ${needGitHubFetch.length} 人`);
    needGitHubFetch.slice(0, 10).forEach(s => console.log(`  - ${s.name}`));

    // 确实没有的（需要补充链接或确认不存在）
    const noXAtAll = sources.filter(s => !s.hasXLink && !s.hasX);
    const noGitHubAtAll = sources.filter(s => !s.hasGitHubLink && !s.hasGitHub);
    const noYouTube = sources.filter(s => !s.hasYouTube);
    const noPapers = sources.filter(s => !s.hasPapers);

    console.log('\n=== 确实没有链接 (需要确认是否真的没有) ===');
    console.log(`无X: ${noXAtAll.length} 人`);
    noXAtAll.forEach(s => console.log(`  - ${s.name}`));
    console.log(`\n无GitHub链接: ${noGitHubAtAll.length} 人 (部分人确实不写代码)`);
    console.log(`\n无YouTube: ${noYouTube.length} 人`);
    console.log(`无论文: ${noPapers.length} 人`);
}

main().finally(() => prisma.$disconnect());
