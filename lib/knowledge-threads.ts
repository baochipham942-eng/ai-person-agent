import { prisma } from '@/lib/db/prisma';
import {
  getKnowledgeThreadFixture as getStaticKnowledgeThreadFixture,
} from '@/lib/knowledge-thread-fixtures/loop-engineering';
import type {
  KnowledgeActionKind,
  KnowledgeLinkKind,
  KnowledgeThreadPaperEvidenceClaim,
  KnowledgeSourceRole,
  KnowledgeThreadPaperEvidenceChain,
  KnowledgeThreadFixture,
  KnowledgeThreadSource,
  KnowledgeThreadStatus,
} from '@/lib/knowledge-thread-fixtures/loop-engineering';
import { workTypeLabel } from '@/lib/work-taxonomy';
import agenticCodingSourcePack from '@/data/knowledge-threads/agentic-coding-sources.candidates.json';
import aiEvalsSourcePack from '@/data/knowledge-threads/ai-evals-sources.candidates.json';
import contextEngineeringSourcePack from '@/data/knowledge-threads/context-engineering-sources.candidates.json';
import mcpSourcePack from '@/data/knowledge-threads/mcp-sources.candidates.json';
import multiAgentOrchestrationSourcePack from '@/data/knowledge-threads/multi-agent-orchestration-sources.candidates.json';
import agentSkillsSourcePack from '@/data/knowledge-threads/agent-skills-sources.candidates.json';
import agentMemorySourcePack from '@/data/knowledge-threads/agent-memory-sources.candidates.json';
import reasoningModelsSourcePack from '@/data/knowledge-threads/reasoning-models-sources.candidates.json';
import agentSecuritySourcePack from '@/data/knowledge-threads/agent-security-sources.candidates.json';
import computerUseSourcePack from '@/data/knowledge-threads/computer-use-sources.candidates.json';
import generativeUiSourcePack from '@/data/knowledge-threads/generative-ui-sources.candidates.json';
import ragSourcePack from '@/data/knowledge-threads/rag-sources.candidates.json';
import deepResearchSourcePack from '@/data/knowledge-threads/deep-research-sources.candidates.json';
import modelTrainingSourcePack from '@/data/knowledge-threads/model-training-sources.candidates.json';
import selfEvolvingSourcePack from '@/data/knowledge-threads/self-evolving-agents-sources.candidates.json';
import worldModelsSourcePack from '@/data/knowledge-threads/world-models-sources.candidates.json';
import embodiedAiSourcePack from '@/data/knowledge-threads/embodied-ai-sources.candidates.json';
import harnessEngineeringSourcePack from '@/data/knowledge-threads/harness-engineering-sources.candidates.json';
import autonomousDrivingSourcePack from '@/data/knowledge-threads/autonomous-driving-sources.candidates.json';

const REQUIRED_ROLES = [
  'signal',
  'official_definition',
  'transcript_context',
  'paper_foundation',
  'implementation_signal',
] as const;
const PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES = ['auto', 'confirmed'];
const PAPER_REFERENCE_CACHE_VERSION = 'paper-references-v3';
type KnowledgeThreadPaperReferenceItem = NonNullable<KnowledgeThreadSource['paperReferenceEvidence']>['items'][number];
type PaperClaimSectionType = KnowledgeThreadPaperEvidenceClaim['sectionType'];
type PaperAnchorSectionType = PaperClaimSectionType | 'abstract';
interface PaperClaimField {
  key: string;
  label: string;
  sectionType: PaperClaimSectionType;
  hash: string;
  anchorSectionTypes: PaperAnchorSectionType[];
  matchingHints: string[];
}
interface PaperClaimGrounding {
  pageNumber: number | null;
  sectionTitle: string | null;
  sectionAnchor: string | null;
  chunkIndex: number | null;
  sourceQuote: string | null;
}
interface PaperClaimGroundingChunk {
  chunkIndex: number;
  pageNumber: number | null;
  text: string;
}
interface PaperClaimGroundingSection {
  id: string;
  sectionType: string;
  title: string;
  pageStart: number | null;
  chunks: PaperClaimGroundingChunk[];
}
interface PaperClaimGroundingCandidate {
  section: PaperClaimGroundingSection;
  chunk: PaperClaimGroundingChunk | null;
}
type PaperClaimGroundingMap = Map<string, Map<string, PaperClaimGrounding>>;

