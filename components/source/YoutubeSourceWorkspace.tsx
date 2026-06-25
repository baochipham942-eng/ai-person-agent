'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import {
  formatTranscriptTime,
  type YoutubeTranscriptBlock,
  type YoutubeTranscriptSegment,
  type YoutubeTranscriptTopic,
} from '@/lib/youtube-transcript';

declare global {
  interface Window {
    YT?: YouTubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubeIframeApi {
  Player: new (
    elementId: string,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState?: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
}

interface YouTubePlayer {
  getCurrentTime: () => number;
  getPlayerState?: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  destroy: () => void;
}

interface YoutubeSourceWorkspaceProps {
  source: {
    id: string;
    title: string;
    url: string;
    publishedAt: string | null;
    author: string | null;
    sourceLabel: string | null;
    thumbnailUrl: string | null;
  };
  person: {
    id: string;
    name: string;
    avatarUrl: string | null;
    currentTitle: string | null;
  };
  video: {
    videoId: string;
    durationMs: number | null;
  };
  transcript: {
    lang: string | null;
    segmentCount: number;
    fetchedAt: string | null;
  } | null;
  segments: YoutubeTranscriptSegment[];
  blocks: YoutubeTranscriptBlock[];
  topics: YoutubeTranscriptTopic[];
  topicExtraction: {
    status: 'ready' | 'unconfigured' | 'failed' | 'empty';
    model: string | null;
    message: string;
  };
}

type WorkspaceTab = 'transcript' | 'chat';
type ChatRole = 'assistant' | 'user';

interface ChatCitation {
  startMs: number;
  endMs: number;
  quote: string;
  label: string;
}

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations?: ChatCitation[];
  provider?: string;
}

let youtubeIframeApiPromise: Promise<YouTubeIframeApi> | null = null;

export function YoutubeSourceWorkspace({
  source,
  person,
  video,
  transcript,
  segments,
  blocks,
  topics,
  topicExtraction,
}: YoutubeSourceWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('transcript');
  const [activeTopicId, setActiveTopicId] = useState<string | null>(topics[0]?.id || null);
  const [activeTimeMs, setActiveTimeMs] = useState(topics[0]?.startMs || 0);
  const [playerStartMs, setPlayerStartMs] = useState(topics[0]?.startMs || 0);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerState, setPlayerState] = useState<number | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [exportStatus, setExportStatus] = useState<'idle' | 'copied' | 'downloaded'>('idle');
  const [scrollTargetLineId, setScrollTargetLineId] = useState<string | null>(null);
  const [browserOrigin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin));
  const [hoveredTopicId, setHoveredTopicId] = useState<string | null>(null);
  const [hoverTimeMs, setHoverTimeMs] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant-initial',
      role: 'assistant',
      content: '可以直接问这条视频里的观点、人物、事件或某段时间在讲什么。我会只依据字幕回答，并给出可点击时间戳。',
    },
  ]);
  const lineRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerElementIdRef = useRef(`youtube-player-${source.id.replace(/[^A-Za-z0-9_-]/g, '-')}`);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const timelineScrubRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const lastPlayerTimeMsRef = useRef(activeTimeMs);
  const pendingSeekRef = useRef<{ ms: number; ignoreUntil: number } | null>(null);

  const durationMs = video.durationMs || blocks[blocks.length - 1]?.endMs || 1;
  const activeTopic = topics.find(topic => topic.id === activeTopicId) || topics[0] || null;
  const hoveredTopic = topics.find(topic => topic.id === hoveredTopicId) || null;
  const previewTimeMs = hoverTimeMs ?? hoveredTopic?.startMs ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const transcriptLines = useMemo(() => {
    if (segments.length > 0) {
      return segments.map(segment => ({
        id: `segment-${segment.index}`,
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: segment.text,
        segmentIndex: segment.index,
      }));
    }
    return blocks.map(block => ({
      id: block.id,
      startMs: block.startMs,
      endMs: block.endMs,
      text: block.text,
      segmentIndex: block.segmentStart,
    }));
  }, [blocks, segments]);
  const matchingLineIds = useMemo(() => {
    if (!normalizedQuery) return [];
    return transcriptLines
      .filter(line => line.text.toLowerCase().includes(normalizedQuery))
      .map(line => line.id);
  }, [normalizedQuery, transcriptLines]);

  const activeBlock = useMemo(() => {
    return findBlockAtTime(blocks, activeTimeMs);
  }, [activeTimeMs, blocks]);

  const activeLine = useMemo(() => {
    return findLineAtTime(transcriptLines, activeTimeMs);
  }, [activeTimeMs, transcriptLines]);

  const scrollLineIntoTranscript = useCallback((lineId: string) => {
    const container = transcriptScrollRef.current;
    const line = lineRefs.current[lineId];
    if (!container || !line) return;
    const targetTop = line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2;
    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    if (!activeLine) return;
    if (!autoFollow) return;
    window.requestAnimationFrame(() => {
      scrollLineIntoTranscript(activeLine.id);
    });
  }, [activeLine, autoFollow, scrollLineIntoTranscript]);

  useEffect(() => {
    if (activeTab !== 'transcript' || !scrollTargetLineId) return;
    window.requestAnimationFrame(() => {
      scrollLineIntoTranscript(scrollTargetLineId);
      setScrollTargetLineId(null);
    });
  }, [activeTab, scrollLineIntoTranscript, scrollTargetLineId]);

  useEffect(() => {
    if (!searchOpen) return;
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [searchOpen]);

  useEffect(() => {
    if (!matchingLineIds[0]) return;
    scrollLineIntoTranscript(matchingLineIds[0]);
  }, [matchingLineIds, scrollLineIntoTranscript]);

  useEffect(() => {
    if (!video.videoId || !playerContainerRef.current) return;

    let disposed = false;
    setPlayerReady(false);
    setPlayerError(null);
    playerRef.current?.destroy();
    playerRef.current = null;
    const initialStartMs = lastPlayerTimeMsRef.current;

    const container = playerContainerRef.current;
    container.innerHTML = '';
    const mount = document.createElement('div');
    mount.id = playerElementIdRef.current;
    mount.className = 'h-full w-full';
    container.appendChild(mount);

    loadYouTubeIframeApi()
      .then(api => {
        if (disposed) return;
        playerRef.current = new api.Player(mount.id, {
          videoId: video.videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            start: Math.floor(initialStartMs / 1000),
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            ...(browserOrigin ? { origin: browserOrigin } : {}),
          },
          events: {
            onReady: () => {
              if (disposed) return;
              setPlayerReady(true);
              if (initialStartMs > 0) {
                playerRef.current?.seekTo(Math.floor(initialStartMs / 1000), true);
              }
            },
            onStateChange: event => {
              if (!disposed) setPlayerState(event.data);
            },
            onError: event => {
              if (!disposed) setPlayerError(`YouTube 播放器暂时不可用（${event.data}）`);
            },
          },
        });
      })
      .catch(error => {
        if (!disposed) setPlayerError(error instanceof Error ? error.message : 'YouTube 播放器加载失败');
      });

    return () => {
      disposed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      setPlayerReady(false);
    };
  }, [browserOrigin, video.videoId]);

  useEffect(() => {
    if (!playerReady) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const seconds = player.getCurrentTime();
      if (!Number.isFinite(seconds)) return;
      const nextMs = Math.max(0, Math.round(seconds * 1000));
      const pendingSeek = pendingSeekRef.current;
      if (pendingSeek) {
        const playerStateNow = player.getPlayerState?.();
        const caughtUp = Math.abs(nextMs - pendingSeek.ms) < 1500;
        const expired = Date.now() > pendingSeek.ignoreUntil;
        if (!caughtUp && (!expired || playerStateNow === -1)) return;
        pendingSeekRef.current = null;
      }
      if (Math.abs(nextMs - lastPlayerTimeMsRef.current) < 500) return;
      lastPlayerTimeMsRef.current = nextMs;
      setActiveTimeMs(nextMs);
      setPlayerStartMs(nextMs);
      const topic = findTopicAtTime(topics, nextMs);
      if (topic) setActiveTopicId(topic.id);
    }, 500);
    return () => window.clearInterval(timer);
  }, [playerReady, topics]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [chatMessages, chatPending]);

  function seekTo(ms: number, topicId?: string | null, options: { forceTranscriptScroll?: boolean } = {}) {
    const safeMs = Math.max(0, Math.round(ms));
    const nextLine = findLineAtTime(transcriptLines, safeMs);
    if (options.forceTranscriptScroll && nextLine) {
      setScrollTargetLineId(nextLine.id);
      setActiveTab('transcript');
    }
    lastPlayerTimeMsRef.current = safeMs;
    pendingSeekRef.current = { ms: safeMs, ignoreUntil: Date.now() + 4000 };
    setActiveTimeMs(safeMs);
    setPlayerStartMs(safeMs);
    if (topicId !== undefined) setActiveTopicId(topicId);
    if (playerReady && playerRef.current) {
      playerRef.current.seekTo(safeMs / 1000, true);
      playerRef.current.playVideo();
    }
  }

  function selectTopic(topic: YoutubeTranscriptTopic) {
    seekTo(topic.startMs, topic.id, { forceTranscriptScroll: true });
  }

  function selectLine(line: TranscriptLine) {
    const topic = topics.find(item => line.startMs >= item.startMs && line.startMs <= item.endMs);
    seekTo(line.startMs, topic?.id ?? activeTopicId, { forceTranscriptScroll: true });
  }

  function scrubTimeline(event: PointerEvent<HTMLDivElement>, forceTranscriptScroll: boolean) {
    const ms = timeFromTimelinePointer(event);
    if (ms === null) return;
    const topic = findTopicAtTime(topics, ms);
    seekTo(ms, topic?.id ?? activeTopicId, { forceTranscriptScroll });
  }

  function updateHoverTime(event: PointerEvent<HTMLDivElement>) {
    const ms = timeFromTimelinePointer(event);
    if (ms !== null) setHoverTimeMs(ms);
  }

  function timeFromTimelinePointer(event: PointerEvent<HTMLDivElement>): number | null {
    const rect = timelineScrubRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return null;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    return Math.round(durationMs * ratio);
  }

  async function copyTranscript() {
    const text = transcriptLines.map(line => `[${formatTranscriptTime(line.startMs)}] ${line.text}`).join('\n');
    await copyText(text);
  }

  async function copyTopics() {
    const text = topics.map(topic => (
      `[${formatTranscriptTime(topic.startMs)}-${formatTranscriptTime(topic.endMs)}] ${topic.title}\n${topic.summary}`
    )).join('\n\n');
    await copyText(text || source.title);
  }

  async function copyMarkdown() {
    await copyText(buildMarkdownExport());
  }

  function downloadMarkdown() {
    const blob = new Blob([buildMarkdownExport()], { type: 'text/markdown;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `${source.title.replace(/[^\p{L}\p{N}\s_-]+/gu, '').trim().slice(0, 80) || 'youtube-transcript'}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
    setExportOpen(false);
    setExportStatus('downloaded');
    window.setTimeout(() => setExportStatus('idle'), 1600);
  }

  function buildMarkdownExport() {
    const topicText = topics.length
      ? topics.map(topic => (
        `- [${formatTranscriptTime(topic.startMs)}-${formatTranscriptTime(topic.endMs)}] ${topic.title}\n  ${topic.summary}`
      )).join('\n')
      : '- 暂无主题时间线';
    const transcriptText = transcriptLines.length
      ? transcriptLines.map(line => `- [${formatTranscriptTime(line.startMs)}] ${line.text}`).join('\n')
      : '- 暂无字幕';
    return [
      `# ${source.title}`,
      '',
      `- 视频：${source.url}`,
      `- 人物：${person.name}`,
      transcript?.lang ? `- 字幕语言：${transcript.lang}` : null,
      '',
      '## 主题时间线',
      '',
      topicText,
      '',
      '## 字幕',
      '',
      transcriptText,
      '',
    ].filter((item): item is string => item !== null).join('\n');
  }

  async function copyText(text: string) {
    let copiedText = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copiedText = true;
      }
    } catch {
      copiedText = false;
    }
    if (!copiedText) copiedText = fallbackCopyText(text);
    if (copiedText) {
      setExportStatus('copied');
      setExportOpen(false);
      window.setTimeout(() => setExportStatus('idle'), 1600);
    } else {
      setExportStatus('idle');
    }
  }

  async function sendChatQuestion(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const question = chatInput.trim();
    if (!question || chatPending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    };
    setChatMessages(messages => [...messages, userMessage]);
    setChatInput('');
    setChatPending(true);
    setChatError(null);

    try {
      const response = await fetch(`/api/source/youtube/${source.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          activeTimeMs,
          history: chatMessages.slice(-6).map(message => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || '视频问答暂时不可用');
      }
      setChatMessages(messages => [
        ...messages,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: String(payload.answer || ''),
          citations: Array.isArray(payload.citations) ? payload.citations : [],
          provider: typeof payload.provider === 'string' ? payload.provider : undefined,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : '视频问答暂时不可用';
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

  function selectCitation(citation: ChatCitation) {
    const topic = findTopicAtTime(topics, citation.startMs);
    seekTo(citation.startMs, topic?.id ?? activeTopicId, { forceTranscriptScroll: true });
  }

  return (
    <main
      className="mx-auto grid w-full max-w-[1480px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px]"
      data-youtube-source-workspace
      data-active-topic-id={activeTopic?.id || ''}
      data-active-start-ms={playerStartMs}
      data-active-block-id={activeBlock?.id || ''}
      data-active-line-id={activeLine?.id || ''}
    >
      <section className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-500">
                <span className="rounded-md bg-orange-50 px-2 py-1 text-orange-700">{source.sourceLabel || 'YouTube'}</span>
                <span>{person.name}</span>
                {source.author && (
                  <>
                    <span className="text-stone-300">/</span>
                    <span>{source.author}</span>
                  </>
                )}
              </div>
              <h1 className="mt-2 line-clamp-2 text-2xl font-semibold tracking-tight text-stone-950">{source.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-400">
                {person.currentTitle && <span>{person.currentTitle}</span>}
                {source.publishedAt && <span>{source.publishedAt}</span>}
                {transcript?.fetchedAt && <span>字幕更新 {transcript.fetchedAt}</span>}
              </div>
            </div>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 flex-shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
            >
              打开原视频
            </a>
          </div>
        </section>

        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-950 shadow-sm">
          <div className="relative aspect-video bg-stone-950">
            {video.videoId ? (
              <div
                ref={playerContainerRef}
                data-youtube-player
                data-current-start-ms={playerStartMs}
                data-player-ready={playerReady ? 'true' : 'false'}
                data-player-state={playerState ?? ''}
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-stone-400">视频链接不可播放</div>
            )}
            {playerError && (
              <div className="absolute inset-x-4 bottom-4 rounded-lg bg-stone-950/85 px-3 py-2 text-xs text-stone-200">
                {playerError}
              </div>
            )}
          </div>
        </div>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-orange-600">视频主题时间线</div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-950">整条视频在讲什么</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                基于完整字幕提炼可导航的语义主题，点击任一主题会同步播放器和右侧字幕。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              {transcript?.lang && <span className="rounded-md bg-stone-100 px-2 py-1">字幕 {transcript.lang}</span>}
              <span className="rounded-md bg-stone-100 px-2 py-1">
                {topicExtraction.status === 'ready' ? `${topics.length} 个主题` : topicStatusLabel(topicExtraction.status)}
              </span>
            </div>
          </div>

          {topics.length > 0 ? (
            <>
              <div className="relative h-9 overflow-hidden rounded-xl bg-stone-100">
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-10 w-0.5 bg-stone-950/70 shadow-[0_0_0_1px_rgba(255,255,255,0.75)]"
                  style={{ left: `${Math.min(100, Math.max(0, (activeTimeMs / durationMs) * 100))}%` }}
                  data-playhead-ms={activeTimeMs}
                />
                {topics.map((topic, index) => {
                  const left = Math.max(0, (topic.startMs / durationMs) * 100);
                  const width = Math.max(4, ((topic.endMs - topic.startMs) / durationMs) * 100);
                  const isActive = activeTopicId === topic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      title={`${formatTranscriptTime(topic.startMs)} ${topic.title}`}
                      onClick={() => selectTopic(topic)}
                      onMouseEnter={() => setHoveredTopicId(topic.id)}
                      onMouseLeave={() => setHoveredTopicId(null)}
                      onFocus={() => setHoveredTopicId(topic.id)}
                      onBlur={() => setHoveredTopicId(null)}
                      data-topic-id={topic.id}
                      data-topic-start-ms={topic.startMs}
                      className={`absolute top-0 h-full border-r border-white/70 text-left transition-all ${
                        isActive ? 'bg-orange-500' : index % 2 === 0 ? 'bg-orange-200 hover:bg-orange-300' : 'bg-pink-200 hover:bg-pink-300'
                      }`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <span className={`sr-only ${isActive ? 'text-white' : ''}`}>{topic.title}</span>
                    </button>
                  );
                })}
              </div>
              <div
                ref={timelineScrubRef}
                className="relative mt-2 h-2 cursor-pointer rounded-full bg-stone-100"
                onPointerDown={event => scrubTimeline(event, true)}
                onPointerMove={event => {
                  if (event.buttons === 1) scrubTimeline(event, false);
                  updateHoverTime(event);
                }}
                onPointerLeave={() => setHoverTimeMs(null)}
                data-timeline-scrubber
              >
                <div
                  className="h-full rounded-full bg-orange-400"
                  style={{ width: `${Math.min(100, Math.max(0, (activeTimeMs / durationMs) * 100))}%` }}
                />
              </div>
              {(hoveredTopic || previewTimeMs !== null) && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
                  <span className="min-w-0 truncate">
                    {hoveredTopic ? hoveredTopic.title : '拖动时间线定位字幕'}
                  </span>
                  <span className="font-mono text-stone-400">
                    {formatTranscriptTime(previewTimeMs || 0)}
                  </span>
                </div>
              )}

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {topics.map(topic => {
                  const isActive = activeTopicId === topic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => selectTopic(topic)}
                      onMouseEnter={() => setHoveredTopicId(topic.id)}
                      onMouseLeave={() => setHoveredTopicId(null)}
                      onFocus={() => setHoveredTopicId(topic.id)}
                      onBlur={() => setHoveredTopicId(null)}
                      data-topic-card
                      data-topic-id={topic.id}
                      data-topic-start-ms={topic.startMs}
                      className={`group rounded-xl border px-3 py-3 text-left transition ${
                        isActive
                          ? 'border-orange-200 bg-orange-50 shadow-sm'
                          : 'border-stone-200 bg-stone-50/70 hover:border-orange-200 hover:bg-orange-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`font-mono text-[11px] ${isActive ? 'text-orange-700' : 'text-stone-400'}`}>
                          {formatTranscriptTime(topic.startMs)}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          {formatTranscriptTime(topic.endMs)}
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold text-stone-900 group-hover:text-orange-700">
                        {topic.title}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{topic.summary}</p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyPanel
              title={topicEmptyTitle(topicExtraction.status)}
              description={topicExtraction.message}
            />
          )}
        </section>
      </section>

      <aside className="min-w-0 lg:sticky lg:top-[4.5rem] lg:h-[calc(100vh-5.5rem)]">
        <section className="flex h-[78vh] min-h-[620px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:h-full">
          <div className="border-b border-stone-100 px-3 py-3">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
              <TabButton active={activeTab === 'transcript'} onClick={() => setActiveTab('transcript')} icon="transcript">
                字幕
              </TabButton>
              <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon="chat">
                Chat
              </TabButton>
            </div>
          </div>

          {activeTab === 'transcript' ? (
            <>
              <div className="border-b border-stone-100 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-stone-400">当前主题</div>
                    <div className="mt-1 line-clamp-2 text-sm font-semibold text-stone-950">
                      {activeTopic?.title || '等待选择主题'}
                    </div>
                  </div>
                  {activeTopic && (
                    <button
                      type="button"
                      onClick={() => selectTopic(activeTopic)}
                      className="inline-flex h-8 flex-shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-2.5 font-mono text-xs font-medium text-orange-700 transition hover:bg-orange-100"
                    >
                      {formatTranscriptTime(activeTopic.startMs)}
                    </button>
                  )}
                </div>
                {activeTopic?.summary && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500">{activeTopic.summary}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setSearchOpen(open => !open)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-stone-500 transition ${
                    searchOpen ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-stone-200 hover:border-orange-200 hover:text-orange-700'
                  }`}
                  aria-label="搜索字幕"
                >
                  <SearchIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setAutoFollow(value => !value)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${
                    autoFollow
                      ? 'border-orange-200 bg-orange-50 text-orange-700'
                      : 'border-stone-200 bg-white text-stone-500 hover:border-orange-200 hover:text-orange-700'
                  }`}
                >
                  <FollowIcon />
                  {autoFollow ? '跟随' : '手动'}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExportOpen(open => !open)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-600 transition hover:border-orange-200 hover:text-orange-700"
                    aria-haspopup="menu"
                    aria-expanded={exportOpen}
                  >
                    <ExportIcon />
                    {exportStatus === 'copied' ? '已复制' : exportStatus === 'downloaded' ? '已下载' : '导出'}
                  </button>
                  {exportOpen && (
                    <div className="absolute left-0 top-9 z-20 w-40 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 text-xs shadow-lg" role="menu">
                      <button type="button" onClick={copyTranscript} className="block w-full px-3 py-2 text-left text-stone-600 hover:bg-orange-50 hover:text-orange-700" role="menuitem">
                        复制字幕
                      </button>
                      <button type="button" onClick={copyTopics} className="block w-full px-3 py-2 text-left text-stone-600 hover:bg-orange-50 hover:text-orange-700" role="menuitem">
                        复制主题
                      </button>
                      <button type="button" onClick={copyMarkdown} className="block w-full px-3 py-2 text-left text-stone-600 hover:bg-orange-50 hover:text-orange-700" role="menuitem">
                        复制 Markdown
                      </button>
                      <button type="button" onClick={downloadMarkdown} className="block w-full px-3 py-2 text-left text-stone-600 hover:bg-orange-50 hover:text-orange-700" role="menuitem">
                        下载 Markdown
                      </button>
                    </div>
                  )}
                </div>
                <div className="ml-auto truncate text-xs text-stone-400">
                  {transcriptLines.length} 行 · {blocks.length} 组
                </div>
                {searchOpen && (
                  <div className="flex w-full items-center gap-2 pt-1">
                    <input
                      ref={searchInputRef}
                      value={query}
                      onChange={event => setQuery(event.target.value)}
                      placeholder="搜索字幕内容"
                      className="h-9 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
                    />
                    {normalizedQuery && (
                      <span className="whitespace-nowrap text-xs text-stone-400">{matchingLineIds.length} 处</span>
                    )}
                  </div>
                )}
              </div>

              <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto px-2 py-2">
                {transcriptLines.length > 0 ? (
                  <div className="divide-y divide-stone-100">
                    {transcriptLines.map(line => {
                      const isActive = activeLine?.id === line.id;
                      const isMatch = matchingLineIds.includes(line.id);
                      const inTopic = activeTopic ? line.endMs >= activeTopic.startMs && line.startMs <= activeTopic.endMs : false;
                      return (
                        <button
                          key={line.id}
                          ref={node => {
                            lineRefs.current[line.id] = node;
                          }}
                          type="button"
                          onClick={() => selectLine(line)}
                          data-transcript-line-id={line.id}
                          data-transcript-segment-index={line.segmentIndex}
                          data-start-ms={line.startMs}
                          data-active-line={isActive ? 'true' : 'false'}
                          className={`grid w-full grid-cols-[54px_minmax(0,1fr)] gap-3 px-2 py-2.5 text-left transition ${
                            isActive
                              ? 'bg-orange-50'
                              : inTopic
                                ? 'bg-amber-50/60 hover:bg-amber-50'
                                : isMatch
                                  ? 'bg-blue-50/70 hover:bg-blue-50'
                                  : 'hover:bg-stone-50'
                          }`}
                        >
                          <div className="pt-0.5">
                            <span className={`font-mono text-[11px] ${isActive ? 'font-semibold text-orange-700' : 'text-stone-400'}`}>
                              {formatTranscriptTime(line.startMs)}
                            </span>
                          </div>
                          <div className={`border-l-2 pl-3 ${isActive ? 'border-orange-500' : inTopic ? 'border-orange-200' : 'border-transparent'}`}>
                            <p className={`text-[14px] leading-6 ${isActive ? 'font-medium text-stone-950' : 'text-stone-600'}`}>
                              <HighlightedText text={line.text} query={query} />
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyPanel title="没有字幕" description="这条视频还没有可读分段字幕。" />
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-stone-100 px-4 py-3">
                <div className="text-xs font-medium text-stone-400">视频 Chat</div>
                <div className="mt-1 line-clamp-2 text-sm font-semibold text-stone-950">{source.title}</div>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  只依据当前字幕回答，时间戳证据可直接跳转。
                </p>
              </div>

              <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3" data-youtube-chat-messages>
                {chatMessages.map(message => (
                  <div
                    key={message.id}
                    data-chat-role={message.role}
                    className={`rounded-xl px-3 py-2.5 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'ml-8 bg-orange-500 text-white'
                        : 'mr-8 bg-stone-50 text-stone-700'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.provider && (
                      <div className="mt-1 text-[11px] text-stone-400">provider: {message.provider}</div>
                    )}
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {message.citations.map((citation, index) => (
                          <button
                            key={`${citation.startMs}-${index}`}
                            type="button"
                            onClick={() => selectCitation(citation)}
                            className="block w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-left text-xs text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                            data-chat-citation
                            data-start-ms={citation.startMs}
                          >
                            <span className="font-mono text-orange-700">{citation.label || formatTranscriptTime(citation.startMs)}</span>
                            <span className="ml-2 line-clamp-2 text-stone-500">{citation.quote}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {chatPending && (
                  <div className="mr-8 rounded-xl bg-stone-50 px-3 py-2.5 text-sm text-stone-500">
                    正在读字幕...
                  </div>
                )}
              </div>

              <form onSubmit={sendChatQuestion} className="border-t border-stone-100 p-3">
                {chatError && <div className="mb-2 text-xs text-red-500">{chatError}</div>}
                <div className="flex items-end gap-2">
                  <textarea
                    value={chatInput}
                    onChange={event => setChatInput(event.target.value)}
                    placeholder="问这条视频..."
                    rows={2}
                    className="min-h-11 flex-1 resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-5 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
                    data-youtube-chat-input
                  />
                  <button
                    type="submit"
                    disabled={chatPending || !chatInput.trim()}
                    className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-stone-950 text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-200"
                    aria-label="发送问题"
                    data-youtube-chat-submit
                  >
                    <SendIcon />
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </aside>
    </main>
  );
}

type TranscriptLine = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  segmentIndex: number;
};

function loadYouTubeIframeApi(): Promise<YouTubeIframeApi> {
  if (typeof window === 'undefined') return Promise.reject(new Error('浏览器环境不可用'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise;

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => {
      reject(new Error('YouTube 播放器加载超时'));
    }, 15_000);

    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timeout);
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error('YouTube 播放器初始化失败'));
      }
    };

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) return;

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('YouTube 播放器脚本加载失败'));
    };
    document.head.appendChild(script);
  });

  return youtubeIframeApiPromise;
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: 'transcript' | 'chat';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-medium transition ${
        active ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-orange-700'
      }`}
    >
      {icon === 'transcript' ? <TranscriptIcon /> : <ChatIcon />}
      {children}
    </button>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/70 px-5 py-8 text-center">
      <div>
        <div className="text-sm font-semibold text-stone-900">{title}</div>
        <p className="mt-1 text-xs leading-5 text-stone-500">{description}</p>
      </div>
    </div>
  );
}

function topicStatusLabel(status: YoutubeSourceWorkspaceProps['topicExtraction']['status']) {
  if (status === 'unconfigured') return '待配置';
  if (status === 'failed') return '提炼失败';
  if (status === 'empty') return '无字幕';
  return '已提炼';
}

function topicEmptyTitle(status: YoutubeSourceWorkspaceProps['topicExtraction']['status']) {
  if (status === 'unconfigured') return '缺少带时间戳的主题线';
  if (status === 'failed') return '主题提炼失败';
  if (status === 'empty') return '没有可用字幕';
  return '没有可用主题';
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const tokens = Array.from(new Set(query.trim().split(/\s+/).filter(Boolean)));
  if (tokens.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, index) => (
        index % 2 === 1
          ? <mark key={`${part}-${index}`} className="rounded bg-amber-100 px-0.5 font-medium text-amber-800">{part}</mark>
          : <span key={`${part}-${index}`}>{part}</span>
      ))}
    </>
  );
}

function findBlockAtTime(blocks: YoutubeTranscriptBlock[], ms: number): YoutubeTranscriptBlock | null {
  if (blocks.length === 0) return null;
  const exactStart = [...blocks].reverse().find(block => ms >= block.startMs);
  if (exactStart && ms <= exactStart.endMs) return exactStart;
  return blocks.find(block => ms >= block.startMs && ms <= block.endMs) || blocks[0];
}

function findLineAtTime(lines: TranscriptLine[], ms: number): TranscriptLine | null {
  if (lines.length === 0) return null;
  const exactStart = [...lines].reverse().find(line => ms >= line.startMs);
  if (exactStart && ms <= exactStart.endMs) return exactStart;
  return lines.find(line => ms >= line.startMs && ms <= line.endMs) || lines[0];
}

function findTopicAtTime(topics: YoutubeTranscriptTopic[], ms: number): YoutubeTranscriptTopic | null {
  if (topics.length === 0) return null;
  const exactStart = [...topics].reverse().find(topic => ms >= topic.startMs);
  if (exactStart && ms <= exactStart.endMs) return exactStart;
  return topics.find(topic => ms >= topic.startMs && ms <= topic.endMs) || topics[0];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fallbackCopyText(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    textarea.remove();
  }
  return copied;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <circle cx="9" cy="9" r="5.8" stroke="currentColor" strokeWidth="1.7" />
      <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function FollowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M3 10s2.4-4 7-4 7 4 7 4-2.4 4-7 4-7-4-7-4Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M10 3v9m0 0 3-3m-3 3L7 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 13v2.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TranscriptIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M5 4h10M5 8h10M5 12h7M5 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h7A2.5 2.5 0 0 1 16 5.5v5A2.5 2.5 0 0 1 13.5 13H9l-4 3v-3.3A2.5 2.5 0 0 1 4 10.5v-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M4 10 16 4l-4 12-2.5-5.5L4 10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m9.5 10.5 3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
