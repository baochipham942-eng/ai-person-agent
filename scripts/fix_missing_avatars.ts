/**
 * 为缺失头像的人物补充头像
 * 
 * 9 人无头像：徐立、丁洁、周明、闫俊杰、陈冕、妮基·帕尔玛、Boris Cherny、亚历克斯·克里泽夫斯基、张鹏
 * 
 * 策略：
 * 1. 尝试从 Twitter/X 头像获取 (unavatar.io)
 * 2. 尝试从 Wikidata 图片获取
 * 3. 尝试从 GitHub 头像获取
 */

import 'dotenv/config';
import { prisma } from '../lib/db/prisma';
import { downloadAndStoreAvatar } from '../lib/storage/avatarStorage';
import { getWikidataEntity } from '../lib/datasources/wikidata';


interface OfficialLink {
    type: string;
    url: string;
    handle?: string;
}

async function tryFetchAvatar(personId: string, sources: string[]): Promise<string | null> {
    for (const source of sources) {
        try {
            console.log(`    尝试: ${source.substring(0, 60)}...`);
            const localPath = await downloadAndStoreAvatar(source, personId);
            if (localPath) {
                return localPath;
            }
        } catch (e) {
            console.log(`    失败`);
        }
    }
    return null;
}

async function main() {
    console.log('=== 开始补充缺失头像 ===\n');

    // 1. 找出所有缺少头像的人物
    const missingAvatars = await prisma.people.findMany({
        where: {
            OR: [
                { avatarUrl: null },
                { avatarUrl: '' }
            ]
        },
        select: {
            id: true,
            name: true,
            qid: true,
            officialLinks: true
        }
    });

    console.log(`共有 ${missingAvatars.length} 人缺少头像:\n`);
    missingAvatars.forEach(p => console.log(`  - ${p.name}`));
    console.log('');

    let successCount = 0;

    for (const person of missingAvatars) {
        console.log(`\n处理: ${person.name}`);

        const avatarSources: string[] = [];
        const rawLinks = person.officialLinks;
        const links: OfficialLink[] = Array.isArray(rawLinks) ? (rawLinks as unknown as OfficialLink[]) : [];

        // 1. 尝试 X/Twitter 头像
        const xLink = links.find(l => l.type === 'x');
        if (xLink?.handle) {
            const handle = xLink.handle.replace('@', '');
            avatarSources.push(`https://unavatar.io/twitter/${handle}`);
        }

        // 2. 尝试 GitHub 头像
        const githubLink = links.find(l => l.type === 'github');
        if (githubLink?.handle) {
            avatarSources.push(`https://github.com/${githubLink.handle}.png`);
            avatarSources.push(`https://avatars.githubusercontent.com/${githubLink.handle}`);
        }

        // 3. 尝试从 Wikidata 获取图片
        try {
            const wikiEntity = await getWikidataEntity(person.qid);
            if (wikiEntity?.imageUrl) {
                avatarSources.push(wikiEntity.imageUrl);
            }
        } catch (e) {
            console.log(`    Wikidata 查询失败`);
        }

        // 4. 尝试名字搜索 (unavatar.io 会尝试多个来源)
        avatarSources.push(`https://unavatar.io/${encodeURIComponent(person.name)}`);

        if (avatarSources.length === 0) {
            console.log(`  ❌ 无可用的头像来源`);
            continue;
        }

        console.log(`  找到 ${avatarSources.length} 个可能来源`);

        const localPath = await tryFetchAvatar(person.id, avatarSources);

        if (localPath) {
            await prisma.people.update({
                where: { id: person.id },
                data: { avatarUrl: localPath }
            });
            console.log(`  ✅ 成功: ${localPath}`);
            successCount++;
        } else {
            console.log(`  ❌ 所有来源都失败`);
        }

        // 避免请求过快
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n=== 完成 ===');
    console.log(`成功补充: ${successCount}/${missingAvatars.length}`);

    // 列出仍然缺失的
    const stillMissing = await prisma.people.findMany({
        where: {
            OR: [
                { avatarUrl: null },
                { avatarUrl: '' }
            ]
        },
        select: { name: true }
    });

    if (stillMissing.length > 0) {
        console.log(`\n仍缺失头像的人物:`);
        stillMissing.forEach(p => console.log(`  - ${p.name}`));
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('脚本失败:', e);
    process.exit(1);
});
