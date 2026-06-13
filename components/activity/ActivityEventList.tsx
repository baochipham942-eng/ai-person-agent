'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ActivityEvent, ActivityEventType } from '@/lib/activity';
import { buildTopicHref } from '@/lib/person-directory-config';

interface ActivityEventListProps {
  events: ActivityEvent[];
  emptyText?: string;
  showPerson?: boolean;
  variant?: 'list' | 'rail';
}

const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
  paper: '论文',
  github: '开源',
  video: '视频',
  article: '文章',
  podcast: '播客',
  role_change: '履历',
  relation_change: '关系',
};

export function ActivityEventList({
  events,
  emptyText = '暂无近期动态',
  showPerson = true,
  variant = 'list',
}: ActivityEventListProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 bg-white/60 px-4 py-6 text-center text-xs text-stone-500">
        {emptyText}
      </div>
    );
  }

  if (variant === 'rail') {
    return (
      <div
        className="scrollbar-hide -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0"
        aria-label="近期动态推荐"
      >
        {events.map((event) => (
          <article
            key={event.id}
            className="flex min-h-48 w-[18.5rem] flex-shrink-0 snap-start flex-col rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50/30 sm:w-[20rem]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-orange-100">
                  {EVENT_TYPE_LABELS[event.eventType]}
                </span>
                <span className="truncate text-[10px] text-stone-400">{event.sourceLabel}</span>
              </div>
              <span className="flex-shrink-0 text-[10px] text-stone-400">{formatDate(event.occurredAt || event.detectedAt)}</span>
            </div>

            <a
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-stone-950 hover:text-orange-600"
            >
              {event.title}
            </a>
            {event.importanceReason && (
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-600">
                <span className="font-medium text-stone-900">看点：</span>
                {event.importanceReason}
              </p>
            )}
            {event.summary && (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{event.summary}</p>
            )}

            <div className="mt-auto pt-3">
              {event.topics.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {event.topics.slice(0, 2).map(topic => (
                    <Link
                      key={topic}
                      href={buildTopicHref(topic)}
                      className="rounded-md bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-500 ring-1 ring-stone-200 hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-100"
                    >
                      {topic}
                    </Link>
                  ))}
                </div>
              )}
              {showPerson && (
                <Link
                  href={`/person/${event.personId}`}
                  className="flex min-w-0 items-center gap-2 border-t border-stone-100 pt-3 text-xs font-medium text-stone-600 hover:text-orange-600"
                  title={event.personName}
                >
                  <span className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-stone-100">
                    {event.personAvatarUrl ? (
                      <Image src={event.personAvatarUrl} alt={event.personName} fill sizes="24px" className="object-cover object-top" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-orange-500 text-[10px] font-semibold text-white">
                        {event.personName.charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="truncate">{event.personName}</span>
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {events.map((event) => (
        <article key={event.id} className="px-4 py-3 transition-colors hover:bg-orange-50/40">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-orange-100">
                  {EVENT_TYPE_LABELS[event.eventType]}
                </span>
                <span className="text-[10px] text-stone-400">{formatDate(event.occurredAt || event.detectedAt)}</span>
                <span className="text-[10px] text-stone-400">{event.sourceLabel}</span>
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
                className="line-clamp-2 text-sm font-medium leading-5 text-stone-900 hover:text-orange-600"
              >
                {event.title}
              </a>
              {event.importanceReason && (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-600">
                  <span className="font-medium text-stone-800">看点：</span>
                  {event.importanceReason}
                </p>
              )}
              {event.summary && (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{event.summary}</p>
              )}
              {event.topics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {event.topics.slice(0, 3).map(topic => (
                    <Link
                      key={topic}
                      href={buildTopicHref(topic)}
                      className="rounded-md bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-500 ring-1 ring-stone-200 hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-100"
                    >
                      {topic}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {showPerson && (
              <Link
                href={`/person/${event.personId}`}
                className="flex-shrink-0 text-xs font-medium text-stone-500 hover:text-orange-600 sm:max-w-[9rem] sm:truncate"
                title={event.personName}
              >
                {event.personName}
              </Link>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return '最近';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return '最近';
  }
}
