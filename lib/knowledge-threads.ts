import { prisma } from '@/lib/db/prisma';
import {
  getKnowledgeThreadFixture as getStaticKnowledgeThreadFixture,
} from '@/lib/knowledge-thread-fixtures/loop-engineering';
import type {
  KnowledgeSourceRole,
  KnowledgeThreadFixture,
  KnowledgeThreadSource,
} from '@/lib/knowledge-thread-fixtures/loop-engineering';

const REQUIRED_ROLES = [
  'signal',
  'official_definition',
  'transcript_context',
  'paper_foundation',
  'implementation_signal',
] as const;

let knowledgeThreadStoreReadyPromise: Promise<boolean> | null = null;

export type KnowledgeThreadSourceRole = typeof REQUIRED_ROLES[number] | string;

export interface KnowledgeThreadReadModel {
  thread: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    whyNow: string | null;
    status: string;
    priorityScore: number;
    confidence: number;
    category: string | null;
    tags: string[];
    aliases: string[];
    refreshCadenceDays: number;
    lastReviewedAt: Date | null;
    updatedAt: Date;
    isFixture: boolean;
  };
  sources: KnowledgeThreadReadSource[];
  edges: KnowledgeThreadReadEdge[];
  coverage: {
    roles: string[];
    missingRequiredRoles: string[];
    sourceCount: number;
    edgeCount: number;
  };
}

export interface KnowledgeThreadReadSource {
  id: string;
  sourceId: string | null;
  rawPoolItemId: string | null;
  role: KnowledgeThreadSourceRole;
  sourceKind: string;
  sourceOwner: string | null;
  title: string;
  url: string;
  urlHash: string | null;
  text: string;
  publishedAt: Date | null;
  fetchedAt: Date | null;
  relevanceScore: number;
  sourceWeight: number;
  evidenceQuote: string | null;
  summary: string | null;
  metadata: unknown;
}

export interface KnowledgeThreadReadEdge {
  id: string;
  fromSourceId: string;
  toSourceId: string;
  relationType: string;
  confidence: number;
  evidenceNote: string | null;
  createdAt: Date;
  fromTitle: string;
  toTitle: string;
}

interface FetchKnowledgeThreadOptions {
  allowFixtureFallback?: boolean;
}

export async function fetchKnowledgeThread(
  slug: string,
  options: FetchKnowledgeThreadOptions = {},
): Promise<KnowledgeThreadReadModel | null> {
  const allowFixtureFallback = options.allowFixtureFallback ?? true;
  const normalizedSlug = normalizeSlug(slug);
  let thread: Awaited<ReturnType<typeof findKnowledgeThreadBySlug>>;

  try {
    if (allowFixtureFallback && !(await hasKnowledgeThreadStore())) {
      return getKnowledgeThreadFixture(normalizedSlug);
    }
    thread = await findKnowledgeThreadBySlug(normalizedSlug);
  } catch (error) {
    if (allowFixtureFallback && isMissingKnowledgeThreadStoreError(error)) {
      return getKnowledgeThreadFixture(normalizedSlug);
    }
    throw error;
  }

  if (!thread) {
    return allowFixtureFallback ? getKnowledgeThreadFixture(normalizedSlug) : null;
  }

  const sources = thread.sources.map(source => {
    const canonicalSource = source.source;
    const rawPoolItem = source.rawPoolItem;

    return {
      id: canonicalSource?.id ?? rawPoolItem?.id ?? source.id,
      sourceId: source.sourceId,
      rawPoolItemId: source.rawPoolItemId,
      role: source.role,
      sourceKind: canonicalSource?.sourceKind ?? rawPoolItem?.sourceType ?? 'unknown',
      sourceOwner: canonicalSource?.sourceOwner ?? null,
      title: canonicalSource?.title ?? rawPoolItem?.title ?? 'Untitled source',
      url: canonicalSource?.url ?? rawPoolItem?.url ?? '',
      urlHash: canonicalSource?.urlHash ?? rawPoolItem?.urlHash ?? null,
      text: canonicalSource?.text ?? rawPoolItem?.text ?? '',
      publishedAt: canonicalSource?.publishedAt ?? rawPoolItem?.publishedAt ?? null,
      fetchedAt: canonicalSource?.fetchedAt ?? rawPoolItem?.fetchedAt ?? null,
      relevanceScore: source.relevanceScore,
      sourceWeight: source.sourceWeight,
      evidenceQuote: source.evidenceQuote,
      summary: source.summary,
      metadata: mergeMetadata(canonicalSource?.metadata, source.metadata),
    };
  });

  return buildReadModel({
    thread: {
      id: thread.id,
      slug: thread.slug,
      title: thread.title,
      summary: thread.summary,
      whyNow: thread.whyNow,
      status: thread.status,
      priorityScore: thread.priorityScore,
      confidence: thread.confidence,
      category: thread.category,
      tags: thread.tags,
      aliases: thread.aliases,
      refreshCadenceDays: thread.refreshCadenceDays,
      lastReviewedAt: thread.lastReviewedAt,
      updatedAt: thread.updatedAt,
      isFixture: false,
    },
    sources,
    edges: thread.edges.map(edge => ({
      id: edge.id,
      fromSourceId: edge.fromSourceId,
      toSourceId: edge.toSourceId,
      relationType: edge.relationType,
      confidence: edge.confidence,
      evidenceNote: edge.evidenceNote,
      createdAt: edge.createdAt,
      fromTitle: edge.fromSource.title,
      toTitle: edge.toSource.title,
    })),
  });
}

