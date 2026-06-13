import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = await prisma.compareReport.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        errorMessage: true,
        completedAt: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 });
    }

    const events = await prisma.compareReportEvent.findMany({
      where: { reportId: id },
      select: {
        id: true,
        step: true,
        status: true,
        title: true,
        message: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      data: {
        report: {
          id: report.id,
          status: report.status,
          errorMessage: report.errorMessage,
          completedAt: report.completedAt ? report.completedAt.toISOString() : null,
        },
        events: events.map(event => ({
          id: event.id,
          step: event.step,
          status: event.status,
          title: event.title,
          message: event.message,
          metadata: event.metadata,
          createdAt: event.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Failed to fetch compare report events:', error);
    return NextResponse.json({ error: '获取生成进度失败' }, { status: 500 });
  }
}
