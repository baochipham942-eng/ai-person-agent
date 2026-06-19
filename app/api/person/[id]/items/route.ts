import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * 按类型懒加载 rawPoolItems
 * GET /api/person/[id]/items?type=x&limit=20&offset=0
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const sourceType = searchParams.get('type') || 'all';
    const limit = readBoundedInt(searchParams.get('limit'), 1, 50, 20);
    const offset = readBoundedInt(searchParams.get('offset'), 0, 10000, 0);

    try {
        if (sourceType === 'youtube') {
            return fetchYouTubeItems(id, limit, offset);
        }

        const where = {
            personId: id,
            ...(sourceType !== 'all' && { sourceType }),
        };

        const [items, total] = await Promise.all([
            prisma.rawPoolItem.findMany({
                where,
                select: {
                    id: true,
                    sourceType: true,
                    url: true,
                    title: true,
                    text: true,
                    publishedAt: true,
                    metadata: true,
                },
                orderBy: { publishedAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.rawPoolItem.count({ where }),
        ]);

        const response = NextResponse.json({
            data: items.map(item => ({
                id: item.id,
                sourceType: item.sourceType,
                url: item.url,
                title: item.title,
                text: item.text,
                publishedAt: item.publishedAt?.toISOString() || undefined,
                metadata: item.metadata,
            })),
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + items.length < total,
            }
        });

        // HTTP 缓存：5分钟缓存，10分钟 stale-while-revalidate
        response.headers.set(
            'Cache-Control',
            'public, s-maxage=300, stale-while-revalidate=600'
        );

        return response;
    } catch (error) {
        console.error('Error fetching items:', error);
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }
}

function readBoundedInt(value: string | null, min: number, max: number, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
}

interface RawPoolItemResponse {
    id: string;
    sourceType: string;
    url: string;
    title: string;
    text: string;
    publishedAt: Date | null;
    metadata: unknown;
    total: number;
}

async function fetchYouTubeItems(personId: string, limit: number, offset: number) {
    const rows = await prisma.$queryRaw<RawPoolItemResponse[]>`
        WITH raw AS (
            SELECT
                id,
                "sourceType",
                url,
                title,
                text,
                "publishedAt",
                "fetchedAt",
                metadata,
                COALESCE(
                    NULLIF(metadata->>'videoId', ''),
                    substring(url from '(?:v=|youtu\\.be/|embed/|shorts/|live/)([A-Za-z0-9_-]{6,})'),
                    id
                ) AS video_key,
                metadata->>'sourceKind' AS source_kind
            FROM "RawPoolItem"
            WHERE "personId" = ${personId}
              AND "sourceType" = 'youtube'
              AND metadata->>'sourceKind' IS DISTINCT FROM 'youtube_caption'
        ),
        ranked AS (
            SELECT
                *,
                ROW_NUMBER() OVER (
                    PARTITION BY video_key
                    ORDER BY
                        CASE WHEN metadata->>'isOfficial' = 'true' THEN 0 ELSE 1 END,
                        "publishedAt" DESC NULLS LAST,
                        "fetchedAt" DESC NULLS LAST,
                        id ASC
                ) AS rank
            FROM raw
        ),
        deduped AS (
            SELECT *
            FROM ranked
            WHERE rank = 1
        )
        SELECT
            id,
            "sourceType",
            url,
            title,
            text,
            "publishedAt",
            metadata,
            COUNT(*) OVER()::int AS total
        FROM deduped
        ORDER BY "publishedAt" DESC NULLS LAST, id ASC
        LIMIT ${limit}
        OFFSET ${offset}
    `;

    const total = rows[0]?.total || 0;
    const response = NextResponse.json({
        data: rows.map(item => ({
            id: item.id,
            sourceType: item.sourceType,
            url: item.url,
            title: item.title,
            text: item.text,
            publishedAt: item.publishedAt?.toISOString() || undefined,
            metadata: item.metadata,
        })),
        pagination: {
            total,
            limit,
            offset,
            hasMore: offset + rows.length < total,
        }
    });

    response.headers.set(
        'Cache-Control',
        'public, s-maxage=300, stale-while-revalidate=600'
    );

    return response;
}
