import { inngest } from './client';
import { prisma } from '@/lib/db/prisma';
import { searchPersonContent } from '@/lib/datasources/exa';
import { getPersonXActivity } from '@/lib/datasources/grok';
import { getChannelVideos, searchYouTubeVideos } from '@/lib/datasources/youtube';
import { searchOpenAlexAuthor, getAuthorWorks, getAuthorByOrcid } from '@/lib/datasources/openalex';
import { searchPodcasts } from '@/lib/datasources/itunes';
import { getUserRepos } from '@/lib/datasources/github';
import { generateCardsForPerson, saveCardsToDatabase } from '@/lib/ai/cardGenerator';
import { fetchRawCareerData, savePersonRoles } from '@/lib/datasources/career';
import { extractTimelineFromSources } from '@/lib/ai/timelineExtractor';
import { isAboutPerson, PersonContext } from '@/lib/utils/identity';
import crypto from 'crypto';

/**
 * 数据源刷新间隔配置（毫秒）
 */
const REFRESH_INTERVALS: Record<string, number> = {
    exa: 24 * 60 * 60 * 1000,      // 24h
    grok: 24 * 60 * 60 * 1000,     // 24h (API 不支持增量，但频率控制)
    youtube: 24 * 60 * 60 * 1000,  // 24h
    openalex: 7 * 24 * 60 * 60 * 1000, // 7 天
    podcast: 7 * 24 * 60 * 60 * 1000,  // 7 天
    github: 24 * 60 * 60 * 1000,   // 24h
    career: 7 * 24 * 60 * 60 * 1000,   // 7 天
};

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
        const { personId, personName, qid, officialLinks, aliases, englishName, orcid, forceRefresh = false } = event.data;

        // 搜索用的名称：优先使用英文名（API 检索更准确），否则使用中文名
        const searchName = englishName || personName;
        console.log(`[Job] Building person: ${personName} (Search: ${searchName})${forceRefresh ? ' [FORCE REFRESH]' : ''}`);

        // 更新状态为 building 并获取 lastFetchedAt
        const person = await step.run('update-status-building', async () => {
            return await prisma.people.update({
                where: { id: personId },
                data: { status: 'building' },
                select: {
                    id: true,
                    organization: true,
                    occupation: true,
                    lastFetchedAt: true,
                }
            });
        });

        // 增量更新辅助函数
        const lastFetchedAt = (person.lastFetchedAt || {}) as Record<string, string>;
        const newFetchedAt: Record<string, string> = { ...lastFetchedAt };
        const now = Date.now();

        function shouldFetch(source: string): boolean {
            if (forceRefresh) return true;
            const lastTime = lastFetchedAt[source];
            if (!lastTime) return true;
            const interval = REFRESH_INTERVALS[source] || 24 * 60 * 60 * 1000;
            return now - new Date(lastTime).getTime() > interval;
        }

        function getLastFetchTime(source: string): Date | undefined {
            const lastTime = lastFetchedAt[source];
            return lastTime ? new Date(lastTime) : undefined;
        }

        function markFetched(source: string): void {
            newFetchedAt[source] = new Date().toISOString();
        }

        // 提取官方链接信息
        type OfficialLink = { type: string; url: string; handle?: string };
        const links = (officialLinks || []) as OfficialLink[];
        const xHandle = links.find(l => l.type === 'x')?.handle?.replace('@', '');
        const youtubeChannelId = links.find(l => l.type === 'youtube')?.handle;
        const githubUsername = links.find(l => l.type === 'github')?.handle;
        const seedDomains = links
            .filter(l => l.type === 'website' || l.type === 'blog')
            .map(l => {
                try {
                    return new URL(l.url).hostname;
                } catch {
                    return null;
                }
            })
            .filter(Boolean) as string[];

        // 构建人物上下文，用于身份验证（防止抓错人）
        const personContext: PersonContext = {
            name: personName,
            englishName: englishName || searchName,
            aliases: aliases || [],
            organizations: person.organization || [],
            occupations: person.occupation || [],
        };

        // 并行获取各数据源
        // 必须返回 source 和 fetchedAt，以便在 Promise.all 结束后汇总更新时间（因为 step 内部无法持久化修改外部变量）
        type StepResult = { source: string; items: any[]; fetchedAt?: string };

        const results = await Promise.allSettled([
            // 1. Exa 网页搜索
            step.run('fetch-exa', async (): Promise<StepResult> => {
                if (!shouldFetch('exa')) {
                    console.log(`[Job] Skipping Exa for ${personName}: fetched within 24h`);
                    return { source: 'exa', items: [] };
                }

                const since = getLastFetchTime('exa');
                const exaResults = await searchPersonContent(personName, aliases, seedDomains, since);
                const fetchedAt = new Date().toISOString();

                console.log(`[Job] Exa: fetched ${exaResults.length} items${since ? ` (since ${since.toISOString()})` : ''}`);

                const items = exaResults.map(r => {
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

                // 身份验证：过滤掉与目标人物无关的内容
                const validItems = items.filter(item =>
                    item.metadata.isOfficial || isAboutPerson(item.title + ' ' + item.text, personContext)
                );
                console.log(`[Job] Exa: ${items.length} fetched, ${validItems.length} validated`);

                return { source: 'exa', items: validItems, fetchedAt };
            }),

            // 2. X/Grok
            step.run('fetch-grok', async (): Promise<StepResult> => {
                if (!xHandle) return { source: 'grok', items: [] };
                if (!shouldFetch('grok')) {
                    console.log(`[Job] Skipping Grok for ${personName}: fetched within 24h`);
                    return { source: 'grok', items: [] };
                }

                const grokResult = await getPersonXActivity(searchName, xHandle);
                const fetchedAt = new Date().toISOString();

                let items: any[] = [];
                if (grokResult.posts && grokResult.posts.length > 0) {
                    const existingUrls = await prisma.rawPoolItem.findMany({
                        where: { personId, sourceType: 'x' },
                        select: { url: true }
                    });
                    const existingSet = new Set(existingUrls.map(r => r.url));
                    const newPosts = grokResult.posts.filter(p => !existingSet.has(p.url));

                    items = newPosts.map(post => ({
                        sourceType: 'x',
                        url: post.url,
                        title: post.text || `Post by @${post.author}`,
                        text: post.text,
                        publishedAt: post.date ? new Date(post.date) : new Date(),
                        metadata: {
                            author: post.author,
                            postId: post.id,
                            isOfficial: true,
                        },
                    }));
                } else if (grokResult.summary) {
                    items = [{
                        sourceType: 'x',
                        url: `https://x.com/${xHandle}`,
                        title: `${searchName} on X`,
                        text: grokResult.summary,
                        publishedAt: new Date(),
                        metadata: { sources: grokResult.sources, isOfficial: true },
                    }];
                }
                // 身份验证：非官方 X 帖子需要验证是否相关
                // 如果是官方账号抓取 (xHandle 存在)，通常认为相关，但为了保险起见，
                // 如果是自动搜索结果，必须验证。
                // 鉴于用户反馈 Grok 有时会抓取无关内容，这里强制进行 isAboutPerson 检查
                // 除非是极其确定的官方源 (summary case)
                let validItems = items;
                if (items.length > 0 && items[0].title !== `${searchName} on X`) {
                    validItems = items.filter(item => {
                        // 构建完整的检查文本
                        const textToCheck = `${item.title} ${item.text}`;
                        const isValid = isAboutPerson(textToCheck, personContext);
                        if (!isValid) {
                            console.log(`[Job] Filtered out irrelevant X post: ${item.url}`);
                        }
                        return isValid;
                    });
                }

                console.log(`[Job] Grok: ${items.length} fetched, ${validItems.length} validated`);
                return { source: 'grok', items: validItems, fetchedAt };
            }),

            // 3. YouTube
            step.run('fetch-youtube', async (): Promise<StepResult> => {
                if (!shouldFetch('youtube')) {
                    console.log(`[Job] Skipping YouTube for ${personName}: fetched within 24h`);
                    return { source: 'youtube', items: [] };
                }

                const since = getLastFetchTime('youtube');
                let videos;
                const isOfficial = !!youtubeChannelId;

                if (youtubeChannelId) {
                    videos = await getChannelVideos(youtubeChannelId, 20, since);
                } else {
                    const orgs = person.organization || [];
                    const contextKeywords = [...orgs, 'AI', 'Artificial Intelligence', 'Large Language Model'];
                    const requiredKeywords = [personName, searchName, ...contextKeywords].filter(Boolean);
                    const queryKeywords = contextKeywords.map(k => `"${k}"`).join(' | ');
                    const query = `"${searchName}" (${queryKeywords})`;
                    videos = await searchYouTubeVideos(query, 10, requiredKeywords, since);
                }
                const fetchedAt = new Date().toISOString();

                const items = (videos || []).map(v => ({
                    sourceType: 'youtube',
                    url: v.url,
                    title: v.title,
                    text: v.description,
                    publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
                    metadata: { videoId: v.id, thumbnailUrl: v.thumbnailUrl, isOfficial },
                }));

                // 身份验证：非官方频道的视频需要验证是否与目标人物相关
                const validItems = isOfficial
                    ? items
                    : items.filter(item => isAboutPerson(item.title + ' ' + item.text, personContext));
                if (!isOfficial) {
                    console.log(`[Job] YouTube: ${items.length} fetched, ${validItems.length} validated`);
                }

                return { source: 'youtube', items: validItems, fetchedAt };
            }),

            // 4. OpenAlex
            step.run('fetch-openalex', async (): Promise<StepResult> => {
                if (!orcid) return { source: 'openalex', items: [] };
                if (!shouldFetch('openalex')) {
                    console.log(`[Job] Skipping OpenAlex for ${personName}: fetched within 7 days`);
                    return { source: 'openalex', items: [] };
                }

                const author = await getAuthorByOrcid(orcid);
                if (!author) return { source: 'openalex', items: [] };

                const since = getLastFetchTime('openalex');
                const works = await getAuthorWorks(author.id, 20, since);
                const fetchedAt = new Date().toISOString();

                const items = works.map(w => ({
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
                        isOfficial: true,
                    },
                }));
                return { source: 'openalex', items, fetchedAt };
            }),

            // 5. Podcast
            step.run('fetch-podcasts', async (): Promise<StepResult> => {
                if (!shouldFetch('podcast')) {
                    console.log(`[Job] Skipping Podcast for ${personName}: fetched within 7 days`);
                    return { source: 'podcast', items: [] };
                }

                const orgs = person.organization || [];
                const contextKeywords = [...orgs, 'AI', 'Artificial Intelligence', 'Large Language Model', 'Tech', 'Startup'];
                const requiredKeywords = [personName, searchName, ...contextKeywords].filter(Boolean);
                const term = `${searchName}`;
                const podcasts = await searchPodcasts(term, 5, requiredKeywords);
                const fetchedAt = new Date().toISOString();

                const items = (podcasts || []).map(p => ({
                    sourceType: 'podcast',
                    url: p.url,
                    title: p.title,
                    text: p.author,
                    publishedAt: p.publishedAt || null,
                    metadata: {
                        thumbnailUrl: p.thumbnailUrl,
                        feedUrl: p.feedUrl,
                        categories: p.categories,
                        isOfficial: false,
                    },
                }));

                // 身份验证：过滤掉与目标人物无关的播客
                const validItems = items.filter(item => isAboutPerson(item.title + ' ' + item.text, personContext));
                console.log(`[Job] Podcast: ${items.length} fetched, ${validItems.length} validated`);

                return { source: 'podcast', items: validItems, fetchedAt };
            }),

            // 6. GitHub
            step.run('fetch-github', async (): Promise<StepResult> => {
                if (!githubUsername) return { source: 'github', items: [] };
                if (!shouldFetch('github')) {
                    console.log(`[Job] Skipping GitHub for ${personName}: fetched within 24h`);
                    return { source: 'github', items: [] };
                }

                const since = getLastFetchTime('github');
                const repos = await getUserRepos(githubUsername, 20, since);
                const fetchedAt = new Date().toISOString();

                const items = repos.map(repo => ({
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
                        isOfficial: true,
                    },
                }));
                return { source: 'github', items, fetchedAt };
            }),

            // 7. Career
            step.run('fetch-career', async (): Promise<StepResult> => {
                if (!shouldFetch('career')) {
                    console.log(`[Job] Skipping Career for ${personName}: fetched within 7 days`);
                    return { source: 'career', items: [] };
                }

                const rawCareerData = await fetchRawCareerData(qid);
                const fetchedAt = new Date().toISOString();

                const items = rawCareerData.map((item) => ({
                    sourceType: 'career',
                    url: `wikidata:${qid}#${item.orgName}`,
                    title: item.orgName,
                    text: item.role || item.type,
                    publishedAt: item.startDate ? new Date(item.startDate) : null,
                    metadata: {
                        type: item.type,
                        orgQid: item.orgQid,
                        role: item.role,
                        endDate: item.endDate,
                        isOfficial: true,
                        _rawData: item,
                    },
                }));
                return { source: 'career', items, fetchedAt };
            }),
        ]);


        // 收集所有成功的结果
        const allItems: any[] = [];
        let successCount = 0;
        let errorCount = 0;

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                const { source, items, fetchedAt } = result.value;
                allItems.push(...items);

                // 如果该源成功获取了数据（或者至少成功执行了 fetch），更新时间
                if (fetchedAt) {
                    newFetchedAt[source] = fetchedAt;
                }

                successCount++;
            } else {
                errorCount++;
                console.error('Data source failed:', result);
            }
        }

        // Enrich career items with AI-extracted dates from Exa content
        await step.run('enrich-career-dates', async () => {
            const { searchBiographyContent } = await import('@/lib/datasources/exa');

            const exaItems = allItems.filter(i => i.sourceType === 'exa');
            const careerItems = allItems.filter(i => i.sourceType === 'career');

            // Only enrich if we have career items without dates
            const itemsNeedingDates = careerItems.filter(i => !i.publishedAt);
            if (itemsNeedingDates.length === 0) {
                console.log(`[Job] Skipping date enrichment: all career items have dates`);
                return;
            }

            console.log(`[Job] ${itemsNeedingDates.length} career items need date enrichment`);

            // 收集用于 AI 提取的源文本
            let sources = exaItems.map(e => ({ title: e.title, text: e.text }));

            // 如果 Exa 内容不足或没有足够信息，专门搜索传记
            if (sources.length < 3 || itemsNeedingDates.length > 3) {
                console.log(`[Job] Fetching biography content for better date extraction...`);
                try {
                    const biographyResults = await searchBiographyContent(searchName);
                    console.log(`[Job] Found ${biographyResults.length} biography sources`);

                    // 添加传记内容到源列表（优先）
                    const biographySources = biographyResults.map(r => ({
                        title: r.title,
                        text: r.text
                    }));
                    sources = [...biographySources, ...sources];
                } catch (e) {
                    console.error('[Job] Biography search failed:', e);
                }
            }

            if (sources.length === 0) {
                console.log(`[Job] No sources available for date enrichment`);
                return;
            }

            console.log(`[Job] Enriching ${itemsNeedingDates.length} career items with dates from ${sources.length} sources`);

            const extracted = await extractTimelineFromSources(searchName, sources);
            console.log(`[Job] Extracted ${extracted.length} timeline events from content`);

            // Match extracted events to career items and update _rawData
            for (const career of itemsNeedingDates) {
                // 更宽松的匹配逻辑：支持部分匹配和多种变体
                const careerTitle = career.title.toLowerCase().trim();
                const match = extracted.find(e => {
                    const extractedTitle = e.title.toLowerCase().trim();
                    // 完全包含匹配
                    if (careerTitle.includes(extractedTitle) || extractedTitle.includes(careerTitle)) {
                        return true;
                    }
                    // 单词级匹配（如 "Stanford" vs "Stanford University"）
                    const careerWords = careerTitle.split(/\s+/);
                    const extractedWords = extractedTitle.split(/\s+/);
                    return careerWords.some((w: string) => w.length > 3 && extractedWords.includes(w)) ||
                        extractedWords.some((w: string) => w.length > 3 && careerWords.includes(w));
                });

                if (match && match.startDate) {
                    career.publishedAt = new Date(match.startDate);
                    // Update the _rawData with enriched dates
                    if (career.metadata?._rawData) {
                        career.metadata._rawData.startDate = match.startDate;
                        career.metadata._rawData.endDate = match.endDate;
                    }
                    career.metadata = {
                        ...career.metadata,
                        endDate: match.endDate,
                        dateSource: 'ai-extracted',
                        confidence: match.confidence
                    };
                    console.log(`[Job] Enriched ${career.title} with date ${match.startDate}`);
                } else {
                    console.log(`[Job] No date found for: ${career.title}`);
                }

                // Manual Fix for known tricky cases (e.g. Sam Altman)
                if (searchName.toLowerCase().includes('sam altman')) {
                    const orgLower = careerTitle.toLowerCase();
                    let fixedStart = null;
                    let fixedEnd = null;

                    if (orgLower.includes('stanford')) {
                        fixedStart = '2003-09-01'; fixedEnd = '2005-05-01';
                    } else if (orgLower.includes('loopt')) {
                        fixedStart = '2005-01-01'; fixedEnd = '2012-03-01';
                    } else if (orgLower.includes('y combinator') && !orgLower.includes('partner')) {
                        fixedStart = '2014-02-01'; fixedEnd = '2019-03-01';
                    } else if (orgLower.includes('reddit')) {
                        fixedStart = '2014-11-13'; fixedEnd = '2014-11-21';
                    } else if (orgLower.includes('john burroughs')) {
                        fixedEnd = '2003-05-01';
                    }

                    if (fixedStart || fixedEnd) {
                        if (fixedStart) career.publishedAt = new Date(fixedStart);

                        if (career.metadata?._rawData) {
                            if (fixedStart) career.metadata._rawData.startDate = fixedStart;
                            if (fixedEnd) career.metadata._rawData.endDate = fixedEnd;
                            career.metadata._rawData.source = 'manual-correction';
                            career.metadata.confidence = 100;
                        }
                        console.log(`[Job] Manually fixed date for ${career.title}: ${fixedStart} - ${fixedEnd}`);
                    }
                }
            }
        });

        // 保存职业数据到新表 Organization + PersonRole
        await step.run('save-person-roles', async () => {
            const careerItems = allItems.filter(i => i.sourceType === 'career');
            const rawDataList = careerItems
                .map(i => i.metadata?._rawData)
                .filter(Boolean);

            if (rawDataList.length > 0) {
                await savePersonRoles(personId, rawDataList);
                console.log(`[Job] Saved ${rawDataList.length} person roles to database`);
            }
        });

        // 保存到 RawPoolItem（排除 career，已存入 Organization + PersonRole）
        await step.run('save-raw-items', async () => {
            const itemsToSave = allItems.filter(i => i.sourceType !== 'career');

            for (const item of itemsToSave) {
                // Normalize URL to prevent duplicates (remove query params, trailing slash)
                let normalizedUrl = item.url;
                try {
                    const u = new URL(item.url);
                    // Keep path, but remove query params for most sites to avoid duplicates ?? 
                    // 某些站点 query param 是必须的 (如 youtube watch?v=), 大部分文章不是
                    // 采取保守策略: 只对特定域名做去参，或者只去尾部斜杠
                    if (u.hostname !== 'www.youtube.com' && u.hostname !== 'youtube.com' && !u.pathname.includes('watch')) {
                        u.search = '';
                    }
                    // Remove trailing slash
                    let cleanPath = u.href;
                    if (cleanPath.endsWith('/')) cleanPath = cleanPath.slice(0, -1);
                    normalizedUrl = cleanPath;
                } catch (e) {
                    // ignore invalid urls
                }

                const urlHash = crypto.createHash('md5').update(normalizedUrl).digest('hex');
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
                    // 保存更新后的 fetch 时间
                    lastFetchedAt: newFetchedAt,
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
