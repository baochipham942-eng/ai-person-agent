'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { sanitizeIndexedText } from '@/lib/search/sanitize-content';
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
  const [submittedQuery, setSubmittedQuery] = useState('');

  const results = response?.data || [];
  const meta = response?.meta;
  const effectiveMode = meta?.mode || mode;
  const maxScore = useMemo(
    () => results.reduce((max, item) => (item.score > max ? item.score : max), 0),
    [results],
  );

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
      setSubmittedQuery(trimmed);
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
              <SearchResultCard key={result.id} result={result} maxScore={maxScore} query={submittedQuery} />
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

function SearchResultCard({ result, maxScore, query }: { result: ContentSearchResult; maxScore: number; query: string }) {
  const [chunksOpen, setChunksOpen] = useState(false);
  const title = result.title || '未命名内容';
  const body = cleanContentText(result.summary || result.snippet);
  const href = result.url || objectHref(result);
  const isExternal = Boolean(result.url);
  const relevance = maxScore > 0 ? result.score / maxScore : 0;
  const chunks = result.chunks.filter(chunk => cleanContentText(chunk.snippet).length > 0);

  // 命中方式：字面命中（关键词）还是语义命中，决定卡片如何向用户解释它和搜索词的关系。
  const hasKeyword = result.keywordScore > 0;
  const hasSemantic = result.semanticScore > 0;
  const reason: MatchReason = hasKeyword && hasSemantic ? 'both' : hasKeyword ? 'keyword' : hasSemantic ? 'semantic' : 'none';

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Tag size="small" color={result.objectType === 'company_source' ? 'blue' : 'gray'}>
              {TYPE_LABELS[result.objectType] || result.objectType}
            </Tag>
            <MatchReasonBadge reason={reason} />
            {result.sourceType && <span className="text-xs text-stone-400">{result.sourceType}</span>}
            {result.publishedAt && <span className="text-xs text-stone-400">{formatDate(result.publishedAt)}</span>}
          </div>
          {href ? (
            <Link
              href={href}
              prefetch={false}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className="inline-flex items-start gap-1 text-base font-semibold leading-6 text-stone-950 hover:text-orange-600"
            >
              <span className="line-clamp-2">{highlightQuery(title, query)}</span>
              {isExternal && <span aria-hidden className="mt-0.5 text-xs text-stone-400">↗</span>}
            </Link>
          ) : (
            <h2 className="line-clamp-2 text-base font-semibold leading-6 text-stone-950">{highlightQuery(title, query)}</h2>
          )}
          {body && <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">{highlightQuery(body, query)}</p>}
        </div>

        <RelevanceMeter ratio={relevance} />
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

      {chunks.length > 0 && (
        <div className="mt-3 border-t border-stone-100 pt-3">
          <button
            type="button"
            onClick={() => setChunksOpen(open => !open)}
            aria-expanded={chunksOpen}
            className="flex items-center gap-1 text-xs font-medium text-stone-500 transition-colors hover:text-orange-600"
          >
            <span className={`transition-transform ${chunksOpen ? 'rotate-90' : ''}`}>›</span>
            命中原文 · {chunks.length}
          </button>
          {chunksOpen && (
            <div className="mt-2 space-y-2">
              {chunks.slice(0, 3).map(chunk => (
                <div key={chunk.id} className="rounded-lg bg-stone-50 px-3 py-2">
                  <p className="line-clamp-3 text-xs leading-5 text-stone-600">{highlightQuery(cleanContentText(chunk.snippet), query)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

type MatchReason = 'keyword' | 'semantic' | 'both' | 'none';

const MATCH_REASON_META: Record<Exclude<MatchReason, 'none'>, { label: string; className: string }> = {
  keyword: { label: '命中搜索词', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  semantic: { label: '语义相关', className: 'bg-violet-50 text-violet-700 ring-violet-200' },
  both: { label: '搜索词+语义', className: 'bg-orange-50 text-orange-700 ring-orange-200' },
};

/** 告诉用户这条为什么会出现：是命中了搜索词，还是按语义召回的。 */
function MatchReasonBadge({ reason }: { reason: MatchReason }) {
  if (reason === 'none') return null;
  const meta = MATCH_REASON_META[reason];
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ${meta.className}`}>
      {meta.label}
    </span>
  );
}

/**
 * 把不同量纲的原始检索分（keyword BM25 / semantic 0-1 / hybrid 归一）统一成
 * 「相对本批最相关结果」的可读相关度，不再暴露看不懂的裸数字。
 */
function RelevanceMeter({ ratio }: { ratio: number }) {
  const pct = Math.max(8, Math.min(100, Math.round(ratio * 100)));
  return (
    <div className="flex flex-shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
      <span className="text-[11px] text-stone-400">相关度</span>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** 在文本中高亮搜索词，让用户一眼看到结果和搜索词的关系。 */
function highlightQuery(text: string, query: string): ReactNode {
  const tokens = Array.from(new Set((query || '').trim().split(/\s+/).filter(token => token.length > 0)));
  if (tokens.length === 0 || !text) return text;
  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
  const segments = text.split(pattern);
  if (segments.length <= 1) return text;
  return segments.map((segment, index) =>
    index % 2 === 1
      ? (
        <mark key={index} className="rounded bg-amber-100 px-0.5 font-medium text-amber-800">
          {segment}
        </mark>
      )
      : segment,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 展示层复用索引层同一套清洗逻辑，剥离泄漏到前台的内部策展脚手架，
 * 保证「重建索引前」也能立刻读到干净结果。
 */
function cleanContentText(raw: string | null | undefined): string {
  return sanitizeIndexedText(raw);
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
