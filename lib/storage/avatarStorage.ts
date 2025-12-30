import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

// 确保目录存在
function ensureAvatarDir() {
    if (!fs.existsSync(AVATAR_DIR)) {
        fs.mkdirSync(AVATAR_DIR, { recursive: true });
    }
}

/**
 * 从 URL 下载头像并存储到本地
 * @param imageUrl 远程图片 URL（如 Wikimedia）
 * @param personId 人物 ID，用于生成文件名
 * @returns 本地 URL 路径（如 /avatars/xxx.jpg）或 null
 */
export async function downloadAndStoreAvatar(
    imageUrl: string,
    personId: string
): Promise<string | null> {
    if (!imageUrl) return null;

    try {
        ensureAvatarDir();

        // 下载图片
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'AIPersonAgent/1.0 (Educational Project)',
            },
        });

        if (!response.ok) {
            console.error(`Failed to download avatar: ${response.status}`);
            return null;
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const extension = contentType.includes('png') ? 'png' : 'jpg';

        // 生成文件名
        const hash = crypto.createHash('md5').update(personId).digest('hex').slice(0, 8);
        const filename = `${hash}.${extension}`;
        const filepath = path.join(AVATAR_DIR, filename);

        // 保存文件
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filepath, buffer);

        console.log(`Avatar saved: ${filepath}`);
        return `/avatars/${filename}`;
    } catch (error) {
        console.error('Error downloading avatar:', error);
        return null;
    }
}

/**
 * 获取头像本地路径，如果不存在则返回 null
 */
export function getLocalAvatarPath(personId: string): string | null {
    ensureAvatarDir();

    const hash = crypto.createHash('md5').update(personId).digest('hex').slice(0, 8);

    // 检查 jpg 和 png
    for (const ext of ['jpg', 'png']) {
        const filepath = path.join(AVATAR_DIR, `${hash}.${ext}`);
        if (fs.existsSync(filepath)) {
            return `/avatars/${hash}.${ext}`;
        }
    }

    return null;
}

/**
 * 删除人物头像
 */
export function deleteAvatar(personId: string): void {
    const hash = crypto.createHash('md5').update(personId).digest('hex').slice(0, 8);

    for (const ext of ['jpg', 'png']) {
        const filepath = path.join(AVATAR_DIR, `${hash}.${ext}`);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log(`Avatar deleted: ${filepath}`);
        }
    }
}
