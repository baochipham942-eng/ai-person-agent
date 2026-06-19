import { prisma } from '@/lib/db/prisma';
import { normalizeDirectoryTopic } from '@/lib/person-directory-config';

/**
 * 人物 ↔ 主题（KnowledgeThread）这条关系边的策展层。
 *
 * 背景：主题页目前是 fixture 驱动渲染（见 lib/knowledge-thread-fixtures），
 * 主题的关键人物以前只以 source.owner 字符串存在，没有结构化连回 People 库。
 * 本模块把「谁提出 / 推动 / 质疑 / 落地了这个主题」做成可双向查询的策展数据：
 *   - 主题页：resolveThreadPeople(slug) 按 name/aliases 只读查 People，渲染「关键人物」。
 *   - 人物页：getThreadsForPerson(person) 纯内存反查，渲染「当前卷入的主题」。
 *   - 主页/话题页：listFeaturedThreads / listThreadsForTopic 提供当期主题流。
 *
 * 内容纪律：people 必须 grounded 在主题 fixture 的真实 source.owner，不许凭空加人。
 * 匹配不到 People 的 name 走 review 清单（resolveThreadPeople 的 unmatched + audit 脚本），
 * 不自动建占位人物，避免污染人物库。
 *
 * 扩展方式：新增/补充一个主题 = 往 CURATED_THREADS 加一条数据，不碰任何组件。
 * 未来主题整体迁到 DB 后，可加一张 ThreadPersonLink 表替换 CURATED_THREADS 作为真理源。
 */

export type ThreadPersonRelation = 'proposer' | 'driver' | 'skeptic' | 'implementer';

export const THREAD_PERSON_RELATION_LABELS: Record<ThreadPersonRelation, string> = {
  proposer: '提出者',
  driver: '推动者',
  skeptic: '质疑者',
  implementer: '落地者',
};

// 关键人物在主题页和人物页的展示顺序（提出者最前）。
const RELATION_ORDER: ThreadPersonRelation[] = ['proposer', 'driver', 'implementer', 'skeptic'];

export interface ThreadPersonLinkSeed {
  /** 用于匹配 People 库的主名（优先与库内 name 一致，英文名优先） */
  name: string;
  /** 额外别名，提升匹配率（如 X handle、中文名） */
  aliases?: string[];
  relation: ThreadPersonRelation;
  /** 这个人在该主题里做了什么——一句话，grounded 在 source */
  summary: string;
  /** 回链到 fixture 的 source id，提供证据 */
  sourceIds?: string[];
}

export interface CuratedThreadSeed {
  slug: string;
  title: string;
  /** 一句话「为什么现在值得看」，grounded 在主题 whyNow */
  whyNow: string;
  /** canonical 话题标签，用于话题页挂载与主页导航 */
  topics: string[];
  /** 主页/话题页排序权重，越大越靠前 */
  priority: number;
  people: ThreadPersonLinkSeed[];
}

const CURATED_THREADS: CuratedThreadSeed[] = [
  {
    slug: 'loop-engineering',
    title: 'Loop Engineering',
    whyNow:
      '从「手动 prompt agent」转向「设计替你 prompt 的外层系统」——/goal、/loop 等产品原语与 Ralph loop 原型同时成熟。',
    topics: ['AI Coding', 'Agent'],
    priority: 100,
    people: [
      {
        name: 'Boris Cherny',
        aliases: ['bcherny'],
        relation: 'proposer',
        summary:
          'Claude Code 创建者，把价值落在用户自定义 workflow 上，是 Loop Engineering 词汇进入视野的最新信号。',
        sourceIds: ['sig_bcherny_x_workflow_2026_01', 'tx_pragmatic_engineer_bcherny'],
      },
      {
        name: 'Addy Osmani',
        relation: 'proposer',
        summary: '命名并定义 Loop Engineering：不再当那个手动 prompt 的人，而是设计替你 prompt 的系统。',
        sourceIds: ['sig_osmani_loop_engineering'],
      },
      {
        name: 'Geoffrey Huntley',
        relation: 'implementer',
        summary:
          'Ralph loop 原型作者：反复喂同一 prompt + 磁盘记忆 + 可验证停止条件，是 /goal 的技术原型。',
        sourceIds: ['sig_ghuntley_ralph_loop'],
      },
    ],
  },
  {
    slug: 'agentic-coding',
    title: 'Agentic Coding',
    whyNow:
      'coding agent 从「一次性生成代码」进化成「理解→调用工具→改代码→验证→沉淀流程」的闭环，正在重塑开发工作流。',
    topics: ['AI Coding', 'Agent'],
    priority: 90,
    people: [
      {
        name: 'Boris Cherny',
        aliases: ['bcherny'],
        relation: 'driver',
        summary:
          'Claude Code 创建者，把 agentic coding 工具做成可日常使用的产品，是「让 agent 真正写代码」这条线的核心推动者。',
        sourceIds: ['tx_every_claude_code_builders', 'sig_anthropic_claude_code_expertise'],
      },
    ],
  },
  {
    slug: 'context-engineering',
    title: 'Context Engineering',
    whyNow:
      '当 prompt engineering 不够用，如何为 agent 分层组织系统指令、记忆、检索、工具返回与状态，成为新的核心工程能力。',
    topics: ['AI Coding', 'Agent'],
    priority: 80,
    people: [
      {
        name: 'Phil Schmid',
        aliases: ['Philipp Schmid', 'philschmid', '_philschmid'],
        relation: 'proposer',
        summary:
          '撰写定义性博客《The New Skill in AI is Not Prompting, It is Context Engineering》，把「上下文工程」从模糊概念讲清成一项可操作的工程技能。',
        sourceIds: ['sig_phil_schmid_context_engineering'],
      },
      {
        name: 'Andrej Karpathy',
        aliases: ['karpathy'],
        relation: 'driver',
        summary:
          '公开把重心从 prompt engineering 转向 context engineering 的代表声音，推动这一框架进入主流视野。',
        sourceIds: ['sig_phil_schmid_context_engineering'],
      },
    ],
  },
];

