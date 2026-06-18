import Link from 'next/link';
import type {
  KnowledgeActionKind,
  KnowledgeSourceRole,
  KnowledgeThreadFixture,
  KnowledgeThreadSource,
} from '@/lib/knowledge-thread-fixtures/loop-engineering';

const ROLE_LABELS: Record<KnowledgeSourceRole, string> = {
  signal: 'Signal',
  official_definition: 'Official definition',
  transcript_context: 'Transcript context',
  paper_foundation: 'Paper foundation',
  implementation_signal: 'Implementation signal',
  company_strategy_context: 'Company strategy context',
};

const ROLE_DESCRIPTIONS: Record<KnowledgeSourceRole, string> = {
  signal: '新鲜术语、人物判断和早期线索，只能提示方向。',
  official_definition: '官方博客、文档和 changelog，负责定义和产品边界。',
  transcript_context: '访谈、视频或 podcast 字幕，负责长解释和背景动机。',
  paper_foundation: '论文、benchmark 和方法根基，解释技术约束。',
  implementation_signal: 'GitHub、examples 和集成入口，说明工程落地。',
  company_strategy_context: '公司页回链，说明机构策略，不计入主题页 ready。',
};

const ACTION_LABELS: Record<KnowledgeActionKind, string> = {
  read: 'Read',
  try: 'Try',
  watch: 'Watch',
  track: 'Track',
};

interface ThreadPageBlocksProps {
  thread: KnowledgeThreadFixture;
}

export function ThreadPageBlocks({ thread }: ThreadPageBlocksProps) {
  const sourcesById = new Map(thread.sources.map(source => [source.id, source]));
  const coverage = getCoverage(thread);

  return (
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6">
      <ThreadHero thread={thread} coverage={coverage} />

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-7">
          <DefinitionBlock thread={thread} />
          <EvidenceMap thread={thread} />
          <TimelineBlock thread={thread} sourcesById={sourcesById} />
          <EdgeList thread={thread} sourcesById={sourcesById} />
        </div>

        <aside className="space-y-7">
          <RelatedEntryPoints thread={thread} sourcesById={sourcesById} />
          <SourceList thread={thread} />
          <ActionCards thread={thread} sourcesById={sourcesById} />
          {thread.companyStrategyContext && (
            <CompanyStrategyContext thread={thread} sourcesById={sourcesById} />
          )}
        </aside>
      </div>
    </main>
  );
}