const PAPER_CLAIM_FIELDS: PaperClaimField[] = [
  {
    key: 'novelty',
    label: '新意',
    sectionType: 'result',
    hash: '#paper-guide-novelty',
    anchorSectionTypes: ['result', 'method'],
    matchingHints: ['late interaction', 'novelty', 'contribution', 'efficiency', 'contextualization', 'reconcile', 'BERT'],
  },
  {
    key: 'method',
    label: '方法',
    sectionType: 'method',
    hash: '#paper-guide-method',
    anchorSectionTypes: ['method'],
    matchingHints: ['method', 'architecture', 'BERT', 'MaxSim', 'query', 'document', 'relevance', 'encode', 'index'],
  },
  {
    key: 'experiments',
    label: '实验',
    sectionType: 'experiment',
    hash: '#paper-guide-experiments',
    anchorSectionTypes: ['experiment', 'result'],
    matchingHints: ['experiment', 'evaluation', 'results', 'MRR', 'latency', 'benchmark', 'dataset', 'ablation'],
  },
  {
    key: 'limitations',
    label: '局限',
    sectionType: 'limitation',
    hash: '#paper-guide-limitations',
    anchorSectionTypes: ['limitation'],
    matchingHints: ['limitation', 'future work', 'leave', 'cost', 'memory', 'storage', 'scales'],
  },
  {
    key: 'problem',
    label: '问题',
    sectionType: 'problem',
    hash: '#paper-guide-problem',
    anchorSectionTypes: ['problem', 'abstract'],
    matchingHints: ['problem', 'motivation', 'traditional', 'all-to-all', 'interaction', 'expensive', 'latency', 'query', 'document'],
  },
];

const SOURCE_PACK_FIXTURES: SourcePackFixture[] = [
  agenticCodingSourcePack as SourcePackFixture,
  aiEvalsSourcePack as SourcePackFixture,
  contextEngineeringSourcePack as SourcePackFixture,
  mcpSourcePack as SourcePackFixture,
  multiAgentOrchestrationSourcePack as unknown as SourcePackFixture,
  agentSkillsSourcePack as unknown as SourcePackFixture,
  agentMemorySourcePack as unknown as SourcePackFixture,
  reasoningModelsSourcePack as unknown as SourcePackFixture,
  agentSecuritySourcePack as unknown as SourcePackFixture,
  computerUseSourcePack as unknown as SourcePackFixture,
  generativeUiSourcePack as unknown as SourcePackFixture,
  ragSourcePack as unknown as SourcePackFixture,
  deepResearchSourcePack as unknown as SourcePackFixture,
  modelTrainingSourcePack as unknown as SourcePackFixture,
  selfEvolvingSourcePack as unknown as SourcePackFixture,
  worldModelsSourcePack as unknown as SourcePackFixture,
  embodiedAiSourcePack as unknown as SourcePackFixture,
  harnessEngineeringSourcePack as unknown as SourcePackFixture,
  autonomousDrivingSourcePack as unknown as SourcePackFixture,
];

let knowledgeThreadStoreReadyPromise: Promise<boolean> | null = null;

/** source-pack 主题的 slug（注册表派生，落库/校验脚本复用，避免漂移） */
export const SOURCE_PACK_SLUGS: string[] = SOURCE_PACK_FIXTURES.map(p => p.thread.slug);

/** 返回 source-pack 原始数据（落库脚本复用，保证与站点渲染同一份数据） */
export function getSourcePacks(): SourcePackFixture[] {
  return SOURCE_PACK_FIXTURES;
}

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

interface SourcePackEdge {
  id?: string;
  fromId?: string;
  toId?: string;
  fromSourceId?: string;
  toSourceId?: string;
  relationType: string;
  confidence?: unknown;
  evidenceNote?: string;
}

// 多个 source pack JSON 字段不完全一致（有的带 metadata/text，有的没有）。
// 用一个宽松类型注解 SOURCE_PACK_FIXTURES，避免 TS 把它们推断成互斥的字面量 union。
interface SourcePackSource {
  id: string;
  role: string;
  sourceKind?: string;
  title?: string;
  sourceOwner?: string;
  url: string;
  publishedAt?: string;
  whyRelevant?: string;
  reviewNotes?: string;
  evidenceQuote?: string;
  confidence?: unknown;
  status?: string;
  text?: string;
  textStatus?: string;
  urlHash?: string;
  metadata?: { role?: string } & Record<string, unknown>;
}

