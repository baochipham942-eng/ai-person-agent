import {
  buildMimoTopicInputBlocks,
  formatTranscriptTime,
  type YoutubeTranscriptBlock,
  type YoutubeTranscriptSegment,
  type YoutubeTranscriptTopic,
} from '@/lib/youtube-transcript';

export type VideoTopicExtractionStatus = 'ready' | 'unconfigured' | 'failed' | 'empty';

export interface VideoTopicExtractionResult {
  status: VideoTopicExtractionStatus;
  topics: YoutubeTranscriptTopic[];
  model: string | null;
  provider: 'mimo' | 'minimax' | null;
  message: string;
}

interface PersistedTopicRecord {
  title?: unknown;
  summary?: unknown;
  startMs?: unknown;
  endMs?: unknown;
  startMillis?: unknown;
  endMillis?: unknown;
  startSeconds?: unknown;
  endSeconds?: unknown;
  startBlockId?: unknown;
  endBlockId?: unknown;
  segmentStart?: unknown;
  segmentEnd?: unknown;
  keywords?: unknown;
  evidenceBlockIds?: unknown;
}

interface PersistedTopicTimeline {
  records: PersistedTopicRecord[];
  key: string | null;
  provider: string | null;
  model: string | null;
}

interface ExtractVideoTopicsInput {
  title: string;
  videoId: string;
  personName: string;
  personTitle: string | null;
  tags: string[];
  segments: YoutubeTranscriptSegment[];
}

interface MimoTopicRecord {
  title?: unknown;
  summary?: unknown;
  startBlockId?: unknown;
  endBlockId?: unknown;
  evidenceBlockIds?: unknown;
}

interface MimoTopicDraft {
  title: string;
  summary: string;
  startBlockId: string;
  endBlockId: string;
  evidenceBlockIds: string[];
  sourceBatch: number | null;
}

interface MimoMessage {
  role: 'system' | 'user';
  content: string;
}

const MIMO_BASE_URL = 'https://token-plan-sgp.xiaomimimo.com/v1';
const DEFAULT_MIMO_MODEL = 'mimo-v2.5-pro';
const DEFAULT_BATCH_MAX_BLOCKS = 24;
const DEFAULT_BATCH_MAX_CHARS = 18_000;
const DEFAULT_TOPIC_OUTPUT_LIMIT = 24;

export function extractPersistedVideoTopics(
  raw: unknown,
  blocks: YoutubeTranscriptBlock[],
  segments: YoutubeTranscriptSegment[],
): VideoTopicExtractionResult | null {
  const timeline = unwrapPersistedTopicTimeline(raw);
  if (timeline.records.length === 0) return null;

  const topics = normalizePersistedTopics(timeline.records, blocks, segments);
  if (topics.length === 0) return null;

  return {
    status: 'ready',
    topics,
    model: timeline.model ?? defaultPersistedTopicModel(timeline),
    provider: persistedTopicProvider(timeline),
    message: persistedTopicMessage(timeline),
  };
}

