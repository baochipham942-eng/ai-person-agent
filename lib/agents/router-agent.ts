/**
 * Router Agent - 分流主代理
 * 
 * 根据人物特征，智能决定：
 * 1. 启用哪些数据源
 * 2. 每个数据源的优先级
 * 3. 搜索策略（关键词、排除词等）
 */

import { SourceType, PersonContext } from '../datasources/adapter';

// ============== 类型定义 ==============

export interface SourceDecision {
    source: SourceType;
    priority: 'high' | 'medium' | 'low';
    params?: Record<string, unknown>;
    reason: string;
}

export interface SearchStrategy {
    primaryName: string;
    alternativeNames: string[];
    contextKeywords: string[];
    excludeTerms: string[];
}

export interface RouterDecision {
    enabledSources: SourceDecision[];
    searchStrategy: SearchStrategy;
    confidenceThreshold: number;
}

export interface OfficialLink {
    type: string;
    url: string;
    handle?: string;
}

export interface RouterInput {
    person: PersonContext;
    officialLinks: OfficialLink[];
    orcid?: string;
    qid?: string;
}

// ============== Router Agent 实现 ==============

export class RouterAgent {
    readonly name = 'Router Agent';

    /**
     * 分析人物特征并生成获取决策
     */
    analyze(input: RouterInput): RouterDecision {
        const { person, officialLinks, orcid, qid } = input;

        const enabledSources: SourceDecision[] = [];

        // 提取官方链接信息
        const xHandle = officialLinks.find(l => l.type === 'x')?.handle?.replace('@', '');
        const youtubeChannelId = officialLinks.find(l => l.type === 'youtube')?.handle;
        const githubUsername = officialLinks.find(l => l.type === 'github')?.handle;
        const seedDomains = officialLinks
            .filter(l => l.type === 'website' || l.type === 'blog')
            .map(l => {
                try { return new URL(l.url).hostname; } catch { return null; }
            })
            .filter(Boolean) as string[];

        // 判断人物类型
        const isAcademic = this.isAcademicPerson(person, orcid);
        const isTechFounder = this.isTechFounder(person);
        const isChinese = this.isChinesePerson(person);

        // === 1. Exa 搜索 - 通用，几乎总是启用 ===
        enabledSources.push({
            source: 'exa',
            priority: 'high',
            params: { seedDomains },
            reason: '通用网页搜索，覆盖面广',
        });

        // === 2. Grok/X - 需要 xHandle ===
        if (xHandle) {
            enabledSources.push({
                source: 'x',
                priority: 'high',
                params: { handle: xHandle },
                reason: `有 X 账号 @${xHandle}`,
            });
        }

        // === 3. YouTube ===
        if (youtubeChannelId) {
            enabledSources.push({
                source: 'youtube',
                priority: 'high',
                params: { channelId: youtubeChannelId },
                reason: `有官方 YouTube 频道`,
            });
        } else {
            // 搜索模式 - 降低优先级
            enabledSources.push({
                source: 'youtube',
                priority: 'medium',
                params: {},
                reason: '搜索模式，需要额外验证',
            });
        }

        // === 4. GitHub - 需要 username ===
        if (githubUsername) {
            enabledSources.push({
                source: 'github',
                priority: isTechFounder ? 'high' : 'medium',
                params: { handle: githubUsername },
                reason: `有 GitHub 账号 ${githubUsername}`,
            });
        }

        // === 5. OpenAlex - 需要 ORCID 或学术背景 ===
        if (orcid) {
            enabledSources.push({
                source: 'openalex',
                priority: isAcademic ? 'high' : 'medium',
                params: { orcid },
                reason: `有 ORCID ${orcid}`,
            });
        }

        // === 6. Career (Wikidata) - 需要 QID ===
        if (qid) {
            enabledSources.push({
                source: 'career',
                priority: 'high',
                params: { qid },
                reason: `有 Wikidata QID ${qid}`,
            });
        }

        // === 7. Podcast - 中等优先级 ===
        enabledSources.push({
            source: 'podcast',
            priority: isAcademic ? 'low' : 'medium',
            params: {},
            reason: isAcademic ? '学术人物播客较少' : '搜索相关播客',
        });

        // === 8. 百度百科 - 中国人物的补充 ===
        if (isChinese) {
            enabledSources.push({
                source: 'baike',
                priority: 'medium',
                params: {},
                reason: '中国人物，使用百度百科补充',
            });
        }

        // 生成搜索策略
        const searchStrategy = this.buildSearchStrategy(person, isChinese);

        // 根据人物类型设置置信度阈值
        const confidenceThreshold = isAcademic ? 70 : isTechFounder ? 60 : 50;

        console.log(`[RouterAgent] Decision for ${person.name}:`);
        console.log(`  - Type: ${isAcademic ? 'Academic' : isTechFounder ? 'TechFounder' : 'General'}`);
        console.log(`  - Sources: ${enabledSources.map(s => `${s.source}(${s.priority})`).join(', ')}`);
        console.log(`  - Confidence threshold: ${confidenceThreshold}`);

        return {
            enabledSources,
            searchStrategy,
            confidenceThreshold,
        };
    }

