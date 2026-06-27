import {
  DEFAULT_MAX_PDF_BYTES,
  DEFAULT_PDF_FETCH_RETRIES,
  DEFAULT_PDF_FETCH_TIMEOUT_MS,
} from './constants';
import type { ExtractedPdfPage, PdfExtractionOptions } from './types';
import {
  asRecord,
  clampMaxPdfBytes,
  clampParsePages,
  clampPdfFetchRetries,
  clampPdfFetchTimeoutMs,
  normalizePaperPdfFetchError,
  pdfFetchCandidateUrls,
  readString,
} from './utils';

export async function extractPdfPageText(pdfUrl: string, requestedPage: number): Promise<{ pageNumber: number; pageCount: number; text: string }> {
  const extracted = await extractPdfPagesText(pdfUrl, requestedPage, requestedPage);
  const page = extracted.pages[0];
  if (!page) throw new Error('paper_page_text_empty');
  return page;
}

export async function extractPdfPagesText(
  pdfUrl: string,
  maxPages: number,
  startPage = 1,
  options: PdfExtractionOptions = {},
): Promise<{ pageCount: number; pages: ExtractedPdfPage[] }> {
  const data = await fetchPdfBytes(pdfUrl, options);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  const documentInit = {
    data,
    disableFontFace: true,
    useSystemFonts: true,
  } as unknown as Parameters<typeof pdfjs.getDocument>[0];
  const loadingTask = pdfjs.getDocument(documentInit);

  try {
    const pdf = await loadingTask.promise as {
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{ items: unknown[] }>;
      }>;
    };
    const firstPage = Math.min(Math.max(1, startPage), pdf.numPages);
    const lastPage = Math.min(pdf.numPages, Math.max(firstPage, firstPage + clampParsePages(maxPages) - 1));
    const pages: ExtractedPdfPage[] = [];
    for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = normalizePdfTextItems(content.items);
      if (text) pages.push({ pageNumber, pageCount: pdf.numPages, text });
    }
    if (pages.length === 0) throw new Error('paper_page_text_empty');
    return { pageCount: pdf.numPages, pages };
  } finally {
    await loadingTask.destroy?.();
  }
}

async function fetchPdfBytes(pdfUrl: string, options: PdfExtractionOptions = {}): Promise<Uint8Array> {
  const timeoutMs = clampPdfFetchTimeoutMs(options.fetchTimeoutMs ?? DEFAULT_PDF_FETCH_TIMEOUT_MS);
  const retryCount = clampPdfFetchRetries(options.fetchRetries ?? DEFAULT_PDF_FETCH_RETRIES);
  const maxPdfBytes = clampMaxPdfBytes(options.maxPdfBytes ?? DEFAULT_MAX_PDF_BYTES);
  const candidateUrls = pdfFetchCandidateUrls(pdfUrl);
  let lastError: unknown = null;

  for (const candidateUrl of candidateUrls) {
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        const contentLength = await fetchPdfContentLength(candidateUrl, timeoutMs);
        if (contentLength && contentLength > maxPdfBytes) {
          throw new Error(`paper_pdf_too_large:${contentLength}`);
        }
        const response = await fetch(candidateUrl, {
          redirect: 'follow',
          headers: {
            Accept: 'application/pdf,*/*;q=0.8',
            'User-Agent': 'ai-person-agent/0.5.0 paper-source-workspace',
          },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) throw new Error(`paper_pdf_fetch_${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > maxPdfBytes) throw new Error(`paper_pdf_too_large:${bytes.byteLength}`);
        return bytes;
      } catch (error) {
        lastError = error;
        if (error instanceof Error && error.message.startsWith('paper_pdf_too_large:')) throw error;
      }
    }
  }

  throw new Error(normalizePaperPdfFetchError(lastError));
}

async function fetchPdfContentLength(pdfUrl: string, timeoutMs: number): Promise<number | null> {
  try {
    const response = await fetch(pdfUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        Accept: 'application/pdf,*/*;q=0.8',
        'User-Agent': 'ai-person-agent/0.5.0 paper-source-workspace',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const value = response.headers.get('content-length');
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function normalizePdfTextItems(items: unknown[]): string {
  const parts: string[] = [];
  let previousY: number | null = null;

  for (const item of items) {
    const record = asRecord(item);
    const str = readString(record.str);
    if (!str) continue;
    const transform = Array.isArray(record.transform) ? record.transform : [];
    const y = typeof transform[5] === 'number' ? transform[5] : null;
    if (previousY !== null && y !== null && Math.abs(previousY - y) > 8) parts.push('\n');
    parts.push(str);
    previousY = y;
  }

  return parts
    .join(' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
