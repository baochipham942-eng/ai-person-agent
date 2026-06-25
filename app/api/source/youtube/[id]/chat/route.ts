import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { generateStructured, type ChatMessage } from '@/lib/ai/provider';
import {
  extractYouTubeVideoId,
  formatTranscriptTime,
  parseYoutubeTranscriptSegments,
  type YoutubeTranscriptSegment,
} from '@/lib/youtube-transcript';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  question: z.string().trim().min(1).max(600),
  activeTimeMs: z.number().finite().nonnegative().optional(),
  history: z.array(z.object({
    role: z.enum(['assistant', 'user']),
    content: z.string().max(1200),
  })).max(8).optional(),
});

const AnswerSchema = z.object({
  answer: z.string().trim().min(1).max(2400),
  citations: z.array(z.object({
    startMs: z.number().finite().nonnegative(),
    endMs: z.number().finite().nonnegative().optional(),
    quote: z.string().trim().max(360).optional(),
  })).max(5).default([]),
});

interface TranscriptLine {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

interface ChatCitation {
  startMs: number;
  endMs: number;
  quote: string;
  label: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: '问题格式不正确' }, { status: 400 });
  }

  const source = await prisma.rawPoolItem.findUnique({
    where: { id },
    select: {
      id: true,
      sourceType: true,
      title: true,
      url: true,
      personId: true,
      person: {
        select: {
          name: true,
          currentTitle: true,
        },
      },
    },
  });

  if (!source || source.sourceType !== 'youtube') {
    return NextResponse.json({ error: '视频资料不存在' }, { status: 404 });
  }

  const videoId = extractYouTubeVideoId(source.url);
  const transcript = await prisma.youTubeTranscript.findFirst({
    where: {
      personId: source.personId,
      OR: [
        ...(videoId ? [{ videoId }] : []),
        { sourceItemId: source.id },
        { captionItemId: source.id },
      ],
    },
    select: {
      segmentsText: true,
      lang: true,
      fetchedAt: true,
    },
    orderBy: { fetchedAt: 'desc' },
  });

  const segments = transcript ? parseYoutubeTranscriptSegments(transcript.segmentsText) : [];
  const lines = segmentsToLines(segments);
  if (lines.length === 0) {
    return NextResponse.json({ error: '这条视频还没有可用字幕，暂时不能问答' }, { status: 409 });
  }

  const selectedLines = selectRelevantLines(lines, body.data.question, body.data.activeTimeMs ?? null);
  const contextText = formatContext(selectedLines);
  const historyText = formatHistory(body.data.history || []);

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: [
        '你是视频字幕问答助手。',
        '只能根据用户提供的字幕片段回答，不能使用外部知识或猜测。',
        '如果字幕片段不足以回答，直接说明证据不足，并引用最相关时间戳。',
        '回答语言跟随用户问题；用户用中文提问时，用自然中文回答。',
        'citations 必须来自输入字幕，startMs/endMs 使用输入行的毫秒时间。',
        '只输出 JSON，字段为 answer 和 citations。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        schema: {
          answer: 'string',
          citations: [
            {
              startMs: 'number',
              endMs: 'number',
              quote: 'short exact quote from transcript excerpt',
            },
          ],
        },
        video: {
          title: source.title,
          person: source.person.name,
          personTitle: source.person.currentTitle,
          transcriptLang: transcript?.lang || null,
          currentTime: body.data.activeTimeMs == null ? null : formatTranscriptTime(body.data.activeTimeMs),
        },
        question: body.data.question,
        recentChat: historyText,
        transcriptExcerpts: contextText,
        requirements: [
          'answer 用 1-4 段，直接回答问题。',
          '每个结论尽量配一个 citation。',
          '不要编造字幕里没有的专有名词、数字、人物关系或因果。',
          'quote 必须尽量复用字幕原文，不要改写成总结。',
        ],
      }),
    },
  ];

  try {
    const result = await generateStructured(messages, AnswerSchema, {
      temperature: 0.1,
      maxTokens: 1400,
      timeoutMs: 60_000,
    });
    const citations = normalizeCitations(result.data.citations, lines, selectedLines);
    return NextResponse.json({
      answer: result.data.answer,
      citations,
      provider: result.provider,
    });
  } catch (error) {
    console.warn('[youtube-chat] LLM answer failed:', error);
    const citations = fallbackCitations(selectedLines);
    return NextResponse.json({
      answer: buildFallbackAnswer(body.data.question, citations),
      citations,
      provider: 'local-transcript-fallback',
    });
  }
}

function segmentsToLines(segments: YoutubeTranscriptSegment[]): TranscriptLine[] {
  return segments.map(segment => ({
    index: segment.index,
    startMs: segment.startMs,
    endMs: segment.endMs,
    text: segment.text,
  }));
}

function selectRelevantLines(lines: TranscriptLine[], question: string, activeTimeMs: number | null): TranscriptLine[] {
  const tokens = extractSearchTokens(question);
  const ranked = lines.map(line => ({
    ...line,
    score: scoreLine(line, tokens, activeTimeMs),
  })).sort((left, right) => right.score - left.score || left.index - right.index);

  const selected = new Map<number, TranscriptLine>();
  for (const line of ranked.slice(0, 18)) {
    if (line.score <= 0 && selected.size > 0) continue;
    addNeighborhood(lines, selected, line.index, 2);
  }

  if (activeTimeMs != null) {
    const active = findLineAtTime(lines, activeTimeMs);
    if (active) addNeighborhood(lines, selected, active.index, 6);
  }

  if (selected.size === 0) {
    for (const line of lines.slice(0, 24)) selected.set(line.index, line);
  }

  return trimContext(Array.from(selected.values()).sort((left, right) => left.index - right.index), 15_000);
}

