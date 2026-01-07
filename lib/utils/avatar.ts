/**
 * Avatar Fetching Utility
 * 
 * 从多个来源获取头像并保存到本地
 * 优先级: X Profile > GitHub > Wikidata > Baike
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const GITHUB_API_URL = 'https://api.github.com';

export interface AvatarResult {
    success: boolean;
    avatarUrl?: string; // 本地路径 /avatars/xxx.jpg
    source?: 'github' | 'x' | 'wikidata' | 'baike';
    error?: string;
}

/**
 * 从 GitHub 获取用户头像
 */
export async function fetchGitHubAvatar(username: string): Promise<string | null> {
    if (!username) return null;

    try {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AI-Person-Agent',
        };

        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        const response = await fetch(`${GITHUB_API_URL}/users/${username}`, { headers });

        if (!response.ok) {
            console.error('[Avatar] GitHub API error:', response.status);
            return null;
        }

        const data = await response.json();
        return data.avatar_url || null;
    } catch (error) {
        console.error('[Avatar] GitHub fetch error:', error);
        return null;
    }
}

/**
 * 下载并保存头像到本地
 */
export async function downloadAndSaveAvatar(
    imageUrl: string,
    personId: string
): Promise<string | null> {
    try {
        // 生成唯一文件名
        const hash = crypto.createHash('md5').update(personId).digest('hex').slice(0, 8);
        const ext = imageUrl.includes('.png') ? 'png' : 'jpg';
        const filename = `${hash}.${ext}`;

        // 确保目录存在
        const avatarDir = path.join(process.cwd(), 'public', 'avatars');
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
            console.error('[Avatar] Download failed:', response.status);
            return null;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        console.log(`[Avatar] Saved avatar for ${personId} to ${filename}`);
        return `/avatars/${filename}`;
    } catch (error) {
        console.error('[Avatar] Save error:', error);
        return null;
    }
}

/**
 * 获取头像的主函数
 * 按优先级尝试多个来源
 */
export async function fetchAvatar(params: {
    personId: string;
    githubHandle?: string;
    xHandle?: string;
}): Promise<AvatarResult> {
    const { personId, githubHandle } = params;

    // 1. 尝试 GitHub
    if (githubHandle) {
        console.log(`[Avatar] Trying GitHub for ${githubHandle}...`);
        const githubAvatarUrl = await fetchGitHubAvatar(githubHandle);
        if (githubAvatarUrl) {
            const localPath = await downloadAndSaveAvatar(githubAvatarUrl, personId);
            if (localPath) {
                return { success: true, avatarUrl: localPath, source: 'github' };
            }
        }
    }

    // 2. X Profile 头像需要通过爬取或 API 获取（暂不实现）
    // X API 不提供直接的头像获取，需要通过网页爬取

    return { success: false, error: 'No avatar source available' };
}

/**
 * 批量更新没有头像的人物
 */
export async function updateMissingAvatars(
    prisma: any,
    limit: number = 10
): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    // 找出没有头像的人物
    const peopleWithoutAvatar = await prisma.people.findMany({
        where: {
            OR: [
                { avatarUrl: null },
                { avatarUrl: '' },
            ]
        },
        select: {
            id: true,
            name: true,
            officialLinks: true,
        },
        take: limit,
    });

    console.log(`[Avatar] Found ${peopleWithoutAvatar.length} people without avatars`);

    for (const person of peopleWithoutAvatar) {
        const links = (person.officialLinks as any[]) || [];
        const githubLink = links.find((l: any) => l.type === 'github');
        const githubHandle = githubLink?.handle || githubLink?.url?.match(/github\.com\/([^\/]+)/)?.[1];

        if (!githubHandle) {
            console.log(`[Avatar] No GitHub handle for ${person.name}`);
            failed++;
            continue;
        }

        const result = await fetchAvatar({
            personId: person.id,
            githubHandle,
        });

        if (result.success && result.avatarUrl) {
            await prisma.people.update({
                where: { id: person.id },
                data: { avatarUrl: result.avatarUrl },
            });
            console.log(`[Avatar] Updated avatar for ${person.name} from ${result.source}`);
            updated++;
        } else {
            failed++;
        }
    }

    return { updated, failed };
}
