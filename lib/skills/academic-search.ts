/**
 * Academic Search Skill (OpenAlex)
 *
 * 学术论文搜索能力：
 * - 搜索作者
 * - 获取论文列表
 * - 通过 ORCID 查找作者
 */

// ============== 类型定义 ==============

export interface AcademicWork {
    id: string;
    title: string;
    abstract?: string;
    publicationDate: string;
    citationCount: number;
    venue?: string;
    doi?: string;
    url?: string;
    authors: string[];
}

export interface AcademicAuthor {
    id: string;
    displayName: string;
    orcid?: string;
    worksCount: number;
    citedByCount: number;
    affiliations: string[];
}

export interface AcademicSearchConfig {
    apiUrl?: string;
    politeEmail?: string;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<AcademicSearchConfig> = {
    apiUrl: 'https://api.openalex.org',
    politeEmail: 'academic-search-skill@example.com',
};

// ============== Skill 实现 ==============

export class AcademicSearchSkill {
    private config: Required<AcademicSearchConfig>;

    constructor(config: AcademicSearchConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 搜索作者
     */
    async searchAuthor(name: string): Promise<AcademicAuthor[]> {
        try {
            const params = new URLSearchParams({
                search: name,
                per_page: '5',
                mailto: this.config.politeEmail,
            });

            const response = await fetch(`${this.config.apiUrl}/authors?${params}`);

            if (!response.ok) {
                console.error('[AcademicSearch] Search error:', await response.text());
                return [];
            }

            const data = await response.json();
            const results = data.results || [];

            return results.map((author: any) => ({
                id: author.id,
                displayName: author.display_name || '',
                orcid: author.orcid,
                worksCount: author.works_count || 0,
                citedByCount: author.cited_by_count || 0,
                affiliations: (author.affiliations || [])
                    .slice(0, 3)
                    .map((a: any) => a.institution?.display_name)
                    .filter(Boolean),
            }));
        } catch (error) {
            console.error('[AcademicSearch] searchAuthor error:', error);
            return [];
        }
    }

    /**
     * 获取作者的论文列表
     */
    async getAuthorWorks(
        authorId: string,
        options: {
            limit?: number;
            since?: Date;
        } = {}
    ): Promise<AcademicWork[]> {
        const limit = options.limit || 20;

        try {
            const cleanId = authorId.replace('https://openalex.org/', '');

            let filter = `author.id:${cleanId}`;
            if (options.since) {
                const fromDate = options.since.toISOString().split('T')[0];
                filter += `,from_publication_date:${fromDate}`;
            }

            const params = new URLSearchParams({
                filter,
                sort: 'cited_by_count:desc',
                per_page: String(limit),
                mailto: this.config.politeEmail,
            });

            const response = await fetch(`${this.config.apiUrl}/works?${params}`);

            if (!response.ok) {
                console.error('[AcademicSearch] getWorks error:', await response.text());
                return [];
            }

            const data = await response.json();
            const results = data.results || [];

            return results.map((work: any) => ({
                id: work.id,
                title: work.title || '',
                abstract: work.abstract_inverted_index
                    ? this.invertedIndexToText(work.abstract_inverted_index)
                    : undefined,
                publicationDate: work.publication_date || '',
                citationCount: work.cited_by_count || 0,
                venue: work.primary_location?.source?.display_name,
                doi: work.doi,
                url: work.doi ? `https://doi.org/${work.doi.replace('https://doi.org/', '')}` : work.id,
                authors: (work.authorships || [])
                    .slice(0, 5)
                    .map((a: any) => a.author?.display_name)
                    .filter(Boolean),
            }));
        } catch (error) {
            console.error('[AcademicSearch] getAuthorWorks error:', error);
            return [];
        }
    }

    /**
     * 通过 ORCID 获取作者
     */
    async getAuthorByOrcid(orcid: string): Promise<AcademicAuthor | null> {
        try {
            const cleanOrcid = orcid.replace('https://orcid.org/', '');
            const response = await fetch(
                `${this.config.apiUrl}/authors/orcid:${cleanOrcid}?mailto=${this.config.politeEmail}`
            );

            if (!response.ok) {
                return null;
            }

            const author = await response.json();

            return {
                id: author.id,
                displayName: author.display_name || '',
                orcid: author.orcid,
                worksCount: author.works_count || 0,
                citedByCount: author.cited_by_count || 0,
                affiliations: (author.affiliations || [])
                    .slice(0, 3)
                    .map((a: any) => a.institution?.display_name)
                    .filter(Boolean),
            };
        } catch (error) {
            console.error('[AcademicSearch] getAuthorByOrcid error:', error);
            return null;
        }
    }

    /**
     * 搜索论文
     */
    async searchWorks(
        query: string,
        options: {
            limit?: number;
            since?: Date;
        } = {}
    ): Promise<AcademicWork[]> {
        const limit = options.limit || 20;

        try {
            let filter = '';
            if (options.since) {
                const fromDate = options.since.toISOString().split('T')[0];
                filter = `from_publication_date:${fromDate}`;
            }

            const params = new URLSearchParams({
                search: query,
                sort: 'cited_by_count:desc',
                per_page: String(limit),
                mailto: this.config.politeEmail,
            });

            if (filter) {
                params.set('filter', filter);
            }

            const response = await fetch(`${this.config.apiUrl}/works?${params}`);

            if (!response.ok) {
                console.error('[AcademicSearch] searchWorks error:', await response.text());
                return [];
            }

            const data = await response.json();
            const results = data.results || [];

            return results.map((work: any) => ({
                id: work.id,
                title: work.title || '',
                abstract: work.abstract_inverted_index
                    ? this.invertedIndexToText(work.abstract_inverted_index)
                    : undefined,
                publicationDate: work.publication_date || '',
                citationCount: work.cited_by_count || 0,
                venue: work.primary_location?.source?.display_name,
                doi: work.doi,
                url: work.doi ? `https://doi.org/${work.doi.replace('https://doi.org/', '')}` : work.id,
                authors: (work.authorships || [])
                    .slice(0, 5)
                    .map((a: any) => a.author?.display_name)
                    .filter(Boolean),
            }));
        } catch (error) {
            console.error('[AcademicSearch] searchWorks error:', error);
            return [];
        }
    }

    /**
     * 将 inverted index 转换为文本
     */
    private invertedIndexToText(invertedIndex: Record<string, number[]>): string {
        if (!invertedIndex) return '';

        const words: [string, number][] = [];
        for (const [word, positions] of Object.entries(invertedIndex)) {
            for (const pos of positions) {
                words.push([word, pos]);
            }
        }

        words.sort((a, b) => a[1] - b[1]);
        return words.map(w => w[0]).join(' ').slice(0, 1000);
    }
}

// 导出默认实例
export const academicSearch = new AcademicSearchSkill();