export async function extractVideoTopicsWithMimo(
  input: ExtractVideoTopicsInput,
): Promise<VideoTopicExtractionResult> {
  if (input.segments.length === 0) {
    return {
      status: 'empty',
      topics: [],
      model: null,
      provider: null,
      message: '这条视频还没有可用字幕，暂时不能做主题提炼。',
    };
  }

  const apiKey = process.env.XIAOMI_API_KEY;
  const model = process.env.MIMO_MODEL || DEFAULT_MIMO_MODEL;
  if (!apiKey) {
    return {
      status: 'unconfigured',
      topics: [],
      model,
      provider: 'mimo',
      message: 'Mimo API key 未配置，主题时间线等待语义提炼。',
    };
  }

  const sourceBlocks = buildMimoTopicInputBlocks(input.segments);
  if (sourceBlocks.length === 0) {
    return {
      status: 'empty',
      topics: [],
      model,
      provider: 'mimo',
      message: '这条视频还没有足够字幕，暂时不能做主题提炼。',
    };
  }

  try {
    const batches = splitTopicBlocksForMimo(sourceBlocks);
    const localDrafts: MimoTopicDraft[] = [];

    for (const [batchIndex, batch] of batches.entries()) {
      const raw = await callMimoJson(
        buildMimoWindowTopicMessages(input, batch, {
          batchIndex,
          totalBatches: batches.length,
          totalBlocks: sourceBlocks.length,
        }),
        apiKey,
        model,
      );
      localDrafts.push(
        ...normalizeMimoTopicDrafts(raw, batch, batchIndex),
      );
    }

    let finalDrafts = localDrafts;
    if (localDrafts.length > 0 && batches.length > 1) {
      try {
        const raw = await callMimoJson(
          buildMimoMergeTopicMessages(input, sourceBlocks, localDrafts),
          apiKey,
          model,
        );
        const mergedDrafts = normalizeMimoTopicDrafts(raw, sourceBlocks, null);
        if (mergedDrafts.length > 0) finalDrafts = mergedDrafts;
      } catch (error) {
        console.warn('[youtube-topic-extraction] Mimo topic merge failed, using window topics:', error);
      }
    }

    const topics = mapDraftsToTopics(finalDrafts, sourceBlocks, input.segments);
    return {
      status: topics.length > 0 ? 'ready' : 'failed',
      topics,
      model,
      provider: 'mimo',
      message: topics.length > 0
        ? 'Mimo 已审阅完整字幕并提炼主题章节。'
        : 'Mimo 没有返回可用主题边界。',
    };
  } catch (error) {
    console.warn('[youtube-topic-extraction] Mimo topic extraction failed:', error);
    return {
      status: 'failed',
      topics: [],
      model,
      provider: 'mimo',
      message: 'Mimo 主题提炼失败，稍后可重试。',
    };
  }
}

async function callMimoJson(
  messages: MimoMessage[],
  apiKey: string,
  model: string,
  withResponseFormat = true,
): Promise<unknown> {
  const baseUrl = (process.env.XIAOMI_API_URL || process.env.XIAOMI_BASE_URL || MIMO_BASE_URL).replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
      top_p: 0.95,
      max_completion_tokens: readPositiveEnvInt('MIMO_TOPIC_MAX_COMPLETION_TOKENS', 4096, 1024, 16_384),
      thinking: { type: 'disabled' },
      ...(withResponseFormat ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(readPositiveEnvInt('MIMO_TOPIC_TIMEOUT_MS', 60_000, 5_000, 180_000)),
  });

  const responseText = await response.text();
  if (!response.ok) {
    if (withResponseFormat && (response.status === 400 || response.status === 422)) {
      return callMimoJson(messages, apiKey, model, false);
    }
    throw new Error(`MiMo request failed: HTTP ${response.status} ${responseText.slice(0, 500)}`);
  }

  const payload = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error(`MiMo response missing content: ${responseText.slice(0, 500)}`);
  return extractJsonObject(content);
}

function buildMimoWindowTopicMessages(
  input: ExtractVideoTopicsInput,
  blocks: YoutubeTranscriptBlock[],
  context: {
    batchIndex: number;
    totalBatches: number;
    totalBlocks: number;
  },
): MimoMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是视频内容编辑，负责把长视频字幕提炼成真正的主题章节。',
        '必须审阅输入中的每一个字幕块，不能只挑前几段或精彩片段。',
        '只能根据输入的字幕块做判断，不要引入外部知识。',
        '不要按固定时间、固定数量或平均长度切分；边界必须来自语义变化。',
        '主题标题要概括这一段真正讨论的议题，不要复读字幕开头。',
        '只输出 JSON，不要 markdown，不要解释。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        schema: 'VideoTopicWindowTimeline',
        video: videoPayload(input),
        window: {
          index: context.batchIndex + 1,
          totalWindows: context.totalBatches,
          totalSourceBlocks: context.totalBlocks,
          startBlockId: blocks[0]?.id,
          endBlockId: blocks[blocks.length - 1]?.id,
          time: blocks.length > 0
            ? `${formatTranscriptTime(blocks[0].startMs)}-${formatTranscriptTime(blocks[blocks.length - 1].endMs)}`
            : null,
        },
        outputShape: topicOutputShape(),
        requirements: [
          '这是连续长字幕里的一个技术窗口，窗口边界不代表主题边界。',
          '返回覆盖本窗口全部有信息量字幕的主题章节，不要只总结开头。',
          '如果本窗口后段是重复、回顾、转场或低信息内容，也要并入相邻主题或单独标成对应语义，不能直接丢掉大段尾部。',
          '每个主题必须是语义章节，不要为了平均时长而硬切。',
          '每个主题必须使用本窗口 input.blocks 中存在的 startBlockId/endBlockId。',
          '主题按出现顺序排列，不能互相重叠。',
          '本窗口通常返回 1-6 个主题；内容明显复杂时可以更多。',
          'title 不要写“开场与背景/核心问题/关键思路”这类模板标签，除非字幕真的在讲这些词。',
          'summary 要具体到内容，不要写“这一段介绍相关内容”。',
        ],
        blocks: blocks.map(blockPayload),
      }),
    },
  ];
}

