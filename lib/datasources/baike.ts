/**
 * 百度百科数据源
 * 用于获取国内人物信息（中文名、简介、头像、履历）
 * 
 * 注意：百度百科没有官方 API，这里使用网页解析
 */

import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface BaikePersonInfo {
    name: string;
    description: string;
    avatarUrl?: string;
    occupation: string[];
    organization: string[];
    aliases: string[];
    tags: string[];
}

/**
 * 从百度百科获取人物信息
 */
export async function getBaikePersonInfo(name: string): Promise<BaikePersonInfo | null> {
    const encodedName = encodeURIComponent(name);
    const url = `https://baike.baidu.com/item/${encodedName}`;

    console.log(`[Baike] Fetching: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            console.log(`[Baike] HTTP ${response.status}`);
            return null;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // 提取头像
        let avatarUrl: string | undefined;
        const posterImg = $('.poster-jpg img').attr('src') ||
            $('.summary-pic img').attr('src') ||
            $('.basicInfo-block img').attr('src');
        if (posterImg) {
            avatarUrl = posterImg.startsWith('//') ? `https:${posterImg}` : posterImg;
        }

        // 提取简介（第一段）
        const description = $('.lemma-summary .para').first().text().trim() ||
            $('[class*="summary"] .para').first().text().trim() ||
            '';

        // 提取标签
        const tags: string[] = [];
        $('.taglist span, .tag-list span').each((_, el) => {
            const tag = $(el).text().trim();
            if (tag) tags.push(tag);
        });

        // 提取基本信息 (职业、所属公司等)
        const occupation: string[] = [];
        const organization: string[] = [];
        const aliases: string[] = [];

        // 遍历基本信息表格
        $('.basic-info dt, .basicInfo-item dt, dt').each((i, dt) => {
            const label = $(dt).text().trim();
            const value = $(dt).next('dd').text().trim();

            if (label.includes('职业') || label.includes('职务')) {
                value.split(/[,，、]/).forEach(v => {
                    const clean = v.trim();
                    if (clean) occupation.push(clean);
                });
            }

            if (label.includes('公司') || label.includes('单位') || label.includes('任职')) {
                value.split(/[,，、]/).forEach(v => {
                    const clean = v.trim();
                    if (clean) organization.push(clean);
                });
            }

            if (label.includes('别名') || label.includes('英文名') || label.includes('外文名')) {
                value.split(/[,，、]/).forEach(v => {
                    const clean = v.trim();
                    if (clean) aliases.push(clean);
                });
            }
        });

        return {
            name,
            description: description.slice(0, 500), // 限制长度
            avatarUrl,
            occupation: [...new Set(occupation)].slice(0, 5),
            organization: [...new Set(organization)].slice(0, 5),
            aliases: [...new Set(aliases)],
            tags: [...new Set(tags)].slice(0, 10),
        };

    } catch (error) {
        console.error('[Baike] Error:', error);
        return null;
    }
}

/**
 * 下载百度百科头像
 */
export async function downloadBaikeAvatar(
    imageUrl: string,
    personId: string
): Promise<string | null> {
    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://baike.baidu.com/',
            },
        });

        if (!response.ok) return null;

        const buffer = await response.arrayBuffer();
        if (buffer.byteLength < 1000) return null;

        const contentType = response.headers.get('content-type') || '';
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const hash = crypto.createHash('md5').update(personId).digest('hex').slice(0, 8);
        const filename = `${hash}.${ext}`;
        const filePath = path.join(process.cwd(), 'public', 'avatars', filename);

        fs.writeFileSync(filePath, Buffer.from(buffer));

        return `/avatars/${filename}`;
    } catch (error) {
        console.error('[Baike] Avatar download error:', error);
        return null;
    }
}

// ============================================================
// 新增：基于 API 的职业经历获取
// ============================================================

export interface BaikeCareerItem {
    type: 'education' | 'career';
    orgName: string;
    role?: string;
    startDate?: string;
    endDate?: string;
}

export interface BaikeApiPersonInfo {
    id: number;
    name: string;
    desc: string;          // 简短描述
    abstract: string;      // 详细摘要
    imageUrl?: string;
    gender?: string;
    birthDate?: string;
    nationality?: string;
    education?: string;    // 毕业院校
    achievements?: string[];
    url: string;
}

/**
 * 通过百度百科开放 API 获取人物信息
 * 比网页抓取更稳定可靠
 */
export async function getBaikePersonInfoByApi(name: string): Promise<BaikeApiPersonInfo | null> {
    try {
        const url = `https://baike.baidu.com/api/openapi/BaikeLemmaCardApi?scope=103&format=json&appid=379020&bk_key=${encodeURIComponent(name)}&bk_length=600`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            console.error(`[Baike API] HTTP error: ${response.status}`);
            return null;
        }

        const data = await response.json();

        // 检查是否有返回结果
        if (!data.id || !data.title) {
            console.log(`[Baike API] No entry found for: ${name}`);
            return null;
        }

        // 解析卡片信息
        const card = data.card || [];
        const getValue = (key: string): string | undefined => {
            const item = card.find((c: any) => c.key.includes(key) || c.name === key);
            if (item && item.value && item.value.length > 0) {
                // 移除 HTML 标签
                return item.value[0].replace(/<[^>]+>/g, '').trim();
            }
            return undefined;
        };

        const getValueArray = (key: string): string[] => {
            const item = card.find((c: any) => c.key.includes(key) || c.name === key);
            if (item && item.value) {
                return item.value.map((v: string) => v.replace(/<[^>]+>/g, '').trim());
            }
            return [];
        };

        return {
            id: data.id,
            name: data.title,
            desc: data.desc || '',
            abstract: data.abstract?.replace(/<[^>]+>/g, '').trim() || '',
            imageUrl: data.image,
            gender: getValue('gender') || getValue('性别'),
            birthDate: getValue('bornDay') || getValue('出生日期'),
            nationality: getValue('nation') || getValue('国籍'),
            education: getValue('school') || getValue('毕业院校'),
            achievements: getValueArray('master') || getValueArray('主要成就'),
            url: data.url || `https://baike.baidu.com/item/${encodeURIComponent(name)}`,
        };
    } catch (error) {
        console.error('[Baike API] Error:', error);
        return null;
    }
}

