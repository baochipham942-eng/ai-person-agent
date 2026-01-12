/**
 * Avatar Fetch Skill
 *
 * 人物头像获取能力：
 * - 从 GitHub 获取头像
 * - 从 X/Twitter 获取头像
 * - 下载并保存到本地
 * - 批量更新缺失头像
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ============== 类型定义 ==============

export interface AvatarResult {
    success: boolean;
    avatarUrl?: string;
    source?: 'github' | 'x' | 'wikidata' | 'gravatar' | 'url';
    error?: string;
}

export interface AvatarFetchConfig {
    githubToken?: string;
    avatarDir?: string;
    saveToLocal?: boolean;
}

export interface FetchAvatarParams {
    personId: string;
    githubHandle?: string;
    xHandle?: string;
    email?: string;
    fallbackUrl?: string;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<Omit<AvatarFetchConfig, 'githubToken'>> & { githubToken?: string } = {
    githubToken: undefined,
    avatarDir: 'public/avatars',
    saveToLocal: true,
};

// ============== Skill 实现 ==============

export class AvatarFetchSkill {
    private config: typeof DEFAULT_CONFIG;

    constructor(config: AvatarFetchConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 获取头像（按优先级尝试多个来源）
     */
    async fetch(params: FetchAvatarParams): Promise<AvatarResult> {
        const { personId, githubHandle, email, fallbackUrl } = params;

        // 1. 尝试 GitHub
        if (githubHandle) {
            console.log(`[AvatarFetch] Trying GitHub for ${githubHandle}...`);
            const githubAvatarUrl = await this.fetchFromGitHub(githubHandle);
            if (githubAvatarUrl) {
                if (this.config.saveToLocal) {
                    const localPath = await this.downloadAndSave(githubAvatarUrl, personId);
                    if (localPath) {
                        return { success: true, avatarUrl: localPath, source: 'github' };
                    }
                }
                return { success: true, avatarUrl: githubAvatarUrl, source: 'github' };
            }
        }

        // 2. 尝试 Gravatar（通过 email）
        if (email) {
            console.log(`[AvatarFetch] Trying Gravatar for ${email}...`);
            const gravatarUrl = this.getGravatarUrl(email);
            if (this.config.saveToLocal) {
                const localPath = await this.downloadAndSave(gravatarUrl, personId);
                if (localPath) {
                    return { success: true, avatarUrl: localPath, source: 'gravatar' };
                }
            }
            return { success: true, avatarUrl: gravatarUrl, source: 'gravatar' };
        }

        // 3. 使用 fallback URL
        if (fallbackUrl) {
            if (this.config.saveToLocal) {
                const localPath = await this.downloadAndSave(fallbackUrl, personId);
                if (localPath) {
                    return { success: true, avatarUrl: localPath, source: 'url' };
                }
            }
            return { success: true, avatarUrl: fallbackUrl, source: 'url' };
        }

        return { success: false, error: 'No avatar source available' };
    }

    /**
     * 从 GitHub 获取头像 URL
     */
    async fetchFromGitHub(username: string): Promise<string | null> {
        if (!username) return null;

        try {
            const headers: HeadersInit = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'AvatarFetchSkill',
            };

            const token = this.config.githubToken || process.env.GITHUB_TOKEN;
            if (token) {
                headers['Authorization'] = `token ${token}`;
            }

            const response = await fetch(`https://api.github.com/users/${username}`, { headers });

            if (!response.ok) {
                console.error('[AvatarFetch] GitHub API error:', response.status);
                return null;
            }

            const data = await response.json();
            return data.avatar_url || null;
        } catch (error) {
            console.error('[AvatarFetch] GitHub fetch error:', error);
            return null;
        }
    }

    /**
     * 获取 Gravatar URL
     */
    getGravatarUrl(email: string, size: number = 200): string {
        const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
        return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
    }

    /**
     * 下载并保存头像到本地
     */
    async downloadAndSave(imageUrl: string, personId: string): Promise<string | null> {
        try {
            const hash = crypto.createHash('md5').update(personId).digest('hex').slice(0, 8);
            const ext = imageUrl.includes('.png') ? 'png' : 'jpg';
            const filename = `${hash}.${ext}`;

            const avatarDir = path.join(process.cwd(), this.config.avatarDir);
            if (!fs.existsSync(avatarDir)) {
                fs.mkdirSync(avatarDir, { recursive: true });
            }

            const filePath = path.join(avatarDir, filename);

            // 如果文件已存在，直接返回
            if (fs.existsSync(filePath)) {
                return `/avatars/${filename}`;
            }

            // 下载图片
            const response = await fetch(imageUrl);
            if (!response.ok) {
                console.error('[AvatarFetch] Download failed:', response.status);
                return null;
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(filePath, buffer);

            console.log(`[AvatarFetch] Saved avatar for ${personId} to ${filename}`);
            return `/avatars/${filename}`;
        } catch (error) {
            console.error('[AvatarFetch] Save error:', error);
            return null;
        }
    }

    /**
     * 检查头像是否存在
     */
    exists(personId: string): boolean {
        const hash = crypto.createHash('md5').update(personId).digest('hex').slice(0, 8);
        const avatarDir = path.join(process.cwd(), this.config.avatarDir);

        return (
            fs.existsSync(path.join(avatarDir, `${hash}.jpg`)) ||
            fs.existsSync(path.join(avatarDir, `${hash}.png`))
        );
    }

    /**
     * 获取本地头像路径
     */
    getLocalPath(personId: string): string | null {
        const hash = crypto.createHash('md5').update(personId).digest('hex').slice(0, 8);
        const avatarDir = path.join(process.cwd(), this.config.avatarDir);

        if (fs.existsSync(path.join(avatarDir, `${hash}.jpg`))) {
            return `/avatars/${hash}.jpg`;
        }
        if (fs.existsSync(path.join(avatarDir, `${hash}.png`))) {
            return `/avatars/${hash}.png`;
        }
        return null;
    }
}

// 导出默认实例
export const avatarFetch = new AvatarFetchSkill();
