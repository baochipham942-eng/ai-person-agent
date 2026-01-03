import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// 热度排序映射（用于前端排序）
// 数据库已自动处理排序，无需硬编码映射

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const start = (page - 1) * limit;

        // 使用 raw sql 绕过 Prisma Client 的 cached plan 错误
        const people = await prisma.$queryRaw<any[]>`
            SELECT id, name, "avatarUrl", occupation, description, "whyImportant", status, "aiContributionScore"
            FROM "People"
            WHERE status != 'error'
            ORDER BY "aiContributionScore" DESC, name ASC
            LIMIT ${limit} OFFSET ${start}
        `;

        // 移除内存排序逻辑，直接使用数据库返回的结果
        const paginated = people;

        // 获取总数以便分页
        const totalResult = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*)::int as count 
            FROM "People" 
            WHERE status != 'error'
        `;
        const total = totalResult[0]?.count || 0;

        const hasMore = start + limit < total;

        return NextResponse.json({
            data: paginated,
            pagination: {
                page,
                limit,
                total,
                hasMore
            }
        });
    } catch (error: any) {
        console.error('Failed to fetch people recommendations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch people recommendations' },
            { status: 500 }
        );
    }
}
