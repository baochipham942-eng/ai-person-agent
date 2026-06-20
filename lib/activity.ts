import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import {
  getDirectoryOrganizationAliases,
  getDirectoryTopicAliases,
  normalizeDirectoryTopics,
} from '@/lib/person-directory-config';

export type ActivityEventType =
  | 'paper'
  | 'github'
  | 'video'
  | 'article'
  | 'podcast'
  | 'role_change'
  | 'relation_change';

export interface ActivityEvent {
  id: string;
  personId: string;
  personName: string;
  personAvatarUrl: string | null;
  personCurrentTitle: string | null;
  eventType: ActivityEventType;
  sourceType: string;
  title: string;
  summary: string | null;
  url: string;
  occurredAt: string | null;
  detectedAt: string;
  topics: string[];
  organizations: string[];
  confidence: number;
  reviewStatus: string;
  sourceLabel: string;
  importanceReason: string | null;
}

export interface FetchActivityParams {
  personId?: string | null;
  topic?: string | null;
  organization?: string | null;
  limit?: number;
  days?: number;
  includeRelations?: boolean;
  /** 只返回这些事件类型（用于首页本周推荐按类型分桶取候选）。空/未传=不限类型。 */
  eventTypes?: ActivityEventType[];
}

const ACTIVITY_SOURCE_TYPES = ['openalex', 'github', 'youtube', 'exa', 'podcast', 'career'];
const DEFAULT_ACTIVITY_REVIEW_STATUSES = ['auto', 'confirmed', 'trusted'];
const LOW_SIGNAL_SOURCE_KINDS = new Set(['youtube_caption']);
const FIRST_PARTY_DOMAINS = new Set([
  'anthropic.com',
  'apple.com',
  'blogs.nvidia.com',
  'claude.com',
  'cursor.com',
  'deepmind.google',
  'developers.googleblog.com',
  'github.blog',
  'huggingface.co',
  'machinelearning.apple.com',
  'microsoft.com',
  'nvidia.com',
  'openai.com',
  'openrouter.ai',
  'perplexity.ai',
  'qwen.ai',
  'replit.com',
  'research.google',
  'runwayml.com',
  'x.ai',
]);
const DISCOVERY_ONLY_DOMAINS = new Set([
  'ithome.com',
  'news.ycombinator.com',
]);
const MEDIA_RELAY_DOMAINS = new Set([
  '36kr.com',
  'aibase.com',
  'hackernews.betacat.io',
  'infoq.cn',
  'jiqizhixin.com',
  'leiphone.com',
  'qbitai.com',
  'the-decoder.com',
  'theverge.com',
  'techcrunch.com',
]);
const OFFICIAL_X_HANDLES = new Set([
  'alibaba_cloud',
  'anthropicai',
  'chatgptapp',
  'github',
  'googledeepmind',
  'huggingface',
  'lumalabsai',
  'msftresearch',
  'nvidia',
  'nvidiaai',
  'openai',
  'openaidevs',
  'openbmb',
  'openrouter',
  'perplexity_ai',
  'replit',
  'runwayml',
  'sensetime_ai',
  'tencenthunyuan',
  'xai',
]);
const LOW_SIGNAL_TITLE_PATTERNS = [
  /\bwtf\b/i,
  /\bwhat\s+the\s+f/i,
  /\bwhat\s+is\s+going\s+on\b/i,
  /\byou\s+won'?t\s+believe\b/i,
  /\b(mind[-\s]?blowing|shocking|insane|crazy)\b/i,
  /[!?]{2,}/,
];

const SOURCE_TYPE_LABELS: Record<string, { eventType: ActivityEventType; sourceLabel: string }> = {
  openalex: { eventType: 'paper', sourceLabel: 'OpenAlex' },
  github: { eventType: 'github', sourceLabel: 'GitHub' },
  youtube: { eventType: 'video', sourceLabel: 'YouTube' },
  exa: { eventType: 'article', sourceLabel: 'Web' },
  company_source: { eventType: 'article', sourceLabel: '官方公司源' },
  podcast: { eventType: 'podcast', sourceLabel: 'Podcast' },
  career: { eventType: 'role_change', sourceLabel: 'Career' },
  relation: { eventType: 'relation_change', sourceLabel: '关系证据' },
};

let activityEventStoreAvailability: Promise<boolean> | null = null;

