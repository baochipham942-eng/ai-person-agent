
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

// 从audit结果中提取有X账号但缺少头像的人
const TARGETS = [
    { name: 'Rob Bensinger', handle: 'rbensinger' },
    { name: '季逸超', handle: 'jiyichao' },
    { name: '妮基·帕尔玛', handle: 'nikiparmar09' },  // Niki Parmar - Transformer作者
    { name: 'Haider Khan', handle: 'HaidarKhan_' },
    { name: '周明', handle: 'zhouming_nlp' },
    // 额外添加斯图尔特·罗素 - Stuart Russell
    { name: '斯图尔特·罗素', handle: 'StuartJRussell' },
];

async function downloadAvatar(url: string, filepath: string): Promise<boolean> {
    try {
        const cmd = `curl -L -f -k -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${filepath}" "${url}"`;
        await execPromise(cmd);

        if (!fs.existsSync(filepath)) return false;
        const stats = fs.statSync(filepath);
        if (stats.size < 1000) {
            console.log(`  文件太小 (${stats.size} bytes)，删除`);
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
    console.log('=== 从X账号补充头像 ===\n');

    for (const target of TARGETS) {
        console.log(`处理: ${target.name} (@${target.handle})`);

        const person = await prisma.people.findFirst({
            where: { name: target.name }
        });

        if (!person) {
            console.log(`  数据库中未找到\n`);
            continue;
        }

        const filename = `${person.id}.jpg`;
        const filepath = path.join(AVATAR_DIR, filename);
        const url = `https://unavatar.io/twitter/${target.handle}`;

        console.log(`  从 ${url} 下载...`);
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