export async function fetchKnowledgeThreadPage(slug: string): Promise<KnowledgeThreadFixture | null> {
  const readModel = await fetchKnowledgeThread(slug, { allowFixtureFallback: true });
  if (!readModel) return null;

  const fixture = getStaticKnowledgeThreadFixture(readModel.thread.slug);
  if (readModel.thread.isFixture) return fixture ?? readModelToFixture(readModel);
  if (fixture) return mergeReadModelWithFixture(readModel, fixture);
  return readModelToFixture(readModel);
}

function findKnowledgeThreadBySlug(slug: string) {
  return prisma.knowledgeThread.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      whyNow: true,
      status: true,
      priorityScore: true,
      confidence: true,
      category: true,
      tags: true,
      aliases: true,
      refreshCadenceDays: true,
      lastReviewedAt: true,
      updatedAt: true,
      sources: {
        orderBy: [
          { relevanceScore: 'desc' },
          { createdAt: 'asc' },
        ],
        select: {
          id: true,
          sourceId: true,
          rawPoolItemId: true,
          role: true,
          relevanceScore: true,
          sourceWeight: true,
          evidenceQuote: true,
          summary: true,
          metadata: true,
          source: {
            select: {
              id: true,
              sourceKind: true,
              sourceOwner: true,
              title: true,
              url: true,
              urlHash: true,
              text: true,
              publishedAt: true,
              fetchedAt: true,
              metadata: true,
            },
          },
          rawPoolItem: {
            select: {
              id: true,
              sourceType: true,
              title: true,
              url: true,
              urlHash: true,
              text: true,
              publishedAt: true,
              fetchedAt: true,
              metadata: true,
            },
          },
        },
      },
      edges: {
        orderBy: [
          { confidence: 'desc' },
          { createdAt: 'asc' },
        ],
        select: {
          id: true,
          fromSourceId: true,
          toSourceId: true,
          relationType: true,
          confidence: true,
          evidenceNote: true,
          createdAt: true,
          fromSource: {
            select: {
              title: true,
            },
          },
          toSource: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });
}