interface SourcePackFixture {
  thread: {
    slug: string;
    title: string;
    definitionDraft: string;
    whyNow: string;
    updatedAt: string;
    status: string;
    useBoundary: string;
    [key: string]: unknown;
  };
  sourceRequirements: { requiredRoles: string[] };
  sources: SourcePackSource[];
  edges: SourcePackEdge[];
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
      metadata: mergeSourceMetadata(canonicalSource?.metadata, rawPoolItem?.metadata, source.metadata),
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
  const paperEvidenceChain = readModel.thread.isFixture ? undefined : await buildKnowledgeThreadPaperEvidenceChain(readModel);
  if (readModel.thread.isFixture) {
    return fixture ?? getSourcePackFixture(readModel.thread.slug) ?? readModelToFixture(readModel);
  }
  if (fixture) return mergeReadModelWithFixture(readModel, fixture, paperEvidenceChain);
  return readModelToFixture(readModel, paperEvidenceChain);
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
  // 自动挂载的来源若仍处于待复核，继续展示为线索，但不计入 required-role 覆盖。
  const roles = Array.from(new Set(sources.filter(isKnowledgeThreadReadSourceReady).map(source => source.role))).sort();
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

function mergeSourceMetadata(sourceMetadata: unknown, rawPoolItemMetadata: unknown, linkMetadata: unknown): unknown {
  const sourceRecord = isRecord(sourceMetadata) ? sourceMetadata : {};
  const rawRecord = isRecord(rawPoolItemMetadata) ? rawPoolItemMetadata : {};
  const linkRecord = isRecord(linkMetadata) ? linkMetadata : {};
  if (
    Object.keys(sourceRecord).length === 0
    && Object.keys(rawRecord).length === 0
    && Object.keys(linkRecord).length === 0
  ) {
    return linkMetadata ?? rawPoolItemMetadata ?? sourceMetadata ?? null;
  }
  return {
    ...sourceRecord,
    ...rawRecord,
    threadLink: linkRecord,
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

function isMissingProductEvidenceSourceStoreError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const code = typeof error.code === 'string' ? error.code : '';
  const message = typeof error.message === 'string' ? error.message : '';
  return code === 'P2021'
    || code === 'P2022'
    || message.includes('ProductEvidenceSource');
}

function isMissingPaperDocumentStoreError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const code = typeof error.code === 'string' ? error.code : '';
  const message = typeof error.message === 'string' ? error.message : '';
  return code === 'P2021'
    || code === 'P2022'
    || message.includes('PaperDocument')
    || message.includes('PaperSection')
    || message.includes('PaperChunk');
}

function mergeReadModelWithFixture(
  readModel: KnowledgeThreadReadModel,
  fixture: KnowledgeThreadFixture,
  paperEvidenceChain?: KnowledgeThreadPaperEvidenceChain,
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
    paperEvidenceChain,
  };
}

function readModelToFixture(
  readModel: KnowledgeThreadReadModel,
  paperEvidenceChain?: KnowledgeThreadPaperEvidenceChain,
): KnowledgeThreadFixture {
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
    paperEvidenceChain,
  };
}

async function buildKnowledgeThreadPaperEvidenceChain(
  readModel: KnowledgeThreadReadModel,
): Promise<KnowledgeThreadPaperEvidenceChain | undefined> {
  const paperSources = readModel.sources
    .filter(source => source.role === 'paper_foundation' && source.rawPoolItemId)
    .sort((left, right) => right.relevanceScore - left.relevanceScore);
  if (paperSources.length === 0) return undefined;

  const readyPaperSources = paperSources.filter(isKnowledgeThreadReadSourceReady);
  const reviewPaperSources = paperSources.filter(source => !isKnowledgeThreadReadSourceReady(source));
  const visibleReadyPaperSources = readyPaperSources.slice(0, 8);
  const claimGroundings = await loadPaperClaimGroundings(visibleReadyPaperSources);
  const toPaperEvidence = (source: KnowledgeThreadReadSource, includeClaims: boolean) => {
    const status = knowledgeThreadSourceStatus(isRecord(source.metadata) ? source.metadata : {});
    const grounding = source.rawPoolItemId ? claimGroundings.get(source.rawPoolItemId) : undefined;
    return {
      id: source.rawPoolItemId!,
      sourceId: source.id,
      title: source.title,
      href: `/source/paper/${source.rawPoolItemId}`,
      externalUrl: source.url || undefined,
      sourceKind: source.sourceKind,
      summary: source.summary || firstText(source.text, 180),
      evidenceQuote: source.evidenceQuote || undefined,
      confidence: source.relevanceScore,
      status,
      reviewReason: paperThreadReviewReason(source.metadata),
      claims: includeClaims ? buildPaperClaimCitations(source, grounding) : [],
    };
  };
  const papers = visibleReadyPaperSources.map(source => toPaperEvidence(source, true));
  const reviewPapers = reviewPaperSources.slice(0, 8).map(source => toPaperEvidence(source, false));
  const paperIds = papers.map(paper => paper.id);
  const contextSources = readModel.sources
    .filter(source => (
      (source.role === 'official_definition' || source.role === 'transcript_context' || source.role === 'signal')
      && isKnowledgeThreadReadSourceReady(source)
    ))
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, 6)
    .map(sourceToPageSource);

  const { works, implementations: productImplementations } = await listProductEvidenceForThreadPapers(paperIds);
  const threadImplementations = buildThreadImplementationSignalEvidence(readModel);
  return {
    papers,
    reviewPapers,
    works,
    implementations: mergePaperEvidenceImplementations(productImplementations, threadImplementations),
    contextSources,
  };
}

