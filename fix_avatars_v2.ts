import { prisma } from './lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// 使用 node-fetch 来下载
async function downloadWithFetch(url: string, filename: string): Promise<string | null> {
    const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
    const filePath = path.join(avatarsDir, filename);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'image/*',
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            console.log(`    HTTP ${response.status}`);
            return null;
        }

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));

        return `/avatars/${filename}`;
    } catch (error) {
        console.log(`    Error: ${error}`);
        return null;
    }
}

// 更可靠的头像源 - 使用 Wikipedia 或直接 URL
const AVATAR_SOURCES: Record<string, string> = {
    // 从 Twitter/X 获取 (需要通过代理)
    'Mira Murati': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Mira_Murati_at_TED_%282024%29.jpg/220px-Mira_Murati_at_TED_%282024%29.jpg',
    'John Schulman': 'https://avatars.githubusercontent.com/u/1199568',  // GitHub
    'Oriol Vinyals': 'https://avatars.githubusercontent.com/u/8218989',  // GitHub
    'Percy Liang': 'https://avatars.githubusercontent.com/u/1362624',    // GitHub (stanford-crfm)
};

async function main() {
    console.log('=== 修复缺失头像 (使用 fetch) ===\n');

    const people = await prisma.people.findMany({
        where: { avatarUrl: null },
        select: { id: true, name: true }
    });

    console.log(`找到 ${people.length} 个无头像人物\n`);

    let fixedCount = 0;

    for (const person of people) {
        const avatarUrl = AVATAR_SOURCES[person.name];

        if (!avatarUrl) {
            console.log(`- ${person.name}: 无可用头像源`);
            continue;
        }

        console.log(`+ ${person.name}: ${avatarUrl}`);

        const hash = crypto.createHash('md5').update(person.id).digest('hex').slice(0, 8);
        const ext = avatarUrl.includes('.png') ? 'png' : 'jpg';
        const filename = `${hash}.${ext}`;

        const localPath = await downloadWithFetch(avatarUrl, filename);

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

        await new Promise(r => setTimeout(r, 300));
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