    /**
     * 判断是否为学术人物
     */
    private isAcademicPerson(person: PersonContext, orcid?: string): boolean {
        if (orcid) return true;

        const academicKeywords = [
            'professor', 'researcher', 'scientist', 'phd', 'doctor',
            '教授', '研究员', '科学家', '博士',
        ];

        const occupations = person.occupations.map(o => o.toLowerCase()).join(' ');
        return academicKeywords.some(k => occupations.includes(k));
    }

    /**
     * 判断是否为科技创业者
     */
    private isTechFounder(person: PersonContext): boolean {
        const founderKeywords = [
            'founder', 'ceo', 'cto', 'entrepreneur', 'co-founder',
            '创始人', '首席执行官', '首席技术官',
        ];

        const techOrgs = [
            'openai', 'anthropic', 'google', 'microsoft', 'meta', 'tesla', 'nvidia',
            'deepmind', 'xai', 'stability', 'midjourney', 'hugging face',
        ];

        const occupations = person.occupations.map(o => o.toLowerCase()).join(' ');
        const orgs = person.organizations.map(o => o.toLowerCase()).join(' ');

        const isFounder = founderKeywords.some(k => occupations.includes(k));
        const isTechOrg = techOrgs.some(t => orgs.includes(t));

        return isFounder || isTechOrg;
    }

    /**
     * 判断是否为中国人物
     */
    private isChinesePerson(person: PersonContext): boolean {
        // 检查名字是否包含中文字符
        const chineseRegex = /[\u4e00-\u9fff]/;
        const hasChineseName = chineseRegex.test(person.name);

        // 或者别名中包含中文
        const hasChineseAlias = person.aliases.some(a => chineseRegex.test(a));

        return hasChineseName || hasChineseAlias;
    }

    /**
     * 构建搜索策略
     */
    private buildSearchStrategy(person: PersonContext, isChinese: boolean): SearchStrategy {
        const primaryName = person.englishName || person.name;

        // 收集所有可能的名字变体
        const alternativeNames = [
            ...person.aliases,
            person.englishName && person.name !== person.englishName ? person.name : null,
        ].filter(Boolean) as string[];

        // 根据组织生成上下文关键词
        const contextKeywords = [
            ...person.organizations,
            ...person.occupations,
            'AI', 'artificial intelligence', 'machine learning',
        ];

        // 排除常见的同名误匹配词
        const excludeTerms: string[] = [];

        // 如果是常见名字，添加排除词
        const commonNames = ['sam', 'john', 'michael', 'david', 'james'];
        const firstName = primaryName.split(' ')[0]?.toLowerCase();
        if (commonNames.includes(firstName)) {
            // 排除非科技领域的内容
            excludeTerms.push('sports', 'music', 'actor', 'politician');
        }

        return {
            primaryName,
            alternativeNames,
            contextKeywords,
            excludeTerms,
        };
    }
}

// 导出单例
export const routerAgent = new RouterAgent();
