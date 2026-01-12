/**
 * Wikidata API 封装
 * 用于搜索人物和获取实体详情
 * 
 * 改进：使用英文数据 + DeepSeek 翻译为简体中文
 */

import { translatePersonInfo } from '@/lib/ai/translator';
import crypto from 'crypto';

interface WikidataSearchResult {
    id: string;        // QID, e.g., "Q937"
    label: string;     // 显示名称（英文原版）
    labelZh?: string;  // 中文名称（翻译后）
    description: string;
    aliases?: string[];
}

interface WikidataEntity {
    qid: string;
    label: string;
    englishLabel?: string;
    description: string;
    aliases: string[];
    imageUrl?: string;
    occupation?: string[];
    organization?: string[];
    orcid?: string;  // ORCID ID for academic verification
    officialLinks: {
        type: 'x' | 'youtube' | 'blog' | 'website' | 'linkedin' | 'github';
        url: string;
        handle?: string;
    }[];
}

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

/**
 * 搜索 Wikidata 人物（使用英文搜索，结果更准确）
 * @param query 搜索关键词
 * @param limit 最大返回数量
 */
export async function searchWikidata(
    query: string,
    limit: number = 10
): Promise<WikidataSearchResult[]> {
    // 使用英文搜索，结果质量更好
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
        const url = `${WIKIDATA_API}?${params}`;
        console.log('[Wikidata] Fetching:', url);

        // Add timeout for slow network connections
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'AI-Person-Agent/1.0 (mailto:admin@example.com)'
            }
        });
        clearTimeout(timeoutId);

        console.log('[Wikidata] Response status:', response.status);

        const data = await response.json();
        console.log('[Wikidata] Response data:', JSON.stringify(data).slice(0, 500));

        if (!data.search) {
            console.log('[Wikidata] No search results in response');
            return [];
        }

        return data.search.map((item: any) => ({
            id: item.id,
            label: item.label || item.id,
            description: item.description || '',
            aliases: item.aliases || [],
        }));
    } catch (error) {
        console.error('[Wikidata] Search error:', error);
        return [];
    }
}

/**
 * 获取 Wikidata 实体详情（英文原版）
 * @param qid Wikidata QID, e.g., "Q937"
 */
export async function getWikidataEntity(qid: string): Promise<WikidataEntity | null> {
    const params = new URLSearchParams({
        action: 'wbgetentities',
        ids: qid,
        languages: 'en|zh',  // 获取英文和中文
        props: 'labels|descriptions|aliases|claims|sitelinks',
        format: 'json',
        origin: '*',
    });

    try {
        const response = await fetch(`${WIKIDATA_API}?${params}`, {
            headers: {
                'User-Agent': 'AI-Person-Agent/1.0 (mailto:admin@example.com)'
            }
        });
        const data = await response.json();

        const entity = data.entities?.[qid];
        if (!entity) {
            return null;
        }

        // 优先使用英文（后续翻译为简体中文）
        const englishLabel = entity.labels?.en?.value;
        const label = englishLabel || entity.labels?.zh?.value || qid;
        const description = entity.descriptions?.en?.value || entity.descriptions?.zh?.value || '';

        // 提取别名（英文优先）
        const aliases: string[] = [
            ...(entity.aliases?.en?.map((a: any) => a.value) || []),
            ...(entity.aliases?.zh?.map((a: any) => a.value) || []),
        ];

        // 提取图片 (P18)
        const imageValue = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        const imageUrl = imageValue ? getWikimediaImageUrl(imageValue) : undefined;

        // 提取职业 (P106) - 使用英文
        const occupation = await extractClaimLabels(entity.claims?.P106, 'en');

        // 提取组织 (P108 - employer) - 使用英文
        const organization = await extractClaimLabels(entity.claims?.P108, 'en');

        // 提取 ORCID (P496) - 用于学术论文精准匹配
        const orcidValue = entity.claims?.P496?.[0]?.mainsnak?.datavalue?.value;
        const orcid = orcidValue ? String(orcidValue) : undefined;

        // 提取官方链接
        const officialLinks = extractOfficialLinks(entity.claims);

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
        console.error('Wikidata getEntity error:', error);
        return null;
    }
}

/**
 * 获取 Wikidata 实体详情并翻译为简体中文
 * @param qid Wikidata QID
 * @returns 翻译后的实体信息
 */
