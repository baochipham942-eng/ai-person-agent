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

// ============== 负面信号关键词（非AI领域） ==============
// 如果内容包含这些关键词且不包含目标人物的核心标识，则很可能是同名人物

const NEGATIVE_SIGNALS: Record<string, string[]> = {
    // 娱乐领域
    entertainment: [
        'actor', 'actress', '演员', '明星', 'celebrity', 'singer', '歌手',
        'musician', '音乐家', 'band', '乐队', 'movie star', '影星',
        'film', '电影', 'tv show', '电视剧', 'drama', '综艺',
        'grammy', 'oscar', '奥斯卡', 'emmy', 'golden globe',
    ],
    // 体育领域
    sports: [
        'athlete', '运动员', 'player', 'coach', '教练', 'team', '球队',
        'football', '足球', 'basketball', '篮球', 'soccer', 'baseball',
        'nba', 'nfl', 'mlb', 'fifa', 'olympics', '奥运',
        'championship', '冠军', 'league', '联赛',
    ],
    // 政治领域（非科技政策）
    politics: [
        'senator', '参议员', 'congressman', '国会议员', 'governor', '州长',
        'mayor', '市长', 'parliament', '议会', 'election', '选举',
        'campaign', '竞选', 'democrat', 'republican', '政党',
    ],
    // 历史/古代人物（只检测明确的历史角色词汇）
    historical: [
        'emperor', '皇帝', 'pharaoh', '法老',
        'dynasty', '王朝', 'ancient ruler', '古代统治者',
        '公元前', 'bc ', ' ad ',  // 注意空格，避免误匹配
    ],
    // 农业/生物领域（除非是AI+农业）
    agriculture: [
        'botanist', '植物学家', 'agricultural', '农业', 'farming', '种植',
        'crop', '作物', 'livestock', '畜牧', 'botanical garden', '植物园',
    ],
    // 医学领域（除非是AI+医疗）
    medicine: [
        'surgeon', '外科医生', 'physician', '内科医生', 'nurse', '护士',
        'hospital', '医院', 'clinic', '诊所', 'patient', '患者',
        'surgery', '手术', 'treatment', '治疗',
    ],
};

// 需要结合 AI 关键词才有效的领域（这些领域可能与 AI 交叉）
const CROSSOVER_DOMAINS = ['medicine', 'agriculture'];

// ============== 时间线验证规则 ==============

export interface TimelineEntry {
    organization: string;
    role: string;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    source?: string;
}

export interface TimelineValidationResult {
    isValid: boolean;
    score: number; // 0-1，越高越可信
    issues: string[];
}

/**
 * 验证时间线数据的合理性
 */
