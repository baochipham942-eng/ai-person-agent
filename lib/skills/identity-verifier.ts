/**
 * Identity Verifier Skill
 *
 * 身份验证能力，用于验证抓取的数据是否属于目标人物：
 * - 多信号置信度评分
 * - 正面/负面信号检测
 * - 批量验证过滤
 */

// ============== 类型定义 ==============

export interface PersonContext {
    name: string;
    qid?: string;
    occupation: string[];
    organization: string[];
    aliases?: string[];
}

export interface ContentItem {
    title: string;
    description?: string;
    authorName?: string;
    authorBio?: string;
    url?: string;
}

export interface VerificationResult {
    isMatch: boolean;
    confidence: number;
    matchedSignals: string[];
    rejectionReason?: string;
}

// ============== 信号配置 ==============

const NEGATIVE_SIGNALS: Record<string, string[]> = {
    entertainment: ['演员', '歌手', '明星', 'actor', 'singer', 'celebrity', 'music video', 'MV'],
    sports: ['运动员', '足球', '篮球', '滑板', 'athlete', 'soccer', 'basketball', 'skateboard', 'golf'],
    history: ['皇帝', '历史', '古代', '朝代', 'emperor', 'dynasty', 'ancient', 'historical'],
    gaming: ['游戏', 'gaming', 'vlog', 'vlogger', 'gameplay', 'let\'s play'],
    comedy: ['脱口秀', 'stand-up', 'comedy', 'comedian', '相声'],
    drama: ['电视剧', '剧集', 'drama', 'TV series', '预告', 'trailer'],
};

const POSITIVE_SIGNALS = [
    'AI', 'ML', 'machine learning', 'deep learning', 'neural network', 'transformer',
    'LLM', 'GPT', 'NLP', 'computer vision', '人工智能', '机器学习', '深度学习',
    'researcher', 'scientist', 'engineer', 'professor', 'CEO', 'CTO', 'founder',
    '研究员', '科学家', '工程师', '教授', '创始人',
    'OpenAI', 'Google', 'DeepMind', 'Anthropic', 'Microsoft', 'Meta', 'NVIDIA',
    'Tsinghua', 'Stanford', 'MIT', 'Berkeley', 'CMU',
];

// ============== Skill 实现 ==============

export class IdentityVerifierSkill {
    private positiveSignals: string[];
    private negativeSignals: Record<string, string[]>;

    constructor(
        positiveSignals: string[] = POSITIVE_SIGNALS,
        negativeSignals: Record<string, string[]> = NEGATIVE_SIGNALS
    ) {
        this.positiveSignals = positiveSignals;
        this.negativeSignals = negativeSignals;
    }

    /**
     * 验证内容是否属于目标人物
     */
    verify(person: PersonContext, item: ContentItem): VerificationResult {
        const signals: string[] = [];
        let confidence = 0.5;

        const searchText = `${item.title} ${item.description || ''} ${item.authorBio || ''}`.toLowerCase();

        // 1. QID 匹配
        if (person.qid && searchText.includes(person.qid.toLowerCase())) {
            signals.push('qid_match');
            confidence += 0.4;
        }

        // 2. 机构匹配
        for (const org of person.organization) {
            if (org && searchText.includes(org.toLowerCase())) {
                signals.push(`org_match:${org}`);
                confidence += 0.15;
                break;
            }
        }

        // 3. 职业匹配
        for (const occ of person.occupation) {
            if (occ && searchText.includes(occ.toLowerCase())) {
                signals.push(`occupation_match:${occ}`);
                confidence += 0.1;
                break;
            }
        }

        // 4. 正面信号
        for (const signal of this.positiveSignals) {
            if (searchText.includes(signal.toLowerCase())) {
                signals.push(`positive:${signal}`);
                confidence += 0.05;
                break;
            }
        }

        // 5. 负面信号
        let rejectionReason: string | undefined;
        for (const [category, keywords] of Object.entries(this.negativeSignals)) {
            for (const keyword of keywords) {
                if (searchText.includes(keyword.toLowerCase())) {
                    signals.push(`negative:${category}:${keyword}`);
                    confidence -= 0.3;
                    rejectionReason = `Detected ${category} content: "${keyword}"`;
                    break;
                }
            }
            if (rejectionReason) break;
        }

        // 6. 作者名匹配
        if (item.authorName) {
            const authorLower = item.authorName.toLowerCase();
            const nameLower = person.name.toLowerCase();
            const aliases = person.aliases?.map(a => a.toLowerCase()) || [];

            if (authorLower.includes(nameLower) || aliases.some(a => authorLower.includes(a))) {
                signals.push('author_name_match');
                confidence += 0.1;
            }
        }

        confidence = Math.max(0, Math.min(1, confidence));

        return {
            isMatch: confidence >= 0.5 && !rejectionReason,
            confidence,
            matchedSignals: signals,
            rejectionReason
        };
    }

    /**
     * 批量验证并过滤
     */
    filter<T extends ContentItem>(
        person: PersonContext,
        items: T[],
        threshold: number = 0.5
    ): T[] {
        return items.filter(item => {
            const result = this.verify(person, item);
            if (!result.isMatch || result.confidence < threshold) {
                console.log(`[IdentityVerifier] Filtered: "${item.title?.slice(0, 50)}..." (conf: ${result.confidence.toFixed(2)}, reason: ${result.rejectionReason || 'low confidence'})`);
                return false;
            }
            return true;
        });
    }

    /**
     * 生成增强的搜索查询
     */
    buildEnhancedQuery(person: PersonContext): string {
        const parts = [person.name];

        if (person.organization.length > 0) {
            parts.push(person.organization[0]);
        }

        if (person.occupation.length > 0) {
            const relevantOccupation = person.occupation.find(o =>
                this.positiveSignals.some(s => o.toLowerCase().includes(s.toLowerCase()))
            );
            if (relevantOccupation) {
                parts.push(relevantOccupation);
            }
        }

        return parts.join(' ');
    }

    /**
     * 添加自定义正面信号
     */
    addPositiveSignals(signals: string[]): void {
        this.positiveSignals.push(...signals);
    }

    /**
     * 添加自定义负面信号
     */
    addNegativeSignals(category: string, signals: string[]): void {
        if (!this.negativeSignals[category]) {
            this.negativeSignals[category] = [];
        }
        this.negativeSignals[category].push(...signals);
    }
}

// 导出默认实例
export const identityVerifier = new IdentityVerifierSkill();
