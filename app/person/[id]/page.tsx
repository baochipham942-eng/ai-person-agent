import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { Suspense } from 'react';
import { PersonPageClient } from '@/components/person/PersonPageClient';
import PersonDetailLoading from './loading';
import {
    normalizeEducation,
    normalizeMetadata,
    normalizeOfficialLinks,
    normalizeProducts,
    normalizeQuotes,
    normalizeTopicDetails,
    normalizeTopicRanks,
} from '@/lib/utils/person-json';
import { normalizeDirectoryTopic, normalizeDirectoryTopics } from '@/lib/person-directory-config';
import { getThreadsForPerson } from '@/lib/knowledge-thread-people';

interface PersonRoleRow {
    id: string;
    role: string;
    roleZh: string | null;
    startDate: Date | null;
    endDate: Date | null;
    source: string | null;
    confidence: number | null;
    advisorId: string | null;
    organizationName: string;
    organizationNameZh: string | null;
    organizationType: string;
    advisorName: string | null;
}

interface RelationRow {
    id: string;
    relationType: string;
    description: string | null;
    reviewStatus: string | null;
    evidenceUrl: string | null;
    evidenceNote: string | null;
    confidence: number | null;
    isReverse: boolean;
    relatedPersonId: string;
    relatedPersonName: string;
    relatedPersonAvatarUrl: string | null;
    relatedPersonCurrentTitle: string | null;
    relatedPersonOrganization: string[];
}

interface CountRow {
    count: number;
}

// ISR 缓存：1小时后重新验证
export const revalidate = 3600;

// 预生成热门人物页面（构建时静态生成）
export async function generateStaticParams() {
    // 获取访问量最高的 100 个已发布人物
    const hotPeople = await prisma.people.findMany({
        where: { status: 'ready' },
        orderBy: { viewCount: 'desc' },
        take: 100,
        select: { id: true }
    });
    return hotPeople.map(p => ({ id: p.id }));
}

interface PersonPageProps {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{
        section?: string | string[];
        highlight?: string | string[];
    }>;
}

export default async function PersonPage({ params, searchParams }: PersonPageProps) {
    const { id } = await params;
    const query = searchParams ? await searchParams : {};
    const initialSection = firstParam(query.section) === 'topics' ? 'topics' : null;
    const highlightTopic = initialSection === 'topics'
        ? normalizeHighlightTopic(firstParam(query.highlight))
        : null;
    const personData = await fetchCachedPersonPageData(id);

    if (!personData) {
        notFound();
    }

    return (
        <Suspense fallback={<PersonDetailLoading />}>
            <PersonPageClient
                person={personData}
                initialSection={initialSection}
                highlightTopic={highlightTopic}
            />
        </Suspense>
    );
}

const fetchCachedPersonPageData = unstable_cache(
    fetchPersonPageData,
    ['person-page-data-v1'],
    { revalidate: 3600 }
);