function buildMimoMergeTopicMessages(
  input: ExtractVideoTopicsInput,
  blocks: YoutubeTranscriptBlock[],
  drafts: MimoTopicDraft[],
): MimoMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是长视频章节总编，负责把每个字幕窗口的局部主题合并成全片时间线。',
        '局部主题来自完整字幕的全部技术窗口；每个窗口都必须参与最终判断。',
        '只能根据输入的局部主题和字幕块时间做判断，不要引入外部知识。',
        '相邻且语义连续的主题可以合并；非相邻重复内容必须保留各自时间段。',
        '不要只保留前半段主题，也不要把后半段主题当作可选摘要删掉。',
        '只输出 JSON，不要 markdown，不要解释。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        schema: 'VideoTopicTimelineMerge',
        video: videoPayload(input),
        coverage: {
          totalSourceBlocks: blocks.length,
          firstBlockId: blocks[0]?.id,
          lastBlockId: blocks[blocks.length - 1]?.id,
          time: blocks.length > 0
            ? `${formatTranscriptTime(blocks[0].startMs)}-${formatTranscriptTime(blocks[blocks.length - 1].endMs)}`
            : null,
          localTopicCount: drafts.length,
        },
        outputShape: topicOutputShape(),
        requirements: [
          '返回全片时间线，必须覆盖所有局部主题代表的有信息量内容。',
          '目标是 6-18 个主题；如果内容复杂，可以最多返回 24 个。',
          'startBlockId/endBlockId 必须来自 sourceBlocks，且不能互相重叠。',
          '相邻局部主题如果语义相同或明显连续，可以合并成一个更大的主题。',
          '非相邻重复内容不能合成一个跨越中间内容的主题，要保留为后续时间段的回顾或重复主题。',
          '如果后半段主题质量一般，也要保留时间线位置，用更准确的标题说明它在做什么。',
          '不要输出固定模板标题，标题必须来自内容语义。',
          'summary 要具体，不要写“本段继续讨论相关内容”。',
        ],
        sourceBlocks: blocks.map(block => ({
          id: block.id,
          time: `${formatTranscriptTime(block.startMs)}-${formatTranscriptTime(block.endMs)}`,
        })),
        localTopics: drafts.map((draft, index) => ({
          id: `local-topic-${index}`,
          sourceBatch: draft.sourceBatch == null ? null : draft.sourceBatch + 1,
          title: draft.title,
          summary: draft.summary,
          startBlockId: draft.startBlockId,
          endBlockId: draft.endBlockId,
          evidenceBlockIds: draft.evidenceBlockIds,
          time: draftTime(draft, blocks),
        })),
      }),
    },
  ];
}

