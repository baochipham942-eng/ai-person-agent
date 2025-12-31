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
