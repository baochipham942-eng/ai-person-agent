/**
 * Skills Index
 *
 * 统一导出所有 skill 模块
 */

// ============== 数据源类 Skills ==============

// Wikidata 搜索
export {
    WikidataSearchSkill,
    wikidataSearch,
    type WikidataSearchResult,
    type WikidataEntity,
    type PersonRelation,
    type WikidataSearchConfig,
} from './wikidata-search';

// Web 搜索 (Exa)
export {
    WebSearchSkill,
    webSearch,
    type WebSearchResult,
    type WebSearchOptions,
    type WebSearchConfig,
} from './web-search';

// X/Twitter 搜索 (Grok)
export {
    XSearchSkill,
    xSearch,
    type XPost,
    type XSearchResult,
    type XSearchConfig,
} from './x-search';

// GitHub 搜索
export {
    GitHubSearchSkill,
    githubSearch,
    type GitHubRepo,
    type GitHubSearchConfig,
} from './github-search';

// YouTube 搜索
export {
    YouTubeSearchSkill,
    youtubeSearch,
    type YouTubeVideo,
    type YouTubeChannel,
    type YouTubeSearchConfig,
} from './youtube-search';

// 学术搜索 (OpenAlex)
export {
    AcademicSearchSkill,
    academicSearch,
    type AcademicWork,
    type AcademicAuthor,
    type AcademicSearchConfig,
} from './academic-search';

// Web 问答 (Perplexity)
export {
    WebQASkill,
    webQA,
    type WebQAResponse,
    type WebQAConfig,
} from './web-qa';

// ============== AI 处理类 Skills ==============

// DeepSeek LLM
export {
    DeepSeekLLMSkill,
    deepseekLLM,
    type ChatMessage,
    type DeepSeekConfig,
    type CompletionOptions,
} from './deepseek-llm';

// 翻译
export {
    TranslationSkill,
    translation,
    type TranslationConfig,
    type PersonInfo,
} from './translation';

// 时间线提取
export {
    TimelineExtractionSkill,
    timelineExtraction,
    type TimelineEvent,
    type TimelineExtractionConfig,
    type TextSource,
} from './timeline-extraction';

// 卡片生成
export {
    CardGenerationSkill,
    cardGeneration,
    type Card,
    type CardType,
    type TopicWeight,
    type RawItem,
    type CardGenerationConfig,
} from './card-generation';

// ============== 数据质量类 Skills ==============

// 语言过滤
export {
    LanguageFilterSkill,
    languageFilter,
    type LanguageDetectionResult,
} from './language-filter';

// 身份验证
export {
    IdentityVerifierSkill,
    identityVerifier,
    type PersonContext as IdentityPersonContext,
    type ContentItem,
    type VerificationResult,
} from './identity-verifier';

// 质量评分
export {
    QualityScoringSkill,
    qualityScoring,
    type QualityScoreResult,
    type PersonForScoring,
    type ScoringConfig,
} from './quality-scoring';

// 内容验证
export {
    ContentValidationSkill,
    contentValidation,
    type NormalizedItem,
    type PersonContext as ValidationPersonContext,
    type ValidationResult,
    type ValidationReport,
    type ValidationConfig,
    type RejectedItem,
    type FixedItem,
    RejectionReason,
    FixableIssue,
    hashUrl,
    hashContent,
} from './content-validation';

// ============== 资源获取类 Skills ==============

// 头像获取
export {
    AvatarFetchSkill,
    avatarFetch,
    type AvatarResult,
    type AvatarFetchConfig,
    type FetchAvatarParams,
} from './avatar-fetch';

// Logo 获取
export {
    LogoFetchSkill,
    logoFetch,
    type LogoResult,
    type LogoFetchConfig,
    type FetchLogoParams,
} from './logo-fetch';

// ============== 架构模式类 Skills ==============

// 路由代理
export {
    RouterAgentSkill,
    routerAgent,
    type SourceType,
    type PersonContext as RouterPersonContext,
    type OfficialLink,
    type SourceDecision,
    type SearchStrategy,
    type RouterDecision,
    type RouterInput,
} from './router-agent';