function splitTopicBlocksForMimo(blocks: YoutubeTranscriptBlock[]): YoutubeTranscriptBlock[][] {
  const maxBlocks = readPositiveEnvInt('MIMO_TOPIC_BATCH_MAX_BLOCKS', DEFAULT_BATCH_MAX_BLOCKS, 4, 80);
  const maxChars = readPositiveEnvInt('MIMO_TOPIC_BATCH_MAX_CHARS', DEFAULT_BATCH_MAX_CHARS, 4_000, 80_000);
  const batches: YoutubeTranscriptBlock[][] = [];
  let current: YoutubeTranscriptBlock[] = [];
  let currentChars = 0;

  const flush = () => {
    if (current.length === 0) return;
    batches.push(current);
    current = [];
    currentChars = 0;
  };

  for (const block of blocks) {
    const nextChars = currentChars + block.text.length;
    if (current.length > 0 && (current.length >= maxBlocks || nextChars > maxChars)) flush();
    current.push(block);
    currentChars += block.text.length;
  }
  flush();

  return batches;
}

function normalizeMimoTopicDrafts(
  raw: unknown,
  blocks: YoutubeTranscriptBlock[],
  sourceBatch: number | null,
): MimoTopicDraft[] {
  const records = unwrapTopicRecords(raw);
  const blockById = new Map(blocks.map(block => [block.id, block]));
  const blockOrder = new Map(blocks.map((block, index) => [block.id, index]));
  const drafts: MimoTopicDraft[] = [];

  for (const record of records) {
    const title = readString(record.title);
    const summary = readString(record.summary);
    const startBlockId = readString(record.startBlockId);
    const endBlockId = readString(record.endBlockId);
    if (!title || !summary || !startBlockId || !endBlockId) continue;

    const startOrder = blockOrder.get(startBlockId);
    const endOrder = blockOrder.get(endBlockId);
    if (!blockById.has(startBlockId) || !blockById.has(endBlockId) || startOrder == null || endOrder == null) continue;
    if (endOrder < startOrder) continue;

    drafts.push({
      title: cleanPublicText(title, 36),
      summary: cleanPublicText(summary, 140),
      startBlockId,
      endBlockId,
      evidenceBlockIds: readStringArray(record.evidenceBlockIds).filter(id => blockById.has(id)).slice(0, 6),
      sourceBatch,
    });
  }

  const orderedDrafts = drafts.sort((left, right) => {
    const leftStart = blockOrder.get(left.startBlockId) ?? 0;
    const rightStart = blockOrder.get(right.startBlockId) ?? 0;
    return leftStart - rightStart;
  });

  const nonOverlappingDrafts: MimoTopicDraft[] = [];
  let lastEnd = -1;
  for (const draft of orderedDrafts) {
    const startOrder = blockOrder.get(draft.startBlockId);
    const endOrder = blockOrder.get(draft.endBlockId);
    if (startOrder == null || endOrder == null || startOrder <= lastEnd) continue;
    nonOverlappingDrafts.push(draft);
    lastEnd = endOrder;
  }

  return nonOverlappingDrafts;
}

function normalizePersistedTopics(
  records: PersistedTopicRecord[],
  blocks: YoutubeTranscriptBlock[],
  segments: YoutubeTranscriptSegment[],
): YoutubeTranscriptTopic[] {
  const blockById = new Map(blocks.map(block => [block.id, block]));
  const durationMs = segments[segments.length - 1]?.endMs ?? blocks[blocks.length - 1]?.endMs ?? 0;
  const topics: YoutubeTranscriptTopic[] = [];

  for (const record of records) {
    const title = readString(record.title);
    const summary = readString(record.summary) || '';
    if (!title) continue;

    const startBlockId = readString(record.startBlockId);
    const endBlockId = readString(record.endBlockId);
    const startBlock = startBlockId ? blockById.get(startBlockId) : null;
    const endBlock = endBlockId ? blockById.get(endBlockId) : null;

    const startMs = startBlock?.startMs
      ?? readTimeMs(record.startMs)
      ?? readTimeMs(record.startMillis)
      ?? readSecondsAsMs(record.startSeconds)
      ?? segmentToStartMs(record.segmentStart, segments);
    const endMs = endBlock?.endMs
      ?? readTimeMs(record.endMs)
      ?? readTimeMs(record.endMillis)
      ?? readSecondsAsMs(record.endSeconds)
      ?? segmentToEndMs(record.segmentEnd, segments)
      ?? nextTopicStartMs(records, records.indexOf(record))
      ?? durationMs;

    if (startMs == null || endMs == null || endMs <= startMs) continue;

    const segmentStart = startBlock?.segmentStart ?? msToSegmentIndex(startMs, segments, 'start');
    const segmentEnd = endBlock?.segmentEnd ?? msToSegmentIndex(endMs, segments, 'end');
    if (segmentStart == null || segmentEnd == null) continue;

    topics.push({
      id: `topic-${topics.length}`,
      title: cleanPublicText(title, 36),
      summary: cleanPublicText(summary || title, 140),
      startMs,
      endMs,
      segmentStart,
      segmentEnd,
      keywords: [
        ...readStringArray(record.keywords),
        ...readStringArray(record.evidenceBlockIds),
      ].slice(0, 8),
    });
  }

  return topics
    .sort((left, right) => left.startMs - right.startMs)
    .filter((topic, index, all) => index === 0 || topic.startMs >= all[index - 1].endMs);
}

