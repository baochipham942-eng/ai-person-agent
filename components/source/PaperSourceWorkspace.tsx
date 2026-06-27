'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode, RefObject } from 'react';
import type {
  PaperSourceViewModel,
  PaperGuideSectionType,
  PaperSkimmingAssistItem,
  PaperReferenceCard,
  PaperFigureCard,
  PaperReadingPathStep,
  PaperNote,
} from '@/lib/paper-source';

interface PaperSourceWorkspaceProps {
  viewModel: PaperSourceViewModel;
  isAuthenticated: boolean;
}

type WorkspaceTab = 'guide' | 'translation' | 'chat' | 'notes';
type PdfRenderState = 'idle' | 'loading' | 'ready' | 'error';
type GuideRefreshState = 'idle' | 'loading' | 'ready' | 'error';
type TranslationState =
  | { status: 'idle'; result: null; error: null }
  | { status: 'loading'; result: null; error: null }
  | { status: 'ready'; result: PaperTranslationResponse; error: null }
  | { status: 'error'; result: null; error: string };
type PaperChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  citations?: PaperChatCitation[];
  relatedContext?: PaperChatRelatedContext[];
  provider?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};
type PaperNoteAnchorSection = {
  id: string;
  title: string;
  sectionType: PaperGuideSectionType;
  pageStart: number | null;
  pageEnd: number | null;
};