export async function fetchActivityEvents(params: FetchActivityParams = {}): Promise<ActivityEvent[]> {
  const limit = Math.min(Math.max(params.limit ?? 12, 1), 48);
  const days = Math.min(Math.max(params.days ?? 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [persistedEvents, relationEvents] = await Promise.all([
    fetchPersistedActivityEvents(params, since, limit).catch(error => {
      if (isMissingActivityEventStore(error)) return null;
      throw error;
    }),
    params.includeRelations === false ? Promise.resolve([]) : fetchRelationActivityEvents(params, since, limit),
  ]);
  // 公司源事件只产出 article 类型；当调用方按类型分桶且不要 article 时跳过这次查询（省 Neon 往返）。
  const wantsArticle = !params.eventTypes || params.eventTypes.length === 0 || params.eventTypes.includes('article');
  const companySourceEvents = wantsArticle
    ? await fetchCompanySourceActivityEvents(params, since, limit).catch(error => {
        if (isMissingCompanySourceStore(error)) return [];
        throw error;
      })
    : [];

  const typeFilter = params.eventTypes && params.eventTypes.length > 0 ? new Set(params.eventTypes) : null;
  const matchesType = (event: ActivityEvent) => !typeFilter || typeFilter.has(event.eventType);

  if (persistedEvents && persistedEvents.length > 0) {
    return mergeActivityEvents([...persistedEvents, ...companySourceEvents, ...relationEvents].filter(matchesType), limit);
  }

  const rawEvents = await fetchRawPoolActivityEvents(params, since, limit);
  return mergeActivityEvents([...rawEvents, ...companySourceEvents, ...relationEvents].filter(matchesType), limit);
}

async function fetchPersistedActivityEvents(
  params: FetchActivityParams,
  since: Date,
  limit: number
): Promise<ActivityEvent[]> {
  if (!(await hasActivityEventStore())) return [];

  const where = buildPersistedActivityWhere(params, since);

  const rows = await prisma.activityEvent.findMany({
    where,
    select: {
      id: true,
      personId: true,
      eventType: true,
      sourceType: true,
      title: true,
      summary: true,
      url: true,
      occurredAt: true,
      detectedAt: true,
      topics: true,
      organizations: true,
      confidence: true,
      evidenceNote: true,
      reviewStatus: true,
      metadata: true,
      sourceItem: {
        select: {
          publishedAt: true,
          metadata: true,
        },
      },
      person: {
        select: {
          name: true,
          avatarUrl: true,
          currentTitle: true,
        },
      },
    },
    orderBy: [{ occurredAt: 'desc' }, { detectedAt: 'desc' }],
    take: Math.min(limit * 4, 96),
  });

  return rows
    .map(row => {
      const eventType = normalizeEventType(row.eventType);
      const title = normalizeActivityTitle(row.title);
      const confidence = clampConfidence(row.confidence);
      const reviewStatus = row.reviewStatus || reviewStatusFromConfidence(row.confidence);
      const topics = normalizeDirectoryTopics(row.topics);
      const sourceLabel = SOURCE_TYPE_LABELS[row.sourceType]?.sourceLabel || row.sourceType;

      if (!isRecommendedActivity({
        sourceType: row.sourceType,
        eventType,
        title,
        confidence,
        reviewStatus,
        eventMetadata: asRecord(row.metadata),
        sourceItemMetadata: asRecord(row.sourceItem?.metadata ?? null),
        sourceItemPublishedAt: row.sourceItem?.publishedAt ?? null,
      })) {
        return null;
      }

      return {
        id: row.id,
        personId: row.personId,
        personName: row.person.name,
        personAvatarUrl: row.person.avatarUrl,
        personCurrentTitle: row.person.currentTitle,
        eventType,
        sourceType: row.sourceType,
        title,
        summary: row.summary,
        url: row.url,
        occurredAt: row.occurredAt ? row.occurredAt.toISOString() : null,
        detectedAt: row.detectedAt.toISOString(),
        topics,
        organizations: row.organizations,
        confidence,
        reviewStatus,
        sourceLabel,
        importanceReason: buildImportanceReason({
          eventType,
          sourceLabel,
          topics,
          organizations: row.organizations,
          confidence,
          evidenceNote: row.evidenceNote,
        }),
      };
    })
    .filter((event): event is ActivityEvent => Boolean(event))
    .sort((left, right) => eventTime(right) - eventTime(left));
}

async function fetchRawPoolActivityEvents(
  params: FetchActivityParams,
  since: Date,
  limit: number
): Promise<ActivityEvent[]> {
  const where = buildActivityWhere(params, since);

  const rows = await prisma.rawPoolItem.findMany({
    where,
    select: {
      id: true,
      sourceType: true,
      url: true,
      title: true,
      text: true,
      publishedAt: true,
      fetchedAt: true,
      metadata: true,
      person: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          currentTitle: true,
          organization: true,
          topics: true,
        },
      },
    },
    orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
    take: Math.min(limit * 8, 96),
  });

  return rows
    .map(row => toActivityEvent(row))
    .filter((event): event is ActivityEvent => Boolean(event))
    .filter(isHomepageEligibleActivity)
    .sort(compareActivityQuality)
    .slice(0, limit);
}

