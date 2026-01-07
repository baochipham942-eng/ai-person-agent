import { prisma } from './lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * 从 X/Twitter 获取所有有 X 账号的人物头像
 * 使用 unavatar.io 服务
 */
async function downloadFromTwitter(xHandle: string, personId: string): Promise<string | null> {
    const url = `https://unavatar.io/twitter/${xHandle}?fallback=false`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            console.log(`    HTTP ${response.status}`);
            return null;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('image')) {
            console.log(`    Not an image: ${contentType}`);
            return null;
        }

        const buffer = await response.arrayBuffer();

        // 检查文件大小
        if (buffer.byteLength < 1000) {
            console.log(`    Image too small: ${buffer.byteLength} bytes`);
            return null;
        }

        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const hash = crypto.createHash('md5').update(personId + '_x').digest('hex').slice(0, 8);
        const filename = `${hash}.${ext}`;
        const filePath = path.join(process.cwd(), 'public', 'avatars', filename);

        fs.writeFileSync(filePath, Buffer.from(buffer));

        return `/avatars/${filename}`;
    } catch (error) {
        console.log(`    Error: ${error}`);
        return null;
    }
}

async function main() {
    console.log('=== 从 X/Twitter 更新所有头像 ===\n');

    // 获取所有有 X handle 的人物
    const people = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            avatarUrl: true,
            officialLinks: true,
        }
    });

    const withXHandle = people.filter(p => {
        const links = p.officialLinks as any[] || [];
        const xLink = links.find((l: any) => l.type === 'x');
        return !!xLink?.handle;
    });

    console.log(`找到 ${withXHandle.length} 个有 X 账号的人物\n`);

    let updatedCount = 0;
    let failedCount = 0;

    for (const person of withXHandle) {
        const links = person.officialLinks as any[] || [];
        const xLink = links.find((l: any) => l.type === 'x');
        const xHandle = xLink?.handle?.replace('@', '');

        console.log(`${person.name} (@${xHandle}):`);

        const localPath = await downloadFromTwitter(xHandle, person.id);

        if (localPath) {
            // 删除旧头像文件（如果存在且不同）
            if (person.avatarUrl && person.avatarUrl !== localPath) {
                const oldPath = path.join(process.cwd(), 'public', person.avatarUrl);
                if (fs.existsSync(oldPath)) {
                    try {
                        fs.unlinkSync(oldPath);
                        console.log(`  删除旧头像: ${person.avatarUrl}`);
                    } catch { }
                }
            }

            await prisma.people.update({
                where: { id: person.id },
                data: { avatarUrl: localPath }
            });
            console.log(`  ✓ 已更新: ${localPath}`);
            updatedCount++;
        } else {
            console.log(`  ✗ 下载失败，保留原头像: ${person.avatarUrl || '无'}`);
            failedCount++;
        }

        // 避免请求过快
        await new Promise(r => setTimeout(r, 800));
    }

    console.log(`\n=== 完成 ===`);
    console.log(`成功更新: ${updatedCount}`);
    console.log(`下载失败: ${failedCount}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
