import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const paperSourcePath = new URL('../../lib/paper-source.ts', import.meta.url);
const paperSourceImplementationPaths = [
  '../../lib/paper-source.ts',
  '../../lib/paper-source/constants.ts',
  '../../lib/paper-source/schemas.ts',
  '../../lib/paper-source/types.ts',
  '../../lib/paper-source/view-model.ts',
  '../../lib/paper-source/llm.ts',
  '../../lib/paper-source/pdf-resolve.ts',
  '../../lib/paper-source/guide.ts',
  '../../lib/paper-source/translation.ts',
  '../../lib/paper-source/pdf-extract.ts',
  '../../lib/paper-source/materialization.ts',
  '../../lib/paper-source/figures.ts',
  '../../lib/paper-source/structure.ts',
  '../../lib/paper-source/section-utils.ts',
  '../../lib/paper-source/chat.ts',
  '../../lib/paper-source/references.ts',
  '../../lib/paper-source/related-threads.ts',
  '../../lib/paper-source/related-works.ts',
  '../../lib/paper-source/entity-review.ts',
  '../../lib/paper-source/semantic-reader.ts',
  '../../lib/paper-source/notes.ts',
  '../../lib/paper-source/source.ts',
  '../../lib/paper-source/openalex.ts',
  '../../lib/paper-source/identity.ts',
  '../../lib/paper-source/metadata.ts',
  '../../lib/paper-source/storage.ts',
  '../../lib/paper-source/utils.ts',
].map(item => new URL(item, import.meta.url));
const paperWorkspacePath = new URL('../../components/source/PaperSourceWorkspace.tsx', import.meta.url);
const paperPagePath = new URL('../../app/source/paper/[id]/page.tsx', import.meta.url);
const paperPdfRoutePath = new URL('../../app/api/source/paper/[id]/pdf/route.ts', import.meta.url);
const paperGuideRoutePath = new URL('../../app/api/source/paper/[id]/guide/route.ts', import.meta.url);
const paperTranslateRoutePath = new URL('../../app/api/source/paper/[id]/translate/route.ts', import.meta.url);
const paperChatRoutePath = new URL('../../app/api/source/paper/[id]/chat/route.ts', import.meta.url);
const paperNotesRoutePath = new URL('../../app/api/source/paper/[id]/notes/route.ts', import.meta.url);
const paperMaterializeScriptPath = new URL('../../scripts/paper/materialize_paper_documents.ts', import.meta.url);
const paperReferenceMaterializeScriptPath = new URL('../../scripts/paper/materialize_paper_references.ts', import.meta.url);
const paperDocumentAuditScriptPath = new URL('../../scripts/paper/audit_paper_document_materialization.ts', import.meta.url);
const paperWorkspaceRolloutAuditScriptPath = new URL('../../scripts/paper/audit_paper_workspace_rollout.ts', import.meta.url);
const paperThreadLinkScriptPath = new URL('../../scripts/paper/link_paper_foundations_to_threads.ts', import.meta.url);
const productEvidenceScriptPath = new URL('../../scripts/paper/materialize_product_evidence_sources.ts', import.meta.url);
const productEvidenceReviewScriptPath = new URL('../../scripts/paper/review_product_evidence_sources.ts', import.meta.url);
const productEvidenceApplyScriptPath = new URL('../../scripts/paper/apply_product_evidence_decisions.ts', import.meta.url);
const paperAuthorshipEnrichScriptPath = new URL('../../scripts/paper/enrich_paper_authorships.ts', import.meta.url);
const paperEntityReviewScriptPath = new URL('../../scripts/paper/materialize_paper_entity_reviews.ts', import.meta.url);
const paperEntityReviewQueueScriptPath = new URL('../../scripts/paper/review_paper_entity_reviews.ts', import.meta.url);
const paperEntityReviewApplyScriptPath = new URL('../../scripts/paper/apply_paper_entity_review_decisions.ts', import.meta.url);
const threadSeedScriptPath = new URL('../../scripts/threads/seed_threads_to_db.ts', import.meta.url);
const productsPath = new URL('../../lib/products.ts', import.meta.url);
const workPageViewPath = new URL('../../components/work/WorkPageView.tsx', import.meta.url);
const knowledgeThreadsPath = new URL('../../lib/knowledge-threads.ts', import.meta.url);
const threadPageBlocksPath = new URL('../../components/knowledge/ThreadPageBlocks.tsx', import.meta.url);
const threadFixturePath = new URL('../../lib/knowledge-thread-fixtures/loop-engineering.ts', import.meta.url);
const prismaSchemaPath = new URL('../../prisma/schema.prisma', import.meta.url);
const featuredCardsPath = new URL('../../lib/home/featured-cards.ts', import.meta.url);
const featuredWorksPath = new URL('../../components/person/sections/FeaturedWorks.tsx', import.meta.url);
const personPagePath = new URL('../../app/person/[id]/page.tsx', import.meta.url);

async function readPaperSourceImplementationText() {
  const parts = await Promise.all(paperSourceImplementationPaths.map(file => readFile(file, 'utf8')));
  return parts.join('\n\n');
}

function sampleGuide() {
  return {
    summary: 'A paper about tool-using agents.',
    problem: 'How agents use tools.',
    novelty: 'A structured agent loop.',
    method: 'Prompted planning and tool execution.',
    experiments: 'The abstract does not provide stable numbers.',
    limitations: 'The abstract does not provide limitations.',
    readingPath: [
      { title: 'Read abstract', sectionType: 'abstract', why: 'Sets the scope.', anchor: null },
    ],
    fit: {
      whoShouldRead: 'AI agent readers.',
      whyRelevantToProduct: 'It supports the source graph.',
    },
  };
}

