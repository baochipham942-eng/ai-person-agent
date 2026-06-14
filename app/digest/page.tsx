import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ActivityEventList } from '@/components/activity/ActivityEventList';
import { SiteHeader } from '@/components/common/SiteHeader';
import type { ActivityEvent, ActivityEventType } from '@/lib/activity';
import {
  fetchWeeklyDigest,
  weeklyDigestDirectoryHref,
  type WeeklyDigestFacet,
  type WeeklyDigestData,
  type WeeklyDigestPerson,
  type WeeklyDigestSource,
} from '@/lib/weekly-digest';

export const metadata: Metadata = {
  title: '本周动态 | AI 人物库',
  description: '查看本周 AI 人物、话题、机构和可信来源动态。',
};

export const revalidate = 300;

const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
  paper: '论文',
  github: '开源',
  video: '视频',
  article: '文章',
  podcast: '播客',
  role_change: '履历',
  relation_change: '关系',
};

export default async function WeeklyDigestPage() {
  const { digest, unavailable } = await loadWeeklyDigest();
  const featuredEvent = digest.events[0] || null;
  const remainingEvents = featuredEvent ? digest.events.slice(1, 12) : digest.events.slice(0, 12);
  const topPerson = digest.trendingPeople[0] || null;
  const topTopic = digest.topics[0] || null;
  const topOrganization = digest.organizations[0] || null;
  const topSource = digest.sourceMix[0] || null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="digest" maxWidth="7xl" />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6">
        <section className="rounded-xl border border-stone-200 bg-white px-5 py-5 shadow-sm sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 text-xs font-medium text-orange-600">AI 人物情报周报</div>
              <h1 className="text-2xl font-semibold text-stone-950">本周动态</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                {formatDate(digest.windowStart)} 到 {formatDate(digest.windowEnd)}，把人物、论文、项目、内容和关系变化整理成一页。
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-stone-500">
                <span className="rounded-md bg-stone-50 px-2 py-1 ring-1 ring-stone-200">每 5 分钟刷新</span>
                <span className="rounded-md bg-stone-50 px-2 py-1 ring-1 ring-stone-200">来源优先展示已确认和可信信号</span>
                {unavailable && (
                  <span className="rounded-md bg-orange-50 px-2 py-1 text-orange-700 ring-1 ring-orange-100">
                    数据源暂时不可用，稍后自动恢复
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <DigestStat label="动态" value={digest.events.length} />
              <DigestStat label="人物" value={digest.trendingPeople.length} />
              <DigestStat label="话题" value={digest.topics.length} />
              <DigestStat label="机构" value={digest.organizations.length} />
            </div>
          </div>
        </section>

        <section id="signals" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SignalCard
            eyebrow="最活跃人物"
            title={topPerson?.name || '等待本周数据'}
            href={topPerson ? `/person/${topPerson.id}` : undefined}
            meta={topPerson ? `${topPerson.eventCount} 条动态 · 近 7 天 ${topPerson.weeklyViews} 次访问` : '有信号后自动出现'}
          />
          <SignalCard
            eyebrow="热门话题"
            title={topTopic?.label || '暂无话题信号'}
            href={topTopic?.href}
            meta={topTopic ? `${topTopic.count} 条相关信号` : '等待动态聚合'}
          />
          <SignalCard
            eyebrow="机构信号"
            title={topOrganization?.label || '暂无机构信号'}
            href={topOrganization?.href}
            meta={topOrganization ? `${topOrganization.count} 条相关信号` : '等待动态聚合'}
          />
          <SignalCard
            eyebrow="主要来源"
            title={topSource?.label || '暂无来源统计'}
            meta={topSource ? `${topSource.count} 条动态来自该来源` : '等待动态聚合'}
          />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <section id="events">
              <SectionTitle
                title="重点动态"
                actionHref="/"
                actionLabel="回到人物库"
              />
              {featuredEvent ? (
                <>
                  <FeaturedEventCard event={featuredEvent} />
                  {remainingEvents.length > 0 && (
                    <div className="mt-3">
                      <ActivityEventList
                        events={remainingEvents}
                        emptyText="本周暂时没有更多可展示的动态"
                        showPerson
                      />
                    </div>
                  )}
                </>
              ) : (
                <EmptyPanel text="本周暂时没有可展示的近期动态。" />
              )}
            </section>

            <section id="people">
              <SectionTitle
                title="值得关注的人物"
                actionHref={weeklyDigestDirectoryHref('weeklyViewCount')}
                actionLabel="查看热度榜"
              />
              {digest.trendingPeople.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {digest.trendingPeople.map(person => (
                    <DigestPersonCard key={person.id} person={person} />
                  ))}
                </div>
              ) : (
                <EmptyPanel text="暂时没有人物热度数据。" />
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-stone-950">探索本周</div>
              <div className="grid gap-2 text-xs">
                <Link href="#signals" className="rounded-lg bg-stone-50 px-3 py-2 font-medium text-stone-700 hover:bg-orange-50 hover:text-orange-700">
                  概览信号
                </Link>
                <Link href="#events" className="rounded-lg bg-stone-50 px-3 py-2 font-medium text-stone-700 hover:bg-orange-50 hover:text-orange-700">
                  重点动态
                </Link>
                <Link href="#people" className="rounded-lg bg-stone-50 px-3 py-2 font-medium text-stone-700 hover:bg-orange-50 hover:text-orange-700">
                  活跃人物
                </Link>
              </div>
            </section>
            <FacetSection title="活跃话题" items={digest.topics} />
            <FacetSection title="机构信号" items={digest.organizations} />
            <SourceSection items={digest.sourceMix} />
            <section className="rounded-xl border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-600 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-stone-950">个人订阅</div>
              <p className="text-xs leading-5 text-stone-500">
                注册后可以保存关注，并生成个人动态流。
              </p>
              <Link
                href="/login"
                className="mt-3 inline-flex rounded-lg bg-stone-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-orange-600"
              >
                注册或登录
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

async function loadWeeklyDigest(): Promise<{ digest: WeeklyDigestData; unavailable: boolean }> {
  const days = 7;
  const fallback = createWeeklyDigestFallback(days);
  const digestPromise = fetchWeeklyDigest(days)
    .then(digest => ({ digest, unavailable: false }))
    .catch((error) => {
      console.error('Failed to fetch weekly digest:', error);
      return { digest: fallback, unavailable: true };
    });
  const timeoutPromise = new Promise<{ digest: WeeklyDigestData; unavailable: boolean }>(resolve => {
    setTimeout(() => {
      resolve({ digest: fallback, unavailable: true });
    }, 2500);
  });

  return Promise.race([digestPromise, timeoutPromise]);
}

function createWeeklyDigestFallback(days: number): WeeklyDigestData {
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    days,
    generatedAt: now.toISOString(),
    windowStart: since.toISOString(),
    windowEnd: now.toISOString(),
    events: [],
    trendingPeople: [],
    topics: [],
    organizations: [],
    sourceMix: [],
  };
}

function SignalCard({ eyebrow, title, href, meta }: { eyebrow: string; title: string; href?: string; meta: string }) {
  const content = (
    <>
      <div className="text-[11px] font-medium text-orange-600">{eyebrow}</div>
      <div className="mt-1 truncate text-sm font-semibold text-stone-950">{title}</div>
      <div className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500">{meta}</div>
    </>
  );

  const className = 'rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50/40';

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function DigestStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-16 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
      <div className="text-lg font-semibold text-stone-950">{value}</div>
      <div className="mt-0.5 text-[11px] text-stone-500">{label}</div>
    </div>
  );
}

function SectionTitle({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-stone-950">{title}</h2>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="text-xs font-medium text-orange-600 hover:text-orange-700">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function FeaturedEventCard({ event }: { event: ActivityEvent }) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 ring-1 ring-orange-100">
              {EVENT_TYPE_LABELS[event.eventType]}
            </span>
            <span className="text-[11px] text-stone-400">{formatDate(event.occurredAt || event.detectedAt)}</span>
            <span className="text-[11px] text-stone-400">{event.sourceLabel}</span>
            {event.confidence < 0.7 && (
              <span className="rounded-md bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-500 ring-1 ring-stone-200">
                待核
              </span>
            )}
          </div>
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="text-lg font-semibold leading-7 text-stone-950 hover:text-orange-600"
          >
            {event.title}
          </a>
          {event.importanceReason && (
            <p className="mt-2 text-sm leading-6 text-stone-700">
              <span className="font-medium text-stone-950">看点：</span>
              {event.importanceReason}
            </p>
          )}
          {event.summary && (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-500">{event.summary}</p>
          )}
        </div>
        <Link
          href={`/person/${event.personId}`}
          className="flex min-w-44 items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-orange-50 hover:text-orange-700"
          title={event.personName}
        >
          <span className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-stone-100">
            {event.personAvatarUrl ? (
              <Image src={event.personAvatarUrl} alt={event.personName} fill sizes="32px" className="object-cover object-top" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-orange-500 text-xs font-semibold text-white">
                {event.personName.charAt(0)}
              </span>
            )}
          </span>
          <span className="min-w-0 truncate">{event.personName}</span>
        </Link>
      </div>
      {event.topics.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-stone-100 pt-3">
          {event.topics.slice(0, 5).map(topic => (
            <Link
              key={topic}
              href={`/topic/${encodeURIComponent(topic)}`}
              className="rounded-md bg-stone-50 px-2 py-1 text-[11px] text-stone-500 ring-1 ring-stone-200 hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-100"
            >
              {topic}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

function DigestPersonCard({ person }: { person: WeeklyDigestPerson }) {
  return (
    <article className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm">
      <Link href={`/person/${person.id}`} className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
        {person.avatarUrl ? (
          <Image src={person.avatarUrl} alt={person.name} fill sizes="48px" className="object-cover object-top" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-orange-500 text-base font-semibold text-white">
            {person.name.charAt(0)}
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/person/${person.id}`} className="block truncate text-sm font-semibold text-stone-950 hover:text-orange-600">
          {person.name}
        </Link>
        <div className="mt-0.5 line-clamp-2 text-xs leading-5 text-stone-500">
          {person.currentTitle || person.organization[0] || '资料整理中'}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {person.topics.slice(0, 3).map(topic => (
            <Link
              key={topic}
              href={`/topic/${encodeURIComponent(topic)}`}
              className="rounded-md bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-500 ring-1 ring-stone-200 hover:bg-orange-50 hover:text-orange-700"
            >
              {topic}
            </Link>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-stone-400">
          {person.eventCount > 0 ? `${person.eventCount} 条动态` : '暂无本周动态'} · 近 7 天 {person.weeklyViews} 次访问
        </div>
      </div>
    </article>
  );
}

function FacetSection({ title, items }: { title: string; items: WeeklyDigestFacet[] }) {
  return (
    <section>
      <SectionTitle title={title} />
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm hover:border-orange-200 hover:bg-orange-50"
            >
              <span className="min-w-0 truncate font-medium text-stone-700">{item.label}</span>
              <span className="text-xs text-stone-400">{item.count}</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyPanel text="暂时没有可展示条目。" />
      )}
    </section>
  );
}

function SourceSection({ items }: { items: WeeklyDigestSource[] }) {
  const max = Math.max(...items.map(item => item.count), 1);

  return (
    <section>
      <SectionTitle title="来源构成" />
      {items.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          {items.map(item => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-stone-600">{item.label}</span>
                <span className="text-stone-400">{item.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel text="暂时没有来源统计。" />
      )}
    </section>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-200 bg-white/70 px-4 py-6 text-center text-xs text-stone-500">
      {text}
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
