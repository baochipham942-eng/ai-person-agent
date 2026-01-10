import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/person/[id]/view
 * 记录页面访问，用于"本周热门"统计
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personId } = await params;
    const headersList = await headers();

    // 获取访客信息用于去重
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') ||
               'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // 简单的访客指纹（用于同一用户短期内的去重）
    const visitorId = Buffer.from(`${ip}:${userAgent}`).toString('base64').slice(0, 32);

    // 检查该人物是否存在
    const person = await prisma.people.findUnique({
      where: { id: personId },
      select: { id: true }
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    // 检查是否在最近5分钟内已记录过（防止刷访问量）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentView = await prisma.pageView.findFirst({
      where: {
        personId,
        visitorId,
        viewedAt: { gte: fiveMinutesAgo }
      }
    });

    if (recentView) {
      return NextResponse.json({
        success: true,
        counted: false,
        message: 'View already recorded recently'
      });
    }

    // 记录访问
    await prisma.pageView.create({
      data: {
        personId,
        visitorId,
      }
    });

    // 增加访问计数
    await prisma.people.update({
      where: { id: personId },
      data: {
        viewCount: { increment: 1 },
        weeklyViewCount: { increment: 1 }
      }
    });

    return NextResponse.json({
      success: true,
      counted: true
    });

  } catch (error: any) {
    console.error('Failed to record page view:', error);
    return NextResponse.json(
      { error: 'Failed to record view' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/person/[id]/view
 * 获取访问统计信息
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personId } = await params;

    const person = await prisma.people.findUnique({
      where: { id: personId },
      select: {
        viewCount: true,
        weeklyViewCount: true
      }
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      viewCount: person.viewCount,
      weeklyViewCount: person.weeklyViewCount
    });

  } catch (error: any) {
    console.error('Failed to get view stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
