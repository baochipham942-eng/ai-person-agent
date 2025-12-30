/**
 * OpenAlex API 封装
 * 用于获取学术论文和作者信息
 * https://openalex.org/
 */

interface OpenAlexWork {
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

interface OpenAlexAuthor {
    id: string;
    displayName: string;
    orcid?: string;
    worksCount: number;
    citedByCount: number;
    affiliations: string[];
}

const OPENALEX_API_URL = 'https://api.openalex.org';

// OpenAlex 免费 API，建议添加 polite pool email
const POLITE_EMAIL = 'ai-person-agent@example.com';

/**
 * 搜索 OpenAlex 作者
 * @param name 作者姓名
 */
export async function searchOpenAlexAuthor(name: string): Promise<OpenAlexAuthor[]> {
    try {
        const params = new URLSearchParams({
            search: name,
            per_page: '5',
            mailto: POLITE_EMAIL,
        });

        const url = `${OPENALEX_API_URL}/authors?${params}`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error('OpenAlex search error:', await response.text());
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
        console.error('OpenAlex searchAuthor error:', error);
        return [];
    }
}

/**
 * 获取作者的论文列表
 * @param authorId OpenAlex 作者 ID
 * @param limit 返回数量
 */
export async function getAuthorWorks(
    authorId: string,
    limit: number = 20
): Promise<OpenAlexWork[]> {
    try {
        // 清理 author ID（可能包含完整 URL）
        const cleanId = authorId.replace('https://openalex.org/', '');

        const params = new URLSearchParams({
            filter: `author.id:${cleanId}`,
            sort: 'cited_by_count:desc',
            per_page: String(limit),
            mailto: POLITE_EMAIL,
        });

        const url = `${OPENALEX_API_URL}/works?${params}`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error('OpenAlex getWorks error:', await response.text());
            return [];
        }

        const data = await response.json();
        const results = data.results || [];

        return results.map((work: any) => ({
            id: work.id,
            title: work.title || '',
            abstract: work.abstract_inverted_index
                ? invertedIndexToText(work.abstract_inverted_index)
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
        console.error('OpenAlex getAuthorWorks error:', error);
        return [];
    }
}

/**
 * 通过 ORCID 获取作者
 * @param orcid ORCID ID
 */
export async function getAuthorByOrcid(orcid: string): Promise<OpenAlexAuthor | null> {
    try {
        const cleanOrcid = orcid.replace('https://orcid.org/', '');
        const response = await fetch(
            `${OPENALEX_API_URL}/authors/orcid:${cleanOrcid}?mailto=${POLITE_EMAIL}`
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
        console.error('OpenAlex getAuthorByOrcid error:', error);
        return null;
    }
}

/**
 * 将 OpenAlex 的 inverted index 格式转换为普通文本
 */
function invertedIndexToText(invertedIndex: Record<string, number[]>): string {
    if (!invertedIndex) return '';

    const words: [string, number][] = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
        for (const pos of positions) {
            words.push([word, pos]);
        }
    }

    words.sort((a, b) => a[1] - b[1]);
    return words.map(w => w[0]).join(' ').slice(0, 1000); // 限制长度
}
