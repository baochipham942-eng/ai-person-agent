import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import {
  OPENALEX_MAILTO,
  OPENALEX_WORKS_URL,
  PAPER_REFERENCE_CARD_LIMIT,
  PAPER_REFERENCE_FETCH_LIMIT,
  PAPER_REFERENCES_CACHE_VERSION,
} from './constants';
import {
  CachedPaperReferenceCardSchema,
  CachedPaperReferencesSchema,
} from './schemas';
import type {
  FetchedOpenAlexReferences,
  OpenAlexLookupCandidate,
  PaperReferenceCard,
  PaperReferenceLookup,
  PaperReferenceQualityIssue,
  PaperReferenceStatus,
  PaperSourceRecord,
} from './types';
import {
  cleanOpenAlexWorkId,
  openAlexLookupCandidates,
} from './openalex';
import { internalPaperSourceHref, loadPaperSource } from './source';
import { mergePaperMetadata, withNeonWakeup } from './storage';
import {
  asRecord,
  normalizeDoi,
  normalizeUrl,
  openAlexInvertedIndexToText,
  readNumber,
  readString,
  readStringArray,
  truncate,
} from './utils';

export async function materializePaperReferenceCards(sourceId: string): Promise<PaperReferenceLookup | null> {
  const source = await loadPaperSource(sourceId);
  if (!source) return null;
  return getOrCreatePaperReferenceCards(source);
}

export async function getOrCreatePaperReferenceCards(source: PaperSourceRecord): Promise<PaperReferenceLookup> {
  const metadata = asRecord(source.metadata);
  const lookupCandidates = openAlexLookupCandidates(source, metadata);
  const cached = CachedPaperReferencesSchema.safeParse(metadata.paperReferences);
  if (cached.success && cached.data.version === PAPER_REFERENCES_CACHE_VERSION) {
    const cachedLookupKey = cached.data.openalexWorkId;
    const hasAlternativeLookup = Boolean(
      cachedLookupKey
      && lookupCandidates.some(candidate => (
        candidate.openalexWorkId !== cachedLookupKey && candidate.key !== cachedLookupKey
      )),
    );
    if (cached.data.titleMismatch) {
      if (!hasAlternativeLookup) {
        return {
          cards: [],
          status: {
            status: 'failed',
            cacheHit: true,
            fetchedAt: cached.data.fetchedAt,
            referencesTotal: cached.data.referencesTotal,
            message: cached.data.message || 'openalex_reference_title_mismatch',
            openalexWorkId: cached.data.openalexWorkId,
            openalexWorkTitle: cached.data.openalexWorkTitle ?? null,
            titleSimilarity: cached.data.titleSimilarity ?? null,
            qualityIssue: paperReferenceQualityIssue(cached.data.message || 'openalex_reference_title_mismatch'),
          },
        };
      }
    } else {
      const cards = await enrichPaperReferenceLinks(cached.data.references);
      return {
        cards,
        status: {
          status: cards.length > 0 ? 'ready' : 'empty',
          cacheHit: true,
          fetchedAt: cached.data.fetchedAt,
          referencesTotal: cached.data.referencesTotal,
          message: cards.length > 0 ? null : 'openalex_no_referenced_works',
          openalexWorkId: cached.data.openalexWorkId,
          openalexWorkTitle: cached.data.openalexWorkTitle ?? null,
          titleSimilarity: cached.data.titleSimilarity ?? null,
          qualityIssue: null,
        },
      };
    }
  }

  if (lookupCandidates.length === 0) return emptyPaperReferenceLookup('missing_openalex_identifier');

  let lastTitleMismatch: { candidate: OpenAlexLookupCandidate; fetched: FetchedOpenAlexReferences } | null = null;
  let lastErrorMessage: string | null = null;
  for (const candidate of lookupCandidates) {
    try {
      const fetched = await fetchOpenAlexReferencedWorks(candidate.url, source.title);
      if (fetched.titleMismatch) {
        lastTitleMismatch = { candidate, fetched };
        continue;
      }
      return persistPaperReferenceLookup(source.id, candidate, fetched);
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : 'openalex_references_failed';
    }
  }

  if (lastTitleMismatch) {
    return persistPaperReferenceLookup(source.id, lastTitleMismatch.candidate, lastTitleMismatch.fetched);
  }
  return emptyPaperReferenceLookup(lastErrorMessage || 'openalex_references_failed', 'failed');
}

