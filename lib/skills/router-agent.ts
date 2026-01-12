/**
 * Router Agent Skill
 *
 * 智能路由决策能力：
 * - 分析人物特征
 * - 决定启用哪些数据源
 * - 设置数据源优先级
 * - 构建搜索策略
 */

// ============== 类型定义 ==============

export type SourceType = 'exa' | 'x' | 'youtube' | 'github' | 'openalex' | 'career' | 'podcast' | 'baike' | 'perplexity';

export interface PersonContext {
    name: string;
    englishName?: string;
    aliases: string[];
    organizations: string[];
    occupations: string[];
}

export interface OfficialLink {
    type: string;
    url: string;
    handle?: string;
}

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

export interface RouterInput {
    person: PersonContext;
    officialLinks: OfficialLink[];
    orcid?: string;
    qid?: string;
}

// ============== Skill 实现 ==============

export class RouterAgentSkill {
    /**
     * 分析人物特征并生成路由决策
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

        // 1. Exa 搜索 - 通用
        enabledSources.push({
            source: 'exa',
            priority: 'high',
            params: { seedDomains },
            reason: '通用网页搜索',
        });

        // 2. X - 需要 handle
        if (xHandle) {
            enabledSources.push({
                source: 'x',
                priority: 'high',
                params: { handle: xHandle },
                reason: `有 X 账号 @${xHandle}`,
            });
        }

        // 3. YouTube
        if (youtubeChannelId) {
            enabledSources.push({
                source: 'youtube',
                priority: 'high',
                params: { channelId: youtubeChannelId },
                reason: '有官方 YouTube 频道',
            });
        } else {
            enabledSources.push({
                source: 'youtube',
                priority: 'medium',
                params: {},
                reason: '搜索模式',
            });
        }

        // 4. GitHub
        if (githubUsername) {
            enabledSources.push({
                source: 'github',
                priority: isTechFounder ? 'high' : 'medium',
                params: { handle: githubUsername },
                reason: `有 GitHub 账号 ${githubUsername}`,
            });
        }

        // 5. OpenAlex
        if (orcid) {
            enabledSources.push({
                source: 'openalex',
                priority: isAcademic ? 'high' : 'medium',
                params: { orcid },
                reason: `有 ORCID ${orcid}`,
            });
        }

        // 6. Career (Wikidata)
        if (qid) {
            enabledSources.push({
                source: 'career',
                priority: 'high',
                params: { qid },
                reason: `有 Wikidata QID ${qid}`,
            });
        }

        // 7. Podcast
        enabledSources.push({
            source: 'podcast',
            priority: isAcademic ? 'low' : 'medium',
            params: {},
            reason: isAcademic ? '学术人物播客较少' : '搜索播客',
        });

        // 8. 百度百科
        if (isChinese) {
            enabledSources.push({
                source: 'baike',
                priority: 'medium',
                params: {},
                reason: '中国人物补充',
            });
        }

        // 生成搜索策略
        const searchStrategy = this.buildSearchStrategy(person, isChinese);

        // 设置置信度阈值
        const confidenceThreshold = isAcademic ? 70 : isTechFounder ? 60 : 50;

        return {
            enabledSources,
            searchStrategy,
            confidenceThreshold,
        };
    }

    /**
     * 获取高优先级数据源
     */
    getHighPrioritySources(decision: RouterDecision): SourceDecision[] {
        return decision.enabledSources.filter(s => s.priority === 'high');
    }

    /**
     * 获取所有启用的数据源类型
     */
    getEnabledSourceTypes(decision: RouterDecision): SourceType[] {
        return decision.enabledSources.map(s => s.source);
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
        const chineseRegex = /[\u4e00-\u9fff]/;
        const hasChineseName = chineseRegex.test(person.name);
        const hasChineseAlias = person.aliases.some(a => chineseRegex.test(a));

        return hasChineseName || hasChineseAlias;
    }

    /**
     * 构建搜索策略
     */
    private buildSearchStrategy(person: PersonContext, isChinese: boolean): SearchStrategy {
        const primaryName = person.englishName || person.name;

        const alternativeNames = [
            ...person.aliases,
            person.englishName && person.name !== person.englishName ? person.name : null,
        ].filter(Boolean) as string[];

        const contextKeywords = [
            ...person.organizations,
            ...person.occupations,
            'AI', 'artificial intelligence', 'machine learning',
        ];

        const excludeTerms: string[] = [];

        // 常见名字排除
        const commonNames = ['sam', 'john', 'michael', 'david', 'james'];
        const firstName = primaryName.split(' ')[0]?.toLowerCase();
        if (commonNames.includes(firstName)) {
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

// 导出默认实例
export const routerAgent = new RouterAgentSkill();
