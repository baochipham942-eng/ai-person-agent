/**
 * 首页「本周推荐」异质卡片统一类型 + 适配层。
 *
 * 设计原则（对齐实体页"组件纯渲染、加数据不碰组件"）：
 *  - 不同数据源（策展主题 / ActivityEvent / 策展人物）统一映射成 `FeaturedCard`，组件只认这一种结构。
 *  - `whyNow`（推荐理由）是异质流不塌成大杂烩的护栏：适配器拿不到推荐理由就返回 null，不进流。
 *  - 排序权重在本层重算（`rankScore`），不改全局 activityQualityScore（那个还服务 /digest 和人物页）。
 */
import type { ActivityEvent, ActivityEventType } from '@/lib/activity';
import type { FeaturedThread } from '@/lib/knowledge-thread-people';

export type FeaturedCardKind = 'thread' | 'video' | 'paper' | 'article' | 'x_post' | 'podcast' | 'person' | 'company' | 'compare';

export interface FeaturedCardPerson {
  id: string | null; // 库内人物 id；null = inline 策展人物（链接走外部）
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
}

export interface FeaturedCard {
  kind: FeaturedCardKind;
  /** 去重 + React key */
  id: string;
  title: string;
  /** 推荐理由，必填非空——空则不进流 */
  whyNow: string;
  href: string;
  /** 是否新窗口打开（外链 true，站内 false） */
  external: boolean;
  person: FeaturedCardPerson | null;
  topics: string[];
  occurredAt: string | null;
  sourceLabel: string | null;
  /** 视频缩略图（YouTube 由 url 推导）；其它类型为 null */
  thumbnailUrl: string | null;
  /** 附注，如主题的"关键人物 · A · B" */
  note: string | null;
  pinned: boolean;
  rankScore: number;
}

/** 本层重算的类型基础分——视频不再像全局排序那样垫底，确保高密度视频能露出。 */
const KIND_BASE_SCORE: Record<FeaturedCardKind, number> = {
  person: 100, // pin 人物天然置顶（另有 pinned 标记兜底）
  company: 98, // 策展公司卡，pin 置顶
  compare: 96, // 策展人物对比卡，pin 置顶
  thread: 62,
  video: 56,
  x_post: 50,
  paper: 52,
  article: 42,
  podcast: 38,
};

/** ActivityEvent.eventType → 卡片 kind；不在表里的（github/role_change/relation_change）不进本周推荐主流。 */
const ACTIVITY_KIND_MAP: Partial<Record<ActivityEventType, FeaturedCardKind>> = {
  video: 'video',
  paper: 'paper',
  article: 'article',
  podcast: 'podcast',
};

export function threadToFeaturedCard(thread: FeaturedThread): FeaturedCard {
  const note = thread.peopleNames.length > 0 ? `关键人物 · ${thread.peopleNames.slice(0, 3).join(' · ')}` : null;
  return {
    kind: 'thread',
    id: `thread:${thread.slug}`,
    title: thread.title,
    whyNow: thread.whyNow,
    href: `/threads/${thread.slug}`,
    external: false,
    person: null,
    topics: thread.topics.slice(0, 3),
    occurredAt: null,
    sourceLabel: '知识主题',
    thumbnailUrl: null,
    note,
    pinned: false,
    rankScore: KIND_BASE_SCORE.thread + Math.min(thread.priority, 30),
  };
}

export function activityToFeaturedCard(event: ActivityEvent): FeaturedCard | null {
  const kind = event.sourceType === 'x' ? 'x_post' : ACTIVITY_KIND_MAP[event.eventType];
  if (!kind) return null; // 丢弃 github / role_change / relation_change
  if (!event.importanceReason || !event.importanceReason.trim()) return null; // 无推荐理由不进流
  if (!event.title.trim() || !event.url.trim()) return null;
  const internalHref = internalSourceHref(event, kind);

  // 公司源事件 personId 形如 "company:<orgId>"，无内部人物页，不挂人物 chip
  const isCompanyAttributed = event.personId.startsWith('company:');
  const person: FeaturedCardPerson | null = isCompanyAttributed
    ? null
    : {
        id: event.personId,
        name: event.personName,
        avatarUrl: event.personAvatarUrl,
        currentTitle: event.personCurrentTitle,
      };

  return {
    kind,
    id: `activity:${event.id}`,
    title: event.title,
    whyNow: event.importanceReason,
    href: internalHref ?? event.url,
    external: internalHref ? false : true,
    person,
    topics: event.topics.slice(0, 3),
    occurredAt: event.occurredAt,
    sourceLabel: event.sourceLabel,
    thumbnailUrl: kind === 'video' ? youtubeThumbnail(event.url) : null,
    note: null,
    pinned: false,
    rankScore: KIND_BASE_SCORE[kind] + recencyScore(event.occurredAt) + Math.round(event.confidence * 8),
  };
}

function internalSourceHref(event: ActivityEvent, kind: FeaturedCardKind): string | null {
  return internalYoutubeSourceHref(event, kind) ?? internalPaperSourceHref(event, kind);
}