test('paper source helpers derive arXiv PDFs and validate guide cache keys', async () => {
  const paperSource = await import(paperSourcePath.href);

  assert.equal(
    paperSource.extractArxivIdFromPaperIdentifiers({ url: 'https://arxiv.org/abs/2506.12345v2' }),
    '2506.12345v2',
  );
  assert.equal(
    paperSource.extractArxivIdFromPaperIdentifiers({ doi: 'https://doi.org/10.48550/arXiv.1706.03762' }),
    '1706.03762',
  );
  assert.equal(
    paperSource.extractArxivIdFromPaperIdentifiers({ openalexWorkId: 'arXiv:cs/9308101v1' }),
    'cs/9308101v1',
  );
  assert.equal(paperSource.normalizeAuthorNameKey('Geoffrey E. Hinton'), 'geoffrey hinton');
  assert.equal(paperSource.internalPaperSourceHref('raw-123'), '/source/paper/raw-123');
  assert.equal(paperSource.sanitizePaperTextForStorage('alpha\u0000beta\u0007gamma'), 'alphabeta gamma');
  assert.equal(paperSource.classifyPaperSectionType('Main Results show strong benchmark improvements.'), 'result');
  assert.equal(paperSource.classifyPaperSectionType('A BSTRACT We introduce a new training recipe.'), 'abstract');
  assert.equal(paperSource.PAPER_CHAT_PROMPT_VERSION, 'paper-chat-v4');
  assert.equal(paperSource.PAPER_REFERENCES_CACHE_VERSION, 'paper-references-v3');
  const previousPaperLlmChain = process.env.PAPER_LLM_CHAIN;
  delete process.env.PAPER_LLM_CHAIN;
  assert.deepEqual(paperSource.paperLlmChain(), ['mimo', 'minimax']);
  process.env.PAPER_LLM_CHAIN = 'minimax,mimo';
  assert.deepEqual(paperSource.paperLlmChain(), ['minimax', 'mimo']);
  if (previousPaperLlmChain === undefined) delete process.env.PAPER_LLM_CHAIN;
  else process.env.PAPER_LLM_CHAIN = previousPaperLlmChain;
  assert.equal(
    paperSource.comparePaperTitles('Transformer-XL', 'Transformer-XL: Attentive Language Models beyond a Fixed-Length Context') >= 0.85,
    true,
  );
  assert.equal(
    paperSource.comparePaperTitles(
      'DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models',
      'BioXP-0.5B: Explainable Medical-AI via RL-GRPO',
    ),
    0,
  );
  assert.equal(
    paperSource.selectOpenAlexWorkFromLookupPayload({
      results: [
        { id: 'https://openalex.org/W1', title: 'BioXP-0.5B: Explainable Medical-AI via RL-GRPO', cited_by_count: 100 },
        { id: 'https://openalex.org/W2', title: 'DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models', cited_by_count: 1 },
      ],
    }, 'DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models').id,
    'https://openalex.org/W2',
  );
  assert.equal(
    paperSource.selectOpenAlexWorkFromLookupPayload({
      results: [
        { id: 'https://openalex.org/W1', title: 'Comparative Evaluation of Advanced AI Reasoning Models in Pediatric Clinical Decision Support: ChatGPT O1 vs. DeepSeek-R1', cited_by_count: 100 },
      ],
    }, 'DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning'),
    null,
  );
  assert.equal(
    paperSource.isPaperCitationQuoteGrounded('The method uses retrieval augmented generation for grounded answers.', 'retrieval augmented generation'),
    true,
  );
  assert.equal(
    paperSource.isPaperCitationQuoteGrounded(
      'Evaluation plays a central role in this work. Rather than relying on narrow benchmark comparisons, Tiny Aya is assessed across a comprehensive multilingual suite.',
      'Evaluation plays a central role in this work. Rather than relying on narrow benchmark comparisons, Tiny Aya is assessed across a comprehensive multilingual suite...',
    ),
    true,
  );
  assert.equal(
    paperSource.isPaperCitationQuoteGrounded('The method uses retrieval augmented generation for grounded answers.', 'invented benchmark result'),
    false,
  );
  assert.equal(
    paperSource.groundPaperCitationQuote('The method uses retrieval augmented generation for grounded answers.', 'retrieval augmented generation'),
    'retrieval augmented generation',
  );
  assert.equal(
    paperSource.groundPaperCitationQuote('The method uses retrieval augmented generation for grounded answers.', 'invented benchmark result'),
    'The method uses retrieval augmented generation for grounded answers.',
  );
  assert.equal(paperSource.normalizePaperChatCitationQuote('  alpha\n\n beta  '), 'alpha beta');
  assert.equal(paperSource.normalizePaperChatCitationQuote('   '), null);
  assert.equal(paperSource.normalizePaperChatCitationQuote('x'.repeat(1700)).length, 1600);

  const cache = {
    promptVersion: paperSource.PAPER_GUIDE_PROMPT_VERSION,
    abstractHash: 'abc123',
    generatedAt: '2026-06-26T00:00:00.000Z',
    provider: 'deepseek',
    guide: sampleGuide(),
  };
  assert.equal(paperSource.isPaperGuideCacheUsable(cache, 'abc123'), true);
  assert.equal(paperSource.isPaperGuideCacheUsable(cache, 'changed'), false);
  assert.equal(paperSource.isPaperGuideCacheUsable({ ...cache, promptVersion: 'paper-guide-v0' }, 'abc123'), false);

  const figureCaptions = paperSource.extractPaperFigureCaptionsFromText(
    'Fig. 1. High-level system architecture for secure agents. The policy enforcer blocks unsafe actions. Table 2: Benchmark results across tasks show the system-level defense tradeoff.',
    3,
  );
  assert.equal(figureCaptions.length, 2);
  assert.equal(figureCaptions[0].label, 'Figure 1');
  assert.equal(figureCaptions[0].pageNumber, 3);
  assert.equal(figureCaptions[0].evidenceRole, 'architecture');
  assert.equal(figureCaptions[1].label, 'Table 2');
  assert.equal(figureCaptions[1].evidenceRole, 'result');
  assert.match(figureCaptions[1].readerQuestion, /核心的 claim/);

  const semanticReader = paperSource.buildPaperSemanticReader(sampleGuide(), {
    status: 'parsed',
    source: 'paper_document',
    parseVersion: paperSource.PAPER_PARSE_VERSION,
    parsedAt: '2026-06-26T00:00:00.000Z',
    pageCount: 8,
    sectionCount: 3,
    chunkCount: 6,
    error: null,
    sections: [
      {
        id: 'section-abstract',
        sectionType: 'abstract',
        title: 'Abstract',
        pageStart: 1,
        pageEnd: 1,
        orderIndex: 0,
        textPreview: 'We introduce a tool-using agent loop.',
        chunkCount: 1,
      },
      {
        id: 'section-method',
        sectionType: 'method',
        title: 'Method',
        pageStart: 2,
        pageEnd: 4,
        orderIndex: 1,
        textPreview: 'Prompted planning and tool execution.',
        chunkCount: 3,
      },
      {
        id: 'section-result',
        sectionType: 'result',
        title: 'Results',
        pageStart: 5,
        pageEnd: 6,
        orderIndex: 2,
        textPreview: 'Evaluation results improve the benchmark.',
        chunkCount: 2,
      },
    ],
  }, {
    cards: [
      {
        openalexId: 'W123',
        openalexUrl: 'https://openalex.org/W123',
        title: 'Referenced paper',
        year: 2024,
        authors: ['Ada Lovelace'],
        venue: 'Journal of Agents',
        abstract: 'A referenced paper abstract.',
        doi: '10.1234/example',
        landingPageUrl: 'https://example.com/paper',
        citationCount: 42,
        sourceItemId: 'raw-ref-1',
        sourceHref: '/source/paper/raw-ref-1',
      },
    ],
    status: {
      status: 'ready',
      cacheHit: true,
      fetchedAt: '2026-06-26T00:00:00.000Z',
      referencesTotal: 1,
      message: null,
    },
  }, [
    {
      id: 'figure-1',
      label: 'Figure 1',
      caption: 'High-level system architecture.',
      pageNumber: 2,
      orderIndex: 0,
      imagePath: null,
      evidenceRole: 'architecture',
      evidenceLabel: '系统结构',
      readerQuestion: '论文的方法由哪些模块组成？',
      readerHint: '先看这张图。',
    },
  ]);
  assert.deepEqual(
    semanticReader.skimmingAssist.map(item => item.role),
    ['objective', 'novelty', 'method', 'result', 'limitation'],
  );
  assert.equal(semanticReader.skimmingAssist.find(item => item.role === 'method')?.pageNumber, 2);
  assert.equal(semanticReader.jumpTargetCount, 5);
  assert.equal(semanticReader.citationCards.length, 1);
  assert.equal(semanticReader.citationCards[0].sourceHref, '/source/paper/raw-ref-1');
  assert.equal(semanticReader.referenceStatus.cacheHit, true);
  assert.equal(semanticReader.figures.length, 1);
  assert.equal(semanticReader.figures[0].label, 'Figure 1');
  assert.equal(semanticReader.figures[0].evidenceRole, 'architecture');
  assert.ok(semanticReader.readingPath.length >= 3);
  assert.equal(semanticReader.readingPath[0].kind, 'figure');
  assert.equal(semanticReader.readingPath[0].pageNumber, 2);
  assert.ok(semanticReader.readingPath.some(step => step.kind === 'section' && step.sectionType === 'method'));
});

