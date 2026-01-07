/**
 * DataSource Adapters Registry
 * 
 * 统一导出所有 Adapters，方便 Inngest 和其他模块使用
 */

// 核心类型和工具
export {
    type SourceType,
    type NormalizedItem,
    type DataSourceResult,
    type DataSourceError,
    type DataSourceAdapter,
    type FetchParams,
    type PersonContext,
    createNormalizedItem,
    createSuccessResult,
    createErrorResult,
    hashUrl,
    hashContent,
    safeFetch,
} from './adapter';

// 各数据源 Adapters
export { GrokAdapter, grokAdapter } from './grok.adapter';
export { ExaAdapter, exaAdapter } from './exa.adapter';
export { YouTubeAdapter, youtubeAdapter } from './youtube.adapter';
export { GitHubAdapter, githubAdapter } from './github.adapter';
export { OpenAlexAdapter, openalexAdapter } from './openalex.adapter';
export { PodcastAdapter, podcastAdapter } from './podcast.adapter';
export { CareerAdapter, careerAdapter } from './career.adapter';
export { PerplexityAdapter, perplexityAdapter } from './perplexity.adapter';
export { BaikeAdapter, baikeAdapter } from './baike.adapter';
export { AIKnowledgeAdapter, aiKnowledgeAdapter } from './ai_knowledge.adapter';

// Adapter 注册表
import { DataSourceAdapter, SourceType } from './adapter';
import { grokAdapter } from './grok.adapter';
import { exaAdapter } from './exa.adapter';
import { youtubeAdapter } from './youtube.adapter';
import { githubAdapter } from './github.adapter';
import { openalexAdapter } from './openalex.adapter';
import { podcastAdapter } from './podcast.adapter';
import { careerAdapter } from './career.adapter';
import { perplexityAdapter } from './perplexity.adapter';
import { baikeAdapter } from './baike.adapter';
import { aiKnowledgeAdapter } from './ai_knowledge.adapter';

/**
 * 所有可用的 Adapters
 */
export const adapters: Record<string, DataSourceAdapter> = {
    x: grokAdapter,
    exa: exaAdapter,
    youtube: youtubeAdapter,
    github: githubAdapter,
    openalex: openalexAdapter,
    podcast: podcastAdapter,
    career: careerAdapter,
    perplexity: perplexityAdapter,
    baike: baikeAdapter,
    ai_knowledge: aiKnowledgeAdapter,
};

/**
 * 获取指定类型的 Adapter
 */
export function getAdapter(sourceType: SourceType): DataSourceAdapter | undefined {
    return adapters[sourceType];
}

/**
 * 获取所有 Adapter 列表
 */
export function getAllAdapters(): DataSourceAdapter[] {
    return Object.values(adapters);
}

