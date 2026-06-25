import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/common/SiteHeader';
import { YoutubeSourceWorkspace } from '@/components/source/YoutubeSourceWorkspace';
import { prisma } from '@/lib/db/prisma';
import { extractPersistedVideoTopics, extractVideoTopicsWithMimo } from '@/lib/youtube-topic-extraction';
import {
  buildTranscriptBlocks,
  extractYouTubeVideoId,
  parseYoutubeTranscriptSegments,
} from '@/lib/youtube-transcript';

export const revalidate = 300;

interface YoutubeSourcePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: YoutubeSourcePageProps): Promise<Metadata> {
  const { id } = await params;
  const source = await prisma.rawPoolItem.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!source) return { title: '视频资料未找到 | AI 人物库' };
  return {
    title: `${source.title} | 视频资料 | AI 人物库`,
    description: '带主题时间线和字幕联动的 YouTube 视频资料页。',
  };
}

export default async function YoutubeSourcePage({ params }: YoutubeSourcePageProps) {
  const { id } = await params;
  const source = await prisma.rawPoolItem.findUnique({
    where: { id },
    select: {
      id: true,
      sourceType: true,
      title: true,
      url: true,
      publishedAt: true,
      metadata: true,
      personId: true,
      person: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          currentTitle: true,
          topics: true,
        },
      },
    },
  });

  if (!source || source.sourceType !== 'youtube') notFound();

  const metadata = asRecord(source.metadata);
  const videoId = readString(metadata.videoId) || extractYouTubeVideoId(source.url);
  if (!videoId) notFound();

  const transcript = await prisma.youTubeTranscript.findFirst({
    where: {
      personId: source.personId,
      OR: [
        { videoId },
        { sourceItemId: source.id },
        { captionItemId: source.id },
      ],
    },
    select: {
      id: true,
      lang: true,
      segmentsText: true,
      segmentCount: true,
      durationMs: true,
      fetchedAt: true,
    },
    orderBy: { fetchedAt: 'desc' },
  });

  const segments = transcript ? parseYoutubeTranscriptSegments(transcript.segmentsText) : [];
  const blocks = buildTranscriptBlocks(segments);
  const tags = uniqueStrings([
    ...readStringArray(metadata.tags),
    ...source.person.topics,
  ]);
  const topicExtraction = extractPersistedVideoTopics(metadata, blocks, segments)
    ?? await extractVideoTopicsWithMimo({
      title: source.title,
      videoId,
      personName: source.person.name,
      personTitle: source.person.currentTitle,
      tags,
      segments,
    });
  const contentTopicHintCount = countContentTopicHints(metadata);
  const topicExtractionMessage = topicExtraction.topics.length === 0 && contentTopicHintCount > 0
    ? `已有 ${contentTopicHintCount} 个内容主题标签，但还没有带时间戳的主题时间线；${topicExtraction.message}`
    : topicExtraction.message;
  const durationMs = transcript?.durationMs || segments[segments.length - 1]?.endMs || null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current={null} maxWidth="7xl" />
      <div className="border-b border-stone-100 bg-white/70">
        <div className="mx-auto flex max-w-[1480px] items-center gap-1.5 px-4 py-2 text-xs text-stone-400 sm:px-6">
          <Link href="/" className="font-medium text-stone-500 hover:text-orange-600">
            AI 人物库
          </Link>
          <span>/</span>
          <Link href={`/person/${source.person.id}`} className="font-medium text-stone-500 hover:text-orange-600">
            {source.person.name}
          </Link>
          <span>/</span>
          <span className="truncate text-stone-500">视频资料</span>
        </div>
      </div>
      <YoutubeSourceWorkspace
        source={{
          id: source.id,
          title: source.title,
          url: source.url,
          publishedAt: formatDate(source.publishedAt),
          author: readString(metadata.author),
          sourceLabel: readString(metadata.sourceLabel) || readString(metadata.label),
          thumbnailUrl: readString(metadata.thumbnailUrl),
        }}
        person={{
          id: source.person.id,
          name: source.person.name,
          avatarUrl: source.person.avatarUrl,
          currentTitle: source.person.currentTitle,
        }}
        video={{
          videoId,
          durationMs,
        }}
        transcript={transcript ? {
          lang: transcript.lang,
          segmentCount: transcript.segmentCount,
          fetchedAt: formatDate(transcript.fetchedAt),
        } : null}
        segments={segments}
        blocks={blocks}
        topics={topicExtraction.topics}
        topicExtraction={{
          status: topicExtraction.status,
          model: topicExtraction.model,
          message: topicExtractionMessage,
        }}
      />
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function countContentTopicHints(metadata: Record<string, unknown>): number {
  const contentTopics = metadata.contentTopics;
  if (Array.isArray(contentTopics)) {
    return contentTopics.filter(item => {
      if (typeof item === 'string') return item.trim().length > 0;
      if (!item || typeof item !== 'object') return false;
      const record = item as Record<string, unknown>;
      return typeof record.title === 'string' || typeof record.name === 'string' || typeof record.topic === 'string';
    }).length;
  }
  return 0;
}

function formatDate(value: Date | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(value);
}
