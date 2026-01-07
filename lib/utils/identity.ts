/**
 * 人物身份验证工具
 * 用于过滤掉与目标人物无关的内容（避免抓错人）
 * 
 * v2: 增强版 - 支持机构名标准化、名字拆分匹配
 */

export interface PersonContext {
    name: string;
    englishName?: string;
    aliases?: string[];
    organizations?: string[];
    occupations?: string[];
}

// ============== 机构名标准化映射 ==============

const ORG_ALIASES: Record<string, string[]> = {
    'openai': ['open ai', 'open.ai', 'openai inc', 'openai, inc'],
    'google': ['google ai', 'google deepmind', 'deepmind', 'alphabet', 'google brain', 'google research'],
    'meta': ['meta ai', 'facebook', 'facebook ai', 'meta platforms', 'fair'],
    'microsoft': ['microsoft research', 'microsoft ai', 'msft'],
    'anthropic': ['anthropic ai', 'anthropic pbc'],
    'nvidia': ['nvidia ai', 'nvidia research'],
    'apple': ['apple ai', 'apple ml'],
    'amazon': ['amazon ai', 'aws ai', 'amazon web services'],
    'xai': ['x.ai', 'x ai'],
    'tesla': ['tesla ai', 'tesla autopilot'],
    'baidu': ['baidu ai', '百度', '百度研究院'],
    'alibaba': ['alibaba ai', '阿里巴巴', '阿里', '达摩院'],
    'tencent': ['tencent ai', '腾讯', '腾讯ai'],
    'bytedance': ['字节跳动', '字节', 'tiktok'],
    'huawei': ['华为', 'huawei ai', '华为诺亚方舟'],
    'stanford': ['stanford university', 'stanford ai', '斯坦福', 'stanford hai'],
    'mit': ['massachusetts institute of technology', 'mit ai', '麻省理工'],
    'berkeley': ['uc berkeley', 'berkeley ai', '伯克利', 'ucb'],
    'cmu': ['carnegie mellon', 'carnegie mellon university', '卡内基梅隆'],
    'tsinghua': ['清华', '清华大学', 'tsinghua university'],
    'peking': ['北大', '北京大学', 'peking university', 'pku'],
};

// 默认的 AI 相关关键词，用于辅助验证
const AI_KEYWORDS = [
    'ai', 'artificial intelligence', '人工智能',
    'machine learning', '机器学习',
    'deep learning', '深度学习',
    'llm', 'large language model', '大语言模型', '大模型',
    'gpt', 'transformer', 'neural network', '神经网络',
    'nlp', 'computer vision', '计算机视觉',
    'ceo', 'cto', 'founder', 'co-founder', 'chief',
    'researcher', '研究员', '科学家', 'scientist',
    'professor', '教授', 'phd', '博士',
    'startup', '创业', 'venture', 'vc',
    'tech', 'technology', '科技',
];

// ============== 辅助函数 ==============

/**
 * 标准化机构名：将变体映射到标准名
 */
function normalizeOrgName(org: string): string[] {
    const lowerOrg = org.toLowerCase().trim();

    // 返回原名 + 所有别名
    const results = [lowerOrg];

    for (const [canonical, aliases] of Object.entries(ORG_ALIASES)) {
        if (lowerOrg === canonical || aliases.includes(lowerOrg)) {
            results.push(canonical, ...aliases);
        }
    }

    return [...new Set(results)];
}

/**
 * 名字拆分匹配：检查名字的各个部分是否都出现在文本中
 * 如 "Yann LeCun" → 检查 "yann" 和 "lecun" 是否都出现
 */
function matchNameParts(text: string, fullName: string): boolean {
    const lowerText = text.toLowerCase();
    const parts = fullName.toLowerCase()
        .split(/[\s\-]+/)
        .filter(p => p.length >= 3); // 至少 3 个字符

    if (parts.length < 2) {
        return false; // 单名不用拆分匹配
    }

    // 严格模式：所有部分都必须出现
    const allMatch = parts.every(part => lowerText.includes(part));
    if (allMatch) {
        return true;
    }

    // 宽松模式：姓（通常是最后一个）+ 任意一个名必须出现
    const lastName = parts[parts.length - 1];
    const firstNames = parts.slice(0, -1);

    if (lastName.length >= 4 && lowerText.includes(lastName)) {
        // 姓匹配，检查是否有任意一个名也匹配
        if (firstNames.some(fn => fn.length >= 3 && lowerText.includes(fn))) {
            return true;
        }
    }

    return false;
}

