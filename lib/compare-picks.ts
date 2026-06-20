import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

/** 专题页「人物对比」区 / 公开对比报告页共用的读模型。 */
export interface ComparePickPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
}

export interface ComparePickReport {
  id: string;
  title: string;
  topic: string | null;
  summary: string | null;
  peopleIds: string[];
  sourceSnapshot: unknown;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ComparePicks {
  reports: ComparePickReport[];
  peopleById: Map<string, ComparePickPerson>;
}

const loadPublicCompareReports = unstable_cache(
  async (): Promise<ComparePickReport[]> =>
    prisma.compareReport.findMany({
      where: { status: 'completed', visibility: 'public' },
      select: {
        id: true,
        title: true,
        topic: true,
        summary: true,
        peopleIds: true,
        sourceSnapshot: true,
        completedAt: true,
        createdAt: true,
      },
      orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
      take: 48,
    }),
  ['threads-compare-picks-reports'],
  { revalidate: 300 }
);

const loadPeopleById = unstable_cache(
  async (ids: string[]): Promise<ComparePickPerson[]> => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return [];

    const people = await prisma.people.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true, avatarUrl: true, currentTitle: true, organization: true },
    });

    return people.map(person => ({
      id: person.id,
      name: person.name,
      avatarUrl: person.avatarUrl,
      currentTitle: person.currentTitle || person.organization[0] || null,
    }));
  },
  ['threads-compare-picks-people'],
  { revalidate: 300 }
);

/** 取公开对比报告 + 涉及人物，失败时返回空集（专题页降级，不连坐知识主题区）。 */
export async function fetchComparePicks(): Promise<ComparePicks> {
  try {
    const reports = await loadPublicCompareReports();
    const people = await loadPeopleById(reports.flatMap(report => report.peopleIds));
    return { reports, peopleById: new Map(people.map(person => [person.id, person])) };
  } catch (error) {
    console.error('Failed to fetch compare picks:', error);
    return { reports: [], peopleById: new Map() };
  }
}

export function comparePickSourceCount(value: unknown): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  // 显示真实可用资料数（localSourceCount）。evidenceCount 是按 36 截断后的「可展开证据」，
  // 几乎所有报告都顶格到 36，当作「资料数」会误导，故优先用 localSourceCount。
  const snapshot = value as { localSourceCount?: unknown; evidenceCount?: unknown };
  const local = snapshot.localSourceCount;
  if (typeof local === 'number' && Number.isFinite(local) && local > 0) return local;
  const evidence = snapshot.evidenceCount;
  return typeof evidence === 'number' && Number.isFinite(evidence) ? evidence : 0;
}
