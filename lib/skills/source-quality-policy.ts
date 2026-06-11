export type SourceQualityAction = 'accept' | 'demote' | 'review' | 'reject';

export type SourceQualityFlag =
    | 'official_source'
    | 'empty_content'
    | 'thin_content'
    | 'search_or_index_page'
    | 'download_shell'
    | 'generic_company_or_product_page'
    | 'directory_or_profile_page'
    | 'missing_person_name'
    | 'weak_context_match'
    | 'name_collision_risk'
    | 'strong_context_match';

export interface SourceQualityItem {
    sourceType: string;
    url: string;
    title?: string | null;
    text?: string | null;
    isOfficial?: boolean;
    metadata?: Record<string, unknown> | null;
}

export interface SourceQualityPersonContext {
    name: string;
    englishName?: string;
    aliases?: string[];
    organizations?: string[];
    occupations?: string[];
    topics?: string[];
    currentTitle?: string | null;
}

export interface SourceQualityDecision {
    action: SourceQualityAction;
    score: number;
    flags: SourceQualityFlag[];
    reasons: string[];
    matched: {
        names: string[];
        organizations: string[];
        occupations: string[];
        topics: string[];
    };
}

const AI_TOPIC_TERMS = [
    'ai',
    'artificial intelligence',
    'machine learning',
    'deep learning',
    'large language model',
    'llm',
    'generative ai',
    'foundation model',
    'transformer',
    'neural network',
    'computer vision',
    'nlp',
    'openai',
    'anthropic',
    'deepmind',
    '人工智能',
    '机器学习',
    '深度学习',
    '大模型',
    '大语言模型',
    '神经网络',
];

const SEARCH_PAGE_TERMS = [
    'search results',
    'site search',
    'query results',
    '搜索结果',
    '检索结果',
];

const DOWNLOAD_SHELL_TERMS = [
    'download the white paper',
    'white paper',
    'download',
    'loading',
    'unable to preview',
    'please complete verification',
    'single page mode',
    'double page mode',
    '白皮书',
    '彩页',
    '下载',
    '无法预览',
    '请完成验证',
    '单页模式',
    '双页模式',
];

const DIRECTORY_TERMS = [
    'faculty',
    'people',
    'profile',
    'team',
    'staff',
    'directory',
    'speaker',
    'author',
    '师资',
    '教师',
    '名录',
    '团队',
    '个人主页',
];

const COMPANY_PRODUCT_TERMS = [
    'product',
    'platform',
    'api',
    'sdk',
    'solution',
    'solutions',
    'press release',
    'company',
    'team',
    'model card',
    '产品',
    '平台',
    '解决方案',
    '公司',
    '团队',
    '模型',
];

const FIRST_NAME_ALIASES: Record<string, string[]> = {
    alexander: ['alex'],
    alexandr: ['alex'],
};

