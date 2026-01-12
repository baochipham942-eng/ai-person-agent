/**
 * Wikidata Search Skill
 *
 * 独立的 Wikidata 搜索能力，可用于：
 * - 搜索人物/实体
 * - 获取实体详情（QID、别名、描述、官方链接）
 * - 获取人物关系（导师、学生、合作者）
 */

import * as crypto from 'crypto';

// ============== 类型定义 ==============

export interface WikidataSearchResult {
    id: string;        // QID, e.g., "Q937"
    label: string;     // 显示名称
    description: string;
    aliases?: string[];
}

export interface WikidataEntity {
    qid: string;
    label: string;
    englishLabel?: string;
    description: string;
    aliases: string[];
    imageUrl?: string;
    occupation?: string[];
    organization?: string[];
    orcid?: string;
    officialLinks: OfficialLink[];
}

export interface OfficialLink {
    type: 'x' | 'youtube' | 'blog' | 'website' | 'linkedin' | 'github';
    url: string;
    handle?: string;
}

export interface PersonRelation {
    qid: string;
    label: string;
    relationType: 'advisor' | 'advisee' | 'cofounder' | 'colleague' | 'collaborator' | 'successor';
    description?: string;
}

export interface WikidataSearchConfig {
    apiUrl?: string;
    userAgent?: string;
    timeout?: number;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<WikidataSearchConfig> = {
    apiUrl: 'https://www.wikidata.org/w/api.php',
    userAgent: 'WikidataSearchSkill/1.0',
    timeout: 10000,
};

// ============== Skill 实现 ==============

export class WikidataSearchSkill {
    private config: Required<WikidataSearchConfig>;

    constructor(config: WikidataSearchConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 搜索 Wikidata 实体
     */
    async search(query: string, limit: number = 10): Promise<WikidataSearchResult[]> {
        const params = new URLSearchParams({
            action: 'wbsearchentities',
            search: query,
            language: 'en',
            uselang: 'en',
            type: 'item',
            limit: String(limit),
            format: 'json',
            origin: '*',
        });

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

            const response = await fetch(`${this.config.apiUrl}?${params}`, {
                signal: controller.signal,
                headers: { 'User-Agent': this.config.userAgent }
            });
            clearTimeout(timeoutId);

            const data = await response.json();

            if (!data.search) {
                return [];
            }

            return data.search.map((item: any) => ({
                id: item.id,
                label: item.label || item.id,
                description: item.description || '',
                aliases: item.aliases || [],
            }));
        } catch (error) {
            console.error('[WikidataSearch] Search error:', error);
            return [];
        }
    }

    /**
     * 获取实体详情
     */
    async getEntity(qid: string): Promise<WikidataEntity | null> {
        const params = new URLSearchParams({
            action: 'wbgetentities',
            ids: qid,
            languages: 'en|zh',
            props: 'labels|descriptions|aliases|claims|sitelinks',
            format: 'json',
            origin: '*',
        });

        try {
            const response = await fetch(`${this.config.apiUrl}?${params}`, {
                headers: { 'User-Agent': this.config.userAgent }
            });
            const data = await response.json();

            const entity = data.entities?.[qid];
            if (!entity) {
                return null;
            }

            const englishLabel = entity.labels?.en?.value;
            const label = englishLabel || entity.labels?.zh?.value || qid;
            const description = entity.descriptions?.en?.value || entity.descriptions?.zh?.value || '';

            const aliases: string[] = [
                ...(entity.aliases?.en?.map((a: any) => a.value) || []),
                ...(entity.aliases?.zh?.map((a: any) => a.value) || []),
            ];

            const imageValue = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
            const imageUrl = imageValue ? this.getWikimediaImageUrl(imageValue) : undefined;

            const occupation = await this.extractClaimLabels(entity.claims?.P106);
            const organization = await this.extractClaimLabels(entity.claims?.P108);

            const orcidValue = entity.claims?.P496?.[0]?.mainsnak?.datavalue?.value;
            const orcid = orcidValue ? String(orcidValue) : undefined;

            const officialLinks = this.extractOfficialLinks(entity.claims);

            return {
                qid,
                label,
                englishLabel,
                description,
                aliases: [...new Set(aliases)],
                imageUrl,
                occupation,
                organization,
                orcid,
                officialLinks,
            };
        } catch (error) {
            console.error('[WikidataSearch] getEntity error:', error);
            return null;
        }
    }

