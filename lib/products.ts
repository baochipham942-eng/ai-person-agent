import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { workTypeLabel } from '@/lib/work-taxonomy';

/**
 * 作品/成果实体（内部表名 Product）的运行时数据层。
 * 实体页 /work/[slug] 与人物页「代表作品」横切共用。只读。
 */

export interface WorkContributor {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  roleCategory: string | null;
  role: string; // creator | contributor
}

export interface WorkPage {
  id: string;
  slug: string;
  name: string;
  type: string;
  typeLabel: string;
  category: string | null;
  description: string | null;
  url: string | null;
  iconUrl: string | null;
  firstYear: number | null;
  organizationId: string | null;
  organizationName: string | null;
  topics: string[];
  threadSlugs: string[];
  contributors: WorkContributor[];
  paperFoundations: WorkEvidenceSource[];
  implementationSources: WorkEvidenceSource[];
}

export interface WorkEvidenceSource {
  id: string;
  kind: 'paper' | 'github';
  title: string;
  href: string;
  externalUrl: string;
  sourceLabel: string;
  summary: string | null;
  publishedAt: string | null;
  person: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  matchReason: WorkEvidenceMatchReason;
  confidence: number;
}

const ROLE_ORDER: Record<string, number> = { creator: 0, lead: 1, contributor: 2 };
const PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES = ['auto', 'confirmed'];
type WorkEvidenceMatchReason = 'url_exact' | 'title_mention' | 'metadata_mention' | 'abstract_mention';
export type RawEvidenceRow = {
  id: string;
  personId: string;
  sourceType: string;
  title: string;
  url: string;
  text: string;
  publishedAt: Date | null;
  metadata: unknown;
};
type EvidencePerson = { id: string; name: string; avatarUrl: string | null };
type MatchedEvidence = {
  row: RawEvidenceRow;
  matchReason: WorkEvidenceMatchReason;
  confidence: number;
};

export async function fetchWorkPage(slug: string): Promise<WorkPage | null> {
  const product = await prisma.product.findUnique({
    where: { slug: slug.trim().toLowerCase() },
    include: {
      contributors: {
        include: {
          person: { select: { id: true, name: true, avatarUrl: true, currentTitle: true, roleCategory: true } },
        },
      },
    },
  });
  if (!product) return null;

  const contributors: WorkContributor[] = product.contributors
    .map(c => ({
      id: c.person.id,
      name: c.person.name,
      avatarUrl: c.person.avatarUrl,
      currentTitle: c.person.currentTitle,
      roleCategory: c.person.roleCategory,
      role: c.role,
    }))
    .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
  const persistedEvidenceSources = await listPersistedEvidenceSourcesForProduct(product.id);
  const candidateEvidenceSources = needsCandidateEvidenceFallback(persistedEvidenceSources)
    ? await listCandidateEvidenceSourcesForWork({
      name: product.name,
      aliases: product.aliases,
      url: product.url,
    })
    : [];
  const evidenceSources = mergeWorkEvidenceSources(persistedEvidenceSources, candidateEvidenceSources);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    type: product.type,
    typeLabel: workTypeLabel(product.type),
    category: product.category,
    description: product.description,
    url: product.url,
    iconUrl: product.iconUrl,
    firstYear: product.firstYear,
    organizationId: product.organizationId,
    organizationName: product.organizationName,
    topics: product.topics,
    threadSlugs: product.threadSlugs,
    contributors,
    paperFoundations: evidenceSources.filter(source => source.kind === 'paper'),
    implementationSources: evidenceSources.filter(source => source.kind === 'github'),
  };
}

function needsCandidateEvidenceFallback(sources: WorkEvidenceSource[]): boolean {
  return !sources.some(source => source.kind === 'paper')
    || !sources.some(source => source.kind === 'github');
}