/**
 * 检查中文名匹配（支持姓名颠倒、只有姓/名等情况）
 */
function matchChineseName(text: string, name: string): boolean {
    if (!name || name.length < 2) return false;

    // 完全匹配
    if (text.includes(name)) {
        return true;
    }

    // 中文名通常 2-4 个字，检查姓（第一个字）+ 名（后面的字）
    if (name.length >= 2 && name.length <= 4) {
        const surname = name[0];
        const givenName = name.slice(1);

        // 姓名都出现（可能不连续）
        if (text.includes(surname) && givenName.length >= 1 && text.includes(givenName)) {
            return true;
        }
    }

    return false;
}

// ============== 主函数 ==============

/**
 * 检查内容是否可能与目标人物相关
 * 
 * 匹配策略（按优先级）：
 * 1. 英文全名完全匹配
 * 2. 英文名拆分匹配（姓 + 名都出现）
 * 3. 中文名匹配
 * 4. 别名匹配
 * 5. 机构名匹配（支持别名标准化）
 * 6. 职业关键词匹配
 * 7. AI 关键词兜底（可选）
 * 
 * @param text 待检查的文本
 * @param context 人物上下文
 * @param options 配置选项
 */
export function isAboutPerson(
    text: string,
    context: PersonContext,
    options: { useAIKeywordFallback?: boolean } = {}
): boolean {
    const { useAIKeywordFallback = true } = options;

    if (!text || text.trim().length === 0) {
        return false;
    }

    const lowerText = text.toLowerCase();

    // 1. 检查英文名（完全匹配）
    if (context.englishName) {
        const englishNameLower = context.englishName.toLowerCase();
        if (lowerText.includes(englishNameLower)) {
            return true;
        }

        // 2. 英文名拆分匹配
        if (matchNameParts(lowerText, context.englishName)) {
            return true;
        }
    }

    // 3. 检查中文名
    if (context.name) {
        if (matchChineseName(text, context.name)) {
            return true;
        }
    }

    // 4. 检查别名
    if (context.aliases && context.aliases.length > 0) {
        for (const alias of context.aliases) {
            if (!alias || alias.length < 2) continue;

            // 英文别名
            if (/^[a-zA-Z\s\-]+$/.test(alias)) {
                if (lowerText.includes(alias.toLowerCase())) {
                    return true;
                }
                // 别名也尝试拆分匹配
                if (alias.includes(' ') && matchNameParts(lowerText, alias)) {
                    return true;
                }
            } else {
                // 中文别名
                if (matchChineseName(text, alias)) {
                    return true;
                }
            }
        }
    }

    // 5. 检查组织名（支持标准化别名）
    if (context.organizations && context.organizations.length > 0) {
        for (const org of context.organizations) {
            if (!org || org.length < 2) continue;

            const normalizedOrgs = normalizeOrgName(org);
            for (const normalizedOrg of normalizedOrgs) {
                if (lowerText.includes(normalizedOrg)) {
                    return true;
                }
            }
        }
    }

    // 6. 检查职业关键词
    if (context.occupations && context.occupations.length > 0) {
        for (const occ of context.occupations) {
            if (occ && occ.length > 2 && lowerText.includes(occ.toLowerCase())) {
                return true;
            }
        }
    }

    // 7. 兜底：AI 关键词
    if (useAIKeywordFallback) {
        const hasAIKeyword = AI_KEYWORDS.some(kw => lowerText.includes(kw));
        if (hasAIKeyword) {
            return true;
        }
    }

    return false;
}

/**
 * 批量过滤内容，只保留与目标人物相关的内容
 */
export function filterByIdentity<T>(
    items: T[],
    getText: (item: T) => string,
    context: PersonContext
): T[] {
    return items.filter(item => isAboutPerson(getText(item), context));
}

/**
 * 获取机构的所有别名（用于搜索扩展）
 */
export function getOrgAliases(org: string): string[] {
    return normalizeOrgName(org);
}

