/**
 * 职业标签翻译与优化映射
 * 用于将 Wikidata 返回的职业翻译成更准确的中文显示
 */

// 英文 → 优化后的中文
export const OCCUPATION_MAP: Record<string, string> = {
    // 常见职业优化
    'businessperson': '企业家',
    'businessman': '企业家',
    'businesswoman': '企业家',
    'entrepreneur': '创业者',
    'notable person': '', // 隐藏，太泛了
    'human': '', // 隐藏
    'computer scientist': '计算机科学家',
    'software engineer': '软件工程师',
    'software developer': '软件工程师',
    'engineer': '工程师',
    'researcher': '研究员',
    'scientist': '科学家',
    'physicist': '物理学家',
    'mathematician': '数学家',
    'professor': '教授',
    'academic': '学者',
    'writer': '作家',
    'author': '作家',
    'investor': '投资人',
    'venture capitalist': '风险投资人',
    'programmer': '程序员',
    'coder': '程序员',
    'developer': '开发者',
    'executive': '高管',
    'CEO': 'CEO',
    'CTO': 'CTO',
    'founder': '创始人',
    'co-founder': '联合创始人',
    'director': '董事',
    'manager': '经理',
    'inventor': '发明家',
    'teacher': '教师',
    'lecturer': '讲师',
    'economist': '经济学家',
    'philosopher': '哲学家',
    'psychologist': '心理学家',
    'neuroscientist': '神经科学家',
    'artificial intelligence researcher': 'AI 研究员',
    'machine learning researcher': '机器学习研究员',
};

// 中文 → 优化后的中文 (修正 Wikidata 直译)
export const OCCUPATION_ZH_MAP: Record<string, string> = {
    '商人': '企业家',
    '软件工程师': '软件工程师',
    '知名人物': '', // 隐藏
    '人类': '', // 隐藏
    '商务人士': '企业家',
};

/**
 * 优化职业标签
 */
export function optimizeOccupation(occupation: string): string {
    // 先检查英文映射
    const lowerOcc = occupation.toLowerCase().trim();
    if (OCCUPATION_MAP[lowerOcc] !== undefined) {
        return OCCUPATION_MAP[lowerOcc];
    }

    // 检查中文映射
    if (OCCUPATION_ZH_MAP[occupation] !== undefined) {
        return OCCUPATION_ZH_MAP[occupation];
    }

    // 返回原值
    return occupation;
}

/**
 * 获取最佳职业标签（从列表中选择最合适的）
 */
export function getBestOccupation(occupations: string[]): string {
    if (!occupations || occupations.length === 0) {
        return '';
    }

    // 优化并过滤
    const optimized = occupations
        .map(optimizeOccupation)
        .filter(o => o.length > 0);

    // 返回第一个有效的
    return optimized[0] || '';
}
