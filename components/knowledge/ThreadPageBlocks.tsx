import Link from 'next/link';
import {
  getThreadPresentationSeed,
  type ThreadPresentation,
} from '@/lib/entity-presentations/thread-presentation';
import type {
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

const ROLE_SOURCE_FALLBACK: Record<KnowledgeSourceRole, string> = {
  signal: '这条来源只作为新鲜信号使用，用来提示主题正在形成，不能独立支撑强判断。',
  official_definition: '这条来源用于确认官方边界，判断产品真正承诺了什么。',
  transcript_context: '这条来源用于补足长语境，解释公开材料里没有展开的动机和使用方式。',
  paper_foundation: '这条来源用于把主题放回研究脉络，判断方法和评测边界。',
  implementation_signal: '这条来源用于确认工程入口，判断这个主题是否能被团队流程复用。',
  company_strategy_context: '这条来源只进入公司页背景，用来解释公司方向，不参与主题页就绪计数。',
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

interface ThreadPageBlocksProps {
  thread: KnowledgeThreadFixture;
}

export function ThreadPageBlocks({ thread }: ThreadPageBlocksProps) {
  const presentation = getThreadPresentation(thread);
  const sourcesById = new Map(thread.sources.map(source => [source.id, source]));
  const roleStats = getRoleStats(thread);
  const coverage = getCoverage(thread, roleStats);

  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-6 sm:px-6">
      <ThreadHero thread={thread} presentation={presentation} />
      <ThreadPageNav />

      <div className="space-y-6">
        <ExplanationBlock presentation={presentation} />
        <KeyMaterialsBlock roleStats={roleStats} presentation={presentation} />
        <ThreadReferenceTier thread={thread} sourcesById={sourcesById} coverage={coverage} />
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
}: {
  thread: KnowledgeThreadFixture;
  presentation: ThreadPresentation;
}) {
  return (
    <section id="overview" className="min-w-0 scroll-mt-24 rounded-lg border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-8">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          知识主题
        </span>
        <span className="text-stone-300">·</span>
        <span>{presentation.subtitle}</span>
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
        {presentation.title}
      </h1>
      <p className="mt-5 max-w-3xl break-words border-l-2 border-orange-300 pl-4 text-base font-medium leading-7 text-stone-900 sm:text-lg">
        {presentation.valueProp}
      </p>
      <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-stone-600">{presentation.whyRead}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
        <span>{thread.sources.length} 条来源</span>
        <span className="text-stone-300">·</span>
        <span>{thread.edges.length} 条互证</span>
        <span className="text-stone-300">·</span>
        <span>最近复核 {formatDate(thread.lastReviewedAt)}</span>
      </div>
    </section>
  );
}

function ThreadPageNav() {
  const items = [
    { href: '#overview', label: '概览' },
    { href: '#content', label: '完整循环' },
    { href: '#evidence', label: '关键材料' },
    { href: '#reference', label: '参考与来源' },
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

function ExplanationBlock({ presentation }: { presentation: ThreadPresentation }) {
  return (
    <section id="content" className="min-w-0 scroll-mt-24 rounded-lg border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
      <div className="mb-4">
        <div className="text-xs font-semibold text-orange-600">核心概念</div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">一个完整循环长什么样</h2>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-500">先看这个主题主张的外层循环怎么转，再去看支撑它的材料。</p>
      </div>
      <p className="max-w-3xl break-words text-sm leading-6 text-stone-700">{presentation.problem}</p>

      <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {presentation.loopSteps.map((step, index) => (
          <li
            key={step.title}
            className="group flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white px-4 py-5 transition-colors hover:border-orange-200 hover:bg-orange-50/30"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-sm font-semibold text-orange-600 ring-1 ring-orange-100">
              {index + 1}
            </span>
            <div className="mt-3 text-sm font-semibold leading-5 text-stone-950">{step.title}</div>
            <p className="mt-1.5 break-words text-xs leading-5 text-stone-600">{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-stone-400">
        <span className="text-sm text-orange-500">↻</span>
        <span>不满足条件就带着新信息回到第 1 步，继续下一轮</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 border-t border-stone-100 pt-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <div className="text-xs font-semibold text-stone-500">一句话定义</div>
          <p className="mt-1 break-words text-sm leading-6 text-stone-800">{presentation.valueProp}</p>
        </div>
        <div>
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
    </section>
  );
}

// 关键材料按角色分组展示：每组配一行「为什么它和这个主题相关」的说明，
// 避免把论文根基（ReAct、SWE-bench 等）混进一张扁平清单后看起来像无关来源。
const MATERIAL_DISPLAY_ORDER: KnowledgeSourceRole[] = [
  'official_definition',
  'implementation_signal',
  'transcript_context',
  'signal',
  'paper_foundation',
];

const ROLE_CAPTION: Record<KnowledgeSourceRole, string> = {
  signal: '提示这个循环正在形成，但不能独立下结论。',
  official_definition: '产品到底支持循环里的哪些动作——最硬的锚点。',
  transcript_context: '补足动机和使用方式，解释为什么这样设计。',
  paper_foundation: '循环背后的推理、工具调用和评测方法（如 ReAct、SWE-bench），是技术根基不是新闻。',
  implementation_signal: '决定这个循环能不能进仓库、CI 和团队流程。',
  company_strategy_context: '公司级背景，不计入主题证据。',
};

const PER_ROLE_MATERIALS = 3;

function KeyMaterialsBlock({
  roleStats,
  presentation,
}: {
  roleStats: RoleStat[];
  presentation: ThreadPresentation;
}) {
  const order = new Map(MATERIAL_DISPLAY_ORDER.map((role, index) => [role, index]));
  const groups = roleStats
    .filter(item => item.role !== 'company_strategy_context' && item.sources.length > 0)
    .sort((a, b) => (order.get(a.role) ?? 99) - (order.get(b.role) ?? 99));
  const total = groups.reduce((sum, stat) => sum + stat.sources.length, 0);
  const shown = groups.reduce((sum, stat) => sum + Math.min(stat.sources.length, PER_ROLE_MATERIALS), 0);
  const hidden = total - shown;

  return (
    <section id="evidence" className="min-w-0 scroll-mt-24 rounded-lg border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
      <SectionHeading
        title="关键材料"
        description="官方定义、工程落地、访谈、一线信号和论文根基互相印证这个循环；每类只保留最该先读的几条。"
      />
      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map(stat => {
            const insight = presentation.roleInsights[stat.role];
            const caption = insight?.body || ROLE_CAPTION[stat.role];
            return (
              <div key={stat.role} className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-orange-100">
                    {ROLE_LABELS[stat.role]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-stone-500">{caption}</span>
                  <span className="text-[11px] text-stone-400">
                    {stat.readyCount}/{stat.sources.length} 条可用
                  </span>
                </div>
                <div className="divide-y divide-stone-100 rounded-lg border border-stone-100 px-4">
                  {stat.sources.slice(0, PER_ROLE_MATERIALS).map(source => (
                    <SourceEvidenceRow key={source.id} source={source} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <ThinNotice text="这个主题还没有足够的可用来源，暂不展开材料清单。" />
      )}
      {hidden > 0 && (
        <p className="mt-4 text-xs leading-5 text-stone-500">
          每类只展开了最靠前的 {PER_ROLE_MATERIALS} 条，另有 {hidden} 条同类来源未展开。
        </p>
      )}
    </section>
  );
}

function ThreadReferenceTier({
  thread,
  sourcesById,
  coverage,
}: ThreadPageBlocksProps & {
  sourcesById: Map<string, KnowledgeThreadSource>;
  coverage: Coverage;
}) {
  return (
    <section id="reference" className="scroll-mt-24 border-t border-stone-200 pt-8">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-stone-500">参考与来源</h2>
        <p className="mt-1 text-xs leading-5 text-stone-400">
          下面是来源之间的互证关系和这页的数据状态，给需要核对来源、判断证据是否够硬的读者。
        </p>
      </div>
      <div className="space-y-5">
        <EdgeList thread={thread} sourcesById={sourcesById} />
        <DataNote thread={thread} coverage={coverage} />
      </div>
    </section>
  );
}

function DataNote({ thread, coverage }: { thread: KnowledgeThreadFixture; coverage: Coverage }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-stone-50 px-5 py-5">
      <SectionHeading title="数据说明" description="这页的来源覆盖与复核状态，仅用于判断证据成熟度。" />
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
        <Metric label="状态" value={THREAD_STATUS_LABELS[thread.status]} />
        <Metric label="可信度" value={`${Math.round(thread.confidence * 100)}%`} />
        <Metric label="来源" value={`${thread.sources.length} 条`} />
        <Metric label="最近复核" value={formatDate(thread.lastReviewedAt)} />
      </dl>
      <p className="mt-4 border-t border-stone-200 pt-4 text-xs leading-5 text-stone-600">
        {coverage.missingRoles.length === 0
          ? '信号、官方材料、访谈、论文和实现入口都已有来源，可以作为可复核主题阅读。'
          : `还缺 ${coverage.missingRoles.map(role => ROLE_LABELS[role]).join('、')}，这页只能作为线索。`}
      </p>
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
                  <div className="mt-1 break-words text-sm font-semibold leading-5 text-stone-950">
                    {from?.title || edge.fromSourceId}
                    <span className="px-2 text-stone-400">关联</span>
                    {to?.title || edge.toSourceId}
                  </div>
                </div>
                <span className="text-xs font-medium text-stone-500">{Math.round(edge.confidence * 100)}%</span>
              </div>
              <p className="mt-2 break-words text-xs leading-5 text-stone-600">{displayEdgeNote(edge.relationType, edge.evidenceNote)}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SourceEvidenceRow({ source, roleLabel }: { source: KnowledgeThreadSource; roleLabel?: string }) {
  const body = displaySourceSummary(source);
  const note = displaySourceNote(source);

  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={source.status} />
            {roleLabel && (
              <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-orange-100">
                {roleLabel}
              </span>
            )}
            {source.publishedAt && <span className="text-[11px] text-stone-400">{formatDate(source.publishedAt)}</span>}
            <span className="text-[11px] text-stone-400">{source.owner}</span>
          </div>
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block break-words text-base font-semibold leading-6 text-stone-950 hover:text-orange-600"
            >
              {source.title}
            </a>
          ) : (
            <h3 className="mt-2 text-base font-semibold leading-6 text-stone-950">{source.title}</h3>
          )}
        </div>
        <span className="text-xs font-medium text-stone-500">{Math.round(source.confidence * 100)}%</span>
      </div>
      <p className="mt-2 break-words text-sm leading-6 text-stone-700">{body}</p>
      {note !== body && <p className="mt-2 break-words text-xs leading-5 text-stone-500">{note}</p>}
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
  const known = getThreadPresentationSeed(thread.slug);
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
    roleInsights: {},
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

function displayEdgeNote(relationType: string, evidenceNote: string): string {
  const fallback = EDGE_LABELS[relationType]
    ? `这条边用于说明“${EDGE_LABELS[relationType]}”这层关系，发布前仍要回到两端来源复核。`
    : '这条边用于说明两个来源怎样互相支撑，发布前仍要回到两端来源复核。';
  return cjkOrFallback(evidenceNote, fallback);
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
