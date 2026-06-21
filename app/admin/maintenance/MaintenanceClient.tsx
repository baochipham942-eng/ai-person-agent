'use client';

import { useState } from 'react';
import { Button, Message } from '@arco-design/web-react';
import { useRouter } from 'next/navigation';
import type { PipelineMeta } from '@/lib/admin/pipelines/types';

interface PersonOption {
  id: string;
  name: string;
  status: string;
}

interface MaintenanceClientProps {
  people: PersonOption[];
  pipelines: PipelineMeta[];
}

type RefreshMode = 'incremental' | 'force' | 'rebuild';
type SourceType = 'exa' | 'grok' | 'youtube' | 'openalex' | 'podcast' | 'github' | 'career';

const SOURCE_OPTIONS: Array<{ value: SourceType; label: string }> = [
  { value: 'exa', label: 'Web / Exa' },
  { value: 'grok', label: 'X / Grok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'openalex', label: 'OpenAlex' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'github', label: 'GitHub' },
  { value: 'career', label: 'Career' },
];

export default function MaintenanceClient({ people, pipelines }: MaintenanceClientProps) {
  const router = useRouter();
  const personPipelines = pipelines.filter(p => p.category === 'person');
  const contentPipelines = pipelines.filter(p => p.category === 'content');
  const defaultKind = personPipelines.some(p => p.kind === 'single_person_refresh')
    ? 'single_person_refresh'
    : (pipelines[0]?.kind || '');
  const [kind, setKind] = useState<string>(defaultKind);
  const [personId, setPersonId] = useState(people[0]?.id || '');
  const [personIds, setPersonIds] = useState('');
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [targetQids, setTargetQids] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [refreshMode, setRefreshMode] = useState<RefreshMode>('incremental');
  const [sourceTypes, setSourceTypes] = useState<SourceType[]>([]);
  const [status, setStatus] = useState('all');
  const [limit, setLimit] = useState('100');
  const [search, setSearch] = useState('');
  const [contentOptions, setContentOptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const currentPipeline = pipelines.find(p => p.kind === kind);
  const isContent = currentPipeline?.category === 'content';

  async function createJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const targetPersonIds = isContent
      ? []
      : kind === 'single_person_refresh'
        ? [personId]
        : kind === 'multi_person_refresh'
          ? uniqueStrings([...selectedPersonIds, ...personIds.split(/[\s,]+/)])
          : [];
    const selectedSourceTypes = refreshMode === 'rebuild' ? [] : sourceTypes;

    const options = isContent
      ? coerceContentOptions(currentPipeline, contentOptions)
      : {
          status,
          limit: Number(limit),
          search,
          refreshMode,
          sourceTypes: selectedSourceTypes,
          targetQids,
        };

    try {
      const response = await fetch('/api/admin/maintenance/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, dryRun, targetPersonIds, options }),
      });

      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || '创建任务失败');

      Message.success(dryRun ? 'dry-run 已进入队列' : '维护任务已进入队列');
      router.refresh();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '创建任务失败');
    } finally {
      setLoading(false);
    }
  }

  function toggleSourceType(value: SourceType) {
    setSourceTypes(current => current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value]);
  }

  function togglePersonSelection(id: string) {
    setSelectedPersonIds(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id]);
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-stone-950">创建维护任务</h2>
      <form onSubmit={createJob} className="mt-4 grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-xs text-stone-500">
            任务类型
            <select value={kind} onChange={event => setKind(event.target.value)} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900">
              <optgroup label="人物维护">
                {personPipelines.map(p => <option key={p.kind} value={p.kind}>{p.label}</option>)}
              </optgroup>
              {contentPipelines.length > 0 && (
                <optgroup label="内容管线">
                  {contentPipelines.map(p => <option key={p.kind} value={p.kind}>{p.label}</option>)}
                </optgroup>
              )}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-stone-500">
            模式
            <select value={dryRun ? 'dry' : 'execute'} onChange={event => setDryRun(event.target.value === 'dry')} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900">
              <option value="dry">dry-run</option>
              <option value="execute">执行触发</option>
            </select>
          </label>
          {!isContent && (
            <label className="grid gap-1 text-xs text-stone-500">
              刷新强度
              <select value={refreshMode} onChange={event => setRefreshMode(event.target.value as RefreshMode)} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900">
                <option value="incremental">增量刷新</option>
                <option value="force">强制重拉</option>
                <option value="rebuild">清空重建</option>
              </select>
            </label>
          )}
          {!isContent && (
            <label className="grid gap-1 text-xs text-stone-500">
              状态筛选
              <select value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900">
                <option value="all">全部</option>
                <option value="pending">pending</option>
                <option value="partial">partial</option>
                <option value="error">error</option>
                <option value="ready">ready</option>
                <option value="active">active</option>
                <option value="building">building</option>
              </select>
            </label>
          )}
        </div>

        {isContent && currentPipeline && currentPipeline.optionFields.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {currentPipeline.optionFields.map(field => (
              <label key={field.key} className="grid gap-1 text-xs text-stone-500">
                {field.label}
                {field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    placeholder={field.placeholder}
                    value={contentOptions[field.key] ?? String(field.defaultValue ?? '')}
                    onChange={e => setContentOptions(o => ({ ...o, [field.key]: e.target.value }))}
                    className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-orange-300"
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    placeholder={field.placeholder}
                    value={contentOptions[field.key] ?? String(field.defaultValue ?? '')}
                    onChange={e => setContentOptions(o => ({ ...o, [field.key]: e.target.value }))}
                    className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none focus:border-orange-300"
                  />
                )}
                {field.help && <span className="text-stone-400">{field.help}</span>}
              </label>
            ))}
          </div>
        )}

        {kind === 'new_person_build' && (
          <label className="grid gap-1 text-xs text-stone-500">
            Wikidata QID 列表
            <textarea
              value={targetQids}
              onChange={event => setTargetQids(event.target.value)}
              rows={4}
              placeholder="例如 Q7259，支持换行或逗号分隔"
              className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-orange-300"
            />
          </label>
        )}

        {kind === 'single_person_refresh' && (
          <label className="grid gap-1 text-xs text-stone-500">
            选择人物
            <select value={personId} onChange={event => setPersonId(event.target.value)} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900">
              {people.map(person => (
                <option key={person.id} value={person.id}>{person.name} · {person.status}</option>
              ))}
            </select>
          </label>
        )}

        {kind === 'multi_person_refresh' && (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-stone-500">选择人物</div>
              <button
                type="button"
                onClick={() => setSelectedPersonIds([])}
                className="text-xs font-medium text-orange-600 hover:text-orange-700"
              >
                清空已选 {selectedPersonIds.length}
              </button>
            </div>
            <div className="max-h-56 overflow-auto rounded-md border border-stone-200 bg-stone-50 p-2">
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {people.map(person => {
                  const checked = selectedPersonIds.includes(person.id);
                  return (
                    <label
                      key={person.id}
                      className={`flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                        checked ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePersonSelection(person.id)}
                        className="h-3.5 w-3.5 shrink-0 accent-orange-500"
                      />
                      <span className="min-w-0 truncate">{person.name} · {person.status}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <label className="grid gap-1 text-xs text-stone-500">
              追加人物 ID，可选
              <textarea
                value={personIds}
                onChange={event => setPersonIds(event.target.value)}
                rows={3}
                placeholder="用于补充不在上方列表里的人物，支持换行或逗号分隔"
                className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-orange-300"
              />
            </label>
          </div>
        )}

        {kind === 'all_people_refresh' && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-xs text-stone-500">
              数量上限
              <input value={limit} onChange={event => setLimit(event.target.value)} type="number" min="1" max="5000" className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900" />
            </label>
            <label className="grid gap-1 text-xs text-stone-500">
              名称搜索，可选
              <input value={search} onChange={event => setSearch(event.target.value)} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900" />
            </label>
          </div>
        )}

        {!isContent && (
        <div className="grid gap-2">
          <div className="text-xs text-stone-500">媒体渠道</div>
          <div className="flex flex-wrap gap-2">
            {SOURCE_OPTIONS.map(source => {
              const checked = sourceTypes.includes(source.value);
              const disabled = refreshMode === 'rebuild';
              return (
                <label
                  key={source.value}
                  className={`flex h-9 items-center gap-2 rounded-md border px-3 text-xs ${
                    disabled
                      ? 'border-stone-100 bg-stone-50 text-stone-400'
                      : checked
                        ? 'border-orange-200 bg-orange-50 text-orange-700'
                        : 'border-stone-200 bg-white text-stone-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked && !disabled}
                    disabled={disabled}
                    onChange={() => toggleSourceType(source.value)}
                    className="h-3.5 w-3.5 accent-orange-500"
                  />
                  {source.label}
                </label>
              );
            })}
          </div>
          <p className="text-xs leading-5 text-stone-400">
            不选择时默认全来源。清空重建会清旧内容并按全来源重建，不支持单独选择渠道。
          </p>
          {sourceTypes.includes('youtube') && refreshMode !== 'rebuild' ? (
            <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
              这里的 YouTube 会进入标准人物刷新链路；批量 Raw 抓取、QA 清洗和 ActivityEvent 入库状态请看 <a href="/admin/operations" className="font-medium text-sky-700 underline underline-offset-2">上线准备度</a>。
            </div>
          ) : null}
        </div>
        )}

        {!isContent ? (
          <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            增量刷新会尊重各数据源间隔；强制重拉会忽略间隔但保留旧内容；清空重建会归档旧卡片并重新抓取。先跑 dry-run 看目标列表。
          </div>
        ) : (
          <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            内容管线会抓取第三方数据源（可能消耗 Exa/Jina/supadata 额度）。先跑 dry-run 看目标量，确认后再执行触发。
          </div>
        )}

        <Button type="primary" htmlType="submit" loading={loading} className="w-fit">
          {loading ? '创建中...' : '创建任务'}
        </Button>
      </form>
    </section>
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

/** content 表单值按 optionFields 类型转换：number 转数字、text 保留非空 trim。 */
function coerceContentOptions(pipeline: PipelineMeta | undefined, raw: Record<string, string>): Record<string, unknown> {
  if (!pipeline) return {};
  const out: Record<string, unknown> = {};
  for (const field of pipeline.optionFields) {
    const value = raw[field.key] ?? (field.defaultValue !== undefined ? String(field.defaultValue) : '');
    const trimmed = value.trim();
    if (field.type === 'number') {
      if (trimmed !== '') out[field.key] = Number(trimmed);
    } else if (trimmed !== '') {
      out[field.key] = trimmed;
    }
  }
  return out;
}
