/**
 * 首页「本周推荐」策展注册表 + 排序混合器。
 *
 * 排序策略（D2，产品负责人拍板）：人工 pin 置顶 + 算法按类型配额补齐。
 *  - pin 层：WEEKLY_PICKS 里本周精选（人物/主题/活动），仅在未筛选（无 topic/org）时置顶。
 *  - 候选池：策展主题 + ActivityEvent 按类型分桶取（绕开全局排序对视频的压制）。
 *  - 配额：保证视频/论文/主题各至少 1 张（若候选池有），单一类型不超过半数，避免一屏全是文章。
 *
 * 加一条本周精选 = 往 WEEKLY_PICKS 加一行，不碰组件。
 */
import { prisma } from '@/lib/db/prisma';
import { fetchActivityEvents, type ActivityEventType } from '@/lib/activity';
import { listFeaturedThreads, listThreadsForTopic } from '@/lib/knowledge-thread-people';
import {
  activityToFeaturedCard,
  buildPersonCard,
  threadToFeaturedCard,
  type FeaturedCard,
  type FeaturedCardKind,
} from './featured-cards';

export interface WeeklyPickSeed {
  kind: 'person'; // MVP 只支持人物 pin；主题/活动 pin 留作后续
  /** 库内人物 id（优先，渲染实时数据 + 站内人物页） */
  ref?: string;
  /** 未入库人物的 inline 策展数据（链接走外部） */
  inline?: {
    name: string;
    currentTitle: string;
    avatarUrl?: string;
    href?: string;
    topics?: string[];
  };
  whyNow: string;
  /** 归属周（标记用，当前未做按周过滤） */
  weekOf?: string;
}

/**
 * 本周精选 pin。
 * - Boris Cherny：库内真实人物（Claude Code 作者 / Loop Engineering 提出者）。
 * - Thibault “Tibo” Sottiaux：OpenAI Codex 负责人，暂未入人物库，用 inline 策展卡（头像已存 public/avatars）。
 */
export const WEEKLY_PICKS: WeeklyPickSeed[] = [
  {
    kind: 'person',
    ref: 'cmjxmgs83000011y3v2qj1z51',
    whyNow: 'Claude Code 作者、Loop Engineering 提出者——本周重点看他怎么定义"写 loop 而不是写 prompt"的外层 agent 系统。',
    weekOf: '2026-06-15',
  },
  {
    kind: 'person',
    ref: 'cmqkvnoy90000ykt7p08njh7g', // Thibault “Tibo” Sottiaux，已入库（TEMP-thibault-sottiaux）
    whyNow: 'OpenAI Codex 负责人（前 DeepMind Gemini）——本周听他讲"当模型真能独立干活，公司组织该变成什么样"。',
    weekOf: '2026-06-15',
  },
];

const DEFAULT_LIMIT = 8;
const MIN_LIMIT = 3;
const MAX_LIMIT = 10;
/** 配额必保类型：池里有就至少各进 1 张（覆盖实时信号 video/paper/article + 一条策展主题）。 */
const PRIORITY_KINDS: FeaturedCardKind[] = ['video', 'paper', 'article', 'thread'];

/**
 * 单类型上限。主题是常青策展内容，在"本周"语境里压到最多 2 张，
 * 把空间让给真正反映"最近在发生"的实时信号（视频/论文/新闻）。
 */
function kindCap(kind: FeaturedCardKind, limit: number): number {
  if (kind === 'thread') return 2;
  return Math.max(1, Math.ceil(limit / 2));
}

export interface ResolveWeeklyPicksParams {
  topic?: string | null;
  organization?: string | null;
  limit?: number;
}

export async function resolveWeeklyPicks(params: ResolveWeeklyPicksParams = {}): Promise<FeaturedCard[]> {
  const limit = clamp(params.limit ?? DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT);
  const scoped = Boolean(params.topic || params.organization);

  const threadCards = (params.topic ? listThreadsForTopic(params.topic) : listFeaturedThreads()).map(threadToFeaturedCard);

  // 视频必须单独成桶：fetchActivityEvents 内部质量排序把视频压到最底，
  // 若和论文/播客合桶，视频会在内部 slice 阶段被挤掉（用户明确要的高密度视频就没了）。
  // 论文+播客合桶、文章单独桶（含公司源）。每桶独立兜底，单桶超时不拖垮整块。
  const fetchBucket = (eventTypes: ActivityEventType[], limit: number) =>
    fetchActivityEvents({ topic: params.topic, organization: params.organization, eventTypes, limit, days: 30, includeRelations: false })
      .catch(error => {
        console.error('weekly-picks bucket failed:', eventTypes, error);
        return [];
      });

  const [videoEvents, paperPodcastEvents, articleEvents] = await Promise.all([
    fetchBucket(['video'], 6),
    fetchBucket(['paper', 'podcast'], 8),
    fetchBucket(['article'], 8),
  ]);
  const activityCards = [...videoEvents, ...paperPodcastEvents, ...articleEvents]
    .map(activityToFeaturedCard)
    .filter((card): card is FeaturedCard => Boolean(card));

  const pool = dedupe([...threadCards, ...activityCards]);
  const pins = scoped ? [] : await resolvePinnedCards();

  return mixFeaturedCards(pins, pool, limit);
}

