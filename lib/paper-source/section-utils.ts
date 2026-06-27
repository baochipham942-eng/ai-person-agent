import {
  CHUNK_TARGET_CHARS,
  MAX_CACHED_PAGE_TEXT_CHARS,
} from './constants';
import type { PaperGuideSectionType } from './schemas';
import type {
  ExtractedPdfPage,
  PaperChunkDraft,
  PaperSectionDraft,
  PaperSourceRecord,
  PaperStructureSection,
} from './types';
import { paperAbstractFromText } from './metadata';
import {
  estimateTokens,
  hasSpacedHeading,
  hashText,
  normalizeSectionDetectionText,
  sectionTypeLabel,
  titleCaseHeading,
  truncate,
  truncatePageText,
} from './utils';

export function buildPaperSectionDrafts(input: {
  source: PaperSourceRecord;
  abstract: string;
  pages: ExtractedPdfPage[];
}): PaperSectionDraft[] {
  const sections: PaperSectionDraft[] = [];
  const abstractText = paperAbstractFromText(input.abstract);
  if (abstractText && input.pages.length === 0) {
    sections.push({
      sectionType: 'abstract',
      title: 'Abstract',
      text: abstractText,
      pageStart: input.pages.length ? 1 : null,
      pageEnd: input.pages.length ? 1 : null,
      orderIndex: sections.length,
    });
  }

  for (const page of input.pages) {
    const text = truncatePageText(page.text, MAX_CACHED_PAGE_TEXT_CHARS);
    if (!text || text.length < 40) continue;
    const heading = detectPaperHeading(text);
    const sectionType = heading?.sectionType || classifyPaperSectionType(text);
    const title = heading?.title || `${sectionTypeLabel(sectionType)} · Page ${page.pageNumber}`;
    sections.push({
      sectionType,
      title,
      text,
      pageStart: page.pageNumber,
      pageEnd: page.pageNumber,
      orderIndex: sections.length,
    });
  }

  if (sections.length === 0) {
    sections.push({
      sectionType: 'other',
      title: input.source.title,
      text: input.source.title,
      pageStart: null,
      pageEnd: null,
      orderIndex: 0,
    });
  }

  return sections;
}

export function buildPaperChunkDrafts(sections: PaperSectionDraft[]): PaperChunkDraft[] {
  const chunks: PaperChunkDraft[] = [];
  for (const section of sections) {
    const parts = splitIntoTextChunks(section.text, CHUNK_TARGET_CHARS);
    for (const part of parts) {
      chunks.push({
        sectionOrderIndex: section.orderIndex,
        text: part,
        pageNumber: section.pageStart,
        chunkIndex: chunks.length,
        anchorHint: {
          sectionType: section.sectionType,
          sectionTitle: section.title,
          pageStart: section.pageStart,
          pageEnd: section.pageEnd,
        },
        tokenEstimate: estimateTokens(part),
        textHash: hashText(part),
      });
    }
  }
  return chunks;
}

export function classifyPaperSectionType(text: string): PaperGuideSectionType {
  const lower = normalizeSectionDetectionText(text);
  if (/\babstract\b/.test(lower) || hasSpacedHeading(text, 'abstract')) return 'abstract';
  if (/\b(limitations?|limitations and future work|threats? to validity|failure cases?|future work|broader impacts?)\b/.test(lower)) return 'limitation';
  if (/\b(main results?|results?|discussion|conclusion|findings?|analysis)\b/.test(lower)) return 'result';
  if (/\b(experiments?|evaluation|benchmark|benchmarks|ablation|empirical|case stud(?:y|ies)|datasets?)\b/.test(lower)) return 'experiment';
  if (/\b(position\s+\d|design space|system architecture|architecture|methods?|methodology|approach|algorithm|training|implementation|preliminaries|framework|model architecture|data pipeline|reinforcement learning|policy optimization)\b/.test(lower)) return 'method';
  if (/\b(introduction|problem|motivation|background|objective|setting)\b/.test(lower)) return 'problem';
  if (/\b(novelty|contribution|we propose|we introduce|our contributions?)\b/.test(lower)) return 'result';
  return 'other';
}

function detectPaperHeading(text: string): { title: string; sectionType: PaperGuideSectionType } | null {
  const earlyText = text.slice(0, 1_200);
  if (hasSpacedHeading(earlyText, 'abstract') || /^\s*abstract\b/i.test(normalizeSectionDetectionText(earlyText))) {
    return { title: 'Abstract', sectionType: 'abstract' };
  }

  const lines = text
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 24);

  for (const line of lines) {
    const normalizedLine = normalizeSectionDetectionText(line);
    if (line.length > 120 && !/^(?:abstract|introduction|background|method|approach|experiments?|evaluation|results?|discussion|limitations?|conclusion)\b/i.test(normalizedLine)) continue;
    const match = normalizedLine.match(/^(?:\d+(?:\.\d+)*\.?\s+)?(abstract|introduction|background|related work|method|methods|methodology|approach|architecture|algorithm|experiments?|evaluation|results?|main results|discussion|analysis|limitations?|conclusion|future work|references)\b[:.\s-]*(.*)$/i);
    if (!match) continue;
    const head = `${match[1]} ${match[2] || ''}`.replace(/\s+/g, ' ').trim();
    const sectionType = classifyPaperSectionType(match[1]);
    return {
      title: sectionType === 'abstract' ? 'Abstract' : titleCaseHeading(head),
      sectionType,
    };
  }

  return null;
}

function splitIntoTextChunks(text: string, targetChars: number): string[] {
  const units = text
    .split(/\n{2,}|\n(?=[A-Z0-9])/)
    .map(unit => unit.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const unit of units.length ? units : [text]) {
    const pieces = unit.length > targetChars * 1.4 ? hardSplit(unit, targetChars) : [unit];
    for (const piece of pieces) {
      if (!current) {
        current = piece;
      } else if (current.length + piece.length + 2 <= targetChars) {
        current = `${current}\n\n${piece}`;
      } else {
        chunks.push(current);
        current = piece;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function hardSplit(text: string, targetChars: number): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += targetChars) {
    chunks.push(text.slice(start, start + targetChars).trim());
  }
  return chunks.filter(Boolean);
}

export function summarizeSectionDrafts(
  sections: PaperSectionDraft[],
  chunks: PaperChunkDraft[],
): PaperStructureSection[] {
  const chunkCounts = chunks.reduce((map, chunk) => {
    map.set(chunk.sectionOrderIndex, (map.get(chunk.sectionOrderIndex) || 0) + 1);
    return map;
  }, new Map<number, number>());

  return sections.map(section => ({
    id: section.id || `draft-section:${section.orderIndex}`,
    sectionType: section.sectionType,
    title: section.title,
    pageStart: section.pageStart,
    pageEnd: section.pageEnd,
    orderIndex: section.orderIndex,
    textPreview: truncate(section.text, 220),
    chunkCount: chunkCounts.get(section.orderIndex) || 0,
  }));
}
