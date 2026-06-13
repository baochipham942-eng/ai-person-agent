import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { inngest } from '@/lib/inngest/client';
import { COMPARE_REPORT_STEPS, DEFAULT_COMPARE_TOPIC, writeReportEvent } from '@/lib/compare-report-agent';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reports = await prisma.compareReport.findMany({
      where: {
        status: 'completed',
        visibility: 'public',
      },
      select: {
        id: true,
        title: true,
        topic: true,
        summary: true,
        status: true,
        peopleIds: true,
        sourceSnapshot: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
      take: 40,
    });

    const peopleById = await loadPeopleByIds(reports.flatMap(report => report.peopleIds));

    return NextResponse.json({
      data: reports.map(report => ({
        id: report.id,
        title: report.title,
        topic: report.topic,
        summary: report.summary,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        completedAt: report.completedAt ? report.completedAt.toISOString() : null,
        sourceCount: sourceCountFromSnapshot(report.sourceSnapshot),
        people: report.peopleIds
          .map(id => peopleById.get(id))
          .filter(Boolean),
      })),
    });
  } catch (error) {
    console.error('Failed to list compare reports:', error);
    return NextResponse.json({ error: '获取报告列表失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: '请先登录后生成报告' }, { status: 401 });
    }

    const body = await request.json();
    const peopleIds = uniqueStrings(Array.isArray(body?.peopleIds) ? body.peopleIds : [])
      .slice(0, 3);
    const topic = typeof body?.topic === 'string' && body.topic.trim()
      ? body.topic.trim().slice(0, 160)
      : DEFAULT_COMPARE_TOPIC;

    if (peopleIds.length < 2 || peopleIds.length > 3) {
      return NextResponse.json({ error: '请选择 2 到 3 位人物' }, { status: 400 });
    }

    const people = await prisma.people.findMany({
      where: {
        id: { in: peopleIds },
        status: { in: ['ready', 'active'] },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        currentTitle: true,
        organization: true,
      },
    });

    if (people.length !== peopleIds.length) {
      return NextResponse.json({ error: '部分人物暂时不可用于公开对比' }, { status: 400 });
    }

    const peopleById = new Map(people.map(person => [person.id, person]));
    const orderedPeople = peopleIds.map(id => peopleById.get(id)).filter(Boolean) as typeof people;
    const title = `${orderedPeople.map(person => person.name).join(' vs ')} 人物对比报告`;

    const report = await prisma.compareReport.create({
      data: {
        title,
        topic,
        peopleIds,
        status: 'pending',
        visibility: 'public',
        createdById: userId,
      },
      select: {
        id: true,
        title: true,
        topic: true,
        status: true,
        createdAt: true,
      },
    });

    for (const item of COMPARE_REPORT_STEPS) {
      await writeReportEvent(report.id, item.step, 'queued', item.title, undefined, { toolKey: item.toolKey });
    }

    try {
      await inngest.send({
        name: 'compare/report.requested',
        data: {
          reportId: report.id,
        },
      });
    } catch (error) {
      console.error('Failed to enqueue compare report:', error);
      await prisma.compareReport.update({
        where: { id: report.id },
        data: {
          status: 'failed',
          errorMessage: '生成任务暂时无法启动，请稍后重试。',
        },
      });
      await writeReportEvent(report.id, 'match_people', 'failed', '任务启动失败', '生成任务暂时无法启动，请稍后重试。');
    }

    return NextResponse.json({
      data: {
        id: report.id,
        title: report.title,
        topic: report.topic,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        people: orderedPeople.map(person => ({
          id: person.id,
          name: person.name,
          avatarUrl: person.avatarUrl,
          currentTitle: person.currentTitle || person.organization[0] || null,
        })),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create compare report:', error);
    return NextResponse.json({ error: '创建报告失败' }, { status: 500 });
  }
}

async function loadPeopleByIds(ids: string[]) {
  const uniqueIds = uniqueStrings(ids);
  if (uniqueIds.length === 0) return new Map<string, {
    id: string;
    name: string;
    avatarUrl: string | null;
    currentTitle: string | null;
  }>();

  const people = await prisma.people.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      currentTitle: true,
      organization: true,
    },
  });

  return new Map(people.map(person => [person.id, {
    id: person.id,
    name: person.name,
    avatarUrl: person.avatarUrl,
    currentTitle: person.currentTitle || person.organization[0] || null,
  }]));
}

function sourceCountFromSnapshot(value: unknown): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  const count = (value as { evidenceCount?: unknown }).evidenceCount;
  return typeof count === 'number' && Number.isFinite(count) ? count : 0;
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values
    .map(value => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean))];
}
