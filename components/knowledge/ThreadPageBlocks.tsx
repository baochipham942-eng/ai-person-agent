import Link from 'next/link';
import type {
  KnowledgeActionKind,
  KnowledgeLinkKind,
  KnowledgeSourceRole,
  KnowledgeThreadFixture,
  KnowledgeThreadSource,
  KnowledgeThreadStatus,
} from '@/lib/knowledge-thread-fixtures/loop-engineering';

const ROLE_ORDER: KnowledgeSourceRole[] = [
  'signal',
  'official_definition',
  'transcript_context',
  'paper_foundation',
  'implementation_signal',
  'company_strategy_context',
];

const ROLE_LABELS: Record<KnowledgeSourceRole, string> = {
  signal: '一线信号',
  official_definition: '官方定义',
  transcript_context: '访谈语境',
  paper_foundation: '论文根基',
  implementation_signal: '工程落地',
  company_strategy_context: '公司背景',
};

const ROLE_DESCRIPTIONS: Record<KnowledgeSourceRole, string> = {
  signal: '人物判断、推文和实践者文章只负责提示方向，不能单独变成结论。',
  official_definition: '官方博客、文档和变更记录负责定义产品边界，是主题页最硬的锚点。',
  transcript_context: '访谈、视频和播客逐字稿补足动机、使用场景和产品哲学。',
  paper_foundation: '论文、评测和方法材料解释这个主题背后的技术约束。',
  implementation_signal: 'SDK、Hooks、MCP、GitHub Action 和示例说明它能不能落到工程流程里。',
  company_strategy_context: '公司级材料只作为机构页背景，不计入技术主题的必备证据。',
};

const ROLE_SOURCE_FALLBACK: Record<KnowledgeSourceRole, string> = {
  signal: '这条来源只作为新鲜信号使用，用来提示主题正在形成，不能独立支撑强判断。',
  official_definition: '这条来源用于确认官方边界，判断产品真正承诺了什么。',
  transcript_context: '这条来源用于补足长语境，解释公开材料里没有展开的动机和使用方式。',
  paper_foundation: '这条来源用于把主题放回研究脉络，判断方法和评测边界。',
  implementation_signal: '这条来源用于确认工程入口，判断这个主题是否能被团队流程复用。',
  company_strategy_context: '这条来源只进入公司页背景，用来解释公司方向，不参与主题页就绪计数。',
};

const ACTION_LABELS: Record<KnowledgeActionKind, string> = {
  read: '阅读',
  try: '试跑',
  watch: '观看',
  track: '跟踪',
};

const ACTION_TITLE_FALLBACK: Record<KnowledgeActionKind, string> = {
  read: '先读官方边界',
  try: '跑一个小闭环',
  watch: '对照长访谈',
  track: '继续跟踪实现入口',
};

const ACTION_DESCRIPTION_FALLBACK: Record<KnowledgeActionKind, string> = {
  read: '先用官方文档和产品说明确定主题边界，再进入论文、访谈和实现材料。',
  try: '挑一个小任务，把计划、执行、检查和反馈跑成一轮，观察这个主题是否真的能落地。',
  watch: '用长访谈补足官方文档没有展开的产品动机和使用者语境。',
  track: '继续跟踪 SDK、示例、集成和公司材料，确认它是否从个人技巧扩展到团队流程。',
};

const LINK_KIND_LABELS: Record<KnowledgeLinkKind, string> = {
  person: '人物',
  org: '公司',
  topic: '宽话题',
  thread: '相邻主题',
};

const LINK_RELATION_FALLBACK: Record<KnowledgeLinkKind, string> = {
  person: '贡献这个主题的一线信号或产品语境。',
  org: '官方材料和工程入口的主要归属。',
  topic: '回到更宽的话题目录，继续看相关人物和动态。',
  thread: '继续阅读相邻知识主题。',
};

const STATUS_LABELS: Record<KnowledgeThreadSource['status'], string> = {
  verified: '已核',
  usable: '可用',
  needs_capture: '待补原文',
  thin: '偏薄',
};

const STATUS_STYLES: Record<KnowledgeThreadSource['status'], string> = {
  verified: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  usable: 'bg-sky-50 text-sky-700 ring-sky-100',
  needs_capture: 'bg-amber-50 text-amber-700 ring-amber-100',
  thin: 'bg-stone-50 text-stone-500 ring-stone-100',
};

