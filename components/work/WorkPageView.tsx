import Link from 'next/link';
import type { WorkPage, WorkContributor, WorkEvidenceSource } from '@/lib/products';

const ROLE_LABELS: Record<string, string> = { creator: '核心作者', lead: '主导', contributor: '贡献者' };
const EVIDENCE_MATCH_LABELS: Record<WorkEvidenceSource['matchReason'], string> = {
  url_exact: 'URL 匹配',
  title_mention: '标题提及',
  metadata_mention: '元数据提及',
  abstract_mention: '摘要/正文提及',
};

export function WorkPageView({ work }: { work: WorkPage }) {
  const creators = work.contributors.filter(c => c.role === 'creator');
  const others = work.contributors.filter(c => c.role !== 'creator');

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Hero */}
      <section className="rounded-xl border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-orange-700">
            {work.typeLabel}
          </span>
          {work.organizationName && (
            <>
              <span className="text-stone-300">·</span>
              <span>{work.organizationName}</span>
            </>
          )}
          {work.firstYear && (
            <>
              <span className="text-stone-300">·</span>
              <span>{work.firstYear}</span>
            </>
          )}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">{work.name}</h1>
        {work.description && (
          <p className="mt-4 max-w-3xl text-base leading-7 text-stone-700">{work.description}</p>
        )}
        {work.url && (
          <a
            href={work.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-9 items-center rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-600 transition-colors hover:border-orange-200 hover:text-orange-700"
          >
            官方页面 ↗
          </a>
        )}
      </section>

      {/* 关键人物（人前置） */}
      {work.contributors.length > 0 && (
        <section className="rounded-xl border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7">
          <div className="mb-4">
            <div className="text-xs font-semibold text-orange-600">关键人物</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">谁做出了它</h2>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              基于人物库的参与关系；公司高管/创始人的关系走「公司」那条边，不计入这里。
            </p>
          </div>
          {creators.length > 0 && <ContributorGrid people={creators} />}
          {others.length > 0 && (
            <div className="mt-3">
              {creators.length > 0 && <div className="mb-2 text-xs font-medium text-stone-400">其他贡献者</div>}
              <ContributorGrid people={others} />
            </div>
          )}
        </section>
      )}

      {work.paperFoundations.length > 0 && (
        <WorkEvidenceSection
          title="论文根基"
          eyebrow="Paper foundations"
          description="从 OpenAlex 论文源里反向匹配这项作品，点击进入站内 paper reader。"
          sources={work.paperFoundations}
          dataAttribute="paper-foundations"
        />
      )}

      {work.implementationSources.length > 0 && (
        <WorkEvidenceSection
          title="实现和代码"
          eyebrow="GitHub evidence"
          description="从 GitHub 来源里反向匹配实现、仓库或代码材料；当前只展示可解释候选。"
          sources={work.implementationSources}
          dataAttribute="implementation-sources"
        />
      )}

      {/* 话题 */}
      {work.topics.length > 0 && (
        <section className="rounded-xl border border-stone-200 bg-white px-5 py-5 shadow-sm">
          <div className="mb-2 text-sm font-medium text-stone-900">相关方向</div>
          <div className="flex flex-wrap gap-1.5">
            {work.topics.map(topic => (
              <Link
                key={topic}
                href={`/topic/${encodeURIComponent(topic)}`}
                prefetch={false}
                className="inline-flex items-center rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600 transition-colors hover:bg-orange-50 hover:text-orange-700"
              >
                {topic}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 参考层 */}
      <section className="border-t border-stone-200 pt-6">
        <div className="text-xs leading-5 text-stone-400">
          作品/成果由人物库的「代表成果」数据归并去重而来：同系列模型（如 GPT 各版本）收敛为一条；
          公司与主理方走机构页。如发现归并有误，可在 review 清单中校正。
        </div>
      </section>
    </main>
  );
}

function WorkEvidenceSection({
  title,
  eyebrow,
  description,
  sources,
  dataAttribute,
}: {
  title: string;
  eyebrow: string;
  description: string;
  sources: WorkEvidenceSource[];
  dataAttribute: string;
}) {
  return (
    <section
      className="rounded-xl border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7"
      data-work-evidence-section={dataAttribute}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold text-orange-600">{eyebrow}</div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-stone-500">{description}</p>
        </div>
        <span className="w-fit rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-500">
          {sources.length} sources
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {sources.slice(0, 6).map(source => (
          <WorkEvidenceCard key={`${source.kind}-${source.id}`} source={source} />
        ))}
      </div>
    </section>
  );
}

function WorkEvidenceCard({ source }: { source: WorkEvidenceSource }) {
  const meta = [
    source.sourceLabel,
    source.publishedAt,
    source.person.name,
    EVIDENCE_MATCH_LABELS[source.matchReason],
    `${Math.round(source.confidence * 100)}%`,
  ].filter((item): item is string => Boolean(item));

  return (
    <article
      className="flex h-full flex-col rounded-lg border border-stone-200 bg-stone-50/70 px-4 py-3"
      data-work-evidence-source
      data-source-kind={source.kind}
      data-match-reason={source.matchReason}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <SourceTitleLink source={source} />
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-stone-400">
            {meta.map(item => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-stone-500">
          {source.kind === 'paper' ? 'Paper' : 'GitHub'}
        </span>
      </div>
      {source.summary && (
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-stone-600">{source.summary}</p>
      )}
    </article>
  );
}

function SourceTitleLink({ source }: { source: WorkEvidenceSource }) {
  const className = 'line-clamp-2 text-sm font-semibold leading-5 text-stone-900 transition-colors hover:text-orange-700';
  if (source.kind === 'paper') {
    return (
      <Link href={source.href} prefetch={false} className={className} data-work-evidence-link>
        {source.title}
      </Link>
    );
  }
  return (
    <a href={source.href} target="_blank" rel="noopener noreferrer" className={className} data-work-evidence-link>
      {source.title}
    </a>
  );
}

function ContributorGrid({ people }: { people: WorkContributor[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {people.map(person => (
        <li key={person.id}>
          <Link
            href={`/person/${person.id}`}
            prefetch={false}
            className="flex h-full items-start gap-3 rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3 transition-colors hover:border-orange-200 hover:bg-orange-50/50"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-white text-sm font-semibold text-stone-500">
              {person.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover" />
              ) : (
                <span>{person.name.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-stone-900">{person.name}</span>
                <span className="inline-flex items-center rounded-full bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-500">
                  {ROLE_LABELS[person.role] || person.role}
                </span>
              </div>
              {person.currentTitle && <div className="mt-0.5 truncate text-xs text-stone-500">{person.currentTitle}</div>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