async function fetchCompanySourceActivityEvents(
  params: FetchActivityParams,
  since: Date,
  limit: number
): Promise<ActivityEvent[]> {
  const where = buildCompanySourceActivityWhere(params, since);
  if (!where) return [];

  const rows = await prisma.companySource.findMany({
    where,
    select: {
      id: true,
      sourceKind: true,
      role: true,
      title: true,
      url: true,
      summary: true,
      publishedAt: true,
      fetchedAt: true,
      createdAt: true,
      confidence: true,
      metadata: true,
      organization: {
        select: {
          id: true,
          name: true,
          nameZh: true,
        },
      },
    },
    orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }, { createdAt: 'desc' }],
    take: Math.min(limit * 6, 72),
  });

  return rows
    .map(row => toCompanySourceActivityEvent(row))
    .filter((event): event is ActivityEvent => Boolean(event))
    .filter(isHomepageEligibleActivity)
    .sort(compareActivityQuality)
    .slice(0, limit);
}

async function fetchRelationActivityEvents(
  params: FetchActivityParams,
  since: Date,
  limit: number
): Promise<ActivityEvent[]> {
  const where = buildRelationActivityWhere(params, since);
  const rows = await prisma.personRelation.findMany({
    where,
    select: {
      id: true,
      personId: true,
      relatedPersonId: true,
      relationType: true,
      description: true,
      source: true,
      confidence: true,
      reviewStatus: true,
      evidenceUrl: true,
      evidenceNote: true,
      createdAt: true,
      person: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          currentTitle: true,
          organization: true,
          topics: true,
        },
      },
      relatedPerson: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          currentTitle: true,
          organization: true,
          topics: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 24),
  });

  return rows
    .map(row => toRelationActivityEvent(row, params.personId || null))
    .filter((event): event is ActivityEvent => Boolean(event))
    .sort((left, right) => eventTime(right) - eventTime(left));
}

function buildRelationActivityWhere(params: FetchActivityParams, since: Date): Prisma.PersonRelationWhereInput {
  const filters: Prisma.PersonRelationWhereInput[] = [
    { createdAt: { gte: since } },
    { reviewStatus: { in: ['trusted', 'confirmed'] } },
    {
      OR: [
        { evidenceUrl: { not: null } },
        { evidenceNote: { not: null } },
      ],
    },
  ];

  if (params.personId) {
    filters.push({
      OR: [
        { personId: params.personId },
        { relatedPersonId: params.personId },
      ],
    });
  }

  if (params.topic) {
    const topicAliases = getDirectoryTopicAliases(params.topic);
    filters.push({
      OR: [
        { person: { topics: { hasSome: topicAliases } } },
        { relatedPerson: { topics: { hasSome: topicAliases } } },
      ],
    });
  }

  if (params.organization) {
    const aliases = getDirectoryOrganizationAliases(params.organization);
    filters.push({
      OR: [
        { person: buildOrganizationPersonWhere(params.organization, aliases) },
        { relatedPerson: buildOrganizationPersonWhere(params.organization, aliases) },
      ],
    });
  }

  return { AND: filters };
}

function buildPersistedActivityWhere(params: FetchActivityParams, since: Date): Prisma.ActivityEventWhereInput {
  const filters: Prisma.ActivityEventWhereInput[] = [
    {
      OR: [
        { occurredAt: { gte: since } },
        { detectedAt: { gte: since } },
      ],
    },
    { reviewStatus: { in: DEFAULT_ACTIVITY_REVIEW_STATUSES } },
    { url: { not: '' } },
    { title: { not: '' } },
  ];

  if (params.eventTypes && params.eventTypes.length > 0) {
    filters.push({ eventType: { in: params.eventTypes } });
  }

  if (params.personId) {
    filters.push({ personId: params.personId });
  }

  if (params.topic) {
    const topicAliases = getDirectoryTopicAliases(params.topic);
    filters.push({
      OR: [
        { topics: { hasSome: topicAliases } },
        { person: { topics: { hasSome: topicAliases } } },
      ],
    });
  }

  if (params.organization) {
    const aliases = getDirectoryOrganizationAliases(params.organization);
    filters.push({
      OR: [
        { organizations: { hasSome: aliases } },
        { person: buildOrganizationPersonWhere(params.organization, aliases) },
      ],
    });
  }

  return { AND: filters };
}

