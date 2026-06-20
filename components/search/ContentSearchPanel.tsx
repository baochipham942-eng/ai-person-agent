'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Empty, Input, Message, Spin, Tag } from '@arco-design/web-react';
import { IconSearch } from '@arco-design/web-react/icon';

type ContentSearchMode = 'keyword' | 'hybrid' | 'semantic';

interface ContentSearchChunk {
  id: string;
  chunkIndex: number;
  title: string;
  snippet: string;
  score: number;
}

interface ContentSearchResult {
  id: string;
  objectType: string;
  objectId: string;
  sourceType: string | null;
  title: string;
  summary: string | null;
  snippet: string;
  url: string | null;
  topics: string[];
  organizations: string[];
  publishedAt: string | null;
  score: number;
  keywordScore: number;
  semanticScore: number;
  chunks: ContentSearchChunk[];
}

interface ContentSearchResponse {
  data?: ContentSearchResult[];
  meta?: {
    mode: ContentSearchMode;
    requestedMode: ContentSearchMode;
    semanticStatus: 'not_requested' | 'ready' | 'fallback';
    semanticError?: { message?: string; code?: string; status?: number } | null;
  };
  error?: string;
}

const MODES: Array<{ key: ContentSearchMode; label: string }> = [
  { key: 'hybrid', label: '综合' },
  { key: 'keyword', label: '关键词' },
  { key: 'semantic', label: '语义' },
];

const TYPE_LABELS: Record<string, string> = {
  raw_pool_item: '内容池',
  company_source: '公司源',
  knowledge_source: '知识源',
  card: '卡片',
};

export function ContentSearchPanel() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ContentSearchMode>('hybrid');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ContentSearchResponse | null>(null);

  const results = response?.data || [];
  const meta = response?.meta;
  const effectiveMode = meta?.mode || mode;

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      Message.warning('请输入至少 2 个字符');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: trimmed,
        limit: '12',
        includeChunks: 'true',
      });
      if (mode !== 'hybrid') params.set('mode', mode);

      const nextResponse = await fetch(`/api/content-search?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const data = await nextResponse.json() as ContentSearchResponse;
      if (!nextResponse.ok) {
        throw new Error(data.error || '内容搜索失败');
      }
      setResponse(data);
      if (data.meta?.semanticStatus === 'fallback') {
        Message.warning('语义召回不可用，已返回关键词结果');
      }
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '内容搜索失败');
    } finally {
      setLoading(false);
    }
  }, [mode, query]);

  const resultSummary = useMemo(() => {
    if (!response) return null;
    return `${results.length} 条结果 · ${labelForMode(effectiveMode)}`;
  }, [effectiveMode, response, results.length]);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
          <Input
            size="large"
            value={query}
            onChange={setQuery}
            onPressEnter={runSearch}
            prefix={<IconSearch />}
            placeholder="搜索人物、公司动态或知识主题..."
            allowClear
          />

          <div className="inline-grid grid-cols-3 overflow-hidden rounded-lg border border-stone-200 bg-stone-50 p-1">
            {MODES.map(item => (
              <button
                key={item.key}
                type="button"
                aria-pressed={mode === item.key}
                onClick={() => setMode(item.key)}
                className={`h-9 px-3 text-sm font-medium transition ${
                  mode === item.key
                    ? 'rounded-md bg-white text-stone-950 shadow-sm'
                    : 'text-stone-500 hover:text-orange-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button type="primary" size="large" icon={<IconSearch />} loading={loading} onClick={runSearch}>
            搜索
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
          {resultSummary && <span>{resultSummary}</span>}
          {meta && (
            <>
              <Tag size="small" color={meta.semanticStatus === 'ready' ? 'green' : meta.semanticStatus === 'fallback' ? 'orange' : 'gray'}>
                {semanticStatusLabel(meta.semanticStatus)}
              </Tag>
              {meta.requestedMode !== meta.mode && (
                <Tag size="small" color="orange">
                  {labelForMode(meta.requestedMode)} {'>'} {labelForMode(meta.mode)}
                </Tag>
              )}
            </>
          )}
        </div>
      </section>

      <section className="min-h-[24rem]">
        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <Spin size={32} tip="搜索中" />
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map(result => (
              <SearchResultCard key={result.id} result={result} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-80 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-white/60">
            <Empty description={response ? '没有匹配结果' : '输入关键词开始搜索'} />
          </div>
        )}
      </section>
    </div>
  );
}

function SearchResultCard({ result }: { result: ContentSearchResult }) {
  const title = result.title || '未命名内容';
  const body = result.summary || result.snippet;
  const href = result.url || objectHref(result);

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Tag size="small" color={result.objectType === 'company_source' ? 'blue' : 'gray'}>
              {TYPE_LABELS[result.objectType] || result.objectType}
            </Tag>
            {result.sourceType && <span className="text-xs text-stone-400">{result.sourceType}</span>}
            {result.publishedAt && <span className="text-xs text-stone-400">{formatDate(result.publishedAt)}</span>}
          </div>
          {href ? (
            <Link href={href} prefetch={false} className="line-clamp-2 text-base font-semibold leading-6 text-stone-950 hover:text-orange-600">
              {title}
            </Link>
          ) : (
            <h2 className="line-clamp-2 text-base font-semibold leading-6 text-stone-950">{title}</h2>
          )}
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">{body}</p>
        </div>

        <div className="grid w-full grid-cols-3 gap-2 text-center sm:w-48">
          <ScorePill label="综合" value={result.score} />
          <ScorePill label="关键词" value={result.keywordScore} />
          <ScorePill label="语义" value={result.semanticScore} />
        </div>
      </div>

      {result.topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.topics.slice(0, 6).map(topic => (
            <span key={topic} className="rounded-md bg-stone-50 px-2 py-1 text-xs text-stone-500 ring-1 ring-stone-200">
              {topic}
            </span>
          ))}
        </div>
      )}

      {result.chunks.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
          {result.chunks.slice(0, 2).map(chunk => (
            <div key={chunk.id} className="rounded-lg bg-stone-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-xs text-stone-400">
                <span className="truncate">{chunk.title}</span>
                <span>#{chunk.chunkIndex + 1}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-600">{chunk.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-stone-50 px-2 py-1.5 ring-1 ring-stone-200">
      <div className="text-[10px] font-medium uppercase text-stone-400">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-stone-800">{formatScore(value)}</div>
    </div>
  );
}

function labelForMode(mode: ContentSearchMode): string {
  if (mode === 'semantic') return '语义';
  if (mode === 'keyword') return '关键词';
  return '综合';
}

function semanticStatusLabel(status: NonNullable<ContentSearchResponse['meta']>['semanticStatus']): string {
  if (status === 'ready') return '语义可用';
  if (status === 'fallback') return '关键词回退';
  return '关键词';
}

function objectHref(result: ContentSearchResult): string | null {
  if (result.objectType === 'raw_pool_item' && result.objectId) return `/work/${result.objectId}`;
  return null;
}

function formatScore(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
