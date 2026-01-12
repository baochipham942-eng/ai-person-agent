/**
 * Logo Fetch Skill
 *
 * 公司/学校图标获取能力：
 * - 从 Clearbit Logo API 获取
 * - 从 Google Favicon 获取
 * - 从 Logo.dev 获取
 * - 从 DuckDuckGo Favicon 获取
 * - 支持本地缓存
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ============== 类型定义 ==============

export interface LogoResult {
    success: boolean;
    logoUrl?: string;
    source?: 'clearbit' | 'google' | 'duckduckgo' | 'logodev' | 'url';
    error?: string;
}

export interface LogoFetchConfig {
    logoDir?: string;
    saveToLocal?: boolean;
    defaultSize?: number;
}

export interface FetchLogoParams {
    name: string;
    domain?: string;
    fallbackUrl?: string;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<LogoFetchConfig> = {
    logoDir: 'public/logos',
    saveToLocal: true,
    defaultSize: 128,
};

// ============== 常见组织域名映射 ==============

const KNOWN_DOMAINS: Record<string, string> = {
    // Tech Companies
    'openai': 'openai.com',
    'anthropic': 'anthropic.com',
    'google': 'google.com',
    'deepmind': 'deepmind.com',
    'microsoft': 'microsoft.com',
    'meta': 'meta.com',
    'facebook': 'facebook.com',
    'apple': 'apple.com',
    'amazon': 'amazon.com',
    'nvidia': 'nvidia.com',
    'tesla': 'tesla.com',
    'x.ai': 'x.ai',
    'xai': 'x.ai',
    'stability ai': 'stability.ai',
    'hugging face': 'huggingface.co',
    'huggingface': 'huggingface.co',
    'midjourney': 'midjourney.com',
    'cohere': 'cohere.com',
    'inflection': 'inflection.ai',
    'character.ai': 'character.ai',

    // Universities
    'stanford': 'stanford.edu',
    'stanford university': 'stanford.edu',
    'mit': 'mit.edu',
    'massachusetts institute of technology': 'mit.edu',
    'berkeley': 'berkeley.edu',
    'uc berkeley': 'berkeley.edu',
    'cmu': 'cmu.edu',
    'carnegie mellon': 'cmu.edu',
    'carnegie mellon university': 'cmu.edu',
    'harvard': 'harvard.edu',
    'harvard university': 'harvard.edu',
    'princeton': 'princeton.edu',
    'princeton university': 'princeton.edu',
    'yale': 'yale.edu',
    'yale university': 'yale.edu',
    'oxford': 'ox.ac.uk',
    'oxford university': 'ox.ac.uk',
    'cambridge': 'cam.ac.uk',
    'cambridge university': 'cam.ac.uk',
    'tsinghua': 'tsinghua.edu.cn',
    'tsinghua university': 'tsinghua.edu.cn',
    '清华': 'tsinghua.edu.cn',
    '清华大学': 'tsinghua.edu.cn',
    'peking university': 'pku.edu.cn',
    '北京大学': 'pku.edu.cn',
    '北大': 'pku.edu.cn',
    'fudan': 'fudan.edu.cn',
    '复旦大学': 'fudan.edu.cn',
    'zhejiang university': 'zju.edu.cn',
    '浙江大学': 'zju.edu.cn',
};

// ============== Skill 实现 ==============

export class LogoFetchSkill {
    private config: Required<LogoFetchConfig>;

    constructor(config: LogoFetchConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 获取 Logo（按优先级尝试多个来源）
     */
    async fetch(params: FetchLogoParams): Promise<LogoResult> {
        const { name, fallbackUrl } = params;
        let domain = params.domain;

        // 如果没有提供域名，尝试从已知映射中查找
        if (!domain) {
            domain = this.getDomainFromName(name);
        }

        if (!domain && !fallbackUrl) {
            return { success: false, error: 'No domain or fallback URL provided' };
        }

        if (domain) {
            // 1. 尝试 Clearbit Logo API（免费，高质量）
            console.log(`[LogoFetch] Trying Clearbit for ${domain}...`);
            const clearbitUrl = this.getClearbitUrl(domain);
            const clearbitResult = await this.tryFetchAndSave(clearbitUrl, name, 'clearbit');
            if (clearbitResult.success) return clearbitResult;

            // 2. 尝试 Google Favicon
            console.log(`[LogoFetch] Trying Google Favicon for ${domain}...`);
            const googleUrl = this.getGoogleFaviconUrl(domain);
            const googleResult = await this.tryFetchAndSave(googleUrl, name, 'google');
            if (googleResult.success) return googleResult;

            // 3. 尝试 DuckDuckGo Favicon
            console.log(`[LogoFetch] Trying DuckDuckGo for ${domain}...`);
            const ddgUrl = this.getDuckDuckGoUrl(domain);
            const ddgResult = await this.tryFetchAndSave(ddgUrl, name, 'duckduckgo');
            if (ddgResult.success) return ddgResult;
        }

        // 4. 使用 fallback URL
        if (fallbackUrl) {
            const fallbackResult = await this.tryFetchAndSave(fallbackUrl, name, 'url');
            if (fallbackResult.success) return fallbackResult;
        }

        return { success: false, error: 'Failed to fetch logo from all sources' };
    }

    /**
     * 从组织名称推断域名
     */
    getDomainFromName(name: string): string | undefined {
        const normalized = name.toLowerCase().trim();

        // 先尝试精确匹配
        if (KNOWN_DOMAINS[normalized]) {
            return KNOWN_DOMAINS[normalized];
        }

        // 尝试部分匹配
        for (const [key, domain] of Object.entries(KNOWN_DOMAINS)) {
            if (normalized.includes(key) || key.includes(normalized)) {
                return domain;
            }
        }

        return undefined;
    }

    /**
     * 获取 Clearbit Logo URL
     */
    getClearbitUrl(domain: string, size: number = this.config.defaultSize): string {
        return `https://logo.clearbit.com/${domain}?size=${size}`;
    }

    /**
     * 获取 Google Favicon URL
     */
    getGoogleFaviconUrl(domain: string, size: number = 128): string {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
    }

    /**
     * 获取 DuckDuckGo Favicon URL
     */
    getDuckDuckGoUrl(domain: string): string {
        return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    }

    /**
     * 尝试获取并保存 Logo
     */
    private async tryFetchAndSave(
        url: string,
        name: string,
        source: LogoResult['source']
    ): Promise<LogoResult> {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }

            // 检查是否返回了有效图片
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('image')) {
                return { success: false, error: 'Not an image' };
            }

            if (this.config.saveToLocal) {
                const localPath = await this.saveToLocal(url, name, await response.arrayBuffer());
                if (localPath) {
                    return { success: true, logoUrl: localPath, source };
                }
            }

            return { success: true, logoUrl: url, source };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    /**
     * 保存 Logo 到本地
     */
    private async saveToLocal(
        originalUrl: string,
        name: string,
        data: ArrayBuffer
    ): Promise<string | null> {
        try {
            const hash = crypto.createHash('md5').update(name.toLowerCase()).digest('hex').slice(0, 8);
            const ext = originalUrl.includes('.png') ? 'png' : originalUrl.includes('.ico') ? 'ico' : 'png';
            const filename = `${hash}.${ext}`;

            const logoDir = path.join(process.cwd(), this.config.logoDir);
            if (!fs.existsSync(logoDir)) {
                fs.mkdirSync(logoDir, { recursive: true });
            }

            const filePath = path.join(logoDir, filename);

            // 如果文件已存在，直接返回
            if (fs.existsSync(filePath)) {
                return `/logos/${filename}`;
            }

            const buffer = Buffer.from(data);
            fs.writeFileSync(filePath, buffer);

            console.log(`[LogoFetch] Saved logo for ${name} to ${filename}`);
            return `/logos/${filename}`;
        } catch (error) {
            console.error('[LogoFetch] Save error:', error);
            return null;
        }
    }

    /**
     * 检查 Logo 是否已缓存
     */
    exists(name: string): boolean {
        const hash = crypto.createHash('md5').update(name.toLowerCase()).digest('hex').slice(0, 8);
        const logoDir = path.join(process.cwd(), this.config.logoDir);

        return (
            fs.existsSync(path.join(logoDir, `${hash}.png`)) ||
            fs.existsSync(path.join(logoDir, `${hash}.ico`)) ||
            fs.existsSync(path.join(logoDir, `${hash}.jpg`))
        );
    }

    /**
     * 获取本地 Logo 路径
     */
    getLocalPath(name: string): string | null {
        const hash = crypto.createHash('md5').update(name.toLowerCase()).digest('hex').slice(0, 8);
        const logoDir = path.join(process.cwd(), this.config.logoDir);

        for (const ext of ['png', 'ico', 'jpg']) {
            if (fs.existsSync(path.join(logoDir, `${hash}.${ext}`))) {
                return `/logos/${hash}.${ext}`;
            }
        }
        return null;
    }

    /**
     * 添加自定义域名映射
     */
    addDomainMapping(name: string, domain: string): void {
        KNOWN_DOMAINS[name.toLowerCase()] = domain;
    }

    /**
     * 批量获取 Logo
     */
    async fetchBatch(
        items: Array<{ name: string; domain?: string }>
    ): Promise<Map<string, LogoResult>> {
        const results = new Map<string, LogoResult>();

        for (const item of items) {
            const result = await this.fetch(item);
            results.set(item.name, result);
        }

        return results;
    }
}

// 导出默认实例
export const logoFetch = new LogoFetchSkill();