function buildActivityWhere(params: FetchActivityParams, since: Date): Prisma.RawPoolItemWhereInput {
  const personWhere: Prisma.PeopleWhereInput = {};

  if (params.topic) {
    personWhere.topics = { hasSome: getDirectoryTopicAliases(params.topic) };
  }

  if (params.organization) {
    const aliases = getDirectoryOrganizationAliases(params.organization);
    personWhere.OR = buildOrganizationPersonWhere(params.organization, aliases).OR;
  }

  return {
    ...(params.personId && { personId: params.personId }),
    sourceType: { in: ACTIVITY_SOURCE_TYPES },
    fetchStatus: 'success',
    url: { not: '' },
    title: { not: '' },
    OR: [
      { publishedAt: { gte: since } },
      { fetchedAt: { gte: since } },
    ],
    ...(Object.keys(personWhere).length > 0 && { person: personWhere }),
  };
}

function buildCompanySourceActivityWhere(params: FetchActivityParams, since: Date): Prisma.CompanySourceWhereInput | null {
  if (params.personId) return null;
  if (params.topic && !params.organization) return null;

  const filters: Prisma.CompanySourceWhereInput[] = [
    { excludedFromTopicReadiness: true },
    { url: { not: '' } },
    { title: { not: '' } },
    {
      OR: [
        { publishedAt: { gte: since } },
        {
          AND: [
            { publishedAt: null },
            { fetchedAt: { gte: since } },
          ],
        },
        {
          AND: [
            { publishedAt: null },
            { fetchedAt: null },
            { createdAt: { gte: since } },
          ],
        },
      ],
    },
  ];

  if (params.organization) {
    const aliases = getDirectoryOrganizationAliases(params.organization);
    filters.push({
      organization: {
        OR: [
          { name: { in: aliases } },
          { nameZh: { in: aliases } },
        ],
      },
    });
  }

  return { AND: filters };
}

function buildOrganizationPersonWhere(organization: string, aliases: string[]): Prisma.PeopleWhereInput {
  return {
    OR: [
      { organization: { hasSome: aliases } },
      { currentTitle: { contains: organization, mode: 'insensitive' } },
      {
        roles: {
          some: {
            organization: {
              OR: [
                { name: { in: aliases } },
                { nameZh: { in: aliases } },
              ],
            },
          },
        },
      },
    ],
  };
}

function toActivityEvent(row: {
  id: string;
  sourceType: string;
  url: string;
  title: string;
  text: string;
  publishedAt: Date | null;
  fetchedAt: Date;
  metadata: Prisma.JsonValue | null;
  person: {
    id: string;
    name: string;
    avatarUrl: string | null;
    currentTitle: string | null;
    organization: string[];
    topics: string[];
  };
}): ActivityEvent | null {
  if (!row.url || !row.title) return null;

  const sourceConfig = SOURCE_TYPE_LABELS[row.sourceType] || {
    eventType: 'article' as ActivityEventType,
    sourceLabel: row.sourceType,
  };
  const metadata = asRecord(row.metadata);
  const metadataTags = metadata ? toStringArray(metadata.tags) : [];
  const topics = normalizeDirectoryTopics([...metadataTags, ...row.person.topics]).slice(0, 4);
  const occurredAt = row.publishedAt ?? row.fetchedAt;
  const title = normalizeActivityTitle(row.title);
  const confidence = readConfidence(metadata);
  const reviewStatus = reviewStatusFromConfidence(confidence);

  if (!isRecommendedActivity({
    sourceType: row.sourceType,
    eventType: sourceConfig.eventType,
    title,
    confidence,
    reviewStatus,
    sourceItemMetadata: metadata,
    sourceItemPublishedAt: row.publishedAt,
  })) {
    return null;
  }

  return {
    id: row.id,
    personId: row.person.id,
    personName: row.person.name,
    personAvatarUrl: row.person.avatarUrl,
    personCurrentTitle: row.person.currentTitle,
    eventType: sourceConfig.eventType,
    sourceType: row.sourceType,
    title,
    summary: buildSummary(row.text),
    url: row.url,
    occurredAt: occurredAt ? occurredAt.toISOString() : null,
    detectedAt: row.fetchedAt.toISOString(),
    topics,
    organizations: uniqueStrings(row.person.organization).slice(0, 3),
    confidence,
    reviewStatus,
    sourceLabel: sourceConfig.sourceLabel,
    importanceReason: buildImportanceReason({
      eventType: sourceConfig.eventType,
      sourceLabel: sourceConfig.sourceLabel,
      topics,
      organizations: uniqueStrings(row.person.organization).slice(0, 3),
      confidence,
      evidenceNote: readString(metadata?.evidenceNote) || readString(metadata?.sourceNote),
    }),
  };
}

