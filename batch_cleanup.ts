
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

// 要删除的人物
const TO_DELETE = [
    '李彦宏',
    '王小川',
    '艾伦·图灵',  // 历史人物
    '雷军',
    '大卫·西尔弗',
    '约翰·冯·诺依曼', // 历史人物
];

// 要修正的X账号
const X_FIXES = [
    { name: 'Rob Bensinger', handle: 'robbensinger' },
    { name: '罗福莉', handle: 'LuofuliDeepseek' },
    // Marc Andreessen
    { namePattern: 'Marc Andreessen', handle: 'pmarca' },
    { namePattern: '马克·安德森', handle: 'pmarca' },
];

async function downloadAvatar(url: string, filepath: string): Promise<boolean> {
    try {
        const cmd = `curl -L -f -k -H "User-Agent: Mozilla/5.0" -o "${filepath}" "${url}"`;
        await execPromise(cmd);
        if (!fs.existsSync(filepath)) return false;
        const stats = fs.statSync(filepath);
        if (stats.size < 1000) {
            fs.unlinkSync(filepath);
            return false;
        }
        return true;
    } catch {
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        return false;
    }
}

async function main() {
    console.log('=== 删除非AI/历史人物 ===\n');

    for (const name of TO_DELETE) {
        const result = await prisma.people.deleteMany({
            where: { name: { contains: name } }
        });
        console.log(`删除 ${name}: ${result.count}`);
    }

    console.log('\n=== 修正X账号 ===\n');

    for (const fix of X_FIXES) {
        const nameToSearch = fix.name || fix.namePattern;
        const person = await prisma.people.findFirst({
            where: { name: { contains: nameToSearch } }
        });

        if (!person) {
            console.log(`未找到: ${nameToSearch}`);
            continue;
        }

        console.log(`处理: ${person.name}`);

        // 更新X链接
        let links = (person.officialLinks as any[]) || [];
        links = links.filter(link => {
            const u = (typeof link === 'string' ? link : link.url) || '';
            return !u.includes('twitter.com') && !u.includes('x.com');
        });
        links.push({
            title: 'X (Twitter)',
            url: `https://x.com/${fix.handle}`,
            platform: 'twitter'
        });

        await prisma.people.update({
            where: { id: person.id },
            data: { officialLinks: links }
        });
        console.log(`  X账号更新: @${fix.handle}`);

        // 重新下载头像
        const filename = `${person.id}.jpg`;
        const filepath = path.join(AVATAR_DIR, filename);
        const avatarUrl = `https://unavatar.io/twitter/${fix.handle}`;

        console.log(`  下载头像...`);
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
            console.log(`  头像更新: ${dbUrl}\n`);
        } else {
            console.log(`  头像下载失败\n`);
        }
    }

    // 列出当前总人数
    const count = await prisma.people.count();
    console.log(`\n当前总人数: ${count}`);
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
