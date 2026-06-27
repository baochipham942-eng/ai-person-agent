import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import {
  DEFAULT_MAX_PDF_BYTES,
  DEFAULT_PARSE_MAX_PAGES,
  DEFAULT_PDF_FETCH_RETRIES,
  DEFAULT_PDF_FETCH_TIMEOUT_MS,
  PAPER_PARSE_VERSION,
} from './constants';
import type {
  ExtractedPdfPage,
  PaperChunkDraft,
  PaperFigureDraft,
  PaperMaterializationOptions,
  PaperMaterializationResult,
  PaperSectionDraft,
  PaperSourceRecord,
  PaperStructureView,
} from './types';
import { buildPaperFigureDrafts, toPaperFigureCard } from './figures';
import { paperAbstract, readPaperAuthorNames } from './metadata';
import { extractPdfPagesText } from './pdf-extract';
import { resolvePdfUrl } from './pdf-resolve';
import { loadPaperSource } from './source';
import {
  buildPaperChunkDrafts,
  buildPaperSectionDrafts,
  summarizeSectionDrafts,
} from './section-utils';
import { withNeonWakeup } from './storage';
import {
  asRecord,
  clampMaxPdfBytes,
  clampParsePages,
  clampPdfFetchRetries,
  clampPdfFetchTimeoutMs,
  hashText,
  normalizeDoi,
  normalizePaperParseError,
  readNumber,
  readString,
} from './utils';

export async function materializePaperDocument(
  sourceId: string,
  options: PaperMaterializationOptions = {},
): Promise<PaperMaterializationResult | null> {
  const source = await loadPaperSource(sourceId);
  if (!source) return null;

  const dryRun = Boolean(options.dryRun);
  const materialized = await buildPaperMaterialization(source, options);
  if (dryRun) {
    return toPaperMaterializationResult(materialized, source.id, null, true);
  }

  const metadata = asRecord(source.metadata);
  const authors = readPaperAuthorNames(metadata);
  const doi = normalizeDoi(readString(metadata.doi));
  const openalexId = readString(metadata.openalexWorkId) || readString(metadata.openalexId);
  const citationCount = readNumber(metadata.citationCount) ?? readNumber(metadata.citedByCount) ?? 0;
  const now = new Date();

  const paperId = await withNeonWakeup(async () => {
    const document = await prisma.$transaction(async tx => {
      const persisted = await tx.paperDocument.upsert({
        where: { sourceItemId: source.id },
        update: {
          openalexId,
          doi,
          title: source.title,
          abstract: materialized.abstract,
          pdfUrl: materialized.pdfUrl,
          landingPageUrl: materialized.landingPageUrl,
          authors: authors as Prisma.InputJsonValue,
          venue: readString(metadata.venue),
          citationCount,
          status: materialized.status,
          parseVersion: PAPER_PARSE_VERSION,
          pageCount: materialized.pageCount,
          textHash: materialized.textHash,
          parseError: materialized.parseError,
          parsedAt: now,
          metadata: materialized.metadata as Prisma.InputJsonValue,
        },
        create: {
          sourceItemId: source.id,
          openalexId,
          doi,
          title: source.title,
          abstract: materialized.abstract,
          pdfUrl: materialized.pdfUrl,
          landingPageUrl: materialized.landingPageUrl,
          authors: authors as Prisma.InputJsonValue,
          venue: readString(metadata.venue),
          citationCount,
          status: materialized.status,
          parseVersion: PAPER_PARSE_VERSION,
          pageCount: materialized.pageCount,
          textHash: materialized.textHash,
          parseError: materialized.parseError,
          parsedAt: now,
          metadata: materialized.metadata as Prisma.InputJsonValue,
        },
      });

      await tx.paperFigure.deleteMany({ where: { paperId: persisted.id } });
      await tx.paperChunk.deleteMany({ where: { paperId: persisted.id } });
      await tx.paperSection.deleteMany({ where: { paperId: persisted.id } });

      const sectionIdByOrder = new Map<number, string>();
      const sectionRows = materialized.sections.map(section => {
        const sectionId = `paper-section:${persisted.id}:${section.orderIndex}`;
        sectionIdByOrder.set(section.orderIndex, sectionId);
        return {
          id: sectionId,
          paperId: persisted.id,
          sectionType: section.sectionType,
          title: section.title,
          text: section.text,
          pageStart: section.pageStart,
          pageEnd: section.pageEnd,
          orderIndex: section.orderIndex,
        };
      });
      if (sectionRows.length) await tx.paperSection.createMany({ data: sectionRows });

      const chunkRows = materialized.chunks.map(chunk => ({
        id: `paper-chunk:${persisted.id}:${chunk.chunkIndex}`,
        paperId: persisted.id,
        sectionId: sectionIdByOrder.get(chunk.sectionOrderIndex) || null,
        text: chunk.text,
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        anchorHint: chunk.anchorHint as Prisma.InputJsonValue,
        tokenEstimate: chunk.tokenEstimate,
        textHash: chunk.textHash,
      }));
      if (chunkRows.length) await tx.paperChunk.createMany({ data: chunkRows });

      const figureRows = materialized.figures.map(figure => ({
        id: `paper-figure:${persisted.id}:${figure.orderIndex}`,
        paperId: persisted.id,
        label: figure.label,
        caption: figure.caption,
        pageNumber: figure.pageNumber,
        bbox: Prisma.JsonNull,
        imagePath: figure.imagePath,
        orderIndex: figure.orderIndex,
      }));
      if (figureRows.length) await tx.paperFigure.createMany({ data: figureRows });

      return persisted;
    }, { maxWait: 10_000, timeout: 60_000 });
    return document.id;
  });

  return toPaperMaterializationResult(materialized, source.id, paperId, false);
}