test('paper source server path resolves PDFs, caches LLM guide, and streams PDF through site API', async () => {
  const [paperSource, pdfRoute, guideRoute, translateRoute, chatRoute, notesRoute, materializeScript, referenceMaterializeScript] = await Promise.all([
    readPaperSourceImplementationText(),
    readFile(paperPdfRoutePath, 'utf8'),
    readFile(paperGuideRoutePath, 'utf8'),
    readFile(paperTranslateRoutePath, 'utf8'),
    readFile(paperChatRoutePath, 'utf8'),
    readFile(paperNotesRoutePath, 'utf8'),
    readFile(paperMaterializeScriptPath, 'utf8'),
    readFile(paperReferenceMaterializeScriptPath, 'utf8'),
  ]);

  assert.match(paperSource, /export async function resolvePdfUrl/);
  assert.match(paperSource, /https:\/\/arxiv\.org\/pdf\/\$\{arxivId\}/);
  assert.match(paperSource, /best_oa_location/);
  assert.match(paperSource, /pdfUrlSource: 'openalex_best_oa_location'/);
  assert.match(paperSource, /paperGuide/);
  assert.match(paperSource, /PAPER_GUIDE_PROMPT_VERSION/);
  assert.match(paperSource, /PaperSourceViewModelOptions/);
  assert.match(paperSource, /generateGuide\?: boolean/);
  assert.match(paperSource, /getCachedOrFallbackPaperGuide/);
  assert.match(paperSource, /options\.generateGuide === false \? getCachedOrFallbackPaperGuide/);
  assert.match(paperSource, /export async function getOrCreatePaperGuideViewModel/);
  assert.match(paperSource, /generateStructured/);
  assert.match(paperSource, /chain: paperLlmChain\(\)/);
  assert.match(paperSource, /DEFAULT_PAPER_LLM_CHAIN: ProviderName\[\] = \['mimo', 'minimax'\]/);
  assert.match(paperSource, /prisma\.people\.count\(\)/);
  assert.match(paperSource, /PAPER_PAGE_TEXT_CACHE_VERSION/);
  assert.match(paperSource, /PAPER_TRANSLATION_PROMPT_VERSION/);
  assert.match(paperSource, /PAPER_CHAT_PROMPT_VERSION/);
  assert.match(paperSource, /getPaperDocumentPageText/);
  assert.match(paperSource, /paperDocument\.findUnique/);
  assert.match(paperSource, /where: \{ pageNumber \}/);
  const pageTextFunction = paperSource.slice(
    paperSource.indexOf('async function getOrExtractPaperPageText'),
    paperSource.indexOf('async function extractPdfPageText'),
  );
  assert.ok(
    pageTextFunction.indexOf('const documentPageText = await getPaperDocumentPageText') < pageTextFunction.indexOf('const resolution = await resolvePdfUrl'),
    'paper page text should prefer persisted PaperChunk text before fetching PDFs',
  );
  assert.match(paperSource, /pdfjs-dist\/legacy\/build\/pdf\.mjs/);
  assert.match(paperSource, /paperTextCache/);
  assert.match(paperSource, /paperTranslations/);
  assert.match(paperSource, /export async function translatePaperToChinese/);
  assert.match(paperSource, /PAPER_PARSE_VERSION/);
  assert.match(paperSource, /export async function materializePaperDocument/);
  assert.match(paperSource, /export function sanitizePaperTextForStorage/);
  assert.match(paperSource, /paperDocument\.upsert/);
  assert.match(paperSource, /paperFigure\.createMany/);
  assert.match(paperSource, /buildPaperFigureDrafts/);
  assert.match(paperSource, /extractPaperFigureCaptionsFromText/);
  assert.match(paperSource, /getPaperFigureCards/);
  assert.match(paperSource, /buildSemanticReadingPath/);
  assert.match(paperSource, /readingPathStepFromSectionOrSkim/);
  assert.match(paperSource, /prisma\.paperSection\.findMany/);
  assert.match(paperSource, /export function classifyPaperSectionType/);
  assert.match(paperSource, /PaperChatAnswerSchema/);
  assert.match(paperSource, /getPaperChatRelatedContext/);
  assert.match(paperSource, /getPaperChatProductEvidenceContext/);
  assert.match(paperSource, /isPublishablePaperRelatedThread/);
  assert.match(paperSource, /\.filter\(isPublishablePaperRelatedThread\)/);
  assert.match(paperSource, /paperThreadQualityFromMetadata/);
  assert.match(paperSource, /excludedFromTopicReadiness/);
  assert.match(paperSource, /reviewReason/);
  assert.match(paperSource, /needs_review/);
  assert.match(paperSource, /isStrongPaperThreadMatchReason/);
  assert.match(paperSource, /ProductEvidenceSource/);
  assert.match(paperSource, /PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES/);
  assert.match(paperSource, /reviewStatus: \{ in: PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES \}/);
  assert.match(paperSource, /export async function answerPaperQuestion/);
  assert.match(paperSource, /prisma\.paperDocument\.findUnique/);
  assert.match(paperSource, /paper_chunks_unavailable/);
  assert.match(paperSource, /paperChatCache/);
  assert.match(paperSource, /buildPaperChatCacheLookup/);
  assert.match(paperSource, /persistPaperChatCache/);
  assert.match(paperSource, /cacheHit: true/);
  assert.match(paperSource, /PAPER_CHAT_PROMPT_VERSION = 'paper-chat-v4'/);
  assert.match(paperSource, /function chatCitationQuote/);
  assert.match(paperSource, /slice\(0, 1_600\)/);
  assert.match(paperSource, /groundPaperCitationQuote/);
  assert.match(paperSource, /isPaperCitationQuoteGrounded/);
  assert.match(paperSource, /normalizeCitationComparableText/);
  assert.match(paperSource, /normalizePaperChatCitations/);
  assert.match(paperSource, /sourceKind === 'paper_chunk'/);
  assert.match(paperSource, /P1 chat is grounded only in PaperChunk/);
  assert.doesNotMatch(paperSource, /relatedSourceId/);
  assert.doesNotMatch(paperSource, /sourceKind: z\.enum\(\['paper_chunk', 'thread', 'work', 'github'\]\)/);
  assert.doesNotMatch(paperSource, /toPaperChatRelatedCitation/);
  assert.match(paperSource, /relatedContext/);
  const paperChatPromptBuilder = paperSource.slice(
    paperSource.indexOf('function buildPaperChatMessages'),
    paperSource.indexOf('function normalizePaperChatCitations'),
  );
  assert.doesNotMatch(paperChatPromptBuilder, /relatedContext/);
  assert.doesNotMatch(paperChatPromptBuilder, /thread|work|github/i);
  assert.doesNotMatch(paperChatPromptBuilder, /sourceTitle|personTitle|pageCount|status: input\.document/);
  assert.match(paperSource, /export function buildPaperSemanticReader/);
  assert.match(paperSource, /buildSkimmingAssistItems/);
  assert.match(paperSource, /PaperSkimmingAssistItem/);
  assert.match(paperSource, /export async function getPaperRelatedThreads/);
  assert.match(paperSource, /export function getPaperSourcePackThreadLinks/);
  assert.match(paperSource, /export async function getPaperAuthorPeople/);
  assert.match(paperSource, /PaperAuthorPersonLink/);
  assert.match(paperSource, /PaperAuthorReviewCandidate/);
  assert.match(paperSource, /authorPeople/);
  assert.match(paperSource, /authorReviewCandidates/);
  assert.match(paperSource, /normalizeAuthorNameKey/);
  assert.match(paperSource, /aliases/);
  assert.match(paperSource, /PaperEntityReview/);
  assert.match(paperSource, /PAPER_ENTITY_REVIEW_STATUSES/);
  assert.match(paperSource, /entityReviewQueue/);
  assert.match(paperSource, /export async function getPaperEntityReviewQueue/);
  assert.match(paperSource, /export async function buildPaperEntityReviewCandidates/);
  assert.match(paperSource, /readPaperAuthorEntries/);
  assert.match(paperSource, /openalex_exact/);
  assert.match(paperSource, /cleanOpenAlexAuthorId/);
  assert.match(paperSource, /readPaperOrganizationNames/);
  assert.match(paperSource, /isMissingPaperEntityReviewTable/);
  assert.match(paperSource, /export async function getPaperRelatedWorks/);
  assert.match(paperSource, /PaperRelatedWork/);
  assert.match(paperSource, /workTypeLabel/);
  assert.match(paperSource, /\/work\/\$\{product\.slug\}/);
  assert.match(paperSource, /GENERIC_WORK_NEEDLES/);
  assert.match(paperSource, /getSourcePacks/);
  assert.match(paperSource, /paper_foundation/);
  assert.match(paperSource, /normalizeComparablePaperUrl/);
  assert.match(paperSource, /PAPER_REFERENCES_CACHE_VERSION/);
  assert.match(paperSource, /paper-references-v3/);
  assert.match(paperSource, /PAPER_NOTES_VERSION/);
  assert.match(paperSource, /CachedPaperReferencesSchema/);
  assert.match(paperSource, /openalexWorkTitle/);
  assert.match(paperSource, /titleSimilarity/);
  assert.match(paperSource, /titleMismatch/);
  assert.match(paperSource, /PaperReferenceQualityIssue/);
  assert.match(paperSource, /qualityIssue/);
  assert.match(paperSource, /openalex_reference_title_mismatch/);
  assert.match(paperSource, /openalex_search_no_title_match/);
  assert.match(paperSource, /paperReferenceQualityIssue/);
  assert.match(paperSource, /comparePaperTitles/);
  assert.match(paperSource, /CachedPaperNotesSchema/);
  assert.match(paperSource, /paperNotes/);
  assert.match(paperSource, /export async function createPaperNote/);
  assert.match(paperSource, /export async function deletePaperNote/);
  assert.match(paperSource, /export async function getPaperNotes/);
  assert.match(paperSource, /getOrCreatePaperReferenceCards/);
  assert.match(paperSource, /export async function materializePaperReferenceCards/);
  assert.match(paperSource, /fetchOpenAlexReferencedWorks/);
  assert.match(paperSource, /referenced_works/);
  assert.match(paperSource, /paperReferences/);
  assert.match(paperSource, /openAlexLookupCandidates/);
  assert.match(paperSource, /openAlexLookupCandidateFromDoi/);
  assert.match(paperSource, /openAlexLookupCandidateFromTitle/);
  assert.match(paperSource, /selectOpenAlexWorkFromLookupPayload/);
  assert.match(paperSource, /candidate\.key\.startsWith\('title:'\) \? null : candidate\.key/);
  assert.match(paperSource, /10\.48550\/arXiv/);
  assert.match(paperSource, /hasAlternativeLookup/);
  assert.match(paperSource, /enrichPaperReferenceLinks/);
  assert.match(paperSource, /internalPaperSourceHref\(sourceItemId\)/);
  assert.match(paperSource, /semanticReader/);
  assert.match(paperSource, /pdfFetchCandidateUrls/);
  assert.match(paperSource, /export\.arxiv\.org/);
  assert.match(paperSource, /paper_pdf_fetch_timeout/);
  assert.match(paperSource, /fetchRetries/);
  assert.match(paperSource, /maxPdfBytes/);
  assert.match(materializeScript, /--max-pdf-bytes/);
  assert.match(referenceMaterializeScript, /materializePaperReferenceCards/);
  assert.match(referenceMaterializeScript, /--execute/);
  assert.match(referenceMaterializeScript, /--include-all-sources/);
  assert.match(referenceMaterializeScript, /--thread-paper-foundations/);
  assert.match(referenceMaterializeScript, /knowledgeThreadSources/);
  assert.match(referenceMaterializeScript, /assertWritableDb/);
  assert.match(referenceMaterializeScript, /Refusing to write while NODE_ENV=production/);
  assert.match(referenceMaterializeScript, /paperDocument: \{ isNot: null \}/);
  assert.match(referenceMaterializeScript, /candidateWindow/);
  assert.match(referenceMaterializeScript, /selectReferenceCandidates/);
  assert.match(referenceMaterializeScript, /referenceCandidateRank/);
  assert.match(referenceMaterializeScript, /hasOpenAlexLookupCandidate/);

  assert.match(pdfRoute, /loadPaperSource/);
  assert.match(pdfRoute, /resolvePdfUrl/);
  assert.match(pdfRoute, /Content-Type/);
  assert.match(pdfRoute, /application\/pdf/);
  assert.match(pdfRoute, /Content-Length/);
  assert.match(pdfRoute, /hasPdfHeader/);
  assert.match(pdfRoute, /Resolved URL did not return a PDF/);

  assert.match(guideRoute, /getOrCreatePaperGuideViewModel/);
  assert.match(guideRoute, /export async function POST/);
  assert.match(guideRoute, /NextResponse\.json\(\{ viewModel \}/);
  assert.match(guideRoute, /paper_guide_failed/);

  assert.match(translateRoute, /translatePaperToChinese/);
  assert.match(translateRoute, /scope: z\.enum\(\['page', 'abstract'\]\)/);
  assert.match(translateRoute, /NextResponse\.json\(result\)/);

  assert.match(chatRoute, /answerPaperQuestion/);
  assert.match(chatRoute, /question: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(800\)/);
  assert.match(chatRoute, /paper_chunks_unavailable/);
  assert.match(chatRoute, /status = message === 'paper_chunks_unavailable' \? 409 : 502/);

  assert.match(notesRoute, /createPaperNote/);
  assert.match(notesRoute, /deletePaperNote/);
  assert.match(notesRoute, /getPaperNotes/);
  assert.match(notesRoute, /export async function GET/);
  assert.match(notesRoute, /export async function POST/);
  assert.match(notesRoute, /export async function DELETE/);
  assert.match(notesRoute, /笔记格式不正确/);
});

test('paper workspace renders PDF.js or abstract fallback and keeps guide/translation/chat/notes tabs', async () => {
  const [workspace, page] = await Promise.all([
    readFile(paperWorkspacePath, 'utf8'),
    readFile(paperPagePath, 'utf8'),
  ]);

  assert.match(page, /getPaperSourceViewModel/);
  assert.match(page, /getPaperSourceViewModel\(id, \{ generateGuide: false \}\)/);
  assert.match(page, /PaperSourceWorkspace/);

  assert.match(workspace, /pdfjs-dist/);
  assert.match(workspace, /const \[viewModel, setViewModel\] = useState\(initialViewModel\)/);
  assert.match(workspace, /GuideRefreshState/);
  assert.match(workspace, /\/api\/source\/paper\/\$\{viewModel\.source\.id\}\/guide/);
  assert.match(workspace, /method: 'POST'/);
  assert.match(workspace, /setViewModel\(payload\.viewModel\)/);
  assert.match(workspace, /data-paper-guide-status/);
  assert.match(workspace, /data-paper-guide-refresh-state/);
  assert.match(workspace, /data-paper-guide-refresh-loading/);
  assert.match(workspace, /data-paper-guide-refresh-error/);
  assert.match(workspace, /data-paper-guide-refresh-retry/);
  assert.match(workspace, /data-paper-pdf-viewer/);
  assert.match(workspace, /data-paper-pdf-canvas/);
  assert.match(workspace, /data-paper-abstract-fallback/);
  assert.match(workspace, /data-paper-pdf-render-fallback/);
  assert.match(workspace, /PDF 暂不可读/);
  assert.match(workspace, /pdf-fallback-landing/);
  assert.match(workspace, /data-paper-guide-tab/);
  assert.match(workspace, /id="paper-guide-summary"/);
  assert.match(workspace, /id="paper-guide-method"/);
  assert.match(workspace, /id="paper-guide-experiments"/);
  assert.match(workspace, /readInitialPaperPageNumber/);
  assert.match(workspace, /searchParams\.get\('page'\)/);
  assert.match(workspace, /id=\{paperSectionAnchorId\(section\.id\)\}/);
  assert.match(workspace, /data-paper-section-id=\{section\.id\}/);
  assert.match(workspace, /function paperSectionAnchorId/);
  assert.match(workspace, /guideAnchors/);
  assert.match(workspace, /jumpToGuideAnchor/);
  assert.match(workspace, /GuideAnchorButton/);
  assert.match(workspace, /data-paper-guide-citation-anchor/);
  assert.match(workspace, /data-paper-translation-tab/);
  assert.match(workspace, /data-paper-translate-button/);
  assert.match(workspace, /data-paper-translation-result/);
  assert.match(workspace, /\/api\/source\/paper\/\$\{viewModel\.source\.id\}\/translate/);
  assert.match(workspace, /data-paper-chat-tab/);
  assert.match(workspace, /data-paper-chat-messages/);
  assert.match(workspace, /data-paper-chat-input/);
  assert.match(workspace, /data-paper-chat-submit/);
  assert.match(workspace, /chatHistoryForRequest/);
  assert.match(workspace, /message\.id !== 'assistant-initial'/);
  assert.match(workspace, /data-paper-chat-citation/);
  assert.match(workspace, /data-paper-chat-citation-source-kind/);
  assert.match(workspace, /onCitationPreview/);
  assert.match(workspace, /data-paper-chat-citation-hover-preview/);
  assert.match(workspace, /data-paper-chat-citation-preview-page/);
  assert.match(workspace, /data-paper-chat-citation-preview-section/);
  assert.match(workspace, /data-paper-chat-citation-preview-quote/);
  assert.match(workspace, /data-section-title=\{citation\.sectionTitle/);
  assert.match(workspace, /PaperChatCitationCard/);
  assert.match(workspace, /PaperChatRelatedContext/);
  assert.match(workspace, /PaperChatRelatedContextBody/);
  assert.match(workspace, /chatRelatedContext/);
  assert.match(workspace, /applySuggestedQuestion/);
  assert.match(workspace, /relatedContext: Array\.isArray\(result\.relatedContext\)/);
  assert.match(workspace, /relatedContext=\{chatRelatedContext\}/);
  assert.match(workspace, /data-paper-chat-related-context-panel/);
  assert.match(workspace, /data-paper-chat-related-source/);
  assert.match(workspace, /data-paper-chat-suggested-question/);
  assert.match(workspace, /data-paper-chat-related-context/);
  assert.match(workspace, /data-paper-chat-related-context-source/);
  assert.match(workspace, /data-source-kind=\{context\.sourceKind\}/);
  assert.match(workspace, /\/api\/source\/paper\/\$\{viewModel\.source\.id\}\/chat/);
  assert.match(workspace, /viewModel\.structure/);
  assert.match(workspace, /data-paper-structure-timeline/);
  assert.match(workspace, /data-paper-section-anchor/);
  assert.match(workspace, /data-paper-section-preview/);
  assert.match(workspace, /activeReaderAnchorId/);
  assert.match(workspace, /readerAnchorPreview/);
  assert.match(workspace, /activateReaderAnchor/);
  assert.match(workspace, /previewForSection/);
  assert.match(workspace, /scrollToPdfViewer/);
  assert.match(workspace, /data-paper-reader-anchor-preview/);
  assert.match(workspace, /data-paper-reader-anchor-page/);
  assert.match(workspace, /data-paper-reader-anchor-section/);
  assert.match(workspace, /data-paper-reader-anchor-quote/);
  assert.match(workspace, /data-paper-active-anchor/);
  assert.match(workspace, /data-paper-skimming-assist/);
  assert.match(workspace, /data-paper-skimming-overlay/);
  assert.match(workspace, /data-paper-skim-card/);
  assert.match(workspace, /data-paper-skim-jump/);
  assert.match(workspace, /data-paper-skim-preview/);
  assert.match(workspace, /Objective \/ Novelty \/ Method \/ Result \/ Limitation/);
  assert.match(workspace, /data-paper-citation-cards/);
  assert.match(workspace, /data-paper-citation-card/);
  assert.match(workspace, /data-paper-citation-hover-card/);
  assert.match(workspace, /data-paper-citation-hover-preview/);
  assert.match(workspace, /data-paper-citation-preview-link/);
  assert.match(workspace, /aria-describedby=\{previewId\}/);
  assert.match(workspace, /function domSafeId/);
  assert.match(workspace, /data-paper-citation-link/);
  assert.match(workspace, /data-paper-citation-empty/);
  assert.match(workspace, /data-paper-citation-quality-issue/);
  assert.match(workspace, /data-paper-citation-quality-detail/);
  assert.match(workspace, /OpenAlex 返回的 work title 与当前论文不一致/);
  assert.match(workspace, /OpenAlex search 没有找到标题足够一致的 work/);
  assert.match(workspace, /citationQualityIssue/);
  assert.match(workspace, /citationQualityDetail/);
  assert.match(workspace, /viewModel\.semanticReader\.citationCards/);
  assert.match(workspace, /data-paper-figure-carousel/);
  assert.match(workspace, /data-paper-figure-card/);
  assert.match(workspace, /data-paper-figure-active/);
  assert.match(workspace, /data-paper-figure-role/);
  assert.match(workspace, /data-paper-figure-role-label/);
  assert.match(workspace, /data-paper-figure-question/);
  assert.match(workspace, /data-paper-figure-jump/);
  assert.match(workspace, /data-paper-figure-preview/);
  assert.match(workspace, /data-paper-figure-focus/);
  assert.match(workspace, /data-paper-figure-page-crop/);
  assert.match(workspace, /data-paper-figure-page-preview/);
  assert.match(workspace, /data-paper-figure-note/);
  assert.match(workspace, /seedNoteFromFigure/);
  assert.match(workspace, /pdfProxyUrl=\{viewModel\.paper\.pdfProxyUrl\}/);
  assert.match(workspace, /data-paper-figure-empty/);
  assert.match(workspace, /viewModel\.semanticReader\.figures/);
  assert.match(workspace, /data-paper-semantic-reading-path/);
  assert.match(workspace, /data-paper-reading-step/);
  assert.match(workspace, /data-paper-reading-step-jump/);
  assert.match(workspace, /data-paper-reading-step-preview/);
  assert.match(workspace, /data-reading-target-id=\{step\.targetId/);
  assert.match(workspace, /item\.kind === 'figure' && item\.targetId/);
  assert.match(workspace, /viewModel\.semanticReader\.readingPath/);
  assert.match(workspace, /data-paper-related-threads/);
  assert.match(workspace, /data-paper-related-thread/);
  assert.match(workspace, /data-paper-related-thread-link/);
  assert.match(workspace, /data-paper-related-thread-status/);
  assert.match(workspace, /data-paper-related-thread-review/);
  assert.match(workspace, /data-excluded-from-topic-readiness/);
  assert.match(workspace, /isPublishableRelatedThread/);
  assert.match(workspace, /viewModel\.relatedThreads/);
  assert.match(workspace, /data-paper-author-people/);
  assert.match(workspace, /data-paper-author-person/);
  assert.match(workspace, /data-paper-author-person-link/);
  assert.match(workspace, /data-paper-author-review-candidate/);
  assert.match(workspace, /viewModel\.paper\.authorPeople/);
  assert.match(workspace, /viewModel\.paper\.authorReviewCandidates/);
  assert.match(workspace, /entityReviewQueue=\{viewModel\.entityReviewQueue\}/);
  assert.match(workspace, /data-paper-entity-review-queue/);
  assert.match(workspace, /data-paper-entity-review-item/);
  assert.match(workspace, /data-paper-entity-review-candidate/);
  assert.match(workspace, /data-entity-kind=\{item\.entityKind\}/);
  assert.match(workspace, /data-review-status=\{item\.reviewStatus\}/);
  assert.match(workspace, /PAPER_ENTITY_REVIEW_STATUS_LABELS/);
  assert.match(workspace, /data-paper-related-works/);
  assert.match(workspace, /data-paper-related-work/);
  assert.match(workspace, /data-paper-related-work-link/);
  assert.match(workspace, /viewModel\.relatedWorks/);
  assert.match(workspace, /viewModel\.notes/);
  assert.match(workspace, /data-paper-notes-tab/);
  assert.match(workspace, /data-paper-note-form/);
  assert.match(workspace, /data-paper-note-anchor/);
  assert.match(workspace, /data-paper-note-quote/);
  assert.match(workspace, /data-paper-note-body/);
  assert.match(workspace, /data-paper-note-submit/);
  assert.match(workspace, /data-paper-note-card/);
  assert.match(workspace, /data-paper-note-jump/);
  assert.match(workspace, /data-paper-note-delete/);
  assert.match(workspace, /data-paper-notes-empty/);
  assert.match(workspace, /\/api\/source\/paper\/\$\{viewModel\.source\.id\}\/notes/);
  assert.match(workspace, /data-paper-external-link="doi"/);
  assert.match(workspace, /data-paper-external-link="openalex"/);
});

test('homepage and person paper cards open internal paper source workspace', async () => {
  const [featuredCards, featuredWorks, personPage] = await Promise.all([
    readFile(featuredCardsPath, 'utf8'),
    readFile(featuredWorksPath, 'utf8'),
    readFile(personPagePath, 'utf8'),
  ]);

  assert.match(featuredCards, /internalPaperSourceHref/);
  assert.match(featuredCards, /kind !== 'paper'/);
  assert.match(featuredCards, /event\.sourceType !== 'openalex'/);
  assert.match(featuredCards, /\/source\/paper\/\$\{event\.sourceItemId\}/);

  assert.match(featuredWorks, /\/source\/paper\/\$\{paper\.id\}/);
  assert.match(featuredWorks, /paperEvidence/);
  assert.match(featuredWorks, /PersonPaperEvidenceBadges/);
  assert.match(featuredWorks, /data-person-paper-evidence/);
  assert.match(featuredWorks, /data-person-paper-evidence-badge/);
  assert.match(featuredWorks, /PaperEntityReview 已确认/);
  assert.doesNotMatch(featuredWorks, /target="_blank"[\s\S]{0,120}核心论文/);

  assert.match(personPage, /buildPersonPaperEvidence/);
  assert.match(personPage, /paperEntityReviews: \{/);
  assert.match(personPage, /confirmedPersonId: id/);
  assert.match(personPage, /sourceRelation/);
  assert.match(personPage, /openalexAuthorshipCount/);
});

test('work pages expose paper foundations and GitHub implementation evidence', async () => {
  const [products, workPageView] = await Promise.all([
    readFile(productsPath, 'utf8'),
    readFile(workPageViewPath, 'utf8'),
  ]);

  assert.match(products, /paperFoundations: WorkEvidenceSource\[\]/);
  assert.match(products, /implementationSources: WorkEvidenceSource\[\]/);
  assert.match(products, /listPersistedEvidenceSourcesForProduct/);
  assert.match(products, /listCandidateEvidenceSourcesForWork/);
  assert.match(products, /listWorkEvidenceCandidatePool/);
  assert.match(products, /listWorkEvidenceCandidatePool\(limit = 5000\)/);
  assert.match(products, /needsCandidateEvidenceFallback/);
  assert.match(products, /mergeWorkEvidenceSources/);
  assert.match(products, /candidateRows\?: RawEvidenceRow\[\]/);
  assert.match(products, /PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES/);
  assert.match(products, /reviewStatus: \{ in: PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES \}/);
  assert.match(products, /productEvidenceSource\.findMany/);
  assert.match(products, /isMissingProductEvidenceSourceTable/);
  assert.match(products, /sourceType: \{ in: \['openalex', 'github'\] \}/);
  assert.match(products, /personId: true/);
  assert.match(products, /listPeopleForEvidence/);
  assert.match(products, /addMatchedEvidence/);
  assert.match(products, /evidenceStableKey/);
  assert.match(products, /kind === 'paper' \? `\/source\/paper\/\$\{row\.id\}` : row\.url/);
  assert.match(products, /normalizeComparableWorkUrl/);
  assert.match(products, /extractEvidenceNeedlesFromUrl/);
  assert.match(products, /matchesGithubRepositoryName/);
  assert.match(products, /compactEvidenceKey/);
  assert.match(products, /isStrongPaperEvidenceNeedle/);
  assert.match(products, /GENERIC_EVIDENCE_NEEDLES/);
  assert.match(products, /GENERIC_PAPER_EVIDENCE_NEEDLES/);

  assert.match(workPageView, /data-work-evidence-section=\{dataAttribute\}/);
  assert.match(workPageView, /dataAttribute="paper-foundations"/);
  assert.match(workPageView, /dataAttribute="implementation-sources"/);
  assert.match(workPageView, /data-work-evidence-source/);
  assert.match(workPageView, /data-source-kind/);
  assert.match(workPageView, /data-work-evidence-link/);
  assert.match(workPageView, /论文根基/);
  assert.match(workPageView, /实现和代码/);
});

test('thread pages expose P3 paper-to-work-to-code evidence chains', async () => {
  const [knowledgeThreads, threadPageBlocks, threadFixture] = await Promise.all([
    readFile(knowledgeThreadsPath, 'utf8'),
    readFile(threadPageBlocksPath, 'utf8'),
    readFile(threadFixturePath, 'utf8'),
  ]);

  assert.match(threadFixture, /KnowledgeThreadPaperEvidenceChain/);
  assert.match(threadFixture, /paperEvidenceChain\?: KnowledgeThreadPaperEvidenceChain/);
  assert.match(threadFixture, /reviewPapers: KnowledgeThreadPaperEvidencePaper\[\]/);
  assert.match(threadFixture, /status: KnowledgeThreadSource\['status'\]/);
  assert.match(threadFixture, /KnowledgeThreadPaperReferenceEvidence/);
  assert.match(threadFixture, /paperReferenceEvidence\?: KnowledgeThreadPaperReferenceEvidence/);
  assert.match(threadFixture, /KnowledgeThreadPaperEvidenceClaim/);
  assert.match(threadFixture, /claims\?: KnowledgeThreadPaperEvidenceClaim\[\]/);
  assert.match(threadFixture, /sourceQuote\?: string/);
  assert.match(threadFixture, /anchorKind: 'paper_chunk' \| 'guide'/);
  assert.match(threadFixture, /pageNumber\?: number/);
  assert.match(threadFixture, /chunkIndex\?: number/);

  assert.match(knowledgeThreads, /buildKnowledgeThreadPaperEvidenceChain/);
  assert.match(knowledgeThreads, /loadPaperClaimGroundings/);
  assert.match(knowledgeThreads, /paperDocument\.findMany/);
  assert.match(knowledgeThreads, /sections: \{/);
  assert.match(knowledgeThreads, /chunks: \{/);
  assert.match(knowledgeThreads, /text: true/);
  assert.match(knowledgeThreads, /matchingHints/);
  assert.match(knowledgeThreads, /selectBestPaperClaimGrounding/);
  assert.match(knowledgeThreads, /paperClaimMatchScore/);
  assert.match(knowledgeThreads, /paperClaimMatchTokens/);
  assert.match(knowledgeThreads, /PAPER_CLAIM_STOP_WORDS/);
  assert.match(knowledgeThreads, /paperGuideClaimBody/);
  assert.match(knowledgeThreads, /sectionAnchor: paperSectionAnchorId\(section\.id\)/);
  assert.match(knowledgeThreads, /sourceQuote: chunk\?\.text \? firstText\(chunk\.text, 260\) : null/);
  assert.match(knowledgeThreads, /claim\.sourceQuote = grounding\.sourceQuote/);
  assert.match(knowledgeThreads, /\?page=\$\{grounding\.pageNumber\}/);
  assert.match(knowledgeThreads, /function paperSectionAnchorId/);
  assert.match(knowledgeThreads, /buildPaperClaimCitations/);
  assert.match(knowledgeThreads, /metadata\.paperGuide/);
  assert.match(knowledgeThreads, /#paper-guide-method/);
  assert.match(knowledgeThreads, /#paper-guide-experiments/);
  assert.match(knowledgeThreads, /isUsefulPaperClaim/);
  assert.match(knowledgeThreads, /isKnowledgeThreadReadSourceReady/);
  assert.match(knowledgeThreads, /knowledgeThreadSourceStatus/);
  assert.match(knowledgeThreads, /paperThreadReviewReason/);
  assert.match(knowledgeThreads, /excludedFromTopicReadiness/);
  assert.match(knowledgeThreads, /needs_review/);
  assert.match(knowledgeThreads, /listProductEvidenceForThreadPapers/);
  assert.match(knowledgeThreads, /buildThreadImplementationSignalEvidence/);
  assert.match(knowledgeThreads, /mergePaperEvidenceImplementations/);
  assert.match(knowledgeThreads, /productEvidenceSource\.findMany/);
  assert.match(knowledgeThreads, /role: 'paper_foundation'/);
  assert.match(knowledgeThreads, /role: 'implementation_source'/);
  assert.match(knowledgeThreads, /source\.role === 'implementation_signal'/);
  assert.match(knowledgeThreads, /thread_implementation_signal/);
  assert.match(knowledgeThreads, /PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES/);
  assert.match(knowledgeThreads, /reviewStatus: \{ in: PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES \}/);
  assert.match(knowledgeThreads, /href: `\/source\/paper\/\$\{source\.rawPoolItemId\}`/);
  assert.match(knowledgeThreads, /href: `\/work\/\$\{link\.product\.slug\}`/);
  assert.match(knowledgeThreads, /isMissingProductEvidenceSourceStoreError/);
  assert.match(knowledgeThreads, /paperEvidenceChain/);
  assert.match(knowledgeThreads, /reviewPapers/);
  assert.match(knowledgeThreads, /mergeSourceMetadata/);
  assert.match(knowledgeThreads, /rawPoolItem\?\.metadata/);
  assert.match(knowledgeThreads, /buildThreadPaperReferenceEvidence/);
  assert.match(knowledgeThreads, /paperReferences/);
  assert.match(knowledgeThreads, /PAPER_REFERENCE_CACHE_VERSION/);

  assert.match(threadPageBlocks, /PaperEvidenceChainBlock/);
  assert.match(threadPageBlocks, /hasUsefulPaperEvidenceChain/);
  assert.match(threadPageBlocks, /needs_review: '待复核'/);
  assert.match(threadPageBlocks, /data-thread-paper-evidence-chain/);
  assert.match(threadPageBlocks, /data-thread-paper-evidence-paper/);
  assert.match(threadPageBlocks, /PaperClaimCitations/);
  assert.match(threadPageBlocks, /data-thread-paper-claim-citations/);
  assert.match(threadPageBlocks, /data-thread-paper-claim-citation/);
  assert.match(threadPageBlocks, /data-section-type=\{claim\.sectionType\}/);
  assert.match(threadPageBlocks, /data-anchor-kind=\{claim\.anchorKind\}/);
  assert.match(threadPageBlocks, /data-page-number=\{claim\.pageNumber/);
  assert.match(threadPageBlocks, /data-chunk-index=\{claim\.chunkIndex/);
  assert.match(threadPageBlocks, /data-thread-paper-claim-source-quote/);
  assert.match(threadPageBlocks, /Paper chunk/);
  assert.match(threadPageBlocks, /data-thread-paper-review-queue/);
  assert.match(threadPageBlocks, /data-thread-paper-review-item/);
  assert.match(threadPageBlocks, /data-thread-paper-review-link/);
  assert.match(threadPageBlocks, /data-thread-paper-evidence-work/);
  assert.match(threadPageBlocks, /data-thread-paper-evidence-implementation/);
  assert.match(threadPageBlocks, /data-thread-paper-evidence-context/);
  assert.match(threadPageBlocks, /data-thread-paper-evidence-link/);
  assert.match(threadPageBlocks, /论文证据链/);
  assert.match(threadPageBlocks, /论文根基/);
  assert.match(threadPageBlocks, /对应作品/);
  assert.match(threadPageBlocks, /实现代码/);
  assert.match(threadPageBlocks, /data-thread-paper-reference-evidence/);
  assert.match(threadPageBlocks, /data-thread-paper-reference-status/);
  assert.match(threadPageBlocks, /data-thread-paper-reference-item/);
  assert.match(threadPageBlocks, /data-thread-paper-reference-link/);
  assert.match(threadPageBlocks, /引用网络/);
});

test('P1/P3 paper document schema and materialization scripts are present and guarded', async () => {
  const [
    schema,
    script,
    paperDocumentAuditScript,
    paperWorkspaceRolloutAuditScript,
    threadLinkScript,
    productEvidenceScript,
    productEvidenceReviewScript,
    productEvidenceApplyScript,
    paperAuthorshipEnrichScript,
    paperEntityReviewScript,
    paperEntityReviewQueueScript,
    paperEntityReviewApplyScript,
    threadSeedScript,
  ] = await Promise.all([
    readFile(prismaSchemaPath, 'utf8'),
    readFile(paperMaterializeScriptPath, 'utf8'),
    readFile(paperDocumentAuditScriptPath, 'utf8'),
    readFile(paperWorkspaceRolloutAuditScriptPath, 'utf8'),
    readFile(paperThreadLinkScriptPath, 'utf8'),
    readFile(productEvidenceScriptPath, 'utf8'),
    readFile(productEvidenceReviewScriptPath, 'utf8'),
    readFile(productEvidenceApplyScriptPath, 'utf8'),
    readFile(paperAuthorshipEnrichScriptPath, 'utf8'),
    readFile(paperEntityReviewScriptPath, 'utf8'),
    readFile(paperEntityReviewQueueScriptPath, 'utf8'),
    readFile(paperEntityReviewApplyScriptPath, 'utf8'),
    readFile(threadSeedScriptPath, 'utf8'),
  ]);

  assert.match(schema, /model PaperDocument/);
  assert.match(schema, /model PaperSection/);
  assert.match(schema, /model PaperChunk/);
  assert.match(schema, /model PaperFigure/);
  assert.match(schema, /model PaperEntityReview/);
  assert.match(schema, /model ProductEvidenceSource/);
  assert.match(schema, /paperEntityReviews\s+PaperEntityReview\[\]/);
  assert.match(schema, /@@unique\(\[sourceItemId, entityKind, mentionType, entityName\]\)/);
  assert.match(schema, /productEvidenceSources ProductEvidenceSource\[\]/);
  assert.match(schema, /evidenceSources\s+ProductEvidenceSource\[\]/);
  assert.match(schema, /@@unique\(\[productId, rawPoolItemId, role\]\)/);
  assert.match(schema, /sourceItemId\s+String\?\s+@unique/);
  assert.match(schema, /paperDocument\s+PaperDocument\?/);
  assert.match(schema, /@@unique\(\[paperId, chunkIndex\]\)/);

  assert.match(script, /materializePaperDocument/);
  assert.match(script, /Default mode is dry-run/);
  assert.match(script, /skips RawPoolItem rows that already have a PaperDocument/);
  assert.match(script, /paperDocument: null/);
  assert.match(script, /skippedExisting/);
  assert.match(script, /Use --refresh to re-materialize existing documents/);
  assert.match(script, /--execute/);
  assert.match(script, /--allow-remote-dev/);
  assert.match(script, /--allow-vercel-env/);
  assert.match(script, /--arxiv-only/);
  assert.match(script, /--thread-paper-foundations/);
  assert.match(script, /knowledgeThreadSources/);
  assert.match(script, /--pdf-fetch-timeout-ms/);
  assert.match(script, /--pdf-fetch-retries/);
  assert.match(script, /extractArxivIdFromPaperIdentifiers/);
  assert.match(script, /selectMaterializationSources/);
  assert.match(script, /seenArxivIds/);
  assert.match(script, /withNeonWakeup/);
  assert.match(script, /prisma\.people\.count\(\)/);
  assert.match(script, /Refusing to write to remote database/);

  assert.match(paperDocumentAuditScript, /Default mode is read-only/);
  assert.match(paperDocumentAuditScript, /audit_paper_document_materialization/);
  assert.match(paperDocumentAuditScript, /--limit=20/);
  assert.match(paperDocumentAuditScript, /--arxiv-only/);
  assert.match(paperDocumentAuditScript, /extractArxivIdFromPaperIdentifiers/);
  assert.match(paperDocumentAuditScript, /seenArxivIds/);
  assert.match(paperDocumentAuditScript, /paperDocument/);
  assert.match(paperDocumentAuditScript, /sectionTypeCoverage/);
  assert.match(paperDocumentAuditScript, /parsedWithAtLeast3CoreSectionTypes/);
  assert.match(paperDocumentAuditScript, /readyForChat/);
  assert.match(paperDocumentAuditScript, /withNeonWakeup/);
  assert.match(paperDocumentAuditScript, /prisma\.people\.count\(\)/);

  assert.match(paperWorkspaceRolloutAuditScript, /Default mode is read-only/);
  assert.match(paperWorkspaceRolloutAuditScript, /audit_paper_workspace_rollout/);
  assert.match(paperWorkspaceRolloutAuditScript, /sourceCoverage/);
  assert.match(paperWorkspaceRolloutAuditScript, /p0ReaderCoverage/);
  assert.match(paperWorkspaceRolloutAuditScript, /p1DocumentCoverage/);
  assert.match(paperWorkspaceRolloutAuditScript, /pageCitationReadyDocuments/);
  assert.match(paperWorkspaceRolloutAuditScript, /sectionCitationReadyDocuments/);
  assert.match(paperWorkspaceRolloutAuditScript, /pageAndSectionCitationReadyDocuments/);
  assert.match(paperWorkspaceRolloutAuditScript, /fallbackCitationOnlyDocuments/);
  assert.match(paperWorkspaceRolloutAuditScript, /missingCitationAnchors/);
  assert.match(paperWorkspaceRolloutAuditScript, /PAPER_REFERENCES_CACHE_VERSION/);
  assert.match(paperWorkspaceRolloutAuditScript, /p2SemanticReaderCoverage/);
  assert.match(paperWorkspaceRolloutAuditScript, /citationReferenceCaches/);
  assert.match(paperWorkspaceRolloutAuditScript, /freshCitationReferenceCaches/);
  assert.match(paperWorkspaceRolloutAuditScript, /referenceCardsReadySources/);
  assert.match(paperWorkspaceRolloutAuditScript, /referenceCardsReadyDocuments/);
  assert.match(paperWorkspaceRolloutAuditScript, /parsedReferenceCardsReadyDocuments/);
  assert.match(paperWorkspaceRolloutAuditScript, /fallbackReferenceCardsReadySources/);
  assert.match(paperWorkspaceRolloutAuditScript, /referenceTitleMismatches/);
  assert.match(paperWorkspaceRolloutAuditScript, /totalReferenceCards/);
  assert.match(paperWorkspaceRolloutAuditScript, /missingReferences/);
  assert.match(paperWorkspaceRolloutAuditScript, /referenceCardReady/);
  assert.match(paperWorkspaceRolloutAuditScript, /p3EvidenceCoverage/);
  assert.match(paperWorkspaceRolloutAuditScript, /rolloutRates/);
  assert.match(paperWorkspaceRolloutAuditScript, /legacyGuide/);
  assert.match(paperWorkspaceRolloutAuditScript, /authorshipTitleMismatches/);
  assert.match(paperWorkspaceRolloutAuditScript, /knowledgeThreadPaperLinks/);
  assert.match(paperWorkspaceRolloutAuditScript, /productEvidenceRows/);
  assert.match(paperWorkspaceRolloutAuditScript, /safeDisconnect/);
  assert.match(paperWorkspaceRolloutAuditScript, /withNeonWakeup/);
  assert.match(paperWorkspaceRolloutAuditScript, /prisma\.people\.count\(\)/);
  assert.doesNotMatch(paperWorkspaceRolloutAuditScript, /--execute/);

  assert.match(threadLinkScript, /getPaperSourcePackThreadLinks/);
  assert.match(threadLinkScript, /KnowledgeThreadSource\(rawPoolItemId=\.\.\.\)/);
  assert.match(threadLinkScript, /threadId_rawPoolItemId_role/);
  assert.match(threadLinkScript, /source_pack_paper_foundation/);
  assert.match(threadLinkScript, /sourcePackSourceId/);
  assert.match(threadLinkScript, /duplicateRawMatches/);
  assert.match(threadLinkScript, /dedupeCandidates/);
  assert.match(threadLinkScript, /paper_foundation/);
  assert.match(threadLinkScript, /status: strongMatch \? 'verified' : 'needs_review'/);
  assert.match(threadLinkScript, /excludedFromTopicReadiness: !strongMatch/);
  assert.match(threadLinkScript, /isStrongPaperThreadMatchReason/);
  assert.match(threadLinkScript, /Default mode is dry-run/);
  assert.match(threadLinkScript, /--execute/);
  assert.match(threadLinkScript, /--allow-remote-dev/);
  assert.match(threadLinkScript, /--allow-vercel-env/);
  assert.match(threadLinkScript, /Refusing to write to remote database/);
  assert.match(threadLinkScript, /prisma\.people\.count\(\)/);

  assert.match(productEvidenceScript, /listCandidateEvidenceSourcesForWork/);
  assert.match(productEvidenceScript, /listWorkEvidenceCandidatePool/);
  assert.match(productEvidenceScript, /candidateRows/);
  assert.match(productEvidenceScript, /ProductEvidenceSource/);
  assert.match(productEvidenceScript, /productEvidenceSource\.upsert/);
  assert.match(productEvidenceScript, /productId_rawPoolItemId_role/);
  assert.match(productEvidenceScript, /--candidate-limit/);
  assert.match(productEvidenceScript, /listWorkEvidenceCandidatePool\(options\.candidateLimit\)/);
  assert.match(productEvidenceScript, /paper_foundation/);
  assert.match(productEvidenceScript, /implementation_source/);
  assert.match(productEvidenceScript, /initialReviewStatus/);
  assert.match(productEvidenceScript, /matchReason === 'url_exact' && candidate\.confidence >= 0\.95/);
  assert.match(productEvidenceScript, /Default mode is dry-run/);
  assert.match(productEvidenceScript, /--execute/);
  assert.match(productEvidenceScript, /--allow-remote-dev/);
  assert.match(productEvidenceScript, /--allow-vercel-env/);
  assert.match(productEvidenceScript, /Refusing to write to remote database/);
  assert.match(productEvidenceScript, /ensureProductEvidenceSourceTable/);
  assert.match(productEvidenceScript, /prisma\.people\.count\(\)/);

  assert.match(productEvidenceReviewScript, /ProductEvidenceSource/);
  assert.match(productEvidenceReviewScript, /reviewStatus/);
  assert.match(productEvidenceReviewScript, /buildDecisionTemplate/);
  assert.match(productEvidenceReviewScript, /buildReviewPack/);
  assert.match(productEvidenceReviewScript, /product_evidence_review/);
  assert.match(productEvidenceReviewScript, /Default mode is read-only/);
  assert.match(productEvidenceReviewScript, /\/source\/paper\/\$\{source\.id\}/);

  assert.match(productEvidenceApplyScript, /product_evidence_review/);
  assert.match(productEvidenceApplyScript, /SUPPORTED_REVIEW_STATUSES/);
  assert.match(productEvidenceApplyScript, /productEvidenceSource\.update/);
  assert.match(productEvidenceApplyScript, /Default mode is dry-run/);
  assert.match(productEvidenceApplyScript, /--allow-remote-dev/);
  assert.match(productEvidenceApplyScript, /--allow-vercel-env/);
  assert.match(productEvidenceApplyScript, /Refusing to write to remote database/);
  assert.match(productEvidenceApplyScript, /prisma\.people\.count\(\)/);

  assert.match(paperAuthorshipEnrichScript, /OPENALEX_WORKS_URL/);
  assert.match(paperAuthorshipEnrichScript, /resolveOpenAlexWorkForSource/);
  assert.match(paperAuthorshipEnrichScript, /authorships/);
  assert.match(paperAuthorshipEnrichScript, /openalexAuthorships/);
  assert.match(paperAuthorshipEnrichScript, /authorNames/);
  assert.match(paperAuthorshipEnrichScript, /identityMatches/);
  assert.match(paperAuthorshipEnrichScript, /titleMismatch/);
  assert.match(paperAuthorshipEnrichScript, /arxiv_exact/);
  assert.match(paperAuthorshipEnrichScript, /arxiv_title_mismatch/);
  assert.match(paperAuthorshipEnrichScript, /titleSimilarity >= 0\.25/);
  assert.match(paperAuthorshipEnrichScript, /works: Record<string, unknown>\[\]/);
  assert.match(paperAuthorshipEnrichScript, /results\.slice\(0, 5\)/);
  assert.match(paperAuthorshipEnrichScript, /resultCount: works\.length/);
  assert.match(paperAuthorshipEnrichScript, /if \(!match\) return null/);
  assert.match(paperAuthorshipEnrichScript, /redactOpenAlexUrl/);
  assert.match(paperAuthorshipEnrichScript, /\\[redacted\\]/);
  assert.match(paperAuthorshipEnrichScript, /Default mode is dry-run/);
  assert.match(paperAuthorshipEnrichScript, /--execute/);
  assert.match(paperAuthorshipEnrichScript, /--allow-remote-dev/);
  assert.match(paperAuthorshipEnrichScript, /--allow-vercel-env/);
  assert.match(paperAuthorshipEnrichScript, /Refusing to write to remote database/);
  assert.match(paperAuthorshipEnrichScript, /never creates or auto-links People or Organization/);
  assert.match(paperAuthorshipEnrichScript, /prisma\.people\.count\(\)/);

  assert.match(paperEntityReviewScript, /buildPaperEntityReviewCandidates/);
  assert.match(paperEntityReviewScript, /PaperEntityReview/);
  assert.match(paperEntityReviewScript, /paperEntityReview\.upsert/);
  assert.match(paperEntityReviewScript, /sourceItemId_entityKind_mentionType_entityName/);
  assert.match(paperEntityReviewScript, /ensurePaperEntityReviewTable/);
  assert.match(paperEntityReviewScript, /Default mode is dry-run/);
  assert.match(paperEntityReviewScript, /--execute/);
  assert.match(paperEntityReviewScript, /--allow-remote-dev/);
  assert.match(paperEntityReviewScript, /--allow-vercel-env/);
  assert.match(paperEntityReviewScript, /Refusing to write to remote database/);
  assert.match(paperEntityReviewScript, /prisma\.people\.count\(\)/);
  assert.match(paperEntityReviewScript, /never creates or auto-links People or Organization/);

  assert.match(paperEntityReviewQueueScript, /PaperEntityReview/);
  assert.match(paperEntityReviewQueueScript, /buildDecisionTemplate/);
  assert.match(paperEntityReviewQueueScript, /buildReviewPack/);
  assert.match(paperEntityReviewQueueScript, /paper_entity_review/);
  assert.match(paperEntityReviewQueueScript, /Default mode is read-only/);
  assert.match(paperEntityReviewQueueScript, /confirmedPersonId/);
  assert.match(paperEntityReviewQueueScript, /confirmedOrganizationId/);
  assert.match(paperEntityReviewQueueScript, /\/source\/paper\/\$\{row\.sourceItem\.id\}/);
  assert.match(paperEntityReviewQueueScript, /apply_paper_entity_review_decisions/);
  assert.match(paperEntityReviewQueueScript, /prisma\.people\.count\(\)/);

  assert.match(paperEntityReviewApplyScript, /paper_entity_review/);
  assert.match(paperEntityReviewApplyScript, /SUPPORTED_REVIEW_STATUSES/);
  assert.match(paperEntityReviewApplyScript, /paperEntityReview\.update/);
  assert.match(paperEntityReviewApplyScript, /validateConfirmedEntity/);
  assert.match(paperEntityReviewApplyScript, /confirmedPersonId does not exist/);
  assert.match(paperEntityReviewApplyScript, /confirmedOrganizationId does not exist/);
  assert.match(paperEntityReviewApplyScript, /Default mode is dry-run/);
  assert.match(paperEntityReviewApplyScript, /--allow-remote-dev/);
  assert.match(paperEntityReviewApplyScript, /--allow-vercel-env/);
  assert.match(paperEntityReviewApplyScript, /Refusing to write to remote database/);
  assert.match(paperEntityReviewApplyScript, /never creates People or Organization records/);
  assert.match(paperEntityReviewApplyScript, /prisma\.people\.count\(\)/);

  assert.match(threadSeedScript, /bunx tsx scripts\/threads\/seed_threads_to_db\.ts/);
  assert.doesNotMatch(threadSeedScript, /npx tsx scripts\/threads\/seed_threads_to_db\.ts/);
  assert.match(threadSeedScript, /--only/);
  assert.match(threadSeedScript, /resolveSelectedSlugs/);
  assert.match(threadSeedScript, /getSourcePacks\(\)\.filter/);
  assert.match(threadSeedScript, /teardown\(slugs: string\[\]\)/);
  assert.match(threadSeedScript, /sourceId: \{ not: null \}/);
  assert.match(threadSeedScript, /id: \{ in: sourceIds \}/);
  assert.match(threadSeedScript, /--allow-remote-dev/);
  assert.match(threadSeedScript, /--allow-vercel-env/);
  assert.match(threadSeedScript, /assertWritableDb/);
  assert.match(threadSeedScript, /Refusing to write to remote database/);
});