const THREAD_STATUS_LABELS: Record<KnowledgeThreadStatus, string> = {
  source_pack_review: '来源包复核中',
  review_ready: '可复核',
  thin: '证据偏薄',
  draft: '草稿',
};

const EDGE_LABELS: Record<string, string> = {
  tweet_keyword_to_official_workflow: '人物信号回到官方工作流',
  agent_loop_to_reason_action_foundation: '产品实践回到推理行动框架',
  tool_use_to_tool_call_foundation: '工具调用回到方法根基',
  coding_loop_to_eval_benchmark: '开发循环回到真实评测',
  agent_runtime_to_tool_integration: '运行时接到外部工具',
  reference_to_workflow_example: '参考文档接到工作流示例',
  workflow_decomposition: '工作流拆解',
  example_to_implementation: '示例证明实现路径',
};

const COPY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bsource pack review\b/gi, '来源包复核中'],
  [/\breview ready\b/gi, '可复核'],
  [/\bsource pack\b/gi, '来源包'],
  [/\btopic candidates\b/gi, '候选来源'],
  [/\btranscript\b/gi, '逐字稿'],
  [/\bcompany strategy context\b/gi, '公司策略背景'],
  [/\bcompany strategy\b/gi, '公司策略'],
  [/\bready\b/gi, '就绪'],
  [/\bworkflow\b/gi, '工作流'],
  [/\bworkflows\b/gi, '工作流'],
  [/\bagentic coding\b/gi, '智能体写代码'],
  [/\bcoding agent\b/gi, '代码智能体'],
  [/\bcoding-agent\b/gi, '代码智能体'],
  [/\bagents\b/gi, '智能体'],
  [/\bagent\b/gi, '智能体'],
  [/\btweet\b/gi, '推文'],
  [/\bdocs\b/gi, '文档'],
  [/\bearnings call\b/gi, '业绩电话会'],
  [/\bIR\b/g, '投资者关系材料'],
  [/\bloops\b/gi, '循环'],
  [/\bloop\b/gi, '循环'],
  [/\breview\/materialize dry-run\b/gi, '复核和入库 dry-run'],
];

interface ThreadPresentation {
  title: string;
  subtitle: string;
  valueProp: string;
  problem: string;
  whyRead: string;
  mainTakeaway: string;
  loopSteps: Array<{
    title: string;
    body: string;
  }>;
  readerCanJudge: string[];
  readingPath: string[];
}

const THREAD_PRESENTATION: Record<string, ThreadPresentation> = {
  'loop-engineering': {
    title: 'Loop Engineering',
    subtitle: '循环工程',
    valueProp: '把 AI 写代码从一次提示，变成可复盘的计划、执行、验证和反馈循环。',
    problem:
      '真实开发不是让模型一次性吐出代码，而是反复让它理解仓库、形成计划、调用工具、修改文件、跑检查，再把结果带回下一轮。Loop Engineering 关心的就是这个循环能不能被设计、复用和交给团队协作。',
    whyRead:
      'Boris Cherny 的公开信号只是入口。真正有价值的是把 Claude Code 官方文档、长访谈、论文和工程实现串起来，看这个工作流为什么成立。',
    mainTakeaway:
      '判断一个代码智能体产品，不能只看发布推文。要看它是否能承载稳定的循环：上下文、工具调用、检查、回写和复盘。',
    loopSteps: [
      { title: '理解上下文', body: '把仓库、任务、约束和已有代码带进同一个工作空间。' },
      { title: '形成计划', body: '先拆任务和风险，再决定由主智能体、子智能体或工具完成哪一段。' },
      { title: '执行修改', body: '通过 CLI、SDK、MCP、Hooks 或 GitHub Action 进入真实工程表面。' },
      { title: '运行验证', body: '用测试、lint、构建、review 和人工反馈检查输出是否可靠。' },
      { title: '回写下一轮', body: '把失败、偏差和新证据带回上下文，继续推进下一次循环。' },
    ],
    readerCanJudge: [
      '某个代码智能体产品是不是只会生成代码，还是能承载完整开发循环。',
      '官方文档、访谈、论文和实现入口之间是否互相支撑。',
      '一个团队能不能把个人使用技巧沉淀成可复用的工程工作流。',
    ],
    readingPath: [
      '先看官方材料，确认 Claude Code 和工作流边界。',
      '再看 Boris 长访谈，理解为什么团队会把价值放在可定制工作流上。',
      '最后回到论文和实现入口，判断循环能不能被工程化、复用和接入团队流程。',
    ],
  },
  'agentic-coding': {
    title: 'Agentic Coding',
    subtitle: '智能体写代码',
    valueProp: '从代码补全走向能理解仓库、调用工具、修改文件并接受验证的开发流程。',
    problem:
      '这个主题关心 AI 写代码能力怎样从补全片段，进入真实仓库、真实 issue、真实工具和真实验证。',
    whyRead:
      '这个主题把模型能力、官方产品、评测论文和工程入口放在同一张证据图里，避免只看单个产品发布。',
    mainTakeaway:
      'Agentic Coding 的价值不在“生成更多代码”，而在它能不能围绕真实仓库任务形成可检查、可追踪、可复用的开发循环。',
    loopSteps: [
      { title: '理解任务', body: '读取仓库、issue、上下文和约束。' },
      { title: '调用工具', body: '让模型通过工具进入文件、终端、搜索和外部服务。' },
      { title: '修改代码', body: '在真实工程里生成、编辑和组织变更。' },
      { title: '接受验证', body: '用测试、benchmark、review 和用户反馈判断结果。' },
      { title: '沉淀流程', body: '把能复用的动作变成团队工作流。' },
    ],
    readerCanJudge: [
      '产品是否真的覆盖真实开发任务，而不是只展示 demo。',
      '论文评测和产品实现是否对得上。',
      '团队能否把它接进现有研发流程。',
    ],
    readingPath: [
      '先看官方定义，确认产品到底覆盖哪些开发动作。',
      '再看论文和评测，理解为什么真实仓库任务比玩具示例重要。',
      '最后看 CLI、SDK 和自动化入口，判断它能否进入实际团队流程。',
    ],
  },
};