function mapDraftsToTopics(
  drafts: MimoTopicDraft[],
  blocks: YoutubeTranscriptBlock[],
  segments: YoutubeTranscriptSegment[],
): YoutubeTranscriptTopic[] {
  const blockById = new Map(blocks.map(block => [block.id, block]));
  const blockOrder = new Map(blocks.map((block, index) => [block.id, index]));
  const outputLimit = readPositiveEnvInt('MIMO_TOPIC_OUTPUT_LIMIT', DEFAULT_TOPIC_OUTPUT_LIMIT, 1, 60);
  const topics: YoutubeTranscriptTopic[] = [];
  let lastBlockIndex = -1;

  for (const draft of drafts) {
    const startBlock = blockById.get(draft.startBlockId);
    const endBlock = blockById.get(draft.endBlockId);
    const startOrder = blockOrder.get(draft.startBlockId);
    const endOrder = blockOrder.get(draft.endBlockId);
    if (!startBlock || !endBlock || startOrder == null || endOrder == null) continue;
    if (endOrder < startOrder || startOrder <= lastBlockIndex) continue;

    topics.push({
      id: `topic-${topics.length}`,
      title: draft.title,
      summary: draft.summary,
      startMs: startBlock.startMs,
      endMs: endBlock.endMs,
      segmentStart: startBlock.segmentStart,
      segmentEnd: Math.min(endBlock.segmentEnd, segments[segments.length - 1]?.index ?? endBlock.segmentEnd),
      keywords: draft.evidenceBlockIds,
    });
    lastBlockIndex = endOrder;
    if (topics.length >= outputLimit) break;
  }

  return topics;
}

function videoPayload(input: ExtractVideoTopicsInput) {
  return {
    id: input.videoId,
    title: input.title,
    personName: input.personName,
    personTitle: input.personTitle,
    tags: input.tags,
  };
}

function topicOutputShape() {
  return {
    topics: [
      {
        title: '主题标题，8-24 个中文字符，必须是语义概括',
        summary: '一句话说明这一段主要讲什么',
        startBlockId: '必须是 input.blocks 或 sourceBlocks 里的 id',
        endBlockId: '必须是 input.blocks 或 sourceBlocks 里的 id，且不能早于 startBlockId',
        evidenceBlockIds: ['用于支撑主题判断的 block id，可空但必须来自输入块'],
      },
    ],
  };
}

function blockPayload(block: YoutubeTranscriptBlock) {
  return {
    id: block.id,
    startMs: block.startMs,
    endMs: block.endMs,
    time: `${formatTranscriptTime(block.startMs)}-${formatTranscriptTime(block.endMs)}`,
    text: block.text,
  };
}

function draftTime(draft: MimoTopicDraft, blocks: YoutubeTranscriptBlock[]): string | null {
  const blockById = new Map(blocks.map(block => [block.id, block]));
  const startBlock = blockById.get(draft.startBlockId);
  const endBlock = blockById.get(draft.endBlockId);
  if (!startBlock || !endBlock) return null;
  return `${formatTranscriptTime(startBlock.startMs)}-${formatTranscriptTime(endBlock.endMs)}`;
}

