/**
 * 质量评分工具
 * 计算人物数据的完整度和质量分数
 */

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
    officialLinks: any[];
    rawPoolItems?: { sourceType: string }[];
    cards?: any[];
    updatedAt?: Date | string;
}

/**
 * 计算质量分数
 */
export function calculateQualityScore(person: PersonForScoring): QualityScoreResult {
    const missingFields: string[] = [];

    // 1. 基础信息 (30分)
    let basicInfo = 0;
    if (person.avatarUrl) basicInfo += 7.5; else missingFields.push('头像');
    if (person.description) basicInfo += 7.5; else missingFields.push('简介');
    if (person.occupation?.length) basicInfo += 7.5; else missingFields.push('职业');
    if (person.organization?.length) basicInfo += 7.5; else missingFields.push('机构');

    // 2. 官方链接 (20分)
    let officialLinks = 0;
    const links = person.officialLinks || [];
    const hasX = links.some((l: any) => l.type === 'x' || l.type === 'twitter');
    const hasGitHub = links.some((l: any) => l.type === 'github');
    const hasWebsite = links.some((l: any) => l.type === 'website' || l.type === 'official');

    if (hasX) officialLinks += 10; else missingFields.push('X链接');
    if (hasGitHub) officialLinks += 5;
    if (hasWebsite) officialLinks += 5;

    // 3. 内容丰富度 (30分) - 分解为多个来源
    let contentRichness = 0;
    const items = person.rawPoolItems || [];
    const cards = person.cards || [];

    // X 推文 (6分)
    const xItems = items.filter(i => i.sourceType === 'x').length;
    contentRichness += Math.min(xItems / 10, 1) * 6;
    if (xItems === 0) missingFields.push('X推文');

    // YouTube 视频 (6分)
    const youtubeItems = items.filter(i => i.sourceType === 'youtube').length;
    contentRichness += Math.min(youtubeItems / 5, 1) * 6;
    if (youtubeItems === 0) missingFields.push('YouTube视频');

    // GitHub 项目 (6分)
    const githubItems = items.filter(i => i.sourceType === 'github').length;
    contentRichness += Math.min(githubItems / 3, 1) * 6;
    if (githubItems === 0) missingFields.push('GitHub项目');

    // 论文 (6分)
    const paperItems = items.filter(i => i.sourceType === 'paper' || i.sourceType === 'openalex').length;
    contentRichness += Math.min(paperItems / 5, 1) * 6;
    if (paperItems === 0) missingFields.push('学术论文');

    // 学习卡片 (6分)
    contentRichness += Math.min(cards.length / 10, 1) * 6;
    if (cards.length === 0) missingFields.push('学习卡片');

    // 4. 数据新鲜度 (20分)
    let freshness = 20;
    if (person.updatedAt) {
        const daysSinceUpdate = (Date.now() - new Date(person.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        freshness = Math.max(0, 20 - daysSinceUpdate / 7 * 5); // 每周降 5 分
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
export function getGradeColor(grade: string): string {
    switch (grade) {
        case 'A': return 'text-green-600 bg-green-100';
        case 'B': return 'text-blue-600 bg-blue-100';
        case 'C': return 'text-yellow-600 bg-yellow-100';
        case 'D': return 'text-orange-600 bg-orange-100';
        case 'F': return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100';
    }
}
