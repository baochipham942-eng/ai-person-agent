/**
 * Agent Pipeline - Inngest 集成
 * 
 * 使用 Router Agent + DataSource Adapters + QA Agent 的新架构
 * 替代原有的分散式数据获取逻辑
 */

import { inngest } from './client';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import {
    adapters,
    safeFetch,
    FetchParams,
    SourceType,
    PersonContext as AdapterPersonContext,
    NormalizedItem,
    DataSourceResult,
} from '@/lib/datasources';
import { routerAgent, RouterInput, SourceQualitySignal } from '@/lib/agents/router-agent';
import { cleanItems } from '@/lib/agents/clean-orchestrator';
import { generateCardsForPerson, saveCardsToDatabase } from '@/lib/ai/cardGenerator';
import { savePersonRoles, type RawCareerData } from '@/lib/datasources/career';
import { hashUrl } from '@/lib/datasources/adapter';

const SOURCE_FEEDBACK_WINDOW_DAYS = 90;
const BAD_VERDICTS = new Set(['reject', 'duplicate', 'empty_content', 'incomplete']);

type OfficialLink = { type: string; url: string; handle?: string };
type SerializableNormalizedItem = Omit<NormalizedItem, 'publishedAt'> & {
    publishedAt: Date | string | null;
};

function isRawCareerData(value: unknown): value is RawCareerData {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.type === 'string' && typeof candidate.orgName === 'string';
}

function isSourceType(value: string): value is SourceType {
    return value in adapters;
}

function maxResultsForPriority(priority: 'high' | 'medium' | 'low'): number | undefined {
    if (priority === 'high') return undefined;
    if (priority === 'medium') return 10;
    return 5;
}