async function loadPaperClaimGroundings(sources: KnowledgeThreadReadSource[]): Promise<PaperClaimGroundingMap> {
  const sourcesById = new Map(sources.flatMap(source => (
    source.rawPoolItemId ? [[source.rawPoolItemId, source]] : []
  )));
  const sourceItemIds = [...sourcesById.keys()];
  if (sourceItemIds.length === 0) return new Map();
  try {
    const documents = await prisma.paperDocument.findMany({
      where: { sourceItemId: { in: sourceItemIds } },
      select: {
        sourceItemId: true,
        sections: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            sectionType: true,
            title: true,
            pageStart: true,
            chunks: {
              orderBy: { chunkIndex: 'asc' },
              select: {
                chunkIndex: true,
                pageNumber: true,
                text: true,
              },
            },
          },
        },
      },
    });
    const result: PaperClaimGroundingMap = new Map();
    for (const document of documents) {
      if (!document.sourceItemId) continue;
      const source = sourcesById.get(document.sourceItemId);
      if (!source) continue;
      const byClaim = new Map<string, PaperClaimGrounding>();
      for (const field of PAPER_CLAIM_FIELDS) {
        const body = paperGuideClaimBody(source, field.key);
        if (!isUsefulPaperClaim(body)) continue;
        const grounded = selectBestPaperClaimGrounding(field, body, document.sections);
        if (!grounded) continue;
        const { section, chunk } = grounded;
        byClaim.set(field.key, {
          pageNumber: chunk?.pageNumber ?? section.pageStart ?? null,
          sectionTitle: section.title || null,
          sectionAnchor: paperSectionAnchorId(section.id),
          chunkIndex: chunk?.chunkIndex ?? null,
          sourceQuote: chunk?.text ? firstText(chunk.text, 260) : null,
        });
      }
      result.set(document.sourceItemId, byClaim);
    }
    return result;
  } catch (error) {
    if (isMissingPaperDocumentStoreError(error)) return new Map();
    throw error;
  }
}

function selectBestPaperClaimGrounding(
  field: PaperClaimField,
  claimBody: string,
  sections: PaperClaimGroundingSection[],
) {
  const candidateSections = sections.filter(section => (
    field.anchorSectionTypes.includes(section.sectionType as PaperAnchorSectionType)
  ));
  if (candidateSections.length === 0) return null;

  const candidates: PaperClaimGroundingCandidate[] = [];
  for (const section of candidateSections) {
    if (section.chunks.length === 0) {
      candidates.push({ section, chunk: null });
      continue;
    }
    for (const chunk of section.chunks) {
      candidates.push({ section, chunk });
    }
  }
  if (candidates.length === 0) return null;

  return candidates
    .map(candidate => ({
      ...candidate,
      score: paperClaimMatchScore(field, claimBody, candidate.chunk?.text || candidate.section.title),
    }))
    .sort((left, right) => (
      right.score - left.score
      || (left.chunk?.chunkIndex ?? Number.MAX_SAFE_INTEGER) - (right.chunk?.chunkIndex ?? Number.MAX_SAFE_INTEGER)
      || (left.section.pageStart ?? Number.MAX_SAFE_INTEGER) - (right.section.pageStart ?? Number.MAX_SAFE_INTEGER)
    ))[0];
}

function paperClaimMatchScore(field: PaperClaimField, claimBody: string, chunkText: string): number {
  const queryTokens = new Set([
    ...paperClaimMatchTokens(claimBody),
    ...field.matchingHints.flatMap(paperClaimMatchTokens),
  ]);
  const chunkTokens = new Set(paperClaimMatchTokens(chunkText));
  if (queryTokens.size === 0 || chunkTokens.size === 0) return 0;

  let overlapScore = 0;
  for (const token of queryTokens) {
    if (chunkTokens.has(token)) overlapScore += token.length >= 5 ? 2 : 1;
  }
  const normalizedChunk = normalizePaperClaimMatchText(chunkText);
  const phraseBonus = field.matchingHints.reduce((sum, hint) => (
    normalizedChunk.includes(normalizePaperClaimMatchText(hint)) ? sum + 0.15 : sum
  ), 0);
  return overlapScore / Math.sqrt(queryTokens.size * chunkTokens.size) + phraseBonus;
}