interface ThreadPageBlocksProps {
  thread: KnowledgeThreadFixture;
}

export function ThreadPageBlocks({ thread }: ThreadPageBlocksProps) {
  const presentation = getThreadPresentation(thread);
  const sourcesById = new Map(thread.sources.map(source => [source.id, source]));
  const roleStats = getRoleStats(thread);
  const coverage = getCoverage(thread, roleStats);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <ThreadHero thread={thread} presentation={presentation} coverage={coverage} />
      <ThreadPageNav />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          <NarrativeBlock presentation={presentation} />
          <EvidenceChainBlock roleStats={roleStats} />
          <RoleEvidenceSections roleStats={roleStats} />
          <SourceMapBlock thread={thread} sourcesById={sourcesById} />
          <ActionCards thread={thread} sourcesById={sourcesById} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20">
          <ReadinessPanel thread={thread} coverage={coverage} />
          <RelatedEntryPoints thread={thread} sourcesById={sourcesById} />
          <SourceInventory thread={thread} />
        </aside>
      </div>
    </main>
  );
}

export function MissingThreadState({ slug }: { slug: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-5 text-amber-900 shadow-sm">
        <div className="text-xs font-semibold text-amber-700">证据偏薄</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-stone-950">证据包还没准备好</h1>
        <p className="mt-3 text-sm leading-6">
          <span className="font-medium">{slug}</span> 还没有达到知识主题页的最低证据覆盖。页面不会渲染成可复核状态，也不会给出无来源的强判断。
        </p>
        <Link
          href="/"
          prefetch={false}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-stone-900 px-3 text-xs font-medium text-white transition-colors hover:bg-orange-600"
        >
          回到人物库
        </Link>
      </section>
    </main>
  );
}