    /**
     * 获取人物关系
     */
    async getRelations(qid: string): Promise<PersonRelation[]> {
        const relations: PersonRelation[] = [];

        const params = new URLSearchParams({
            action: 'wbgetentities',
            ids: qid,
            languages: 'en|zh',
            props: 'claims',
            format: 'json',
            origin: '*',
        });

        try {
            const response = await fetch(`${this.config.apiUrl}?${params}`, {
                headers: { 'User-Agent': this.config.userAgent }
            });
            const data = await response.json();
            const entity = data.entities?.[qid];
            if (!entity) return [];

            // P185 - doctoral advisor
            const advisors = entity.claims?.P185 || [];
            for (const claim of advisors) {
                const advisorQid = claim.mainsnak?.datavalue?.value?.id;
                if (advisorQid) {
                    const label = await this.getEntityLabel(advisorQid);
                    relations.push({
                        qid: advisorQid,
                        label,
                        relationType: 'advisor',
                        description: '博士导师'
                    });
                }
            }

            // P802 - doctoral student
            const students = entity.claims?.P802 || [];
            for (const claim of students) {
                const studentQid = claim.mainsnak?.datavalue?.value?.id;
                if (studentQid) {
                    const label = await this.getEntityLabel(studentQid);
                    relations.push({
                        qid: studentQid,
                        label,
                        relationType: 'advisee',
                        description: '博士学生'
                    });
                }
            }

            // P1327 - partner
            const partners = entity.claims?.P1327 || [];
            for (const claim of partners) {
                const partnerQid = claim.mainsnak?.datavalue?.value?.id;
                if (partnerQid) {
                    const label = await this.getEntityLabel(partnerQid);
                    relations.push({
                        qid: partnerQid,
                        label,
                        relationType: 'collaborator',
                        description: '合作伙伴'
                    });
                }
            }

            return relations;
        } catch (error) {
            console.error('[WikidataSearch] getRelations error:', error);
            return [];
        }
    }

    private extractOfficialLinks(claims: any): OfficialLink[] {
        const links: OfficialLink[] = [];

        // P856 - official website
        const website = claims?.P856?.[0]?.mainsnak?.datavalue?.value;
        if (website) {
            links.push({ type: 'website', url: website });
        }

        // P2002 - Twitter/X username
        const twitterHandle = claims?.P2002?.[0]?.mainsnak?.datavalue?.value;
        if (twitterHandle) {
            links.push({
                type: 'x',
                url: `https://x.com/${twitterHandle}`,
                handle: `@${twitterHandle}`
            });
        }

        // P2397 - YouTube channel ID
        const youtubeId = claims?.P2397?.[0]?.mainsnak?.datavalue?.value;
        if (youtubeId) {
            links.push({
                type: 'youtube',
                url: `https://www.youtube.com/channel/${youtubeId}`,
                handle: youtubeId
            });
        }

        // P4003 - LinkedIn ID
        const linkedinId = claims?.P4003?.[0]?.mainsnak?.datavalue?.value;
        if (linkedinId) {
            links.push({
                type: 'linkedin',
                url: `https://www.linkedin.com/in/${linkedinId}`,
                handle: linkedinId
            });
        }

        // P2037 - GitHub username
        const githubUsername = claims?.P2037?.[0]?.mainsnak?.datavalue?.value;
        if (githubUsername) {
            links.push({
                type: 'github',
                url: `https://github.com/${githubUsername}`,
                handle: githubUsername
            });
        }

        return links;
    }

    private async extractClaimLabels(claimList: any[]): Promise<string[]> {
        if (!claimList || claimList.length === 0) return [];

        const qids = claimList
            .slice(0, 5)
            .map((c: any) => c.mainsnak?.datavalue?.value?.id)
            .filter(Boolean);

        if (qids.length === 0) return [];

        try {
            const params = new URLSearchParams({
                action: 'wbgetentities',
                ids: qids.join('|'),
                languages: 'en|zh',
                props: 'labels',
                format: 'json',
                origin: '*',
            });

            const response = await fetch(`${this.config.apiUrl}?${params}`, {
                headers: { 'User-Agent': this.config.userAgent }
            });
            const data = await response.json();

            return qids.map((qid: string) => {
                const entity = data.entities?.[qid];
                return entity?.labels?.en?.value
                    || entity?.labels?.zh?.value
                    || qid;
            });
        } catch {
            return qids;
        }
    }

    private async getEntityLabel(qid: string): Promise<string> {
        try {
            const params = new URLSearchParams({
                action: 'wbgetentities',
                ids: qid,
                languages: 'en|zh',
                props: 'labels',
                format: 'json',
                origin: '*',
            });

            const response = await fetch(`${this.config.apiUrl}?${params}`, {
                headers: { 'User-Agent': this.config.userAgent }
            });
            const data = await response.json();
            const entity = data.entities?.[qid];

            return entity?.labels?.en?.value
                || entity?.labels?.zh?.value
                || qid;
        } catch {
            return qid;
        }
    }

    private getWikimediaImageUrl(filename: string): string {
        const cleanName = filename.replace(/ /g, '_');
        const hash = crypto.createHash('md5').update(cleanName).digest('hex');
        return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash[0]}/${hash[0]}${hash[1]}/${encodeURIComponent(cleanName)}/200px-${encodeURIComponent(cleanName)}`;
    }
}

// 导出默认实例
export const wikidataSearch = new WikidataSearchSkill();
