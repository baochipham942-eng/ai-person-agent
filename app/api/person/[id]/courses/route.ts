import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

/**
 * 获取人物的课程列表
 * GET /api/person/[id]/courses?type=all&limit=20&offset=0
 *
 * Query params:
 *   - type: 'all' | 'free' | 'paid' | 'freemium'
 *   - platform: 'coursera' | 'edx' | 'youtube' | 'all'
 *   - limit: number
 *   - offset: number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'all';
  const platform = searchParams.get('platform') || 'all';
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const where: Prisma.CourseWhereInput = {
      personId: id,
    };

    if (type !== 'all') {
      where.type = type;
    }

    if (platform !== 'all') {
      where.platform = platform;
    }

    // 合并所有查询到单个 Promise.all
    const [courses, total, typeCounts, platformCounts] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy: [
          { learningOrder: 'asc' },
          { enrollments: 'desc' },
          { rating: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.course.count({ where }),
      // 统计各类型数量
      prisma.course.groupBy({
        by: ['type'],
        where: { personId: id },
        _count: true,
      }),
      prisma.course.groupBy({
        by: ['platform'],
        where: { personId: id },
        _count: true,
      }),
    ]);

    const response = NextResponse.json({
      data: courses.map((course) => ({
        id: course.id,
        title: course.title,
        titleZh: course.titleZh,
        platform: course.platform,
        url: course.url,
        type: course.type,
        level: course.level,
        category: course.category,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        duration: course.duration,
        language: course.language,
        enrollments: course.enrollments,
        rating: course.rating,
        reviewCount: course.reviewCount,
        prerequisite: course.prerequisite,
        learningOrder: course.learningOrder,
        topics: course.topics,
        verified: course.verified,
        publishedAt: course.publishedAt?.toISOString(),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + courses.length < total,
      },
      stats: {
        typeCounts: typeCounts.reduce(
          (acc, item) => ({ ...acc, [item.type]: item._count }),
          {} as Record<string, number>
        ),
        platformCounts: platformCounts.reduce(
          (acc, item) => ({ ...acc, [item.platform]: item._count }),
          {} as Record<string, number>
        ),
      },
    });

    // HTTP 缓存：5分钟缓存，10分钟 stale-while-revalidate
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600'
    );

    return response;
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
