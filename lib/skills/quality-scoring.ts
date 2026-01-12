/**
 * Quality Scoring Skill
 *
 * 数据质量评分能力：
 * - 计算 profile 完整度
 * - 生成评分等级 (A-F)
 * - 识别缺失字段
 */

// ============== 类型定义 ==============

export interface QualityScoreResult {
    total: number;           // 总分 (0-100)
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    breakdown: {
        basicInfo: number;     // 基础信息分 (0-30)
        officialLinks: number; // 官方链接分 (0-20)
        contentRichness: number; // 内容丰富度分 (0-30)
        freshness: number;     // 数据新鲜度分 (0-20)
    };
    missingFields: string[];
}

export interface PersonForScoring {
    avatarUrl: string | null;
    description: string | null;
    occupation: string[];
    organization: string[];
    officialLinks: { type: string }[];
    rawPoolItems?: { sourceType: string }[];
    cards?: any[];
    updatedAt?: Date | string;
}

export interface ScoringConfig {
    weights?: {
        basicInfo?: number;
        officialLinks?: number;
        contentRichness?: number;
        freshness?: number;
    };
    freshnessDecayDays?: number;
}

// ============== 默认配置 ==============

interface ResolvedWeights {
    basicInfo: number;
    officialLinks: number;
    contentRichness: number;
    freshness: number;
}

interface ResolvedConfig {
    weights: ResolvedWeights;
    freshnessDecayDays: number;
}

const DEFAULT_CONFIG: ResolvedConfig = {
    weights: {
        basicInfo: 30,
        officialLinks: 20,
        contentRichness: 30,
        freshness: 20,
    },
    freshnessDecayDays: 7,
};

// ============== Skill 实现 ==============

export class QualityScoringSkill {
    private config: ResolvedConfig;

    constructor(config: ScoringConfig = {}) {
        this.config = {
            weights: {
                basicInfo: config.weights?.basicInfo ?? DEFAULT_CONFIG.weights.basicInfo,
                officialLinks: config.weights?.officialLinks ?? DEFAULT_CONFIG.weights.officialLinks,
                contentRichness: config.weights?.contentRichness ?? DEFAULT_CONFIG.weights.contentRichness,
                freshness: config.weights?.freshness ?? DEFAULT_CONFIG.weights.freshness,
            },
            freshnessDecayDays: config.freshnessDecayDays ?? DEFAULT_CONFIG.freshnessDecayDays,
        };
    }