function toPaperMaterializationResult(
  materialized: Awaited<ReturnType<typeof buildPaperMaterialization>>,
  sourceId: string,
  paperId: string | null,
  dryRun: boolean,
): PaperMaterializationResult {
  return {
    sourceId,
    paperId,
    dryRun,
    status: materialized.status,
    parseVersion: materialized.parseVersion,
    pdfUrl: materialized.pdfUrl,
    pageCount: materialized.pageCount,
    sectionCount: materialized.sections.length,
    chunkCount: materialized.chunks.length,
    figureCount: materialized.figures.length,
    textHash: materialized.textHash,
    parseError: materialized.parseError,
    sections: summarizeSectionDrafts(materialized.sections, materialized.chunks),
    figures: materialized.figures.map(toPaperFigureCard),
  };
}

async function buildPaperMaterialization(
  source: PaperSourceRecord,
  options: PaperMaterializationOptions,
): Promise<{
  status: Exclude<PaperStructureView['status'], 'missing'>;
  parseVersion: string;
  pdfUrl: string | null;
  landingPageUrl: string;
  abstract: string;
  pageCount: number | null;
  textHash: string;
  parseError: string | null;
  metadata: Record<string, unknown>;
  sections: PaperSectionDraft[];
  chunks: PaperChunkDraft[];
  figures: PaperFigureDraft[];
}> {
  const metadata = asRecord(source.metadata);
  const abstract = paperAbstract(source, metadata);
  const landingPageUrl = readString(metadata.landingPageUrl) || source.url;
  const resolution = await resolvePdfUrl(source, { persist: !options.dryRun });
  const maxPages = clampParsePages(options.maxPages ?? DEFAULT_PARSE_MAX_PAGES);
  let status: Exclude<PaperStructureView['status'], 'missing'> = resolution.pdfUrl ? 'parse_failed' : 'metadata_only';
  let pageCount: number | null = null;
  let parseError: string | null = resolution.pdfUrl ? null : resolution.message;
  let pages: ExtractedPdfPage[] = [];

	  if (resolution.pdfUrl) {
	    try {
	      const extracted = await extractPdfPagesText(resolution.pdfUrl, maxPages, 1, {
	        fetchTimeoutMs: options.pdfFetchTimeoutMs,
	        fetchRetries: options.pdfFetchRetries,
	        maxPdfBytes: options.maxPdfBytes,
	      });
	      pages = extracted.pages;
	      pageCount = extracted.pageCount;
      status = pages.length > 0 ? 'parsed' : 'parse_failed';
      parseError = pages.length > 0 ? null : 'paper_pdf_text_empty';
    } catch (error) {
	      const message = normalizePaperParseError(error);
	      status = message.startsWith('paper_pdf_fetch') || message.startsWith('paper_pdf_too_large')
	        ? 'pdf_fetch_failed'
	        : 'parse_failed';
	      parseError = message;
	    }
  }

  const sections = buildPaperSectionDrafts({ source, abstract, pages });
  const chunks = buildPaperChunkDrafts(sections);
  const figures = buildPaperFigureDrafts(pages);
  const textHash = hashText(sections.map(section => section.text).join('\n\n'));

  return {
    status,
    parseVersion: PAPER_PARSE_VERSION,
    pdfUrl: resolution.pdfUrl,
    landingPageUrl,
    abstract,
    pageCount,
    textHash,
    parseError,
	    metadata: {
	      pdfResolution: resolution,
	      parsedPageLimit: maxPages,
	      pdfFetchTimeoutMs: clampPdfFetchTimeoutMs(options.pdfFetchTimeoutMs ?? DEFAULT_PDF_FETCH_TIMEOUT_MS),
	      pdfFetchRetries: clampPdfFetchRetries(options.pdfFetchRetries ?? DEFAULT_PDF_FETCH_RETRIES),
	      maxPdfBytes: clampMaxPdfBytes(options.maxPdfBytes ?? DEFAULT_MAX_PDF_BYTES),
	      parsedPageCount: pages.length,
	      sourceType: source.sourceType,
	    },
    sections,
    chunks,
    figures,
  };
}