function getCuratedThread(slug: string): CuratedThreadSeed | null {
  const norm = slug.trim().toLowerCase();
  return CURATED_THREADS.find(thread => thread.slug.toLowerCase() === norm) ?? null;
}

// ---------- 主题页：关键人物（只读查 People） ----------

export interface ResolvedThreadPerson {
  /** null 表示人物库里没匹配到（进 review 清单，不在主区强展示） */
  id: string | null;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  roleCategory: string | null;
  relation: ThreadPersonRelation;
  relationLabel: string;
  summary: string;
  sourceIds: string[];
}

export interface ResolvedThreadPeople {
  matched: ResolvedThreadPerson[];
  unmatched: ResolvedThreadPerson[];
}

export async function resolveThreadPeople(slug: string): Promise<ResolvedThreadPeople> {
  const seed = getCuratedThread(slug);
  if (!seed || seed.people.length === 0) {
    return { matched: [], unmatched: [] };
  }

  const allTerms = uniqueStrings(seed.people.flatMap(link => [link.name, ...(link.aliases ?? [])]));
  let rows: Array<{
    id: string;
    name: string;
    aliases: string[];
    avatarUrl: string | null;
    currentTitle: string | null;
    roleCategory: string | null;
  }> = [];

  try {
    rows = await prisma.people.findMany({
      where: {
        OR: [
          { name: { in: seed.people.map(link => link.name) } },
          { aliases: { hasSome: allTerms } },
        ],
      },
      select: { id: true, name: true, aliases: true, avatarUrl: true, currentTitle: true, roleCategory: true },
    });
  } catch (error) {
    console.error('[thread-people] resolveThreadPeople DB lookup failed:', error);
    rows = [];
  }

  const matched: ResolvedThreadPerson[] = [];
  const unmatched: ResolvedThreadPerson[] = [];

  for (const link of seed.people) {
    const terms = uniqueLower([link.name, ...(link.aliases ?? [])]);
    const hit = rows.find(row => {
      const rowTerms = uniqueLower([row.name, ...(row.aliases ?? [])]);
      return rowTerms.some(term => terms.includes(term));
    });
    const base = {
      relation: link.relation,
      relationLabel: THREAD_PERSON_RELATION_LABELS[link.relation],
      summary: link.summary,
      sourceIds: link.sourceIds ?? [],
    };
    if (hit) {
      matched.push({
        id: hit.id,
        name: hit.name,
        avatarUrl: hit.avatarUrl,
        currentTitle: hit.currentTitle,
        roleCategory: hit.roleCategory,
        ...base,
      });
    } else {
      unmatched.push({ id: null, name: link.name, avatarUrl: null, currentTitle: null, roleCategory: null, ...base });
    }
  }

  matched.sort((a, b) => RELATION_ORDER.indexOf(a.relation) - RELATION_ORDER.indexOf(b.relation));
  return { matched, unmatched };
}

// ---------- 人物页：当前卷入的主题（纯内存反查） ----------

export interface PersonThreadInvolvement {
  slug: string;
  title: string;
  whyNow: string;
  relation: ThreadPersonRelation;
  relationLabel: string;
  summary: string;
}

export function getThreadsForPerson(person: { name: string; aliases?: string[] }): PersonThreadInvolvement[] {
  const terms = uniqueLower([person.name, ...(person.aliases ?? [])]);
  if (terms.length === 0) return [];

  const out: PersonThreadInvolvement[] = [];
  for (const thread of CURATED_THREADS) {
    for (const link of thread.people) {
      const linkTerms = uniqueLower([link.name, ...(link.aliases ?? [])]);
      if (linkTerms.some(term => terms.includes(term))) {
        out.push({
          slug: thread.slug,
          title: thread.title,
          whyNow: thread.whyNow,
          relation: link.relation,
          relationLabel: THREAD_PERSON_RELATION_LABELS[link.relation],
          summary: link.summary,
        });
        break;
      }
    }
  }
  out.sort((a, b) => RELATION_ORDER.indexOf(a.relation) - RELATION_ORDER.indexOf(b.relation));
  return out;
}

// ---------- 主页 / 话题页：当期主题流 ----------

export interface FeaturedThread {
  slug: string;
  title: string;
  whyNow: string;
  topics: string[];
  priority: number;
  /** 关键人物名（展示「谁在推动」，不查库；空数组表示尚未策展人物） */
  peopleNames: string[];
}

function toFeatured(thread: CuratedThreadSeed): FeaturedThread {
  return {
    slug: thread.slug,
    title: thread.title,
    whyNow: thread.whyNow,
    topics: thread.topics,
    priority: thread.priority,
    peopleNames: thread.people.map(link => link.name),
  };
}

export function listFeaturedThreads(limit?: number): FeaturedThread[] {
  const sorted = [...CURATED_THREADS].sort((a, b) => b.priority - a.priority).map(toFeatured);
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

export function listThreadsForTopic(topic: string): FeaturedThread[] {
  const canonical = normalizeDirectoryTopic(topic);
  return listFeaturedThreads().filter(thread =>
    thread.topics.some(item => normalizeDirectoryTopic(item) === canonical)
  );
}

/** 给 audit 脚本用：导出全部策展 seed。 */
export function listCuratedThreadSeeds(): CuratedThreadSeed[] {
  return CURATED_THREADS;
}

// ---------- 工具 ----------

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function uniqueLower(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim().toLowerCase()).filter(Boolean)));
}
