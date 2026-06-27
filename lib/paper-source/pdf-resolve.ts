import type { PaperSourceRecord, PdfResolution } from './types';
import { extractArxivIdFromPaperIdentifiers, fetchOpenAlexBestPdfUrl } from './openalex';
import { mergePaperMetadata } from './storage';
import {
  asRecord,
  normalizeUrl,
  readString,
} from './utils';

export async function resolvePdfUrl(source: PaperSourceRecord, options: { persist?: boolean } = {}): Promise<PdfResolution> {
  const persist = options.persist ?? true;
  const metadata = asRecord(source.metadata);
  const metadataPdfUrl = normalizeUrl(readString(metadata.pdfUrl));
  if (metadataPdfUrl) {
    return {
      pdfUrl: metadataPdfUrl,
      source: 'metadata',
      attemptedOpenAlex: false,
      persisted: false,
      message: null,
    };
  }

  const arxivId = extractArxivIdFromPaperIdentifiers({
    url: source.url,
    doi: readString(metadata.doi),
    openalexWorkId: readString(metadata.openalexWorkId) || readString(metadata.openalexId),
    landingPageUrl: readString(metadata.landingPageUrl),
  });
  if (arxivId) {
    const pdfUrl = `https://arxiv.org/pdf/${arxivId}`;
    if (persist) {
      await mergePaperMetadata(source.id, {
        pdfUrl,
        pdfUrlSource: 'arxiv',
        pdfResolvedAt: new Date().toISOString(),
      });
    }
    return {
      pdfUrl,
      source: 'arxiv',
      attemptedOpenAlex: false,
      persisted: persist,
      message: null,
    };
  }

  const openalexResult = await fetchOpenAlexBestPdfUrl(metadata);
  if (openalexResult.pdfUrl) {
    if (persist) {
      await mergePaperMetadata(source.id, {
        pdfUrl: openalexResult.pdfUrl,
        pdfUrlSource: 'openalex_best_oa_location',
        pdfResolvedAt: new Date().toISOString(),
      });
    }
    return {
      pdfUrl: openalexResult.pdfUrl,
      source: 'openalex_best_oa_location',
      attemptedOpenAlex: true,
      persisted: persist,
      message: null,
    };
  }

  return {
    pdfUrl: null,
    source: 'none',
    attemptedOpenAlex: openalexResult.attempted,
    persisted: false,
    message: openalexResult.message,
  };
}