async function resolvePinnedCards(): Promise<FeaturedCard[]> {
  const refIds = WEEKLY_PICKS.filter(seed => seed.ref).map(seed => seed.ref!) as string[];
  const persons = refIds.length > 0
    ? await prisma.people.findMany({
        where: { id: { in: refIds } },
        select: { id: true, name: true, avatarUrl: true, currentTitle: true },
      })
    : [];
  const personMap = new Map(persons.map(person => [person.id, person]));

  const cards: FeaturedCard[] = [];
  for (const seed of WEEKLY_PICKS) {
    if (seed.ref) {
      const person = personMap.get(seed.ref);
      if (!person) continue; // 库内查不到就跳过，不渲染坏卡
      cards.push(buildPersonCard({
        id: person.id,
        name: person.name,
        avatarUrl: person.avatarUrl,
        currentTitle: person.currentTitle,
        href: `/person/${person.id}`,
        external: false,
        whyNow: seed.whyNow,
      }));
    } else if (seed.inline) {
      cards.push(buildPersonCard({
        id: null,
        name: seed.inline.name,
        avatarUrl: seed.inline.avatarUrl ?? null,
        currentTitle: seed.inline.currentTitle,
        href: seed.inline.href ?? '#',
        external: true,
        whyNow: seed.whyNow,
        topics: seed.inline.topics,
      }));
    }
  }
  return cards;
}

/**
 * 混合器：pin 置顶 + 候选池按"类型配额 + 打散"补齐。
 */
function mixFeaturedCards(pins: FeaturedCard[], pool: FeaturedCard[], limit: number): FeaturedCard[] {
  const chosen = pins.slice(0, limit);
  let remaining = limit - chosen.length;
  if (remaining <= 0) return chosen;

  const sorted = [...pool].sort((a, b) => b.rankScore - a.rankScore);
  const usedIds = new Set(chosen.map(card => card.id));
  const picked: FeaturedCard[] = [];

  // 1) 必保类型各进 1 张（按分数取该类型最高的）
  for (const kind of PRIORITY_KINDS) {
    if (remaining <= 0) break;
    const candidate = sorted.find(card => card.kind === kind && !usedIds.has(card.id));
    if (candidate) {
      picked.push(candidate);
      usedIds.add(candidate.id);
      remaining -= 1;
    }
  }

  // 2) 按分数补齐，单类型不超过 kindCap（主题压到 2 张，给实时信号让位）
  for (const card of sorted) {
    if (remaining <= 0) break;
    if (usedIds.has(card.id)) continue;
    const kindCount = picked.filter(item => item.kind === card.kind).length;
    if (kindCount >= kindCap(card.kind, limit)) continue;
    picked.push(card);
    usedIds.add(card.id);
    remaining -= 1;
  }

  // 3) 仍有空位（所有类型都触顶）则放宽配额兜底填满
  if (remaining > 0) {
    for (const card of sorted) {
      if (remaining <= 0) break;
      if (usedIds.has(card.id)) continue;
      picked.push(card);
      usedIds.add(card.id);
      remaining -= 1;
    }
  }

  const ordered = spreadByKind(picked.sort((a, b) => b.rankScore - a.rankScore));
  return [...chosen, ...ordered];
}

/** 避免连续 3 张同类型：遇到第 3 连就往后找一张不同类型的换上来。 */
function spreadByKind(cards: FeaturedCard[]): FeaturedCard[] {
  const result: FeaturedCard[] = [];
  const pending = [...cards];
  while (pending.length > 0) {
    const lastTwoSameKind =
      result.length >= 2 &&
      result[result.length - 1].kind === result[result.length - 2].kind;
    let index = 0;
    if (lastTwoSameKind) {
      const alt = pending.findIndex(card => card.kind !== result[result.length - 1].kind);
      if (alt >= 0) index = alt;
    }
    result.push(pending.splice(index, 1)[0]);
  }
  return result;
}

function dedupe(cards: FeaturedCard[]): FeaturedCard[] {
  const seen = new Set<string>();
  const result: FeaturedCard[] = [];
  for (const card of cards) {
    const urlKey = canonicalUrl(card.href);
    const key = urlKey ? `url:${urlKey}` : `id:${card.id}`;
    if (seen.has(key) || seen.has(`id:${card.id}`)) continue;
    seen.add(key);
    seen.add(`id:${card.id}`);
    result.push(card);
  }
  return result;
}

function canonicalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return null; // 站内相对路径（/threads/... /person/...）走 id 去重
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