function paperClaimMatchTokens(value: string): string[] {
  return [...new Set((normalizePaperClaimMatchText(value).match(/[a-z0-9][a-z0-9]+/g) || [])
    .map(token => (token.length > 4 && token.endsWith('s') ? token.slice(0, -1) : token))
    .filter(token => !PAPER_CLAIM_STOP_WORDS.has(token)))];
}

function normalizePaperClaimMatchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PAPER_CLAIM_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'using',
  'into',
  'then',
  'than',
  'only',
]);

function buildPaperClaimCitations(
  source: KnowledgeThreadReadSource,
  groundingByClaim: Map<string, PaperClaimGrounding> | undefined,
): KnowledgeThreadPaperEvidenceClaim[] {
  if (!source.rawPoolItemId) return [];
  const baseHref = `/source/paper/${source.rawPoolItemId}`;

  return PAPER_CLAIM_FIELDS
    .flatMap(field => {
      const body = paperGuideClaimBody(source, field.key);
      if (!isUsefulPaperClaim(body)) return [];
      const grounding = groundingByClaim?.get(field.key);
      const pageQuery = grounding?.pageNumber ? `?page=${grounding.pageNumber}` : '';
      const sectionHash = grounding?.sectionAnchor ? `#${grounding.sectionAnchor}` : field.hash;
      const claim: KnowledgeThreadPaperEvidenceClaim = {
        id: `${source.rawPoolItemId}:${field.key}`,
        label: field.label,
        body: firstText(body, 220),
        href: `${baseHref}${pageQuery}${sectionHash}`,
        sectionType: field.sectionType,
        anchorKind: grounding ? 'paper_chunk' : 'guide',
      };
      if (grounding?.pageNumber) claim.pageNumber = grounding.pageNumber;
      if (grounding?.sectionTitle) claim.sectionTitle = grounding.sectionTitle;
      if (typeof grounding?.chunkIndex === 'number') claim.chunkIndex = grounding.chunkIndex;
      if (grounding?.sourceQuote) claim.sourceQuote = grounding.sourceQuote;
      return [claim];
    })
    .slice(0, 4);
}

function paperGuideClaimBody(source: KnowledgeThreadReadSource, key: string): string {
  const metadata = isRecord(source.metadata) ? source.metadata : {};
  const guideCache = isRecord(metadata.paperGuide) ? metadata.paperGuide : {};
  const guide = isRecord(guideCache.guide) ? guideCache.guide : {};
  return stringValue(guide[key]);
}

function isUsefulPaperClaim(value: string): boolean {
  if (value.length < 20) return false;
  return !/摘要未提供|摘要未明确|未提供足够信息|not enough information|insufficient/i.test(value);
}

function buildThreadImplementationSignalEvidence(readModel: KnowledgeThreadReadModel): KnowledgeThreadPaperEvidenceChain['implementations'] {
  return readModel.sources
    .filter(source => source.role === 'implementation_signal' && source.url && isKnowledgeThreadReadSourceReady(source))
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, 8)
    .map(source => ({
      id: source.id,
      title: source.title,
      href: source.url,
      productSlug: readModel.thread.slug,
      productName: readModel.thread.title,
      matchReason: 'thread_implementation_signal',
      confidence: source.relevanceScore,
      summary: source.summary || firstText(source.text, 180),
    }));
}

