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
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        const where = {
            personId: id,
            ...(sourceType !== 'all' && { sourceType }),
        };

        const [items, total] = await Promise.all([
            prisma.rawPoolItem.findMany({
                where,
                orderBy: { publishedAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.rawPoolItem.count({ where }),
        ]);

        return NextResponse.json({
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
    } catch (error) {
        console.error('Error fetching items:', error);
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }
}