async function persistPaperReferenceLookup(
  sourceId: string,
  candidate: OpenAlexLookupCandidate,
  fetched: FetchedOpenAlexReferences,
): Promise<PaperReferenceLookup> {
  const fetchedAt = new Date().toISOString();
  const lookupKey = fetched.openalexWorkId
    || candidate.openalexWorkId
    || (candidate.key.startsWith('title:') ? null : candidate.key);
  await mergePaperMetadata(sourceId, {
    paperReferences: {
      version: PAPER_REFERENCES_CACHE_VERSION,
      openalexWorkId: lookupKey,
      openalexWorkTitle: fetched.openalexWorkTitle,
      titleSimilarity: fetched.titleSimilarity,
      titleMismatch: fetched.titleMismatch,
      message: fetched.message,
      fetchedAt,
      referencesTotal: fetched.referencesTotal,
      references: fetched.cards.map(toCachedPaperReferenceCard),
    },
  });

  if (fetched.titleMismatch) {
    return {
      cards: [],
      status: {
        status: 'failed',
        cacheHit: false,
        fetchedAt,
        referencesTotal: fetched.referencesTotal,
        message: fetched.message || 'openalex_reference_title_mismatch',
        openalexWorkId: fetched.openalexWorkId,
        openalexWorkTitle: fetched.openalexWorkTitle,
        titleSimilarity: fetched.titleSimilarity,
        qualityIssue: paperReferenceQualityIssue(fetched.message || 'openalex_reference_title_mismatch'),
      },
    };
  }

  const cards = await enrichPaperReferenceLinks(fetched.cards);
  return {
    cards,
    status: {
      status: cards.length > 0 ? 'ready' : 'empty',
      cacheHit: false,
      fetchedAt,
      referencesTotal: fetched.referencesTotal,
      message: cards.length > 0 ? null : 'openalex_no_referenced_works',
      openalexWorkId: fetched.openalexWorkId,
      openalexWorkTitle: fetched.openalexWorkTitle,
      titleSimilarity: fetched.titleSimilarity,
      qualityIssue: null,
    },
  };
}