    /**
     * 计算质量分数
     */
    calculate(person: PersonForScoring): QualityScoreResult {
        const missingFields: string[] = [];
        const weights = this.config.weights;

        // 1. 基础信息
        let basicInfo = 0;
        const basicUnit = weights.basicInfo / 4;

        if (person.avatarUrl) basicInfo += basicUnit; else missingFields.push('头像');
        if (person.description) basicInfo += basicUnit; else missingFields.push('简介');
        if (person.occupation?.length) basicInfo += basicUnit; else missingFields.push('职业');
        if (person.organization?.length) basicInfo += basicUnit; else missingFields.push('机构');

        // 2. 官方链接
        let officialLinks = 0;
        const links = person.officialLinks || [];
        const hasX = links.some(l => l.type === 'x' || l.type === 'twitter');
        const hasGitHub = links.some(l => l.type === 'github');
        const hasWebsite = links.some(l => l.type === 'website' || l.type === 'official');

        if (hasX) officialLinks += weights.officialLinks * 0.5; else missingFields.push('X链接');
        if (hasGitHub) officialLinks += weights.officialLinks * 0.25;
        if (hasWebsite) officialLinks += weights.officialLinks * 0.25;

        // 3. 内容丰富度
        let contentRichness = 0;
        const items = person.rawPoolItems || [];
        const cards = person.cards || [];
        const contentUnit = weights.contentRichness / 5;

        const xItems = items.filter(i => i.sourceType === 'x').length;
        contentRichness += Math.min(xItems / 10, 1) * contentUnit;
        if (xItems === 0) missingFields.push('X推文');

        const youtubeItems = items.filter(i => i.sourceType === 'youtube').length;
        contentRichness += Math.min(youtubeItems / 5, 1) * contentUnit;
        if (youtubeItems === 0) missingFields.push('YouTube视频');

        const githubItems = items.filter(i => i.sourceType === 'github').length;
        contentRichness += Math.min(githubItems / 3, 1) * contentUnit;
        if (githubItems === 0) missingFields.push('GitHub项目');

        const paperItems = items.filter(i => i.sourceType === 'paper' || i.sourceType === 'openalex').length;
        contentRichness += Math.min(paperItems / 5, 1) * contentUnit;
        if (paperItems === 0) missingFields.push('学术论文');

        contentRichness += Math.min(cards.length / 10, 1) * contentUnit;
        if (cards.length === 0) missingFields.push('学习卡片');

        // 4. 数据新鲜度
        let freshness = weights.freshness;
        if (person.updatedAt) {
            const daysSinceUpdate = (Date.now() - new Date(person.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
            const decayPerWeek = weights.freshness * 0.25;
            freshness = Math.max(0, weights.freshness - (daysSinceUpdate / this.config.freshnessDecayDays) * decayPerWeek);
        }

        // 计算总分
        const total = Math.round(basicInfo + officialLinks + contentRichness + freshness);

        // 评级
        let grade: 'A' | 'B' | 'C' | 'D' | 'F';
        if (total >= 90) grade = 'A';
        else if (total >= 70) grade = 'B';
        else if (total >= 50) grade = 'C';
        else if (total >= 30) grade = 'D';
        else grade = 'F';

        return {
            total,
            grade,
            breakdown: {
                basicInfo: Math.round(basicInfo),
                officialLinks: Math.round(officialLinks),
                contentRichness: Math.round(contentRichness),
                freshness: Math.round(freshness)
            },
            missingFields
        };
    }

    /**
     * 获取评分等级颜色
     */
    getGradeColor(grade: string): string {
        switch (grade) {
            case 'A': return 'text-green-600 bg-green-100';
            case 'B': return 'text-blue-600 bg-blue-100';
            case 'C': return 'text-yellow-600 bg-yellow-100';
            case 'D': return 'text-orange-600 bg-orange-100';
            case 'F': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    }

    /**
     * 获取评分描述
     */
    getGradeDescription(grade: string): string {
        switch (grade) {
            case 'A': return '优秀 - 数据完整且新鲜';
            case 'B': return '良好 - 基本完整，有少量缺失';
            case 'C': return '一般 - 有较多数据缺失';
            case 'D': return '较差 - 数据严重不完整';
            case 'F': return '很差 - 几乎没有有效数据';
            default: return '未知';
        }
    }

    /**
     * 批量评分
     */
    calculateBatch(persons: PersonForScoring[]): QualityScoreResult[] {
        return persons.map(p => this.calculate(p));
    }

    /**
     * 获取改进建议
     */
    getImprovementSuggestions(result: QualityScoreResult): string[] {
        const suggestions: string[] = [];

        if (result.missingFields.includes('头像')) {
            suggestions.push('添加头像以提升辨识度');
        }
        if (result.missingFields.includes('简介')) {
            suggestions.push('补充人物简介');
        }
        if (result.missingFields.includes('X链接')) {
            suggestions.push('添加 X/Twitter 链接以获取最新动态');
        }
        if (result.breakdown.freshness < 10) {
            suggestions.push('数据已过时，建议刷新');
        }
        if (result.breakdown.contentRichness < 15) {
            suggestions.push('内容较少，建议抓取更多数据源');
        }

        return suggestions;
    }
}

// 导出默认实例
export const qualityScoring = new QualityScoringSkill();
