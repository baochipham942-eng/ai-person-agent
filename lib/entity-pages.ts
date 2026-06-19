import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { fetchActivityEvents, type ActivityEvent } from '@/lib/activity';
import anthropicEvidenceSeed from '@/data/company/anthropic-evidence-seed.json';
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

export type CompanyEvidenceRole =
  | 'official_strategy'
  | 'product_release'
  | 'financial_signal'
  | 'partnership_signal'
  | 'hiring_team_signal';

export interface CompanyEvidenceItem {
  id: string;
  role: CompanyEvidenceRole;
  sourceType: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: string | null;
  sourceLabel: string;
  confidence: number;
}

export interface CompanyProductItem {
  name: string;
  summary: string;
  url?: string;
}

export interface CompanyThreadEvidenceSource {
  id: string;
  role: CompanyEvidenceRole;
  title: string;
  sourceType: string;
  url: string;
}

export interface CompanyThreadLink {
  slug: string;
  title: string;
  relationType: 'invests_in' | 'productizes' | 'researches' | 'platform_for';
  summary: string;
  evidenceSourceIds: string[];
  evidenceSources: CompanyThreadEvidenceSource[];
}

export interface CompanyPageIntelligence {
  displayName: string | null;
  homepageUrl: string | null;
  logoUrl: string | null;
  positioning: string | null;
  aiStrategySummary: string | null;
  products: CompanyProductItem[];
  evidence: CompanyEvidenceItem[];
  relatedThreads: CompanyThreadLink[];
  sourceMode: 'empty' | 'fixture' | 'dry_run' | 'db';
  sourceNote: string;
  coverage: {
    evidenceCount: number;
    hasOfficialStrategy: boolean;
    hasFinancialSignal: boolean;
    hasProductRelease: boolean;
  };
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
  companyIntelligence: CompanyPageIntelligence;
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
const COMPANY_FIXTURE_ENABLED = process.env.NODE_ENV !== 'production';

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

  const [directory, activity, roles, companyIntelligence] = await Promise.all([
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
    fetchCompanyPageIntelligence(organization, aliases),
  ]);
  const works = await fetchEntityWorksForPeople(directory.data.map(person => person.id), Math.max(8, ORGANIZATION_COVERAGE_THRESHOLDS.works));

  const uniqueCurrent = uniqueRolePeople(roles.filter(role => !role.endDate), 8);
  const uniqueAlumni = uniqueRolePeople(roles.filter(role => role.endDate), 8);