async function fetchOpenAlexReferencedWorks(
  lookupUrl: string,
  sourceTitle: string,
): Promise<FetchedOpenAlexReferences> {
  const workResponse = await fetch(lookupUrl, {
    headers: {
      Accept: 'application/json',
      'User-Agent': `ai-person-agent/0.5.0 (mailto:${OPENALEX_MAILTO})`,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!workResponse.ok) throw new Error(`openalex_http_${workResponse.status}`);

  const work = selectOpenAlexWorkFromLookupPayload(await workResponse.json(), sourceTitle);
  if (!work) {
    return {
      referencesTotal: 0,
      cards: [],
      openalexWorkId: null,
      openalexWorkTitle: null,
      titleSimilarity: 0,
      titleMismatch: true,
      message: 'openalex_search_no_title_match',
    };
  }
  const openalexWorkId = cleanOpenAlexWorkId(readString(work.id));
  const openalexWorkTitle = readString(work.title) || readString(work.display_name);
  const titleSimilarity = comparePaperTitles(sourceTitle, openalexWorkTitle);
  const titleMismatch = titleSimilarity !== null && titleSimilarity < 0.25;
  if (titleMismatch) {
    return {
      referencesTotal: 0,
      cards: [],
      openalexWorkId,
      openalexWorkTitle,
      titleSimilarity,
      titleMismatch: true,
      message: 'openalex_reference_title_mismatch',
    };
  }

  const referencedWorkIds = readStringArray(work.referenced_works)
    .map(cleanOpenAlexWorkId)
    .filter((value): value is string => Boolean(value));
  const uniqueIds = [...new Set(referencedWorkIds)];
  const referencesTotal = readNumber(work.referenced_works_count) ?? uniqueIds.length;
  if (uniqueIds.length === 0) {
    return {
      referencesTotal,
      cards: [],
      openalexWorkId,
      openalexWorkTitle,
      titleSimilarity,
      titleMismatch: false,
      message: null,
    };
  }

  const params = new URLSearchParams({
    filter: `openalex:${uniqueIds.slice(0, PAPER_REFERENCE_FETCH_LIMIT).join('|')}`,
    per_page: String(PAPER_REFERENCE_FETCH_LIMIT),
    mailto: OPENALEX_MAILTO,
  });
  if (process.env.OPENALEX_API_KEY) params.set('api_key', process.env.OPENALEX_API_KEY);
  const referencesResponse = await fetch(`${OPENALEX_WORKS_URL}?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': `ai-person-agent/0.5.0 (mailto:${OPENALEX_MAILTO})`,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!referencesResponse.ok) throw new Error(`openalex_references_http_${referencesResponse.status}`);

  const payload = asRecord(await referencesResponse.json());
  const results = Array.isArray(payload.results) ? payload.results : [];
  const cards = results
    .map(toPaperReferenceCard)
    .filter((card): card is PaperReferenceCard => Boolean(card))
    .sort((left, right) => right.citationCount - left.citationCount || String(left.year || '').localeCompare(String(right.year || '')))
    .slice(0, PAPER_REFERENCE_CARD_LIMIT);

  return {
    referencesTotal,
    cards,
    openalexWorkId,
    openalexWorkTitle,
    titleSimilarity,
    titleMismatch: false,
    message: null,
  };
}

export function selectOpenAlexWorkFromLookupPayload(payload: unknown, sourceTitle: string): Record<string, unknown> | null {
  const record = asRecord(payload);
  const results = Array.isArray(record.results) ? record.results.map(asRecord) : [];
  if (results.length === 0) return record;
  const ranked = results
    .map(work => {
      const title = readString(work.title) || readString(work.display_name);
      return {
        work,
        similarity: comparePaperTitles(sourceTitle, title) ?? 0,
        citationCount: readNumber(work.cited_by_count) ?? 0,
      };
    })
    .sort((left, right) => (
      right.similarity - left.similarity
      || right.citationCount - left.citationCount
    ));
  const best = ranked[0];
  return best?.similarity >= 0.5 ? best.work : null;
}

export function comparePaperTitles(left: string | null | undefined, right: string | null | undefined): number | null {
  const leftTokens = titleTokens(left);
  const rightTokens = titleTokens(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return null;
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) intersection += 1;
  }
  const union = new Set([...leftSet, ...rightSet]).size;
  const jaccard = union > 0 ? intersection / union : 0;
  const smallerTitleSize = Math.min(leftSet.size, rightSet.size);
  const smallerTitleCoverage = smallerTitleSize > 0 ? intersection / smallerTitleSize : 0;
  if (smallerTitleSize >= 2 && smallerTitleCoverage >= 0.85) return Math.max(jaccard, 0.85);
  return jaccard;
}

function titleTokens(value: string | null | undefined): string[] {
  const normalized = (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!normalized) return [];
  const stopWords = new Set(['a', 'an', 'and', 'are', 'for', 'from', 'in', 'is', 'of', 'on', 'the', 'to', 'via', 'with']);
  return normalized
    .split(/\s+/)
    .filter(token => token.length > 1 && !stopWords.has(token));
}

function toPaperReferenceCard(value: unknown): PaperReferenceCard | null {
  const work = asRecord(value);
  const openalexId = cleanOpenAlexWorkId(readString(work.id));
  const title = readString(work.title);
  if (!openalexId || !title) return null;

  const primaryLocation = asRecord(work.primary_location);
  const source = asRecord(primaryLocation.source);
  const authorships = Array.isArray(work.authorships) ? work.authorships : [];
  const authors = authorships
    .map(item => readString(asRecord(asRecord(item).author).display_name))
    .filter((item): item is string => Boolean(item))
    .slice(0, 5);
  const abstract = truncate(openAlexInvertedIndexToText(work.abstract_inverted_index), 520);

  return {
    openalexId,
    openalexUrl: `https://openalex.org/${openalexId}`,
    title,
    year: readNumber(work.publication_year),
    authors,
    venue: readString(source.display_name),
    abstract: abstract || 'OpenAlex 暂未提供摘要。',
    doi: normalizeDoi(readString(work.doi)),
    landingPageUrl: normalizeUrl(readString(primaryLocation.landing_page_url)),
    citationCount: readNumber(work.cited_by_count) ?? 0,
    sourceItemId: null,
    sourceHref: null,
  };
}

function toCachedPaperReferenceCard(card: PaperReferenceCard): z.infer<typeof CachedPaperReferenceCardSchema> {
  return {
    openalexId: card.openalexId,
    openalexUrl: card.openalexUrl,
    title: card.title,
    year: card.year,
    authors: card.authors,
    venue: card.venue,
    abstract: card.abstract,
    doi: card.doi,
    landingPageUrl: card.landingPageUrl,
    citationCount: card.citationCount,
  };
}

async function enrichPaperReferenceLinks(cards: Array<z.infer<typeof CachedPaperReferenceCardSchema> | PaperReferenceCard>): Promise<PaperReferenceCard[]> {
  const normalizedCards = cards.map(card => ({
    ...card,
    sourceItemId: 'sourceItemId' in card ? card.sourceItemId : null,
    sourceHref: 'sourceHref' in card ? card.sourceHref : null,
  }));
  const urls = new Set<string>();
  const urlsByCard = new Map<string, string[]>();
  for (const card of normalizedCards) {
    const candidates = [
      card.openalexUrl,
      card.doi ? `https://doi.org/${card.doi}` : null,
      card.landingPageUrl,
    ].filter((value): value is string => Boolean(value));
    urlsByCard.set(card.openalexId, candidates);
    for (const url of candidates) urls.add(url);
  }
  if (urls.size === 0) return normalizedCards;

  const rows = await withNeonWakeup(() => prisma.rawPoolItem.findMany({
    where: {
      sourceType: 'openalex',
      url: { in: [...urls] },
    },
    select: {
      id: true,
      url: true,
    },
  }));
  const sourceIdByUrl = new Map(rows.map(row => [row.url, row.id]));

  return normalizedCards.map(card => {
    const sourceItemId = (urlsByCard.get(card.openalexId) || [])
      .map(url => sourceIdByUrl.get(url))
      .find((value): value is string => Boolean(value)) || null;
    return {
      ...card,
      sourceItemId,
      sourceHref: internalPaperSourceHref(sourceItemId),
    };
  });
}

export function emptyPaperReferenceLookup(
  message: string,
  status: PaperReferenceStatus['status'] = 'unavailable',
): PaperReferenceLookup {
  return {
    cards: [],
    status: {
      status,
      cacheHit: false,
      fetchedAt: null,
      referencesTotal: 0,
      message,
      openalexWorkId: null,
      openalexWorkTitle: null,
      titleSimilarity: null,
      qualityIssue: paperReferenceQualityIssue(message),
    },
  };
}

function paperReferenceQualityIssue(message: string | null | undefined): PaperReferenceQualityIssue | null {
  if (message === 'openalex_reference_title_mismatch' || message === 'openalex_search_no_title_match') {
    return message;
  }
  return null;
}
