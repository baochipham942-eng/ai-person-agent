export type KnowledgeThreadStatus = 'source_pack_review' | 'review_ready' | 'thin' | 'draft';

export type KnowledgeSourceRole =
  | 'signal'
  | 'official_definition'
  | 'transcript_context'
  | 'paper_foundation'
  | 'implementation_signal'
  | 'company_strategy_context';

export type KnowledgeActionKind = 'read' | 'try' | 'watch' | 'track';
export type KnowledgeLinkKind = 'person' | 'org' | 'topic' | 'thread';

export interface KnowledgeThreadSource {
  id: string;
  role: KnowledgeSourceRole;
  sourceKind: string;
  title: string;
  owner: string;
  url?: string;
  publishedAt?: string;
  summary: string;
  evidenceNote: string;
  evidenceQuote?: string;
  confidence: number;
  status: 'verified' | 'usable' | 'needs_capture' | 'thin';
}

export interface KnowledgeThreadTimelineItem {
  date: string;
  label: string;
  sourceIds: string[];
  note: string;
}

export interface KnowledgeThreadEdge {
  id: string;
  fromSourceId: string;
  toSourceId: string;
  relationType: string;
  confidence: number;
  evidenceNote: string;
}

export interface KnowledgeThreadAction {
  kind: KnowledgeActionKind;
  title: string;
  description: string;
  sourceIds: string[];
}

export interface KnowledgeThreadCompanyContext {
  title: string;
  description: string;
  href: string;
  sourceIds: string[];
  candidateCount: number;
}

export interface KnowledgeThreadRelatedLink {
  kind: KnowledgeLinkKind;
  label: string;
  href: string;
  relation: string;
  sourceIds: string[];
}

export interface KnowledgeThreadFixture {
  slug: string;
  title: string;
  summary: string;
  whyNow: string;
  confidence: number;
  lastReviewedAt: string;
  status: KnowledgeThreadStatus;
  readinessNote: string;
  definition: string;
  boundary: string;
  requiredRoles: KnowledgeSourceRole[];
  sources: KnowledgeThreadSource[];
  timeline: KnowledgeThreadTimelineItem[];
  edges: KnowledgeThreadEdge[];
  actions: KnowledgeThreadAction[];
  relatedLinks: KnowledgeThreadRelatedLink[];
  companyStrategyContext?: KnowledgeThreadCompanyContext;
}