  return {
    organization,
    aliases,
    companyIntelligence,
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

export function buildEmptyCompanyIntelligence(): CompanyPageIntelligence {
  return buildCompanyIntelligence({
    positioning: null,
    aiStrategySummary: null,
    products: [],
    evidence: [],
    relatedThreads: [],
    displayName: null,
    homepageUrl: null,
    logoUrl: null,
    sourceMode: 'empty',
    sourceNote: '公司级证据尚未入库。当前页面不会用人物动态、论文或项目来冒充公司证据。',
  });
}

async function fetchCompanyPageIntelligence(organization: string, aliases: string[]): Promise<CompanyPageIntelligence> {
  const databaseIntelligence = await fetchCompanyIntelligenceFromDb(organization, aliases);
  if (databaseIntelligence) return databaseIntelligence;

  if (COMPANY_FIXTURE_ENABLED && matchesCompanyFixture(organization, aliases, anthropicEvidenceSeed.company.slug)) {
    return buildAnthropicFixtureIntelligence();
  }

  return buildEmptyCompanyIntelligence();
}

async function fetchCompanyIntelligenceFromDb(organization: string, aliases: string[]): Promise<CompanyPageIntelligence | null> {
  try {
    const row = await prisma.organization.findFirst({
      where: {
        OR: buildOrganizationNameLookup(organization, aliases),
      },
      select: {
        name: true,
        nameZh: true,
        description: true,
        companySources: {
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          take: 32,
        },
        companyThreadLinks: {
          orderBy: [{ threadSlug: 'asc' }, { createdAt: 'asc' }],
          take: 16,
        },
      },
    });
    if (!row || (row.companySources.length === 0 && row.companyThreadLinks.length === 0)) return null;

    const evidence = row.companySources
      .filter(source => isCompanyEvidenceRole(source.role))
      .map(source => ({
        id: source.id,
        role: source.role as CompanyEvidenceRole,
        sourceType: source.sourceKind,
        title: source.title,
        url: source.url,
        summary: source.summary || source.title,
        publishedAt: source.publishedAt ? source.publishedAt.toISOString().slice(0, 10) : null,
        sourceLabel: jsonString(source.metadata, 'sourceLabel') || row.nameZh || row.name || organization,
        confidence: source.confidence,
      }));
    const evidenceById = new Map(evidence.map(item => [item.id, item]));
    const relatedThreads = row.companyThreadLinks.map(link => {
      const evidenceSources = link.evidenceSourceIds
        .map(id => evidenceById.get(id))
        .filter((item): item is CompanyEvidenceItem => Boolean(item))
        .map(item => ({
          id: item.id,
          role: item.role,
          title: item.title,
          sourceType: item.sourceType,
          url: item.url,
        }));
      return {
        slug: link.threadSlug,
        title: link.threadTitle,
        relationType: toCompanyThreadRelationType(link.relationType),
        summary: link.summary,
        evidenceSourceIds: link.evidenceSourceIds,
        evidenceSources,
      };
    });
    const productSources = row.companySources.filter(source => source.role === 'product_release').slice(0, 6);
    const displayName = row.nameZh || row.name || organization;
    const homepageUrl = deriveCompanyHomepage(row.description, row.companySources.map(source => source.url));

    return buildCompanyIntelligence({
      displayName,
      homepageUrl,
      logoUrl: buildCompanyLogoUrl(displayName, homepageUrl),
      positioning: `${displayName} 的公司页已接入 reviewed CompanySource 记录，证据只来自公司级官方、产品、融资、合作和团队来源。`,
      aiStrategySummary: relatedThreads[0]?.summary || evidence.find(item => item.role === 'official_strategy')?.summary || null,
      products: productSources.map(source => ({
        name: source.title,
        summary: source.summary || source.title,
        url: source.url,
      })),
      evidence,
      relatedThreads,
      sourceMode: 'db',
      sourceNote: 'CompanySource / CompanyThreadLink records are present in the database. Financial evidence remains company-page only and does not count toward technical thread readiness.',
    });
  } catch (error) {
    if (isCompanySourceTableMissing(error)) return null;
    throw error;
  }
}

function buildAnthropicFixtureIntelligence(): CompanyPageIntelligence {
  const evidence = anthropicEvidenceSeed.candidates.map((candidate, index) => ({
    id: candidate.id || `fixture-anthropic-${index + 1}`,
    role: candidate.role as CompanyEvidenceRole,
    sourceType: candidate.sourceKind,
    title: candidate.title || candidate.label,
    url: candidate.url,
    summary: candidate.notes,
    publishedAt: 'publishedAt' in candidate && typeof candidate.publishedAt === 'string'
      ? candidate.publishedAt
      : null,
    sourceLabel: candidate.sourceLabel || candidate.label,
    confidence: 0.72,
  }));
  const relatedThreads = anthropicEvidenceSeed.companyStrategyContexts.map(context => ({
    slug: context.threadSlug,
    title: context.threadTitle,
    relationType: context.relationType as CompanyThreadLink['relationType'],
    summary: context.summary,
    evidenceSourceIds: context.sourceIds,
    evidenceSources: context.sourceIds
      .map(sourceId => evidence.find(item => item.id === sourceId))
      .filter((item): item is CompanyEvidenceItem => Boolean(item))
      .map(item => ({
        id: item.id,
        role: item.role,
        title: item.title,
        sourceType: item.sourceType,
        url: item.url,
      })),
  }));

  return buildCompanyIntelligence({
    displayName: anthropicEvidenceSeed.company.name,
    homepageUrl: anthropicEvidenceSeed.company.homepage,
    logoUrl: '/logos/anthropic.png',
    positioning: 'Anthropic 是 Claude 和 Claude Code 背后的 AI 公司。当前样板来自 P1 company-source dry-run contract。',
    aiStrategySummary: 'P1 dry-run 使用 Anthropic 官方 newsroom、产品文档、融资公告、合作公告和 careers 种子，验证公司级证据如何承载官方策略、产品发布、融资、合作和团队信号。',
    products: [
      {
        name: 'Claude',
        summary: 'Anthropic 面向个人和企业的模型产品入口。本项来自 dry-run contract，不代表生产 CompanySource 已入库。',
        url: anthropicEvidenceSeed.company.homepage,
      },
      {
        name: 'Claude Code',
        summary: '面向开发者的 agentic coding 产品线。本项来自官方文档 seed，用于验证公司页产品区块和主题页回链。',
        url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
      },
    ],
    evidence,
    relatedThreads,
    sourceMode: 'dry_run',
    sourceNote: 'Dry-run contract mirrored into data/company/anthropic-evidence-seed.json for runtime rendering. 财务和融资材料仍只留在公司页，不进入技术主题 readiness。',
  });
}

function buildCompanyIntelligence(params: Omit<CompanyPageIntelligence, 'coverage'>): CompanyPageIntelligence {
  const roles = new Set(params.evidence.map(item => item.role));
  return {
    ...params,
    coverage: {
      evidenceCount: params.evidence.length,
      hasOfficialStrategy: roles.has('official_strategy'),
      hasFinancialSignal: roles.has('financial_signal'),
      hasProductRelease: roles.has('product_release'),
    },
  };
}

const LOCAL_COMPANY_LOGOS: Record<string, string> = {
  anthropic: '/logos/anthropic.png',
};

function buildCompanyLogoUrl(displayName: string, homepageUrl: string | null): string | null {
  const localLogo = LOCAL_COMPANY_LOGOS[normalizeCompanyKey(displayName)];
  if (localLogo) return localLogo;

  const homepageKey = homepageUrl ? normalizeCompanyKey(hostnameFromUrl(homepageUrl) || '') : '';
  return homepageKey ? LOCAL_COMPANY_LOGOS[homepageKey] || null : null;
}

function deriveCompanyHomepage(description: string | null, sourceUrls: string[]): string | null {
  const descriptionUrl = description?.match(/https?:\/\/[^\s)]+/)?.[0] || null;
  const candidates = [descriptionUrl, ...sourceUrls].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    const origin = originFromUrl(candidate);
    if (origin) return origin;
  }
  return null;
}