export function MissingThreadState({ slug }: { slug: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-5 text-amber-900 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-normal text-amber-700">Thin thread</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-stone-950">证据包还没准备好</h1>
        <p className="mt-3 text-sm leading-6">
          <span className="font-medium">{slug}</span> 还没有达到知识主题页的最低证据覆盖。页面不会渲染成 ready 状态，也不会给出无来源的强判断。
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
  coverage,
}: {
  thread: KnowledgeThreadFixture;
  coverage: ReturnType<typeof getCoverage>;
}) {
  const isReady = thread.status === 'review_ready' && coverage.missingRoles.length === 0;
  const readinessLabel = isReady
    ? 'Review ready'
    : thread.status === 'source_pack_review'
      ? 'Source pack review'
      : 'Thin';

  return (
    <section className="rounded-lg border border-stone-200 bg-white px-5 py-5 shadow-sm sm:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-normal text-orange-600">Knowledge thread</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-stone-950 sm:text-3xl">{thread.title}</h1>
          <p className="mt-3 text-sm leading-6 text-stone-700">{thread.summary}</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">{thread.whyNow}</p>
        </div>

        <div className="min-w-0 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-xs leading-5 text-stone-600 lg:w-72">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-stone-950">Readiness</span>
            <span className={isReady ? 'text-emerald-700' : 'text-amber-700'}>
              {readinessLabel}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            <MetaRow label="Confidence" value={`${Math.round(thread.confidence * 100)}%`} />
            <MetaRow label="Reviewed" value={formatDate(thread.lastReviewedAt)} />
            <MetaRow label="Sources" value={thread.sources.length} />
            <MetaRow label="Edges" value={thread.edges.length} />
          </div>
          <p className="mt-3 border-t border-stone-200 pt-3">{thread.readinessNote}</p>
          {coverage.missingRoles.length > 0 && (
            <p className="mt-2 text-amber-700">
              Missing roles: {coverage.missingRoles.map(role => ROLE_LABELS[role]).join(', ')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <span className="text-stone-400">{label}</span>
      <span className="text-right font-medium text-stone-900">{value}</span>
    </>
  );
}

function DefinitionBlock({ thread }: ThreadPageBlocksProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5">
      <SectionHeading
        title="Concept definition"
        description="知识主题页先定义概念，再展示证据，避免把信号当结论。"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs font-medium text-stone-500">定义</div>
          <p className="mt-1 text-sm leading-6 text-stone-800">{thread.definition}</p>
        </div>
        <div>
          <div className="text-xs font-medium text-stone-500">边界</div>
          <p className="mt-1 text-sm leading-6 text-stone-800">{thread.boundary}</p>
        </div>
      </div>
    </section>
  );
}

function EvidenceMap({ thread }: ThreadPageBlocksProps) {
  return (
    <section>
      <SectionHeading
        title="Evidence map"
        description="每类来源承担不同角色，强判断优先回绑官方材料、长解释、论文根基和工程实现。"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {thread.requiredRoles.map(role => {
          const sources = thread.sources.filter(source => source.role === role);
          const readyCount = sources.filter(isCoverageReadySource).length;

          return (
            <article key={role} className="rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-stone-950">{ROLE_LABELS[role]}</h2>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
                <span className={readyCount > 0 ? 'text-xs text-emerald-700' : 'text-xs text-amber-700'}>
                  {readyCount}/{sources.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {sources.length > 0 ? (
                  sources.map(source => <SourceMiniRow key={source.id} source={source} />)
                ) : (
                  <ThinNotice text="这类证据还没进入样板，不能标为 ready。" />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TimelineBlock({
  thread,
  sourcesById,
}: ThreadPageBlocksProps & { sourcesById: Map<string, KnowledgeThreadSource> }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5">
      <SectionHeading title="Timeline" description="时间线只展示能回到来源的节点。" />
      <ol className="space-y-3">
        {thread.timeline.map(item => (
          <li key={`${item.date}-${item.label}`} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 text-sm">
            <time className="pt-0.5 text-xs font-medium text-stone-500">{item.date}</time>
            <div className="border-l border-stone-200 pl-3">
              <div className="font-medium leading-5 text-stone-950">{item.label}</div>
              <p className="mt-1 text-xs leading-5 text-stone-500">{item.note}</p>
              <SourceRefs sourceIds={item.sourceIds} sourcesById={sourcesById} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SourceList({ thread }: ThreadPageBlocksProps) {
  return (
    <section>
      <SectionHeading title="Sources" description="侧栏保留来源角色、状态和外链。" />
      <div className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        {thread.sources.map(source => (
          <article key={source.id} className="px-3 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <RolePill role={source.role} />
              <StatusPill status={source.status} />
            </div>
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-sm font-medium leading-5 text-stone-950 hover:text-orange-600"
              >
                {source.title}
              </a>
            ) : (
              <div className="mt-2 text-sm font-medium leading-5 text-stone-950">{source.title}</div>
            )}
            <p className="mt-1 text-xs leading-5 text-stone-500">{source.owner}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function EdgeList({
  thread,
  sourcesById,
}: ThreadPageBlocksProps & { sourcesById: Map<string, KnowledgeThreadSource> }) {
  return (
    <section>
      <SectionHeading
        title="Cross-source edges"
        description="关联边说明为什么两个来源能互相印证，不能只写相关。"
      />
      <div className="space-y-3">
        {thread.edges.map(edge => {
          const from = sourcesById.get(edge.fromSourceId);
          const to = sourcesById.get(edge.toSourceId);

          return (
            <article key={edge.id} className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-normal text-orange-600">{edge.relationType}</div>
                  <div className="mt-1 text-sm font-semibold leading-5 text-stone-950">
                    {from?.title || edge.fromSourceId} <span className="text-stone-400">to</span> {to?.title || edge.toSourceId}
                  </div>
                </div>
                <span className="text-xs font-medium text-stone-500">{Math.round(edge.confidence * 100)}%</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-stone-600">{edge.evidenceNote}</p>
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
  return (
    <section>
      <SectionHeading title="Action cards" description="每条行动都绑定来源，方便继续读、试、看和跟踪。" />
      <div className="space-y-3">
        {thread.actions.map(action => (
          <article key={`${action.kind}-${action.title}`} className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-normal text-orange-600">
              {ACTION_LABELS[action.kind]}
            </div>
            <h2 className="mt-1 text-sm font-semibold text-stone-950">{action.title}</h2>
            <p className="mt-1 text-xs leading-5 text-stone-600">{action.description}</p>
            <SourceRefs sourceIds={action.sourceIds} sourcesById={sourcesById} />
          </article>
        ))}
      </div>
    </section>
  );
}

function RelatedEntryPoints({
  thread,
  sourcesById,
}: ThreadPageBlocksProps & { sourcesById: Map<string, KnowledgeThreadSource> }) {
  return (
    <section>
      <SectionHeading title="Entry points" description="把知识线程接回人物、机构、宽话题和相邻线程。" />
      <div className="space-y-2">
        {thread.relatedLinks.map(link => (
          <Link
            key={`${link.kind}-${link.label}`}
            href={link.href}
            prefetch={false}
            className="block rounded-lg border border-stone-200 bg-white px-3 py-3 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50/40"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-normal text-stone-500">
                {link.kind}
              </span>
              <span className="text-[10px] text-stone-400">{link.sourceIds.length} sources</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-stone-950">{link.label}</div>
            <div className="mt-1 text-xs leading-5 text-stone-500">{link.relation}</div>
            <SourceRefs sourceIds={link.sourceIds.slice(0, 2)} sourcesById={sourcesById} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function CompanyStrategyContext({
  thread,
  sourcesById,
}: ThreadPageBlocksProps & { sourcesById: Map<string, KnowledgeThreadSource> }) {
  const context = thread.companyStrategyContext;
  if (!context) return null;

  return (
    <section className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-xs leading-5 text-stone-600 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Company strategy context</div>
      <h2 className="mt-1 text-sm font-semibold text-stone-950">{context.title}</h2>
      <p className="mt-1">{context.description}</p>
      <SourceRefs sourceIds={context.sourceIds} sourcesById={sourcesById} />
      <Link
        href={context.href}
        prefetch={false}
        className="mt-3 inline-flex h-8 items-center justify-center rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 transition-colors hover:border-orange-200 hover:text-orange-700"
      >
        查看公司页
      </Link>
    </section>
  );
}

function SourceMiniRow({ source }: { source: KnowledgeThreadSource }) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-stone-950">{source.title}</span>
        <StatusPill status={source.status} />
      </div>
      <p className="mt-1 text-xs leading-5 text-stone-500">{source.evidenceNote}</p>
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
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sourceIds.map(sourceId => {
        const source = sourcesById.get(sourceId);
        if (!source) return null;
        return <RolePill key={sourceId} role={source.role} label={source.title} />;
      })}
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
  const className = {
    verified: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    usable: 'bg-blue-50 text-blue-700 ring-blue-100',
    needs_capture: 'bg-amber-50 text-amber-700 ring-amber-100',
    thin: 'bg-stone-50 text-stone-500 ring-stone-100',
  }[status];

  const label = {
    verified: 'verified',
    usable: 'usable',
    needs_capture: 'needs capture',
    thin: 'thin',
  }[status];

  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${className}`}>
      {label}
    </span>
  );
}

function getCoverage(thread: KnowledgeThreadFixture) {
  const missingRoles = thread.requiredRoles.filter(
    role => !thread.sources.some(source => source.role === role && isCoverageReadySource(source))
  );

  return { missingRoles };
}

function isCoverageReadySource(source: KnowledgeThreadSource): boolean {
  return source.status === 'verified' || source.status === 'usable';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}