function internalYoutubeSourceHref(event: ActivityEvent, kind: FeaturedCardKind): string | null {
  if (kind !== 'video') return null;
  if (event.sourceType !== 'youtube') return null;
  if (!event.sourceItemId) return null;
  return `/source/youtube/${event.sourceItemId}`;
}

function internalPaperSourceHref(event: ActivityEvent, kind: FeaturedCardKind): string | null {
  if (kind !== 'paper') return null;
  if (event.sourceType !== 'openalex') return null;
  if (!event.sourceItemId) return null;
  return `/source/paper/${event.sourceItemId}`;
}

export interface PersonCardInput {
  id: string | null;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  href: string;
  external: boolean;
  whyNow: string;
  topics?: string[];
}

export function buildPersonCard(input: PersonCardInput): FeaturedCard {
  return {
    kind: 'person',
    id: `person:${input.id ?? input.name}`,
    title: input.name,
    whyNow: input.whyNow,
    href: input.href,
    external: input.external,
    person: { id: input.id, name: input.name, avatarUrl: input.avatarUrl, currentTitle: input.currentTitle },
    topics: (input.topics ?? []).slice(0, 3),
    occurredAt: null,
    sourceLabel: '人物',
    thumbnailUrl: null,
    note: input.currentTitle,
    pinned: true,
    rankScore: KIND_BASE_SCORE.person,
  };
}

export interface XPostCardInput {
  author: string;
  authorTitle?: string | null;
  authorAvatarUrl?: string | null;
  authorId?: string | null;
  text: string;
  url: string;
  whyNow: string;
  topics?: string[];
}

/** 策展推文卡（pin）：和池子里自动选出的 x_post 同结构，但内容由本周精选注册表手工指定。 */
export function buildXPostCard(input: XPostCardInput): FeaturedCard {
  return {
    kind: 'x_post',
    id: `x_post:${input.url}`,
    title: input.text,
    whyNow: input.whyNow,
    href: input.url,
    external: true,
    person: {
      id: input.authorId ?? null,
      name: input.author,
      avatarUrl: input.authorAvatarUrl ?? null,
      currentTitle: input.authorTitle ?? null,
    },
    topics: (input.topics ?? []).slice(0, 3),
    occurredAt: null,
    sourceLabel: 'X',
    thumbnailUrl: null,
    note: null,
    pinned: true,
    rankScore: KIND_BASE_SCORE.x_post,
  };
}

export interface CompanyCardInput {
  /** 公司名（用于 /org slug，须与 People.organization 值一致） */
  org: string;
  /** 卡片标题，默认用公司名 */
  displayTitle?: string;
  subtitle?: string | null;
  href?: string;
  whyNow: string;
  topics?: string[];
}

/** 策展公司推荐卡（pin）：链接到 /org/<公司名> 实体页。 */
export function buildCompanyCard(input: CompanyCardInput): FeaturedCard {
  return {
    kind: 'company',
    id: `company:${input.org}`,
    title: input.displayTitle ?? input.org,
    whyNow: input.whyNow,
    href: input.href ?? `/org/${encodeURIComponent(input.org)}`,
    external: false,
    person: null,
    topics: (input.topics ?? []).slice(0, 3),
    occurredAt: null,
    sourceLabel: null,
    thumbnailUrl: null,
    note: input.subtitle ?? null,
    pinned: true,
    rankScore: KIND_BASE_SCORE.company,
  };
}

export interface CompareCardInput {
  title: string;
  subtitle?: string | null;
  peopleIds: string[];
  topic?: string | null;
  whyNow: string;
  topics?: string[];
}

/** 策展人物对比卡（pin）：链接到 /compare?people=a,b 预置对比。 */
export function buildCompareCard(input: CompareCardInput): FeaturedCard {
  const params = new URLSearchParams();
  params.set('people', input.peopleIds.join(','));
  if (input.topic) params.set('topic', input.topic);
  return {
    kind: 'compare',
    id: `compare:${input.peopleIds.join('+')}`,
    title: input.title,
    whyNow: input.whyNow,
    href: `/compare?${params.toString()}`,
    external: false,
    person: null,
    topics: (input.topics ?? []).slice(0, 3),
    occurredAt: null,
    sourceLabel: null,
    thumbnailUrl: null,
    note: input.subtitle ?? null,
    pinned: true,
    rankScore: KIND_BASE_SCORE.compare,
  };
}

/** 从 YouTube watch / youtu.be URL 推导缩略图，无需额外字段或 API。 */
export function youtubeThumbnail(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = parsed.searchParams.get('v');
      if (v) return v;
      const parts = parsed.pathname.split('/').filter(Boolean);
      // /shorts/<id> 或 /embed/<id>
      if ((parts[0] === 'shorts' || parts[0] === 'embed') && parts[1]) return parts[1];
    }
    return null;
  } catch {
    return null;
  }
}

function recencyScore(occurredAt: string | null): number {
  if (!occurredAt) return 0;
  const ageDays = Math.max(0, (Date.now() - new Date(occurredAt).getTime()) / 86_400_000);
  return Math.max(0, 14 - Math.min(14, ageDays * 2));
}
