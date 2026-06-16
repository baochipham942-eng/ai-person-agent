import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { fetchActivityEvents, type ActivityEvent } from '@/lib/activity';
import { fetchPersonDirectory } from '@/lib/person-directory';
import {
  DIRECTORY_ORGANIZATIONS,
  DIRECTORY_TOPICS,
  getDirectoryOrganizationAliases,
  getDirectoryTopicAliases,
  normalizeDirectoryTopic,
  type DirectoryPerson,
} from '@/lib/person-directory-config';

export interface EntityWork {
  id: string;
  type: 'paper' | 'github' | 'official';
  sourceLabel: string;
  title: string;
  url: string;
  summary: string | null;
  personId: string;
  personName: string;
  publishedAt: string | null;
  metricLabel: string | null;
}

export interface EntityFacet {
  label: string;
  count: number;
}

export interface OrganizationRolePerson {
  personId: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  role: string;
  startYear: string | null;
  endYear: string | null;
  confidence: number | null;
}

export interface EntityCoverageMissing {
  key: 'people' | 'activity' | 'works';
  current: number;
  target: number;
  detail: string;
}

export interface EntityContentCoverage {
  status: 'ready' | 'thin';
  metrics: {
    peopleCount: number;
    activityCount: number;
    workCount: number;
  };
  thresholds: {
    people: number;
    activity: number;
    works: number;
  };
  missing: EntityCoverageMissing[];
}

export interface TopicPageData {
  topic: string;
  people: DirectoryPerson[];
  totalPeople: number;
  activity: ActivityEvent[];
  works: EntityWork[];
  relatedTopics: EntityFacet[];
  relatedOrganizations: EntityFacet[];
  coverage: EntityContentCoverage;
}

export interface OrganizationPageData {
  organization: string;
  aliases: string[];
  people: DirectoryPerson[];
  totalPeople: number;
  activity: ActivityEvent[];
  works: EntityWork[];
  currentPeople: OrganizationRolePerson[];
  alumniPeople: OrganizationRolePerson[];
  relatedTopics: EntityFacet[];
  coverage: EntityContentCoverage;
}

const READY_STATUS = ['ready', 'active'];
const WORK_SOURCE_TYPES = ['openalex', 'github'];
const COVERAGE_DAYS = 365;
const TOPIC_COVERAGE_THRESHOLDS = {
  people: 10,
  activity: 10,
  works: 5,
};
const ORGANIZATION_COVERAGE_THRESHOLDS = {
  people: 5,
  activity: 5,
  works: 5,
};

export async function fetchTopicPageData(topic: string): Promise<TopicPageData> {
  const topicAliases = getDirectoryTopicAliases(topic);
  const [directory, activity] = await Promise.all([
    fetchPersonDirectory({ page: 1, limit: 12, topic, sortBy: 'influenceScore' }),
    fetchActivityEvents({
      topic,
      limit: TOPIC_COVERAGE_THRESHOLDS.activity,
      days: COVERAGE_DAYS,
      includeRelations: false,
    }),
  ]);
  const works = await fetchEntityWorksForPeople(directory.data.map(person => person.id), Math.max(8, TOPIC_COVERAGE_THRESHOLDS.works));

  return {
    topic,
    people: directory.data,
    totalPeople: directory.pagination.total,
    activity,
    works,
    relatedTopics: topFacets(
      directory.data.flatMap(person => person.topics).filter(value => !topicAliases.includes(value)),
      DIRECTORY_TOPICS,
      8,
      normalizeDirectoryTopic,
      true
    ),
    relatedOrganizations: topFacets(
      directory.data.flatMap(person => person.organization),
      DIRECTORY_ORGANIZATIONS,
      8
    ),
    coverage: buildContentCoverage({
      peopleCount: directory.pagination.total,
      activityCount: activity.length,
      workCount: works.length,
      thresholds: TOPIC_COVERAGE_THRESHOLDS,
    }),
  };
}

