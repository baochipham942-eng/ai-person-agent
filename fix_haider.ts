
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

async function downloadAvatar(url: string, filepath: string): Promise<boolean> {
    try {
        const cmd = `curl -L -f -k -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${filepath}" "${url}"`;
        await execPromise(cmd);

        if (!fs.existsSync(filepath)) return false;
        const stats = fs.statSync(filepath);
        console.log(`  文件大小: ${(stats.size / 1024).toFixed(1)}KB`);

        if (stats.size < 1000) {
            console.log(`  文件太小，删除`);
            fs.unlinkSync(filepath);
            return false;
        }
        return true;
    } catch (error) {
        console.error(`  下载失败: ${(error as Error).message}`);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        return false;
    }
}

async function main() {
    console.log('=== 更新 Haider Khan 头像 ===\n');

    const person = await prisma.people.findFirst({
        where: { name: 'Haider Khan' }
    });

    if (!person) {
        console.log('数据库中未找到 Haider Khan');
        return;
    }

    console.log(`找到: ${person.name} (${person.id})`);

    // 更新X链接为正确的账号
    const newHandle = 'slow_developer';
    let links = (person.officialLinks as any[]) || [];
    links = links.filter(link => {
        const u = (typeof link === 'string' ? link : link.url) || '';
        return !u.includes('twitter.com') && !u.includes('x.com');
    });
    links.push({
        title: 'X (Twitter)',
        url: `https://x.com/${newHandle}`,
        platform: 'twitter'
    });

    await prisma.people.update({
        where: { id: person.id },
        data: { officialLinks: links }
    });
    console.log(`  已更新X链接: @${newHandle}`);

    // 下载头像
    const filename = `${person.id}.jpg`;
    const filepath = path.join(AVATAR_DIR, filename);
    const avatarUrl = `https://unavatar.io/twitter/${newHandle}`;

    console.log(`  从 ${avatarUrl} 下载头像...`);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

    const success = await downloadAvatar(avatarUrl, filepath);
    if (success) {
        const fileBuffer = fs.readFileSync(filepath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const dbUrl = `/avatars/${filename}?v=${hash.substring(0, 8)}`;

        await prisma.people.update({
            where: { id: person.id },
            data: { avatarUrl: dbUrl }
        });
        console.log(`  ✅ 头像更新成功: ${dbUrl}`);
    } else {
        console.log(`  ❌ 头像下载失败`);
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