function extractSearchTokens(value: string): string[] {
  const matches = value.toLowerCase().match(/[\p{Script=Han}]+|[a-z0-9][a-z0-9_-]*/gu) || [];
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'what', 'when', 'where', 'why', 'how',
    'are', 'was', 'were', 'does', 'did', 'about', 'video', '讲', '说', '这个', '什么',
  ]);
  const tokens: string[] = [];
  for (const match of matches) {
    if (match.length <= 1 && !/[\p{Script=Han}]/u.test(match)) continue;
    if (stopWords.has(match)) continue;
    tokens.push(match);
    if (/[\p{Script=Han}]/u.test(match) && match.length > 2) {
      for (let index = 0; index < match.length - 1; index += 1) {
        tokens.push(match.slice(index, index + 2));
      }
    }
  }
  return Array.from(new Set(tokens)).slice(0, 16);
}

function scoreLine(line: TranscriptLine, tokens: string[], activeTimeMs: number | null): number {
  const text = line.text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (text.includes(token)) score += token.length > 4 ? 4 : 2.5;
  }
  if (activeTimeMs != null) {
    const distance = Math.min(Math.abs(line.startMs - activeTimeMs), Math.abs(line.endMs - activeTimeMs));
    score += Math.max(0, 2 - distance / 90_000);
  }
  return score;
}

function addNeighborhood(lines: TranscriptLine[], selected: Map<number, TranscriptLine>, centerIndex: number, radius: number) {
  for (let index = Math.max(0, centerIndex - radius); index <= Math.min(lines.length - 1, centerIndex + radius); index += 1) {
    selected.set(lines[index].index, lines[index]);
  }
}

function trimContext(lines: TranscriptLine[], maxChars: number): TranscriptLine[] {
  const result: TranscriptLine[] = [];
  let used = 0;
  for (const line of lines) {
    const next = line.text.length + 48;
    if (result.length > 0 && used + next > maxChars) break;
    result.push(line);
    used += next;
  }
  return result;
}

function formatContext(lines: TranscriptLine[]): string {
  return lines.map(line => (
    `line-${line.index} [${formatTranscriptTime(line.startMs)}-${formatTranscriptTime(line.endMs)}] startMs=${line.startMs} endMs=${line.endMs}: ${line.text}`
  )).join('\n');
}

function formatHistory(history: Array<{ role: 'assistant' | 'user'; content: string }>): string {
  if (history.length === 0) return '';
  return history.map(item => `${item.role}: ${item.content}`).join('\n');
}

function normalizeCitations(
  rawCitations: z.infer<typeof AnswerSchema>['citations'],
  allLines: TranscriptLine[],
  selectedLines: TranscriptLine[],
): ChatCitation[] {
  const citations: ChatCitation[] = [];
  for (const raw of rawCitations) {
    const line = findLineByCitation(raw, allLines) || findNearestLine(allLines, raw.startMs);
    if (!line) continue;
    citations.push(toCitation(line, raw.quote));
  }
  if (citations.length === 0) return fallbackCitations(selectedLines);
  return dedupeCitations(citations).slice(0, 5);
}

function findLineByCitation(
  raw: z.infer<typeof AnswerSchema>['citations'][number],
  lines: TranscriptLine[],
): TranscriptLine | null {
  const quote = raw.quote?.trim().toLowerCase();
  if (quote && quote.length >= 8) {
    const normalizedQuote = quote.slice(0, 120);
    const byQuote = lines.find(line => line.text.toLowerCase().includes(normalizedQuote));
    if (byQuote) return byQuote;
  }
  return findLineAtTime(lines, raw.startMs);
}

function findLineAtTime(lines: TranscriptLine[], ms: number): TranscriptLine | null {
  return lines.find(line => ms >= line.startMs && ms <= line.endMs)
    || [...lines].reverse().find(line => ms >= line.startMs)
    || lines[0]
    || null;
}

function findNearestLine(lines: TranscriptLine[], ms: number): TranscriptLine | null {
  if (lines.length === 0) return null;
  return lines.reduce((best, line) => {
    const bestDistance = Math.abs(best.startMs - ms);
    const distance = Math.abs(line.startMs - ms);
    return distance < bestDistance ? line : best;
  }, lines[0]);
}

function fallbackCitations(lines: TranscriptLine[]): ChatCitation[] {
  return lines
    .filter(line => line.text.trim().length > 0)
    .slice(0, 4)
    .map(line => toCitation(line));
}

function toCitation(line: TranscriptLine, quote?: string): ChatCitation {
  const text = (quote?.trim() || line.text).replace(/\s+/g, ' ');
  return {
    startMs: line.startMs,
    endMs: line.endMs,
    quote: text.length > 220 ? `${text.slice(0, 217)}...` : text,
    label: formatTranscriptTime(line.startMs),
  };
}

function dedupeCitations(citations: ChatCitation[]): ChatCitation[] {
  const seen = new Set<string>();
  const result: ChatCitation[] = [];
  for (const citation of citations) {
    const key = `${citation.startMs}:${citation.quote.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(citation);
  }
  return result;
}

function buildFallbackAnswer(question: string, citations: ChatCitation[]): string {
  if (citations.length === 0) {
    return `我暂时没法从字幕里找到和「${question}」直接相关的片段。`;
  }
  const times = citations.map(citation => citation.label).join('、');
  return `模型暂时不可用，我先按字幕检索到了和「${question}」最相关的片段，集中在 ${times}。可以点时间戳回到原视频核对。`;
}
