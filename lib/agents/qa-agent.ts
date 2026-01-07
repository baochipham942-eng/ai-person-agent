/**
 * QA Agent - 质检代理
 * 
 * 对收集的数据进行质量把关：
 * 1. 身份验证 - 是否关于目标人物
 * 2. 内容相关性 - 是否与 AI/科技相关
 * 3. 数据完整性 - 必填字段检查
 * 4. 去重检查
 * 5. 自动修正 - 对可修复的问题尝试自动修正
 */

import { NormalizedItem, PersonContext, hashUrl, hashContent } from '../datasources/adapter';
import { isAboutPerson, PersonContext as IdentityContext } from '@/lib/utils/identity';

// ============== 类型定义 ==============

export enum QARejectionReason {
    WRONG_PERSON = 'wrong_person',
    IRRELEVANT_CONTENT = 'irrelevant',
    DUPLICATE = 'duplicate',
    INCOMPLETE = 'incomplete',
    LOW_QUALITY = 'low_quality',
    EMPTY_CONTENT = 'empty_content',
}

/** 可自动修复的问题类型 */
export enum FixableIssue {
    MISSING_URL_HASH = 'missing_url_hash',
    MISSING_CONTENT_HASH = 'missing_content_hash',
    INVALID_DATE = 'invalid_date',
    WHITESPACE_CONTENT = 'whitespace_content',
    MISSING_TITLE = 'missing_title',
}

export interface RejectedItem {
    item: NormalizedItem;
    reason: QARejectionReason;
    details: string;
}

export interface FixedItem {
    original: NormalizedItem;
    fixed: NormalizedItem;
    issues: FixableIssue[];
    fixes: string[];
}

export interface QAReport {
    total: number;
    approvedCount: number;
    rejectedCount: number;
    fixedCount: number;
    byReason: Record<QARejectionReason, number>;
    byFix: Record<FixableIssue, number>;
    bySource: Record<string, { approved: number; rejected: number; fixed: number }>;
}

export interface QAResult {
    approved: NormalizedItem[];
    rejected: RejectedItem[];
    fixed: FixedItem[];
    report: QAReport;
}

export interface QAConfig {
    confidenceThreshold: number;
    enableIdentityCheck: boolean;
    enableRelevanceCheck: boolean;
    enableDeduplication: boolean;
    enableAutoFix: boolean;
    minContentLength: number;
}

const DEFAULT_CONFIG: QAConfig = {
    confidenceThreshold: 50,
    enableIdentityCheck: true,
    enableRelevanceCheck: true,
    enableDeduplication: true,
    enableAutoFix: true,
    minContentLength: 20,
};

// ============== QA Agent 实现 ==============

export class QAAgent {
    readonly name = 'QA Agent';

    /**
     * 执行质量检查（含自动修正）
     */
    async check(
        items: NormalizedItem[],
        person: PersonContext,
        existingUrlHashes: Set<string> = new Set(),
        config: Partial<QAConfig> = {}
    ): Promise<QAResult> {
        const cfg = { ...DEFAULT_CONFIG, ...config };

        const approved: NormalizedItem[] = [];
        const rejected: RejectedItem[] = [];
        const fixed: FixedItem[] = [];
        const seenUrlHashes = new Set(existingUrlHashes);
        const seenContentHashes = new Set<string>();

        // 统计
        const byReason: Record<QARejectionReason, number> = {
            [QARejectionReason.WRONG_PERSON]: 0,
            [QARejectionReason.IRRELEVANT_CONTENT]: 0,
            [QARejectionReason.DUPLICATE]: 0,
            [QARejectionReason.INCOMPLETE]: 0,
            [QARejectionReason.LOW_QUALITY]: 0,
            [QARejectionReason.EMPTY_CONTENT]: 0,
        };

        const byFix: Record<FixableIssue, number> = {
            [FixableIssue.MISSING_URL_HASH]: 0,
            [FixableIssue.MISSING_CONTENT_HASH]: 0,
            [FixableIssue.INVALID_DATE]: 0,
            [FixableIssue.WHITESPACE_CONTENT]: 0,
            [FixableIssue.MISSING_TITLE]: 0,
        };

        const bySource: Record<string, { approved: number; rejected: number; fixed: number }> = {};

        for (const item of items) {
            // 初始化源统计
            if (!bySource[item.sourceType]) {
                bySource[item.sourceType] = { approved: 0, rejected: 0, fixed: 0 };
            }

            // Step 1: 尝试自动修正
            let processedItem = item;
            let fixResult: FixedItem | null = null;

            if (cfg.enableAutoFix) {
                fixResult = this.tryAutoFix(item);
                if (fixResult) {
                    processedItem = fixResult.fixed;
                    fixed.push(fixResult);
                    bySource[item.sourceType].fixed++;

                    // 统计修复类型
                    for (const issue of fixResult.issues) {
                        byFix[issue]++;
                    }
                }
            }

            // Step 2: 执行质量检查（使用修正后的 item）
            const rejection = this.runChecks(processedItem, person, seenUrlHashes, seenContentHashes, cfg);

            if (rejection) {
                rejected.push({
                    ...rejection,
                    item: processedItem, // 使用修正后的版本
                });
                byReason[rejection.reason]++;
                bySource[item.sourceType].rejected++;
            } else {
                approved.push(processedItem);
                bySource[item.sourceType].approved++;

                // 记录已见的 hash
                seenUrlHashes.add(processedItem.urlHash);
                seenContentHashes.add(processedItem.contentHash);
            }
        }

        const report: QAReport = {
            total: items.length,
            approvedCount: approved.length,
            rejectedCount: rejected.length,
            fixedCount: fixed.length,
            byReason,
            byFix,
            bySource,
        };

        console.log(`[QAAgent] Quality check completed:`);
        console.log(`  - Total: ${report.total}, Approved: ${report.approvedCount}, Fixed: ${report.fixedCount}, Rejected: ${report.rejectedCount}`);
        if (report.fixedCount > 0) {
            console.log(`  - Fixes applied:`, byFix);
        }
        if (report.rejectedCount > 0) {
            console.log(`  - Rejections by reason:`, byReason);
        }

        return { approved, rejected, fixed, report };
    }

