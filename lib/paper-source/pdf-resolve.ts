import type { PaperSourceRecord, PdfResolution } from './types';
import { extractArxivIdFromPaperIdentifiers, fetchOpenAlexBestPdfUrl } from './openalex';
import { mergePaperMetadata } from './storage';
import {
  asRecord,
  normalizeUrl,
  readString,
} from './utils';

// 回写 pdfUrl 失败（如 Neon 存储满拒写）不应让阅读路径崩；写不进就当未持久化，照常返回解析结果。
async function persistPdfUrl(sourceId: string, fields: { pdfUrl: string; pdfUrlSource: string }): Promise<boolean> {
  try {
    await mergePaperMetadata(sourceId, {
      pdfUrl: fields.pdfUrl,
      pdfUrlSource: fields.pdfUrlSource,
      pdfResolvedAt: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

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
    const persisted = persist ? await persistPdfUrl(source.id, { pdfUrl, pdfUrlSource: 'arxiv' }) : false;
    return {
      pdfUrl,
      source: 'arxiv',
      attemptedOpenAlex: false,
      persisted,
      message: null,
    };
  }

  const openalexResult = await fetchOpenAlexBestPdfUrl(metadata);
  if (openalexResult.pdfUrl) {
    const persisted = persist
      ? await persistPdfUrl(source.id, { pdfUrl: openalexResult.pdfUrl, pdfUrlSource: 'openalex_best_oa_location' })
      : false;
    return {
      pdfUrl: openalexResult.pdfUrl,
      source: 'openalex_best_oa_location',
      attemptedOpenAlex: true,
      persisted,
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
