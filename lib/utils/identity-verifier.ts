/**
 * Identity Verifier - 身份验证工具
 * 用于验证抓取的数据是否属于目标人物，防止同名污染
 */

export interface PersonContext {
    name: string;
    qid?: string; // Wikidata QID
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

// 负面信号关键词（表明内容可能属于同名异人）
const NEGATIVE_SIGNALS: Record<string, string[]> = {
    entertainment: ['演员', '歌手', '明星', 'actor', 'singer', 'celebrity', 'music video', 'MV'],
    sports: ['运动员', '足球', '篮球', '滑板', 'athlete', 'soccer', 'basketball', 'skateboard', 'golf'],
    history: ['皇帝', '历史', '古代', '朝代', 'emperor', 'dynasty', 'ancient', 'historical'],
    gaming: ['游戏', 'gaming', 'vlog', 'vlogger', 'gameplay', 'let\'s play'],
    comedy: ['脱口秀', 'stand-up', 'comedy', 'comedian', '相声'],
    drama: ['电视剧', '剧集', 'drama', 'TV series', '预告', 'trailer'],
};

// AI/Tech 正面信号关键词
const POSITIVE_SIGNALS = [
    // AI/ML
    'AI', 'ML', 'machine learning', 'deep learning', 'neural network', 'transformer',
    'LLM', 'GPT', 'NLP', 'computer vision', '人工智能', '机器学习', '深度学习',
    // Roles
    'researcher', 'scientist', 'engineer', 'professor', 'CEO', 'CTO', 'founder',
    '研究员', '科学家', '工程师', '教授', '创始人',
    // Companies
    'OpenAI', 'Google', 'DeepMind', 'Anthropic', 'Microsoft', 'Meta', 'NVIDIA',
    'Tsinghua', 'Stanford', 'MIT', 'Berkeley', 'CMU',
];

/**
 * 验证内容是否属于目标人物
 */
export function verifyIdentity(person: PersonContext, item: ContentItem): VerificationResult {
    const signals: string[] = [];
    let confidence = 0.5; // 基础置信度

    const searchText = `${item.title} ${item.description || ''} ${item.authorBio || ''}`.toLowerCase();

    // 1. Wikidata QID 匹配（最强信号）
    if (person.qid && searchText.includes(person.qid.toLowerCase())) {
        signals.push('qid_match');
        confidence += 0.4;
    }

    // 2. 机构名匹配
    for (const org of person.organization) {
        if (org && searchText.includes(org.toLowerCase())) {
            signals.push(`org_match:${org}`);
            confidence += 0.15;
            break;
        }
    }

    // 3. 职业关键词匹配
    for (const occ of person.occupation) {
        if (occ && searchText.includes(occ.toLowerCase())) {
            signals.push(`occupation_match:${occ}`);
            confidence += 0.1;
            break;
        }
    }

    // 4. 正面信号检测
    for (const signal of POSITIVE_SIGNALS) {
        if (searchText.includes(signal.toLowerCase())) {
            signals.push(`positive:${signal}`);
            confidence += 0.05;
            break; // 只加一次
        }
    }

    // 5. 负面信号检测
    let rejectionReason: string | undefined;
    for (const [category, keywords] of Object.entries(NEGATIVE_SIGNALS)) {
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

    // 限制置信度范围
    confidence = Math.max(0, Math.min(1, confidence));

    return {
        isMatch: confidence >= 0.5 && !rejectionReason,
        confidence,
        matchedSignals: signals,
        rejectionReason
    };
}

/**
 * 批量验证并过滤内容
 */
export function filterVerifiedItems<T extends ContentItem>(
    person: PersonContext,
    items: T[],
    threshold: number = 0.5
): T[] {
    return items.filter(item => {
        const result = verifyIdentity(person, item);
        if (!result.isMatch || result.confidence < threshold) {
            console.log(`[IdentityVerifier] Filtered: "${item.title?.slice(0, 50)}..." (conf: ${result.confidence.toFixed(2)}, reason: ${result.rejectionReason || 'low confidence'})`);
            return false;
        }
        return true;
    });
}

/**
 * 生成增强的搜索查询词
 * 在原始名字基础上添加职业/机构限定词
 */
export function buildEnhancedQuery(person: PersonContext): string {
    const parts = [person.name];

    // 添加最相关的机构
    if (person.organization.length > 0) {
        parts.push(person.organization[0]);
    }

    // 添加职业关键词
    if (person.occupation.length > 0) {
        const relevantOccupation = person.occupation.find(o =>
            POSITIVE_SIGNALS.some(s => o.toLowerCase().includes(s.toLowerCase()))
        );
        if (relevantOccupation) {
            parts.push(relevantOccupation);
        }
    }

    return parts.join(' ');
}