function ThreadHero({
  thread,
  presentation,
  coverage,
}: {
  thread: KnowledgeThreadFixture;
  presentation: ThreadPresentation;
  coverage: Coverage;
}) {
  return (
    <section id="overview" className="scroll-mt-24 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <span>知识主题</span>
            <span className="text-stone-300">/</span>
            <span>{presentation.subtitle}</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-stone-950 sm:text-4xl">
            {presentation.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-stone-800">{presentation.valueProp}</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">{presentation.whyRead}</p>
        </div>

        <div className="border-t border-stone-200 bg-stone-50 px-5 py-5 lg:border-l lg:border-t-0">
          <div className="text-sm font-semibold text-stone-950">主题状态</div>
          <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3">
            <Metric label="状态" value={THREAD_STATUS_LABELS[thread.status]} />
            <Metric label="可信度" value={`${Math.round(thread.confidence * 100)}%`} />
            <Metric label="来源" value={`${thread.sources.length} 条`} />
            <Metric label="关联" value={`${thread.edges.length} 条`} />
            <Metric label="最近复核" value={formatDate(thread.lastReviewedAt)} wide />
          </dl>
          <div className="mt-4 border-t border-stone-200 pt-4 text-xs leading-5 text-stone-600">
            {coverage.missingRoles.length === 0
              ? '信号、官方材料、访谈、论文和实现入口都已有来源，可以继续往下读。'
              : `还缺 ${coverage.missingRoles.map(role => ROLE_LABELS[role]).join('、')}，这页只能作为线索。`}
          </div>
        </div>
      </div>
    </section>
  );
}

function ThreadPageNav() {
  const items = [
    { href: '#overview', label: '概览' },
    { href: '#content', label: '主题内容' },
    { href: '#evidence', label: '相关来源' },
    { href: '#actions', label: '行动入口' },
  ];

  return (
    <nav
      aria-label="主题页导航"
      className="flex min-w-0 items-center gap-2 overflow-x-auto rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm shadow-sm"
    >
      {items.map(item => (
        <a
          key={item.href}
          href={item.href}
          className="flex-shrink-0 rounded-md px-3 py-1.5 font-medium text-stone-600 transition-colors hover:bg-orange-50 hover:text-orange-700"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function NarrativeBlock({ presentation }: { presentation: ThreadPresentation }) {
  return (
    <section id="content" className="scroll-mt-24 rounded-lg border border-stone-200 bg-white px-5 py-5 shadow-sm sm:px-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div>
          <SectionHeading title="这个主题在讲什么" />
          <p className="text-sm leading-6 text-stone-700">{presentation.problem}</p>
          <div className="mt-5 border-t border-stone-100 pt-4">
            <div className="text-xs font-semibold text-stone-500">一句话定义</div>
            <p className="mt-1 text-sm leading-6 text-stone-800">{presentation.valueProp}</p>
          </div>
          <div className="mt-5 border-t border-stone-100 pt-4">
            <div className="text-xs font-semibold text-stone-500">你能用它判断什么</div>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-stone-700">
              {presentation.readerCanJudge.map(item => (
                <li key={item} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-orange-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-100 pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <SectionHeading title="一个完整循环长什么样" />
          <div className="divide-y divide-stone-100 rounded-lg border border-stone-100">
            {presentation.loopSteps.map((step, index) => (
              <div key={step.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 px-3 py-3">
                <span className="pt-0.5 text-xs font-semibold text-orange-600">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <div className="text-sm font-semibold text-stone-950">{step.title}</div>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-stone-100 pt-4">
            <SectionHeading title="阅读路径" />
            <ol className="space-y-3">
              {presentation.readingPath.map((item, index) => (
                <li key={item} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="pt-0.5 text-sm leading-6 text-stone-700">{item}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function EvidenceChainBlock({ roleStats }: { roleStats: RoleStat[] }) {
  return (
    <section id="evidence" className="scroll-mt-24">
      <SectionHeading
        title="来源依据"
        description="读懂主题后，再看这些来源分别承担什么证据责任。"
      />
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 shadow-sm md:grid-cols-5">
        {roleStats
          .filter(item => item.role !== 'company_strategy_context')
          .map((item, index) => {
            const leadSource = item.sources[0];
            return (
              <article key={item.role} className="bg-white px-4 py-4">
                <div className="text-xs font-semibold text-orange-600">{String(index + 1).padStart(2, '0')}</div>
                <h2 className="mt-2 text-sm font-semibold text-stone-950">{ROLE_LABELS[item.role]}</h2>
                <p className="mt-2 min-h-16 text-xs leading-5 text-stone-500">{ROLE_DESCRIPTIONS[item.role]}</p>
                <div className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
                  <span className="font-medium text-stone-950">{item.readyCount}</span>
                  <span> / {item.sources.length} 条可用</span>
                </div>
                {leadSource && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-700">
                    代表来源：{leadSource.title}
                  </p>
                )}
              </article>
            );
          })}
      </div>
    </section>
  );
}

function RoleEvidenceSections({ roleStats }: { roleStats: RoleStat[] }) {
  return (
    <div className="space-y-5">
      {roleStats
        .filter(item => item.role !== 'company_strategy_context')
        .map(item => {
          const visibleSources = item.sources.slice(0, 3);
          const hiddenCount = Math.max(item.sources.length - visibleSources.length, 0);
          return (
            <section key={item.role} className="rounded-lg border border-stone-200 bg-white px-5 py-5 shadow-sm sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <SectionHeading title={ROLE_LABELS[item.role]} description={ROLE_DESCRIPTIONS[item.role]} />
                </div>
                <div className="rounded-md bg-stone-50 px-3 py-2 text-xs text-stone-500">
                  <span className="font-semibold text-stone-950">{item.readyCount}</span>
                  <span> / {item.sources.length} 条可用</span>
                </div>
              </div>

              {visibleSources.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {visibleSources.map(source => (
                    <SourceEvidenceRow key={source.id} source={source} />
                  ))}
                </div>
              ) : (
                <ThinNotice text="这类证据还没进入样板，不能标为可复核。" />
              )}

              {hiddenCount > 0 && (
                <p className="mt-4 text-xs leading-5 text-stone-500">
                  另有 {hiddenCount} 条同类来源放在右侧来源清单里，主阅读区只展示最能支撑判断的几条。
                </p>
              )}
            </section>
          );
        })}
    </div>
  );
}

function SourceMapBlock({
  thread,
  sourcesById,
}: ThreadPageBlocksProps & { sourcesById: Map<string, KnowledgeThreadSource> }) {
  return (
    <section id="map" className="scroll-mt-24 space-y-5">
      <TimelineBlock thread={thread} sourcesById={sourcesById} />
      <EdgeList thread={thread} sourcesById={sourcesById} />
    </section>
  );
}

function TimelineBlock({
  thread,
  sourcesById,
}: ThreadPageBlocksProps & { sourcesById: Map<string, KnowledgeThreadSource> }) {
  if (thread.timeline.length === 0) return null;

  return (
    <section className="rounded-lg border border-stone-200 bg-white px-5 py-5 shadow-sm sm:px-6">
      <SectionHeading title="时间线" description="时间线只展示能回到来源的节点。" />
      <ol className="space-y-3">
        {thread.timeline.map(item => (
          <li key={`${item.date}-${item.label}`} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-3 text-sm">
            <time className="pt-0.5 text-xs font-medium text-stone-500">{item.date}</time>
            <div className="border-l border-stone-200 pl-3">
              <div className="font-medium leading-5 text-stone-950">{cleanMixedCopy(item.label)}</div>
              <p className="mt-1 text-xs leading-5 text-stone-500">{cleanMixedCopy(item.note)}</p>
              <SourceRefs sourceIds={item.sourceIds} sourcesById={sourcesById} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EdgeList({
  thread,
  sourcesById,
}: ThreadPageBlocksProps & { sourcesById: Map<string, KnowledgeThreadSource> }) {
  if (thread.edges.length === 0) return null;

  return (
    <section className="rounded-lg border border-stone-200 bg-white px-5 py-5 shadow-sm sm:px-6">
      <SectionHeading
        title="来源互证"
        description="关联边说明两个来源怎样互相支撑，避免把“相关”误当“证明”。"
      />
      <div className="divide-y divide-stone-100">
        {thread.edges.slice(0, 8).map(edge => {
          const from = sourcesById.get(edge.fromSourceId);
          const to = sourcesById.get(edge.toSourceId);

          return (
            <article key={edge.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-orange-600">
                    {EDGE_LABELS[edge.relationType] || '来源互证'}
                  </div>
                  <div className="mt-1 text-sm font-semibold leading-5 text-stone-950">
                    {from?.title || edge.fromSourceId}
                    <span className="px-2 text-stone-400">关联</span>
                    {to?.title || edge.toSourceId}
                  </div>
                </div>
                <span className="text-xs font-medium text-stone-500">{Math.round(edge.confidence * 100)}%</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-stone-600">{displayEdgeNote(edge.relationType, edge.evidenceNote)}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ActionCards({
  thread,
  sourcesById,
}: ThreadPageBlocksProps & { sourcesById: Map<string, KnowledgeThreadSource> }) {
  if (thread.actions.length === 0) return null;

  return (
    <section id="actions" className="scroll-mt-24 rounded-lg border border-stone-200 bg-white px-5 py-5 shadow-sm sm:px-6">
      <SectionHeading title="行动入口" description="读完主题后，下一步应该能继续读、试、看或跟踪，并且每条都能回到来源。" />
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 md:grid-cols-2">
        {thread.actions.map(action => (
          <article key={`${action.kind}-${action.title}`} className="bg-white px-4 py-4">
            <div className="text-xs font-semibold text-orange-600">{ACTION_LABELS[action.kind]}</div>
            <h2 className="mt-2 text-sm font-semibold text-stone-950">
              {displayActionTitle(action.kind, action.title)}
            </h2>
            <p className="mt-2 text-xs leading-5 text-stone-600">
              {displayActionDescription(action.kind, action.description)}
            </p>
            <SourceRefs sourceIds={action.sourceIds} sourcesById={sourcesById} />
          </article>
        ))}
      </div>
    </section>
  );
}

function ReadinessPanel({ thread, coverage }: ThreadPageBlocksProps & { coverage: Coverage }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm">
      <SectionHeading title="快速判断" />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Metric label="状态" value={THREAD_STATUS_LABELS[thread.status]} />
        <Metric label="可信度" value={`${Math.round(thread.confidence * 100)}%`} />
        <Metric label="来源" value={`${thread.sources.length} 条`} />
        <Metric label="关联" value={`${thread.edges.length} 条`} />
      </dl>
      <p className="mt-4 border-t border-stone-100 pt-4 text-xs leading-5 text-stone-600">
        {getReadinessCopy(coverage)}
      </p>
      {coverage.missingRoles.length > 0 && (
        <p className="mt-2 text-xs leading-5 text-amber-700">
          缺口：{coverage.missingRoles.map(role => ROLE_LABELS[role]).join('、')}
        </p>
      )}
    </section>
  );
}

function RelatedEntryPoints({
  thread,
  sourcesById,
}: ThreadPageBlocksProps & { sourcesById: Map<string, KnowledgeThreadSource> }) {
  if (thread.relatedLinks.length === 0) return null;

  return (
    <section className="rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm">
      <SectionHeading title="相关入口" description="把主题接回人物、公司、宽话题和相邻主题。" />
      <div className="space-y-2">
        {thread.relatedLinks.map(link => (
          <Link
            key={`${link.kind}-${link.label}`}
            href={link.href}
            prefetch={false}
            className="block rounded-md border border-stone-100 bg-stone-50 px-3 py-3 transition-colors hover:border-orange-200 hover:bg-orange-50/70"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-stone-500">{LINK_KIND_LABELS[link.kind]}</span>
              <span className="text-[11px] text-stone-400">{link.sourceIds.length} 条来源</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-stone-950">{link.label}</div>
            <div className="mt-1 text-xs leading-5 text-stone-500">
              {displayLinkRelation(link.kind, link.relation)}
            </div>
            <SourceRefs sourceIds={link.sourceIds.slice(0, 2)} sourcesById={sourcesById} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function SourceInventory({ thread }: ThreadPageBlocksProps) {
  const grouped = getAllRoleGroups(thread);

  return (
    <section className="rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm">
      <SectionHeading title="来源清单" description="完整来源放在侧栏，主线阅读区只展示关键证据。" />
      <div className="max-h-[34rem] space-y-4 overflow-y-auto pr-1">
        {grouped.map(group => (
          <div key={group.role}>
            <div className="mb-2 text-xs font-semibold text-stone-500">{ROLE_LABELS[group.role]}</div>
            <div className="space-y-2">
              {group.sources.map(source => (
                <SourceInventoryRow key={source.id} source={source} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SourceEvidenceRow({ source }: { source: KnowledgeThreadSource }) {
  const body = displaySourceSummary(source);
  const note = displaySourceNote(source);

  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={source.status} />
            {source.publishedAt && <span className="text-[11px] text-stone-400">{formatDate(source.publishedAt)}</span>}
            <span className="text-[11px] text-stone-400">{source.owner}</span>
          </div>
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-base font-semibold leading-6 text-stone-950 hover:text-orange-600"
            >
              {source.title}
            </a>
          ) : (
            <h3 className="mt-2 text-base font-semibold leading-6 text-stone-950">{source.title}</h3>
          )}
        </div>
        <span className="text-xs font-medium text-stone-500">{Math.round(source.confidence * 100)}%</span>
      </div>
  <p className="mt-2 text-sm leading-6 text-stone-700">{body}</p>
      {note !== body && <p className="mt-2 text-xs leading-5 text-stone-500">{note}</p>}
    </article>
  );
}

function SourceInventoryRow({ source }: { source: KnowledgeThreadSource }) {
  const title = source.url ? (
    <a href={source.url} target="_blank" rel="noreferrer" className="hover:text-orange-600">
      {source.title}
    </a>
  ) : (
    source.title
  );

  return (
    <article className="rounded-md border border-stone-100 bg-stone-50 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill status={source.status} />
        <span className="text-[11px] text-stone-400">{source.owner}</span>
      </div>
      <div className="mt-1 text-xs font-medium leading-5 text-stone-900">{title}</div>
    </article>
  );
}

function Metric({ label, value, wide = false }: { label: string; value: string | number; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-xs text-stone-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-stone-950">{value}</dd>
    </div>
  );
}

function SourceRefs({
  sourceIds,
  sourcesById,
}: {
  sourceIds: string[];
  sourcesById: Map<string, KnowledgeThreadSource>;
}) {
  const sources = sourceIds.map(sourceId => sourcesById.get(sourceId)).filter(Boolean) as KnowledgeThreadSource[];
  if (sources.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map(source => (
        <RolePill key={source.id} role={source.role} label={source.title} />
      ))}
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-stone-950">{title}</h2>
      {description && <p className="mt-1 text-xs leading-5 text-stone-500">{description}</p>}
    </div>
  );
}

function ThinNotice({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
      {text}
    </div>
  );
}

function RolePill({ role, label = ROLE_LABELS[role] }: { role: KnowledgeSourceRole; label?: string }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
      <span className="truncate">{label}</span>
    </span>
  );
}

function StatusPill({ status }: { status: KnowledgeThreadSource['status'] }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

interface RoleStat {
  role: KnowledgeSourceRole;
  sources: KnowledgeThreadSource[];
  readyCount: number;
}

interface Coverage {
  missingRoles: KnowledgeSourceRole[];
}

function getThreadPresentation(thread: KnowledgeThreadFixture): ThreadPresentation {
  const known = THREAD_PRESENTATION[thread.slug];
  if (known) return known;

  return {
    title: thread.title,
    subtitle: '技术主题',
    valueProp: cjkOrFallback(thread.summary, `围绕 ${thread.title} 聚合人物信号、官方材料、论文和工程入口。`),
    problem: cjkOrFallback(
      thread.whyNow || thread.summary,
      `${thread.title} 的价值不在单条新闻或单个观点，而在它能不能被官方材料、长语境、论文和实现入口共同支撑。`
    ),
    whyRead: cjkOrFallback(thread.whyNow, '这个主题页把分散来源串成一条可复核的证据链，帮助判断它是否值得继续跟踪。'),
    mainTakeaway: cjkOrFallback(
      thread.summary,
      `判断 ${thread.title} 的价值，要看信号、官方定义、长语境、论文根基和工程实现是否互相支撑。`
    ),
    loopSteps: [
      { title: '看到信号', body: '先识别人物、产品或社区里正在形成的新判断。' },
      { title: '回到官方', body: '用官方材料确认概念边界和产品承诺。' },
      { title: '补足语境', body: '用访谈、视频或长文理解为什么这个主题会被重视。' },
      { title: '对照研究', body: '用论文和评测确认方法根基与限制。' },
      { title: '检查落地', body: '用代码、SDK、案例和工具入口判断它能不能被实际使用。' },
    ],
    readerCanJudge: [
      '这个主题是不是只有热度，还是已经有稳定证据支撑。',
      '不同来源之间是否能互相解释，而不是各说各话。',
      '它是否值得继续进入人物页、公司页或产品机会分析。',
    ],
    readingPath: [
      '先看官方定义，确认概念边界。',
      '再看长语境和论文，理解这个主题为什么成立。',
      '最后看实现入口，判断它是否能进入真实工作流。',
    ],
  };
}

function getRoleStats(thread: KnowledgeThreadFixture): RoleStat[] {
  const roles = uniqueRoles([...thread.requiredRoles, ...ROLE_ORDER.filter(role => thread.sources.some(source => source.role === role))]);
  return roles.map(role => {
    const sources = thread.sources
      .filter(source => source.role === role)
      .sort(compareSourcesForReading);
    return {
      role,
      sources,
      readyCount: sources.filter(isCoverageReadySource).length,
    };
  });
}

function getAllRoleGroups(thread: KnowledgeThreadFixture): RoleStat[] {
  return ROLE_ORDER
    .map(role => {
      const sources = thread.sources.filter(source => source.role === role).sort(compareSourcesForReading);
      return {
        role,
        sources,
        readyCount: sources.filter(isCoverageReadySource).length,
      };
    })
    .filter(group => group.sources.length > 0);
}

function getCoverage(thread: KnowledgeThreadFixture, roleStats: RoleStat[]): Coverage {
  const readyByRole = new Map(roleStats.map(stat => [stat.role, stat.readyCount]));
  const missingRoles = thread.requiredRoles.filter(role => (readyByRole.get(role) || 0) === 0);
  return { missingRoles };
}

function compareSourcesForReading(left: KnowledgeThreadSource, right: KnowledgeThreadSource): number {
  const statusDelta = sourceStatusRank(right.status) - sourceStatusRank(left.status);
  if (statusDelta !== 0) return statusDelta;
  const confidenceDelta = right.confidence - left.confidence;
  if (confidenceDelta !== 0) return confidenceDelta;
  return String(right.publishedAt || '').localeCompare(String(left.publishedAt || ''));
}

function sourceStatusRank(status: KnowledgeThreadSource['status']): number {
  return {
    verified: 4,
    usable: 3,
    needs_capture: 2,
    thin: 1,
  }[status];
}

function isCoverageReadySource(source: KnowledgeThreadSource): boolean {
  return source.status === 'verified' || source.status === 'usable';
}

function uniqueRoles(values: KnowledgeSourceRole[]): KnowledgeSourceRole[] {
  const seen = new Set<KnowledgeSourceRole>();
  const result: KnowledgeSourceRole[] = [];
  for (const role of values) {
    if (seen.has(role)) continue;
    seen.add(role);
    result.push(role);
  }
  return result;
}

function displaySourceSummary(source: KnowledgeThreadSource): string {
  return cjkOrFallback(source.summary, ROLE_SOURCE_FALLBACK[source.role]);
}

function displaySourceNote(source: KnowledgeThreadSource): string {
  return cjkOrFallback(source.evidenceNote, ROLE_SOURCE_FALLBACK[source.role]);
}

function displayActionTitle(kind: KnowledgeActionKind, title: string): string {
  return cjkOrFallback(title, ACTION_TITLE_FALLBACK[kind]);
}

function displayActionDescription(kind: KnowledgeActionKind, description: string): string {
  return cjkOrFallback(description, ACTION_DESCRIPTION_FALLBACK[kind]);
}

function displayLinkRelation(kind: KnowledgeLinkKind, relation: string): string {
  return cjkOrFallback(relation, LINK_RELATION_FALLBACK[kind]);
}

function displayEdgeNote(relationType: string, evidenceNote: string): string {
  const fallback = EDGE_LABELS[relationType]
    ? `这条边用于说明“${EDGE_LABELS[relationType]}”这层关系，发布前仍要回到两端来源复核。`
    : '这条边用于说明两个来源怎样互相支撑，发布前仍要回到两端来源复核。';
  return cjkOrFallback(evidenceNote, fallback);
}

function getReadinessCopy(coverage: Coverage): string {
  if (coverage.missingRoles.length > 0) {
    return '这页还只是线索页，缺口补齐前不应该下强结论。';
  }
  return '这页已经覆盖一线信号、官方定义、访谈语境、论文根基和工程落地，适合按阅读路径继续判断主题是否成立。';
}

function cjkOrFallback(value: string | null | undefined, fallback: string): string {
  const cleaned = cleanMixedCopy(value || '');
  return isChineseReadable(cleaned) ? cleaned : fallback;
}

function cleanMixedCopy(value: string): string {
  let next = value.trim();
  for (const [pattern, replacement] of COPY_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

function hasCjk(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

function isChineseReadable(value: string): boolean {
  if (!hasCjk(value)) return false;
  const cjkCount = (value.match(/[\u3400-\u9fff]/g) || []).length;
  const latinCount = (value.match(/[A-Za-z]/g) || []).length;
  return cjkCount >= 8 && cjkCount >= latinCount * 0.35;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}