async function fetchPersonPageData(id: string) {
    // Prisma relation include 会在 Neon 上串行发多次查询；这里把首屏需要的数据拆成并行查询。
    const [person, cards, roles, relationRows, typeCounts, youtubeDisplayCountRows, courseCount, papers] = await Promise.all([
        prisma.people.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                description: true,
                whyImportant: true,
                avatarUrl: true,
                updatedAt: true,
                gender: true,
                country: true,
                qid: true,
                status: true,
                completeness: true,
                occupation: true,
                organization: true,
                influenceScore: true,
                citationCount: true,
                hIndex: true,
                githubStars: true,
                weeklyViewCount: true,
                aliases: true,
                officialLinks: true,
                topics: true,
                topicRanks: true,
                topicDetails: true,
                quotes: true,
                products: true,
                education: true,
                currentTitle: true,
            },
        }),
        prisma.card.findMany({
            where: { personId: id, isActive: true },
            select: {
                id: true,
                type: true,
                title: true,
                content: true,
                tags: true,
                sourceUrl: true,
                importance: true,
            },
            orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
            take: 10,
        }),
        prisma.$queryRaw<PersonRoleRow[]>`
            SELECT
                pr.id,
                pr.role,
                pr."roleZh",
                pr."startDate",
                pr."endDate",
                pr.source,
                pr.confidence,
                pr."advisorId",
                o.name AS "organizationName",
                o."nameZh" AS "organizationNameZh",
                o.type AS "organizationType",
                advisor.name AS "advisorName"
            FROM "PersonRole" pr
            JOIN "Organization" o ON o.id = pr."organizationId"
            LEFT JOIN "People" advisor ON advisor.id = pr."advisorId"
            WHERE pr."personId" = ${id}
            ORDER BY pr."startDate" DESC
        `,
        prisma.$queryRaw<RelationRow[]>`
            SELECT
                rel.id,
                rel."relationType",
                rel.description,
                rel."reviewStatus",
                rel."evidenceUrl",
                rel."evidenceNote",
                rel.confidence,
                false AS "isReverse",
                p.id AS "relatedPersonId",
                p.name AS "relatedPersonName",
                p."avatarUrl" AS "relatedPersonAvatarUrl",
                p."currentTitle" AS "relatedPersonCurrentTitle",
                p.organization AS "relatedPersonOrganization"
            FROM (SELECT * FROM "PersonRelation" WHERE "personId" = ${id} LIMIT 10) rel
            JOIN "People" p ON p.id = rel."relatedPersonId"
            UNION ALL
            SELECT
                rel.id,
                rel."relationType",
                rel.description,
                rel."reviewStatus",
                rel."evidenceUrl",
                rel."evidenceNote",
                rel.confidence,
                true AS "isReverse",
                p.id AS "relatedPersonId",
                p.name AS "relatedPersonName",
                p."avatarUrl" AS "relatedPersonAvatarUrl",
                p."currentTitle" AS "relatedPersonCurrentTitle",
                p.organization AS "relatedPersonOrganization"
            FROM (SELECT * FROM "PersonRelation" WHERE "relatedPersonId" = ${id} LIMIT 10) rel
            JOIN "People" p ON p.id = rel."personId"
        `,
        prisma.rawPoolItem.groupBy({
            by: ['sourceType'],
            where: { personId: id },
            _count: true
        }),
        prisma.$queryRaw<CountRow[]>`
            WITH raw AS (
                SELECT
                    COALESCE(
                        NULLIF(metadata->>'videoId', ''),
                        substring(url from '(?:v=|youtu\\.be/|embed/|shorts/|live/)([A-Za-z0-9_-]{6,})'),
                        id
                    ) AS video_key
                FROM "RawPoolItem"
                WHERE "personId" = ${id}
                  AND "sourceType" = 'youtube'
                  AND metadata->>'sourceKind' IS DISTINCT FROM 'youtube_caption'
            )
            SELECT COUNT(DISTINCT video_key)::int AS count
            FROM raw
        `,
        prisma.course.count({ where: { personId: id } }),
        // 论文数据（前10篇）
        prisma.rawPoolItem.findMany({
            where: {
                personId: id,
                sourceType: 'openalex',
            },
            select: {
                id: true,
                title: true,
                text: true,
                url: true,
                publishedAt: true,
                metadata: true,
            },
            orderBy: { fetchedAt: 'desc' },
            take: 10,
        }),
    ]);

    if (!person) {
        return null;
    }

    const sourceTypeCounts: Record<string, number> = {};
    typeCounts.forEach(tc => {
        sourceTypeCounts[tc.sourceType] = tc._count;
    });
    sourceTypeCounts.youtube = youtubeDisplayCountRows[0]?.count || 0;

    // 序列化数据传递给客户端组件
    return {
        id: person.id,
        name: person.name,
        description: person.description,
        whyImportant: person.whyImportant,
        avatarUrl: person.avatarUrl,
        updatedAt: person.updatedAt.toISOString(),
        gender: person.gender,
        country: person.country,
        qid: person.qid,
        status: person.status,
        completeness: person.completeness,
        occupation: person.occupation,
        organization: person.organization,
        influenceScore: person.influenceScore,
        citationCount: person.citationCount,
        hIndex: person.hIndex,
        githubStars: person.githubStars,
        weeklyViewCount: person.weeklyViewCount,
        aliases: person.aliases,
        // 当前卷入的主题（人 ↔ 主题这条边的人物侧；纯内存反查策展数据）
        involvedThreads: getThreadsForPerson({ name: person.name, aliases: person.aliases || [] }),
        officialLinks: normalizeOfficialLinks(person.officialLinks),
        // 话题和排名
        topics: normalizeDirectoryTopics(person.topics || []),
        topicRanks: normalizeDisplayTopicRanks(normalizeTopicRanks(person.topicRanks)),
        topicDetails: normalizeDisplayTopicDetails(normalizeTopicDetails(person.topicDetails)),
        // 新增字段
        quotes: normalizeQuotes(person.quotes),
        products: normalizeProducts(person.products),
        education: normalizeEducation(person.education),
        currentTitle: person.currentTitle || null,
        courseCount, // 课程数量
        // 论文数据
        papers: papers.map(p => ({
            id: p.id,
            title: p.title,
            text: p.text,
            url: p.url,
            publishedAt: p.publishedAt?.toISOString() || null,
            metadata: normalizeMetadata(p.metadata),
        })),
        // 不再传递 rawPoolItems，改为客户端懒加载
        rawPoolItems: [], // 空数组，客户端会按需加载
        sourceTypeCounts, // 各类型数量统计
        cards: cards.map(card => ({
            id: card.id,
            type: card.type,
            title: card.title,
            content: card.content,
            tags: card.tags,
            sourceUrl: card.sourceUrl,
            importance: card.importance,
        })),
        personRoles: roles.map(role => ({
            id: role.id,
            role: role.role,
            roleZh: role.roleZh,
            startDate: role.startDate?.toISOString() || undefined,
            endDate: role.endDate?.toISOString() || undefined,
            source: role.source,
            confidence: role.confidence,
            organizationName: role.organizationName,
            organizationNameZh: role.organizationNameZh,
            organizationType: role.organizationType,
            advisorId: role.advisorId || undefined,
            advisorName: role.advisorName || undefined,
        })),
        // 关联人物 - 合并正向和反向关系
        // 数据模型语义: { personId: A, relatedPersonId: B, type: X } 表示 B 是 A 的 X
        // 例如: { personId: Ilya, relatedPersonId: Hinton, type: advisor } = Hinton 是 Ilya 的导师
        relations: [
            // 正向关系：当前人物的 relations 表
            // { personId: 当前人物, relatedPersonId: B, type: X } = B 是当前人物的 X
            // 从当前人物视角：B 就是我的 X，不需要转换
            ...relationRows.map(rel => {
                const reverseType: Record<string, string> = {
                    advisor: 'advisee',       // 我是他导师 → 他是我学生
                    advisee: 'advisor',       // 我是他学生 → 他是我导师
                    successor: 'predecessor', // 我是他继任者 → 他是我前任
                    predecessor: 'successor', // 我是他前任 → 他是我继任者
                };
                return {
                    id: rel.isReverse ? rel.id + '-reverse' : rel.id,
                    relationType: rel.isReverse ? reverseType[rel.relationType] || rel.relationType : rel.relationType,
                    description: rel.description,
                    reviewStatus: rel.reviewStatus,
                    evidenceUrl: rel.evidenceUrl,
                    evidenceNote: rel.evidenceNote,
                    confidence: rel.confidence,
                    relatedPerson: {
                        id: rel.relatedPersonId,
                        name: rel.relatedPersonName,
                        avatarUrl: rel.relatedPersonAvatarUrl,
                        currentTitle: rel.relatedPersonCurrentTitle,
                        organization: rel.relatedPersonOrganization,
                    }
                };
            }),
        ],
    };
}

function normalizeDisplayTopicRanks(ranks: Record<string, number> | null): Record<string, number> | null {
    if (!ranks) return null;

    const normalized: Record<string, number> = {};
    for (const [topic, rank] of Object.entries(ranks)) {
        const canonical = normalizeDirectoryTopic(topic);
        normalized[canonical] = Math.min(normalized[canonical] ?? rank, rank);
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
}

function normalizeDisplayTopicDetails<T extends { topic: string; rank: number }>(details: T[] | null): T[] | null {
    if (!details) return null;

    const byTopic = new Map<string, T>();
    for (const detail of details) {
        const canonical = normalizeDirectoryTopic(detail.topic);
        const normalizedDetail = { ...detail, topic: canonical };
        const existing = byTopic.get(canonical);
        if (!existing || normalizedDetail.rank < existing.rank) {
            byTopic.set(canonical, normalizedDetail);
        }
    }

    return byTopic.size > 0
        ? [...byTopic.values()].sort((left, right) => left.rank - right.rank)
        : null;
}

function firstParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] || '';
    return value || '';
}

function normalizeHighlightTopic(value: string): string | null {
    if (!value) return null;
    const normalized = normalizeDirectoryTopic(value);
    return normalized || null;
}
