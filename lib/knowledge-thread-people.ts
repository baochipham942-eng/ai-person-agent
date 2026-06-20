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
      {
        name: 'Cat Wu',
        relation: 'driver',
        summary: 'Claude Code 产品负责人，从产品侧定义 agentic coding 的工作流形态（子代理、未来形态）。',
        sourceIds: ['tx_every_claude_code_builders'],
      },
      {
        name: 'John Yang',
        aliases: ['john-b-yang'],
        relation: 'implementer',
        summary: 'SWE-bench / SWE-agent 共同一作，把「agent 能否解真实 GitHub issue」做成可测量基准。',
        sourceIds: ['paper_swe_bench'],
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
      {
        name: 'Tobi Lütke',
        aliases: ['Tobias Lütke', 'tobi'],
        relation: 'proposer',
        summary: 'Shopify CEO，2025 年 6 月最早公开倡导用 context engineering 取代 prompt engineering，是该术语引爆点之一。',
        sourceIds: ['sig_tobi_lutke_context_engineering'],
      },
    ],
  },
  {
    slug: 'generative-ui',
    title: 'Generative UI / AI Artifacts',
    whyNow:
      '模型的产出从「一段文本」变成「能跑、能分享的软件」——Claude Artifacts 把产出固化成可调 API 的微应用，Vercel v0 / AI SDK 让 agent 直接生成界面，连非程序员都能一句话造工具。',
    topics: ['AIGC/生成式媒体', 'AI 产品化', 'AI Coding'],
    priority: 70,
    people: [
      {
        name: 'Geoffrey Litt',
        aliases: ['geoffreylitt'],
        relation: 'proposer',
        summary:
          '2023 年《Malleable software in the age of LLMs》提出「用户用自然语言重塑软件本身」，是 artifacts-as-apps 与可塑界面的思想源头。',
        sourceIds: ['genui_litt_malleable_software'],
      },
      {
        name: 'Haijun Xia',
        relation: 'proposer',
        summary:
          'CHI 2025 task-driven 可塑界面 + 渐进式 UI 生成两篇论文的核心作者，把「说着话捏出软件」从口号形式化成可控的研究方法。',
        sourceIds: ['genui_paper_chi2025_malleable', 'genui_paper_gradual_generation_malleable'],
      },
      {
        name: 'Yaniv Leviathan',
        relation: 'proposer',
        summary:
          'Google《Generative UI: LLMs are Effective UI Generators》主作者，用实验证明现代 LLM 能为几乎任意 prompt 稳健生成高质量界面。',
        sourceIds: ['genui_paper_llms_effective_ui_generators'],
      },
      {
        name: 'Boris Cherny',
        aliases: ['bcherny'],
        relation: 'driver',
        summary:
          'Claude Code 创建者，把 Artifacts 做成日常用的运行态工件（代码可视化、系统图、共享仪表盘），是「产出即可运行软件」的产品推动者。',
        sourceIds: ['genui_cherny_artifacts_firsthand', 'genui_anthropic_claude_powered_artifacts'],
      },
      {
        name: 'Guillermo Rauch',
        aliases: ['rauch'],
        relation: 'implementer',
        summary:
          'Vercel CEO，v0 与 AI SDK 生成式 UI 的推动者，把「agent 就是前端」做成被数百万开发者使用的工具栈。',
        sourceIds: ['genui_vercel_announcing_v0', 'genui_vercel_ai_sdk_3_genui'],
      },
    ],
  },
  {
    slug: 'mcp',
    title: 'Model Context Protocol (MCP)',
    whyNow:
      'MCP 从 Anthropic 内部方案变成 OpenAI、Google 都采用的跨厂标准，2025 年底治理移交 Linux Foundation，成为 AI 应用接入工具与数据的事实协议。',
    topics: ['Agent', 'AI 基础设施'],
    priority: 80,
    people: [
      {
        name: 'David Soria Parra',
        aliases: ['dsp'],
        relation: 'proposer',
        summary: 'Anthropic 工程师，MCP 共同创造者，2024 年 11 月把 MCP 作为开放标准发起并开源。',
        sourceIds: ['mcp_anthropic_announcement', 'mcp_architecture_docs'],
      },
      {
        name: 'Justin Spahr-Summers',
        aliases: ['jspahrsummers'],
        relation: 'proposer',
        summary: 'Anthropic 工程师，MCP 共同创造者，与 David Soria Parra 一起在内部孵化协议。',
        sourceIds: ['mcp_anthropic_announcement'],
      },
      {
        name: 'Dhanji R. Prasanna',
        aliases: ['Dhanji Prasanna'],
        relation: 'driver',
        summary: 'Block CTO，MCP 最早一批生产采用者与公开背书者，代表企业侧采纳信号。',
        sourceIds: ['mcp_anthropic_announcement'],
      },
    ],
  },
  {
    slug: 'multi-agent-orchestration',
    title: 'Multi-Agent Orchestration',
    whyNow:
      '2025 年多智能体编排成为框架与实验室的主战场，Anthropic 的并行 orchestrator-worker 与 Cognition 的单线程审慎派形成最著名的「智能体架构之争」。',
    topics: ['Agent'],
    priority: 78,
    people: [
      {
        name: 'Jeremy Hadfield',
        aliases: ['jeremyhadfield'],
        relation: 'proposer',
        summary: 'Anthropic 多智能体研究系统一手作者，定义 orchestrator-worker（主控并行调度专职 subagent）范式。',
        sourceIds: ['anthropic_multi_agent_research'],
      },
      {
        name: 'Walden Yan',
        aliases: ['waldenyan'],
        relation: 'skeptic',
        summary: 'Cognition 联合创始人，《Don’t Build Multi-Agents》主张写操作单线程 + context engineering，是审慎反方一极。',
        sourceIds: ['cognition_dont_build_multi_agents'],
      },
      {
        name: 'Harrison Chase',
        relation: 'driver',
        summary: 'LangChain/LangGraph 创始人，确立 supervisor/network/hierarchical 编排拓扑的工业标准命名。',
        sourceIds: ['langgraph_introduction_doc'],
      },
      {
        name: 'Chi Wang',
        aliases: ['sonichi'],
        relation: 'implementer',
        summary: 'AutoGen 原作者，提出多智能体「对话式编排」范式，是该路线的代表。',
        sourceIds: ['autogen_microsoft_intro'],
      },
    ],
  },
  {
    slug: 'reasoning-models',
    title: 'Reasoning Models',
    whyNow:
      'OpenAI o 系列与 DeepSeek-R1 把「推理时计算 + 强化学习后训练」从研究推向产品，2025.01 R1 开源引爆，推理模型成为下一代能力评估的焦点。',
    topics: ['推理', '大语言模型'],
    priority: 79,
    people: [
      {
        name: 'Noam Brown',
        relation: 'driver',
        summary: 'OpenAI 研究员，把扑克 AI 的「推理时搜索」思想带进 LLM，是 test-time compute 范式的核心推手。',
        sourceIds: ['tx_noam_brown_test_time_compute'],
      },
      {
        name: 'Karl Cobbe',
        aliases: ['karlcobbe'],
        relation: 'proposer',
        summary: 'OpenAI 研究员，《Let’s Verify Step by Step》核心作者，确立过程监督（PRM）作为推理训练根基。',
        sourceIds: ['lets_verify_step_by_step'],
      },
      {
        name: '梁文锋',
        aliases: ['Liang Wenfeng', 'DeepSeek'],
        relation: 'implementer',
        summary: 'DeepSeek 创始人，R1/R1-Zero 证明纯 RL 可激发推理，把范式推向开源社区。',
        sourceIds: ['deepseek_r1_paper'],
      },
      {
        name: 'Ilya Sutskever',
        relation: 'proposer',
        summary: '前 OpenAI 首席科学家，o 系列推理方向与 PRM 论文共同作者，「从 scaling 预训练转向 test-time」叙事的代表。',
        sourceIds: ['lets_verify_step_by_step'],
      },
    ],
  },
  {
    slug: 'ai-evals',
    title: 'AI Evals',
    whyNow:
      'AI 产品大量上线后瓶颈从「能不能做」转向「怎么知道它真做对了」，evals 成为 AI 时代的单元测试，judge 校准（谁来验证判官）是关键一环。',
    topics: ['评测与基准'],
    priority: 77,
    people: [
      {
        name: 'Hamel Husain',
        aliases: ['hamelhusain'],
        relation: 'driver',
        summary: '把「AI 产品要靠 eval 迭代」推成行业显学的头号布道者，与 Shreya 合开最火 AI Evals 课。',
        sourceIds: ['sig_hamel_your_ai_needs_evals'],
      },
      {
        name: 'Shreya Shankar',
        aliases: ['sh_reya'],
        relation: 'proposer',
        summary: 'EvalGen /《Who Validates the Validators》核心作者，提出 criteria drift 与 judge 校准。',
        sourceIds: ['paper_who_validates_validators'],
      },
      {
        name: 'Lianmin Zheng',
        aliases: ['merrymercy'],
        relation: 'proposer',
        summary: 'MT-Bench / Chatbot Arena（LMSYS）一作，LLM-as-a-judge 方法奠基人。',
        sourceIds: ['paper_llm_as_a_judge_mtbench'],
      },
    ],
  },
  {
    slug: 'agent-memory',
    title: 'Agent Memory',
    whyNow:
      '智能体要长期可用、能个性化、跨会话不失忆，记忆从附加功能升为核心架构层；Letta/mem0/Zep 等把有状态智能体做成产品。',
    topics: ['Agent', 'AI 基础设施'],
    priority: 76,
    people: [
      {
        name: 'Charles Packer',
        aliases: ['cpacker'],
        relation: 'proposer',
        summary: 'MemGPT 一作、Letta CEO，把「LLM 即操作系统、内存分层」概念产品化。',
        sourceIds: ['memgpt_paper_arxiv'],
      },
      {
        name: 'Joon Sung Park',
        aliases: ['joonspk'],
        relation: 'proposer',
        summary: 'Stanford Generative Agents 一作，记忆流 + 反思 + 三因子检索奠基者。',
      },
      {
        name: 'Taranjeet Singh',
        aliases: ['taranjeetio'],
        relation: 'implementer',
        summary: 'mem0 创始人，工业界采用最广的开源记忆层及 Mem0 论文（LOCOMO 基准）推手。',
      },
    ],
  },
  {
    slug: 'agent-skills',
    title: 'Agent Skills',
    whyNow:
      'Agent Skills 2025 年 10 月提出、12 月开源为开放标准，被 OpenAI/Microsoft/Cursor 等 30+ 工具采纳，是继 MCP 之后的第二层智能体基础设施。',
    topics: ['Agent'],
    priority: 75,
    people: [
      {
        name: 'Barry Zhang',
        aliases: ['barry-zhang'],
        relation: 'proposer',
        summary: 'Anthropic，Agent Skills 共同作者，主导该形态设计（《Don’t Build Agents, Build Skills Instead》）。',
      },
      {
        name: 'Mahesh Murag',
        aliases: ['mahesh-murag'],
        relation: 'proposer',
        summary: 'Anthropic，Agent Skills 共同作者；此前也是 MCP 推广关键人物。',
      },
      {
        name: 'Boris Cherny',
        aliases: ['bcherny'],
        relation: 'implementer',
        summary: 'Claude Code 创建者，Agent Skills 首发落地载体。',
      },
    ],
  },
  {
    slug: 'agent-security',
    title: 'Agent Security',
    whyNow:
      '自主智能体把「读外部数据」和「执行动作」接进同一上下文，提示注入成了真实漏洞；致命三要素与二选一原则成为缓解共识。',
    topics: ['Agent', 'AI 安全'],
    priority: 74,
    people: [
      {
        name: 'Simon Willison',
        aliases: ['simonw'],
        relation: 'proposer',
        summary: '提出致命三要素（Lethal Trifecta），2025–2026 智能体安全威胁模型的核心定义者。',
        sourceIds: ['owasp_llm_top_10_2025'],
      },
      {
        name: 'Kai Greshake',
        aliases: ['kai-greshake'],
        relation: 'proposer',
        summary: '间接提示注入开山论文一作，把「数据即指令」攻击面带入视野。',
      },
    ],
  },
  {
    slug: 'computer-use',
    title: 'Computer Use',
    whyNow:
      'Anthropic（2024-10）、OpenAI（2025-01）、Google（2025-10）三大厂相继下场，通用 GUI 智能体从论文走向产品，但仍处早期。',
    topics: ['Agent', 'AI Coding'],
    priority: 73,
    people: [
      {
        name: 'Tao Yu',
        aliases: ['taoyds'],
        relation: 'proposer',
        summary: 'OSWorld 资深作者（HKU / xlang-ai），定义 computer use 最权威的跨 OS 桌面基准。',
        sourceIds: ['osworld_paper'],
      },
      {
        name: 'Graham Neubig',
        relation: 'driver',
        summary: 'WebArena / VisualWebArena 共同作者，Web agent 评测体系核心学者。',
      },
      {
        name: 'Erik Schluntz',
        aliases: ['erikschluntz'],
        relation: 'implementer',
        summary: 'Anthropic，深度参与 computer use 与《Building Effective Agents》。',
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
