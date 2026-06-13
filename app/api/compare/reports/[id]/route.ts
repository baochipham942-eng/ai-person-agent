import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sanitizeCompareReportContent, type CompareReportContent } from '@/lib/compare-report-agent';

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
        title: true,
        topic: true,
        status: true,
        visibility: true,
        summary: true,
        peopleIds: true,
        reportJson: true,
        sourceSnapshot: true,
        errorMessage: true,
        createdAt: true,
        completedAt: true,
      },
    });

    if (!report || report.visibility !== 'public') {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 });
    }

    const people = await prisma.people.findMany({
      where: { id: { in: report.peopleIds } },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        currentTitle: true,
        organization: true,
        topics: true,
      },
    });
    const peopleById = new Map(people.map(person => [person.id, person]));
    const reportContent = asReportContent(report.reportJson);

    return NextResponse.json({
      data: {
        id: report.id,
        title: report.title,
        topic: report.topic,
        status: report.status,
        summary: report.summary,
        report: reportContent ? sanitizeCompareReportContent(reportContent) : report.reportJson,
        sourceSnapshot: sanitizeSourceSnapshot(report.sourceSnapshot),
        errorMessage: report.errorMessage,
        createdAt: report.createdAt.toISOString(),
        completedAt: report.completedAt ? report.completedAt.toISOString() : null,
        people: report.peopleIds
          .map(personId => peopleById.get(personId))
          .filter(Boolean)
          .map(person => ({
            id: person!.id,
            name: person!.name,
            avatarUrl: person!.avatarUrl,
            currentTitle: person!.currentTitle || person!.organization[0] || null,
            topics: person!.topics.slice(0, 4),
          })),
      },
    });
  } catch (error) {
    console.error('Failed to fetch compare report:', error);
    return NextResponse.json({ error: '获取报告失败' }, { status: 500 });
  }
}

function asReportContent(value: unknown): CompareReportContent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as { title?: unknown; summary?: unknown; verdict?: unknown; people?: unknown; dimensions?: unknown; evidence?: unknown; analysisSections?: unknown };
  if (
    typeof record.title === 'string'
    && typeof record.summary === 'string'
    && Boolean(record.verdict)
    && Array.isArray(record.people)
    && Array.isArray(record.dimensions)
    && Array.isArray(record.evidence)
    && Array.isArray(record.analysisSections)
  ) {
    return value as CompareReportContent;
  }
  return null;
}

function sanitizeSourceSnapshot(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const rest = { ...(value as Record<string, unknown>) };
  delete rest.tools;
  return rest;
}