interface PaperTranslationResponse {
  scope: 'page' | 'abstract';
  pageNumber: number | null;
  sourceTextChars: number;
  translation: string;
  cacheHit: boolean;
  translatedAt: string;
  provider: string | null;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

interface PaperChatCitation {
  chunkId: string;
  chunkIndex: number;
  pageNumber: number | null;
  sectionTitle: string | null;
  sectionType: PaperGuideSectionType;
  quote: string;
  label: string;
  sourceKind?: 'paper_chunk';
  sourceTitle?: string | null;
  href?: string | null;
}

interface PaperChatResponse {
  answer: string;
  citations: PaperChatCitation[];
  relatedContext?: PaperChatRelatedContext[];
  provider: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

interface PaperChatRelatedContext {
  id: string;
  sourceKind: 'thread' | 'work' | 'github';
  title: string;
  href: string;
  relation?: string | null;
  summary?: string | null;
  evidenceQuote?: string | null;
  confidence?: number | null;
}

interface PaperNotesResponse {
  note?: PaperNote;
  notes: PaperNote[];
  deleted?: boolean;
}

type GuideAnchorKey = 'summary' | 'problem' | 'novelty' | 'method' | 'experiments' | 'limitations';

interface GuideAnchorTarget {
  id: string;
  label: string;
  sectionType: PaperGuideSectionType;
  sectionTitle: string | null;
  pageNumber: number | null;
  source: 'skimming' | 'section';
}

type PaperReaderAnchorPreviewKind = 'guide' | 'section' | 'skim' | 'figure' | 'reading' | 'citation';

interface PaperReaderAnchorPreview {
  id: string;
  kind: PaperReaderAnchorPreviewKind;
  label: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  quote: string | null;
}

const SECTION_LABELS: Record<PaperGuideSectionType, string> = {
  abstract: 'Abstract',
  problem: 'Problem',
  method: 'Method',
  experiment: 'Experiment',
  result: 'Result',
  limitation: 'Limitation',
  other: 'Reading',
};

export function PaperSourceWorkspace({ viewModel: initialViewModel, isAuthenticated }: PaperSourceWorkspaceProps) {
  const [viewModel, setViewModel] = useState(initialViewModel);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('guide');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [scale, setScale] = useState(1.05);
  const [renderState, setRenderState] = useState<PdfRenderState>('idle');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [guideRefreshState, setGuideRefreshState] = useState<GuideRefreshState>(initialViewModel.guide.status === 'ready' ? 'ready' : 'idle');
  const [guideRefreshError, setGuideRefreshError] = useState<string | null>(null);
  const [translationState, setTranslationState] = useState<TranslationState>({ status: 'idle', result: null, error: null });
  const [chatInput, setChatInput] = useState('');
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [notes, setNotes] = useState<PaperNote[]>(viewModel.notes);
  const [noteBody, setNoteBody] = useState('');
  const [noteQuote, setNoteQuote] = useState('');
  const [notePending, setNotePending] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [activeFigureId, setActiveFigureId] = useState<string | null>(null);
  const [activeReaderAnchorId, setActiveReaderAnchorId] = useState<string | null>(null);
  const [readerAnchorPreview, setReaderAnchorPreview] = useState<PaperReaderAnchorPreview | null>(null);
  const [chatMessages, setChatMessages] = useState<PaperChatMessage[]>([
    {
      id: 'assistant-initial',
      role: 'assistant',
      content: '可以问这篇论文的研究问题、方法、局限或某个概念。我会只依据已解析的论文 chunk 回答，并给出页码引用。',
    },
  ]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const guideRefreshSourceRef = useRef<string | null>(null);

  useEffect(() => {
    const initialPage = readInitialPaperPageNumber();
    if (initialPage) setPageNumber(initialPage);
  }, []);

  useEffect(() => {
    setViewModel(initialViewModel);
    setGuideRefreshState(initialViewModel.guide.status === 'ready' ? 'ready' : 'idle');
    setGuideRefreshError(null);
    setActiveReaderAnchorId(null);
    setReaderAnchorPreview(null);
    guideRefreshSourceRef.current = null;
  }, [initialViewModel]);

  // 导读生成只在登录用户主动点击时触发，不再随页面/标签自动调用付费模型。
  function generateGuide() {
    if (!isAuthenticated) return;
    if (guideRefreshState === 'loading') return;
    if (viewModel.guide.status === 'ready') return;

    guideRefreshSourceRef.current = viewModel.source.id;
    setGuideRefreshState('loading');
    setGuideRefreshError(null);

    fetch(`/api/source/paper/${viewModel.source.id}/guide`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })
      .then(async response => {
        const payload = await response.json().catch(() => null) as { viewModel?: PaperSourceViewModel; error?: string } | null;
        if (!response.ok) throw new Error(payload?.error || 'paper_guide_failed');
        if (!payload?.viewModel) throw new Error('paper_guide_empty_response');
        setViewModel(payload.viewModel);
        setGuideRefreshState('ready');
        setGuideRefreshError(null);
      })
      .catch(error => {
        setGuideRefreshState('error');
        setGuideRefreshError(error instanceof Error ? error.message : 'paper_guide_failed');
      });
  }

  const hasPdf = Boolean(viewModel.paper.pdfProxyUrl);
  const structureSections = viewModel.structure.sections;
  const hasEvidence =
    viewModel.paper.authorPeople.length > 0 ||
    viewModel.paper.authorReviewCandidates.length > 0 ||
    viewModel.entityReviewQueue.length > 0 ||
    viewModel.relatedWorks.length > 0 ||
    viewModel.relatedThreads.length > 0;
  const skimmingAssist = viewModel.semanticReader.skimmingAssist;
  const figures = viewModel.semanticReader.figures;
  const semanticReadingPath = viewModel.semanticReader.readingPath;
  const citationCards = viewModel.semanticReader.citationCards;
  const activeFigure = useMemo(() => {
    if (figures.length === 0) return null;
    return figures.find(figure => figure.id === activeFigureId) || figures.find(figure => figure.pageNumber !== null) || figures[0];
  }, [activeFigureId, figures]);
  const visibleAuthors = viewModel.paper.authors.slice(0, 5).join(', ');
  const guideMeta = useMemo(() => {
    if (guideRefreshState === 'loading') return 'DeepSeek 生成中';
    if (viewModel.guide.cacheHit) return '缓存命中';
    if (viewModel.guide.provider) return `DeepSeek · ${viewModel.guide.provider}`;
    return '本地导读';
  }, [guideRefreshState, viewModel.guide.cacheHit, viewModel.guide.provider]);
  const structureMeta = useMemo(() => {
    if (viewModel.structure.source !== 'paper_document') return '等待结构化';
    return `${viewModel.structure.sectionCount} sections · ${viewModel.structure.chunkCount} chunks`;
  }, [viewModel.structure.chunkCount, viewModel.structure.sectionCount, viewModel.structure.source]);
  const guideAnchors = useMemo<Record<GuideAnchorKey, GuideAnchorTarget | null>>(() => {
    const fromSkim = (role: PaperSkimmingAssistItem['role']): GuideAnchorTarget | null => {
      const item = skimmingAssist.find(candidate => candidate.role === role && candidate.pageNumber);
      if (!item) return null;
      return {
        id: `skim:${item.id}`,
        label: item.label,
        sectionType: item.sectionType,
        sectionTitle: item.sectionTitle,
        pageNumber: item.pageNumber,
        source: 'skimming',
      };
    };
    const fromSection = (types: PaperGuideSectionType[]): GuideAnchorTarget | null => {
      for (const type of types) {
        const section = structureSections.find(candidate => candidate.sectionType === type && candidate.pageStart);
        if (!section) continue;
        return {
          id: `section:${section.id}`,
          label: SECTION_LABELS[section.sectionType],
          sectionType: section.sectionType,
          sectionTitle: section.title,
          pageNumber: section.pageStart,
          source: 'section',
        };
      }
      for (const type of types) {
        const section = structureSections.find(candidate => candidate.sectionType === type);
        if (!section) continue;
        return {
          id: `section:${section.id}`,
          label: SECTION_LABELS[section.sectionType],
          sectionType: section.sectionType,
          sectionTitle: section.title,
          pageNumber: null,
          source: 'section',
        };
      }
      return null;
    };
    const prefer = (
      roles: PaperSkimmingAssistItem['role'][],
      sectionTypes: PaperGuideSectionType[],
    ) => {
      for (const role of roles) {
        const target = fromSkim(role);
        if (target) return target;
      }
      return fromSection(sectionTypes);
    };

    return {
      summary: prefer(['objective'], ['abstract', 'problem']),
      problem: prefer(['objective'], ['problem', 'abstract']),
      novelty: prefer(['novelty'], ['problem', 'method', 'abstract']),
      method: prefer(['method'], ['method']),
      experiments: prefer(['result'], ['experiment', 'result']),
      limitations: prefer(['limitation'], ['limitation']),
    };
  }, [skimmingAssist, structureSections]);
  const currentPageSkimmingItems = useMemo(() => (
    skimmingAssist.filter(item => item.pageNumber === pageNumber)
  ), [pageNumber, skimmingAssist]);
  const currentPageSection = useMemo<PaperNoteAnchorSection | null>(() => {
    const containing = structureSections.find(section => (
      section.pageStart !== null
      && pageNumber >= section.pageStart
      && pageNumber <= (section.pageEnd ?? section.pageStart)
    ));
    return containing || structureSections.find(section => section.pageStart === pageNumber) || null;
  }, [pageNumber, structureSections]);
  const currentPagePreview = useMemo<PaperReaderAnchorPreview | null>(() => {
    if (!currentPageSection) return null;
    return {
      id: readerAnchorKey('section', currentPageSection.id),
      kind: 'section',
      label: '当前页',
      pageNumber,
      sectionTitle: currentPageSection.title,
      quote: `${SECTION_LABELS[currentPageSection.sectionType]} · ${currentPageSection.title}`,
    };
  }, [currentPageSection, pageNumber]);
  const activeReaderPreview = readerAnchorPreview || currentPagePreview;
  const chatRelatedContext = useMemo<PaperChatRelatedContext[]>(() => {
    const threadContext: PaperChatRelatedContext[] = viewModel.relatedThreads
      .filter(isPublishableRelatedThread)
      .slice(0, 4)
      .map(thread => ({
        id: `thread:${thread.slug}:${thread.role}`,
        sourceKind: 'thread',
        title: thread.title,
        href: thread.href,
        relation: `KnowledgeThread · ${thread.role}`,
        summary: thread.summary,
        evidenceQuote: thread.evidenceQuote,
        confidence: thread.relevanceScore,
      }));
    const workContext: PaperChatRelatedContext[] = viewModel.relatedWorks.slice(0, 4).map(work => ({
      id: `work:${work.slug}`,
      sourceKind: 'work',
      title: work.name,
      href: work.href,
      relation: `${work.typeLabel}${work.organizationName ? ` · ${work.organizationName}` : ''}`,
      summary: WORK_MATCH_LABELS[work.matchReason],
      evidenceQuote: work.matchReason,
      confidence: work.confidence,
    }));

    return [...threadContext, ...workContext].slice(0, 6);
  }, [viewModel.relatedThreads, viewModel.relatedWorks]);
  const translationScopeLabel = hasPdf ? `第 ${pageNumber} 页` : 'Abstract';

  function jumpToSection(section: (typeof structureSections)[number]) {
    activateReaderAnchor(previewForSection(section));
    if (!section.pageStart || !hasPdf) return;
    setPageNumber(section.pageStart);
    scrollToPdfViewer();
  }

  function jumpToCitation(citation: PaperChatCitation) {
    activateReaderAnchor(previewForCitation(citation));
    if (!citation.pageNumber || !hasPdf) return;
    setPageNumber(citation.pageNumber);
    scrollToPdfViewer();
  }

  function jumpToSkimmingItem(item: PaperSkimmingAssistItem) {
    activateReaderAnchor(previewForSkimmingItem(item));
    if (!item.pageNumber || !hasPdf) return;
    setPageNumber(item.pageNumber);
    scrollToPdfViewer();
  }

  function jumpToFigure(item: PaperFigureCard) {
    activateReaderAnchor(previewForFigure(item));
    setActiveFigureId(item.id);
    if (!item.pageNumber || !hasPdf) return;
    setPageNumber(item.pageNumber);
    scrollToPdfViewer();
  }

  function seedNoteFromFigure(item: PaperFigureCard) {
    activateReaderAnchor(previewForFigure(item));
    setActiveFigureId(item.id);
    if (item.pageNumber && hasPdf) setPageNumber(item.pageNumber);
    setNoteQuote(`${item.label}: ${item.caption}`);
    setNoteBody(item.readerHint);
    setNoteError(null);
    setActiveTab('notes');
  }

  function jumpToReadingStep(item: PaperReadingPathStep) {
    activateReaderAnchor(previewForReadingStep(item));
    if (item.kind === 'figure' && item.targetId) setActiveFigureId(item.targetId);
    if (!item.pageNumber || !hasPdf) return;
    setPageNumber(item.pageNumber);
    scrollToPdfViewer();
  }

  function jumpToGuideAnchor(anchor: GuideAnchorTarget) {
    activateReaderAnchor(previewForGuideAnchor(anchor));
    if (!anchor.pageNumber || !hasPdf) return;
    setPageNumber(anchor.pageNumber);
    scrollToPdfViewer();
  }

  function jumpToNote(note: PaperNote) {
    if (!note.pageNumber || !hasPdf) return;
    setPageNumber(note.pageNumber);
    scrollToPdfViewer();
  }

  function previewForSection(section: (typeof structureSections)[number]): PaperReaderAnchorPreview {
    return {
      id: readerAnchorKey('section', section.id),
      kind: 'section',
      label: SECTION_LABELS[section.sectionType],
      pageNumber: section.pageStart,
      sectionTitle: section.title,
      quote: section.textPreview || null,
    };
  }

  function previewForSkimmingItem(item: PaperSkimmingAssistItem): PaperReaderAnchorPreview {
    return {
      id: readerAnchorKey('skim', item.id),
      kind: 'skim',
      label: item.label,
      pageNumber: item.pageNumber,
      sectionTitle: item.sectionTitle,
      quote: item.textPreview || item.body,
    };
  }

  function previewForFigure(item: PaperFigureCard): PaperReaderAnchorPreview {
    return {
      id: readerAnchorKey('figure', item.id),
      kind: 'figure',
      label: item.label,
      pageNumber: item.pageNumber,
      sectionTitle: item.evidenceLabel,
      quote: item.caption,
    };
  }

  function previewForReadingStep(item: PaperReadingPathStep): PaperReaderAnchorPreview {
    return {
      id: readerAnchorKey('reading', item.id),
      kind: 'reading',
      label: item.label,
      pageNumber: item.pageNumber,
      sectionTitle: item.title,
      quote: item.why,
    };
  }

  function previewForGuideAnchor(anchor: GuideAnchorTarget): PaperReaderAnchorPreview {
    return {
      id: readerAnchorKey('guide', anchor.id),
      kind: 'guide',
      label: anchor.label,
      pageNumber: anchor.pageNumber,
      sectionTitle: anchor.sectionTitle || SECTION_LABELS[anchor.sectionType],
      quote: anchor.source === 'skimming' ? 'Skimming Assist anchor' : 'Section anchor',
    };
  }

  function previewForCitation(citation: PaperChatCitation): PaperReaderAnchorPreview {
    return {
      id: readerAnchorKey('citation', citation.chunkId),
      kind: 'citation',
      label: citation.label,
      pageNumber: citation.pageNumber,
      sectionTitle: citation.sectionTitle || SECTION_LABELS[citation.sectionType],
      quote: citation.quote,
    };
  }

  function activateReaderAnchor(preview: PaperReaderAnchorPreview) {
    setActiveReaderAnchorId(preview.id);
    setReaderAnchorPreview(preview);
  }

  function scrollToPdfViewer() {
    document.querySelector('[data-paper-pdf-viewer]')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function applySuggestedQuestion(question: string) {
    setActiveTab('chat');
    setChatInput(question);
  }

  useEffect(() => {
    setTranslationState({ status: 'idle', result: null, error: null });
  }, [hasPdf, pageNumber, viewModel.source.id]);

  useEffect(() => {
    setNotes(viewModel.notes);
    setNoteBody('');
    setNoteQuote('');
    setNoteError(null);
  }, [viewModel.notes, viewModel.source.id]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [chatMessages, chatPending]);

  async function requestTranslation() {
    setTranslationState({ status: 'loading', result: null, error: null });
    try {
      const response = await fetch(`/api/source/paper/${viewModel.source.id}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: hasPdf ? 'page' : 'abstract',
          pageNumber: hasPdf ? pageNumber : undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || '翻译失败');
      }
      setTranslationState({ status: 'ready', result: payload as PaperTranslationResponse, error: null });
    } catch (error) {
      setTranslationState({
        status: 'error',
        result: null,
        error: error instanceof Error ? error.message : '翻译失败',
      });
    }
  }

  async function sendChatQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question || chatPending) return;

    const userMessage: PaperChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    };
    setChatMessages(messages => [...messages, userMessage]);
    setChatInput('');
    setChatPending(true);
    setChatError(null);

    try {
      const chatHistoryForRequest = chatMessages
        .filter(message => message.id !== 'assistant-initial')
        .slice(-6)
        .map(message => ({
          role: message.role,
          content: message.content,
        }));
      const response = await fetch(`/api/source/paper/${viewModel.source.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: chatHistoryForRequest,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || '论文问答暂时不可用');
      }
      const result = payload as PaperChatResponse;
      setChatMessages(messages => [
        ...messages,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: String(result.answer || ''),
          citations: Array.isArray(result.citations) ? result.citations : [],
          relatedContext: Array.isArray(result.relatedContext) ? result.relatedContext : [],
          provider: result.provider,
          usage: result.usage,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : '论文问答暂时不可用';
      setChatError(message);
      setChatMessages(messages => [
        ...messages,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: message,
        },
      ]);
    } finally {
      setChatPending(false);
    }
  }

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = noteBody.trim();
    if (!body || notePending) return;

    setNotePending(true);
    setNoteError(null);
    try {
      const response = await fetch(`/api/source/paper/${viewModel.source.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          quote: noteQuote.trim() || null,
          pageNumber: hasPdf ? pageNumber : null,
          sectionId: currentPageSection?.id ?? null,
          sectionTitle: currentPageSection?.title ?? null,
          sectionType: currentPageSection?.sectionType ?? null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || '保存笔记失败');
      setNotes((payload as PaperNotesResponse).notes || []);
      setNoteBody('');
      setNoteQuote('');
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : '保存笔记失败');
    } finally {
      setNotePending(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (notePending) return;
    setNotePending(true);
    setNoteError(null);
    try {
      const response = await fetch(`/api/source/paper/${viewModel.source.id}/notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || '删除笔记失败');
      setNotes((payload as PaperNotesResponse).notes || []);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : '删除笔记失败');
    } finally {
      setNotePending(false);
    }
  }

  useEffect(() => {
    if (!viewModel.paper.pdfProxyUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasElement = canvas;

    let cancelled = false;
    let loadingTask: { promise: Promise<unknown>; destroy?: () => void } | null = null;
    let renderTask: { promise: Promise<unknown>; cancel?: () => void } | null = null;

    async function renderPage() {
      setRenderState('loading');
      setRenderError(null);
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        loadingTask = pdfjs.getDocument({ url: viewModel.paper.pdfProxyUrl! });
        const pdf = await loadingTask.promise as { numPages: number; getPage: (page: number) => Promise<unknown> };
        if (cancelled) return;
        setPageCount(pdf.numPages);
        const safePage = Math.min(Math.max(1, pageNumber), pdf.numPages);
        if (safePage !== pageNumber) {
          setPageNumber(safePage);
          return;
        }

        const page = await pdf.getPage(safePage) as {
          getViewport: (params: { scale: number }) => { width: number; height: number };
          render: (params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<unknown>; cancel?: () => void };
        };
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const context = canvasElement.getContext('2d');
        if (!context) throw new Error('Canvas context unavailable');

        const outputScale = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
        canvasElement.width = Math.floor(viewport.width * outputScale);
        canvasElement.height = Math.floor(viewport.height * outputScale);
        canvasElement.style.width = `${Math.floor(viewport.width)}px`;
        canvasElement.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
        if (!cancelled) setRenderState('ready');
      } catch (error) {
        if (cancelled) return;
        setRenderState('error');
        setRenderError(error instanceof Error ? error.message : 'PDF 渲染失败');
      }
    }

    renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel?.();
      loadingTask?.destroy?.();
    };
  }, [pageNumber, scale, viewModel.paper.pdfProxyUrl]);