function mergeWorkEvidenceSources(
  persisted: WorkEvidenceSource[],
  candidates: WorkEvidenceSource[],
): WorkEvidenceSource[] {
  const seen = new Set<string>();
  return [...persisted, ...candidates].filter(source => {
    const key = `${source.kind}:${source.externalUrl || source.href || source.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => (
    right.confidence - left.confidence
    || compareEvidenceKind(left.kind, right.kind)
    || left.title.localeCompare(right.title)
  )).slice(0, 10);
}

export interface PersonWorkLink {
  slug: string;
  name: string;
  type: string;
  typeLabel: string;
  organizationName: string | null;
  role: string;
}

/** 某人参与的作品（人物页「代表作品」用，已是去重/收敛后的实体）。 */
export async function listWorksForPerson(personId: string, limit = 12): Promise<PersonWorkLink[]> {
  const links = await prisma.productContributor.findMany({
    where: { personId },
    include: {
      product: {
        select: { slug: true, name: true, type: true, organizationName: true, priorityScore: true },
      },
    },
    orderBy: { product: { priorityScore: 'desc' } },
    take: limit,
  });
  return links.map(l => ({
    slug: l.product.slug,
    name: l.product.name,
    type: l.product.type,
    typeLabel: workTypeLabel(l.product.type),
    organizationName: l.product.organizationName,
    role: l.role,
  }));
}

export async function listStaticWorkSlugs(limit = 50): Promise<string[]> {
  const rows = await prisma.product.findMany({
    select: { slug: true },
    orderBy: { priorityScore: 'desc' },
    take: limit,
  });
  return rows.map(r => r.slug);
}

export async function listCandidateEvidenceSourcesForWork(work: {
  name: string;
  aliases: string[];
  url: string | null;
}, options: {
  candidateRows?: RawEvidenceRow[];
} = {}): Promise<WorkEvidenceSource[]> {
  const workUrl = normalizeComparableWorkUrl(work.url);
  const baseNeedles = [...new Set([work.name, ...work.aliases]
    .map(normalizeEvidenceText)
    .filter(isSafeEvidenceNeedle))];
  const urlNeedles = extractEvidenceNeedlesFromUrl(work.url);
  const paperTitleNeedles = [...new Set([...baseNeedles.filter(isStrongPaperEvidenceNeedle), ...urlNeedles])];
  const githubTitleNeedles = baseNeedles;
  if (!workUrl && paperTitleNeedles.length === 0 && githubTitleNeedles.length === 0) return [];

  const rows = options.candidateRows ?? await listWorkEvidenceCandidatePool();

  const matches = new Map<string, MatchedEvidence>();
  for (const row of rows) {
    const metadata = asRecord(row.metadata);
    const urlCandidates = [
      row.url,
      readString(metadata.url),
      readString(metadata.doi),
      readString(metadata.landingPageUrl),
      readString(metadata.openalexUrl),
      readString(metadata.pdfUrl),
    ];
    if (workUrl && urlCandidates.some(candidate => normalizeComparableWorkUrl(candidate) === workUrl)) {
      addMatchedEvidence(matches, row, 'url_exact', 0.96);
      continue;
    }

    if (row.sourceType === 'github') {
      if (matchesGithubRepositoryName(row, githubTitleNeedles)) {
        addMatchedEvidence(matches, row, 'title_mention', 0.86);
      }
      continue;
    }

    const titleKey = normalizeEvidenceText(row.title);
    if (paperTitleNeedles.some(needle => containsEvidencePhrase(titleKey, needle))) {
      addMatchedEvidence(matches, row, 'title_mention', 0.9);
    }
  }

  const peopleById = await listPeopleForEvidence([...matches.values()].map(match => match.row.personId));
  return [...matches.values()]
    .map(match => toWorkEvidenceSource(match.row, match.matchReason, match.confidence, peopleById))
    .sort((left, right) => right.confidence - left.confidence || compareEvidenceKind(left.kind, right.kind) || left.title.localeCompare(right.title))
    .slice(0, 10);
}

export async function listWorkEvidenceCandidatePool(limit = 5000): Promise<RawEvidenceRow[]> {
  return prisma.rawPoolItem.findMany({
    where: { sourceType: { in: ['openalex', 'github'] } },
    select: {
      id: true,
      personId: true,
      sourceType: true,
      title: true,
      url: true,
      text: true,
      publishedAt: true,
      metadata: true,
    },
    orderBy: [
      { publishedAt: 'desc' },
      { fetchedAt: 'desc' },
    ],
    take: limit,
  });
}

async function listPersistedEvidenceSourcesForProduct(productId: string): Promise<WorkEvidenceSource[]> {
  try {
    const rows = await prisma.productEvidenceSource.findMany({
      where: {
        productId,
        reviewStatus: { in: PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES },
      },
      select: {
        role: true,
        matchReason: true,
        confidence: true,
        summary: true,
        rawPoolItem: {
          select: {
            id: true,
            personId: true,
            sourceType: true,
            title: true,
            url: true,
            text: true,
            publishedAt: true,
            metadata: true,
            person: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: [
        { confidence: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 10,
    });

    return rows
      .map(row => {
        const peopleById = new Map([[row.rawPoolItem.person.id, row.rawPoolItem.person]]);
        return toWorkEvidenceSource(
          row.rawPoolItem,
          normalizeWorkEvidenceMatchReason(row.matchReason),
          row.confidence,
          peopleById,
          row.summary,
        );
      })
      .filter(source => matchesEvidenceRole(source, rows.find(row => row.rawPoolItem.id === source.id)?.role));
  } catch (error) {
    if (isMissingProductEvidenceSourceTable(error)) return [];
    throw error;
  }
}

function toWorkEvidenceSource(
  row: RawEvidenceRow,
  matchReason: WorkEvidenceMatchReason,
  confidence: number,
  peopleById: Map<string, EvidencePerson>,
  summaryOverride?: string | null,
): WorkEvidenceSource {
  const metadata = asRecord(row.metadata);
  const kind = row.sourceType === 'github' ? 'github' : 'paper';
  const person = peopleById.get(row.personId) || { id: row.personId, name: 'Unknown', avatarUrl: null };
  return {
    id: row.id,
    kind,
    title: row.title,
    href: kind === 'paper' ? `/source/paper/${row.id}` : row.url,
    externalUrl: row.url,
    sourceLabel: kind === 'paper'
      ? readString(metadata.venue) || 'OpenAlex'
      : 'GitHub',
    summary: summaryOverride || evidenceSummary(row.text, metadata),
    publishedAt: row.publishedAt ? formatDate(row.publishedAt) : null,
    person,
    matchReason,
    confidence,
  };
}

function normalizeWorkEvidenceMatchReason(value: string): WorkEvidenceMatchReason {
  return value === 'url_exact'
    || value === 'title_mention'
    || value === 'metadata_mention'
    || value === 'abstract_mention'
    ? value
    : 'metadata_mention';
}

function matchesEvidenceRole(source: WorkEvidenceSource, role: string | undefined): boolean {
  if (!role) return true;
  if (source.kind === 'paper') return role === 'paper_foundation';
  if (source.kind === 'github') return role === 'implementation_source';
  return true;
}

function isMissingProductEvidenceSourceTable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('ProductEvidenceSource');
}

function addMatchedEvidence(
  matches: Map<string, MatchedEvidence>,
  row: RawEvidenceRow,
  matchReason: WorkEvidenceMatchReason,
  confidence: number,
): void {
  const key = evidenceStableKey(row);
  const current = matches.get(key);
  if (!current || confidence > current.confidence) {
    matches.set(key, { row, matchReason, confidence });
  }
}

async function listPeopleForEvidence(personIds: string[]): Promise<Map<string, EvidencePerson>> {
  const uniqueIds = [...new Set(personIds)].filter(Boolean);
  if (uniqueIds.length === 0) return new Map();
  const rows = await prisma.people.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true, avatarUrl: true },
  });
  return new Map(rows.map(row => [row.id, row]));
}

function evidenceStableKey(row: RawEvidenceRow): string {
  const metadata = asRecord(row.metadata);
  const sourceId = [
    readString(metadata.openalexWorkId),
    readString(metadata.doi),
    normalizeComparableWorkUrl(row.url),
    normalizeEvidenceText(row.title),
  ].find(Boolean);
  return `${row.sourceType}:${sourceId || row.id}`;
}

function compareEvidenceKind(left: WorkEvidenceSource['kind'], right: WorkEvidenceSource['kind']): number {
  const rank: Record<WorkEvidenceSource['kind'], number> = { paper: 0, github: 1 };
  return rank[left] - rank[right];
}

const GENERIC_EVIDENCE_NEEDLES = new Set([
  'ai',
  'agent',
  'agents',
  'code',
  'datasets',
  'framework',
  'github',
  'gpt',
  'model',
  'models',
  'paper',
  'papers',
  'research',
  'tool',
  'transformer',
  'transformers',
]);

function isSafeEvidenceNeedle(value: string): boolean {
  if (!value || GENERIC_EVIDENCE_NEEDLES.has(value)) return false;
  const tokens = value.split(/\s+/).filter(Boolean);
  return value.length >= 7 || tokens.length >= 2;
}

function isStrongPaperEvidenceNeedle(value: string): boolean {
  return isSafeEvidenceNeedle(value) && !GENERIC_PAPER_EVIDENCE_NEEDLES.has(value);
}

const GENERIC_PAPER_EVIDENCE_NEEDLES = new Set([
  'imagenet',
]);

function containsEvidencePhrase(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

function matchesGithubRepositoryName(row: RawEvidenceRow, needles: string[]): boolean {
  const repoName = githubRepositoryName(row.url) || row.title.split('/').pop() || row.title;
  const repoKey = normalizeEvidenceText(repoName);
  const compactRepoKey = compactEvidenceKey(repoKey);
  return needles.some(needle => {
    const normalizedNeedle = normalizeEvidenceText(needle);
    return repoKey === normalizedNeedle || compactRepoKey === compactEvidenceKey(normalizedNeedle);
  });
}

function githubRepositoryName(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.hostname.toLowerCase().replace(/^www\./, '') !== 'github.com') return null;
    const [, owner, repo] = parsed.pathname.split('/');
    return owner && repo ? repo : null;
  } catch {
    return null;
  }
}

function compactEvidenceKey(value: string): string {
  return value.replace(/\s+/g, '');
}

function extractEvidenceNeedlesFromUrl(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = new URL(value);
    const filename = decodeURIComponent(parsed.pathname.split('/').pop() || '')
      .replace(/\.(html?|pdf|txt)$/i, '')
      .replace(/^\d+[-_]/, '');
    const normalized = normalizeEvidenceText(filename);
    return isSafeEvidenceNeedle(normalized) ? [normalized] : [];
  } catch {
    return [];
  }
}

function normalizeEvidenceText(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9一-龥]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeComparableWorkUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = decodeURIComponent(parsed.pathname).replace(/\/+$/g, '');
    return `${hostname}${pathname}${parsed.search}`.toLowerCase();
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function evidenceSummary(text: string, metadata: Record<string, unknown>): string | null {
  const abstract = readString(metadata.abstract);
  const description = readString(metadata.description);
  return truncateEvidence(abstract || description || text);
}

function truncateEvidence(value: string | null | undefined, length = 260): string | null {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  return normalized.length <= length ? normalized : `${normalized.slice(0, length - 1)}...`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(value);
}
