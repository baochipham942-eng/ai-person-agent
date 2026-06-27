import type { PaperSourceViewModel, PaperSourceViewModelOptions } from './types';
import { openalexUrl } from './openalex';
import { getPaperAuthorPeople, getPaperEntityReviewQueue } from './entity-review';
import { getCachedOrFallbackPaperGuide, getOrCreatePaperGuide } from './guide';
import { paperAbstract, readPaperAuthorNames } from './metadata';
import { listPaperNotesFromMetadata } from './notes';
import { resolvePdfUrl } from './pdf-resolve';
import { getOrCreatePaperReferenceCards } from './references';
import { getPaperRelatedThreads } from './related-threads';
import { getPaperRelatedWorks } from './related-works';
import { buildPaperSemanticReader } from './semantic-reader';
import { loadPaperSource } from './source';
import { getPaperFigureCards, getPaperStructureView } from './structure';
import {
  asRecord,
  formatDate,
  normalizeDoi,
  readNumber,
  readString,
} from './utils';

export async function getPaperSourceViewModel(id: string, options: PaperSourceViewModelOptions = {}): Promise<PaperSourceViewModel | null> {
  const source = await loadPaperSource(id);
  if (!source) return null;

  const metadata = asRecord(source.metadata);
  const pdfResolution = await resolvePdfUrl(source);
  const guide = options.generateGuide === false ? getCachedOrFallbackPaperGuide(source) : await getOrCreatePaperGuide(source);
  const structure = await getPaperStructureView(source.id, guide.data);
  const figures = await getPaperFigureCards(source.id);
  const referenceLookup = await getOrCreatePaperReferenceCards(source);
  const semanticReader = buildPaperSemanticReader(guide.data, structure, referenceLookup, figures);
  const notes = listPaperNotesFromMetadata(source.metadata);
  const entityReviewQueue = await getPaperEntityReviewQueue(source.id);
  const relatedThreads = await getPaperRelatedThreads(source);
  const relatedWorks = await getPaperRelatedWorks(source, guide.data, relatedThreads);
  const doi = normalizeDoi(readString(metadata.doi));
  const openalexWorkId = readString(metadata.openalexWorkId) || readString(metadata.openalexId);
  const landingPageUrl = readString(metadata.landingPageUrl) || source.url;
  const authors = readPaperAuthorNames(metadata);
  const authorBindings = await getPaperAuthorPeople(authors);

  return {
    source: {
      id: source.id,
      title: source.title,
      url: source.url,
      landingPageUrl,
      publishedAt: formatDate(source.publishedAt),
      sourceLabel: readString(metadata.sourceLabel) || readString(metadata.venue) || 'OpenAlex',
    },
    person: {
      id: source.person.id,
      name: source.person.name,
      avatarUrl: source.person.avatarUrl,
      currentTitle: source.person.currentTitle,
    },
    paper: {
      abstract: paperAbstract(source, metadata),
      authors,
      authorPeople: authorBindings.people,
      authorReviewCandidates: authorBindings.reviewCandidates,
      venue: readString(metadata.venue),
      citationCount: readNumber(metadata.citationCount) ?? readNumber(metadata.citedByCount),
      doi,
      openalexWorkId,
      openalexUrl: openalexUrl(openalexWorkId),
      pdfUrl: pdfResolution.pdfUrl,
      pdfProxyUrl: pdfResolution.pdfUrl ? `/api/source/paper/${source.id}/pdf` : null,
      pdfResolution,
    },
    guide,
    structure,
    semanticReader,
    notes,
    entityReviewQueue,
    relatedThreads,
    relatedWorks,
  };
}

export async function getOrCreatePaperGuideViewModel(sourceId: string): Promise<PaperSourceViewModel | null> {
  return getPaperSourceViewModel(sourceId, { generateGuide: true });
}
