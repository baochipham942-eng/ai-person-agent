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
  buildCompanyCard,
  buildCompareCard,
  buildPersonCard,
  buildXPostCard,
  threadToFeaturedCard,
  type FeaturedCard,
  type FeaturedCardKind,
} from './featured-cards';

/** 人物 pin：库内 ref 优先（实时数据 + 站内人物页），否则 inline 策展（外链）。 */
interface PersonPickSeed {
  kind: 'person';
  ref?: string;
  inline?: {
    name: string;
    currentTitle: string;
    avatarUrl?: string;
    href?: string;
    topics?: string[];
  };
  whyNow: string;
  weekOf?: string;
}

/** 推文 pin：手工策展一条值得推的 X 推文（替代池子里自动选出的低质推文）。 */
interface XPostPickSeed {
  kind: 'x_post';
  /** 作者库内 id（优先，取实时头像/职位）；否则用 inline 字段 */
  authorRef?: string;
  author?: string;
  authorTitle?: string;
  authorAvatarUrl?: string;
  text: string;
  url: string;
  topics?: string[];
  whyNow: string;
  weekOf?: string;
}

/** 公司 pin：策展一家公司，链接到 /org 实体页。org 须与 People.organization 值一致（用于 slug）。 */
interface CompanyPickSeed {
  kind: 'company';
  org: string;
  displayTitle?: string;
  subtitle?: string;
  topics?: string[];
  whyNow: string;
  weekOf?: string;
}

/** 对比 pin：策展一组人物对比，链接到 /compare?people=a,b 预置对比。 */
interface ComparePickSeed {
  kind: 'compare';
  people: Array<{ id: string; name: string }>;
  title: string;
  subtitle?: string;
  topic?: string;
  topics?: string[];
  whyNow: string;
  weekOf?: string;
}

export type WeeklyPickSeed = PersonPickSeed | XPostPickSeed | CompanyPickSeed | ComparePickSeed;

/**
 * 本周精选 pin。编辑流（先立人，再对比，再公司，最后一条值得读的推文）：
 * - Boris Cherny：库内真实人物（Claude Code 作者 / Loop Engineering 提出者）。
 * - Thibault “Tibo” Sottiaux：OpenAI Codex 负责人，已入库。
 * - 对比卡：Claude Code vs Codex，正面对位两位主角，链到预置对比。
 * - 公司卡：OpenAI，库内人物最多 / 影响力最高 / 公司源最厚的实体页。
 * - 推文卡：Karpathy 关于"编程被重构"的真实推文（替代池子里自动选出的低信号推文）。
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
  {
    kind: 'compare',
    people: [
      { id: 'cmjxmgs83000011y3v2qj1z51', name: 'Boris Cherny' },
      { id: 'cmqkvnoy90000ykt7p08njh7g', name: 'Thibault Sottiaux' },
    ],
    title: 'Claude Code vs Codex：谁在定义编程的下一形态',
    subtitle: 'Boris Cherny ⇄ Thibault Sottiaux',
    topic: 'AI Coding',
    topics: ['AI Coding', 'Agent'],
    whyNow: '两大编程 agent 的操盘手正面对位——把 Anthropic 与 OpenAI 在 coding agent 上的路线、产品与影响力放进一张对比表。',
    weekOf: '2026-06-15',
  },
  {
    kind: 'company',
    org: 'OpenAI',
    subtitle: '库内 33 位人物 · AI 影响力最集中',
    topics: ['AGI', 'Agent', 'AI Coding'],
    whyNow: '库内人物最多、综合影响力最高的 AI 公司——从 Codex 到 GPT 系列，一页看清 OpenAI 的人、产品与最新官方动向。',
    weekOf: '2026-06-15',
  },
  {
    kind: 'x_post',
    authorRef: 'cmjsme4n800009u972zrrxrei', // Andrej Karpathy
    text: "I've never felt this much behind as a programmer. The profession is being dramatically refactored as the bits contributed by the programmer are increasingly sparse and between... a new programmable layer of abstraction to master involving agents, subagents, prompts, contexts, memory, tools, plugins, skills, hooks, MCP, LSP, slash commands, workflows.",
    url: 'https://x.com/karpathy/status/2004607146781278521',
    topics: ['AI Coding', 'Agent'],
    whyNow: 'Karpathy 罕见的"我作为程序员从没这么落后过"——一条把 agent/MCP/skills/hooks 这套新抽象层说透的真实推文，比口号更值得本周一读。',
    weekOf: '2026-06-15',
  },
];

// 5 张策展 pin（人物×2 + 对比 + 公司 + 推文）后仍给动态信号（视频/论文/新闻/主题）留 5 个位。
const DEFAULT_LIMIT = 10;
const MIN_LIMIT = 3;
const MAX_LIMIT = 10;
/** 配额必保类型：池里有就至少各进 1 张（覆盖实时信号 video/paper/article + 一条策展主题）。 */
const PRIORITY_KINDS: FeaturedCardKind[] = ['video', 'x_post', 'paper', 'article', 'thread'];

/**
 * 论文进"本周推荐"的最大发表年龄（天）。
 *
 * 为什么需要这道闸：`fetchActivityEvents` 的时间窗是 `occurredAt>=since OR detectedAt>=since`，
 * 只要最近抓进库（detectedAt 新）就会进流——经典老论文（如 2017《Attention Is All You Need》、
 * 2019 HuggingFace Transformers 库论文）一旦被重新抓取，就会冒充"最近在发生"。本周推荐反映的是
 * 实时信号，故论文按**真实发表时间** `occurredAt` 过滤，只收近 4 个月发表的。
 *
 * 前置依赖：`occurredAt` 必须是真实发表日。`materialize_activity_events` 里
 * `occurredAt = publishedAt || fetchedAt`，若 RawPoolItem.publishedAt 缺失会回退抓取日 → 该论文
 * 仍会冒充新鲜，此过滤对它无效。根治靠 `scripts/enrich/fetch_openalex_papers.ts` 把真实
 * publicationDate 写进 publishedAt。其它卡片类型（视频/文章/播客/主题）不受本闸影响。
 */