function originFromUrl(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function hostnameFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isCompanyEvidenceRole(value: string): value is CompanyEvidenceRole {
  return value === 'official_strategy'
    || value === 'product_release'
    || value === 'financial_signal'
    || value === 'partnership_signal'
    || value === 'hiring_team_signal';
}

function toCompanyThreadRelationType(value: string): CompanyThreadLink['relationType'] {
  if (value === 'invests_in' || value === 'productizes' || value === 'researches' || value === 'platform_for') {
    return value;
  }
  return 'productizes';
}

function jsonString(value: Prisma.JsonValue | null, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value[key];
  return typeof candidate === 'string' && candidate.trim() ? candidate : null;
}

function isCompanySourceTableMissing(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') return true;
  return error instanceof Error && /CompanySource|CompanyThreadLink/i.test(error.message) && /does not exist|not exist|unknown/i.test(error.message);
}

function matchesCompanyFixture(organization: string, aliases: string[], slug: string): boolean {
  const normalizedSlug = normalizeCompanyKey(slug);
  return [organization, ...aliases].some(value => normalizeCompanyKey(value) === normalizedSlug);
}

function buildOrganizationNameLookup(organization: string, aliases: string[]): Prisma.OrganizationWhereInput[] {
  const names = Array.from(new Set([organization, ...aliases].map(value => value.trim()).filter(Boolean)));
  return names.flatMap(value => [
    { name: { equals: value, mode: 'insensitive' } },
    { nameZh: { equals: value, mode: 'insensitive' } },
  ]);
}

function normalizeCompanyKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
