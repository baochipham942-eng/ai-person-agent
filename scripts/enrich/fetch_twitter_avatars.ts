import { prisma } from './lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * 从 X/Twitter 获取头像
 * 使用 unavatar.io 服务（免费，无需 API Key）
 */
async function downloadFromTwitter(xHandle: string, personId: string): Promise<string | null> {
    // unavatar.io 会自动从 Twitter 获取头像
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

        // 检查文件大小（太小可能是占位图）
        if (buffer.byteLength < 1000) {
            console.log(`    Image too small: ${buffer.byteLength} bytes`);
            return null;
        }

        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const hash = crypto.createHash('md5').update(personId).digest('hex').slice(0, 8);
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
    console.log('=== 从 X/Twitter 获取缺失头像 ===\n');

    // 获取缺失头像且有 X handle 的人物
    const people = await prisma.people.findMany({
        where: { avatarUrl: null },
        select: {
            id: true,
            name: true,
            officialLinks: true,
        }
    });

    console.log(`找到 ${people.length} 个缺失头像的人物\n`);

    let fixedCount = 0;

    for (const person of people) {
        const links = person.officialLinks as any[] || [];
        const xLink = links.find((l: any) => l.type === 'x');
        const xHandle = xLink?.handle?.replace('@', '');

        if (!xHandle) {
            console.log(`- ${person.name}: 无 X 账号`);
            continue;
        }

        console.log(`+ ${person.name} (@${xHandle}):`);

        const localPath = await downloadFromTwitter(xHandle, person.id);

        if (localPath) {
            await prisma.people.update({
                where: { id: person.id },
                data: { avatarUrl: localPath }
            });
            console.log(`  ✓ 已保存: ${localPath}`);
            fixedCount++;
        } else {
            console.log(`  ✗ 下载失败`);
        }

        // 避免请求过快
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n=== 完成: 修复了 ${fixedCount} 个头像 ===`);

    // 显示仍然缺失的
    const stillMissing = await prisma.people.findMany({
        where: { avatarUrl: null },
        select: { name: true }
    });

    if (stillMissing.length > 0) {
        console.log(`\n仍缺失头像 (${stillMissing.length}):`);
        stillMissing.forEach(p => console.log(`  - ${p.name}`));
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