/**
 * 从百度百科摘要中提取职业经历
 * 使用 AI 来解析非结构化的文本
 */
export async function extractCareerFromBaikeAbstract(
    name: string,
    abstract: string
): Promise<BaikeCareerItem[]> {
    const { chatCompletion } = await import('../ai/deepseek');

    const prompt = `从以下百度百科摘要中提取人物的职业经历和教育经历。

人物：${name}
摘要：${abstract}

请提取并以 JSON 数组格式返回，每个元素包含：
- type: "education" 或 "career"
- orgName: 机构/公司/学校名称
- role: 职位/学位（如有）
- startDate: 开始时间（ISO 格式，如 "2020-01-01"，如不确定具体日期只写年份如 "2020"）
- endDate: 结束时间（同上，如果是当前职位可以不填）

只返回 JSON 数组，不要其他文字。如果无法提取任何信息，返回空数组 []。`;

    try {
        const result = await chatCompletion([
            { role: 'user', content: prompt }
        ], {
            maxTokens: 1000,
            temperature: 0.1,
        });

        // 尝试解析 JSON
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const items = JSON.parse(jsonMatch[0]);
            return items.map((item: any) => ({
                type: item.type || 'career',
                orgName: item.orgName || item.org || '',
                role: item.role,
                startDate: item.startDate,
                endDate: item.endDate,
            })).filter((item: BaikeCareerItem) => item.orgName);
        }
    } catch (error) {
        console.error('[Baike] Error extracting career:', error);
    }

    return [];
}

/**
 * 完整流程：获取百度百科信息并提取职业经历
 */
export async function fetchBaikeCareerData(name: string): Promise<BaikeCareerItem[]> {
    const info = await getBaikePersonInfoByApi(name);
    if (!info || !info.abstract) {
        console.log(`[Baike] No abstract found for: ${name}`);
        return [];
    }

    console.log(`[Baike] Found: ${info.name} - ${info.desc}`);

    const careers = await extractCareerFromBaikeAbstract(name, info.abstract);
    console.log(`[Baike] Extracted ${careers.length} career items`);

    return careers;
}
