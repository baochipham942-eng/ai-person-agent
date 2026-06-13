'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MAX_COMPARE_PEOPLE,
  notifyCompareChanged,
  readCompareIds,
  writeCompareIds,
} from '@/components/common/compareSelection';
import { COMPARE_AGENT_TOOLS } from '@/lib/compare-report';

export interface ComparePersonOption {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  topics?: string[];
}

interface CompareReportEvent {
  id: string;
  step: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  title: string;
  message: string | null;
  createdAt: string;
}

interface CompareReportBuilderProps {
  initialPeople?: ComparePersonOption[];
  initialIds?: string[];
  initialTopic?: string;
}

const DEFAULT_TOPIC = 'AI 观点、商业路径、安全治理、开放策略、算力基础设施、未来判断';
const EMPTY_PEOPLE: ComparePersonOption[] = [];
const EMPTY_IDS: string[] = [];

export function CompareReportBuilder({
  initialPeople = EMPTY_PEOPLE,
  initialIds = EMPTY_IDS,
  initialTopic = DEFAULT_TOPIC,
}: CompareReportBuilderProps) {
  const router = useRouter();
  const initialPeopleRef = useRef(initialPeople.slice(0, MAX_COMPARE_PEOPLE));
  const initialIdsRef = useRef(initialIds.slice(0, MAX_COMPARE_PEOPLE));
  const [selectedPeople, setSelectedPeople] = useState<ComparePersonOption[]>(initialPeople.slice(0, MAX_COMPARE_PEOPLE));
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState(initialTopic);
  const [results, setResults] = useState<ComparePersonOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeReportTitle, setActiveReportTitle] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [events, setEvents] = useState<CompareReportEvent[]>([]);

  const selectedIds = useMemo(() => new Set(selectedPeople.map(person => person.id)), [selectedPeople]);
  const reportInFlight = Boolean(activeReportId && reportStatus !== 'completed' && reportStatus !== 'failed');
  const canCreate = selectedPeople.length >= 2 && selectedPeople.length <= MAX_COMPARE_PEOPLE && !creating && !reportInFlight;

  useEffect(() => {
    let cancelled = false;

    async function hydrateSelectionFromStorage() {
      const initialPeopleSnapshot = initialPeopleRef.current;
      const initialIdsSnapshot = initialIdsRef.current;

      if (initialPeopleSnapshot.length > 0) {
        writeCompareIds(initialPeopleSnapshot.map(person => person.id));
        notifyCompareChanged();
        setStorageReady(true);
        return;
      }

      const fallbackIds = uniqueIds(initialIdsSnapshot.length > 0 ? initialIdsSnapshot : readCompareIds()).slice(0, MAX_COMPARE_PEOPLE);
      if (fallbackIds.length === 0) {
        setStorageReady(true);
        return;
      }

      writeCompareIds(fallbackIds);
      notifyCompareChanged();
      setSelectedPeople(fallbackIds.map(id => fallbackPersonOption(id)));

      try {
        const response = await fetch(`/api/compare/people?ids=${encodeURIComponent(fallbackIds.join(','))}`, {
          cache: 'no-store',
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || '读取候选人物失败');
        const people = Array.isArray(payload.data) ? payload.data : [];
        if (!cancelled && people.length > 0) setSelectedPeople(people);
      } catch {
        if (!cancelled) setError('本地候选人物暂时无法读取，请重新添加。');
      } finally {
        if (!cancelled) setStorageReady(true);
      }
    }

    void hydrateSelectionFromStorage();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    writeCompareIds(selectedPeople.map(person => person.id));
    notifyCompareChanged();
  }, [selectedPeople, storageReady]);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/compare/people?query=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || '搜索失败');
        setResults(Array.isArray(payload.data) ? payload.data : []);
      } catch (searchError) {
        if (!controller.signal.aborted) {
          setResults([]);
          setError(searchError instanceof Error ? searchError.message : '搜索失败');
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (!activeReportId || reportStatus === 'completed' || reportStatus === 'failed') return;

    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/compare/reports/${activeReportId}/events`, { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || '获取进度失败');
        if (stopped) return;
        setEvents(Array.isArray(payload.data?.events) ? payload.data.events : []);
        setReportStatus(payload.data?.report?.status || null);
      } catch {
        if (!stopped) setError('生成进度暂时不可用，报告任务仍会继续。');
      }
    };

    poll();
    const interval = window.setInterval(poll, 1800);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [activeReportId, reportStatus]);

  const addPerson = (person: ComparePersonOption) => {
    setError(null);
    setSelectedPeople(current => {
      if (current.some(item => item.id === person.id)) return current;
      return [person, ...current].slice(0, MAX_COMPARE_PEOPLE);
    });
  };

  const removePerson = (personId: string) => {
    setSelectedPeople(current => current.filter(person => person.id !== personId));
  };

  const createReport = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    setActiveReportId(null);
    setActiveReportTitle(null);
    setReportStatus(null);
    setEvents([]);
    setProgressOpen(true);

    try {
      const response = await fetch('/api/compare/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peopleIds: selectedPeople.map(person => person.id),
          topic,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || '创建报告失败');
      }
      setActiveReportId(payload.data.id);
      setActiveReportTitle(payload.data.title || null);
      setReportStatus(payload.data.status);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '创建报告失败');
      setProgressOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const openReport = () => {
    if (activeReportId) router.push(`/compare/reports/${activeReportId}`);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-stone-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-medium text-orange-600">人物对比</div>
            <h1 className="mt-1 text-2xl font-semibold text-stone-950">对比候选</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              从人物卡片加入候选，也可以在这里删除或重新添加；凑齐 2 到 3 位后开始对比。
            </p>
          </div>
          <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-center">
            <div className="text-lg font-semibold text-stone-950">{selectedPeople.length}/{MAX_COMPARE_PEOPLE}</div>
            <div className="mt-0.5 text-[11px] text-stone-500">已选人物</div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-xs font-medium text-stone-700">选择人物</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedPeople.map(person => (
                <SelectedPersonChip key={person.id} person={person} onRemove={() => removePerson(person.id)} />
              ))}
              {selectedPeople.length === 0 && (
                <span className="rounded-lg border border-dashed border-stone-200 px-3 py-2 text-xs text-stone-400">请选择 2 到 3 位人物</span>
              )}
            </div>
            <div className="mt-3">
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                className="h-10 w-full rounded-xl border border-stone-200 px-3 text-sm text-stone-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                placeholder="输入人物名称"
              />
              <div className="mt-2 rounded-xl border border-stone-100 bg-stone-50">
                {searching ? (
                  <div className="px-3 py-3 text-xs text-stone-500">正在搜索</div>
                ) : results.length > 0 ? (
                  <div className="divide-y divide-stone-100">
                    {results.map(person => (
                      <button
                        key={person.id}
                        type="button"
                        disabled={selectedIds.has(person.id)}
                        onClick={() => addPerson(person)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-white disabled:cursor-default disabled:opacity-50"
                      >
                        <PersonAvatar person={person} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-stone-900">{person.name}</div>
                          <div className="truncate text-xs text-stone-500">{person.currentTitle || '公开资料整理中'}</div>
                        </div>
                        <span className="text-xs text-orange-600">{selectedIds.has(person.id) ? '已选' : '加入'}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-xs text-stone-400">
                    {query.trim() ? '没有找到匹配人物' : '输入名称后显示候选人物'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-stone-700">分析主题</label>
            <textarea
              value={topic}
              onChange={event => setTopic(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm leading-6 text-stone-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              {error}
              {error.includes('登录') && (
                <Link href="/login" className="ml-2 font-medium text-orange-700 hover:underline">
                  去登录
                </Link>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canCreate}
              onClick={createReport}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {creating ? '正在启动' : '开始对比'}
            </button>
            {activeReportId && (
              <button
                type="button"
                onClick={reportStatus === 'completed' ? openReport : () => setProgressOpen(true)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
              >
                {reportStatus === 'completed' ? '打开对比详情' : '查看执行进度'}
              </button>
            )}
          </div>
        </div>
      </section>

      <aside className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-stone-950">执行配置</div>
        <div className="mb-4 rounded-lg bg-stone-50 px-3 py-3 text-xs leading-5 text-stone-500 ring-1 ring-stone-100">
          Agent 会按人物匹配、资料检索、观点整理、差异分析和审查五步生成报告。
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {COMPARE_AGENT_TOOLS.map(tool => (
            <span
              key={tool.key}
              title={tool.description}
              className="rounded-md bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-500 ring-1 ring-stone-100"
            >
              {tool.label}
            </span>
          ))}
        </div>
        <div className="rounded-lg border border-dashed border-stone-200 px-3 py-8 text-center text-xs leading-5 text-stone-400">
          点击开始对比后会打开执行弹窗
        </div>
      </aside>

      {progressOpen && (creating || activeReportId) && (
        <AgentProgressModal
          creating={creating}
          events={events}
          reportId={activeReportId}
          reportTitle={activeReportTitle}
          reportStatus={reportStatus}
          onClose={() => setProgressOpen(false)}
          onOpenReport={openReport}
        />
      )}
    </div>
  );
}

function fallbackPersonOption(id: string): ComparePersonOption {
  const suffix = id.slice(-4).toUpperCase();
  return {
    id,
    name: suffix ? `候选人物 ${suffix}` : '候选人物',
    avatarUrl: null,
    currentTitle: '资料读取中',
  };
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map(id => id.trim()).filter(Boolean))];
}

function SelectedPersonChip({ person, onRemove }: { person: ComparePersonOption; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-2 py-1.5 shadow-sm">
      <PersonAvatar person={person} size={28} />
      <span className="text-xs font-medium text-stone-900">{person.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded px-1 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        aria-label={`移除 ${person.name}`}
      >
        x
      </button>
    </div>
  );
}

function PersonAvatar({ person, size }: { person: ComparePersonOption; size: number }) {
  return (
    <span className="relative inline-flex overflow-hidden rounded-lg bg-stone-100" style={{ width: size, height: size }}>
      {person.avatarUrl ? (
        <Image src={person.avatarUrl} alt={person.name} fill sizes={`${size}px`} className="object-cover object-top" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-orange-500 text-xs font-semibold text-white">
          {person.name.charAt(0)}
        </span>
      )}
    </span>
  );
}

function eventStatusLabel(status: CompareReportEvent['status']): string {
  if (status === 'completed') return '完成';
  if (status === 'failed') return '失败';
  if (status === 'queued') return '等待';
  return '进行中';
}

function eventStatusClass(status: CompareReportEvent['status']): string {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'failed') return 'bg-red-50 text-red-700';
  if (status === 'queued') return 'bg-stone-100 text-stone-500';
  return 'bg-orange-50 text-orange-700';
}

function AgentProgressModal({
  creating,
  events,
  reportId,
  reportTitle,
  reportStatus,
  onClose,
  onOpenReport,
}: {
  creating: boolean;
  events: CompareReportEvent[];
  reportId: string | null;
  reportTitle: string | null;
  reportStatus: string | null;
  onClose: () => void;
  onOpenReport: () => void;
}) {
  const completed = reportStatus === 'completed';
  const failed = reportStatus === 'failed';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-950/35 px-4 py-6">
      <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <div className="text-xs font-medium text-orange-600">Agent 执行</div>
            <h2 className="mt-1 text-lg font-semibold text-stone-950">
              {completed ? '对比报告已完成' : failed ? '对比任务失败' : '正在执行人物对比'}
            </h2>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              {completed ? '产物已经生成，可以进入详情页查看。' : '系统正在整理公开资料、观点差异和证据链。'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="关闭执行弹窗"
          >
            x
          </button>
        </div>

        {completed && reportId ? (
          <button
            type="button"
            onClick={onOpenReport}
            className="mt-4 w-full rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-left transition hover:border-emerald-200 hover:bg-emerald-100/70"
          >
            <div className="text-sm font-semibold text-emerald-900">{reportTitle || '人物对比报告'}</div>
            <div className="mt-1 text-xs leading-5 text-emerald-700">点击进入人物对比详情页</div>
          </button>
        ) : (
          <div className="mt-4 space-y-2">
            {creating && (
              <div className="rounded-lg bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-700 ring-1 ring-orange-100">
                正在启动对比任务
              </div>
            )}
            {events.length > 0 ? (
              events.map(event => (
                <div key={event.id} className="rounded-lg bg-stone-50 px-3 py-2 ring-1 ring-stone-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-stone-900">{event.title}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${eventStatusClass(event.status)}`}>
                      {eventStatusLabel(event.status)}
                    </span>
                  </div>
                  {event.message && <div className="mt-1 text-[11px] leading-5 text-stone-500">{event.message}</div>}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-stone-200 px-3 py-8 text-center text-xs leading-5 text-stone-400">
                等待任务进度
              </div>
            )}
          </div>
        )}

        {failed && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
            任务没有完成，可以关闭弹窗后重新开始。
          </div>
        )}
      </div>
    </div>
  );
}
