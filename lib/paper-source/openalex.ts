import {
  OPENALEX_MAILTO,
  OPENALEX_WORKS_URL,
} from './constants';
import type { OpenAlexLookupCandidate, PaperSourceRecord } from './types';
import {
  asRecord,
  cleanText,
  extractArxivId,
  extractDoiKey,
  hashText,
  normalizeDoi,
  normalizeUrl,
  readString,
} from './utils';

export function extractArxivIdFromPaperIdentifiers(input: {
  url?: string | null;
  doi?: string | null;
  openalexWorkId?: string | null;
  landingPageUrl?: string | null;
}): string | null {
  for (const value of [input.url, input.doi, input.openalexWorkId, input.landingPageUrl]) {
    const id = extractArxivId(value);
    if (id) return id;
  }
  return null;
}

export async function fetchOpenAlexBestPdfUrl(metadata: Record<string, unknown>): Promise<{ attempted: boolean; pdfUrl: string | null; message: string | null }> {
  const lookupUrl = openAlexLookupUrl(metadata);
  if (!lookupUrl) {
    return { attempted: false, pdfUrl: null, message: 'missing_openalex_identifier' };
  }

  try {
    const response = await fetch(lookupUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `ai-person-agent/0.5.0 (mailto:${OPENALEX_MAILTO})`,
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      return { attempted: true, pdfUrl: null, message: `openalex_http_${response.status}` };
    }
    const work = asRecord(await response.json());
    const bestLocation = asRecord(work.best_oa_location);
    const bestPdfUrl = normalizeUrl(readString(bestLocation.pdf_url));
    if (bestPdfUrl) return { attempted: true, pdfUrl: bestPdfUrl, message: null };

    const primaryLocation = asRecord(work.primary_location);
    const primaryPdfUrl = normalizeUrl(readString(primaryLocation.pdf_url));
    if (primaryPdfUrl) return { attempted: true, pdfUrl: primaryPdfUrl, message: null };

    return { attempted: true, pdfUrl: null, message: 'openalex_no_pdf_url' };
  } catch (error) {
    return {
      attempted: true,
      pdfUrl: null,
      message: error instanceof Error ? error.message : 'openalex_fetch_failed',
    };
  }
}

export function openAlexLookupCandidates(source: PaperSourceRecord, metadata: Record<string, unknown>): OpenAlexLookupCandidate[] {
  const candidates: OpenAlexLookupCandidate[] = [];
  const seen = new Set<string>();
  const add = (candidate: OpenAlexLookupCandidate | null) => {
    if (!candidate || seen.has(candidate.key)) return;
    seen.add(candidate.key);
    candidates.push(candidate);
  };

  add(openAlexLookupCandidateFromWorkId(readString(metadata.openalexWorkId) || readString(metadata.openalexId)));
  add(openAlexLookupCandidateFromDoi(readString(metadata.doi)));
  add(openAlexLookupCandidateFromDoi(extractDoiKey(source.url)));
  add(openAlexLookupCandidateFromDoi(readString(metadata.landingPageUrl)));

  const arxivId = extractArxivIdFromPaperIdentifiers({
    url: source.url,
    doi: readString(metadata.doi),
    openalexWorkId: readString(metadata.openalexWorkId) || readString(metadata.openalexId),
    landingPageUrl: readString(metadata.landingPageUrl),
  });
  add(openAlexLookupCandidateFromDoi(arxivId ? `10.48550/arXiv.${arxivId.replace(/v\d+$/i, '')}` : null));
  add(openAlexLookupCandidateFromTitle(source.title));

  return candidates;
}

export function openAlexLookupUrl(metadata: Record<string, unknown>): string | null {
  const openalexWorkId = readString(metadata.openalexWorkId) || readString(metadata.openalexId);
  const doi = readString(metadata.doi);
  return openAlexLookupCandidateFromWorkId(openalexWorkId)?.url
    || openAlexLookupCandidateFromDoi(doi)?.url
    || null;
}

export function openAlexLookupCandidateFromWorkId(value: string | null): OpenAlexLookupCandidate | null {
  const openalexWorkId = cleanOpenAlexWorkId(value);
  const params = new URLSearchParams({ mailto: OPENALEX_MAILTO });
  if (process.env.OPENALEX_API_KEY) params.set('api_key', process.env.OPENALEX_API_KEY);
  return openalexWorkId
    ? {
      key: `openalex:${openalexWorkId}`,
      url: `${OPENALEX_WORKS_URL}/${openalexWorkId}?${params}`,
      openalexWorkId,
    }
    : null;
}

export function openAlexLookupCandidateFromDoi(value: string | null): OpenAlexLookupCandidate | null {
  const doi = normalizeDoi(value);
  const params = new URLSearchParams({ mailto: OPENALEX_MAILTO });
  if (process.env.OPENALEX_API_KEY) params.set('api_key', process.env.OPENALEX_API_KEY);
  return doi
    ? {
      key: `doi:${doi.toLowerCase()}`,
      url: `${OPENALEX_WORKS_URL}/doi:${encodeURIComponent(doi)}?${params}`,
      openalexWorkId: null,
    }
    : null;
}

export function openAlexLookupCandidateFromTitle(value: string | null | undefined): OpenAlexLookupCandidate | null {
  const title = cleanText(value || '');
  if (title.length < 12) return null;
  const params = new URLSearchParams({
    search: title,
    per_page: '5',
    mailto: OPENALEX_MAILTO,
  });
  if (process.env.OPENALEX_API_KEY) params.set('api_key', process.env.OPENALEX_API_KEY);
  return {
    key: `title:${hashText(title)}`,
    url: `${OPENALEX_WORKS_URL}?${params}`,
    openalexWorkId: null,
  };
}

export function cleanOpenAlexWorkId(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(?:openalex\.org\/)?(W\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

export function cleanOpenAlexAuthorId(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(?:openalex\.org\/)?(A\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

export function openalexUrl(value: string | null): string | null {
  if (!value) return null;
  const workId = cleanOpenAlexWorkId(value);
  if (workId) return `https://openalex.org/${workId}`;
  if (value.startsWith('http')) return value;
  return null;
}
