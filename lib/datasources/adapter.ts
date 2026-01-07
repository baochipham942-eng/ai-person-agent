/**
 * 统一的 DataSource Adapter 接口
 * 
 * 所有数据源 adapter 都必须实现这个接口，确保返回格式一致
 */

import crypto from 'crypto';

// ============== 枚举类型 ==============

export type SourceType =
    | 'exa'
    | 'x'             // Grok 获取的 X/Twitter 内容
    | 'youtube'
    | 'github'
    | 'openalex'
    | 'podcast'
    | 'career'
    | 'wikidata'
    | 'baike'
    | 'ai_knowledge'  // AI 知识库兜底
    | 'perplexity';   // Perplexity 精准搜索

// ============== 核心数据结构 ==============

/**
 * 标准化的数据项 - 所有数据源必须转换为此格式
 */
export interface NormalizedItem {
    url: string;
    urlHash: string;      // 自动计算，勿手动填写
    contentHash: string;  // 自动计算，勿手动填写
    title: string;
    text: string;
    publishedAt: Date | null;
    sourceType: SourceType;
    isOfficial: boolean;  // 是否来自官方渠道
    confidence: number;   // 数据置信度 0-100
    metadata: Record<string, unknown>;
}

/**
 * 数据源错误
 */
export interface DataSourceError {
    code: 'NETWORK_ERROR' | 'API_ERROR' | 'PARSE_ERROR' | 'AUTH_ERROR' | 'RATE_LIMIT' | 'NOT_FOUND';
    message: string;
    retryable: boolean;
    cause?: unknown;
}

/**
 * 数据源返回结果 - 统一格式
 */
export interface DataSourceResult {
    source: SourceType;
    items: NormalizedItem[];
    fetchedAt: Date;
    success: boolean;
    error?: DataSourceError;
    stats: {
        fetched: number;    // 原始获取数量
        validated: number;  // 验证通过数量
        filtered: number;   // 被过滤数量
    };
}

// ============== Adapter 参数 ==============

/**
 * 人物上下文 - 用于身份验证
 */
export interface PersonContext {
    id: string;
    name: string;
    englishName?: string;
    aliases: string[];
    organizations: string[];
    occupations: string[];
}

/**
 * Fetch 参数
 */
export interface FetchParams {
    person: PersonContext;

    // 可选参数
    since?: Date;           // 增量获取：只获取此时间之后的内容
    maxResults?: number;    // 最大结果数
    forceRefresh?: boolean; // 强制刷新，忽略缓存

    // 数据源特定参数
    handle?: string;        // X/GitHub/YouTube handle
    channelId?: string;     // YouTube channel ID
    orcid?: string;         // OpenAlex ORCID
    qid?: string;           // Wikidata QID
    seedDomains?: string[]; // 官方网站域名
}

// ============== Adapter 接口 ==============

/**
 * DataSource Adapter 接口
 * 
 * 每个数据源都需要实现这个接口
 */
export interface DataSourceAdapter {
    readonly sourceType: SourceType;
    readonly name: string;

    /**
     * 获取数据
     */
    fetch(params: FetchParams): Promise<DataSourceResult>;

    /**
     * 可选：检查是否应该执行此数据源
     * 返回 false 表示跳过（如缺少必要参数）
     */
    shouldFetch?(params: FetchParams): boolean;
}

// ============== 工具函数 ==============

/**
 * 生成 URL Hash
 */
export function hashUrl(url: string): string {
    // 标准化 URL
    let normalized = url;
    try {
        const u = new URL(url);
        // 对非 YouTube 链接移除 query params 避免重复
        if (!u.hostname.includes('youtube.com') || !u.pathname.includes('watch')) {
            u.search = '';
        }
        normalized = u.href.replace(/\/$/, ''); // 移除尾部斜杠
    } catch {
        // 无效 URL 直接使用原始值
    }
    return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * 生成内容 Hash
 */
export function hashContent(text: string): string {
    return crypto.createHash('md5').update(text?.slice(0, 1000) || '').digest('hex');
}

/**
 * 创建标准化数据项（自动计算 hash）
 */
export function createNormalizedItem(
    params: Omit<NormalizedItem, 'urlHash' | 'contentHash'>
): NormalizedItem {
    return {
        ...params,
        urlHash: hashUrl(params.url),
        contentHash: hashContent(params.text),
    };
}

/**
 * 创建成功的 DataSourceResult
 */
export function createSuccessResult(
    source: SourceType,
    items: NormalizedItem[],
    stats?: Partial<DataSourceResult['stats']>
): DataSourceResult {
    return {
        source,
        items,
        fetchedAt: new Date(),
        success: true,
        stats: {
            fetched: stats?.fetched ?? items.length,
            validated: stats?.validated ?? items.length,
            filtered: stats?.filtered ?? 0,
        },
    };
}

/**
 * 创建失败的 DataSourceResult
 */
export function createErrorResult(
    source: SourceType,
    error: DataSourceError
): DataSourceResult {
    return {
        source,
        items: [],
        fetchedAt: new Date(),
        success: false,
        error,
        stats: { fetched: 0, validated: 0, filtered: 0 },
    };
}

/**
 * 包装 adapter fetch，统一错误处理
 */
export async function safeFetch<T extends DataSourceAdapter>(
    adapter: T,
    params: FetchParams
): Promise<DataSourceResult> {
    try {
        // 检查是否应该执行
        if (adapter.shouldFetch && !adapter.shouldFetch(params)) {
            return createSuccessResult(adapter.sourceType, []);
        }

        return await adapter.fetch(params);
    } catch (error) {
        console.error(`[${adapter.name}] Fetch error:`, error);

        // 判断错误类型
        const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
        const isRateLimit = error instanceof Error && error.message.includes('429');

        return createErrorResult(adapter.sourceType, {
            code: isRateLimit ? 'RATE_LIMIT' : isNetworkError ? 'NETWORK_ERROR' : 'API_ERROR',
            message: error instanceof Error ? error.message : String(error),
            retryable: isNetworkError || isRateLimit,
            cause: error,
        });
    }
}
