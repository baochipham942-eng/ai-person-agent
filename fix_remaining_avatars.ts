import { prisma } from './lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * 从多个来源尝试获取头像
 */

// 手动指定的备用头像 URL
const FALLBACK_AVATARS: Record<string, string> = {
    // 从 LinkedIn 或其他来源找到的
    'Daniela Amodei': 'https://unavatar.io/daniela@anthropic.com', // 尝试用邮箱
    'Guillaume Lample': 'https://avatars.githubusercontent.com/u/2361406', // GitHub
    'Jason Wei': 'https://avatars.githubusercontent.com/u/35882791', // GitHub (可能)
    '王小川': 'https://unavatar.io/wangxiaochuan', // 尝试
};

async function downloadImage(url: string, personId: string): Promise<string | null> {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            redirect: 'follow',
        });

        if (!response.ok) return null;

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('image')) return null;

        const buffer = await response.arrayBuffer();
        if (buffer.byteLength < 1000) return null;

        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const hash = crypto.createHash('md5').update(personId).digest('hex').slice(0, 8);
        const filename = `${hash}.${ext}`;
        const filePath = path.join(process.cwd(), 'public', 'avatars', filename);

        fs.writeFileSync(filePath, Buffer.from(buffer));
        return `/avatars/${filename}`;
    } catch {
        return null;
    }
}

async function main() {
    console.log('=== 修复剩余缺失头像 ===\n');

    const people = await prisma.people.findMany({
        where: { avatarUrl: null },
        select: { id: true, name: true }
    });

    for (const person of people) {
        console.log(`+ ${person.name}:`);

        const fallbackUrl = FALLBACK_AVATARS[person.name];
        if (!fallbackUrl) {
            console.log('  ✗ 无备用来源');
            continue;
        }

        console.log(`  尝试: ${fallbackUrl}`);
        const localPath = await downloadImage(fallbackUrl, person.id);

        if (localPath) {
            await prisma.people.update({
                where: { id: person.id },
                data: { avatarUrl: localPath }
            });
            console.log(`  ✓ 已保存: ${localPath}`);
        } else {
            console.log('  ✗ 下载失败');
        }

        await new Promise(r => setTimeout(r, 500));
    }

    // 最终状态
    const final = await prisma.people.findMany({
        where: { avatarUrl: null },
        select: { name: true }
    });

    console.log(`\n=== 最终状态 ===`);
    if (final.length === 0) {
        console.log('✓ 所有人物都有头像了！');
    } else {
        console.log(`仍缺失 ${final.length} 个头像:`);
        final.forEach(p => console.log(`  - ${p.name}`));
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