function toRelationActivityEvent(row: {
  id: string;
  personId: string;
  relatedPersonId: string;
  relationType: string;
  description: string | null;
  source: string;
  confidence: number;
  reviewStatus: string;
  evidenceUrl: string | null;
  evidenceNote: string | null;
  createdAt: Date;
  person: ActivityRelationPerson;
  relatedPerson: ActivityRelationPerson;
}, focusPersonId: string | null): ActivityEvent | null {
  const evidenceUrl = cleanShortUrl(row.evidenceUrl);
  const evidenceNote = cleanShortText(row.evidenceNote);
  if (!evidenceUrl && !evidenceNote) return null;

  const focusOnRelatedPerson = focusPersonId === row.relatedPersonId;
  const focus = focusOnRelatedPerson ? row.relatedPerson : row.person;
  const counterpart = focusOnRelatedPerson ? row.person : row.relatedPerson;
  const topics = normalizeDirectoryTopics([...focus.topics, ...counterpart.topics]).slice(0, 4);
  const organizations = uniqueStrings([...focus.organization, ...counterpart.organization]).slice(0, 3);
  const relationLabel = relationTypeLabel(row.relationType);

  return {
    id: `relation:${row.id}:${focus.id}`,
    personId: focus.id,
    personName: focus.name,
    personAvatarUrl: focus.avatarUrl,
    personCurrentTitle: focus.currentTitle,
    eventType: 'relation_change',
    sourceType: 'relation',
    title: `与 ${counterpart.name} 的${relationLabel}关系已确认`,
    summary: cleanShortText(row.description) || evidenceNote,
    url: evidenceUrl || `/person/${counterpart.id}?fromRelation=${encodeURIComponent(row.relationType)}`,
    occurredAt: row.createdAt.toISOString(),
    detectedAt: row.createdAt.toISOString(),
    topics,
    organizations,
    confidence: clampConfidence(row.confidence),
    reviewStatus: row.reviewStatus,
    sourceLabel: row.source === 'wikidata' ? 'Wikidata 关系' : '关系证据',
    importanceReason: buildImportanceReason({
      eventType: 'relation_change',
      sourceLabel: row.source,
      topics,
      organizations,
      confidence: clampConfidence(row.confidence),
      evidenceNote,
    }),
  };
}

function toCompanySourceActivityEvent(row: {
  id: string;
  sourceKind: string;
  role: string;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: Date | null;
  fetchedAt: Date | null;
  createdAt: Date;
  confidence: number;
  metadata: Prisma.JsonValue | null;
  organization: {
    id: string;
    name: string;
    nameZh: string | null;
  };
}): ActivityEvent | null {
  if (!row.url || !row.title) return null;

  const metadata = asRecord(row.metadata);
  const organizationName = row.organization.nameZh || row.organization.name;
  const roleLabel = companySourceRoleLabel(row.role);
  const occurredAt = row.publishedAt ?? row.fetchedAt ?? row.createdAt;
  const title = normalizeActivityTitle(row.title);
  const confidence = clampConfidence(row.confidence);

  return {
    id: `company-source:${row.id}`,
    personId: `company:${row.organization.id}`,
    personName: organizationName,
    personAvatarUrl: null,
    personCurrentTitle: `${roleLabel} · 官方公司动态`,
    eventType: 'article',
    sourceType: 'company_source',
    title,
    summary: cleanShortText(row.summary) || `${organizationName} 官方${roleLabel}：${title}`,
    url: row.url,
    occurredAt: occurredAt ? occurredAt.toISOString() : null,
    detectedAt: (row.fetchedAt ?? row.createdAt).toISOString(),
    topics: [],
    organizations: uniqueStrings([row.organization.nameZh || '', row.organization.name]).slice(0, 3),
    confidence,
    reviewStatus: confidence < 0.7 ? 'needs_review' : 'trusted',
    sourceLabel: readString(metadata?.sourceLabel) || '官方公司源',
    importanceReason: `${organizationName} 官方${roleLabel}，适合判断近期产品、研究或合作动向。`,
  };
}

interface ActivityRelationPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  organization: string[];
  topics: string[];
}

function eventTime(event: ActivityEvent): number {
  return new Date(event.occurredAt || event.detectedAt).getTime();
}

function buildSummary(text: string): string | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized === 'null') return null;
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