export async function getWikidataEntityWithTranslation(qid: string): Promise<WikidataEntity | null> {
    const entity = await getWikidataEntity(qid);
    if (!entity) return null;

    try {
        // 使用 DeepSeek 翻译
        const translated = await translatePersonInfo({
            name: entity.label,
            description: entity.description,
            occupation: entity.occupation || [],
            organization: entity.organization || [],
        });

        return {
            ...entity,
            label: translated.name,
            description: translated.description || entity.description,
            occupation: translated.occupation,
            organization: translated.organization,
            // 将原始英文名字加入别名列表，方便搜索
            aliases: [...new Set([...entity.aliases, entity.label])],
        };
    } catch (error) {
        console.error('Translation error, using original:', error);
        return entity;
    }
}

/**
 * 从 Wikidata claims 提取官方链接
 */
function extractOfficialLinks(claims: any): WikidataEntity['officialLinks'] {
    const links: WikidataEntity['officialLinks'] = [];

    // P856 - 官方网站
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

    // P4003 - LinkedIn personal profile ID
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

/**
 * 从 claims 提取标签列表（如职业、组织）
 * @param claimList claims 数组
 * @param lang 语言代码 ('en' 或 'zh')
 */
async function extractClaimLabels(claimList: any[], lang: 'en' | 'zh' = 'en'): Promise<string[]> {
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
            languages: `${lang}|en|zh`,
            props: 'labels',
            format: 'json',
            origin: '*',
        });

        const response = await fetch(`${WIKIDATA_API}?${params}`, {
            headers: {
                'User-Agent': 'AI-Person-Agent/1.0 (mailto:admin@example.com)'
            }
        });
        const data = await response.json();

        return qids.map((qid: string) => {
            const entity = data.entities?.[qid];
            // 优先指定语言，其次英文，最后中文
            return entity?.labels?.[lang]?.value
                || entity?.labels?.en?.value
                || entity?.labels?.zh?.value
                || qid;
        });
    } catch {
        return qids;
    }
}

/**
 * 获取 Wikimedia Commons 图片 URL
 */
function getWikimediaImageUrl(filename: string): string {
    const cleanName = filename.replace(/ /g, '_');
    const hash = crypto.createHash('md5').update(cleanName).digest('hex');
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash[0]}/${hash[0]}${hash[1]}/${encodeURIComponent(cleanName)}/200px-${encodeURIComponent(cleanName)}`;
}

/**
 * 关联人物关系类型
 */
export interface PersonRelation {
    qid: string;           // 关联人物的 QID
    label: string;         // 关联人物名称
    relationType: 'advisor' | 'advisee' | 'cofounder' | 'colleague' | 'collaborator' | 'successor';
    description?: string;
}

/**
 * 获取人物的关联关系（导师、学生等）
 * @param qid 人物的 Wikidata QID
 * @returns 关联人物列表
 */
export async function getWikidataRelations(qid: string): Promise<PersonRelation[]> {
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
        const response = await fetch(`${WIKIDATA_API}?${params}`, {
            headers: {
                'User-Agent': 'AI-Person-Agent/1.0 (mailto:admin@example.com)'
            }
        });
        const data = await response.json();
        const entity = data.entities?.[qid];
        if (!entity) return [];

        // P185 - doctoral advisor (导师)
        const advisors = entity.claims?.P185 || [];
        for (const claim of advisors) {
            const advisorQid = claim.mainsnak?.datavalue?.value?.id;
            if (advisorQid) {
                const label = await getEntityLabel(advisorQid);
                relations.push({
                    qid: advisorQid,
                    label,
                    relationType: 'advisor',
                    description: '博士导师'
                });
            }
        }

        // P802 - doctoral student (学生)
        const students = entity.claims?.P802 || [];
        for (const claim of students) {
            const studentQid = claim.mainsnak?.datavalue?.value?.id;
            if (studentQid) {
                const label = await getEntityLabel(studentQid);
                relations.push({
                    qid: studentQid,
                    label,
                    relationType: 'advisee',
                    description: '博士学生'
                });
            }
        }

        // P1327 - partner in business or sport (合作伙伴)
        const partners = entity.claims?.P1327 || [];
        for (const claim of partners) {
            const partnerQid = claim.mainsnak?.datavalue?.value?.id;
            if (partnerQid) {
                const label = await getEntityLabel(partnerQid);
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
        console.error('[Wikidata] getRelations error:', error);
        return [];
    }
}

/**
 * 获取实体的标签名称
 */
async function getEntityLabel(qid: string): Promise<string> {
    try {
        const params = new URLSearchParams({
            action: 'wbgetentities',
            ids: qid,
            languages: 'en|zh',
            props: 'labels',
            format: 'json',
            origin: '*',
        });

        const response = await fetch(`${WIKIDATA_API}?${params}`, {
            headers: {
                'User-Agent': 'AI-Person-Agent/1.0 (mailto:admin@example.com)'
            }
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