function compactText(value: unknown): string {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function lower(value: unknown): string {
    return compactText(value).toLowerCase();
}

function uniq(values: string[]): string[] {
    return [...new Set(values.map(compactText).filter(Boolean))];
}

function wordsFromCurrentTitle(currentTitle?: string | null): string[] {
    if (!currentTitle) return [];
    return currentTitle
        .split(/[@,;/|()]+/)
        .map(compactText)
        .filter((part) => part.length >= 3);
}

function nameAliases(name: string): string[] {
    const value = compactText(name);
    const match = value.match(/^([A-Za-z]+)\s+(.+)$/);
    if (!match) return [];

    const first = match[1].toLowerCase();
    const rest = match[2];
    return (FIRST_NAME_ALIASES[first] || []).map((alias) => `${alias} ${rest}`);
}

function variantsForPerson(person: SourceQualityPersonContext): {
    names: string[];
    organizations: string[];
    occupations: string[];
    topics: string[];
} {
    const baseNames = [
        person.name,
        person.englishName || '',
        ...(person.aliases || []),
    ];
    const names = uniq([
        ...baseNames,
        ...baseNames.flatMap(nameAliases),
    ]);

    const organizations = uniq([
        ...(person.organizations || []),
        ...wordsFromCurrentTitle(person.currentTitle),
    ]).filter((value) => value.length >= 2);

    const occupations = uniq(person.occupations || []).filter((value) => value.length >= 3);
    const topics = uniq([...(person.topics || []), ...AI_TOPIC_TERMS]).filter((value) => value.length >= 2);

    return { names, organizations, occupations, topics };
}

function includesVariant(text: string, variant: string): boolean {
    const value = lower(variant);
    if (!value) return false;

    if (/^[a-z0-9 .'-]+$/.test(value)) {
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
    }

    return text.includes(value);
}

function matchedVariants(text: string, variants: string[]): string[] {
    return variants.filter((variant) => includesVariant(text, variant));
}

function countTermHits(text: string, terms: string[]): number {
    return terms.reduce((count, term) => count + (text.includes(lower(term)) ? 1 : 0), 0);
}

function urlSignals(url: string): { host: string; path: string; isSearchUrl: boolean } {
    try {
        const parsed = new URL(url);
        const host = lower(parsed.hostname.replace(/^www\./, ''));
        const path = lower(`${parsed.pathname} ${parsed.search}`);
        const isGoogleSearch =
            host === 'google.com' ||
            host.startsWith('scholar.google.') ||
            (host.endsWith('.google.com') && /\/search\b|\?q=|[?&]query=/.test(path));
        const isSearchUrl =
            isGoogleSearch ||
            /(^|\.)bing\./.test(host) ||
            /(^|\.)baidu\./.test(host) ||
            /duckduckgo\./.test(host) ||
            /\/search\b|\/s\b|\?q=|[?&]query=/.test(path);

        return { host, path, isSearchUrl };
    } catch {
        return { host: '', path: lower(url), isSearchUrl: false };
    }
}

function looksLikeDirectoryPage(titleTextUrl: string): boolean {
    return countTermHits(titleTextUrl, DIRECTORY_TERMS) > 0;
}

function looksLikeCompanyProductPage(titleTextUrl: string): boolean {
    return countTermHits(titleTextUrl, COMPANY_PRODUCT_TERMS) > 0;
}

function looksLikeDownloadShell(titleTextUrl: string): boolean {
    return countTermHits(titleTextUrl, DOWNLOAD_SHELL_TERMS) >= 2;
}

function isShortOrCollisionProneName(name: string): boolean {
    const value = compactText(name);
    if (!value) return false;
    if (/^[\u4e00-\u9fff]{2,3}$/.test(value)) return true;
    if (/^[a-z]+$/i.test(value) && value.length <= 6) return true;
    return false;
}

function appendFlag(flags: SourceQualityFlag[], flag: SourceQualityFlag): void {
    if (!flags.includes(flag)) flags.push(flag);
}

function decide(action: SourceQualityAction, score: number, flags: SourceQualityFlag[], reasons: string[], matched: SourceQualityDecision['matched']): SourceQualityDecision {
    return { action, score, flags, reasons, matched };
}

export function summarizeSourceQualityDecision(decision: SourceQualityDecision): Record<string, unknown> {
    return {
        action: decision.action,
        score: decision.score,
        flags: decision.flags,
        reasons: decision.reasons,
        matched: decision.matched,
    };
}

export function applySourceQualityMetadata<T extends SourceQualityItem>(
    item: T,
    decision: SourceQualityDecision
): T {
    const metadata = item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
        ? item.metadata
        : {};

    return {
        ...item,
        metadata: {
            ...metadata,
            sourceQuality: summarizeSourceQualityDecision(decision),
        },
    };
}

export function adjustConfidenceForSourceQuality(confidence: number | undefined, decision: SourceQualityDecision): number {
    const base = typeof confidence === 'number' ? confidence : 70;
    if (decision.action === 'accept') return base;
    if (decision.action === 'demote') return Math.min(base, 55);
    if (decision.action === 'review') return Math.min(base, 45);
    return Math.min(base, 10);
}

export function evaluateSourceQuality(
    item: SourceQualityItem,
    person: SourceQualityPersonContext
): SourceQualityDecision {
    const flags: SourceQualityFlag[] = [];
    const reasons: string[] = [];

    const title = compactText(item.title);
    const text = compactText(item.text);
    const combined = lower(`${title} ${text}`);
    const textUrl = lower(`${title} ${text} ${item.url}`);
    const isOfficial = item.isOfficial === true || item.metadata?.isOfficial === true;
    const variants = variantsForPerson(person);
    const matched = {
        names: matchedVariants(combined, variants.names),
        organizations: matchedVariants(combined, variants.organizations),
        occupations: matchedVariants(combined, variants.occupations),
        topics: matchedVariants(combined, variants.topics).slice(0, 8),
    };

    if (!text || text.length < 20) {
        appendFlag(flags, 'empty_content');
        reasons.push(`content too short: ${text.length}`);
        return decide('reject', 5, flags, reasons, matched);
    }

    if (text.length < 160) {
        appendFlag(flags, 'thin_content');
        reasons.push(`thin content: ${text.length}`);
    }

    if (isOfficial) {
        appendFlag(flags, 'official_source');
        return decide('accept', flags.includes('thin_content') ? 75 : 95, flags, reasons, matched);
    }

    if (item.sourceType !== 'exa') {
        return decide(flags.includes('thin_content') ? 'demote' : 'accept', flags.includes('thin_content') ? 55 : 80, flags, reasons, matched);
    }

    const urlInfo = urlSignals(item.url);
    const searchPage = urlInfo.isSearchUrl || countTermHits(textUrl, SEARCH_PAGE_TERMS) > 0;
    const downloadShell = looksLikeDownloadShell(textUrl);
    const directoryPage = looksLikeDirectoryPage(textUrl);
    const companyProductPage = looksLikeCompanyProductPage(textUrl);
    const hasPersonName = matched.names.length > 0;
    const hasStrongContext = matched.organizations.length > 0 || matched.occupations.length > 0;
    const hasTopicContext = matched.topics.length > 0;

    if (searchPage) {
        appendFlag(flags, 'search_or_index_page');
        reasons.push('search or index page');
    }

    if (downloadShell) {
        appendFlag(flags, 'download_shell');
        reasons.push('download or document shell');
    }

    if (directoryPage) {
        appendFlag(flags, 'directory_or_profile_page');
    }

    if (companyProductPage) {
        appendFlag(flags, 'generic_company_or_product_page');
    }

    if (!hasPersonName) {
        appendFlag(flags, 'missing_person_name');
        reasons.push('no target person name in title/content');
        return decide('reject', 15, flags, reasons, matched);
    }

    if (searchPage) {
        return decide('reject', 20, flags, reasons, matched);
    }

    if (downloadShell && !hasStrongContext) {
        return decide('reject', 25, flags, reasons, matched);
    }

    if (hasStrongContext) {
        appendFlag(flags, 'strong_context_match');
        return decide(flags.includes('thin_content') ? 'demote' : 'accept', flags.includes('thin_content') ? 65 : 85, flags, reasons, matched);
    }

    const collisionName = matched.names.find(isShortOrCollisionProneName);
    if (collisionName) {
        appendFlag(flags, 'name_collision_risk');
        reasons.push(`collision-prone name without org match: ${collisionName}`);
    }

    if (directoryPage || companyProductPage) {
        appendFlag(flags, 'weak_context_match');
        reasons.push('person name appears on a weak directory/company/product page without org match');
        return decide('review', 45, flags, reasons, matched);
    }

    if (hasTopicContext) {
        appendFlag(flags, 'weak_context_match');
        reasons.push('person name plus AI topic, but no org/role disambiguation');
        return decide('demote', 55, flags, reasons, matched);
    }

    appendFlag(flags, 'weak_context_match');
    reasons.push('person name appears without supporting org/topic/role context');
    return decide('review', 40, flags, reasons, matched);
}
