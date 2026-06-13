import { Prisma } from '@prisma/client';
import { inngest } from './client';
import { prisma } from '@/lib/db/prisma';
import { buildUnsubscribeToken } from '@/lib/newsletter';
import { buildDeliveryPayload, sendNewsletterEmail, type NewsletterEmailDraft } from '@/lib/newsletter-delivery';
import { getDirectoryTopicAliases, normalizeDirectoryTopics } from '@/lib/person-directory-config';

const ACTIVITY_SOURCE_TYPES = ['openalex', 'github', 'youtube', 'exa', 'podcast', 'career'];
const SOURCE_TYPE_CONFIG = {
    openalex: { eventType: 'paper', sourceLabel: 'OpenAlex' },
    github: { eventType: 'github', sourceLabel: 'GitHub' },
    youtube: { eventType: 'video', sourceLabel: 'YouTube' },
    exa: { eventType: 'article', sourceLabel: 'Web' },
    podcast: { eventType: 'podcast', sourceLabel: 'Podcast' },
    career: { eventType: 'role_change', sourceLabel: 'Career' },
    relation: { eventType: 'relation_change', sourceLabel: '关系证据' },
} as const;

type SignalEventData = Record<string, unknown>;

type ActivityRawRow = {
    id: string;
    personId: string;
    sourceType: string;
    url: string;
    title: string;
    text: string;
    publishedAt: Date | string | null;
    fetchedAt: Date | string;
    metadata: Prisma.JsonValue | null;
    person: {
        topics: string[];
        organization: string[];
    };
};

type ActivityRelationPerson = {
    id: string;
    name: string;
    organization: string[];
    topics: string[];
};

type ActivityRelationRow = {
    id: string;
    personId: string;
    relatedPersonId: string;
    relationType: string;
    description: string | null;
    source: string;
    confidence: number;
    reviewStatus: string;
    evidenceUrl: string | null;
    evidenceNote: string | null;
    createdAt: Date | string;
    person: ActivityRelationPerson;
    relatedPerson: ActivityRelationPerson;
};

type ActivityMaterializeData = {
    id?: string;
    personId: string;
    sourceItemId?: string | null;
    eventType: string;
    sourceType: string;
    title: string;
    summary: string | null;
    url: string;
    occurredAt: Date;
    detectedAt: Date;
    topics: string[];
    organizations: string[];
    confidence: number;
    evidenceNote: string | null;
    reviewStatus: string;
    metadata: Prisma.InputJsonObject;
};

type WatchlistState = {
    people: string[];
    topics: string[];
    organizations: string[];
};

