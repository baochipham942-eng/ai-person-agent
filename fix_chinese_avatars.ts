import { prisma } from './lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * 修复国内人物头像
 * 尝试多个来源：百度百科、知乎、unavatar
 */

// 手动指定的可靠头像来源
const CHINESE_AVATARS: Record<string, string> = {
    '姚舜禹': 'https://unavatar.io/github/yaoshunyu', // 尝试 GitHub
    '季逸超': 'https://unavatar.io/jiyichao',
    '杨植麟': 'https://unavatar.io/twitter/yangzhilin',
    '李开复': 'https://unavatar.io/twitter/kaaborlee', // Kai-Fu Lee
    '王慧文': 'https://unavatar.io/wanghuifeng',
    '闫俊杰': 'https://unavatar.io/yanjunjie',
    '戴文渊': 'https://unavatar.io/daiwenyuan',
    '周伯文': 'https://unavatar.io/zhoubowen',
    '刘知远': 'https://unavatar.io/liuzhiyuan',
    '唐杰': 'https://unavatar.io/tangjie',
    '朱军': 'https://unavatar.io/zhujun',
    '周明': 'https://unavatar.io/zhouming',
    '黄铁军': 'https://unavatar.io/huangtiejun',
    '丁洁': 'https://unavatar.io/dingjie',
    '朱啸虎': 'https://unavatar.io/zhuxiaohu',
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

// 生成默认头像（带首字母的彩色背景）
function generateDefaultAvatar(name: string, personId: string): string {
    const firstChar = name.charAt(0);
    const hash = crypto.createHash('md5').update(personId).digest('hex').slice(0, 8);
    const filename = `default_${hash}.svg`;
    const filePath = path.join(process.cwd(), 'public', 'avatars', filename);

    // 根据名字生成颜色
    const colors = ['#4F46E5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DC2626'];
    const colorIndex = name.charCodeAt(0) % colors.length;
    const bgColor = colors[colorIndex];

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="${bgColor}"/>
  <text x="100" y="130" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle">${firstChar}</text>
</svg>`;

    fs.writeFileSync(filePath, svg);
    return `/avatars/${filename}`;
}

async function main() {
    console.log('=== 修复国内人物头像 ===\n');

    const people = await prisma.people.findMany({
        where: { avatarUrl: null },
        select: { id: true, name: true }
    });

    console.log(`找到 ${people.length} 个缺失头像的人物\n`);

    let fixedCount = 0;

    for (const person of people) {
        console.log(`+ ${person.name}:`);

        // 尝试从预设来源下载
        const presetUrl = CHINESE_AVATARS[person.name];
        if (presetUrl) {
            const localPath = await downloadImage(presetUrl, person.id);
            if (localPath) {
                await prisma.people.update({
                    where: { id: person.id },
                    data: { avatarUrl: localPath }
                });
                console.log(`  ✓ 下载成功: ${localPath}`);
                fixedCount++;
                continue;
            }
        }

        // 如果下载失败，生成默认头像
        console.log(`  生成默认头像...`);
        const defaultPath = generateDefaultAvatar(person.name, person.id);
        await prisma.people.update({
            where: { id: person.id },
            data: { avatarUrl: defaultPath }
        });
        console.log(`  ✓ 默认头像: ${defaultPath}`);
        fixedCount++;

        await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n=== 完成: 修复了 ${fixedCount} 个头像 ===`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
