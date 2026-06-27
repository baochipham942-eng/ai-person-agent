import { prisma } from '@/lib/db/prisma';
import { getSourcePacks } from '@/lib/knowledge-threads';
import type { PaperRelatedThread, PaperSourceRecord } from './types';
import { buildPaperIdentityKeys, type PaperIdentityKeys } from './identity';
import { withNeonWakeup } from './storage';
import {
  asRecord,
  extractArxivId,
  extractDoiKey,
  normalizeArxivVersionless,
  normalizeComparablePaperUrl,
  normalizePaperTitleKey,
  readNumber,
  readString,
} from './utils';

export async function getPaperRelatedThreads(source: PaperSourceRecord): Promise<PaperRelatedThread[]> {
  const directLinks = await getPaperKnowledgeThreadLinks(source.id);
  const sourcePackLinks = getPaperSourcePackThreadLinks(source);
  const seen = new Set<string>();
  const links: PaperRelatedThread[] = [];

  for (const link of [...directLinks, ...sourcePackLinks]) {
    const key = `${link.slug}:${link.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push(link);
  }

  return links
    .sort((left, right) => (right.relevanceScore ?? 0) - (left.relevanceScore ?? 0))
    .slice(0, 6);
}

export function isPublishablePaperRelatedThread(thread: PaperRelatedThread): boolean {
  return !thread.excludedFromTopicReadiness && (thread.status === 'verified' || thread.status === 'usable');
}

export async function getPaperKnowledgeThreadLinks(sourceId: string): Promise<PaperRelatedThread[]> {
  const rows = await withNeonWakeup(() => prisma.knowledgeThreadSource.findMany({
    where: { rawPoolItemId: sourceId },
    select: {
      role: true,
      relevanceScore: true,
      summary: true,
      evidenceQuote: true,
      metadata: true,
      thread: {
        select: {
          slug: true,
          title: true,
        },
      },
    },
    orderBy: [
      { relevanceScore: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 6,
  }));

  return rows.map(row => {
    const metadata = asRecord(row.metadata);
    const matchReason = readString(metadata.matchReason) || '已绑定到 KnowledgeThreadSource';
    const quality = paperThreadQualityFromMetadata(metadata, matchReason);
    return {
      slug: row.thread.slug,
      title: row.thread.title,
      href: `/threads/${row.thread.slug}`,
      role: row.role,
      source: 'knowledge_thread_source',
      relevanceScore: row.relevanceScore,
      summary: row.summary,
      evidenceQuote: row.evidenceQuote,
      matchReason,
      status: quality.status,
      excludedFromTopicReadiness: quality.excludedFromTopicReadiness,
      reviewReason: quality.reviewReason,
    };
  });
}

export function getPaperSourcePackThreadLinks(source: PaperSourceRecord): PaperRelatedThread[] {
  const metadata = asRecord(source.metadata);
  const identifiers = buildPaperIdentityKeys(source, metadata);
  const links: PaperRelatedThread[] = [];

  for (const pack of getSourcePacks()) {
    for (const packSource of pack.sources) {
      if (packSource.role !== 'paper_foundation') continue;
      const matchReason = matchPaperSourcePackEntry(identifiers, packSource.title || '', packSource.url || '');
      if (!matchReason) continue;
      const relevanceScore = Math.min(0.96, readNumber(packSource.confidence) ?? 0.82);
      const quality = paperThreadQualityFromMetadata(asRecord(packSource.metadata), matchReason);
      links.push({
        slug: pack.thread.slug,
        title: pack.thread.title,
        href: `/threads/${pack.thread.slug}`,
        role: 'paper_foundation',
        source: 'source_pack',
        sourcePackSourceId: packSource.id,
        sourcePackUrl: packSource.url || null,
        relevanceScore,
        summary: packSource.whyRelevant || packSource.reviewNotes || null,
        evidenceQuote: packSource.evidenceQuote || null,
        matchReason,
        status: quality.status,
        excludedFromTopicReadiness: quality.excludedFromTopicReadiness,
        reviewReason: quality.reviewReason,
      });
    }
  }

  return links;
}

function matchPaperSourcePackEntry(identifiers: PaperIdentityKeys, title: string, url: string): string | null {
  const urlKey = normalizeComparablePaperUrl(url);
  if (urlKey && identifiers.urls.has(urlKey)) return 'source-pack URL 匹配';

  const arxivId = extractArxivId(url);
  if (arxivId && identifiers.arxivIds.has(normalizeArxivVersionless(arxivId))) return 'arXiv id 匹配';

  const doi = extractDoiKey(url);
  if (doi && identifiers.dois.has(doi)) return 'DOI 匹配';

  const sourceTitle = normalizePaperTitleKey(title);
  if (sourceTitle && identifiers.titleKey === sourceTitle) return '论文标题匹配';
  if (sourceTitle.length >= 40 && identifiers.titleKey.length >= 40) {
    if (identifiers.titleKey.includes(sourceTitle) || sourceTitle.includes(identifiers.titleKey)) {
      return '论文标题匹配';
    }
  }

  return null;
}

export function paperThreadQualityFromMetadata(metadata: Record<string, unknown>, matchReason: string): {
  status: PaperRelatedThread['status'];
  excludedFromTopicReadiness: boolean;
  reviewReason: string | null;
} {
  const status = normalizePaperThreadStatus(metadata.status ?? metadata.reviewStatus);
  const strongMatch = isStrongPaperThreadMatchReason(matchReason);
  if (status) {
    return {
      status,
      excludedFromTopicReadiness: metadata.excludedFromTopicReadiness === true || status === 'needs_review' || status === 'thin',
      reviewReason: readString(metadata.reviewReason) || null,
    };
  }

  const autoCandidate = metadata.autoLinked === true
    || metadata.materializedFrom === 'source_pack_paper_foundation'
    || matchReason.includes('source-pack')
    || matchReason.includes('标题');
  const needsReview = metadata.excludedFromTopicReadiness === true || (autoCandidate && !strongMatch);
  return {
    status: needsReview ? 'needs_review' : 'verified',
    excludedFromTopicReadiness: needsReview,
    reviewReason: needsReview
      ? (readString(metadata.reviewReason) || `${matchReason || '自动绑定'} 需要人工复核后才计入主题 ready。`)
      : null,
  };
}

function normalizePaperThreadStatus(value: unknown): PaperRelatedThread['status'] | null {
  if (value === 'verified' || value === 'usable' || value === 'needs_review' || value === 'needs_capture' || value === 'thin') return value;
  if (value === 'confirmed') return 'verified';
  if (value === 'rejected') return 'thin';
  if (value === 'auto') return null;
  return null;
}

function isStrongPaperThreadMatchReason(value: string): boolean {
  return value.includes('DOI') || value.includes('arXiv') || value.includes('URL');
}