async function loadSourceQualitySignals(): Promise<SourceQualitySignal[]> {
    const since = new Date(Date.now() - SOURCE_FEEDBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    let rows: Array<{ sourceType: string; verdict: string; count: number }>;
    try {
        rows = await prisma.$queryRaw<Array<{ sourceType: string; verdict: string; count: number }>>`
            SELECT "sourceType", verdict, COUNT(*)::int AS count
            FROM "QAAuditLog"
            WHERE "createdAt" >= ${since}
            GROUP BY "sourceType", verdict
        `;
    } catch (error) {
        console.warn(`[V2 Job] Router source feedback unavailable: ${(error as Error).message?.slice(0, 160)}`);
        return [];
    }

    const bySource = new Map<SourceType, SourceQualitySignal>();

    for (const row of rows) {
        if (!isSourceType(row.sourceType)) continue;

        const current = bySource.get(row.sourceType) || {
            source: row.sourceType,
            total: 0,
            keep: 0,
            reject: 0,
            review: 0,
            duplicate: 0,
            emptyContent: 0,
            incomplete: 0,
            badRate: 0,
            keepRate: 0,
        };

        const count = Number(row.count);
        current.total += count;

        if (row.verdict === 'keep') current.keep += count;
        else if (row.verdict === 'review') current.review += count;
        else if (row.verdict === 'duplicate') current.duplicate += count;
        else if (row.verdict === 'empty_content') current.emptyContent += count;
        else if (row.verdict === 'incomplete') current.incomplete += count;
        else if (row.verdict === 'reject' || BAD_VERDICTS.has(row.verdict)) current.reject += count;

        bySource.set(row.sourceType, current);
    }

    return [...bySource.values()].map(signal => {
        const bad = signal.reject + signal.duplicate + signal.emptyContent + signal.incomplete + signal.review * 0.5;
        return {
            ...signal,
            badRate: signal.total > 0 ? bad / signal.total : 0,
            keepRate: signal.total > 0 ? signal.keep / signal.total : 0,
        };
    });
}

/**
 * V2: 使用 Agent Pipeline 架构的任务
 */
export const buildPersonJobV2 = inngest.createFunction(
    {
        id: 'build-person-page-v2',
        retries: 3,
        concurrency: { limit: 5 },
        triggers: [{ event: 'person/created.v2' }],
    },
    async ({ event, step }) => {
        const {
            personId,
            personName,
            qid,
            officialLinks = [],
            aliases = [],
            englishName,
            orcid,
            forceRefresh = false
        } = event.data;

        const searchName = englishName || personName;
        console.log(`[V2 Job] Building: ${personName} (${searchName})${forceRefresh ? ' [FORCE]' : ''}`);

        // Step 1: 更新状态并获取人物信息
        const person = await step.run('init', async () => {
            return await prisma.people.update({
                where: { id: personId },
                data: { status: 'building' },
                select: {
                    id: true,
                    organization: true,
                    occupation: true,
                    lastFetchedAt: true,
                },
            });
        });

        // 构建人物上下文
        const personContext: AdapterPersonContext = {
            id: personId,
            name: personName,
            englishName: englishName || searchName,
            aliases: aliases || [],
            organizations: person.organization || [],
            occupations: person.occupation || [],
        };

        // 解析官方链接
        const links = (officialLinks || []) as OfficialLink[];
        const xHandle = links.find(l => l.type === 'x')?.handle?.replace('@', '');
        const youtubeChannelId = links.find(l => l.type === 'youtube')?.handle;
        const githubUsername = links.find(l => l.type === 'github')?.handle;
        const seedDomains = links
            .filter(l => l.type === 'website' || l.type === 'blog')
            .map(l => { try { return new URL(l.url).hostname; } catch { return null; } })
            .filter(Boolean) as string[];

        // 构建 Fetch 参数
        const fetchParams: FetchParams = {
            person: personContext,
            since: undefined, // TODO: 从 lastFetchedAt 计算
            forceRefresh,
            handle: githubUsername || xHandle,
            channelId: youtubeChannelId,
            orcid,
            qid,
            seedDomains,
        };

        // Step 2: Router Agent 决策
        const decision = await step.run('route', async () => {
            const sourceQuality = await loadSourceQualitySignals();
            const input: RouterInput = {
                person: personContext,
                officialLinks: links,
                orcid,
                qid,
                sourceQuality,
            };
            return routerAgent.analyze(input);
        });

        console.log(`[V2 Job] Router decision: ${decision.enabledSources.map(s => s.source).join(', ')}`);
        if (decision.sourceFeedback.length > 0) {
            console.log(`[V2 Job] Router QA feedback: ${decision.sourceFeedback.map(f => `${f.source}:${f.action}`).join(', ')}`);
        }

        // Step 3: 并行调用各 Adapter
        const adapterResults = await step.run('fetch-all', async () => {
            const results: DataSourceResult[] = [];

            // 根据 Router 决策调用 Adapters
            const promises = decision.enabledSources.map(async (sourceDecision) => {
                const source = sourceDecision.source;
                const adapter = adapters[source];
                if (!adapter) {
                    console.warn(`[V2 Job] Unknown adapter: ${source}`);
                    return null;
                }

                const params = { ...fetchParams, ...(sourceDecision.params || {}) } as FetchParams;
                const maxResults = maxResultsForPriority(sourceDecision.priority);
                if (maxResults) params.maxResults = maxResults;

                // 特殊处理：Grok 需要 X handle，防止被 GitHub handle 覆盖
                if (source === 'x' && xHandle) {
                    params.handle = xHandle;
                }

                const result = await safeFetch(adapter, params);
                console.log(`[V2 Job] ${source}: ${result.items.length} items, success: ${result.success}`);
                return result;
            });

            const settled = await Promise.allSettled(promises);
            for (const r of settled) {
                if (r.status === 'fulfilled' && r.value) {
                    results.push(r.value);
                }
            }

            return results;
        });

        // 收集所有 items (从 step 返回的结果中恢复 Date 对象)
        const allItems: NormalizedItem[] = [];
        for (const result of adapterResults) {
            if (result.success) {
                for (const item of result.items) {
                    allItems.push({
                        ...item,
                        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
                    });
                }
            }
        }

        console.log(`[V2 Job] Total items before QA: ${allItems.length}`);

        // Step 4: 三段式清洗 (L0 规则硬过滤 -> L2 模糊去重 -> L1 语义判定 + 审计日志)
        const qaResult = await step.run('qa-check', async () => {
            // 获取已存在的 URL hashes（用于去重）
            const existingItems = await prisma.rawPoolItem.findMany({
                where: { personId },
                select: { urlHash: true },
            });
            const existingHashes = new Set(existingItems.map(i => i.urlHash));

            const result = await cleanItems(allItems, personContext, {
                existingUrlHashes: existingHashes,
                persistAudit: true,
                personId,
            });

            // 返回精简结果 (避免 step 序列化大对象)
            return {
                approved: result.approved,
                report: {
                    approvedCount: result.stats.approved,
                    fixedCount: result.l0.report.fixedCount,
                    rejectedCount: result.stats.l0Rejected + result.stats.dedupDropped + result.stats.semanticRejected,
                    reviewCount: result.stats.semanticReview,
                },
            };
        });

        console.log(`[V2 Job] QA Result: ${qaResult.report.approvedCount} approved, ${qaResult.report.fixedCount} fixed, ${qaResult.report.rejectedCount} rejected, ${qaResult.report.reviewCount} review`);

        // Step 5: 保存到数据库
        const savedCount = await step.run('save-items', async () => {
            let count = 0;
            // 恢复 approved items 的 Date 对象
            const itemsToSave = qaResult.approved.map((item: SerializableNormalizedItem) => ({
                ...item,
                publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
            }));

            for (const item of itemsToSave) {
                try {
                    const urlHash = item.urlHash || hashUrl(item.url);

                    // 检查是否已存在
                    const existing = await prisma.rawPoolItem.findFirst({
                        where: { personId, urlHash },
                    });

                    if (existing) {
                        await prisma.rawPoolItem.update({
                            where: { id: existing.id },
                            data: {
                                contentHash: item.contentHash,
                                title: item.title,
                                text: item.text,
                                publishedAt: item.publishedAt,
                                metadata: item.metadata as Prisma.InputJsonValue,
                            },
                        });
                    } else {
                        await prisma.rawPoolItem.create({
                            data: {
                                personId,
                                sourceType: item.sourceType,
                                url: item.url,
                                urlHash,
                                contentHash: item.contentHash,
                                title: item.title,
                                text: item.text,
                                publishedAt: item.publishedAt,
                                metadata: item.metadata as Prisma.InputJsonValue,
                            },
                        });
                    }
                    count++;
                } catch (e) {
                    console.error(`[V2 Job] Failed to save item: ${item.url}`, e);
                }
            }

            return count;
        });

        // Step 6: 保存职业数据
        await step.run('save-career', async () => {
            const careerItems = qaResult.approved.filter(i => i.sourceType === 'career');
            if (careerItems.length === 0) return;

            const rawData = careerItems
                .map(i => i.metadata?._rawData)
                .filter(isRawCareerData);

            if (rawData.length > 0) {
                await savePersonRoles(personId, rawData);
                console.log(`[V2 Job] Saved ${rawData.length} career items`);
            }
        });

        // Step 7: 生成学习卡片
        await step.run('generate-cards', async () => {
            const updatedPerson = await prisma.people.findUnique({
                where: { id: personId },
                include: { rawPoolItems: true },
            });

            if (updatedPerson && updatedPerson.rawPoolItems.length > 0) {
                const rawItems = updatedPerson.rawPoolItems.map(item => ({
                    title: item.title,
                    text: item.text,
                    url: item.url,
                }));
                const cards = await generateCardsForPerson(personId, personName, rawItems);
                if (cards.length > 0) {
                    await saveCardsToDatabase(personId, cards);
                    console.log(`[V2 Job] Generated ${cards.length} cards`);
                }
            }
        });

        // Step 8: 更新状态为完成
        await step.run('complete', async () => {
            const newFetchedAt: Record<string, string> = {};
            const now = new Date().toISOString();

            for (const result of adapterResults) {
                if (result.success) {
                    newFetchedAt[result.source] = now;
                }
            }

            await prisma.people.update({
                where: { id: personId },
                data: {
                    status: 'ready',
                    lastFetchedAt: newFetchedAt,
                    updatedAt: new Date(),
                },
            });
        });

        return {
            personId,
            personName,
            itemsFetched: allItems.length,
            itemsApproved: qaResult.report.approvedCount,
            itemsRejected: qaResult.report.rejectedCount,
            itemsSaved: savedCount,
        };
    }
);

/**
 * 触发 V2 任务的辅助函数
 */
export async function triggerBuildPersonV2(data: {
    personId: string;
    personName: string;
    qid?: string;
    officialLinks?: OfficialLink[];
    aliases?: string[];
    englishName?: string;
    orcid?: string;
    forceRefresh?: boolean;
}) {
    await inngest.send({
        name: 'person/created.v2',
        data,
    });
}
