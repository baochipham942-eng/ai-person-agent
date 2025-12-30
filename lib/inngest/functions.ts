import { inngest } from './client';
import { prisma } from '@/lib/db/prisma';
import { searchPersonContent } from '@/lib/datasources/exa';
import { getPersonXActivity } from '@/lib/datasources/grok';
import { getChannelVideos, searchYouTubeVideos } from '@/lib/datasources/youtube';
import { searchOpenAlexAuthor, getAuthorWorks } from '@/lib/datasources/openalex';
import { searchPodcasts } from '@/lib/datasources/itunes';
import { generateCardsForPerson, saveCardsToDatabase } from '@/lib/ai/cardGenerator';
import crypto from 'crypto';

/**
 * 构建人物页面的后台任务
 * 从多个数据源并行获取数据
 */
export const buildPersonJob = inngest.createFunction(
    {
        id: 'build-person-page',
        retries: 3,
        concurrency: {
            limit: 5, // 最多同时运行5个任务
        },
    },
    { event: 'person/created' },
    async ({ event, step }) => {
        const { personId, personName, qid, officialLinks, aliases, englishName } = event.data;

        // 搜索用的名称：优先使用英文名（API 检索更准确），否则使用中文名
        const searchName = englishName || personName;
        console.log(`[Job] Building person: ${personName} (Search: ${searchName})`);

        // 更新状态为 building
        await step.run('update-status-building', async () => {
            await prisma.people.update({
                where: { id: personId },
                data: { status: 'building' },
            });
        });

        // 提取官方链接信息
        type OfficialLink = { type: string; url: string; handle?: string };
        const xHandle = (officialLinks as OfficialLink[]).find(l => l.type === 'x')?.handle;
        const youtubeChannelId = (officialLinks as OfficialLink[]).find(l => l.type === 'youtube')?.handle;
        const seedDomains = (officialLinks as OfficialLink[])
            .filter(l => l.type === 'website' || l.type === 'blog')
            .map(l => {
                try {
                    return new URL(l.url).hostname;
                } catch {
                    return null;
                }
            })
            .filter(Boolean) as string[];

        // 并行获取各数据源
        const results = await Promise.allSettled([
            // 1. Exa 网页搜索 (Exa 中文支持尚可，但英文更全？保留原样或用 searchName?)
            // Exa 搜索通常混合语言较好，或者使用中文名获取中文内容给用户看
            step.run('fetch-exa', async () => {
                const exaResults = await searchPersonContent(personName, aliases, seedDomains);
                return exaResults.map(r => ({
                    sourceType: 'exa',
                    url: r.url,
                    title: r.title,
                    text: r.text,
                    publishedAt: r.publishedDate ? new Date(r.publishedDate) : null,
                    metadata: { author: r.author },
                }));
            }),

            // 2. X/Grok 社交内容 (使用真实搜索获取推文)
            step.run('fetch-grok', async () => {
                const grokResult = await getPersonXActivity(searchName, xHandle);

                // 如果有解析出的独立推文，返回每条推文作为单独条目
                if (grokResult.posts && grokResult.posts.length > 0) {
                    return grokResult.posts.map(post => ({
                        sourceType: 'x',
                        url: post.url,
                        title: post.text || `Post by @${post.author}`,
                        text: post.text,
                        publishedAt: post.date ? new Date(post.date) : new Date(),
                        metadata: {
                            author: post.author,
                            postId: post.id,
                        },
                    }));
                }

                // 兜底：如果没有解析出独立推文，返回摘要
                if (!grokResult.summary) return [];
                return [{
                    sourceType: 'x',
                    url: xHandle ? `https://x.com/${xHandle}` : `https://x.com/search?q=${encodeURIComponent(searchName)}`,
                    title: `${searchName} on X`,
                    text: grokResult.summary,
                    publishedAt: new Date(),
                    metadata: { sources: grokResult.sources },
                }];
            }),

            // 3. YouTube (使用英文名搜索视频更丰富)
            step.run('fetch-youtube', async () => {
                let videos;
                if (youtubeChannelId) {
                    videos = await getChannelVideos(youtubeChannelId, 20);
                } else {
                    videos = await searchYouTubeVideos(searchName, 10);
                }
                return videos.map(v => ({
                    sourceType: 'youtube',
                    url: v.url,
                    title: v.title,
                    text: v.description,
                    publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
                    metadata: { videoId: v.id, thumbnailUrl: v.thumbnailUrl },
                }));
            }),

            // 4. OpenAlex 学术论文 (必须使用英文名)
            step.run('fetch-openalex', async () => {
                const authors = await searchOpenAlexAuthor(searchName);
                if (authors.length === 0) return [];

                // 取第一个匹配的作者
                const author = authors[0];
                const works = await getAuthorWorks(author.id, 20);

                return works.map(w => ({
                    sourceType: 'openalex',
                    url: w.url || w.id,
                    title: w.title,
                    text: w.abstract || `${w.title}. ${w.venue || ''}. Cited by ${w.citationCount}.`,
                    publishedAt: w.publicationDate ? new Date(w.publicationDate) : null,
                    metadata: {
                        doi: w.doi,
                        citationCount: w.citationCount,
                        venue: w.venue,
                        authors: w.authors,
                    },
                }));
            }),

            // 5. Podcast (iTunes)
            step.run('fetch-podcasts', async () => {
                // 使用中文名搜索，效果更好
                const podcasts = await searchPodcasts(searchName, 5);
                return podcasts.map(p => ({
                    sourceType: 'podcast',
                    url: p.url,
                    title: p.title,
                    text: p.author, // 将作者存入 text 字段
                    publishedAt: p.publishedAt || null,
                    metadata: {
                        thumbnailUrl: p.thumbnailUrl,
                        feedUrl: p.feedUrl,
                        categories: p.categories,
                    },
                }));
            }),
        ]);

        // 收集所有成功的结果
        const allItems: any[] = [];
        let successCount = 0;
        let errorCount = 0;

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                allItems.push(...result.value);
                successCount++;
            } else {
                errorCount++;
                console.error('Data source failed:', result);
            }
        }

        // 保存到 RawPoolItem
        await step.run('save-raw-items', async () => {
            for (const item of allItems) {
                const urlHash = crypto.createHash('md5').update(item.url).digest('hex');
                const contentHash = crypto.createHash('md5').update(item.text.slice(0, 1000)).digest('hex');

                // 使用 upsert 避免重复
                await prisma.rawPoolItem.upsert({
                    where: { urlHash },
                    create: {
                        personId,
                        sourceType: item.sourceType,
                        url: item.url,
                        urlHash,
                        contentHash,
                        title: item.title,
                        text: item.text,
                        publishedAt: item.publishedAt,
                        metadata: item.metadata,
                        fetchStatus: 'success',
                    },
                    update: {
                        // 如果已存在，更新内容
                        title: item.title,
                        text: item.text,
                        metadata: item.metadata,
                        fetchedAt: new Date(),
                    },
                });
            }
        });

        // 生成学习卡片 (Phase 3)
        let cardsGenerated = 0;
        if (allItems.length > 0) {
            await step.run('generate-cards', async () => {
                const rawItems = allItems.map(item => ({
                    title: item.title,
                    text: item.text,
                    url: item.url,
                }));

                const cards = await generateCardsForPerson(personId, personName, rawItems);
                if (cards.length > 0) {
                    await saveCardsToDatabase(personId, cards);
                    cardsGenerated = cards.length;
                }
            });
        }

        // 更新人物状态和完成度
        await step.run('update-status-final', async () => {
            const completeness = Math.round((successCount / 4) * 100);
            const status = errorCount === 0 ? 'ready' : errorCount < 4 ? 'partial' : 'error';

            await prisma.people.update({
                where: { id: personId },
                data: {
                    status,
                    completeness,
                },
            });
        });

        return {
            personId,
            itemsCollected: allItems.length,
            cardsGenerated,
            successCount,
            errorCount,
        };
    }
);

/**
 * 导出所有 Inngest 函数
 */
export const functions = [buildPersonJob];