export const materializeActivityEventsJob = inngest.createFunction(
    {
        id: 'signal-materialize-activity-events',
        retries: 1,
        concurrency: { limit: 1 },
        triggers: [
            { cron: '0 * * * *' },
            { event: 'signal/activity.materialize' },
        ],
    },
    async ({ event, step }) => {
        const data = (event.data || {}) as SignalEventData;
        const days = clampInteger(data.days, 1, 365, 30);
        const limit = clampInteger(data.limit, 1, 2000, 500);
        const dryRun = Boolean(data.dryRun);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const hasStore = await step.run('check-activity-event-table', hasActivityEventStore);
        if (!hasStore) {
            return {
                skipped: true,
                reason: 'ActivityEvent table is missing',
                days,
                limit,
            };
        }

        const rawItems = await step.run('fetch-raw-activity-items', async () => {
            return prisma.rawPoolItem.findMany({
                where: {
                    sourceType: { in: ACTIVITY_SOURCE_TYPES },
                    fetchStatus: 'success',
                    url: { not: '' },
                    title: { not: '' },
                    OR: [
                        { publishedAt: { gte: since } },
                        { fetchedAt: { gte: since } },
                    ],
                },
                select: {
                    id: true,
                    personId: true,
                    sourceType: true,
                    url: true,
                    title: true,
                    text: true,
                    publishedAt: true,
                    fetchedAt: true,
                    metadata: true,
                    person: {
                        select: {
                            topics: true,
                            organization: true,
                        },
                    },
                },
                orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
                take: limit,
            });
        });

        const relationRows = await step.run('fetch-relation-activity-items', async () => {
            return prisma.personRelation.findMany({
                where: {
                    createdAt: { gte: since },
                    reviewStatus: { in: ['trusted', 'confirmed'] },
                    OR: [
                        { evidenceUrl: { not: null } },
                        { evidenceNote: { not: null } },
                    ],
                },
                select: {
                    id: true,
                    personId: true,
                    relatedPersonId: true,
                    relationType: true,
                    description: true,
                    source: true,
                    confidence: true,
                    reviewStatus: true,
                    evidenceUrl: true,
                    evidenceNote: true,
                    createdAt: true,
                    person: {
                        select: {
                            id: true,
                            name: true,
                            organization: true,
                            topics: true,
                        },
                    },
                    relatedPerson: {
                        select: {
                            id: true,
                            name: true,
                            organization: true,
                            topics: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: Math.min(limit, 500),
            });
        });

        const rawEvents = rawItems
            .map(row => toActivityEventData(row))
            .filter((item): item is NonNullable<ReturnType<typeof toActivityEventData>> => Boolean(item));
        const relationEvents = relationRows
            .map(row => toRelationActivityEventData(row))
            .filter((item): item is NonNullable<ReturnType<typeof toRelationActivityEventData>> => Boolean(item));
        const events: ActivityMaterializeData[] = [...rawEvents, ...relationEvents];

        if (dryRun) {
            return {
                dryRun: true,
                scanned: rawItems.length,
                relationsScanned: relationRows.length,
                materializable: events.length,
                relationMaterializable: relationEvents.length,
                sample: sampleEvents(events),
            };
        }

        const upserted = await step.run('upsert-activity-events', async () => {
            let count = 0;
            for (const activityEvent of events) {
                await upsertMaterializedActivityEvent(activityEvent);
                count += 1;
            }
            return count;
        });

        return {
            dryRun: false,
            scanned: rawItems.length,
            relationsScanned: relationRows.length,
            materializable: events.length,
            relationMaterializable: relationEvents.length,
            upserted,
            days,
            limit,
        };
    }
);

export const prepareWeeklyNewsletterDigestJob = inngest.createFunction(
    {
        id: 'signal-prepare-weekly-newsletter-digest',
        retries: 1,
        concurrency: { limit: 1 },
        triggers: [
            { cron: '0 8 * * 1' },
            { event: 'signal/newsletter.prepare' },
        ],
    },
    async ({ event, step }) => {
        const data = (event.data || {}) as SignalEventData;
        const days = clampInteger(data.days, 1, 30, 7);
        const limit = clampInteger(data.limit, 1, 500, 100);
        const eventLimit = clampInteger(data.eventLimit, 1, 24, 12);
        const sendRequested = Boolean(data.send) || process.env.NEWSLETTER_SEND_ENABLED === 'true';

        const hasStore = await step.run('check-newsletter-log-table', hasNewsletterDeliveryLogStore);
        if (!hasStore) {
            return {
                skipped: true,
                reason: 'NewsletterDeliveryLog table is missing',
                days,
                limit,
            };
        }

        const profiles = await step.run('fetch-newsletter-profiles', async () => {
            return prisma.userProfile.findMany({
                where: {
                    newsletterFrequency: { not: 'none' },
                    newsletterEmail: { not: null },
                },
                select: {
                    id: true,
                    userId: true,
                    topicInterests: true,
                    subscribedPeople: true,
                    newsletterFrequency: true,
                    newsletterEmail: true,
                    user: {
                        select: {
                            username: true,
                            nickname: true,
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                take: limit,
            });
        });

        const generated = await step.run('create-dry-run-delivery-logs', async () => {
            const stats = {
                total: 0,
                sent: 0,
                failed: 0,
                dryRun: 0,
            };
            for (const profile of profiles) {
                const watchlist = normalizeProfileWatchlist(profile);
                const events = await loadNewsletterEvents(watchlist, days, eventLimit);
                const subject = buildNewsletterSubject(profile, watchlist, events.length);
                const draft = buildNewsletterDraft(profile, subject, events);
                const result = await sendNewsletterEmail(draft, {
                    sendRequested,
                    deliveryKey: buildNewsletterDeliveryKey(profile.id, days),
                });
                await prisma.newsletterDeliveryLog.create({
                    data: {
                        userId: profile.userId,
                        email: profile.newsletterEmail || '',
                        frequency: profile.newsletterFrequency,
                        deliveryType: 'weekly_digest',
                        subject,
                        status: result.status,
                        provider: result.provider,
                        providerMessageId: result.providerMessageId,
                        attempts: result.attempts,
                        errorMessage: result.errorMessage,
                        lastAttemptAt: result.provider === 'dry_run' ? null : new Date(),
                        sentAt: result.sentAt,
                        payload: {
                            ...(buildDeliveryPayload(draft, result) as Prisma.InputJsonObject),
                            generatedAt: new Date().toISOString(),
                            days,
                            watchlist,
                        },
                    },
                });
                stats.total += 1;
                if (result.status === 'sent') stats.sent += 1;
                if (result.status === 'failed') stats.failed += 1;
                if (result.status === 'dry_run') stats.dryRun += 1;
            }
            return stats;
        });

        return {
            dryRun: generated.dryRun === generated.total,
            sendRequested,
            subscriptions: profiles.length,
            generated,
            days,
            limit,
            eventLimit,
        };
    }
);

async function hasActivityEventStore(): Promise<boolean> {
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT
            to_regclass('public."ActivityEvent"') IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                    AND table_name = 'ActivityEvent'
                    AND column_name = 'reviewStatus'
            ) AS "exists"
    `;
    return Boolean(result[0]?.exists);
}

async function hasNewsletterDeliveryLogStore(): Promise<boolean> {
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT
            to_regclass('public."NewsletterDeliveryLog"') IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                    AND table_name = 'NewsletterDeliveryLog'
                    AND column_name = 'provider'
            ) AS "exists"
    `;
    return Boolean(result[0]?.exists);
}

function reviewStatusFromConfidence(confidence: number): string {
    return confidence < 0.7 ? 'needs_review' : 'auto';
}

function relationTypeLabel(value: string): string {
    const labels: Record<string, string> = {
        advisor: '导师',
        advisee: '学生',
        cofounder: '联创',
        colleague: '同事',
        former_colleague: '前同事',
        collaborator: '合作',
        successor: '前后任',
    };
    return labels[value] || value;
}

function toActivityEventData(row: ActivityRawRow): ActivityMaterializeData | null {
    if (!row.url || !row.title) return null;
    const sourceConfig = sourceConfigFor(row.sourceType);
    const metadata = asRecord(row.metadata);
    const metadataTags = metadata ? toStringArray(metadata.tags) : [];
    const fetchedAt = toDate(row.fetchedAt);
    const occurredAt = row.publishedAt ? toDate(row.publishedAt) : fetchedAt;

    return {
        personId: row.personId,
        sourceItemId: row.id,
        eventType: sourceConfig.eventType,
        sourceType: row.sourceType,
        title: row.title,
        summary: buildSummary(row.text),
        url: row.url,
        occurredAt,
        detectedAt: fetchedAt,
        topics: uniqueStrings([...metadataTags, ...(row.person?.topics || [])]).slice(0, 8),
        organizations: uniqueStrings(row.person?.organization || []).slice(0, 6),
        confidence: readConfidence(metadata),
        evidenceNote: readString(metadata?.evidenceNote) || readString(metadata?.sourceNote),
        reviewStatus: reviewStatusFromConfidence(readConfidence(metadata)),
        metadata: {
            sourceLabel: sourceConfig.sourceLabel,
            rawPoolItemId: row.id,
        } satisfies Prisma.InputJsonObject,
    };
}

function toRelationActivityEventData(row: ActivityRelationRow): ActivityMaterializeData | null {
    const evidenceUrl = readString(row.evidenceUrl);
    const evidenceNote = readString(row.evidenceNote);
    if (!evidenceUrl && !evidenceNote) return null;

    const createdAt = toDate(row.createdAt);
    const sourceConfig = sourceConfigFor('relation');
    const topics = normalizeDirectoryTopics([...row.person.topics, ...row.relatedPerson.topics]).slice(0, 8);
    const organizations = uniqueStrings([...row.person.organization, ...row.relatedPerson.organization]).slice(0, 6);
    const relationLabel = relationTypeLabel(row.relationType);

    return {
        id: `relation:${row.id}:${row.personId}`,
        personId: row.personId,
        sourceItemId: null,
        eventType: sourceConfig.eventType,
        sourceType: 'relation',
        title: `与 ${row.relatedPerson.name} 的${relationLabel}关系已确认`,
        summary: buildSummary(row.description || evidenceNote || ''),
        url: evidenceUrl || `/person/${row.relatedPersonId}?fromRelation=${encodeURIComponent(row.relationType)}`,
        occurredAt: createdAt,
        detectedAt: createdAt,
        topics,
        organizations,
        confidence: clampConfidence(row.confidence),
        evidenceNote,
        reviewStatus: row.reviewStatus,
        metadata: {
            sourceLabel: row.source === 'wikidata' ? 'Wikidata 关系' : sourceConfig.sourceLabel,
            relationId: row.id,
            relatedPersonId: row.relatedPersonId,
            relationType: row.relationType,
        } satisfies Prisma.InputJsonObject,
    };
}

function upsertMaterializedActivityEvent(activityEvent: ActivityMaterializeData) {
    const update = {
        eventType: activityEvent.eventType,
        sourceType: activityEvent.sourceType,
        title: activityEvent.title,
        summary: activityEvent.summary,
        url: activityEvent.url,
        occurredAt: activityEvent.occurredAt,
        detectedAt: activityEvent.detectedAt,
        topics: activityEvent.topics,
        organizations: activityEvent.organizations,
        confidence: activityEvent.confidence,
        evidenceNote: activityEvent.evidenceNote,
        reviewStatus: activityEvent.reviewStatus,
        metadata: activityEvent.metadata,
    };

    return prisma.activityEvent.upsert({
        where: activityEvent.sourceItemId
            ? { sourceItemId: activityEvent.sourceItemId }
            : { id: activityEvent.id || '' },
        create: activityEvent,
        update,
    });
}

async function loadNewsletterEvents(watchlist: WatchlistState, days: number, limit: number) {
    const targetCount = watchlist.people.length + watchlist.topics.length + watchlist.organizations.length;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const personWhere = buildNewsletterPersonWhere(watchlist);
    const rows = await prisma.rawPoolItem.findMany({
        where: {
            sourceType: { in: ACTIVITY_SOURCE_TYPES },
            fetchStatus: 'success',
            url: { not: '' },
            title: { not: '' },
            OR: [
                { publishedAt: { gte: since } },
                { fetchedAt: { gte: since } },
            ],
            ...(targetCount > 0 && {
                AND: [{
                    OR: [
                        ...(watchlist.people.length > 0 ? [{ personId: { in: watchlist.people } }] : []),
                        ...(personWhere ? [{ person: personWhere }] : []),
                    ],
                }],
            }),
        },
        select: {
            id: true,
            sourceType: true,
            url: true,
            title: true,
            text: true,
            publishedAt: true,
            fetchedAt: true,
            person: {
                select: {
                    id: true,
                    name: true,
                    currentTitle: true,
                    organization: true,
                    topics: true,
                },
            },
        },
        orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
        take: limit * 2,
    });

    return rows
        .map(row => {
            const sourceConfig = sourceConfigFor(row.sourceType);
            const fetchedAt = toDate(row.fetchedAt);
            const occurredAt = row.publishedAt ? toDate(row.publishedAt) : fetchedAt;
            return {
                id: row.id,
                personId: row.person.id,
                personName: row.person.name,
                personCurrentTitle: row.person.currentTitle,
                sourceType: row.sourceType,
                sourceLabel: sourceConfig.sourceLabel,
                title: row.title,
                summary: buildSummary(row.text),
                url: row.url,
                occurredAt: occurredAt ? occurredAt.toISOString() : null,
                detectedAt: fetchedAt.toISOString(),
                topics: normalizeDirectoryTopics(row.person.topics).slice(0, 4),
                organizations: row.person.organization.slice(0, 3),
            };
        })
        .slice(0, limit);
}

function buildNewsletterPersonWhere(watchlist: WatchlistState): Prisma.PeopleWhereInput | null {
    const filters: Prisma.PeopleWhereInput[] = [];
    if (watchlist.topics.length > 0) {
        filters.push({ topics: { hasSome: uniqueStrings(watchlist.topics.flatMap(getDirectoryTopicAliases)) } });
    }
    if (watchlist.organizations.length > 0) {
        filters.push({
            OR: [
                { organization: { hasSome: watchlist.organizations } },
                ...watchlist.organizations.map(organization => ({
                    currentTitle: { contains: organization, mode: 'insensitive' as const },
                })),
            ],
        });
    }
    if (filters.length === 0) return null;
    return { OR: filters };
}

function normalizeProfileWatchlist(profile: {
    topicInterests: Prisma.JsonValue;
    subscribedPeople: string[];
}): WatchlistState {
    const topicState = normalizeTopicInterests(profile.topicInterests);
    return {
        people: uniqueStrings(profile.subscribedPeople || []),
        topics: topicState.topics,
        organizations: topicState.organizations,
    };
}

function normalizeTopicInterests(value: Prisma.JsonValue): { topics: string[]; organizations: string[] } {
    if (!isRecord(value)) return { topics: [], organizations: [] };
    const topics = Array.isArray(value.topics)
        ? uniqueStrings(value.topics.filter((item): item is string => typeof item === 'string'))
        : objectKeysFromTruthyValues(value.topicMap);
    const organizations = Array.isArray(value.organizations)
        ? uniqueStrings(value.organizations.filter((item): item is string => typeof item === 'string'))
        : objectKeysFromTruthyValues(value.organizationMap);
    const legacyTopics = Object.keys(value)
        .filter(key => !['topics', 'organizations', 'topicMap', 'organizationMap'].includes(key))
        .filter(key => Boolean(value[key]));

    return {
        topics: uniqueStrings([...topics, ...legacyTopics]),
        organizations,
    };
}

function buildNewsletterSubject(
    profile: { user: { username: string; nickname: string | null }; newsletterFrequency: string },
    watchlist: WatchlistState,
    eventCount: number
): string {
    const scope = watchlist.topics[0]
        || watchlist.organizations[0]
        || (watchlist.people.length > 0 ? '关注人物' : 'AI 圈');
    const name = profile.user.nickname || profile.user.username;
    return `${name} 的 AI 人物库周报：${scope} ${eventCount} 条动态`;
}

function buildNewsletterDraft(
    profile: {
        id: string;
        userId: string;
        newsletterEmail: string | null;
        user: { username: string; nickname: string | null };
    },
    subject: string,
    events: Awaited<ReturnType<typeof loadNewsletterEvents>>
): NewsletterEmailDraft {
    const unsubscribeUrl = buildNewsletterUnsubscribeUrl(profile);
    return {
        email: profile.newsletterEmail || '',
        subject,
        unsubscribeUrl,
        preview: events.slice(0, 5).map(activityEvent => `${activityEvent.personName}: ${activityEvent.title}`),
        events: events.map(activityEvent => ({
            personName: activityEvent.personName,
            title: activityEvent.title,
            url: activityEvent.url,
            sourceLabel: activityEvent.sourceLabel,
            occurredAt: activityEvent.occurredAt,
        })),
        textBody: buildNewsletterTextBody(profile, subject, events, unsubscribeUrl),
    };
}

function buildNewsletterTextBody(
    profile: { user: { username: string; nickname: string | null } },
    subject: string,
    events: Awaited<ReturnType<typeof loadNewsletterEvents>>,
    unsubscribeUrl: string
): string {
    const name = profile.user.nickname || profile.user.username || '你好';
    return [
        `${name}，${subject}`,
        '',
        ...events.slice(0, 8).map((activityEvent, index) => `${index + 1}. ${activityEvent.personName} - ${activityEvent.title}\n${activityEvent.url}`),
        '',
        `退订: ${unsubscribeUrl}`,
    ].join('\n');
}

function buildNewsletterUnsubscribeUrl(profile: { id: string; userId: string; newsletterEmail: string | null }): string {
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:4001').replace(/\/$/, '');
    const token = buildUnsubscribeToken(profile);
    return `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token || '')}`;
}

function buildNewsletterDeliveryKey(profileId: string, days: number): string {
    const bucket = new Date().toISOString().slice(0, 10);
    return `weekly-digest:${profileId}:${bucket}:days-${days}`;
}

function sourceConfigFor(sourceType: string): { eventType: string; sourceLabel: string } {
    return SOURCE_TYPE_CONFIG[sourceType as keyof typeof SOURCE_TYPE_CONFIG]
        || { eventType: 'article', sourceLabel: sourceType };
}

function sampleEvents(events: Pick<ActivityMaterializeData, 'id' | 'sourceItemId' | 'personId' | 'eventType' | 'title'>[]) {
    return events.slice(0, 5).map(activityEvent => ({
        id: activityEvent.id,
        sourceItemId: activityEvent.sourceItemId || null,
        personId: activityEvent.personId,
        eventType: activityEvent.eventType,
        title: activityEvent.title,
    }));
}

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function objectKeysFromTruthyValues(value: unknown): string[] {
    if (!isRecord(value)) return [];
    return Object.keys(value).filter(key => Boolean(value[key]));
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function uniqueStrings(values: string[]): string[] {
    return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function readConfidence(metadata: Record<string, unknown> | null): number {
    const value = metadata?.confidence;
    if (typeof value === 'number' && Number.isFinite(value)) return clampConfidence(value);
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return clampConfidence(parsed);
    }
    return 0.8;
}

function clampConfidence(value: number): number {
    return Math.min(1, Math.max(0, value));
}

function readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function buildSummary(text: string): string | null {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized || normalized === 'null') return null;
    return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
}

function toDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
}
