/**
 * 刷新所有人物的 Podcast 内容 (使用 iTunes Search API)
 */
import { PrismaClient } from '@prisma/client';
import { searchPodcasts } from './lib/datasources/itunes';
import { buildRawPoolIdentity, contentHash } from '../../lib/rawpool-identity';

const prisma = new PrismaClient();

async function refreshPersonPodcasts(personId: string, personName: string) {
    console.log(`\n=== 刷新 Podcast: ${personName} ===`);

    // 1. 删除旧内容
    const deleted = await prisma.rawPoolItem.deleteMany({
        where: {
            personId,
            sourceType: 'podcast',
        },
    });
    console.log(`  删除旧数据: ${deleted.count} 条`);

    // 2. 重新抓取
    console.log(`  正在搜索 Podcast: "${personName}"`);
    const podcasts = await searchPodcasts(personName, 5);
    console.log(`  获取到播客: ${podcasts.length} 条`);

    // 3. 保存
    for (const p of podcasts) {
        const metadata = {
            thumbnailUrl: p.thumbnailUrl,
            feedUrl: p.feedUrl,
            categories: p.categories,
        };
        const identity = buildRawPoolIdentity({ personId, sourceType: 'podcast', url: p.url, metadata });
        const itemMetadata = { ...metadata, rawPoolCanonicalKey: identity.canonicalKey };
        const itemContentHash = contentHash(p.title + p.author);

        await prisma.rawPoolItem.upsert({
            where: { urlHash: identity.urlHash },
            create: {
                personId,
                sourceType: 'podcast',
                url: p.url,
                urlHash: identity.urlHash,
                contentHash: itemContentHash,
                title: p.title,
                text: p.author, // 存作者
                publishedAt: p.publishedAt || new Date(),
                metadata: itemMetadata,
                fetchStatus: 'success',
            },
            update: {
                title: p.title,
                text: p.author,
                contentHash: itemContentHash,
                metadata: itemMetadata,
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
        await refreshPersonPodcasts(person.id, person.name);
        // wait a bit
        await new Promise(r => setTimeout(r, 1000));
    }

    await prisma.$disconnect();
}

main().catch(console.error);
