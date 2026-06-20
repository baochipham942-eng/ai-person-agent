import { NextRequest, NextResponse } from 'next/server';
import { searchContentIndex, type SearchContentMode } from '@/lib/search/content-search';
import { createQueryEmbedding, formatSafeEmbeddingError } from '@/lib/search/embedding';
import type { SearchObjectType } from '@/lib/search/search-index';

const ALLOWED_OBJECT_TYPES = new Set<SearchObjectType>([
  'raw_pool_item',
  'knowledge_source',
  'company_source',
  'card',
]);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = (searchParams.get('q') || searchParams.get('query') || '').trim();
  if (query.length < 2) {
    return NextResponse.json({ error: '搜索关键词至少需要 2 个字符' }, { status: 400 });
  }

  const requestedMode = readSearchMode(searchParams.get('mode'));
  let mode = requestedMode;
  let queryEmbedding: number[] | null = null;
  let semanticStatus: 'not_requested' | 'ready' | 'fallback' = 'not_requested';
  let semanticError: ReturnType<typeof formatSafeEmbeddingError> | null = null;

  if (requestedMode !== 'keyword') {
    try {
      queryEmbedding = await createQueryEmbedding(query);
      semanticStatus = 'ready';
    } catch (error) {
      semanticStatus = 'fallback';
      semanticError = formatSafeEmbeddingError(error);
      if (requestedMode === 'semantic') {
        return NextResponse.json(
          { error: '语义搜索暂时不可用', meta: { mode: requestedMode, semanticStatus, semanticError } },
          { status: 503 },
        );
      }
      mode = 'keyword';
    }
  }

  const objectTypes = readObjectTypes(searchParams.get('types') || searchParams.get('objectTypes'));
  const topics = readCsv(searchParams.get('topics'));

  try {
    const data = await searchContentIndex({
      query,
      mode,
      queryEmbedding,
      objectTypes,
      personId: searchParams.get('personId'),
      threadId: searchParams.get('threadId'),
      organizationId: searchParams.get('organizationId'),
      sourceType: searchParams.get('sourceType'),
      topics,
      limit: readBoundedInt(searchParams.get('limit'), 1, 50, 12),
      includeChunks: searchParams.get('includeChunks') !== 'false',
      semanticWeight: readBoundedFloat(searchParams.get('semanticWeight'), 0, 1, 0.35),
    });

    const response = NextResponse.json({
      data,
      meta: {
        mode,
        requestedMode,
        semanticStatus,
        semanticError,
      },
    });
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Content search API error:', error);
    return NextResponse.json(
      { error: '内容搜索服务暂时不可用', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

function readSearchMode(value: string | null): SearchContentMode {
  return value === 'semantic' || value === 'hybrid' || value === 'keyword' ? value : 'hybrid';
}

function readObjectTypes(value: string | null): SearchObjectType[] | undefined {
  const types = readCsv(value).filter((type): type is SearchObjectType => ALLOWED_OBJECT_TYPES.has(type as SearchObjectType));
  return types.length ? types : undefined;
}

function readCsv(value: string | null): string[] {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function readBoundedInt(value: string | null, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function readBoundedFloat(value: string | null, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
