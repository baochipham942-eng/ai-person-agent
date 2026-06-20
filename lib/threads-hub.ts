import { getSourcePacks } from '@/lib/knowledge-threads';
import { getKnowledgeThreadFixture } from '@/lib/knowledge-thread-fixtures/loop-engineering';
import { getThreadPresentationSeed } from '@/lib/entity-presentations/thread-presentation';
import { listFeaturedThreads } from '@/lib/knowledge-thread-people';

/** 主题列表页（/threads）的单条读模型——纯注册表聚合，不依赖落库，瞬时返回。 */
export interface ThreadHubItem {
  slug: string;
  title: string;
  /** 中文短副标题（术语译名），无则 null。 */
  subtitle: string | null;
  /** 一句话价值，优先中文 valueProp。 */
  blurb: string;
  status: string;
  sourceCount: number;
  topics: string[];
  /** 谁在推动（取自策展人物名，未策展人物的主题为空数组）。 */
  peopleNames: string[];
}

export interface ThreadsHub {
  /** 全部主题，已按成熟度+源数排序，统一网格展示。 */
  items: ThreadHubItem[];
  total: number;
}

/** loop-engineering 是静态 fixture，不在 source-pack 注册表里，单独并入。 */
const STATIC_SLUGS = ['loop-engineering'];

/** 成熟度排序：已定稿 > 复核就绪 > 待复核 > 偏薄/草稿。 */
const STATUS_MATURITY: Record<string, number> = {
  curated: 0,
  review_ready: 1,
  source_pack_review: 2,
  thin: 3,
  draft: 4,
};

function maturityRank(status: string): number {
  return STATUS_MATURITY[status] ?? 2;
}

/**
 * 短中文副标题（标准术语译名，grounded 不杜撰）。
 * 自动生成的 presentation 把整句塞进 subtitle，会撑破卡片，这里统一收敛成短词。
 */
const SUBTITLE_OVERRIDES: Record<string, string> = {
  mcp: '模型上下文协议',
  'multi-agent-orchestration': '多智能体编排',
  'agent-skills': '智能体技能',
  'agent-memory': '智能体记忆',
  'reasoning-models': '推理模型',
  'agent-security': '智能体安全',
  'computer-use': '计算机操作',
};

/** 只在副标题足够短（像术语而非整句）时才采用 seed 值，避免长句撑破卡片。 */
function cleanSubtitle(slug: string, seedSubtitle: string | undefined): string | null {
  const override = SUBTITLE_OVERRIDES[slug];
  if (override) return override;
  const s = (seedSubtitle ?? '').trim();
  if (!s) return null;
  if (s.length > 14 || /[，。；,;]/.test(s)) return null;
  return s;
}

interface RawThread {
  slug: string;
  title: string;
  whyNow: string;
  summary: string;
  status: string;
  sourceCount: number;
}

/** 收集全部主题的原始元信息（source-pack JSON + loop-engineering 静态 fixture），零 DB。 */
function collectRawThreads(): RawThread[] {
  const raw: RawThread[] = [];

  for (const pack of getSourcePacks()) {
    const t = pack.thread as Record<string, unknown>;
    raw.push({
      slug: String(t.slug),
      title: String(t.title ?? t.slug),
      whyNow: String(t.whyNow ?? ''),
      summary: String(t.summary ?? t.definitionDraft ?? ''),
      status: String(t.status ?? 'source_pack_review'),
      sourceCount: Array.isArray(pack.sources) ? pack.sources.length : 0,
    });
  }

  for (const slug of STATIC_SLUGS) {
    if (raw.some(r => r.slug === slug)) continue;
    const fx = getKnowledgeThreadFixture(slug);
    if (!fx) continue;
    raw.push({
      slug: fx.slug,
      title: fx.title,
      whyNow: fx.whyNow ?? '',
      summary: fx.summary ?? '',
      status: fx.status,
      sourceCount: Array.isArray(fx.sources) ? fx.sources.length : 0,
    });
  }

  return raw;
}

export function fetchThreadsHub(): ThreadsHub {
  const featuredThreads = listFeaturedThreads();
  const peopleBySlug = new Map(featuredThreads.map(t => [t.slug, t.peopleNames]));
  const topicsBySlug = new Map(featuredThreads.map(t => [t.slug, t.topics]));

  const items: ThreadHubItem[] = collectRawThreads().map(raw => {
    const seed = getThreadPresentationSeed(raw.slug);
    // 优先用 valueProp（始终中文、聚焦「这是什么」），避免部分主题 whyNow 是英文。
    const blurb = (seed?.valueProp || raw.summary || raw.whyNow || '').trim();
    return {
      slug: raw.slug,
      title: raw.title,
      subtitle: cleanSubtitle(raw.slug, seed?.subtitle),
      blurb,
      status: raw.status,
      sourceCount: raw.sourceCount,
      topics: topicsBySlug.get(raw.slug) ?? [],
      peopleNames: peopleBySlug.get(raw.slug) ?? [],
    };
  });

  items.sort((a, b) => {
    const rankDiff = maturityRank(a.status) - maturityRank(b.status);
    if (rankDiff !== 0) return rankDiff;
    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
    return a.title.localeCompare(b.title);
  });

  return { items, total: items.length };
}