async function hasKnowledgeThreadStore(): Promise<boolean> {
  knowledgeThreadStoreReadyPromise ??= prisma.$queryRaw<Array<{ ready: boolean }>>`
    SELECT
      to_regclass('public."KnowledgeThread"') IS NOT NULL
      AND to_regclass('public."KnowledgeSource"') IS NOT NULL
      AND to_regclass('public."KnowledgeThreadSource"') IS NOT NULL
      AND to_regclass('public."KnowledgeThreadEdge"') IS NOT NULL
      AS ready
  `
    .then(rows => Boolean(rows[0]?.ready))
    .catch(error => {
      if (isMissingKnowledgeThreadStoreError(error)) return false;
      throw error;
    });

  return knowledgeThreadStoreReadyPromise;
}

function buildReadModel({
  thread,
  sources,
  edges,
}: Omit<KnowledgeThreadReadModel, 'coverage'>): KnowledgeThreadReadModel {
  const roles = Array.from(new Set(sources.map(source => source.role))).sort();
  const missingRequiredRoles = REQUIRED_ROLES.filter(role => !roles.includes(role));

  return {
    thread,
    sources,
    edges,
    coverage: {
      roles,
      missingRequiredRoles,
      sourceCount: sources.length,
      edgeCount: edges.length,
    },
  };
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function mergeMetadata(sourceMetadata: unknown, linkMetadata: unknown): unknown {
  if (!isRecord(sourceMetadata)) return linkMetadata ?? sourceMetadata ?? null;
  if (!isRecord(linkMetadata)) return sourceMetadata;
  return {
    ...sourceMetadata,
    threadLink: linkMetadata,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissingKnowledgeThreadStoreError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const code = typeof error.code === 'string' ? error.code : '';
  const message = typeof error.message === 'string' ? error.message : '';
  return code === 'P2021'
    || message.includes('KnowledgeThread')
    || message.includes('KnowledgeSource')
    || message.includes('KnowledgeThreadSource')
    || message.includes('KnowledgeThreadEdge');
}

function mergeReadModelWithFixture(
  readModel: KnowledgeThreadReadModel,
  fixture: KnowledgeThreadFixture,
): KnowledgeThreadFixture {
  return {
    ...fixture,
    title: readModel.thread.title || fixture.title,
    summary: readModel.thread.summary || fixture.summary,
    whyNow: readModel.thread.whyNow || fixture.whyNow,
    confidence: readModel.thread.confidence || fixture.confidence,
    lastReviewedAt: dateToIsoDay(readModel.thread.lastReviewedAt || readModel.thread.updatedAt),
    status: readModel.thread.status as KnowledgeThreadFixture['status'],
    sources: readModel.sources.map(sourceToPageSource),
    edges: readModel.edges.map(edge => ({
      id: edge.id,
      fromSourceId: edge.fromSourceId,
      toSourceId: edge.toSourceId,
      relationType: edge.relationType,
      confidence: edge.confidence,
      evidenceNote: edge.evidenceNote || '',
    })),
  };
}

function readModelToFixture(readModel: KnowledgeThreadReadModel): KnowledgeThreadFixture {
  return {
    slug: readModel.thread.slug,
    title: readModel.thread.title,
    summary: readModel.thread.summary,
    whyNow: readModel.thread.whyNow || '',
    confidence: readModel.thread.confidence,
    lastReviewedAt: dateToIsoDay(readModel.thread.lastReviewedAt || readModel.thread.updatedAt),
    status: readModel.thread.status as KnowledgeThreadFixture['status'],
    readinessNote: readModel.coverage.missingRequiredRoles.length
      ? `Missing roles: ${readModel.coverage.missingRequiredRoles.join(', ')}`
      : 'Knowledge sources cover the required evidence roles.',
    definition: readModel.thread.summary,
    boundary: '公司财报和 IR 材料只作为公司页背景，不计入技术主题页 ready。',
    requiredRoles: [...REQUIRED_ROLES],
    sources: readModel.sources.map(sourceToPageSource),
    timeline: [],
    edges: readModel.edges.map(edge => ({
      id: edge.id,
      fromSourceId: edge.fromSourceId,
      toSourceId: edge.toSourceId,
      relationType: edge.relationType,
      confidence: edge.confidence,
      evidenceNote: edge.evidenceNote || '',
    })),
    actions: [],
    relatedLinks: [],
  };
}

function sourceToPageSource(source: KnowledgeThreadReadSource): KnowledgeThreadSource {
  const metadata = isRecord(source.metadata) ? source.metadata : {};
  const threadLink = isRecord(metadata.threadLink) ? metadata.threadLink : {};
  return {
    id: source.id,
    role: source.role as KnowledgeSourceRole,
    sourceKind: source.sourceKind,
    title: source.title,
    owner: source.sourceOwner || ownerFromUrl(source.url) || 'Unknown',
    url: source.url || undefined,
    publishedAt: source.publishedAt ? dateToIsoDay(source.publishedAt) : undefined,
    summary: source.summary || firstText(source.text, 180),
    evidenceNote: stringValue(threadLink.whyRelevant)
      || stringValue(threadLink.reviewNotes)
      || source.summary
      || firstText(source.text, 180),
    evidenceQuote: source.evidenceQuote || undefined,
    confidence: source.relevanceScore,
    status: normalizedSourceStatus(threadLink.status),
  };
}

function normalizedSourceStatus(value: unknown): KnowledgeThreadSource['status'] {
  if (value === 'verified' || value === 'usable' || value === 'needs_capture' || value === 'thin') return value;
  return 'verified';
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function firstText(value: string, length: number): string {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length <= length ? text : `${text.slice(0, length - 1)}...`;
}

function ownerFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function dateToIsoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getKnowledgeThreadFixture(slug: string): KnowledgeThreadReadModel | null {
  const fixture = getStaticKnowledgeThreadFixture(slug);
  if (!fixture) return null;

  return fixtureToReadModel(fixture);
}

function fixtureToReadModel(fixture: KnowledgeThreadFixture): KnowledgeThreadReadModel {
  const updatedAt = new Date(`${fixture.lastReviewedAt}T00:00:00.000Z`);
  const sourceById = new Map(fixture.sources.map(source => [source.id, source]));
  const sources = fixture.sources.map(source => ({
    id: `fixture-thread-source-${source.id}`,
    sourceId: source.id,
    rawPoolItemId: null,
    role: source.role,
    sourceKind: source.sourceKind,
    sourceOwner: source.owner,
    title: source.title,
    url: source.url ?? '',
    urlHash: `fixture:${fixture.slug}:${source.id}`,
    text: [source.summary, source.evidenceNote, source.evidenceQuote].filter(Boolean).join('\n\n'),
    publishedAt: source.publishedAt ? new Date(`${source.publishedAt}T00:00:00.000Z`) : null,
    fetchedAt: updatedAt,
    relevanceScore: source.confidence,
    sourceWeight: source.role === 'official_definition' ? 1 : 0.8,
    evidenceQuote: source.evidenceQuote ?? null,
    summary: source.summary,
    metadata: {
      fixture: true,
      status: source.status,
      evidenceNote: source.evidenceNote,
    },
  }));

  return buildReadModel({
    thread: {
      id: `fixture-thread-${fixture.slug}`,
      slug: fixture.slug,
      title: fixture.title,
      summary: fixture.summary,
      whyNow: fixture.whyNow,
      status: fixture.status,
      priorityScore: 0.8,
      confidence: fixture.confidence,
      category: 'agentic_coding',
      tags: ['coding_agents', 'workflow', 'claude_code'],
      aliases: ['coding loop', 'agentic coding workflow'],
      refreshCadenceDays: 14,
      lastReviewedAt: updatedAt,
      updatedAt,
      isFixture: true,
    },
    sources,
    edges: fixture.edges.map(edge => ({
      id: edge.id,
      fromSourceId: edge.fromSourceId,
      toSourceId: edge.toSourceId,
      relationType: edge.relationType,
      confidence: edge.confidence,
      evidenceNote: edge.evidenceNote,
      createdAt: updatedAt,
      fromTitle: sourceById.get(edge.fromSourceId)?.title ?? edge.fromSourceId,
      toTitle: sourceById.get(edge.toSourceId)?.title ?? edge.toSourceId,
    })),
  });
}