export async function fetchOrganizationPageData(organization: string): Promise<OrganizationPageData> {
  const aliases = getDirectoryOrganizationAliases(organization);
  const roleWhere = buildOrganizationRoleWhere(aliases);

  const [directory, activity, roles] = await Promise.all([
    fetchPersonDirectory({ page: 1, limit: 12, organization, sortBy: 'influenceScore' }),
    fetchActivityEvents({ organization, limit: 8, days: COVERAGE_DAYS, includeRelations: false }),
    prisma.personRole.findMany({
      where: roleWhere,
      select: {
        role: true,
        roleZh: true,
        startDate: true,
        endDate: true,
        confidence: true,
        person: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            currentTitle: true,
          },
        },
      },
      orderBy: [{ endDate: 'asc' }, { startDate: 'desc' }],
      take: 64,
    }),
  ]);
  const works = await fetchEntityWorksForPeople(directory.data.map(person => person.id), Math.max(8, ORGANIZATION_COVERAGE_THRESHOLDS.works));

  const uniqueCurrent = uniqueRolePeople(roles.filter(role => !role.endDate), 8);
  const uniqueAlumni = uniqueRolePeople(roles.filter(role => role.endDate), 8);

  return {
    organization,
    aliases,
    people: directory.data,
    totalPeople: directory.pagination.total,
    activity,
    works,
    currentPeople: uniqueCurrent,
    alumniPeople: uniqueAlumni,
    relatedTopics: topFacets(
      directory.data.flatMap(person => person.topics),
      DIRECTORY_TOPICS,
      10,
      normalizeDirectoryTopic,
      true
    ),
    coverage: buildContentCoverage({
      peopleCount: directory.pagination.total,
      activityCount: activity.length,
      workCount: works.length,
      thresholds: ORGANIZATION_COVERAGE_THRESHOLDS,
    }),
  };
}

function buildOrganizationRoleWhere(aliases: string[]): Prisma.PersonRoleWhereInput {
  return {
    organization: {
      OR: [
        { name: { in: aliases } },
        { nameZh: { in: aliases } },
      ],
    },
    person: {
      status: { in: READY_STATUS },
    },
  };
}

