
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

// 百度百科和其他可靠来源的图片URL
// 这些URL需要通过浏览器手动获取
const BAIKE_AVATARS: Record<string, string> = {
    // 杨植麟 - 百度百科常见图片格式
    '杨植麟': 'https://bkimg.cdn.bcebos.com/pic/d058ccbf6c81800a19d8b743d1309e93bc3db7e2d6a8',
    // 印奇 
    '印奇': 'https://bkimg.cdn.bcebos.com/pic/8435e5dde71190ef76c6a7e9c381e819ebc4b7455fb8',
    // 徐立
    '徐立': 'https://bkimg.cdn.bcebos.com/pic/94cad1c8a786c917bd79c7c4f39c23c879c7e331d1ba',
    // 张鹏 - 智谱AI
    '张鹏': 'https://bkimg.cdn.bcebos.com/pic/9e3df8dcd100baa1cd11722e9c9d4512c8fc2e732e7b',
    // 周伯文
    '周伯文': 'https://bkimg.cdn.bcebos.com/pic/5243fbf2b21193133da91b17e5b52e17d21b0ef4f4b8',
};

async function downloadAvatar(url: string, filepath: string): Promise<boolean> {
    try {
        // 使用 images.weserv.nl 代理来避免防盗链
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=500`;
        const cmd = `curl -L -f -k -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${filepath}" "${proxyUrl}"`;
        await execPromise(cmd);

        if (!fs.existsSync(filepath)) return false;
        const stats = fs.statSync(filepath);
        if (stats.size < 1000) {
            console.log(`  文件太小 (${stats.size} bytes)，删除`);
            fs.unlinkSync(filepath);
            return false;
        }

        // 检查是否是有效图片（魔数验证）
        const buffer = fs.readFileSync(filepath);
        const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
        const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
        const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49;

        if (!isJpeg && !isPng && !isWebp) {
            console.log(`  不是有效图片格式，删除`);
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
    console.log('=== 从百度百科获取头像 ===\n');

    for (const [name, url] of Object.entries(BAIKE_AVATARS)) {
        console.log(`处理: ${name}`);

        const person = await prisma.people.findFirst({
            where: { name }
        });

        if (!person) {
            console.log(`  数据库中未找到\n`);
            continue;
        }

        if (person.avatarUrl && !person.avatarUrl.includes('placeholder')) {
            console.log(`  已有头像，跳过\n`);
            continue;
        }

        const filename = `${person.id}.jpg`;
        const filepath = path.join(AVATAR_DIR, filename);

        console.log(`  从 ${url.substring(0, 60)}... 下载`);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

        const success = await downloadAvatar(url, filepath);
        if (success) {
            const fileBuffer = fs.readFileSync(filepath);
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const dbUrl = `/avatars/${filename}?v=${hash.substring(0, 8)}`;

            await prisma.people.update({
                where: { id: person.id },
                data: { avatarUrl: dbUrl }
            });
            console.log(`  ✅ 成功: ${dbUrl}\n`);
        } else {
            console.log(`  ❌ 失败\n`);
        }
    }

    console.log('=== 完成 ===');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