function unwrapTopicRecords(raw: unknown): MimoTopicRecord[] {
  let current = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (Array.isArray(current)) return current.filter(isRecord);
    const record = isRecord(current) ? current : null;
    if (!record) return [];
    if (Array.isArray(record.topics)) return record.topics.filter(isRecord);
    current = record.result || record.data || record.timeline || record.videoTopicTimeline;
  }
  return [];
}

function unwrapPersistedTopicTimeline(raw: unknown): PersistedTopicTimeline {
  let current = raw;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) {
      return {
        records: current.filter(isRecord),
        key: null,
        provider: null,
        model: null,
      };
    }
    const record = isRecord(current) ? current : null;
    if (!record) return emptyPersistedTopicTimeline();
    for (const key of [
      'mimoTopicTimeline',
      'videoTopicTimeline',
      'youtubeTopicTimeline',
      'topicTimeline',
      'semanticTopicTimeline',
      'topics',
      'chapters',
    ]) {
      if (Array.isArray(record[key])) {
        return {
          records: record[key].filter(isRecord),
          key,
          provider: readString(record.topicTimelineProvider),
          model: readString(record.topicTimelineModel),
        };
      }
    }
    current = record.result || record.data || record.timeline || record.videoTopicTimeline;
  }
  return emptyPersistedTopicTimeline();
}

function emptyPersistedTopicTimeline(): PersistedTopicTimeline {
  return {
    records: [],
    key: null,
    provider: null,
    model: null,
  };
}

function defaultPersistedTopicModel(timeline: PersistedTopicTimeline): string | null {
  if (timeline.provider === 'minimax' || timeline.key === 'videoTopicTimeline') return 'MiniMax-M2.7';
  if (timeline.provider === 'mimo' || timeline.key === 'mimoTopicTimeline') return DEFAULT_MIMO_MODEL;
  return null;
}

function persistedTopicProvider(timeline: PersistedTopicTimeline): 'mimo' | 'minimax' | null {
  if (timeline.provider === 'minimax' || timeline.key === 'videoTopicTimeline') return 'minimax';
  if (timeline.provider === 'mimo' || timeline.key === 'mimoTopicTimeline') return 'mimo';
  return null;
}

function persistedTopicMessage(timeline: PersistedTopicTimeline): string {
  if (timeline.provider === 'minimax' || timeline.key === 'videoTopicTimeline') {
    return '已读取 MiniMax 语义主题时间线。';
  }
  if (timeline.provider === 'mimo' || timeline.key === 'mimoTopicTimeline') {
    return '已读取 Mimo 语义主题时间线。';
  }
  return '已读取语义主题时间线。';
}

function readTimeMs(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function readSecondsAsMs(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 1000) : null;
}

function segmentToStartMs(value: unknown, segments: YoutubeTranscriptSegment[]): number | null {
  const index = readInteger(value);
  return index == null ? null : segments[index]?.startMs ?? null;
}

function segmentToEndMs(value: unknown, segments: YoutubeTranscriptSegment[]): number | null {
  const index = readInteger(value);
  return index == null ? null : segments[index]?.endMs ?? null;
}

function readInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function msToSegmentIndex(
  ms: number,
  segments: YoutubeTranscriptSegment[],
  boundary: 'start' | 'end',
): number | null {
  if (segments.length === 0) return null;
  const index = segments.findIndex(segment => ms >= segment.startMs && ms <= segment.endMs);
  if (index >= 0) return segments[index].index;
  return boundary === 'start' ? segments[0].index : segments[segments.length - 1].index;
}

function nextTopicStartMs(records: PersistedTopicRecord[], currentIndex: number): number | null {
  for (let index = currentIndex + 1; index < records.length; index += 1) {
    const next = records[index];
    const startMs = readTimeMs(next.startMs)
      ?? readTimeMs(next.startMillis)
      ?? readSecondsAsMs(next.startSeconds);
    if (startMs != null) return startMs;
  }
  return null;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
  if (fenced) return JSON.parse(fenced);
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error(`Unable to parse JSON response: ${trimmed.slice(0, 240)}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function readPositiveEnvInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function cleanPublicText(value: string, maxLength: number): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}