    /**
     * 尝试自动修正可修复的问题
     * @returns FixedItem if any fixes were applied, null otherwise
     */
    private tryAutoFix(item: NormalizedItem): FixedItem | null {
        const issues: FixableIssue[] = [];
        const fixes: string[] = [];
        let fixedItem = { ...item };

        // 1. 修复缺失的 urlHash
        if (!item.urlHash && item.url) {
            fixedItem.urlHash = hashUrl(item.url);
            issues.push(FixableIssue.MISSING_URL_HASH);
            fixes.push(`Generated urlHash from URL: ${fixedItem.urlHash.slice(0, 8)}...`);
        }

        // 2. 修复缺失的 contentHash
        if (!item.contentHash && item.text) {
            fixedItem.contentHash = hashContent(item.text);
            issues.push(FixableIssue.MISSING_CONTENT_HASH);
            fixes.push(`Generated contentHash from text: ${fixedItem.contentHash.slice(0, 8)}...`);
        }

        // 3. 修复无效的日期
        if (item.publishedAt) {
            const dateValue = item.publishedAt;
            if (!(dateValue instanceof Date) || isNaN(dateValue.getTime())) {
                // 尝试解析字符串日期
                const parsed = this.parseDate(String(dateValue));
                if (parsed) {
                    fixedItem.publishedAt = parsed;
                    issues.push(FixableIssue.INVALID_DATE);
                    fixes.push(`Parsed date: ${String(dateValue)} -> ${parsed.toISOString()}`);
                } else {
                    // 无法解析，设为 null
                    fixedItem.publishedAt = null;
                    issues.push(FixableIssue.INVALID_DATE);
                    fixes.push(`Invalid date removed: ${String(dateValue)}`);
                }
            }
        }

        // 4. 修复内容中的多余空白
        if (item.text) {
            const trimmed = item.text.trim().replace(/\s+/g, ' ');
            if (trimmed !== item.text) {
                fixedItem.text = trimmed;
                // 重新计算 contentHash
                fixedItem.contentHash = hashContent(trimmed);
                issues.push(FixableIssue.WHITESPACE_CONTENT);
                fixes.push(`Normalized whitespace in content`);
            }
        }

        // 5. 修复缺失的 title（使用 text 的前 50 字符）
        if (!item.title && item.text) {
            const textPreview = item.text.slice(0, 50).trim();
            fixedItem.title = textPreview + (item.text.length > 50 ? '...' : '');
            issues.push(FixableIssue.MISSING_TITLE);
            fixes.push(`Generated title from text: "${fixedItem.title}"`);
        }

        // 如果有任何修复，返回结果
        if (issues.length > 0) {
            console.log(`[QAAgent] Auto-fixed ${issues.length} issues for: ${item.url?.slice(0, 50)}...`);
            return {
                original: item,
                fixed: fixedItem,
                issues,
                fixes,
            };
        }

        return null;
    }

