/**
 * Content Validation Skill
 *
 * 内容质量验证能力：
 * - 完整性检查
 * - 去重检查
 * - 自动修复
 * - 相关性过滤
 */

import * as crypto from 'crypto';

// ============== 类型定义 ==============

export interface NormalizedItem {
    url: string;
    urlHash: string;
    contentHash: string;
    title: string;
    text: string;
    sourceType: string;
    publishedAt?: Date | null;
    confidence: number;
    isOfficial?: boolean;
}

export interface PersonContext {
    name: string;
    englishName?: string;
    aliases: string[];
    organizations: string[];
    occupations: string[];
}

export enum RejectionReason {
    WRONG_PERSON = 'wrong_person',
    IRRELEVANT_CONTENT = 'irrelevant',
    DUPLICATE = 'duplicate',
    INCOMPLETE = 'incomplete',
    LOW_QUALITY = 'low_quality',
    EMPTY_CONTENT = 'empty_content',
}

export enum FixableIssue {
    MISSING_URL_HASH = 'missing_url_hash',
    MISSING_CONTENT_HASH = 'missing_content_hash',
    INVALID_DATE = 'invalid_date',
    WHITESPACE_CONTENT = 'whitespace_content',
    MISSING_TITLE = 'missing_title',
}

export interface RejectedItem {
    item: NormalizedItem;
    reason: RejectionReason;
    details: string;
}

export interface FixedItem {
    original: NormalizedItem;
    fixed: NormalizedItem;
    issues: FixableIssue[];
    fixes: string[];
}

export interface ValidationReport {
    total: number;
    approvedCount: number;
    rejectedCount: number;
    fixedCount: number;
    byReason: Record<RejectionReason, number>;
    byFix: Record<FixableIssue, number>;
}

export interface ValidationResult {
    approved: NormalizedItem[];
    rejected: RejectedItem[];
    fixed: FixedItem[];
    report: ValidationReport;
}

export interface ValidationConfig {
    confidenceThreshold?: number;
    enableIdentityCheck?: boolean;
    enableRelevanceCheck?: boolean;
    enableDeduplication?: boolean;
    enableAutoFix?: boolean;
    minContentLength?: number;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<ValidationConfig> = {
    confidenceThreshold: 50,
    enableIdentityCheck: true,
    enableRelevanceCheck: true,
    enableDeduplication: true,
    enableAutoFix: true,
    minContentLength: 20,
};

// ============== 工具函数 ==============

export function hashUrl(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
}

export function hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
}

// ============== Skill 实现 ==============

export class ContentValidationSkill {
    private config: Required<ValidationConfig>;