function buildImportanceReason(input: {
  eventType: ActivityEventType;
  sourceLabel: string;
  topics: string[];
  organizations: string[];
  confidence: number;
  evidenceNote?: string | null;
}): string | null {
  const evidenceNote = cleanShortText(input.evidenceNote);
  if (evidenceNote) return evidenceNote;

  const scope = buildScopeLabel(input.topics, input.organizations);
  const prefix = input.confidence < 0.7 ? '待核线索，' : '';
  const scoped = scope ? `${scope}，` : '';

  switch (input.eventType) {
    case 'paper':
      return `${prefix}${scoped}新论文信号，适合判断研究进展和人物贡献。`;
    case 'github':
      return `${prefix}${scoped}开源项目信号，适合观察工程影响力和社区热度。`;
    case 'video':
      return `${prefix}${scoped}视频或演讲信号，适合了解近期观点和方法论。`;
    case 'podcast':
      return `${prefix}${scoped}播客访谈信号，适合补充人物观点和背景。`;
    case 'role_change':
      return `${prefix}${scoped}履历变化信号，适合关注人物流动和机构变化。`;
    case 'relation_change':
      return `${prefix}${scoped}关系变化信号，适合判断人物、团队和机构之间的连接。`;
    case 'article':
    default:
      return `${prefix}${scoped}${input.sourceLabel} 来源补充了近期人物、机构或产品动向。`;
  }
}

function buildScopeLabel(topics: string[], organizations: string[]): string | null {
  const topic = topics.find(Boolean);
  const organization = organizations.find(Boolean);
  if (topic && organization) return `${topic} / ${organization}`;
  if (topic) return `${topic} 方向`;
  if (organization) return `${organization} 相关`;
  return null;
}

function cleanShortText(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized === 'null') return null;
  return normalized.length > 88 ? `${normalized.slice(0, 85)}...` : normalized;
}