function mergePaperEvidenceImplementations(
  primary: KnowledgeThreadPaperEvidenceChain['implementations'],
  fallback: KnowledgeThreadPaperEvidenceChain['implementations'],
): KnowledgeThreadPaperEvidenceChain['implementations'] {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter(item => {
    const key = item.href || item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

async function listProductEvidenceForThreadPapers(paperIds: string[]): Promise<Pick<KnowledgeThreadPaperEvidenceChain, 'works' | 'implementations'>> {
  if (paperIds.length === 0) return { works: [], implementations: [] };
  try {
    const paperLinks = await prisma.productEvidenceSource.findMany({
      where: {
        rawPoolItemId: { in: paperIds },
        role: 'paper_foundation',
        reviewStatus: { in: PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES },
      },
      select: {
        rawPoolItemId: true,
        matchReason: true,
        confidence: true,
        product: {
          select: {
            id: true,
            slug: true,
            name: true,
            type: true,
            organizationName: true,
          },
        },
      },
      orderBy: [
        { confidence: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 12,
    });
    const productIds = [...new Set(paperLinks.map(link => link.product.id))];
    const implementationLinks = productIds.length === 0 ? [] : await prisma.productEvidenceSource.findMany({
      where: {
        productId: { in: productIds },
        role: 'implementation_source',
        reviewStatus: { in: PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES },
      },
      select: {
        matchReason: true,
        confidence: true,
        summary: true,
        product: {
          select: {
            slug: true,
            name: true,
          },
        },
        rawPoolItem: {
          select: {
            id: true,
            title: true,
            url: true,
            text: true,
          },
        },
      },
      orderBy: [
        { confidence: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 12,
    });

    const seenWorks = new Set<string>();
    const works = paperLinks.flatMap(link => {
      if (seenWorks.has(link.product.slug)) return [];
      seenWorks.add(link.product.slug);
      return [{
        slug: link.product.slug,
        name: link.product.name,
        href: `/work/${link.product.slug}`,
        typeLabel: workTypeLabel(link.product.type),
        organizationName: link.product.organizationName || undefined,
        paperId: link.rawPoolItemId,
        matchReason: link.matchReason,
        confidence: link.confidence,
      }];
    });

    const seenImplementations = new Set<string>();
    const implementations = implementationLinks.flatMap(link => {
      if (seenImplementations.has(link.rawPoolItem.id)) return [];
      seenImplementations.add(link.rawPoolItem.id);
      return [{
        id: link.rawPoolItem.id,
        title: link.rawPoolItem.title,
        href: link.rawPoolItem.url,
        productSlug: link.product.slug,
        productName: link.product.name,
        matchReason: link.matchReason,
        confidence: link.confidence,
        summary: link.summary || firstText(link.rawPoolItem.text, 180),
      }];
    });

    return { works, implementations };
  } catch (error) {
    if (isMissingProductEvidenceSourceStoreError(error)) return { works: [], implementations: [] };
    throw error;
  }
}

function sourceToPageSource(source: KnowledgeThreadReadSource): KnowledgeThreadSource {
  const metadata = isRecord(source.metadata) ? source.metadata : {};
  const threadLink = isRecord(metadata.threadLink) ? metadata.threadLink : {};
  const status = knowledgeThreadSourceStatus(metadata);
  const paperReferenceEvidence = buildThreadPaperReferenceEvidence(metadata);
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
    status,
    paperReferenceEvidence,
  };
}

function buildThreadPaperReferenceEvidence(metadata: Record<string, unknown>): KnowledgeThreadSource['paperReferenceEvidence'] {
  const referencesCache = isRecord(metadata.paperReferences) ? metadata.paperReferences : {};
  const cacheVersion = stringValue(referencesCache.version);
  if (!cacheVersion) return undefined;

  const titleMismatch = referencesCache.titleMismatch === true;
  const references = arrayValue(referencesCache.references)
    .map(toThreadPaperReferenceItem)
    .filter((item): item is NonNullable<ReturnType<typeof toThreadPaperReferenceItem>> => Boolean(item));
  const referencesTotal = numberValue(referencesCache.referencesTotal) ?? references.length;
  const status = titleMismatch
    ? 'failed'
    : cacheVersion !== PAPER_REFERENCE_CACHE_VERSION
    ? 'stale'
    : references.length > 0
    ? 'ready'
    : 'empty';

  return {
    status,
    cacheVersion,
    fetchedAt: stringValue(referencesCache.fetchedAt) || undefined,
    referencesTotal,
    referenceCount: references.length,
    message: stringValue(referencesCache.message) || undefined,
    openalexWorkTitle: stringValue(referencesCache.openalexWorkTitle) || undefined,
    titleSimilarity: numberValue(referencesCache.titleSimilarity),
    items: references.slice(0, 3),
  };
}

function toThreadPaperReferenceItem(value: unknown): KnowledgeThreadPaperReferenceItem | null {
  if (!isRecord(value)) return null;
  const title = stringValue(value.title);
  const openalexUrl = stringValue(value.openalexUrl);
  const doi = stringValue(value.doi);
  const landingPageUrl = stringValue(value.landingPageUrl);
  const sourceHref = stringValue(value.sourceHref);
  const sourceItemId = stringValue(value.sourceItemId);
  const href = sourceHref
    || (sourceItemId ? `/source/paper/${sourceItemId}` : '')
    || (doi ? `https://doi.org/${doi}` : '')
    || landingPageUrl
    || openalexUrl;
  if (!title || !href) return null;

  return {
    title,
    href,
    isInternal: href.startsWith('/source/paper/'),
    year: numberValue(value.year),
    venue: stringValue(value.venue) || undefined,
    citationCount: numberValue(value.citationCount),
  };
}

function isKnowledgeThreadReadSourceReady(source: KnowledgeThreadReadSource): boolean {
  const metadata = isRecord(source.metadata) ? source.metadata : {};
  const status = knowledgeThreadSourceStatus(metadata);
  return status === 'verified' || status === 'usable';
}

function knowledgeThreadSourceStatus(metadata: Record<string, unknown>): KnowledgeThreadSource['status'] {
  const threadLink = isRecord(metadata.threadLink) ? metadata.threadLink : {};
  const explicitStatus = normalizedSourceStatus(
    threadLink.status
      ?? threadLink.reviewStatus
      ?? metadata.status
      ?? metadata.reviewStatus,
  );
  if (explicitStatus) return explicitStatus;

  if (threadLink.excludedFromTopicReadiness === true) return 'needs_review';
  if (threadLink.autoLinked === true && !isStrongPaperThreadMatchReason(stringValue(threadLink.matchReason))) {
    return 'needs_review';
  }

  return 'verified';
}

function normalizedSourceStatus(value: unknown): KnowledgeThreadSource['status'] | null {
  if (value === 'verified' || value === 'usable' || value === 'needs_review' || value === 'needs_capture' || value === 'thin') return value;
  if (value === 'confirmed') return 'verified';
  if (value === 'rejected') return 'thin';
  if (value === 'auto') return null;
  return null;
}

function paperThreadReviewReason(metadata: unknown): string | undefined {
  if (!isRecord(metadata)) return undefined;
  const threadLink = isRecord(metadata.threadLink) ? metadata.threadLink : {};
  if (threadLink.excludedFromTopicReadiness === true) return '待复核：这条论文来源不计入主题 ready。';
  const matchReason = stringValue(threadLink.matchReason);
  if (threadLink.autoLinked === true && !isStrongPaperThreadMatchReason(matchReason)) {
    return matchReason ? `待复核：${matchReason} 不是强身份匹配。` : '待复核：自动绑定来源缺少强身份匹配。';
  }
  return undefined;
}

function isStrongPaperThreadMatchReason(value: string): boolean {
  return value.includes('DOI') || value.includes('arXiv') || value.includes('URL');
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function firstText(value: string, length: number): string {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length <= length ? text : `${text.slice(0, length - 1)}...`;
}

function paperSectionAnchorId(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized.startsWith('paper-section-') ? normalized : `paper-section-${normalized}`;
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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
  if (fixture) return fixtureToReadModel(fixture);

  const sourcePackFixture = getSourcePackFixture(slug);
  if (!sourcePackFixture) return null;

  return fixtureToReadModel(sourcePackFixture);
}

export function listStaticKnowledgeThreadSlugs(): string[] {
  return [
    ...new Set([
      ...SOURCE_PACK_FIXTURES.map(pack => pack.thread.slug),
      'loop-engineering',
    ]),
  ];
}

export function getSourcePackFixture(slug: string): KnowledgeThreadFixture | null {
  const pack = SOURCE_PACK_FIXTURES.find(item => normalizeSlug(item.thread.slug) === normalizeSlug(slug));
  if (!pack) return null;

  const requiredRoles = toKnowledgeSourceRoles(pack.sourceRequirements.requiredRoles);
  const sources = pack.sources.map(source => ({
    id: source.id,
    role: toKnowledgeSourceRole(source.metadata?.role || source.role),
    sourceKind: source.sourceKind || 'unknown',
    title: source.title || source.id,
    owner: source.sourceOwner || ownerFromUrl(source.url) || 'Unknown',
    url: source.url || undefined,
    publishedAt: typeof source.publishedAt === 'string' ? source.publishedAt : undefined,
    summary: source.whyRelevant || firstText(source.text || '', 180),
    evidenceNote: source.reviewNotes || source.evidenceQuote || source.whyRelevant || firstText(source.text || '', 180),
    evidenceQuote: source.evidenceQuote || undefined,
    confidence: toFiniteNumber(source.confidence, 0.8),
    status: normalizedSourceStatus(source.status) ?? 'verified',
  }));

  return {
    slug: pack.thread.slug,
    title: pack.thread.title,
    summary: pack.thread.definitionDraft,
    whyNow: pack.thread.whyNow,
    confidence: 0.82,
    lastReviewedAt: pack.thread.updatedAt,
    status: toKnowledgeThreadStatus(pack.thread.status),
    readinessNote: 'Source pack 已通过 review/materialize dry-run，可作为主题页样板；正式入库仍需走 KnowledgeSource materialize gate。',
    definition: pack.thread.definitionDraft,
    boundary: pack.thread.useBoundary,
    requiredRoles,
    sources,
    timeline: buildSourcePackTimeline(sources),
    edges: pack.edges.map(sourcePackEdgeToFixtureEdge),
    actions: buildSourcePackActions(sources),
    relatedLinks: buildSourcePackRelatedLinks(pack.thread.slug, pack.thread.title, sources),
  };
}

function sourcePackEdgeToFixtureEdge(edge: SourcePackEdge) {
  const fromSourceId = edge.fromSourceId || edge.fromId || '';
  const toSourceId = edge.toSourceId || edge.toId || '';

  return {
    id: edge.id || `${fromSourceId}--${toSourceId}--${edge.relationType}`,
    fromSourceId,
    toSourceId,
    relationType: edge.relationType,
    confidence: toFiniteNumber(edge.confidence, 0.7),
    evidenceNote: edge.evidenceNote || '',
  };
}

function buildSourcePackTimeline(sources: KnowledgeThreadSource[]) {
  return sources
    .filter(source => source.publishedAt)
    .sort((left, right) => String(left.publishedAt).localeCompare(String(right.publishedAt)))
    .slice(-8)
    .map(source => ({
      date: source.publishedAt || '',
      label: source.title,
      sourceIds: [source.id],
      note: source.summary,
    }));
}

function buildSourcePackActions(sources: KnowledgeThreadSource[]) {
  const actions: Array<{ kind: KnowledgeActionKind; title: string; description: string; sourceIds: string[] }> = [];
  const official = sources.filter(source => source.role === 'official_definition').slice(0, 3).map(source => source.id);
  const transcripts = sources.filter(source => source.role === 'transcript_context').slice(0, 2).map(source => source.id);
  const implementations = sources.filter(source => source.role === 'implementation_signal').slice(0, 3).map(source => source.id);

  if (official.length > 0) {
    actions.push({
      kind: 'read',
      title: 'Read the official boundaries',
      description: '先用官方文档和产品说明确定 agentic coding 的产品边界，再看论文和实现。',
      sourceIds: official,
    });
  }
  if (transcripts.length > 0) {
    actions.push({
      kind: 'watch',
      title: 'Compare builder narratives',
      description: '用访谈逐字稿补足官方文档里没有展开的工作流语境。',
      sourceIds: transcripts,
    });
  }
  if (implementations.length > 0) {
    actions.push({
      kind: 'try',
      title: 'Trace implementation surfaces',
      description: '从 CLI、SDK、GitHub agent 和 SWE-agent 这类入口判断工程实现是否能支撑主题判断。',
      sourceIds: implementations,
    });
  }

  return actions;
}

function buildSourcePackRelatedLinks(
  slug: string,
  title: string,
  sources: KnowledgeThreadSource[],
) {
  const sourceIds = sources.slice(0, 3).map(source => source.id);
  const links: Array<{ kind: KnowledgeLinkKind; label: string; href: string; relation: string; sourceIds: string[] }> = [
    {
      kind: 'topic',
      label: title,
      href: `/topic/${encodeURIComponent(title)}`,
      relation: '把主题页和目录中的宽话题入口接起来。',
      sourceIds,
    },
  ];

  if (slug !== 'loop-engineering') {
    links.push({
      kind: 'thread',
      label: 'Loop Engineering',
      href: '/threads/loop-engineering',
      relation: 'Agentic Coding 是更宽的技术主题，Loop Engineering 是更窄的工作流样板。',
      sourceIds,
    });
  }

  return links;
}

function toKnowledgeSourceRoles(values: readonly string[]): KnowledgeSourceRole[] {
  return values.map(toKnowledgeSourceRole);
}

function toKnowledgeSourceRole(value: string): KnowledgeSourceRole {
  if (
    value === 'signal'
    || value === 'official_definition'
    || value === 'transcript_context'
    || value === 'paper_foundation'
    || value === 'implementation_signal'
    || value === 'company_strategy_context'
  ) {
    return value;
  }

  return 'signal';
}

function toKnowledgeThreadStatus(value: string): KnowledgeThreadStatus {
  if (
    value === 'curated' ||
    value === 'source_pack_review' ||
    value === 'review_ready' ||
    value === 'thin' ||
    value === 'draft'
  ) {
    return value;
  }

  return 'source_pack_review';
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