    constructor(config: ValidationConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 验证内容列表
     */
    validate(
        items: NormalizedItem[],
        person: PersonContext,
        existingUrlHashes: Set<string> = new Set()
    ): ValidationResult {
        const approved: NormalizedItem[] = [];
        const rejected: RejectedItem[] = [];
        const fixed: FixedItem[] = [];
        const seenUrlHashes = new Set(existingUrlHashes);
        const seenContentHashes = new Set<string>();

        const byReason: Record<RejectionReason, number> = {
            [RejectionReason.WRONG_PERSON]: 0,
            [RejectionReason.IRRELEVANT_CONTENT]: 0,
            [RejectionReason.DUPLICATE]: 0,
            [RejectionReason.INCOMPLETE]: 0,
            [RejectionReason.LOW_QUALITY]: 0,
            [RejectionReason.EMPTY_CONTENT]: 0,
        };

        const byFix: Record<FixableIssue, number> = {
            [FixableIssue.MISSING_URL_HASH]: 0,
            [FixableIssue.MISSING_CONTENT_HASH]: 0,
            [FixableIssue.INVALID_DATE]: 0,
            [FixableIssue.WHITESPACE_CONTENT]: 0,
            [FixableIssue.MISSING_TITLE]: 0,
        };

        for (const item of items) {
            // Step 1: 尝试自动修复
            let processedItem = item;
            let fixResult: FixedItem | null = null;

            if (this.config.enableAutoFix) {
                fixResult = this.tryAutoFix(item);
                if (fixResult) {
                    processedItem = fixResult.fixed;
                    fixed.push(fixResult);
                    for (const issue of fixResult.issues) {
                        byFix[issue]++;
                    }
                }
            }

            // Step 2: 执行检查
            const rejection = this.runChecks(processedItem, person, seenUrlHashes, seenContentHashes);

            if (rejection) {
                rejected.push({ ...rejection, item: processedItem });
                byReason[rejection.reason]++;
            } else {
                approved.push(processedItem);
                seenUrlHashes.add(processedItem.urlHash);
                seenContentHashes.add(processedItem.contentHash);
            }
        }

        return {
            approved,
            rejected,
            fixed,
            report: {
                total: items.length,
                approvedCount: approved.length,
                rejectedCount: rejected.length,
                fixedCount: fixed.length,
                byReason,
                byFix,
            },
        };
    }

    /**
     * 尝试自动修复
     */
    private tryAutoFix(item: NormalizedItem): FixedItem | null {
        const issues: FixableIssue[] = [];
        const fixes: string[] = [];
        const fixedItem = { ...item };

        // 1. 修复缺失的 urlHash
        if (!item.urlHash && item.url) {
            fixedItem.urlHash = hashUrl(item.url);
            issues.push(FixableIssue.MISSING_URL_HASH);
            fixes.push(`Generated urlHash: ${fixedItem.urlHash.slice(0, 8)}...`);
        }

        // 2. 修复缺失的 contentHash
        if (!item.contentHash && item.text) {
            fixedItem.contentHash = hashContent(item.text);
            issues.push(FixableIssue.MISSING_CONTENT_HASH);
            fixes.push(`Generated contentHash: ${fixedItem.contentHash.slice(0, 8)}...`);
        }

        // 3. 修复无效日期
        if (item.publishedAt) {
            const dateValue = item.publishedAt;
            if (!(dateValue instanceof Date) || isNaN(dateValue.getTime())) {
                const parsed = this.parseDate(String(dateValue));
                if (parsed) {
                    fixedItem.publishedAt = parsed;
                    issues.push(FixableIssue.INVALID_DATE);
                    fixes.push(`Parsed date: ${String(dateValue)} -> ${parsed.toISOString()}`);
                } else {
                    fixedItem.publishedAt = null;
                    issues.push(FixableIssue.INVALID_DATE);
                    fixes.push(`Invalid date removed`);
                }
            }
        }

        // 4. 修复空白内容
        if (item.text) {
            const trimmed = item.text.trim().replace(/\s+/g, ' ');
            if (trimmed !== item.text) {
                fixedItem.text = trimmed;
                fixedItem.contentHash = hashContent(trimmed);
                issues.push(FixableIssue.WHITESPACE_CONTENT);
                fixes.push(`Normalized whitespace`);
            }
        }

        // 5. 修复缺失标题
        if (!item.title && item.text) {
            const textPreview = item.text.slice(0, 50).trim();
            fixedItem.title = textPreview + (item.text.length > 50 ? '...' : '');
            issues.push(FixableIssue.MISSING_TITLE);
            fixes.push(`Generated title from text`);
        }

        if (issues.length > 0) {
            return { original: item, fixed: fixedItem, issues, fixes };
        }

        return null;
    }

    /**
     * 执行检查
     */
    private runChecks(
        item: NormalizedItem,
        person: PersonContext,
        seenUrlHashes: Set<string>,
        seenContentHashes: Set<string>
    ): Omit<RejectedItem, 'item'> | null {
        // 1. 完整性检查
        if (!item.url) {
            return { reason: RejectionReason.INCOMPLETE, details: 'Missing URL' };
        }
        if (!item.urlHash) {
            return { reason: RejectionReason.INCOMPLETE, details: 'Missing urlHash' };
        }
        if (!item.contentHash) {
            return { reason: RejectionReason.INCOMPLETE, details: 'Missing contentHash' };
        }

        // 2. 空内容检查
        if (!item.text || item.text.trim().length < this.config.minContentLength) {
            return { reason: RejectionReason.EMPTY_CONTENT, details: `Content too short: ${item.text?.length || 0}` };
        }

        // 3. URL 去重
        if (this.config.enableDeduplication && seenUrlHashes.has(item.urlHash)) {
            return { reason: RejectionReason.DUPLICATE, details: `Duplicate URL` };
        }

        // 4. 内容去重
        if (this.config.enableDeduplication && seenContentHashes.has(item.contentHash)) {
            return { reason: RejectionReason.DUPLICATE, details: `Duplicate content` };
        }

        // 5. 相关性检查
        if (this.config.enableRelevanceCheck && !item.isOfficial) {
            if (!this.isAIRelevant(item)) {
                return { reason: RejectionReason.IRRELEVANT_CONTENT, details: 'Not AI/tech related' };
            }
        }

        // 6. 置信度检查
        if (item.confidence < this.config.confidenceThreshold) {
            return { reason: RejectionReason.LOW_QUALITY, details: `Low confidence: ${item.confidence}` };
        }

        return null;
    }

    /**
     * 检查 AI 相关性
     */
    private isAIRelevant(item: NormalizedItem): boolean {
        if (item.isOfficial) return true;
        if (['openalex', 'github', 'career'].includes(item.sourceType)) return true;

        const text = `${item.title} ${item.text}`.toLowerCase();

        const aiKeywords = [
            'ai', 'artificial intelligence', 'machine learning', 'deep learning',
            'neural network', 'llm', 'large language model', 'gpt', 'claude', 'gemini',
            'transformer', 'nlp', 'natural language', 'computer vision',
            'openai', 'anthropic', 'google', 'microsoft', 'meta', 'nvidia',
            'algorithm', 'model', 'training', 'inference', 'api',
            '人工智能', '机器学习', '深度学习', '大模型', '神经网络',
            'tech', 'technology', 'startup', 'software', 'engineering',
        ];

        return aiKeywords.some(keyword => text.includes(keyword));
    }

    /**
     * 解析日期
     */
    private parseDate(dateStr: string): Date | null {
        if (!dateStr) return null;

        const formats = [
            () => new Date(dateStr),
            () => {
                const match = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                if (match) return new Date(+match[1], +match[2] - 1, +match[3]);
                return null;
            },
            () => {
                const match = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})?/i);
                if (match) {
                    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
                    const month = monthNames.indexOf(match[1].toLowerCase());
                    const day = +match[2];
                    const year = match[3] ? +match[3] : new Date().getFullYear();
                    return new Date(year, month, day);
                }
                return null;
            },
        ];

        for (const parser of formats) {
            try {
                const result = parser();
                if (result && !isNaN(result.getTime())) {
                    const year = result.getFullYear();
                    if (year >= 1900 && year <= 2100) {
                        return result;
                    }
                }
            } catch {
                continue;
            }
        }

        return null;
    }
}

// 导出默认实例
export const contentValidation = new ContentValidationSkill();