function cleanShortUrl(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized !== 'null' ? normalized : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function readConfidence(metadata: Record<string, unknown> | null): number {
  const value = metadata?.confidence;
  if (typeof value === 'number' && Number.isFinite(value)) return clampConfidence(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return clampConfidence(parsed);
  }
  return 0.8;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeActivityTitle(value: string): string {
  return decodeBasicHtmlEntities(value)
    .replace(/^YouTube\s*字幕[:：]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function reviewStatusFromConfidence(confidence: number): string {
  return confidence < 0.7 ? 'needs_review' : 'auto';
}

function isDefaultPublishableActivity(event: ActivityEvent): boolean {
  return DEFAULT_ACTIVITY_REVIEW_STATUSES.includes(event.reviewStatus)
    && event.confidence >= 0.7
    && isRecommendedActivityTitle(event.title, event.sourceType, event.eventType);
}

function isRecommendedActivity(input: {
  sourceType: string;
  eventType: ActivityEventType;
  title: string;
  confidence: number;
  reviewStatus: string;
  eventMetadata?: Record<string, unknown> | null;
  sourceItemMetadata?: Record<string, unknown> | null;
  sourceItemPublishedAt?: Date | null;
}): boolean {
  if (!DEFAULT_ACTIVITY_REVIEW_STATUSES.includes(input.reviewStatus) || input.confidence < 0.7) {
    return false;
  }

  if (isLowSignalSourceImport(input.eventMetadata, input.sourceItemMetadata, input.sourceItemPublishedAt)) {
    return false;
  }

  return isRecommendedActivityTitle(input.title, input.sourceType, input.eventType);
}

function isHomepageEligibleActivity(event: ActivityEvent): boolean {
  if (!isDefaultPublishableActivity(event)) return false;

  const profile = buildActivitySourceProfile(event);
  const hasEntityBinding = Boolean(
    event.personName
    && (
      cleanShortText(event.personCurrentTitle)
      || event.organizations.length > 0
      || event.topics.length > 0
    )
  );

  if (!hasEntityBinding && profile.tier !== 'company_attribute_source') return false;
  if (event.sourceType === 'github' && !isGithubReleaseUrl(event.url)) return false;
  if (profile.tier === 'discovery_only_source' && event.confidence < 0.82) return false;

  return true;
}

function isRecommendedActivityTitle(title: string, sourceType: string, eventType: ActivityEventType): boolean {
  const normalized = title.trim();
  if (!normalized) return false;

  if (LOW_SIGNAL_TITLE_PATTERNS.some(pattern => pattern.test(normalized))) {
    return false;
  }

  if (eventType === 'video' || sourceType === 'youtube' || sourceType === 'podcast') {
    const lettersAndNumbers = normalized.replace(/[^\p{L}\p{N}]/gu, '');
    return lettersAndNumbers.length >= 12;
  }

  return true;
}

function isLowSignalSourceImport(
  eventMetadata: Record<string, unknown> | null | undefined,
  sourceItemMetadata: Record<string, unknown> | null | undefined,
  sourceItemPublishedAt: Date | null | undefined
): boolean {
  const eventSourceMetadata = asRecord(eventMetadata?.source ?? null);
  const sourceKind = readString(sourceItemMetadata?.sourceKind)
    || readString(eventMetadata?.sourceKind)
    || readString(eventSourceMetadata?.sourceKind);

  return Boolean(sourceKind && LOW_SIGNAL_SOURCE_KINDS.has(sourceKind) && !sourceItemPublishedAt);
}

function mergeActivityEvents(events: ActivityEvent[], limit: number): ActivityEvent[] {
  const seen = new Set<string>();
  const selected: ActivityEvent[] = [];
  const deferredCompanySources: ActivityEvent[] = [];
  const companySourceLimit = maxCompanySourceEvents(limit);
  let companySourceCount = 0;

  events
    .filter(isHomepageEligibleActivity)
    .sort(compareActivityQuality)
    .filter(event => {
      const keys = buildActivityDedupeKeys(event);
      if (keys.some(key => seen.has(key))) return false;
      keys.forEach(key => seen.add(key));
      return true;
    })
    .forEach(event => {
      if (selected.length >= limit) {
        return;
      }

      if (event.sourceType === 'company_source' && companySourceCount >= companySourceLimit) {
        deferredCompanySources.push(event);
        return;
      }

      selected.push(event);
      if (event.sourceType === 'company_source') companySourceCount += 1;
    });

  return [...selected, ...deferredCompanySources].slice(0, limit);
}

function maxCompanySourceEvents(limit: number): number {
  if (limit <= 1) return limit;
  return Math.min(limit, Math.max(2, Math.ceil(limit * 0.6)));
}

function compareActivityQuality(left: ActivityEvent, right: ActivityEvent): number {
  const scoreDelta = activityQualityScore(right) - activityQualityScore(left);
  if (Math.abs(scoreDelta) >= 0.01) return scoreDelta;
  return eventTime(right) - eventTime(left);
}

function activityQualityScore(event: ActivityEvent): number {
  const profile = buildActivitySourceProfile(event);
  const tierScore: Record<ActivitySourceTier, number> = {
    company_attribute_source: 72,
    known_person_event: 62,
    standalone_signal_source: 52,
    media_relay_source: 34,
    discovery_only_source: 22,
  };
  const eventTypeScore: Record<ActivityEventType, number> = {
    github: 12,
    paper: 10,
    role_change: 8,
    article: 6,
    relation_change: 5,
    podcast: 2,
    video: 1,
  };
  const bindingScore = [
    event.personName ? 8 : 0,
    cleanShortText(event.personCurrentTitle) ? 8 : 0,
    event.organizations.length > 0 ? 8 : 0,
    event.topics.length > 0 ? 4 : 0,
  ].reduce((sum, value) => sum + value, 0);
  const confidenceScore = Math.round(clampConfidence(event.confidence) * 10);
  const recencyScore = activityRecencyScore(event);

  return tierScore[profile.tier]
    + eventTypeScore[event.eventType]
    + bindingScore
    + confidenceScore
    + recencyScore
    + profile.adjustment;
}

function activityRecencyScore(event: ActivityEvent): number {
  const ageDays = Math.max(0, (Date.now() - eventTime(event)) / (24 * 60 * 60 * 1000));
  return Math.max(0, 14 - Math.min(14, ageDays * 2));
}

type ActivitySourceTier =
  | 'company_attribute_source'
  | 'known_person_event'
  | 'standalone_signal_source'
  | 'media_relay_source'
  | 'discovery_only_source';

function buildActivitySourceProfile(event: ActivityEvent): {
  tier: ActivitySourceTier;
  adjustment: number;
} {
  const domain = hostnameFromUrl(event.url);
  const xHandle = xHandleFromUrl(event.url);

  if (event.sourceType === 'company_source') {
    return { tier: 'company_attribute_source', adjustment: 10 };
  }

  if (isGithubReleaseUrl(event.url)) {
    return { tier: 'company_attribute_source', adjustment: 8 };
  }

  if (event.sourceType === 'github') {
    return { tier: 'standalone_signal_source', adjustment: -8 };
  }

  if (event.sourceType === 'openalex') {
    return { tier: 'standalone_signal_source', adjustment: 8 };
  }

  if (domain && FIRST_PARTY_DOMAINS.has(domain)) {
    return { tier: 'company_attribute_source', adjustment: 8 };
  }

  if (xHandle && OFFICIAL_X_HANDLES.has(xHandle)) {
    return { tier: 'company_attribute_source', adjustment: -2 };
  }

  if (domain && DISCOVERY_ONLY_DOMAINS.has(domain)) {
    return { tier: 'discovery_only_source', adjustment: -18 };
  }

  if (xHandle) {
    return { tier: 'known_person_event', adjustment: -12 };
  }

  if (domain && MEDIA_RELAY_DOMAINS.has(domain)) {
    return { tier: 'media_relay_source', adjustment: -10 };
  }

  if (event.sourceType === 'youtube' || event.sourceType === 'podcast') {
    return { tier: 'known_person_event', adjustment: -6 };
  }

  if (event.sourceType === 'career' || event.eventType === 'role_change') {
    return { tier: 'known_person_event', adjustment: 4 };
  }

  return { tier: 'standalone_signal_source', adjustment: 0 };
}

function buildActivityDedupeKeys(event: ActivityEvent): string[] {
  const keys = [`id:${event.id}`];
  const canonicalUrl = canonicalActivityUrl(event.url);
  if (canonicalUrl) keys.push(`url:${canonicalUrl}`);

  const day = activityDay(event);
  const signature = activityTitleSignature(event.title);
  if (signature) keys.push(`title:${event.personId}:${event.eventType}:${signature}`);
  if (day && signature) keys.push(`event:${event.personId}:${event.eventType}:${day}:${signature}`);
  if (day) keys.push(`person-source-day:${event.personId}:${event.sourceType}:${day}`);

  return keys;
}

function activityTitleSignature(title: string): string | null {
  const normalized = title
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  if (!normalized) return null;

  const tokens = normalized
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3)
    .filter(token => !TITLE_STOP_WORDS.has(token));

  if (tokens.length === 0) {
    const compact = normalized.replace(/\s+/g, '');
    return compact.length >= 8 ? compact.slice(0, 32) : null;
  }

  return uniqueStrings(tokens).slice(0, 8).join('-');
}

const TITLE_STOP_WORDS = new Set([
  'and',
  'for',
  'from',
  'new',
  'the',
  'with',
  '发布',
  '推出',
  '上线',
  '最新',
]);

function activityDay(event: ActivityEvent): string | null {
  const value = event.occurredAt || event.detectedAt;
  if (!value) return null;
  return value.slice(0, 10);
}

function canonicalActivityUrl(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    const host = normalizeHostname(url.hostname);
    const pathname = url.pathname.replace(/\/+$/, '');
    return `${host}${pathname}`.toLowerCase();
  } catch {
    return null;
  }
}

function hostnameFromUrl(value: string): string | null {
  try {
    return normalizeHostname(new URL(value).hostname);
  } catch {
    return null;
  }
}

function normalizeHostname(value: string): string {
  return value.toLowerCase().replace(/^www\./, '');
}

function xHandleFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const host = normalizeHostname(url.hostname);
    if (host !== 'x.com' && host !== 'twitter.com') return null;
    const handle = url.pathname.split('/').filter(Boolean)[0];
    return handle ? handle.toLowerCase() : null;
  } catch {
    return null;
  }
}

function isGithubReleaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return normalizeHostname(url.hostname) === 'github.com' && /\/releases\/tag\//i.test(url.pathname);
  } catch {
    return false;
  }
}

function relationTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    advisor: '导师',
    advisee: '学生',
    cofounder: '联创',
    colleague: '同事',
    former_colleague: '前同事',
    collaborator: '合作',
    successor: '前后任',
  };
  return labels[value] || value;
}

function companySourceRoleLabel(value: string): string {
  const labels: Record<string, string> = {
    official_strategy: '战略动态',
    product_release: '产品发布',
    financial_signal: '融资/财务',
    partnership_signal: '合作动态',
    hiring_team_signal: '团队动态',
    technical_thread_link: '技术动态',
  };
  return labels[value] || '公司动态';
}

function normalizeEventType(value: string): ActivityEventType {
  const allowed = new Set<ActivityEventType>(['paper', 'github', 'video', 'article', 'podcast', 'role_change', 'relation_change']);
  return allowed.has(value as ActivityEventType) ? value as ActivityEventType : 'article';
}

function isMissingActivityEventStore(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && ['P2021', 'P2022'].includes(error.code);
}

function isMissingCompanySourceStore(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && ['P2021', 'P2022'].includes(error.code);
}

async function hasActivityEventStore(): Promise<boolean> {
  activityEventStoreAvailability ||= prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT
      to_regclass('public."ActivityEvent"') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ActivityEvent'
          AND column_name = 'reviewStatus'
      ) AS "exists"
  `.then(result => Boolean(result[0]?.exists));

  return activityEventStoreAvailability;
}
