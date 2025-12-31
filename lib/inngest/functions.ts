import { inngest } from './client';
import { prisma } from '@/lib/db/prisma';
import { searchPersonContent } from '@/lib/datasources/exa';
import { getPersonXActivity } from '@/lib/datasources/grok';
import { getChannelVideos, searchYouTubeVideos } from '@/lib/datasources/youtube';
import { searchOpenAlexAuthor, getAuthorWorks, getAuthorByOrcid } from '@/lib/datasources/openalex';
import { searchPodcasts } from '@/lib/datasources/itunes';
import { getUserRepos } from '@/lib/datasources/github';
import { generateCardsForPerson, saveCardsToDatabase } from '@/lib/ai/cardGenerator';
import { getPersonCareer } from '@/lib/datasources/career';
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
        const { personId, personName, qid, officialLinks, aliases, englishName, orcid } = event.data;

        // 搜索用的名称：优先使用英文名（API 检索更准确），否则使用中文名
        const searchName = englishName || personName;
        console.log(`[Job] Building person: ${personName} (Search: ${searchName})`);

        // 更新状态为 building
        // 并获取完整的人物信息（包括 organization）来辅助搜索
        const person = await step.run('update-status-building', async () => {
            return await prisma.people.update({
                where: { id: personId },
                data: { status: 'building' },
                select: {
                    id: true,
                    organization: true,
                    occupation: true
                }
            });
        });

        // 提取官方链接信息
        type OfficialLink = { type: string; url: string; handle?: string };
        const xHandle = (officialLinks as OfficialLink[]).find(l => l.type === 'x')?.handle?.replace('@', '');
        const youtubeChannelId = (officialLinks as OfficialLink[]).find(l => l.type === 'youtube')?.handle;
        const githubUsername = (officialLinks as OfficialLink[]).find(l => l.type === 'github')?.handle;
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
            // 1. Exa 网页搜索
            step.run('fetch-exa', async () => {
                const exaResults = await searchPersonContent(personName, aliases, seedDomains);
                return exaResults.map(r => {
                    // 检查是否来自官方域名
                    let isOfficial = false;
                    try {
                        const hostname = new URL(r.url).hostname;
                        isOfficial = seedDomains.some(d => hostname.includes(d));
                    } catch { }
                    return {
                        sourceType: 'exa',
                        url: r.url,
                        title: r.title,
                        text: r.text,
                        publishedAt: r.publishedDate ? new Date(r.publishedDate) : null,
                        metadata: { author: r.author, isOfficial },
                    };
                });
            }),

            // 2. X/Grok 社交内容 (必须有 xHandle 才拓取，确保官方内容)
            step.run('fetch-grok', async () => {
                // 强制官方：无 xHandle 则跳过
                if (!xHandle) {
                    console.log(`[Job] Skipping Grok for ${personName}: no xHandle`);
                    return [];
                }

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
                            isOfficial: true,  // 来自官方 handle
                        },
                    }));
                }

                // 兆底：如果没有解析出独立推文，返回摘要
                if (!grokResult.summary) return [];
                return [{
                    sourceType: 'x',
                    url: `https://x.com/${xHandle}`,
                    title: `${searchName} on X`,
                    text: grokResult.summary,
                    publishedAt: new Date(),
                    metadata: { sources: grokResult.sources, isOfficial: true },
                }];
            }),

            // 3. YouTube (优先使用官方频道)
            step.run('fetch-youtube', async () => {
                let videos;
                const isOfficial = !!youtubeChannelId;
                if (youtubeChannelId) {
                    videos = await getChannelVideos(youtubeChannelId, 20);
                } else {
                    // 构建更精准的搜索查询
                    // 格式: "Name" (Org1 | Org2 | AI | LLM)
                    const orgs = person.organization || [];
                    const contextKeywords = [...orgs, 'AI', 'Artificial Intelligence', 'Large Language Model'].map(k => `"${k}"`).join(' | ');
                    const query = `"${searchName}" (${contextKeywords})`;

                    console.log(`[Job] Searching YouTube with query: ${query}`);
                    videos = await searchYouTubeVideos(query, 10);
                }
                return videos.map(v => ({
                    sourceType: 'youtube',
                    url: v.url,
                    title: v.title,
                    text: v.description,
                    publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
                    metadata: { videoId: v.id, thumbnailUrl: v.thumbnailUrl, isOfficial },
                }));
            }),

            // 4. OpenAlex 学术论文 (必须有 ORCID 才拓取，确保精准匹配)
            step.run('fetch-openalex', async () => {
                // 强制官方：无 ORCID 则跳过，避免同名误匹配
                if (!orcid) {
                    console.log(`[Job] Skipping OpenAlex for ${personName}: no ORCID`);
                    return [];
                }

                // 通过 ORCID 精准获取作者
                const author = await getAuthorByOrcid(orcid);
                if (!author) {
                    console.log(`[Job] OpenAlex: ORCID ${orcid} not found`);
                    return [];
                }

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
                        isOfficial: true,  // 通过 ORCID 验证
                    },
                }));
            }),

            // 5. Podcast (iTunes) - 非官方内容
            step.run('fetch-podcasts', async () => {
                const podcasts = await searchPodcasts(searchName, 5);
                return podcasts.map(p => ({
                    sourceType: 'podcast',
                    url: p.url,
                    title: p.title,
                    text: p.author,
                    publishedAt: p.publishedAt || null,
                    metadata: {
                        thumbnailUrl: p.thumbnailUrl,
                        feedUrl: p.feedUrl,
                        categories: p.categories,
                        isOfficial: false,  // 播客无法验证官方性
                    },
                }));
            }),

            // 6. GitHub (只有有 username 才拓取，确保官方)
            step.run('fetch-github', async () => {
                if (!githubUsername) {
                    console.log(`[Job] Skipping GitHub for ${personName}: no githubUsername`);
                    return [];
                }

                const repos = await getUserRepos(githubUsername, 20);
                return repos.map(repo => ({
                    sourceType: 'github',
                    url: repo.url,
                    title: repo.name,
                    text: repo.description || '',
                    publishedAt: repo.updatedAt ? new Date(repo.updatedAt) : null,
                    metadata: {
                        stars: repo.stars,
                        forks: repo.forks,
                        language: repo.language,
                        topics: repo.topics,
                        isOfficial: true,  // 来自官方账户
                    },
                }));
            }),

            // 7. Career/Bio (Wikidata) - 职业与教育经历
            step.run('fetch-career', async () => {
                const careerItems = await getPersonCareer(qid);
                return careerItems.map(item => ({
                    sourceType: 'career',
                    url: `https://www.wikidata.org/wiki/${qid}`,
                    title: item.title,
                    text: item.subtitle || item.type,
                    publishedAt: item.startDate ? new Date(item.startDate) : null,
                    metadata: {
                        type: item.type,
                        subtitle: item.subtitle,
                        endDate: item.endDate,
                        isOfficial: true
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
            const completeness = Math.round((successCount / 6) * 100);  // 6 个数据源
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
