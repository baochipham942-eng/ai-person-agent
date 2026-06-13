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
}

const ACTIVITY_SOURCE_TYPES = ['openalex', 'github', 'youtube', 'exa', 'podcast', 'career'];
const DEFAULT_ACTIVITY_REVIEW_STATUSES = ['auto', 'confirmed', 'trusted'];

const SOURCE_TYPE_LABELS: Record<string, { eventType: ActivityEventType; sourceLabel: string }> = {
  openalex: { eventType: 'paper', sourceLabel: 'OpenAlex' },
  github: { eventType: 'github', sourceLabel: 'GitHub' },
  youtube: { eventType: 'video', sourceLabel: 'YouTube' },
  exa: { eventType: 'article', sourceLabel: 'Web' },
  podcast: { eventType: 'podcast', sourceLabel: 'Podcast' },
  career: { eventType: 'role_change', sourceLabel: 'Career' },
  relation: { eventType: 'relation_change', sourceLabel: '关系证据' },
};

let activityEventStoreAvailability: Promise<boolean> | null = null;

export async function fetchActivityEvents(params: FetchActivityParams = {}): Promise<ActivityEvent[]> {
  const limit = Math.min(Math.max(params.limit ?? 12, 1), 48);
  const days = Math.min(Math.max(params.days ?? 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const persistedEvents = await fetchPersistedActivityEvents(params, since, limit).catch(error => {
    if (isMissingActivityEventStore(error)) return null;
    throw error;
  });

  const relationEvents = await fetchRelationActivityEvents(params, since, limit);

  if (persistedEvents && persistedEvents.length > 0) {
    return mergeActivityEvents([...persistedEvents, ...relationEvents], limit);
  }

  const rawEvents = await fetchRawPoolActivityEvents(params, since, limit);
  return mergeActivityEvents([...rawEvents, ...relationEvents], limit);
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
      person: {
        select: {
          name: true,
          avatarUrl: true,
          currentTitle: true,
        },
      },
    },
    orderBy: [{ occurredAt: 'desc' }, { detectedAt: 'desc' }],
    take: limit,
  });

  return rows
    .map(row => ({
      id: row.id,
      personId: row.personId,
      personName: row.person.name,
      personAvatarUrl: row.person.avatarUrl,
      personCurrentTitle: row.person.currentTitle,
      eventType: normalizeEventType(row.eventType),
      sourceType: row.sourceType,
      title: row.title,
      summary: row.summary,
      url: row.url,
      occurredAt: row.occurredAt ? row.occurredAt.toISOString() : null,
      detectedAt: row.detectedAt.toISOString(),
      topics: normalizeDirectoryTopics(row.topics),
      organizations: row.organizations,
      confidence: clampConfidence(row.confidence),
      reviewStatus: row.reviewStatus || reviewStatusFromConfidence(row.confidence),
      sourceLabel: SOURCE_TYPE_LABELS[row.sourceType]?.sourceLabel || row.sourceType,
      importanceReason: buildImportanceReason({
        eventType: normalizeEventType(row.eventType),
        sourceLabel: SOURCE_TYPE_LABELS[row.sourceType]?.sourceLabel || row.sourceType,
        topics: normalizeDirectoryTopics(row.topics),
        organizations: row.organizations,
        confidence: clampConfidence(row.confidence),
        evidenceNote: row.evidenceNote,
      }),
    }))
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
    take: limit * 3,
  });

  return rows
    .map(row => toActivityEvent(row))
    .filter((event): event is ActivityEvent => Boolean(event))
    .filter(isDefaultPublishableActivity)
    .sort((left, right) => eventTime(right) - eventTime(left))
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

  return {
    id: row.id,
    personId: row.person.id,
    personName: row.person.name,
    personAvatarUrl: row.person.avatarUrl,
    personCurrentTitle: row.person.currentTitle,
    eventType: sourceConfig.eventType,
    sourceType: row.sourceType,
    title: row.title,
    summary: buildSummary(row.text),
    url: row.url,
    occurredAt: occurredAt ? occurredAt.toISOString() : null,
    detectedAt: row.fetchedAt.toISOString(),
    topics,
    organizations: uniqueStrings(row.person.organization).slice(0, 3),
    confidence: readConfidence(metadata),
    reviewStatus: reviewStatusFromConfidence(readConfidence(metadata)),
    sourceLabel: sourceConfig.sourceLabel,
    importanceReason: buildImportanceReason({
      eventType: sourceConfig.eventType,
      sourceLabel: sourceConfig.sourceLabel,
      topics,
      organizations: uniqueStrings(row.person.organization).slice(0, 3),
      confidence: readConfidence(metadata),
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

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
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

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function reviewStatusFromConfidence(confidence: number): string {
  return confidence < 0.7 ? 'needs_review' : 'auto';
}

function isDefaultPublishableActivity(event: ActivityEvent): boolean {
  return DEFAULT_ACTIVITY_REVIEW_STATUSES.includes(event.reviewStatus) && event.confidence >= 0.7;
}

function mergeActivityEvents(events: ActivityEvent[], limit: number): ActivityEvent[] {
  const seen = new Set<string>();
  return events
    .filter(isDefaultPublishableActivity)
    .sort((left, right) => eventTime(right) - eventTime(left))
    .filter(event => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .slice(0, limit);
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

function normalizeEventType(value: string): ActivityEventType {
  const allowed = new Set<ActivityEventType>(['paper', 'github', 'video', 'article', 'podcast', 'role_change', 'relation_change']);
  return allowed.has(value as ActivityEventType) ? value as ActivityEventType : 'article';
}

function isMissingActivityEventStore(error: unknown): boolean {
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