export function validateTimeline(entries: TimelineEntry[]): TimelineValidationResult {
    const issues: string[] = [];
    let score = 1.0;

    if (!entries || entries.length === 0) {
        return { isValid: true, score: 0.5, issues: ['无时间线数据'] };
    }

    const currentYear = new Date().getFullYear();

    // 解析年份
    const parseYear = (date: Date | string | null | undefined): number | null => {
        if (!date) return null;
        if (date instanceof Date) return date.getFullYear();
        const match = String(date).match(/(\d{4})/);
        return match ? parseInt(match[1]) : null;
    };

    // 检查每个条目
    for (const entry of entries) {
        const startYear = parseYear(entry.startDate);
        const endYear = parseYear(entry.endDate);
        const orgLower = entry.organization.toLowerCase();
        const roleLower = entry.role.toLowerCase();

        // 1. 检查年份合理性
        if (startYear !== null) {
            if (startYear < 1950) {
                issues.push(`起始年份过早: ${entry.organization} (${startYear})`);
                score -= 0.2;
            }
            if (startYear > currentYear + 1) {
                issues.push(`起始年份在未来: ${entry.organization} (${startYear})`);
                score -= 0.3;
            }
        }

        if (endYear !== null) {
            if (endYear > currentYear + 1) {
                issues.push(`结束年份在未来: ${entry.organization} (${endYear})`);
                score -= 0.2;
            }
            if (startYear !== null && endYear < startYear) {
                issues.push(`时间倒序: ${entry.organization} (${startYear}-${endYear})`);
                score -= 0.3;
            }
        }

        // 2. 检查负面信号
        for (const [domain, keywords] of Object.entries(NEGATIVE_SIGNALS)) {
            const hasNegative = keywords.some(kw =>
                orgLower.includes(kw) || roleLower.includes(kw)
            );
            if (hasNegative) {
                // 交叉领域需要更宽容
                if (CROSSOVER_DOMAINS.includes(domain)) {
                    issues.push(`可能的领域交叉: ${entry.organization} (${domain})`);
                    score -= 0.1;
                } else {
                    issues.push(`非AI领域机构/职位: ${entry.organization} - ${entry.role} (${domain})`);
                    score -= 0.25;
                }
            }
        }

        // 3. 检查教育经历的合理性
        const isEducation = ['student', '学生', 'undergraduate', 'graduate', 'phd', 'master', 'bachelor']
            .some(kw => roleLower.includes(kw));
        if (isEducation && !endYear) {
            // 教育经历通常应该有结束时间
            issues.push(`教育经历缺少结束时间: ${entry.organization}`);
            score -= 0.1;
        }
    }

    // 4. 检查时间重叠（全职工作）
    const fullTimeEntries = entries.filter(e => {
        const role = e.role.toLowerCase();
        return ['ceo', 'cto', 'president', 'director', 'vp', 'vice president', 'chief']
            .some(kw => role.includes(kw));
    });

    if (fullTimeEntries.length > 1) {
        // 检查是否有严重的时间重叠
        for (let i = 0; i < fullTimeEntries.length; i++) {
            for (let j = i + 1; j < fullTimeEntries.length; j++) {
                const a = fullTimeEntries[i];
                const b = fullTimeEntries[j];
                const aStart = parseYear(a.startDate);
                const aEnd = parseYear(a.endDate) || currentYear;
                const bStart = parseYear(b.startDate);
                const bEnd = parseYear(b.endDate) || currentYear;

                if (aStart && bStart) {
                    const overlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
                    if (overlap > 2) {
                        issues.push(`全职职位时间重叠超过2年: ${a.organization} 与 ${b.organization}`);
                        score -= 0.2;
                    }
                }
            }
        }
    }

    // 5. 检查数据来源可信度
    const lowQualitySources = ['llm_extraction', 'AI_RECRAWL', 'MULTI_SOURCE_RECRAWL'];
    const sourceCounts = entries.reduce((acc, e) => {
        const src = e.source || 'unknown';
        acc[src] = (acc[src] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    for (const src of lowQualitySources) {
        if (sourceCounts[src] && sourceCounts[src] > entries.length * 0.5) {
            issues.push(`超过50%数据来自低质量来源: ${src}`);
            score -= 0.15;
        }
    }

    return {
        isValid: score >= 0.5,
        score: Math.max(0, Math.min(1, score)),
        issues,
    };
}

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
 * 检测内容是否包含非AI领域的负面信号
 * 返回检测到的负面领域列表
 */
function detectNegativeSignals(text: string): string[] {
    const lowerText = text.toLowerCase();
    const detected: string[] = [];

    for (const [domain, keywords] of Object.entries(NEGATIVE_SIGNALS)) {
        const hasSignal = keywords.some(kw => lowerText.includes(kw));
        if (hasSignal) {
            detected.push(domain);
        }
    }

    return detected;
}

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
 * 额外检查：
 * - 负面信号检测：如果内容包含非AI领域信号（娱乐/体育/历史等），
 *   且没有强身份匹配（名字+机构），则拒绝
 *
 * @param text 待检查的文本
 * @param context 人物上下文
 * @param options 配置选项
 */
export function isAboutPerson(
    text: string,
    context: PersonContext,
    options: { useAIKeywordFallback?: boolean; strictMode?: boolean } = {}
): boolean {
    const { useAIKeywordFallback = true, strictMode = false } = options;

    if (!text || text.trim().length === 0) {
        return false;
    }

    const lowerText = text.toLowerCase();

    // 首先检测负面信号
    const negativeSignals = detectNegativeSignals(text);
    const hasNegativeSignals = negativeSignals.length > 0;

    // 强匹配标志
    let hasStrongMatch = false;

    // 1. 检查英文名（完全匹配）
    if (context.englishName) {
        const englishNameLower = context.englishName.toLowerCase();
        if (lowerText.includes(englishNameLower)) {
            hasStrongMatch = true;
            // 如果没有负面信号，直接返回 true
            if (!hasNegativeSignals) {
                return true;
            }
        }

        // 2. 英文名拆分匹配
        if (matchNameParts(lowerText, context.englishName)) {
            hasStrongMatch = true;
            if (!hasNegativeSignals) {
                return true;
            }
        }
    }

    // 3. 检查中文名
    if (context.name) {
        if (matchChineseName(text, context.name)) {
            hasStrongMatch = true;
            if (!hasNegativeSignals) {
                return true;
            }
        }
    }

    // 4. 检查别名
    if (context.aliases && context.aliases.length > 0) {
        for (const alias of context.aliases) {
            if (!alias || alias.length < 2) continue;

            // 英文别名
            if (/^[a-zA-Z\s\-]+$/.test(alias)) {
                if (lowerText.includes(alias.toLowerCase())) {
                    hasStrongMatch = true;
                    if (!hasNegativeSignals) return true;
                }
                // 别名也尝试拆分匹配
                if (alias.includes(' ') && matchNameParts(lowerText, alias)) {
                    hasStrongMatch = true;
                    if (!hasNegativeSignals) return true;
                }
            } else {
                // 中文别名
                if (matchChineseName(text, alias)) {
                    hasStrongMatch = true;
                    if (!hasNegativeSignals) return true;
                }
            }
        }
    }

    // 5. 检查组织名（支持标准化别名）
    let hasOrgMatch = false;
    if (context.organizations && context.organizations.length > 0) {
        for (const org of context.organizations) {
            if (!org || org.length < 2) continue;

            const normalizedOrgs = normalizeOrgName(org);
            for (const normalizedOrg of normalizedOrgs) {
                if (lowerText.includes(normalizedOrg)) {
                    hasOrgMatch = true;
                    if (!hasNegativeSignals) {
                        return true;
                    }
                    break;
                }
            }
            if (hasOrgMatch) break;
        }
    }

    // 如果有负面信号，需要同时有强身份匹配（名字）+ 机构匹配才能通过
    if (hasNegativeSignals) {
        // 严格模式：有负面信号直接拒绝
        if (strictMode) {
            return false;
        }
        // 宽松模式：需要名字 + 机构同时匹配
        if (hasStrongMatch && hasOrgMatch) {
            // 交叉领域（医疗、农业）需要额外的 AI 关键词
            const onlyCrossover = negativeSignals.every(s => CROSSOVER_DOMAINS.includes(s));
            if (onlyCrossover) {
                const hasAIKeyword = AI_KEYWORDS.some(kw => lowerText.includes(kw));
                return hasAIKeyword;
            }
            // 非交叉领域，即使名字+机构匹配也拒绝
            return false;
        }
        return false;
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
 * 检查内容的身份匹配度评分（用于排序）
 * 返回 0-1 的分数
 */
export function getIdentityScore(text: string, context: PersonContext): number {
    if (!text || text.trim().length === 0) return 0;

    const lowerText = text.toLowerCase();
    let score = 0;

    // 名字匹配 +0.4
    if (context.englishName && lowerText.includes(context.englishName.toLowerCase())) {
        score += 0.4;
    } else if (context.englishName && matchNameParts(lowerText, context.englishName)) {
        score += 0.3;
    }
    if (context.name && matchChineseName(text, context.name)) {
        score += 0.3;
    }

    // 机构匹配 +0.3
    if (context.organizations) {
        for (const org of context.organizations) {
            if (!org) continue;
            const normalizedOrgs = normalizeOrgName(org);
            if (normalizedOrgs.some(no => lowerText.includes(no))) {
                score += 0.3;
                break;
            }
        }
    }

    // AI 关键词 +0.2
    if (AI_KEYWORDS.some(kw => lowerText.includes(kw))) {
        score += 0.2;
    }

    // 负面信号 -0.3
    const negativeSignals = detectNegativeSignals(text);
    if (negativeSignals.length > 0) {
        score -= 0.3 * negativeSignals.length;
    }

    return Math.max(0, Math.min(1, score));
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