const PAPER_MAX_AGE_DAYS = 120;

function isPaperFreshEnough(card: FeaturedCard): boolean {
  if (card.kind !== 'paper') return true; // 只约束论文
  if (!card.occurredAt) return false; // 没有发表日的论文不进本周推荐
  const ageDays = (Date.now() - new Date(card.occurredAt).getTime()) / 86_400_000;
  return Number.isFinite(ageDays) && ageDays <= PAPER_MAX_AGE_DAYS;
}

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
  // 论文+播客合桶、文章单独桶（含公司源）、X 推文单独桶。每桶独立兜底，单桶超时不拖垮整块。
  const fetchBucket = (eventTypes: ActivityEventType[] | undefined, limit: number, sourceTypes?: string[]) =>
    fetchActivityEvents({ topic: params.topic, organization: params.organization, eventTypes, sourceTypes, limit, days: 30, includeRelations: false })
      .catch(error => {
        console.error('weekly-picks bucket failed:', { eventTypes, sourceTypes }, error);
        return [];
      });

  const [videoEvents, xPostEvents, paperPodcastEvents, articleEvents] = await Promise.all([
    fetchBucket(['video'], 6),
    fetchBucket(undefined, 6, ['x']),
    fetchBucket(['paper', 'podcast'], 8),
    fetchBucket(['article'], 8, ['exa', 'company_source']),
  ]);
  const activityCards = [...videoEvents, ...xPostEvents, ...paperPodcastEvents, ...articleEvents]
    .map(activityToFeaturedCard)
    .filter((card): card is FeaturedCard => Boolean(card))
    .filter(isPaperFreshEnough);

  const pool = dedupe([...threadCards, ...activityCards]);
  const pins = scoped ? [] : await resolvePinnedCards();

  return mixFeaturedCards(pins, pool, limit);
}

async function resolvePinnedCards(): Promise<FeaturedCard[]> {
  // 收齐所有需要查库的人物 id（人物 pin 的 ref + 推文 pin 的 authorRef），一次批量取。
  const refIds = new Set<string>();
  for (const seed of WEEKLY_PICKS) {
    if (seed.kind === 'person' && seed.ref) refIds.add(seed.ref);
    if (seed.kind === 'x_post' && seed.authorRef) refIds.add(seed.authorRef);
  }
  const persons = refIds.size > 0
    ? await prisma.people.findMany({
        where: { id: { in: [...refIds] } },
        select: { id: true, name: true, avatarUrl: true, currentTitle: true, topics: true },
      })
    : [];
  const personMap = new Map(persons.map(person => [person.id, person]));

  const cards: FeaturedCard[] = [];
  for (const seed of WEEKLY_PICKS) {
    if (seed.kind === 'person') {
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
          topics: person.topics,
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
    } else if (seed.kind === 'x_post') {
      const author = seed.authorRef ? personMap.get(seed.authorRef) : null;
      cards.push(buildXPostCard({
        author: author?.name ?? seed.author ?? 'X',
        authorTitle: author?.currentTitle ?? seed.authorTitle ?? null,
        authorAvatarUrl: author?.avatarUrl ?? seed.authorAvatarUrl ?? null,
        authorId: author?.id ?? null,
        text: seed.text,
        url: seed.url,
        whyNow: seed.whyNow,
        topics: seed.topics,
      }));
    } else if (seed.kind === 'company') {
      cards.push(buildCompanyCard({
        org: seed.org,
        displayTitle: seed.displayTitle,
        subtitle: seed.subtitle ?? null,
        whyNow: seed.whyNow,
        topics: seed.topics,
      }));
    } else if (seed.kind === 'compare') {
      cards.push(buildCompareCard({
        title: seed.title,
        subtitle: seed.subtitle ?? null,
        peopleIds: seed.people.map(person => person.id),
        topic: seed.topic ?? null,
        whyNow: seed.whyNow,
        topics: seed.topics,
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

  // pin 已覆盖的类型计入配额：避免策展卡（如手工选的推文）又被池子里同类型低质卡重复补一张。
  const kindCount = new Map<FeaturedCardKind, number>();
  for (const card of chosen) kindCount.set(card.kind, (kindCount.get(card.kind) ?? 0) + 1);
  const bump = (kind: FeaturedCardKind) => kindCount.set(kind, (kindCount.get(kind) ?? 0) + 1);

  // 1) 必保类型各进 1 张（按分数取该类型最高的）；pin 已覆盖的类型跳过，不重复塞。
  for (const kind of PRIORITY_KINDS) {
    if (remaining <= 0) break;
    if ((kindCount.get(kind) ?? 0) > 0) continue;
    const candidate = sorted.find(card => card.kind === kind && !usedIds.has(card.id));
    if (candidate) {
      picked.push(candidate);
      usedIds.add(candidate.id);
      bump(candidate.kind);
      remaining -= 1;
    }
  }

  // 2) 按分数补齐，单类型不超过 kindCap（计入 pin，主题压到 2 张，给实时信号让位）
  for (const card of sorted) {
    if (remaining <= 0) break;
    if (usedIds.has(card.id)) continue;
    if ((kindCount.get(card.kind) ?? 0) >= kindCap(card.kind, limit)) continue;
    picked.push(card);
    usedIds.add(card.id);
    bump(card.kind);
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
