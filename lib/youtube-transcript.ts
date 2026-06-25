export interface YoutubeTranscriptSegment {
  index: number;
  startMs: number;
  durationMs: number | null;
  endMs: number;
  text: string;
}

export interface YoutubeTranscriptTopic {
  id: string;
  title: string;
  summary: string;
  startMs: number;
  endMs: number;
  segmentStart: number;
  segmentEnd: number;
  keywords: string[];
}

export interface YoutubeTranscriptBlock {
  id: string;
  startMs: number;
  endMs: number;
  segmentStart: number;
  segmentEnd: number;
  text: string;
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    if (hostname === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
    if (hostname.endsWith('youtube.com')) {
      const queryId = parsed.searchParams.get('v');
      if (queryId) return queryId;
      const match = parsed.pathname.match(/\/(?:shorts|embed|live)\/([^/?#]+)/);
      return match?.[1] || null;
    }
  } catch {
    const match = url.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{6,})/);
    return match?.[1] || null;
  }
  return null;
}

export function parseYoutubeTranscriptSegments(segmentsText: string): YoutubeTranscriptSegment[] {
  const rawRows = segmentsText.split(/\r?\n/).filter(Boolean);
  const rows = rawRows
    .map((row, index) => parseTranscriptRow(row, index))
    .filter((row): row is Omit<YoutubeTranscriptSegment, 'endMs'> => Boolean(row))
    .sort((left, right) => left.startMs - right.startMs || left.index - right.index);

  return rows.map((row, index) => {
    const nextStart = rows[index + 1]?.startMs ?? null;
    const fallbackDuration = nextStart && nextStart > row.startMs ? nextStart - row.startMs : 4000;
    const durationMs = row.durationMs && row.durationMs > 0 ? row.durationMs : fallbackDuration;
    return {
      ...row,
      index,
      durationMs,
      endMs: row.startMs + durationMs,
    };
  });
}

export function buildTranscriptBlocks(
  segments: YoutubeTranscriptSegment[],
  targetMs = 28000,
): YoutubeTranscriptBlock[] {
  if (segments.length === 0) return [];
  const blocks: YoutubeTranscriptBlock[] = [];
  let current: YoutubeTranscriptSegment[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const first = current[0];
    const last = current[current.length - 1];
    blocks.push({
      id: `block-${blocks.length}`,
      startMs: first.startMs,
      endMs: last.endMs,
      segmentStart: first.index,
      segmentEnd: last.index,
      text: joinReadableText(current.map(segment => segment.text)),
    });
    current = [];
  };

  for (const segment of segments) {
    current.push(segment);
    const first = current[0];
    const elapsed = segment.endMs - first.startMs;
    const endsSentence = /[.!?。！？]\s*$/.test(segment.text);
    if (elapsed >= targetMs && (endsSentence || elapsed >= targetMs * 1.6)) flush();
  }
  flush();

  return blocks;
}

export function buildMimoTopicInputBlocks(
  segments: YoutubeTranscriptSegment[],
  targetMs = 45_000,
): YoutubeTranscriptBlock[] {
  if (segments.length === 0) return [];
  return buildTranscriptBlocks(segments, targetMs).map(block => ({
    ...block,
    text: truncateText(block.text, 1600),
  }));
}

export function formatTranscriptTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function parseTranscriptRow(row: string, index: number): Omit<YoutubeTranscriptSegment, 'endMs'> | null {
  const firstTab = row.indexOf('\t');
  if (firstTab < 0) return null;
  const secondTab = row.indexOf('\t', firstTab + 1);
  if (secondTab < 0) return null;

  const startMs = Number(row.slice(0, firstTab));
  if (!Number.isFinite(startMs)) return null;

  const durationRaw = row.slice(firstTab + 1, secondTab).trim();
  const durationMs = durationRaw ? Number(durationRaw) : null;
  const textRaw = row.slice(secondTab + 1);
  const text = normalizeTranscriptText(parseJsonText(textRaw));
  if (!text) return null;

  return {
    index,
    startMs: Math.max(0, Math.round(startMs)),
    durationMs: Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs as number)) : null,
    text,
  };
}

function parseJsonText(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'string' ? parsed : String(parsed || '');
  } catch {
    return value.replace(/^"|"$/g, '');
  }
}

function joinReadableText(parts: string[]): string {
  const text = normalizeTranscriptText(parts.join(' '));
  return text.replace(/\s+([,.!?;:，。！？；：])/g, '$1');
}

function normalizeTranscriptText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/([\p{Script=Han}])\s+(?=[\p{Script=Han}])/gu, '$1')
    .replace(/([\p{Script=Han}])\s+([，。！？；：])/gu, '$1$2')
    .replace(/([，。！？；：])\s+([\p{Script=Han}])/gu, '$1$2')
    .trim();
}

function truncateText(value: string, maxLength: number): string {
  const text = value.trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}
