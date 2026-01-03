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

        // 按 aiContributionScore 排序 (数据库层面排序，更高效)
        const people = await prisma.people.findMany({
            where: {
                status: {
                    not: 'error',
                },
            },
            orderBy: [
                { aiContributionScore: 'desc' },
                { name: 'asc' },
            ],
            select: {
                id: true,
                name: true,
                avatarUrl: true,
                occupation: true,
                description: true,
                whyImportant: true,
                status: true,
                aiContributionScore: true,
            },
            skip: start,
            take: limit,
        });

        // 移除内存排序逻辑，直接使用数据库返回的结果
        const paginated = people;

        // 获取总数以便分页
        const total = await prisma.people.count({
            where: {
                status: {
                    not: 'error',
                },
            },
        });

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
            { error: 'Failed to fetch people recommendations', details: error.message },
            { status: 500 }
        );
    }
}