export const loopEngineeringThread: KnowledgeThreadFixture = {
  slug: 'loop-engineering',
  title: 'Loop Engineering',
  summary:
    'Loop Engineering 是围绕 coding agent 的计划、工具调用、代码执行、验证和反馈来组织开发工作流，而不是只追一次性代码生成。',
  whyNow:
    'Claude Code 官方材料、Boris Cherny 的工作流信号、SWE-bench / SWE-agent 论文和 hooks / MCP / GitHub Action 等实现入口同时成熟，已经足够支撑一个窄主题证据页。',
  confidence: 0.82,
  lastReviewedAt: '2026-06-18',
  status: 'source_pack_review',
  readinessNote:
    'S1 来源包已覆盖五类必备证据角色，共 22 条 topic candidates。X 和 transcript 来源仍保留复核提示；company strategy 只做回链，不计入主题页 ready。',
  definition:
    '开发者在 coding-agent 环境里反复让 agent 理解上下文、规划、调用工具、改代码、运行检查、吸收反馈，并把这个循环做成可复用工作流。',
  boundary:
    '这个页不把财报、IR 或 earnings call 当技术主题证据；公司级材料属于机构页，只能作为可选背景回链。',
  requiredRoles: [
    'signal',
    'official_definition',
    'transcript_context',
    'paper_foundation',
    'implementation_signal',
  ],
  sources: [
    source({
      id: 'sig_bcherny_x_workflow_2026_01',
      role: 'signal',
      sourceKind: 'x_post',
      owner: 'Boris Cherny',
      title: 'Boris Cherny X post on Claude Code workflow',
      url: 'https://x.com/bcherny/status/2007179832300581177',
      publishedAt: '2026-01-02',
      summary: 'Boris 把 Claude Code 的价值放在用户自定义 workflow 上，是 Loop Engineering 词汇进入页面的最新信号。',
      evidenceQuote: 'There is no one correct way to use Claude Code.',
      evidenceNote: '只作为 signal；X 可访问性和全文上下文发布前还要复核。',
      confidence: 0.72,
      status: 'usable',
    }),
    source({
      id: 'sig_osmani_loop_engineering',
      role: 'signal',
      sourceKind: 'practitioner_blog',
      owner: 'Addy Osmani',
      title: 'Loop Engineering（命名与定义）',
      url: 'https://addyosmani.com/blog/loop-engineering/',
      publishedAt: '2026-06-05',
      summary: 'Addy Osmani 命名并定义 loop engineering：不再当那个手动 prompt agent 的人，而是设计那个替你 prompt 的系统。',
      evidenceQuote: 'Loop engineering is replacing yourself as the person who prompts the agent. You design the system that does it instead.',
      evidenceNote: '术语命名与核心定义来源；非 Anthropic 官方，作为权威实践者定义使用。',
      confidence: 0.88,
      status: 'usable',
    }),
    source({
      id: 'sig_ghuntley_ralph_loop',
      role: 'signal',
      sourceKind: 'practitioner_blog',
      owner: 'Geoffrey Huntley',
      title: 'Ralph Wiggum as a software engineer（Ralph loop）',
      url: 'https://ghuntley.com/ralph/',
      publishedAt: '2025-07-01',
      summary: 'Ralph loop：把同一个 prompt 反复喂给 agent，每轮清空上下文、靠磁盘状态文件记忆——证明无需复杂 harness，只要持久化加可验证停止条件，是 /goal 的原型。',
      evidenceQuote: 'deterministically simple in an unpredictable world',
      evidenceNote: '外层循环的原型技术；/goal 是它的产品化。',
      confidence: 0.84,
      status: 'usable',
    }),
    source({
      id: 'off_anthropic_claude_code_research_preview',
      role: 'official_definition',
      sourceKind: 'official_blog',
      owner: 'Anthropic',
      title: 'Claude 3.7 Sonnet and Claude Code',
      url: 'https://www.anthropic.com/news/claude-3-7-sonnet',
      publishedAt: '2025-02-24',
      summary: '官方发布 Claude Code research preview，把它定位为 agentic coding tool。',
      evidenceQuote: 'Claude Code is an agentic coding tool.',
      evidenceNote: '官方产品入口来源，用来确定 Claude Code 作为样板产品 surface。',
      confidence: 0.95,
    }),
    source({
      id: 'off_claude_code_goal_loop',
      role: 'official_definition',
      sourceKind: 'official_docs',
      owner: 'Anthropic Docs',
      title: '/goal 与 /loop：Claude Code 的自主循环原语',
      url: 'https://docs.anthropic.com/en/docs/claude-code/slash-commands',
      publishedAt: '2026-04-30',
      summary: '/goal 跑到一个可验证条件成立才停、由独立模型判定是否完成；/loop 按 cron 定时重复 prompt——这两条是 Loop Engineering 的产品锚点。',
      evidenceQuote: '/goal runs until a verifiable condition holds; /loop schedules a recurring prompt.',
      evidenceNote: '本页最直接定义“循环”的官方原语；发布前确认 slash-commands 文档已收录 /goal 与 /loop 的精确条目。',
      confidence: 0.95,
    }),
    source({
      id: 'off_claude_code_overview',
      role: 'official_definition',
      sourceKind: 'official_docs',
      owner: 'Anthropic Docs',
      title: 'Claude Code overview',
      url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
      summary: '定义 Claude Code 是 Anthropic 的 agentic coding CLI。',
      evidenceQuote: "Claude Code is Anthropic's official CLI for agentic coding.",
      evidenceNote: '主产品定义来源；docs 会更新，入库时要保存 fetchedAt。',
      confidence: 0.94,
    }),
    source({
      id: 'off_claude_code_how_it_works',
      role: 'official_definition',
      sourceKind: 'official_docs',
      owner: 'Anthropic Docs',
      title: 'How Claude Code works',
      url: 'https://docs.anthropic.com/en/docs/claude-code/how-claude-code-works',
      summary: '解释 Claude Code 的上下文、工具、权限和 agent 操作边界。',
      evidenceQuote: 'Claude Code uses context and tools to help you code.',
      evidenceNote: '解释 loop 组件时比二手材料更可靠。',
      confidence: 0.92,
    }),
    source({
      id: 'off_claude_code_common_workflows',
      role: 'official_definition',
      sourceKind: 'official_docs',
      owner: 'Anthropic Docs',
      title: 'Common workflows',
      url: 'https://docs.anthropic.com/en/docs/claude-code/common-workflows',
      summary: '官方列出探索、规划、修复和自动化等 Claude Code workflow。',
      evidenceQuote: 'Claude Code supports common development workflows.',
      evidenceNote: '把 Boris 的 workflow signal 回绑到产品化工作流。',
      confidence: 0.9,
    }),
    source({
      id: 'off_claude_code_best_practices',
      role: 'official_definition',
      sourceKind: 'official_engineering_blog',
      owner: 'Anthropic Engineering',
      title: 'Claude Code: Best practices for agentic coding',
      url: 'https://www.anthropic.com/engineering/claude-code-best-practices',
      publishedAt: '2025-04-18',
      summary: '官方工程建议覆盖上下文设置、验证和迭代，是本页概念定义的核心来源。',
      evidenceQuote: 'Claude Code is intentionally low-level and unopinionated.',
      evidenceNote: '支撑“loop 是可设计工作流”的主判断。',
      confidence: 0.94,
    }),
    source({
      id: 'tx_pragmatic_engineer_bcherny',
      role: 'transcript_context',
      sourceKind: 'podcast_transcript',
      owner: 'The Pragmatic Engineer / Boris Cherny',
      title: 'Building Claude Code with Boris Cherny',
      url: 'https://newsletter.pragmaticengineer.com/p/claude-code-with-boris-cherny',
      publishedAt: '2026-03-04',
      summary: '长访谈语境，解释 Claude Code、agent workflow、产品哲学和开发者行为。',
      evidenceQuote: 'working with agents in parallel',
      evidenceNote: '页面可展示为 context；发布强引文前要确认 transcript 原文。',
      confidence: 0.78,
      status: 'usable',
    }),
    source({
      id: 'tx_lenny_bcherny',
      role: 'transcript_context',
      sourceKind: 'podcast_transcript',
      owner: "Lenny's Newsletter / Boris Cherny",
      title: 'What happens after coding is solved? with Boris Cherny',
      url: 'https://www.lennysnewsletter.com/p/what-happens-after-coding-is-solved',
      publishedAt: '2026-05-04',
      summary: '提供 Claude Code 改变 coding workflow 和产品构建方式的长解释。',
      evidenceQuote: 'What happens after coding is solved?',
      evidenceNote: '只能在确认可访问 transcript 后抽取页面级 quote。',
      confidence: 0.72,
      status: 'usable',
    }),
    source({
      id: 'tx_bcherny_three_stage_workos',
      role: 'transcript_context',
      sourceKind: 'talk_writeup',
      owner: 'Boris Cherny @ WorkOS Acquired Unplugged',
      title: 'Boris Cherny 三阶段 loop 定义（WorkOS 讲话整理）',
      url: 'https://medium.com/mountain-movers/what-a-loop-actually-is-boris-chernys-three-stage-definition-33dd2bfe01b3',
      publishedAt: '2026-06-02',
      summary: 'Boris 把 loop 讲成三阶段：手敲代码靠补全 → 手动并行 prompt 多个会话 → 写 loop 让 loop 去 prompt；并强调工程师反而更重要。',
      evidenceQuote: 'I don’t prompt Claude anymore. I have loops that are running. My job is to write loops.',
      evidenceNote: 'WorkOS 讲话的第三方整理（含直接引文）；发布前补 Boris 原始视频或逐字稿。',
      confidence: 0.85,
      status: 'usable',
    }),
    source({
      id: 'paper_react',
      role: 'paper_foundation',
      sourceKind: 'paper',
      owner: 'Google Research / Princeton',
      title: 'ReAct: Synergizing Reasoning and Acting in Language Models',
      url: 'https://arxiv.org/abs/2210.03629',
      publishedAt: '2022-10-06',
      summary: '推理与行动交替执行，为 coding-agent loop 的 reason/action 结构提供方法根基。',
      evidenceQuote: 'generate both reasoning traces and task-specific actions',
      evidenceNote: '支撑 reason-act loop，不直接替代 coding 产品定义。',
      confidence: 0.93,
    }),
    source({
      id: 'paper_toolformer',
      role: 'paper_foundation',
      sourceKind: 'paper',
      owner: 'Meta AI',
      title: 'Toolformer: Language Models Can Teach Themselves to Use Tools',
      url: 'https://arxiv.org/abs/2302.04761',
      publishedAt: '2023-02-09',
      summary: '解释模型何时、如何调用外部工具的基础问题。',
      evidenceQuote: 'teach themselves to use external tools',
      evidenceNote: '用于解释 tool-use mechanics。',
      confidence: 0.9,
    }),
    source({
      id: 'paper_swe_bench',
      role: 'paper_foundation',
      sourceKind: 'paper',
      owner: 'Princeton NLP',
      title: 'SWE-bench: Can Language Models Resolve Real-World GitHub Issues?',
      url: 'https://arxiv.org/abs/2310.06770',
      publishedAt: '2023-10-10',
      summary: '用真实 GitHub issue 和 repo 任务衡量 coding agent，说明验证环节为什么关键。',
      evidenceQuote: 'resolve real-world GitHub issues',
      evidenceNote: '支撑“不是 toy coding prompt”的评估边界。',
      confidence: 0.94,
    }),
    source({
      id: 'paper_swe_agent',
      role: 'paper_foundation',
      sourceKind: 'paper',
      owner: 'SWE-agent authors',
      title: 'SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering',
      url: 'https://arxiv.org/abs/2405.15793',
      publishedAt: '2024-05-24',
      summary: '把软件工程任务转成 agent-computer interface，为 coding loop 的界面和执行路径提供论文背景。',
      evidenceQuote: 'Agent-Computer Interfaces Enable Automated Software Engineering',
      evidenceNote: '连接抽象 agent 与软件工程界面。',
      confidence: 0.9,
    }),
    source({
      id: 'paper_agent_spend',
      role: 'paper_foundation',
      sourceKind: 'paper',
      owner: 'Agent cost research',
      title: 'How Do AI Agents Spend Your Money? Analyzing Token Usage Patterns',
      url: 'https://arxiv.org/abs/2604.22750',
      publishedAt: '2026-04-29',
      summary: '解释长循环 agent 的 token 和成本动态，是 tracking 成本约束的候选来源。',
      evidenceQuote: 'Analyzing Token Usage Patterns',
      evidenceNote: '新论文，正式发布前要复核 peer status 和范围。',
      confidence: 0.7,
      status: 'usable',
    }),
    source({
      id: 'impl_claude_code_sdk',
      role: 'implementation_signal',
      sourceKind: 'official_docs',
      owner: 'Anthropic Docs',
      title: 'Agent SDK overview',
      url: 'https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-overview',
      summary: '把 Claude Code loop 暴露成可编程 agent session，而不只停留在交互式 CLI。',
      evidenceQuote: 'build custom agents and automation',
      evidenceNote: '支撑 implementation cards 和开发者行动项。',
      confidence: 0.9,
    }),
    source({
      id: 'impl_claude_code_hooks_reference',
      role: 'implementation_signal',
      sourceKind: 'official_docs',
      owner: 'Anthropic Docs',
      title: 'Hooks reference',
      url: 'https://docs.anthropic.com/en/docs/claude-code/hooks',
      summary: 'Hooks 提供围绕 tool-use、notification、stop 等事件的确定性干预点。',
      evidenceQuote: 'Hooks are user-defined shell commands.',
      evidenceNote: '强实现来源，说明 loop 里的检查点可以工程化。',
      confidence: 0.88,
    }),
    source({
      id: 'impl_claude_code_hooks_guide',
      role: 'implementation_signal',
      sourceKind: 'official_docs',
      owner: 'Anthropic Docs',
      title: 'Automate actions with hooks',
      url: 'https://docs.anthropic.com/en/docs/claude-code/hooks-guide',
      summary: '给出自动化检查、格式化和 guardrail 的 hooks 示例。',
      evidenceQuote: 'automate actions with hooks',
      evidenceNote: '和 hooks reference 一起展示具体工程动作。',
      confidence: 0.86,
    }),
    source({
      id: 'impl_claude_code_subagents',
      role: 'implementation_signal',
      sourceKind: 'official_docs',
      owner: 'Anthropic Docs',
      title: 'Create custom subagents',
      url: 'https://docs.anthropic.com/en/docs/claude-code/sub-agents',
      summary: 'Subagents 把探索、规划、测试、实现拆给不同专业 agent。',
      evidenceQuote: 'specialized AI assistants',
      evidenceNote: '支撑 workflow decomposition。',
      confidence: 0.84,
    }),
    source({
      id: 'impl_claude_code_skills',
      role: 'implementation_signal',
      sourceKind: 'official_docs',
      owner: 'Anthropic Docs',
      title: 'Extend Claude with skills',
      url: 'https://docs.anthropic.com/en/docs/claude-code/skills',
      summary: 'Skills 把指令、脚本和资源打包，让 loop practice 可以复用。',
      evidenceQuote: 'package specialized knowledge',
      evidenceNote: '说明 repeated workflows 可以沉淀成可移植能力。',
      confidence: 0.82,
    }),
    source({
      id: 'impl_claude_code_mcp',
      role: 'implementation_signal',
      sourceKind: 'official_docs',
      owner: 'Anthropic Docs',
      title: 'Connect Claude Code to tools via MCP',
      url: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
      summary: 'MCP 把 agent loop 接到外部工具、数据和本地服务。',
      evidenceQuote: 'connect Claude Code to external tools',
      evidenceNote: '解释 implementation source 为什么是主题页必备角色。',
      confidence: 0.84,
    }),
    source({
      id: 'impl_claude_code_action',
      role: 'implementation_signal',
      sourceKind: 'github_repo',
      owner: 'Anthropic',
      title: 'anthropics/claude-code-action',
      url: 'https://github.com/anthropics/claude-code-action',
      summary: '把 Claude Code 放进 issue 和 PR workflow。',
      evidenceQuote: 'Claude Code Action',
      evidenceNote: 'GitHub implementation 主来源。',
      confidence: 0.86,
    }),
    source({
      id: 'impl_claude_code_action_example',
      role: 'implementation_signal',
      sourceKind: 'github_example',
      owner: 'Anthropic',
      title: 'claude-code-action example workflow',
      url: 'https://github.com/anthropics/claude-code-action/tree/main/examples',
      summary: '示例 workflow 展示 coding-agent loop 怎样进入可 review 的 GitHub 自动化。',
      evidenceQuote: 'examples',
      evidenceNote: '引用具体 snippet 前要检查 example file。',
      confidence: 0.82,
    }),
  ],
  timeline: [
    {
      date: '2022-10',
      label: 'ReAct 把推理和行动交替执行写成 agent 基础结构。',
      sourceIds: ['paper_react'],
      note: '方法根基，不直接定义 Claude Code。',
    },
    {
      date: '2023-10',
      label: 'SWE-bench 用真实 GitHub issue 测 coding agent 的修复能力。',
      sourceIds: ['paper_swe_bench'],
      note: '验证和真实 repo 任务成为 loop 的关键约束。',
    },
    {
      date: '2025-02',
      label: 'Anthropic 发布 Claude Code research preview。',
      sourceIds: ['off_anthropic_claude_code_research_preview', 'off_claude_code_overview'],
      note: '产品入口进入官方材料。',
    },
    {
      date: '2025-04',
      label: 'Anthropic 工程博客给出 agentic coding 最佳实践。',
      sourceIds: ['off_claude_code_best_practices'],
      note: '上下文、验证和迭代成为可照做的工作流。',
    },
    {
      date: '2026-01',
      label: 'Boris Cherny 把 Claude Code 价值指向自定义 workflow。',
      sourceIds: ['sig_bcherny_x_workflow_2026_01'],
      note: '这是新鲜信号，不作为官方定义。',
    },
    {
      date: '2026-03',
      label: '长访谈提供产品哲学和开发者行为背景。',
      sourceIds: ['tx_pragmatic_engineer_bcherny'],
      note: '发布引用前还要确认 transcript 原文。',
    },
    {
      date: 'P0',
      label: 'SDK、hooks、MCP、subagents、skills 和 GitHub Action 组成工程实现层。',
      sourceIds: ['impl_claude_code_sdk', 'impl_claude_code_hooks_reference', 'impl_claude_code_mcp', 'impl_claude_code_action'],
      note: '这说明 loop 可以被工程化、复用和接入团队流程。',
    },
  ],
  edges: [
    edge('sig_bcherny_x_workflow_2026_01', 'off_claude_code_common_workflows', 'tweet_keyword_to_official_workflow', 0.74, 'Boris frames Claude Code around custom workflow; docs formalize common workflows.'),
    edge('off_claude_code_best_practices', 'paper_react', 'agent_loop_to_reason_action_foundation', 0.84, 'Agentic coding practice maps to interleaved reasoning and actions.'),
    edge('off_claude_code_how_it_works', 'paper_toolformer', 'tool_use_to_tool_call_foundation', 0.8, 'Claude Code tool behavior sits on the broader tool-use foundation.'),
    edge('off_claude_code_best_practices', 'paper_swe_bench', 'coding_loop_to_eval_benchmark', 0.82, 'Real coding workflows require real repository issue benchmarks.'),
    edge('impl_claude_code_sdk', 'impl_claude_code_mcp', 'agent_runtime_to_tool_integration', 0.78, 'Programmable Claude Code sessions can connect to tool execution surfaces.'),
    edge('impl_claude_code_hooks_reference', 'impl_claude_code_hooks_guide', 'reference_to_workflow_example', 0.8, 'Hook schemas and examples show deterministic checkpoints around agent loops.'),
    edge('impl_claude_code_subagents', 'off_claude_code_common_workflows', 'workflow_decomposition', 0.76, 'Subagents support delegated exploration and task-specific workflow loops.'),
    edge('impl_claude_code_action_example', 'impl_claude_code_action', 'example_to_implementation', 0.78, 'The GitHub workflow turns coding-agent loops into PR and issue automation.'),
  ],
  actions: [
    {
      kind: 'read',
      title: '读官方定义',
      description: '先读 Claude Code overview、How it works 和 best practices，确认 loop 的产品边界。',
      sourceIds: ['off_claude_code_overview', 'off_claude_code_how_it_works', 'off_claude_code_best_practices'],
    },
    {
      kind: 'try',
      title: '跑一个小闭环',
      description: '用 Claude Code 做一个小 issue，加入 hooks 检查和 GitHub Action review，观察反馈如何回到下一轮。',
      sourceIds: ['impl_claude_code_hooks_reference', 'impl_claude_code_action'],
    },
    {
      kind: 'watch',
      title: '补 transcript 引用',
      description: '继续确认两条 Boris 长访谈的 transcript 文本，页面发布前只抽取可回源的短引文。',
      sourceIds: ['tx_pragmatic_engineer_bcherny', 'tx_lenny_bcherny'],
    },
    {
      kind: 'track',
      title: '跟踪实现入口',
      description: '继续看 SDK、MCP、subagents、skills 和 GitHub examples 怎样把 loop 从个人使用扩到团队流程。',
      sourceIds: ['impl_claude_code_sdk', 'impl_claude_code_mcp', 'impl_claude_code_subagents', 'impl_claude_code_skills'],
    },
  ],
  relatedLinks: [
    {
      kind: 'person',
      label: 'Boris Cherny',
      href: '/?q=Boris%20Cherny',
      relation: 'signal speaker / product actor',
      sourceIds: ['sig_bcherny_x_workflow_2026_01', 'tx_pragmatic_engineer_bcherny', 'tx_lenny_bcherny'],
    },
    {
      kind: 'org',
      label: 'Anthropic',
      href: '/org/Anthropic',
      relation: 'official docs and implementation owner',
      sourceIds: ['off_claude_code_overview', 'impl_claude_code_action'],
    },
    {
      kind: 'topic',
      label: 'Agent',
      href: '/topic/Agent',
      relation: 'wide topic parent',
      sourceIds: ['paper_react', 'off_claude_code_best_practices'],
    },
    {
      kind: 'thread',
      label: 'Agentic Coding',
      href: '/threads/agentic-coding',
      relation: 'neighbor thread candidate',
      sourceIds: ['off_claude_code_best_practices', 'paper_swe_bench'],
    },
  ],
  companyStrategyContext: {
    title: '公司策略回链',
    description:
      'S1 保留了 6 条 Amazon、Microsoft、Alphabet、NVIDIA 的公司策略候选；它们应进入 org 页或 company_strategy_context，不进入本页 evidence ready 计数。',
    href: '/org/Anthropic',
    sourceIds: ['off_claude_code_overview'],
    candidateCount: 6,
  },
};

const THREADS: Record<string, KnowledgeThreadFixture> = {
  [loopEngineeringThread.slug]: loopEngineeringThread,
};

export function getKnowledgeThreadFixture(slug: string): KnowledgeThreadFixture | null {
  return THREADS[slug] ?? null;
}

function source(input: Omit<KnowledgeThreadSource, 'status'> & { status?: KnowledgeThreadSource['status'] }): KnowledgeThreadSource {
  return {
    status: 'verified',
    ...input,
  };
}

function edge(
  fromSourceId: string,
  toSourceId: string,
  relationType: string,
  confidence: number,
  evidenceNote: string
): KnowledgeThreadEdge {
  return {
    id: `${fromSourceId}--${toSourceId}`,
    fromSourceId,
    toSourceId,
    relationType,
    confidence,
    evidenceNote,
  };
}