async function fetchEntityWorksForPeople(personIds: string[], limit: number): Promise<EntityWork[]> {
  const uniquePersonIds = [...new Set(personIds)];
  if (uniquePersonIds.length === 0) return [];

  const rows = await prisma.rawPoolItem.findMany({
    where: {
      personId: { in: uniquePersonIds },
      fetchStatus: 'success',
      url: { not: '' },
      title: { not: '' },
      OR: [
        { sourceType: { in: WORK_SOURCE_TYPES } },
        { metadata: { path: ['contentDensityLane'], equals: 'works' } },
      ],
    },
    select: {
      id: true,
      sourceType: true,
      title: true,
      text: true,
      url: true,
      publishedAt: true,
      fetchedAt: true,
      metadata: true,
      person: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
    take: limit * 2,
  });

  return rows.map(row => toEntityWork(row)).slice(0, limit);
}

function buildContentCoverage(params: {
  peopleCount: number;
  activityCount: number;
  workCount: number;
  thresholds: EntityContentCoverage['thresholds'];
}): EntityContentCoverage {
  const missing: EntityCoverageMissing[] = [];

  if (params.peopleCount < params.thresholds.people) {
    missing.push(buildMissing('people', params.peopleCount, params.thresholds.people));
  }
  if (params.activityCount < params.thresholds.activity) {
    missing.push(buildMissing('activity', params.activityCount, params.thresholds.activity));
  }
  if (params.workCount < params.thresholds.works) {
    missing.push(buildMissing('works', params.workCount, params.thresholds.works));
  }

  return {
    status: missing.length === 0 ? 'ready' : 'thin',
    metrics: {
      peopleCount: params.peopleCount,
      activityCount: params.activityCount,
      workCount: params.workCount,
    },
    thresholds: params.thresholds,
    missing,
  };
}

function buildMissing(key: EntityCoverageMissing['key'], current: number, target: number): EntityCoverageMissing {
  const labels = {
    people: '相关人物',
    activity: '近期动态',
    works: '代表论文或项目',
  };
  return {
    key,
    current,
    target,
    detail: `${labels[key]} ${current}/${target}`,
  };
}

function toEntityWork(row: {
  id: string;
  sourceType: string;
  title: string;
  text: string;
  url: string;
  publishedAt: Date | null;
  fetchedAt: Date;
  metadata: Prisma.JsonValue | null;
  person: {
    id: string;
    name: string;
  };
}): EntityWork {
  const metadata = asRecord(row.metadata);
  const type = row.sourceType === 'github'
    ? 'github'
    : row.sourceType === 'official' || readString(metadata, ['sourceLabel']) === 'Official'
      ? 'official'
      : 'paper';
  return {
    id: row.id,
    type,
    sourceLabel: type === 'github' ? 'GitHub' : type === 'official' ? 'Official' : 'OpenAlex',
    title: row.title,
    url: row.url,
    summary: buildSummary(row.text),
    personId: row.person.id,
    personName: row.person.name,
    publishedAt: (row.publishedAt ?? row.fetchedAt).toISOString(),
    metricLabel: buildWorkMetric(type, metadata),
  };
}

function uniqueRolePeople(rows: Array<{
  role: string;
  roleZh: string | null;
  startDate: Date | null;
  endDate: Date | null;
  confidence: number | null;
  person: {
    id: string;
    name: string;
    avatarUrl: string | null;
    currentTitle: string | null;
  };
}>, limit: number): OrganizationRolePerson[] {
  const seen = new Set<string>();
  const result: OrganizationRolePerson[] = [];

  for (const row of rows) {
    if (seen.has(row.person.id)) continue;
    seen.add(row.person.id);
    result.push({
      personId: row.person.id,
      name: row.person.name,
      avatarUrl: row.person.avatarUrl,
      currentTitle: row.person.currentTitle,
      role: row.roleZh || row.role,
      startYear: yearOf(row.startDate),
      endYear: yearOf(row.endDate),
      confidence: row.confidence,
    });
    if (result.length >= limit) break;
  }

  return result;
}

function topFacets(
  values: string[],
  preferredOrder: string[],
  limit: number,
  normalizeValue: (value: string) => string = value => value,
  onlyPreferred = false
): EntityFacet[] {
  const counts = new Map<string, number>();
  const preferredSet = new Set(preferredOrder);
  for (const value of values) {
    const normalized = normalizeValue(value.trim());
    if (!normalized) continue;
    if (onlyPreferred && preferredSet.size > 0 && !preferredSet.has(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  const preferredIndex = new Map(preferredOrder.map((value, index) => [value, index]));

  return Array.from(counts.entries())
    .sort((left, right) => {
      const countDelta = right[1] - left[1];
      if (countDelta !== 0) return countDelta;
      const leftIndex = preferredIndex.get(left[0]) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = preferredIndex.get(right[0]) ?? Number.MAX_SAFE_INTEGER;
      if (leftIndex !== rightIndex) return leftIndex - rightIndex;
      return left[0].localeCompare(right[0], 'zh-CN');
    })
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function buildWorkMetric(type: EntityWork['type'], metadata: Record<string, unknown> | null): string | null {
  if (type === 'github') {
    const stars = readNumber(metadata, ['stars', 'stargazers_count', 'stargazersCount']);
    return typeof stars === 'number' ? `${formatCompactNumber(stars)} stars` : null;
  }

  const citedBy = readNumber(metadata, ['citedByCount', 'cited_by_count', 'citations']);
  const venue = readString(metadata, ['venue', 'source']);
  if (typeof citedBy === 'number') return `${formatCompactNumber(citedBy)} 引用`;
  return venue || null;
}

function readNumber(metadata: Record<string, unknown> | null, keys: string[]): number | null {
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function readString(metadata: Record<string, unknown> | null, keys: string[]): string | null {
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function buildSummary(text: string): string | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized === 'null') return null;
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

function formatCompactNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value);
}

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function yearOf(value: Date | null): string | null {
  return value ? String(value.getUTCFullYear()) : null;
}
