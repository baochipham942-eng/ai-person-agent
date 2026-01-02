
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

// 要删除的非AI核心人物
const TO_DELETE = [
    '杰夫·贝索斯',   // 电商/云计算
    '比尔·盖茨',     // 软件/慈善
    '马化腾',        // 社交/游戏
    '张一鸣',        // 短视频/推荐（可保留，有AI业务）
];

async function downloadAvatar(url: string, filepath: string): Promise<boolean> {
    try {
        const cmd = `curl -L -f -k -H "User-Agent: Mozilla/5.0" -H "Referer: https://baike.baidu.com/" -o "${filepath}" "${url}"`;
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
    console.log('=== 清理非AI人物 ===\n');

    for (const name of TO_DELETE) {
        const result = await prisma.people.deleteMany({ where: { name: { contains: name } } });
        console.log(`删除 ${name}: ${result.count}`);
    }

    console.log('\n=== 添加罗福莉 ===\n');

    // 检查是否已存在
    const existing = await prisma.people.findFirst({
        where: { name: { contains: '罗福莉' } }
    });

    if (existing) {
        console.log('罗福莉已存在');
    } else {
        const newPerson = await prisma.people.create({
            data: {
                qid: 'CUSTOM_LuoFuLi',
                name: '罗福莉',
                aliases: ['Fuli Luo', 'AI天才少女'],
                description: '小米MiMo大模型负责人，前DeepSeek核心开发者，北大计算语言学硕士',
                occupation: ['AI研究员', '大模型专家'],
                organization: ['小米', 'DeepSeek', '幻方量化', '阿里达摩院'],
                officialLinks: [],
                status: 'pending',
                completeness: 0
            }
        });
        console.log(`创建罗福莉: ${newPerson.id}`);

        // 尝试下载头像（从百度百科）
        const baikeUrl = 'https://bkimg.cdn.bcebos.com/pic/b3b7d0a20cf431ad39db2c964e36acaf2edd99cb';
        const filename = `${newPerson.id}.jpg`;
        const filepath = path.join(AVATAR_DIR, filename);

        console.log('下载头像...');
        const success = await downloadAvatar(baikeUrl, filepath);
        if (success) {
            const fileBuffer = fs.readFileSync(filepath);
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const dbUrl = `/avatars/${filename}?v=${hash.substring(0, 8)}`;

            await prisma.people.update({
                where: { id: newPerson.id },
                data: { avatarUrl: dbUrl }
            });
            console.log(`头像更新: ${dbUrl}`);
        } else {
            console.log('头像下载失败，稍后手动处理');
        }
    }

    console.log('\n=== 修复大卫·西尔弗头像 ===\n');

    const david = await prisma.people.findFirst({
        where: { name: { contains: '大卫·西尔弗' } }
    });

    if (david) {
        // 从Wikipedia获取David Silver的头像
        const wikiUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/David_Silver_%28cropped%29.jpg/220px-David_Silver_%28cropped%29.jpg';
        const filename = `${david.id}.jpg`;
        const filepath = path.join(AVATAR_DIR, filename);

        console.log('从Wikipedia下载头像...');
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

        const success = await downloadAvatar(wikiUrl, filepath);
        if (success) {
            const fileBuffer = fs.readFileSync(filepath);
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const dbUrl = `/avatars/${filename}?v=${hash.substring(0, 8)}`;

            await prisma.people.update({
                where: { id: david.id },
                data: { avatarUrl: dbUrl }
            });
            console.log(`大卫·西尔弗头像更新: ${dbUrl}`);
        } else {
            console.log('头像下载失败');
        }
    }

    console.log('\n=== 完成 ===');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
