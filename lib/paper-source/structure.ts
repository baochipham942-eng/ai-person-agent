import { prisma } from '@/lib/db/prisma';
import type { PaperGuide } from './schemas';
import { normalizeSectionType } from './schemas';
import type { PaperFigureCard, PaperStructureView } from './types';
import { buildFigureReaderInsight, toPaperFigureCard } from './figures';
import { isMissingPaperDocumentTable, withNeonWakeup } from './storage';
import { truncate } from './utils';

export async function getPaperStructureView(
  sourceId: string,
  guide?: PaperGuide,
): Promise<PaperStructureView> {
  try {
    const document = await withNeonWakeup(() => prisma.paperDocument.findUnique({
      where: { sourceItemId: sourceId },
      select: {
        id: true,
        status: true,
        parseVersion: true,
        parsedAt: true,
        pageCount: true,
        parseError: true,
      },
    }));
    if (!document) return guideStructureFallback(guide);

    const [sections, chunkCount] = await withNeonWakeup(() => Promise.all([
      prisma.paperSection.findMany({
        where: { paperId: document.id },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          sectionType: true,
          title: true,
          text: true,
          pageStart: true,
          pageEnd: true,
          orderIndex: true,
          _count: { select: { chunks: true } },
        },
      }),
      prisma.paperChunk.count({ where: { paperId: document.id } }),
    ]));

    return {
      status: normalizePaperStatus(document.status),
      source: 'paper_document',
      parseVersion: document.parseVersion,
      parsedAt: document.parsedAt?.toISOString() || null,
      pageCount: document.pageCount,
      sectionCount: sections.length,
      chunkCount,
      error: document.parseError,
      sections: sections.map(section => ({
        id: section.id,
        sectionType: normalizeSectionType(section.sectionType),
        title: section.title,
        pageStart: section.pageStart,
        pageEnd: section.pageEnd,
        orderIndex: section.orderIndex,
        textPreview: truncate(section.text, 220),
        chunkCount: section._count.chunks,
      })),
    };
  } catch (error) {
    if (isMissingPaperDocumentTable(error)) return guideStructureFallback(guide);
    throw error;
  }
}

export async function getPaperFigureCards(sourceId: string): Promise<PaperFigureCard[]> {
  try {
    const document = await withNeonWakeup(() => prisma.paperDocument.findUnique({
      where: { sourceItemId: sourceId },
      select: {
        figures: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            label: true,
            caption: true,
            pageNumber: true,
            orderIndex: true,
            imagePath: true,
          },
        },
      },
    }));
    return (document?.figures || []).map(figure => toPaperFigureCard({
      id: figure.id,
      label: figure.label,
      caption: figure.caption || '',
      pageNumber: figure.pageNumber,
      orderIndex: figure.orderIndex,
      imagePath: figure.imagePath,
      ...buildFigureReaderInsight(figure.label, figure.caption || ''),
    }));
  } catch (error) {
    if (isMissingPaperDocumentTable(error)) return [];
    throw error;
  }
}

function guideStructureFallback(guide?: PaperGuide): PaperStructureView {
  const sections = (guide?.readingPath || []).map((item, index) => ({
    id: `guide-fallback:${index}`,
    sectionType: item.sectionType,
    title: item.title,
    pageStart: null,
    pageEnd: null,
    orderIndex: index,
    textPreview: item.why,
    chunkCount: 0,
  }));

  return {
    status: 'missing',
    source: 'guide_fallback',
    parseVersion: null,
    parsedAt: null,
    pageCount: null,
    sectionCount: sections.length,
    chunkCount: 0,
    error: null,
    sections,
  };
}

function normalizePaperStatus(value: string | null | undefined): PaperStructureView['status'] {
  if (value === 'metadata_only' || value === 'parsed' || value === 'parse_failed' || value === 'pdf_fetch_failed') return value;
  return 'metadata_only';
}