  return (
    <main
      className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6"
      data-paper-source-workspace
      data-paper-id={viewModel.source.id}
      data-paper-has-pdf={hasPdf ? 'true' : 'false'}
      data-paper-guide-status={viewModel.guide.status}
      data-paper-guide-cache-hit={viewModel.guide.cacheHit ? 'true' : 'false'}
      data-paper-guide-refresh-state={guideRefreshState}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_440px]" data-paper-reading-area>
      <section className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-500">
                <span className="rounded-md bg-sky-50 px-2 py-1 text-sky-700">{viewModel.source.sourceLabel}</span>
                <span>{viewModel.person.name}</span>
                {viewModel.paper.venue && (
                  <>
                    <span className="text-stone-300">/</span>
                    <span>{viewModel.paper.venue}</span>
                  </>
                )}
              </div>
              <h1 className="mt-2 line-clamp-2 text-2xl font-semibold tracking-tight text-stone-950">{viewModel.source.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-400">
                {viewModel.person.currentTitle && <span>{viewModel.person.currentTitle}</span>}
                {viewModel.source.publishedAt && <span>{viewModel.source.publishedAt}</span>}
                {viewModel.paper.citationCount !== null && <span>{viewModel.paper.citationCount.toLocaleString()} 引用</span>}
                {visibleAuthors && <span className="truncate">{visibleAuthors}{viewModel.paper.authors.length > 5 ? ', ...' : ''}</span>}
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              {viewModel.paper.doi && (
                <a
                  href={`https://doi.org/${viewModel.paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                  data-paper-external-link="doi"
                >
                  DOI
                </a>
              )}
              {viewModel.paper.openalexUrl && (
                <a
                  href={viewModel.paper.openalexUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                  data-paper-external-link="openalex"
                >
                  OpenAlex
                </a>
              )}
              <a
                href={viewModel.source.landingPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                data-paper-external-link="landing"
              >
                原页面
              </a>
            </div>
          </div>
        </section>

        {hasPdf ? (
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm" data-paper-pdf-viewer>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="rounded-md bg-sky-50 px-2 py-1 font-medium text-sky-700">PDF.js</span>
                <span>{viewModel.paper.pdfResolution.source === 'arxiv' ? 'arXiv PDF' : '开放 PDF'}</span>
                {pageCount && <span>{pageNumber} / {pageCount}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setScale(value => Math.max(0.75, Number((value - 0.15).toFixed(2))))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-500 hover:border-orange-200 hover:text-orange-700"
                  aria-label="缩小 PDF"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setScale(value => Math.min(1.8, Number((value + 0.15).toFixed(2))))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-500 hover:border-orange-200 hover:text-orange-700"
                  aria-label="放大 PDF"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setPageNumber(value => Math.max(1, value - 1))}
                  disabled={pageNumber <= 1}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-500 hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:text-stone-300"
                >
                  上一页
                </button>
                <button
                  type="button"
                  onClick={() => setPageNumber(value => pageCount ? Math.min(pageCount, value + 1) : value + 1)}
                  disabled={Boolean(pageCount && pageNumber >= pageCount)}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-500 hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:text-stone-300"
                >
                  下一页
                </button>
              </div>
            </div>
            <div className="border-b border-stone-200 bg-white/95 px-3 py-2" data-paper-skimming-overlay>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase text-stone-400">Skim p.{pageNumber}</span>
                {(currentPageSkimmingItems.length > 0 ? currentPageSkimmingItems : skimmingAssist.slice(0, 3)).map(item => (
                  <button
                    key={`overlay-${item.id}`}
                    type="button"
                    onClick={() => jumpToSkimmingItem(item)}
                    onMouseEnter={() => activateReaderAnchor(previewForSkimmingItem(item))}
                    onFocus={() => activateReaderAnchor(previewForSkimmingItem(item))}
                    disabled={!item.pageNumber}
                    className={`inline-flex h-7 max-w-[220px] items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition ${
                      item.pageNumber === pageNumber
                        ? 'border-orange-200 bg-orange-50 text-orange-700'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-orange-200 hover:text-orange-700'
                    } disabled:cursor-default disabled:border-stone-100 disabled:text-stone-300`}
                    data-paper-skim-overlay-item
                    data-paper-active-anchor={activeReaderAnchorId === readerAnchorKey('skim', item.id) ? 'true' : 'false'}
                    data-skim-role={item.role}
                    data-page-number={item.pageNumber ?? undefined}
                  >
                    <span>{item.label}</span>
                    {item.pageNumber && <span className="font-mono text-[10px]">p.{item.pageNumber}</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[72vh] overflow-auto px-3 py-4">
              {renderState !== 'error' && (
                <div className="mx-auto w-fit rounded-lg bg-white shadow-sm">
                  <canvas ref={canvasRef} data-paper-pdf-canvas />
                </div>
              )}
              {renderState === 'loading' && (
                <div className="py-5 text-center text-xs text-stone-500">正在渲染 PDF...</div>
              )}
              {renderState === 'error' && (
                <section
                  className="mx-auto my-2 max-w-2xl rounded-xl border border-amber-100 bg-white px-4 py-4 shadow-sm"
                  data-paper-pdf-render-fallback
                  data-paper-abstract-fallback="pdf-render-error"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-amber-700">PDF 暂不可读</div>
                      <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-950">先看 Abstract</h2>
                    </div>
                    <a
                      href={viewModel.source.landingPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                      data-paper-external-link="pdf-fallback-landing"
                    >
                      打开来源
                    </a>
                  </div>
                  <p className="text-sm leading-7 text-stone-700">{viewModel.paper.abstract}</p>
                  <p className="mt-3 text-xs leading-5 text-amber-700">{renderError || 'PDF 渲染失败'}</p>
                </section>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" data-paper-abstract-fallback>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-sky-600">Abstract</div>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-950">开放 PDF 暂无</h2>
              </div>
              <a
                href={viewModel.source.landingPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                data-paper-external-link="fallback-landing"
              >
                打开来源
              </a>
            </div>
            <p className="text-sm leading-7 text-stone-700">{viewModel.paper.abstract}</p>
            {viewModel.paper.pdfResolution.message && (
              <p className="mt-3 text-xs text-stone-400">{viewModel.paper.pdfResolution.message}</p>
            )}
          </section>
        )}

        {structureSections.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold text-sky-600">论文结构</div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-950">章节导航</h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="w-fit rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-500">{guideMeta}</span>
              <span className="w-fit rounded-md bg-sky-50 px-2 py-1 text-xs text-sky-700">{structureMeta}</span>
            </div>
          </div>
          {viewModel.structure.source === 'paper_document' && structureSections.length > 0 && (
            <div className="mt-4 border-t border-stone-100 pt-4" data-paper-structure-timeline>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-stone-400">解析结构</div>
                <div className="text-[11px] text-stone-400">
                  {viewModel.structure.status}
                  {viewModel.structure.pageCount ? ` · ${viewModel.structure.pageCount} pages` : ''}
                </div>
              </div>
              <div className="grid gap-2">
                {structureSections.slice(0, 8).map(section => (
                  <div
                    key={section.id}
                    id={paperSectionAnchorId(section.id)}
                    className={`scroll-mt-24 flex items-start justify-between gap-3 rounded-xl border px-3 py-2 transition ${
                      activeReaderAnchorId === readerAnchorKey('section', section.id)
                        ? 'border-orange-200 bg-orange-50/60'
                        : 'border-stone-100'
                    }`}
                    onMouseEnter={() => activateReaderAnchor(previewForSection(section))}
                    onFocus={() => activateReaderAnchor(previewForSection(section))}
                    data-paper-section-id={section.id}
                    data-paper-section-preview
                    data-paper-active-anchor={activeReaderAnchorId === readerAnchorKey('section', section.id) ? 'true' : 'false'}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase text-sky-600">{SECTION_LABELS[section.sectionType]}</span>
                        <span className="truncate text-xs font-medium text-stone-700">{section.title}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-stone-400">{section.textPreview}</p>
                    </div>
                    {section.pageStart && hasPdf && (
                      <button
                        type="button"
                        onClick={() => jumpToSection(section)}
                        className="inline-flex h-7 shrink-0 items-center rounded-md border border-stone-200 bg-white px-2 text-[11px] font-medium text-stone-500 hover:border-orange-200 hover:text-orange-700"
                        data-paper-section-anchor
                      >
                        p.{section.pageStart}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        )}
      </section>

      <aside className="min-w-0 lg:sticky lg:top-[4.5rem] lg:h-[calc(100vh-5.5rem)]">
        <section className="flex max-h-[78vh] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:h-full lg:max-h-none">
          <div className="border-b border-stone-100 px-3 py-3">
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1">
              <TabButton active={activeTab === 'guide'} onClick={() => setActiveTab('guide')}>导读</TabButton>
              <TabButton active={activeTab === 'translation'} onClick={() => setActiveTab('translation')}>翻译</TabButton>
              <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>Chat</TabButton>
              <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>Notes</TabButton>
            </div>
          </div>

          {activeTab === 'guide' ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-paper-guide-tab>
              {viewModel.guide.status !== 'ready' && (
                <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50/50 px-3 py-3" data-paper-guide-generate-cta>
                  <p className="text-xs leading-5 text-stone-600">
                    当前为基于摘要的初步导读。完整 AI 导读由 DeepSeek 生成，按需触发。
                  </p>
                  {isAuthenticated ? (
                    <button
                      type="button"
                      onClick={generateGuide}
                      disabled={guideRefreshState === 'loading'}
                      className="mt-2 inline-flex h-8 items-center rounded-md border border-orange-200 bg-white px-3 text-xs font-medium text-orange-700 transition hover:border-orange-300 disabled:cursor-not-allowed disabled:text-stone-400"
                      data-paper-guide-generate
                    >
                      {guideRefreshState === 'loading' ? '生成中…' : '生成完整 AI 导读'}
                    </button>
                  ) : (
                    <a
                      href="/login"
                      className="mt-2 inline-flex h-8 items-center rounded-md border border-orange-200 bg-white px-3 text-xs font-medium text-orange-700 transition hover:border-orange-300"
                      data-paper-guide-login
                    >
                      登录后可生成完整 AI 导读
                    </a>
                  )}
                </div>
              )}
              <div id="paper-guide-summary" className="mb-4 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-3">
                <div className="text-xs font-medium text-stone-400">一句话结论</div>
                <p className="mt-1 text-sm font-semibold leading-6 text-stone-950">{viewModel.guide.data.summary}</p>
                <GuideAnchorButton
                  anchor={guideAnchors.summary}
                  hasPdf={hasPdf}
                  onJump={jumpToGuideAnchor}
                />
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-stone-400">
                  <span>{guideMeta}</span>
                  {viewModel.guide.generatedAt && <span>{formatDateTime(viewModel.guide.generatedAt)}</span>}
                  {viewModel.guide.usage?.totalTokens && <span>{viewModel.guide.usage.totalTokens} tokens</span>}
                </div>
              </div>
              <SemanticReadingPathPanel
                steps={semanticReadingPath}
                hasPdf={hasPdf}
                onJump={jumpToReadingStep}
                onPreview={step => activateReaderAnchor(previewForReadingStep(step))}
                activeAnchorId={activeReaderAnchorId}
              />
              <ReaderAnchorPreviewPanel preview={activeReaderPreview} />
              <SkimmingAssistPanel
                items={skimmingAssist}
                jumpTargetCount={viewModel.semanticReader.jumpTargetCount}
                onJump={jumpToSkimmingItem}
                onPreview={item => activateReaderAnchor(previewForSkimmingItem(item))}
                activeAnchorId={activeReaderAnchorId}
                hasPdf={hasPdf}
              />
              <FigureCarouselPanel
                figures={figures}
                activeFigure={activeFigure}
                hasPdf={hasPdf}
                pdfProxyUrl={viewModel.paper.pdfProxyUrl}
                onJump={jumpToFigure}
                onNote={seedNoteFromFigure}
                onPreview={figure => activateReaderAnchor(previewForFigure(figure))}
                activeAnchorId={activeReaderAnchorId}
              />
              <CitationCardsPanel
                cards={citationCards}
                status={viewModel.semanticReader.referenceStatus}
              />
              <GuideBlock id="paper-guide-problem" title="研究问题" body={viewModel.guide.data.problem} anchor={guideAnchors.problem} hasPdf={hasPdf} onJump={jumpToGuideAnchor} />
              <GuideBlock id="paper-guide-novelty" title="新意" body={viewModel.guide.data.novelty} anchor={guideAnchors.novelty} hasPdf={hasPdf} onJump={jumpToGuideAnchor} />
              <GuideBlock id="paper-guide-method" title="方法" body={viewModel.guide.data.method} anchor={guideAnchors.method} hasPdf={hasPdf} onJump={jumpToGuideAnchor} />
              <GuideBlock id="paper-guide-experiments" title="实验和关键数字" body={viewModel.guide.data.experiments} anchor={guideAnchors.experiments} hasPdf={hasPdf} onJump={jumpToGuideAnchor} />
              <GuideBlock id="paper-guide-limitations" title="局限" body={viewModel.guide.data.limitations} anchor={guideAnchors.limitations} hasPdf={hasPdf} onJump={jumpToGuideAnchor} />
              <GuideBlock title="适合谁读" body={viewModel.guide.data.fit.whoShouldRead} />
              <GuideBlock title="和产品的关系" body={viewModel.guide.data.fit.whyRelevantToProduct} />
              {viewModel.guide.status !== 'ready' && viewModel.guide.message && (
                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                  {viewModel.guide.message}
                </div>
              )}
              {guideRefreshState === 'loading' && (
                <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-700" data-paper-guide-refresh-loading>
                  正在生成结构化导读，完成后会自动替换当前摘要导读。
                </div>
              )}
              {guideRefreshState === 'error' && (
                <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700" data-paper-guide-refresh-error>
                  <div>{guideRefreshError || '导读生成失败'}</div>
                  <button
                    type="button"
                    className="mt-2 inline-flex h-7 items-center rounded-md border border-rose-200 bg-white px-2 text-[11px] font-medium text-rose-700 hover:border-rose-300"
                    data-paper-guide-refresh-retry
                    onClick={() => {
                      guideRefreshSourceRef.current = null;
                      setGuideRefreshError(null);
                      setGuideRefreshState('idle');
                    }}
                  >
                    重试
                  </button>
                </div>
              )}
            </div>
          ) : activeTab === 'translation' ? (
            isAuthenticated ? (
              <TranslationPanel
                state={translationState}
                scopeLabel={translationScopeLabel}
                onTranslate={requestTranslation}
              />
            ) : (
              <PaperLoginGate feature="翻译" />
            )
          ) : activeTab === 'chat' ? (
            isAuthenticated ? (
              <PaperChatPanel
                title={viewModel.source.title}
                chunkCount={viewModel.structure.chunkCount}
                messages={chatMessages}
                pending={chatPending}
                error={chatError}
                input={chatInput}
                relatedContext={chatRelatedContext}
                onInputChange={setChatInput}
                onSubmit={sendChatQuestion}
                onCitationClick={jumpToCitation}
                onCitationPreview={citation => activateReaderAnchor(previewForCitation(citation))}
                onSuggestedQuestion={applySuggestedQuestion}
                scrollRef={chatScrollRef}
              />
            ) : (
              <PaperLoginGate feature="Chat 问答" />
            )
          ) : (
            isAuthenticated ? (
              <PaperNotesPanel
                notes={notes}
                body={noteBody}
                quote={noteQuote}
                pending={notePending}
                error={noteError}
                pageNumber={hasPdf ? pageNumber : null}
                section={currentPageSection}
                hasPdf={hasPdf}
                onBodyChange={setNoteBody}
                onQuoteChange={setNoteQuote}
                onSubmit={createNote}
                onJump={jumpToNote}
                onDelete={deleteNote}
              />
            ) : (
              <PaperLoginGate feature="笔记" />
            )
          )}
        </section>
      </aside>
      </div>
      {hasEvidence && (
        <section className="mt-6 border-t border-stone-100 pt-6" data-paper-evidence-graph>
          <div className="mb-3">
            <h2 className="text-lg font-semibold tracking-tight text-stone-950">关联与证据</h2>
            <p className="mt-0.5 text-xs text-stone-400">
              论文之外的延伸——作者、相关工作与主题，供探索，不影响上方阅读。
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <PaperPeoplePanel
              people={viewModel.paper.authorPeople}
              reviewCandidates={viewModel.paper.authorReviewCandidates}
              entityReviewQueue={viewModel.entityReviewQueue}
            />
            <RelatedWorksPanel works={viewModel.relatedWorks} />
            <RelatedThreadsPanel threads={viewModel.relatedThreads} />
          </div>
        </section>
      )}
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center rounded-lg text-sm font-medium transition ${
        active ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-orange-700'
      }`}
    >
      {children}
    </button>
  );
}

function PaperLoginGate({ feature }: { feature: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center" data-paper-login-gate>
      <p className="text-sm font-medium text-stone-700">登录后可使用{feature}</p>
      <p className="mt-1 text-xs leading-5 text-stone-400">
        {feature}由模型按需生成，仅向登录用户开放。
      </p>
      <a
        href="/login"
        className="mt-3 inline-flex h-8 items-center rounded-md border border-orange-200 bg-white px-3 text-xs font-medium text-orange-700 transition hover:border-orange-300"
      >
        去登录
      </a>
    </div>
  );
}

function ReaderAnchorPreviewPanel({ preview }: { preview: PaperReaderAnchorPreview | null }) {
  return (
    <section
      className="mb-4 rounded-xl border border-orange-100 bg-orange-50/35 px-3 py-3"
      data-paper-reader-anchor-preview
      data-anchor-kind={preview?.kind ?? 'none'}
      data-page-number={preview?.pageNumber ?? undefined}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-orange-700">原文锚点</div>
          <div className="mt-0.5 text-[11px] text-stone-500">Page / Section / Quote</div>
        </div>
        {preview?.pageNumber ? (
          <span className="rounded-md bg-white px-2 py-1 font-mono text-[11px] text-orange-700" data-paper-reader-anchor-page>
            p.{preview.pageNumber}
          </span>
        ) : (
          <span className="rounded-md bg-white px-2 py-1 text-[11px] text-stone-400" data-paper-reader-anchor-page>
            no page
          </span>
        )}
      </div>
      {preview ? (
        <div className="rounded-lg bg-white px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700">
              {preview.label}
            </span>
            {preview.sectionTitle && (
              <span className="line-clamp-1 text-xs font-medium text-stone-700" data-paper-reader-anchor-section>
                {preview.sectionTitle}
              </span>
            )}
          </div>
          {preview.quote && (
            <p className="mt-2 line-clamp-4 border-l-2 border-orange-100 pl-2 text-[11px] leading-5 text-stone-500" data-paper-reader-anchor-quote>
              {preview.quote}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-orange-100 bg-white/75 px-3 py-4 text-xs leading-5 text-stone-400" data-paper-reader-anchor-empty>
          Hover 或点击章节、图表、阅读路径、citation 后会显示原文位置。
        </div>
      )}
    </section>
  );
}

function SemanticReadingPathPanel({
  steps,
  hasPdf,
  onJump,
  onPreview,
  activeAnchorId,
}: {
  steps: PaperReadingPathStep[];
  hasPdf: boolean;
  onJump: (item: PaperReadingPathStep) => void;
  onPreview: (item: PaperReadingPathStep) => void;
  activeAnchorId: string | null;
}) {
  return (
    <section className="mb-4 rounded-xl border border-orange-100 bg-orange-50/40 px-3 py-3" data-paper-semantic-reading-path>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-orange-700">增强阅读路径</div>
          <div className="mt-0.5 text-[11px] text-stone-500">按图表、方法、结果和局限导航</div>
        </div>
        <span className="rounded-md bg-white px-2 py-1 text-[11px] text-orange-700">
          {steps.length} steps
        </span>
      </div>

      {steps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-orange-100 bg-white/70 px-3 py-4 text-xs leading-5 text-stone-400">
          等待结构化解析后生成阅读路径。
        </div>
      ) : (
        <div className="space-y-2">
          {steps.map(step => (
            <article
              key={step.id}
              className={`rounded-lg border px-3 py-2 shadow-sm transition ${
                activeAnchorId === readerAnchorKey('reading', step.id)
                  ? 'border-orange-200 bg-orange-50/80'
                  : 'border-white bg-white'
              }`}
              onMouseEnter={() => onPreview(step)}
              onFocus={() => onPreview(step)}
              data-paper-reading-step
              data-reading-kind={step.kind}
              data-reading-target-id={step.targetId ?? undefined}
              data-page-number={step.pageNumber ?? undefined}
              data-paper-reading-step-preview
              data-paper-active-anchor={activeAnchorId === readerAnchorKey('reading', step.id) ? 'true' : 'false'}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase text-orange-700">{step.label}</div>
                  <div className="mt-1 line-clamp-1 text-sm font-semibold text-stone-950">{step.title}</div>
                </div>
                {step.pageNumber && hasPdf && (
                  <button
                    type="button"
                    onClick={() => onJump(step)}
                    className="inline-flex h-7 shrink-0 items-center rounded-md border border-stone-200 bg-white px-2 text-[11px] font-medium text-stone-500 transition hover:border-orange-200 hover:text-orange-700"
                    data-paper-reading-step-jump
                  >
                    p.{step.pageNumber}
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs leading-5 text-stone-500">{step.why}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SkimmingAssistPanel({
  items,
  jumpTargetCount,
  onJump,
  onPreview,
  activeAnchorId,
  hasPdf,
}: {
  items: PaperSkimmingAssistItem[];
  jumpTargetCount: number;
  onJump: (item: PaperSkimmingAssistItem) => void;
  onPreview: (item: PaperSkimmingAssistItem) => void;
  activeAnchorId: string | null;
  hasPdf: boolean;
}) {
  return (
    <section className="mb-4 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-3" data-paper-skimming-assist>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-sky-700">快速扫读</div>
          <div className="mt-0.5 text-[11px] text-stone-500">Objective / Novelty / Method / Result / Limitation</div>
        </div>
        <span className="rounded-md bg-white px-2 py-1 text-[11px] text-sky-700">
          {jumpTargetCount} jumps
        </span>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <article
            key={item.id}
            className={`rounded-lg border px-3 py-2 shadow-sm transition ${
              activeAnchorId === readerAnchorKey('skim', item.id)
                ? 'border-orange-200 bg-orange-50/70'
                : 'border-white bg-white'
            }`}
            onMouseEnter={() => onPreview(item)}
            onFocus={() => onPreview(item)}
            data-paper-skim-card
            data-skim-role={item.role}
            data-page-number={item.pageNumber ?? undefined}
            data-paper-skim-preview
            data-paper-active-anchor={activeAnchorId === readerAnchorKey('skim', item.id) ? 'true' : 'false'}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="rounded-md bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">{item.label}</span>
                {item.sectionTitle && (
                  <span className="truncate text-xs font-medium text-stone-600">{item.sectionTitle}</span>
                )}
              </div>
              {item.pageNumber && hasPdf && (
                <button
                  type="button"
                  onClick={() => onJump(item)}
                  className="inline-flex h-7 shrink-0 items-center rounded-md border border-stone-200 bg-white px-2 text-[11px] font-medium text-stone-500 transition hover:border-orange-200 hover:text-orange-700"
                  data-paper-skim-jump
                >
                  p.{item.pageNumber}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-700">{item.body}</p>
            {item.textPreview && (
              <p className="mt-2 line-clamp-2 border-l-2 border-sky-100 pl-2 text-[11px] leading-5 text-stone-400">
                {item.textPreview}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function FigureCarouselPanel({
  figures,
  activeFigure,
  hasPdf,
  pdfProxyUrl,
  onJump,
  onNote,
  onPreview,
  activeAnchorId,
}: {
  figures: PaperFigureCard[];
  activeFigure: PaperFigureCard | null;
  hasPdf: boolean;
  pdfProxyUrl: string | null;
  onJump: (item: PaperFigureCard) => void;
  onNote: (item: PaperFigureCard) => void;
  onPreview: (item: PaperFigureCard) => void;
  activeAnchorId: string | null;
}) {
  return (
    <section className="mb-4 rounded-xl border border-stone-200 bg-white px-3 py-3" data-paper-figure-carousel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-stone-700">图表速览</div>
          <div className="mt-0.5 text-[11px] text-stone-500">Figures / Tables</div>
        </div>
        <span className="rounded-md bg-stone-100 px-2 py-1 text-[11px] text-stone-500">
          {figures.length} items
        </span>
      </div>

      {figures.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-200 px-3 py-4 text-xs leading-5 text-stone-400" data-paper-figure-empty>
          暂未从已解析页识别到图表 caption。
        </div>
      ) : (
        <>
          <div className="flex snap-x gap-2 overflow-x-auto pb-1" data-paper-figure-list>
            {figures.map(figure => (
              <article
                key={figure.id}
                className={`min-w-[260px] snap-start rounded-lg border px-3 py-2 transition ${
                  activeFigure?.id === figure.id || activeAnchorId === readerAnchorKey('figure', figure.id)
                    ? 'border-orange-100 bg-orange-50/50'
                    : 'border-stone-100 bg-stone-50/80 hover:border-orange-100 hover:bg-white'
                }`}
                onMouseEnter={() => onPreview(figure)}
                onFocus={() => onPreview(figure)}
                data-paper-figure-card
                data-paper-figure-active={activeFigure?.id === figure.id ? 'true' : 'false'}
                data-paper-figure-role={figure.evidenceRole}
                data-page-number={figure.pageNumber ?? undefined}
                data-paper-figure-preview
                data-paper-active-anchor={activeAnchorId === readerAnchorKey('figure', figure.id) ? 'true' : 'false'}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="text-xs font-semibold text-stone-900">{figure.label}</div>
                      <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-orange-700" data-paper-figure-role-label>
                        {figure.evidenceLabel}
                      </span>
                    </div>
                    {figure.pageNumber && (
                      <div className="mt-0.5 text-[11px] text-stone-400">p.{figure.pageNumber}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onJump(figure)}
                    className="inline-flex h-7 shrink-0 items-center rounded-md border border-stone-200 bg-white px-2 text-[11px] font-medium text-stone-500 transition hover:border-orange-200 hover:text-orange-700"
                    data-paper-figure-jump
                  >
                    {figure.pageNumber && hasPdf ? '跳页' : '聚焦'}
                  </button>
                </div>
                <p className="mt-2 line-clamp-4 text-[11px] leading-5 text-stone-600">{figure.caption}</p>
                <p className="mt-2 rounded-md bg-white/80 px-2 py-1.5 text-[11px] leading-5 text-stone-600" data-paper-figure-question>
                  {figure.readerQuestion}
                </p>
                <p className="mt-2 border-l-2 border-orange-100 pl-2 text-[11px] leading-5 text-stone-400">{figure.readerHint}</p>
              </article>
            ))}
          </div>

          {activeFigure && (
            <article
              className="mt-3 overflow-hidden rounded-xl border border-orange-100 bg-orange-50/35"
              data-paper-figure-focus
              data-paper-figure-role={activeFigure.evidenceRole}
              data-page-number={activeFigure.pageNumber ?? undefined}
            >
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                <div className="px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs font-semibold text-orange-700">{activeFigure.label}</div>
                        <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-orange-700" data-paper-figure-role-label>
                          {activeFigure.evidenceLabel}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-5 text-stone-950">
                        {activeFigure.pageNumber ? `Page ${activeFigure.pageNumber}` : 'Caption focus'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNote(activeFigure)}
                      className="inline-flex h-8 items-center rounded-md border border-orange-100 bg-white px-2 text-[11px] font-medium text-orange-700 hover:border-orange-200"
                      data-paper-figure-note
                    >
                      记笔记
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-stone-700">{activeFigure.caption}</p>
                  <p className="mt-2 rounded-lg bg-white/75 px-3 py-2 text-xs leading-5 text-stone-700" data-paper-figure-question>
                    {activeFigure.readerQuestion}
                  </p>
                  <p className="mt-2 border-l-2 border-orange-200 pl-2 text-[11px] leading-5 text-stone-500">{activeFigure.readerHint}</p>
                </div>
                <div className="border-t border-orange-100 bg-white/75 md:border-l md:border-t-0" data-paper-figure-page-crop>
                  {activeFigure.pageNumber && pdfProxyUrl ? (
                    <iframe
                      title={`${activeFigure.label} page preview`}
                      src={`${pdfProxyUrl}#page=${activeFigure.pageNumber}&zoom=page-width&toolbar=0&navpanes=0`}
                      className="h-44 w-full"
                      data-paper-figure-page-preview
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center px-3 text-center text-[11px] leading-5 text-stone-400">
                      解析到 caption 后可回跳原文页。
                    </div>
                  )}
                </div>
              </div>
            </article>
          )}
        </>
      )}
    </section>
  );
}

function CitationCardsPanel({
  cards,
  status,
}: {
  cards: PaperReferenceCard[];
  status: PaperSourceViewModel['semanticReader']['referenceStatus'];
}) {
  const statusText = status.cacheHit ? '缓存命中' : status.status === 'ready' ? 'OpenAlex' : status.status;
  const qualityIssue = citationQualityIssue(status);
  const qualityMessage = citationQualityMessage(status);
  const qualityDetail = citationQualityDetail(status);
  return (
    <section className="mb-4 rounded-xl border border-stone-200 bg-white px-3 py-3" data-paper-citation-cards>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-stone-700">引用卡片</div>
          <div className="mt-0.5 text-[11px] text-stone-500">被引论文 title / year / authors / venue / abstract</div>
        </div>
        <span className="rounded-md bg-stone-100 px-2 py-1 text-[11px] text-stone-500">
          {cards.length}/{status.referencesTotal}
        </span>
      </div>

      {cards.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-stone-200 px-3 py-4 text-xs leading-5 text-stone-400"
          data-paper-citation-empty
          data-paper-citation-quality-issue={qualityIssue || undefined}
        >
          {qualityMessage}
          {qualityDetail && (
            <div className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] leading-5 text-amber-700" data-paper-citation-quality-detail>
              {qualityDetail}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map(card => {
            const href = card.sourceHref || (card.doi ? `https://doi.org/${card.doi}` : card.landingPageUrl || card.openalexUrl);
            const isInternal = Boolean(card.sourceHref);
            const previewId = `citation-preview-${domSafeId(card.openalexId)}`;
            return (
              <article
                key={card.openalexId}
                className="group relative rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2 transition hover:border-orange-100 hover:bg-white focus-within:border-orange-100 focus-within:bg-white"
                data-paper-citation-card
                data-openalex-id={card.openalexId}
                data-source-item-id={card.sourceItemId ?? undefined}
                data-paper-citation-hover-card
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <a
                      href={href}
                      target={isInternal ? undefined : '_blank'}
                      rel={isInternal ? undefined : 'noopener noreferrer'}
                      className="line-clamp-2 text-xs font-semibold leading-5 text-stone-900 hover:text-orange-700"
                      data-paper-citation-link={isInternal ? 'internal' : 'external'}
                      aria-describedby={previewId}
                    >
                      {card.title}
                    </a>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-stone-400">
                      {card.year && <span>{card.year}</span>}
                      {card.venue && <span>{card.venue}</span>}
                      {card.citationCount > 0 && <span>{card.citationCount.toLocaleString()} citations</span>}
                      {isInternal && <span className="text-sky-700">站内 source</span>}
                    </div>
                  </div>
                </div>
                {card.authors.length > 0 && (
                  <div className="mt-1 line-clamp-1 text-[11px] text-stone-500">{card.authors.join(', ')}</div>
                )}
                <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-stone-500">{card.abstract}</p>
                <div
                  id={previewId}
                  className="pointer-events-none absolute left-2 right-2 top-full z-20 mt-2 translate-y-1 rounded-xl border border-orange-100 bg-white px-3 py-3 text-left opacity-0 shadow-lg shadow-stone-200/80 transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100"
                  data-paper-citation-hover-preview
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-xs font-semibold leading-5 text-stone-950">{card.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-stone-400">
                        {card.year && <span>{card.year}</span>}
                        {card.venue && <span>{card.venue}</span>}
                        {card.citationCount > 0 && <span>{card.citationCount.toLocaleString()} citations</span>}
                        <span>{isInternal ? '站内 source' : '外部来源'}</span>
                      </div>
                    </div>
                    <a
                      href={href}
                      target={isInternal ? undefined : '_blank'}
                      rel={isInternal ? undefined : 'noopener noreferrer'}
                      className="inline-flex h-7 shrink-0 items-center rounded-md border border-stone-200 px-2 text-[11px] font-medium text-stone-600 hover:border-orange-200 hover:text-orange-700"
                      data-paper-citation-preview-link={isInternal ? 'internal' : 'external'}
                    >
                      打开
                    </a>
                  </div>
                  {card.authors.length > 0 && (
                    <div className="mt-2 text-[11px] leading-5 text-stone-500">{card.authors.join(', ')}</div>
                  )}
                  <p className="mt-2 text-[11px] leading-5 text-stone-600">{card.abstract}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-stone-400">
        <span>{statusText}</span>
        {status.fetchedAt && <span>{formatDateTime(status.fetchedAt)}</span>}
      </div>
    </section>
  );
}

function citationQualityIssue(status: PaperSourceViewModel['semanticReader']['referenceStatus']) {
  if (status.qualityIssue) return status.qualityIssue;
  if (status.message === 'openalex_reference_title_mismatch' || status.message === 'openalex_search_no_title_match') {
    return status.message;
  }
  return null;
}

function citationQualityMessage(status: PaperSourceViewModel['semanticReader']['referenceStatus']) {
  const issue = citationQualityIssue(status);
  if (issue === 'openalex_reference_title_mismatch') {
    return 'OpenAlex 返回的 work title 与当前论文不一致，引用卡片已暂停采用。';
  }
  if (issue === 'openalex_search_no_title_match') {
    return 'OpenAlex search 没有找到标题足够一致的 work，引用卡片已暂停，避免错绑。';
  }
  if (status.message === 'openalex_no_referenced_works') {
    return 'OpenAlex 暂未提供这篇论文的 referenced works。';
  }
  return '引用卡片等待 OpenAlex referenced works。';
}

function citationQualityDetail(status: PaperSourceViewModel['semanticReader']['referenceStatus']) {
  if (!citationQualityIssue(status)) return null;
  const parts = [
    status.openalexWorkTitle ? `候选 work：${status.openalexWorkTitle}` : '没有可采用的 OpenAlex work',
    typeof status.titleSimilarity === 'number' ? `title similarity ${status.titleSimilarity.toFixed(2)}` : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : null;
}

function readInitialPaperPageNumber() {
  if (typeof window === 'undefined') return null;
  const raw = new URL(window.location.href).searchParams.get('page');
  const page = raw ? Number(raw) : NaN;
  return Number.isInteger(page) && page > 0 ? page : null;
}

function paperSectionAnchorId(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized.startsWith('paper-section-') ? normalized : `paper-section-${normalized}`;
}

function readerAnchorKey(kind: PaperReaderAnchorPreviewKind, id: string) {
  return `${kind}:${id}`;
}

function PaperPeoplePanel({
  people,
  reviewCandidates,
  entityReviewQueue,
}: {
  people: PaperSourceViewModel['paper']['authorPeople'];
  reviewCandidates: PaperSourceViewModel['paper']['authorReviewCandidates'];
  entityReviewQueue: PaperSourceViewModel['entityReviewQueue'];
}) {
  if (people.length === 0 && reviewCandidates.length === 0 && entityReviewQueue.length === 0) return null;

  return (
    <section className="mb-4 rounded-xl border border-stone-200 bg-white px-3 py-3" data-paper-author-people>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-stone-700">站内作者</div>
          <div className="mt-0.5 text-[11px] text-stone-500">People 绑定 / 待复核作者</div>
        </div>
        <span className="rounded-md bg-stone-100 px-2 py-1 text-[11px] text-stone-500">
          {people.length} linked / {entityReviewQueue.length} review
        </span>
      </div>

      {people.length > 0 && (
        <div className="space-y-2">
          {people.map(person => (
            <article
              key={person.id}
              className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2"
              data-paper-author-person
              data-person-id={person.id}
              data-match-reason={person.matchReason}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 bg-cover bg-center text-[11px] font-semibold text-sky-700"
                  style={person.avatarUrl ? { backgroundImage: `url(${person.avatarUrl})` } : undefined}
                >
                  {!person.avatarUrl ? authorInitials(person.name) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={person.href}
                    className="line-clamp-1 text-xs font-semibold text-stone-900 hover:text-orange-700"
                    data-paper-author-person-link
                  >
                    {person.name}
                  </a>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-stone-400">
                    {person.currentTitle && <span className="line-clamp-1">{person.currentTitle}</span>}
                    <span>{person.matchReason === 'name_exact' ? '作者名匹配' : '别名匹配'}</span>
                    {person.matchedAuthorName !== person.name && <span>{person.matchedAuthorName}</span>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {reviewCandidates.length > 0 && (
        <div className={people.length > 0 ? 'mt-3 border-t border-stone-100 pt-3' : ''} data-paper-author-review-candidates>
          <div className="mb-2 text-[11px] font-semibold uppercase text-stone-400">Review candidates</div>
          <div className="flex flex-wrap gap-1.5">
            {reviewCandidates.slice(0, 6).map(candidate => (
              <span
                key={`${candidate.name}-${candidate.reason}`}
                className="rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-[11px] text-amber-700"
                data-paper-author-review-candidate
                data-review-reason={candidate.reason}
              >
                {candidate.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {entityReviewQueue.length > 0 && (
        <div
          className={(people.length > 0 || reviewCandidates.length > 0) ? 'mt-3 border-t border-stone-100 pt-3' : ''}
          data-paper-entity-review-queue
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase text-stone-400">Entity review queue</div>
            <div className="text-[11px] text-stone-400">待人工确认，不自动写入实体库</div>
          </div>
          <div className="space-y-2">
            {entityReviewQueue.slice(0, 8).map(item => {
              const candidateCount = item.entityKind === 'person'
                ? item.candidatePeople.length
                : item.candidateOrganizations.length;
              return (
                <article
                  key={item.id}
                  className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2"
                  data-paper-entity-review-item
                  data-entity-kind={item.entityKind}
                  data-review-status={item.reviewStatus}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="line-clamp-1 text-xs font-semibold text-stone-900">{item.entityName}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-amber-700">
                        <span>{PAPER_ENTITY_KIND_LABELS[item.entityKind]}</span>
                        <span>{PAPER_ENTITY_MENTION_LABELS[item.mentionType]}</span>
                        <span>{item.matchReason}</span>
                      </div>
                    </div>
                    <span className="rounded-md border border-amber-200 bg-white/70 px-2 py-1 text-[11px] text-amber-700">
                      {PAPER_ENTITY_REVIEW_STATUS_LABELS[item.reviewStatus]}
                    </span>
                  </div>
                  {item.evidenceQuote && (
                    <div className="mt-2 line-clamp-2 text-[11px] leading-5 text-stone-600">{item.evidenceQuote}</div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.entityKind === 'person'
                      ? item.candidatePeople.map(candidate => (
                        <a
                          key={candidate.id}
                          href={candidate.href}
                          className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] text-stone-600 hover:text-orange-700"
                          data-paper-entity-review-candidate
                        >
                          {candidate.name}
                        </a>
                      ))
                      : item.candidateOrganizations.map(candidate => (
                        <span
                          key={candidate.id}
                          className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] text-stone-600"
                          data-paper-entity-review-candidate
                        >
                          {candidate.name}
                        </span>
                      ))}
                    {candidateCount === 0 && (
                      <span className="rounded-md border border-amber-100 bg-white/70 px-2 py-1 text-[11px] text-amber-700">
                        无站内候选
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

const PAPER_ENTITY_KIND_LABELS: Record<PaperSourceViewModel['entityReviewQueue'][number]['entityKind'], string> = {
  person: '人物',
  organization: '机构',
};

const PAPER_ENTITY_MENTION_LABELS: Record<PaperSourceViewModel['entityReviewQueue'][number]['mentionType'], string> = {
  author: '作者',
  affiliation: '机构署名',
  text_mention: '正文提及',
};

const PAPER_ENTITY_REVIEW_STATUS_LABELS: Record<PaperSourceViewModel['entityReviewQueue'][number]['reviewStatus'], string> = {
  needs_review: '待复核',
  confirmed: '已确认',
  rejected: '已拒绝',
};

function authorInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
  return initials || 'P';
}

const WORK_MATCH_LABELS: Record<PaperSourceViewModel['relatedWorks'][number]['matchReason'], string> = {
  work_url: '来源 URL 匹配',
  title_mention: '标题提及',
  paper_text_mention: '正文提及',
  thread_overlap: '主题交叉',
};

const PAPER_THREAD_STATUS_LABELS: Record<PaperSourceViewModel['relatedThreads'][number]['status'], string> = {
  verified: '已核',
  usable: '可用',
  needs_review: '待复核',
  needs_capture: '待补原文',
  thin: '偏薄',
};

const PAPER_THREAD_STATUS_STYLES: Record<PaperSourceViewModel['relatedThreads'][number]['status'], string> = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  usable: 'bg-sky-50 text-sky-700 border-sky-100',
  needs_review: 'bg-amber-50 text-amber-700 border-amber-100',
  needs_capture: 'bg-amber-50 text-amber-700 border-amber-100',
  thin: 'bg-stone-50 text-stone-500 border-stone-200',
};

function isPublishableRelatedThread(thread: PaperSourceViewModel['relatedThreads'][number]): boolean {
  return !thread.excludedFromTopicReadiness && (thread.status === 'verified' || thread.status === 'usable');
}

function RelatedWorksPanel({ works }: { works: PaperSourceViewModel['relatedWorks'] }) {
  if (works.length === 0) return null;

  return (
    <section className="mb-4 rounded-xl border border-stone-200 bg-white px-3 py-3" data-paper-related-works>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-stone-700">相关作品</div>
          <div className="mt-0.5 text-[11px] text-stone-500">/work 反向证据候选</div>
        </div>
        <span className="rounded-md bg-stone-100 px-2 py-1 text-[11px] text-stone-500">
          {works.length} works
        </span>
      </div>

      <div className="space-y-2">
        {works.map(work => (
          <article
            key={work.slug}
            className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2"
            data-paper-related-work
            data-work-slug={work.slug}
            data-match-reason={work.matchReason}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <a
                  href={work.href}
                  className="line-clamp-1 text-xs font-semibold text-stone-900 hover:text-orange-700"
                  data-paper-related-work-link
                >
                  {work.name}
                </a>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-stone-400">
                  <span>{work.typeLabel}</span>
                  {work.organizationName && <span>{work.organizationName}</span>}
                  <span>{WORK_MATCH_LABELS[work.matchReason]}</span>
                  <span>{Math.round(work.confidence * 100)}%</span>
                </div>
              </div>
              {work.url && (
                <a
                  href={work.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 shrink-0 items-center rounded-md border border-stone-200 bg-white px-2 text-[11px] font-medium text-stone-500 hover:border-orange-200 hover:text-orange-700"
                  data-paper-related-work-external
                >
                  原页
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RelatedThreadsPanel({ threads }: { threads: PaperSourceViewModel['relatedThreads'] }) {
  if (threads.length === 0) return null;

  return (
    <section className="mb-4 rounded-xl border border-stone-200 bg-white px-3 py-3" data-paper-related-threads>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-stone-700">相关主题</div>
          <div className="mt-0.5 text-[11px] text-stone-500">论文根基 / KnowledgeThread</div>
        </div>
        <span className="rounded-md bg-stone-100 px-2 py-1 text-[11px] text-stone-500">
          {threads.length} threads
        </span>
      </div>

      <div className="space-y-2">
        {threads.map(thread => (
          <article
            key={`${thread.slug}-${thread.role}`}
            className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2"
            data-paper-related-thread
            data-thread-slug={thread.slug}
            data-thread-source={thread.source}
            data-thread-status={thread.status}
            data-excluded-from-topic-readiness={thread.excludedFromTopicReadiness ? 'true' : 'false'}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <a
                  href={thread.href}
                  className="line-clamp-2 text-xs font-semibold leading-5 text-stone-900 hover:text-orange-700"
                  data-paper-related-thread-link
                >
                  {thread.title}
                </a>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-stone-400">
                  <span className={`rounded-md border px-1.5 py-0.5 font-medium ${PAPER_THREAD_STATUS_STYLES[thread.status]}`} data-paper-related-thread-status>
                    {PAPER_THREAD_STATUS_LABELS[thread.status]}
                  </span>
                  <span>{thread.role}</span>
                  <span>{thread.matchReason}</span>
                  {thread.relevanceScore !== null && <span>{Math.round(thread.relevanceScore * 100)}%</span>}
                </div>
              </div>
            </div>
            {thread.summary && (
              <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-stone-500">{thread.summary}</p>
            )}
            {thread.evidenceQuote && (
              <p className="mt-2 border-l-2 border-orange-100 pl-2 text-[11px] leading-5 text-stone-400">
                {thread.evidenceQuote}
              </p>
            )}
            {thread.excludedFromTopicReadiness && (
              <p className="mt-2 rounded-md border border-amber-100 bg-amber-50 px-2 py-1.5 text-[11px] leading-5 text-amber-700" data-paper-related-thread-review>
                {thread.reviewReason || '这条关系需要人工复核，暂不计入主题 ready 或跨源 Chat 结论。'}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function GuideBlock({
  id,
  title,
  body,
  anchor = null,
  hasPdf = false,
  onJump,
}: {
  id?: string;
  title: string;
  body: string;
  anchor?: GuideAnchorTarget | null;
  hasPdf?: boolean;
  onJump?: (anchor: GuideAnchorTarget) => void;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-stone-100 py-3 last:border-b-0">
      <h3 className="text-xs font-semibold text-stone-400">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-stone-700">{body}</p>
      <GuideAnchorButton anchor={anchor} hasPdf={hasPdf} onJump={onJump} />
    </section>
  );
}

function GuideAnchorButton({
  anchor,
  hasPdf,
  onJump,
}: {
  anchor: GuideAnchorTarget | null;
  hasPdf: boolean;
  onJump?: (anchor: GuideAnchorTarget) => void;
}) {
  if (!anchor) return null;
  const canJump = Boolean(anchor.pageNumber && hasPdf && onJump);
  const title = anchor.sectionTitle || anchor.label;

  return (
    <button
      type="button"
      onClick={() => canJump && onJump?.(anchor)}
      disabled={!canJump}
      className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md border border-sky-100 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-default disabled:border-stone-100 disabled:bg-stone-50 disabled:text-stone-400"
      data-paper-guide-citation-anchor
      data-guide-anchor-source={anchor.source}
      data-section-type={anchor.sectionType}
      data-page-number={anchor.pageNumber ?? undefined}
    >
      <span className="shrink-0">{SECTION_LABELS[anchor.sectionType]}</span>
      <span className="truncate text-stone-500">{title}</span>
      {anchor.pageNumber && <span className="shrink-0 font-mono">p.{anchor.pageNumber}</span>}
    </button>
  );
}

function TranslationPanel({
  state,
  scopeLabel,
  onTranslate,
}: {
  state: TranslationState;
  scopeLabel: string;
  onTranslate: () => void;
}) {
  const result = state.status === 'ready' ? state.result : null;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-paper-translation-tab>
      <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-stone-400">中文译文</div>
            <div className="mt-1 text-sm font-semibold text-stone-950">{scopeLabel}</div>
          </div>
          <button
            type="button"
            onClick={onTranslate}
            disabled={state.status === 'loading'}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-wait disabled:text-stone-300"
            data-paper-translate-button
          >
            {state.status === 'loading' ? '翻译中' : '翻译'}
          </button>
        </div>
        {result && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-stone-400">
            <span>{result.cacheHit ? '缓存命中' : `DeepSeek · ${result.provider || 'deepseek'}`}</span>
            <span>{result.sourceTextChars} chars</span>
            {result.usage?.totalTokens && <span>{result.usage.totalTokens} tokens</span>}
            <span>{formatDateTime(result.translatedAt)}</span>
          </div>
        )}
      </div>

      {state.status === 'idle' && (
        <div className="rounded-xl border border-dashed border-stone-200 px-3 py-6 text-center text-sm text-stone-400">
          尚未生成中文译文。
        </div>
      )}
      {state.status === 'error' && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm leading-6 text-red-700">
          {state.error}
        </div>
      )}
      {result && (
        <article
          className="whitespace-pre-wrap rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm leading-7 text-stone-800"
          data-paper-translation-result
        >
          {result.translation}
        </article>
      )}
    </div>
  );
}

function PaperChatPanel({
  title,
  chunkCount,
  messages,
  pending,
  error,
  input,
  relatedContext,
  onInputChange,
  onSubmit,
  onCitationClick,
  onCitationPreview,
  onSuggestedQuestion,
  scrollRef,
}: {
  title: string;
  chunkCount: number;
  messages: PaperChatMessage[];
  pending: boolean;
  error: string | null;
  input: string;
  relatedContext: PaperChatRelatedContext[];
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCitationClick: (citation: PaperChatCitation) => void;
  onCitationPreview: (citation: PaperChatCitation) => void;
  onSuggestedQuestion: (question: string) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const suggestedQuestions = [
    '这篇论文主要想解决什么问题？',
    '方法和实验结论分别是什么？',
    '这篇论文有哪些局限？',
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-paper-chat-tab>
      <div className="border-b border-stone-100 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium text-stone-400">论文 Chat</div>
          <span className="rounded-md bg-sky-50 px-2 py-1 text-[11px] text-sky-700">{chunkCount} chunks</span>
        </div>
        <div className="mt-1 line-clamp-2 text-sm font-semibold text-stone-950">{title}</div>
        <p className="mt-1 text-xs leading-5 text-stone-500">回答只依据已解析 chunk；关联主题、作品和 GitHub 来源先作为阅读线索展示。</p>
        {relatedContext.length > 0 && (
          <section className="mt-3 rounded-xl border border-sky-100 bg-sky-50/45 px-3 py-2" data-paper-chat-related-context-panel>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-sky-700">关联线索</div>
              <span className="rounded-md bg-white px-2 py-0.5 text-[11px] text-sky-700">{relatedContext.length} sources</span>
            </div>
            <div className="grid gap-1.5">
              {relatedContext.map(context => {
                const external = isExternalHref(context.href);
                return (
                  <a
                    key={context.id}
                    href={context.href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="rounded-lg border border-white bg-white/85 px-2.5 py-2 text-left transition hover:border-orange-100 hover:bg-white"
                    data-paper-chat-related-source
                    data-source-kind={context.sourceKind}
                  >
                    <PaperChatRelatedContextBody context={context} />
                  </a>
                );
              })}
            </div>
            {suggestedQuestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5" data-paper-chat-suggested-questions>
                {suggestedQuestions.map(question => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => onSuggestedQuestion(question)}
                    className="inline-flex max-w-full items-center rounded-md border border-sky-100 bg-white px-2 py-1 text-[11px] font-medium text-sky-700 transition hover:border-orange-200 hover:text-orange-700"
                    data-paper-chat-suggested-question
                  >
                    <span className="truncate">{question}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3" data-paper-chat-messages>
        {messages.map(message => (
          <div
            key={message.id}
            data-paper-chat-role={message.role}
            className={`rounded-xl px-3 py-2.5 text-sm leading-6 ${
              message.role === 'user'
                ? 'ml-8 bg-orange-500 text-white'
                : 'mr-8 bg-stone-50 text-stone-700'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            {(message.provider || message.usage?.totalTokens) && (
              <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-stone-400">
                {message.provider && <span>provider: {message.provider}</span>}
                {message.usage?.totalTokens && <span>{message.usage.totalTokens} tokens</span>}
              </div>
            )}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {message.citations.map((citation, index) => (
                  <PaperChatCitationCard
                    key={`${citation.chunkId}-${index}`}
                    citation={citation}
                    onCitationClick={onCitationClick}
                    onCitationPreview={onCitationPreview}
                  />
                ))}
              </div>
            )}
            {message.relatedContext && message.relatedContext.length > 0 && (
              <div className="mt-2 space-y-1.5" data-paper-chat-related-context>
                {message.relatedContext.map(context => {
                  const external = isExternalHref(context.href);
                  return (
                    <a
                      key={`${message.id}-${context.id}`}
                      href={context.href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="block rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-left transition hover:border-orange-200 hover:bg-orange-50"
                      data-paper-chat-related-context-source
                      data-source-kind={context.sourceKind}
                    >
                      <PaperChatRelatedContextBody context={context} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {pending && (
          <div className="mr-8 rounded-xl bg-stone-50 px-3 py-2.5 text-sm text-stone-500">
            正在读论文 chunk 和相关来源...
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-stone-100 p-3">
        {error && <div className="mb-2 text-xs text-red-500">{error}</div>}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={event => onInputChange(event.target.value)}
            placeholder={chunkCount > 0 ? '问这篇论文...' : '先运行结构化解析...'}
            rows={2}
            disabled={pending || chunkCount <= 0}
            className="min-h-11 flex-1 resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-5 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15 disabled:bg-stone-50 disabled:text-stone-400"
            data-paper-chat-input
          />
          <button
            type="submit"
            disabled={pending || chunkCount <= 0 || !input.trim()}
            className="inline-flex h-11 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-stone-950 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-200"
            data-paper-chat-submit
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}

const PAPER_CHAT_RELATED_KIND_LABELS: Record<PaperChatRelatedContext['sourceKind'], string> = {
  thread: 'Thread',
  work: 'Work',
  github: 'GitHub',
};

function PaperChatRelatedContextBody({ context }: { context: PaperChatRelatedContext }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400">
        <span className="rounded-md bg-sky-50 px-1.5 py-0.5 font-medium text-sky-700">{PAPER_CHAT_RELATED_KIND_LABELS[context.sourceKind]}</span>
        {context.relation && <span className="line-clamp-1">{context.relation}</span>}
        {typeof context.confidence === 'number' && <span>{Math.round(context.confidence * 100)}%</span>}
      </span>
      <span className="mt-1 block line-clamp-2 text-xs font-semibold leading-5 text-stone-900">{context.title}</span>
      {context.summary && (
        <span className="mt-1 block line-clamp-2 text-[11px] leading-5 text-stone-500">{context.summary}</span>
      )}
      {context.evidenceQuote && (
        <span className="mt-1 block border-l-2 border-orange-100 pl-2 text-[11px] leading-5 text-stone-400">{context.evidenceQuote}</span>
      )}
    </>
  );
}

function PaperChatCitationCard({
  citation,
  onCitationClick,
  onCitationPreview,
}: {
  citation: PaperChatCitation;
  onCitationClick: (citation: PaperChatCitation) => void;
  onCitationPreview: (citation: PaperChatCitation) => void;
}) {
  const className = 'group relative block w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-left text-xs text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 focus:border-orange-200 focus:bg-orange-50';
  const content = (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-orange-700">{citation.label}</span>
        {citation.sectionTitle && <span className="font-medium text-stone-600">{citation.sectionTitle}</span>}
      </span>
      <span className="mt-1 block line-clamp-2 text-stone-500">{citation.quote}</span>
      <span
        className="pointer-events-none absolute left-0 right-0 top-full z-20 mt-1 hidden rounded-lg border border-orange-100 bg-white px-3 py-2 text-left shadow-lg shadow-stone-200/80 group-hover:block group-focus:block"
        data-paper-chat-citation-hover-preview
      >
        <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400">
          <span className="rounded-md bg-orange-50 px-1.5 py-0.5 font-mono font-medium text-orange-700" data-paper-chat-citation-preview-page>
            {citation.pageNumber ? `p.${citation.pageNumber}` : 'no page'}
          </span>
          <span data-paper-chat-citation-preview-section>{citation.sectionTitle || SECTION_LABELS[citation.sectionType]}</span>
          <span>chunk {citation.chunkIndex}</span>
        </span>
        <span className="mt-1 block text-[11px] leading-5 text-stone-600" data-paper-chat-citation-preview-quote>
          {citation.quote}
        </span>
      </span>
    </>
  );

  if (citation.href) {
    const external = /^https?:\/\//i.test(citation.href);
    return (
      <a
        href={citation.href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={className}
        onMouseEnter={() => onCitationPreview(citation)}
        onFocus={() => onCitationPreview(citation)}
        data-paper-chat-citation
        data-paper-chat-citation-source-kind={citation.sourceKind || 'paper_chunk'}
        data-page-number={citation.pageNumber ?? undefined}
        data-chunk-index={citation.chunkIndex}
        data-section-title={citation.sectionTitle ?? undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onCitationClick(citation)}
      onMouseEnter={() => onCitationPreview(citation)}
      onFocus={() => onCitationPreview(citation)}
      className={className}
      data-paper-chat-citation
      data-paper-chat-citation-source-kind={citation.sourceKind || 'paper_chunk'}
      data-page-number={citation.pageNumber ?? undefined}
      data-chunk-index={citation.chunkIndex}
      data-section-title={citation.sectionTitle ?? undefined}
    >
      {content}
    </button>
  );
}

function PaperNotesPanel({
  notes,
  body,
  quote,
  pending,
  error,
  pageNumber,
  section,
  hasPdf,
  onBodyChange,
  onQuoteChange,
  onSubmit,
  onJump,
  onDelete,
}: {
  notes: PaperNote[];
  body: string;
  quote: string;
  pending: boolean;
  error: string | null;
  pageNumber: number | null;
  section: PaperNoteAnchorSection | null;
  hasPdf: boolean;
  onBodyChange: (value: string) => void;
  onQuoteChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onJump: (note: PaperNote) => void;
  onDelete: (noteId: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-paper-notes-tab>
      <form onSubmit={onSubmit} className="rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-3" data-paper-note-form>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-stone-700">阅读笔记</div>
            <div className="mt-0.5 text-[11px] text-stone-500">绑定当前页和 section，后续可回跳原文。</div>
          </div>
          <span className="rounded-md bg-white px-2 py-1 text-[11px] text-stone-500" data-paper-note-anchor>
            {pageNumber ? `p.${pageNumber}` : 'Abstract'}
            {section ? ` · ${SECTION_LABELS[section.sectionType]}` : ''}
          </span>
        </div>
        <textarea
          value={quote}
          onChange={event => onQuoteChange(event.target.value)}
          placeholder="摘录原文或关键词，可选"
          rows={2}
          className="mt-3 w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs leading-5 text-stone-700 outline-none transition placeholder:text-stone-300 focus:border-orange-200"
          data-paper-note-quote
        />
        <textarea
          value={body}
          onChange={event => onBodyChange(event.target.value)}
          placeholder="写下判断、疑问或后续要读的位置"
          rows={4}
          className="mt-2 w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-6 text-stone-800 outline-none transition placeholder:text-stone-300 focus:border-orange-200"
          data-paper-note-body
        />
        {error && (
          <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700" data-paper-note-error>
            {error}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-stone-400">
            {section?.title || (pageNumber ? '当前 PDF 页' : 'Abstract fallback')}
          </div>
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-stone-950 px-3 text-xs font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-stone-200"
            data-paper-note-submit
          >
            {pending ? '保存中' : '保存笔记'}
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-2">
        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 px-3 py-5 text-center text-xs leading-5 text-stone-400" data-paper-notes-empty>
            还没有笔记。先在当前页留一个问题或摘录。
          </div>
        ) : notes.map(note => (
          <article
            key={note.id}
            className="rounded-xl border border-stone-100 bg-white px-3 py-3"
            data-paper-note-card
            data-note-id={note.id}
            data-page-number={note.pageNumber ?? undefined}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1.5 text-[11px] text-stone-400">
                  {note.pageNumber && <span className="font-mono text-sky-700">p.{note.pageNumber}</span>}
                  {note.sectionType && <span>{SECTION_LABELS[note.sectionType]}</span>}
                  {note.sectionTitle && <span className="line-clamp-1">{note.sectionTitle}</span>}
                  <span>{formatDateTime(note.createdAt)}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {note.pageNumber && hasPdf && (
                  <button
                    type="button"
                    onClick={() => onJump(note)}
                    className="inline-flex h-7 items-center rounded-md border border-stone-200 px-2 text-[11px] font-medium text-stone-500 hover:border-orange-200 hover:text-orange-700"
                    data-paper-note-jump
                  >
                    回跳
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(note.id)}
                  disabled={pending}
                  className="inline-flex h-7 items-center rounded-md border border-stone-200 px-2 text-[11px] font-medium text-stone-400 hover:border-red-100 hover:text-red-600 disabled:cursor-wait"
                  data-paper-note-delete
                >
                  删除
                </button>
              </div>
            </div>
            {note.quote && (
              <p className="mt-2 border-l-2 border-orange-100 pl-2 text-[11px] leading-5 text-stone-500" data-paper-note-quote-preview>
                {note.quote}
              </p>
            )}
            <p className="mt-2 text-sm leading-6 text-stone-800">{note.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function domSafeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function isExternalHref(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
