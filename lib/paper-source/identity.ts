import type { PaperSourceRecord } from './types';
import { openalexUrl } from './openalex';
import {
  extractArxivId,
  extractDoiKey,
  normalizeArxivVersionless,
  normalizeComparablePaperUrl,
  normalizeDoi,
  normalizePaperTitleKey,
  readString,
} from './utils';

export interface PaperIdentityKeys {
  urls: Set<string>;
  arxivIds: Set<string>;
  dois: Set<string>;
  titleKey: string;
}

export function buildPaperIdentityKeys(source: PaperSourceRecord, metadata: Record<string, unknown>): PaperIdentityKeys {
  const urls = new Set<string>();
  const arxivIds = new Set<string>();
  const dois = new Set<string>();

  const openalexWorkId = readString(metadata.openalexWorkId) || readString(metadata.openalexId);
  const doi = normalizeDoi(readString(metadata.doi));
  const values = [
    source.url,
    readString(metadata.landingPageUrl),
    readString(metadata.openalexUrl),
    readString(metadata.pdfUrl),
    openalexUrl(openalexWorkId),
    doi ? `https://doi.org/${doi}` : null,
  ];

  for (const value of values) {
    const url = normalizeComparablePaperUrl(value);
    if (url) urls.add(url);
    const arxivId = extractArxivId(value);
    if (arxivId) {
      arxivIds.add(normalizeArxivVersionless(arxivId));
      urls.add(`arxiv.org/abs/${normalizeArxivVersionless(arxivId)}`);
    }
    const extractedDoi = extractDoiKey(value);
    if (extractedDoi) dois.add(extractedDoi);
  }

  if (doi) dois.add(doi.toLowerCase());

  return {
    urls,
    arxivIds,
    dois,
    titleKey: normalizePaperTitleKey(source.title),
  };
}
