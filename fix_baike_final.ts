
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

// 用户提供的真实百度百科图片URL
const BAIKE_AVATARS: Record<string, string> = {
    '杨植麟': 'https://bkimg.cdn.bcebos.com/pic/43a7d933c895d143267580737cf082025aaf075a?x-bce-process=image/format,f_auto/quality,Q_70/resize,m_lfit,limit_1,w_536',
    '印奇': 'https://bkimg.cdn.bcebos.com/pic/279759ee3d6d55fbb2fbd4f8e878584a20a4472377e0?x-bce-process=image/format,f_auto/watermark,image_d2F0ZXIvYmFpa2UyNzI,g_7,xp_5,yp_5,P_20/resize,m_lfit,limit_1,h_1080',
    '徐立': 'https://bkimg.cdn.bcebos.com/pic/d52a2834349b033b75ead3d218ce36d3d539bd53?x-bce-process=image/format,f_auto/watermark,image_d2F0ZXIvYmFpa2UyNzI,g_7,xp_5,yp_5,P_20/resize,m_lfit,limit_1,h_1080',
};

async function downloadAvatar(url: string, filepath: string): Promise<boolean> {
    try {
        // 直接下载，百度百科图片通常不需要代理
        const cmd = `curl -L -f -k -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Referer: https://baike.baidu.com/" -o "${filepath}" "${url}"`;
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
    console.log('=== 从百度百科下载头像 ===\n');

    for (const [name, url] of Object.entries(BAIKE_AVATARS)) {
        console.log(`处理: ${name}`);

        const person = await prisma.people.findFirst({
            where: { name }
        });

        if (!person) {
            console.log(`  数据库中未找到\n`);
            continue;
        }

        const filename = `${person.id}.jpg`;
        const filepath = path.join(AVATAR_DIR, filename);

        console.log(`  下载中...`);
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