    /**
     * 尝试解析各种格式的日期
     */
    private parseDate(dateStr: string): Date | null {
        if (!dateStr) return null;

        // 尝试多种格式
        const formats = [
            // ISO 格式
            () => new Date(dateStr),
            // YYYY-MM-DD
            () => {
                const match = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                if (match) return new Date(+match[1], +match[2] - 1, +match[3]);
                return null;
            },
            // Month DD, YYYY (e.g., "December 27, 2024")
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
            // DD/MM/YYYY or MM/DD/YYYY - 假设 MM/DD/YYYY
            () => {
                const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (match) return new Date(+match[3], +match[1] - 1, +match[2]);
                return null;
            },
        ];

        for (const parser of formats) {
            try {
                const result = parser();
                if (result && !isNaN(result.getTime())) {
                    // 验证年份合理性（1900-2100）
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

    /**
     * 执行所有检查
     */
    private runChecks(
        item: NormalizedItem,
        person: PersonContext,
        seenUrlHashes: Set<string>,
        seenContentHashes: Set<string>,
        cfg: QAConfig
    ): RejectedItem | null {
        // 1. 完整性检查 - 必填字段（自动修复后仍缺失则拒绝）
        if (!item.url) {
            return {
                item,
                reason: QARejectionReason.INCOMPLETE,
                details: 'Missing required field: url',
            };
        }

        if (!item.urlHash) {
            return {
                item,
                reason: QARejectionReason.INCOMPLETE,
                details: 'Missing urlHash (auto-fix failed)',
            };
        }

        if (!item.contentHash) {
            return {
                item,
                reason: QARejectionReason.INCOMPLETE,
                details: 'Missing contentHash (auto-fix failed)',
            };
        }

        // 2. 空内容检查
        if (!item.text || item.text.trim().length < cfg.minContentLength) {
            return {
                item,
                reason: QARejectionReason.EMPTY_CONTENT,
                details: `Content too short: ${item.text?.length || 0} chars (min: ${cfg.minContentLength})`,
            };
        }

        // 3. 去重检查 - URL
        if (cfg.enableDeduplication && seenUrlHashes.has(item.urlHash)) {
            return {
                item,
                reason: QARejectionReason.DUPLICATE,
                details: `Duplicate URL hash: ${item.urlHash}`,
            };
        }

        // 4. 去重检查 - 内容（防止同一内容不同 URL）
        if (cfg.enableDeduplication && seenContentHashes.has(item.contentHash)) {
            return {
                item,
                reason: QARejectionReason.DUPLICATE,
                details: `Duplicate content hash: ${item.contentHash}`,
            };
        }

        // 5. 身份验证 - 是否关于目标人物
        if (cfg.enableIdentityCheck && !item.isOfficial) {
            const identityContext: IdentityContext = {
                name: person.name,
                englishName: person.englishName || person.name,
                aliases: person.aliases,
                organizations: person.organizations,
                occupations: person.occupations,
            };

            const textToCheck = `${item.title} ${item.text}`;
            if (!isAboutPerson(textToCheck, identityContext)) {
                return {
                    item,
                    reason: QARejectionReason.WRONG_PERSON,
                    details: `Content does not appear to be about ${person.name}`,
                };
            }
        }

        // 6. 内容相关性检查 - AI/科技相关
        if (cfg.enableRelevanceCheck) {
            if (!this.isAIRelevant(item)) {
                return {
                    item,
                    reason: QARejectionReason.IRRELEVANT_CONTENT,
                    details: 'Content not related to AI/tech',
                };
            }
        }

        // 7. 置信度检查
        if (item.confidence < cfg.confidenceThreshold) {
            return {
                item,
                reason: QARejectionReason.LOW_QUALITY,
                details: `Confidence ${item.confidence} below threshold ${cfg.confidenceThreshold}`,
            };
        }

        return null;
    }

    /**
     * 检查内容是否与 AI/科技相关
     */
    private isAIRelevant(item: NormalizedItem): boolean {
        // 官方来源默认相关
        if (item.isOfficial) return true;

        // 学术论文默认相关
        if (item.sourceType === 'openalex') return true;

        // GitHub 仓库默认相关
        if (item.sourceType === 'github') return true;

        // 职业数据默认相关
        if (item.sourceType === 'career') return true;

        const text = `${item.title} ${item.text}`.toLowerCase();

        // AI/科技关键词
        const aiKeywords = [
            'ai', 'artificial intelligence', 'machine learning', 'deep learning',
            'neural network', 'llm', 'large language model', 'gpt', 'claude', 'gemini',
            'transformer', 'nlp', 'natural language', 'computer vision',
            'openai', 'anthropic', 'google', 'microsoft', 'meta', 'nvidia',
            'algorithm', 'model', 'training', 'inference', 'api',
            '人工智能', '机器学习', '深度学习', '大模型', '神经网络',
            'tech', 'technology', 'startup', 'software', 'engineering',
        ];

        // 至少匹配一个关键词
        return aiKeywords.some(keyword => text.includes(keyword));
    }
}

// 导出单例
export const qaAgent = new QAAgent();

