
import { PrismaClient } from '@prisma/client';
import { getWikidataEntityWithTranslation } from './lib/datasources/wikidata';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

// 需要修正的人物及其正确的Wikidata QID和X账号
const FIXES = [
    {
        currentName: '丹尼尔·格罗斯',
        correctName: 'Daniel Gross',
        correctQid: 'Q19364797', // AI投资人
        correctDescription: 'AI投资人，前Y Combinator合伙人，Apple机器学习总监',
        xHandle: 'danielgross'
    },
    {
        currentName: '大卫·西尔弗',
        correctName: 'David Silver',
        correctQid: 'Q30304164', // DeepMind研究员
        correctDescription: 'DeepMind首席研究员，AlphaGo/AlphaZero项目负责人，UCL教授',
        xHandle: null // 无X账号
    },
    {
        currentName: '斯图尔特·罗素',
        correctName: 'Stuart Russell',
        correctQid: 'Q92621', // AI安全专家
        correctDescription: 'UC Berkeley教授，AI安全领域权威，《人工智能：现代方法》作者',
        xHandle: null // 无X账号
    },
    {
        currentName: '利昂·琼斯',
        correctName: 'Llion Jones',
        correctQid: 'Q114949256', // Transformer作者
        correctDescription: 'Transformer论文共同作者，Sakana AI联合创始人兼CTO',
        xHandle: 'YesThisIsLion'
    },
    {
        currentName: '何凯明',
        correctName: '何恺明',
        correctQid: 'Q42045tried', // 先尝试更新描述
        correctDescription: 'ResNet作者，MIT教授，前Meta AI研究员，计算机视觉领域顶级研究员',
        xHandle: null // 无X账号
    },
    {
        currentName: '徐立',
        correctName: '徐立',
        correctQid: 'Q56652329', // 商汤科技CEO
        correctDescription: '商汤科技联合创始人兼CEO，香港中文大学计算机科学博士',
        xHandle: null
    }
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
    console.log('=== 修正问题人物数据 ===\n');

    for (const fix of FIXES) {
        console.log(`处理: ${fix.currentName}`);

        const person = await prisma.people.findFirst({
            where: { name: fix.currentName }
        });

        if (!person) {
            console.log(`  未找到，跳过\n`);
            continue;
        }

        // 更新描述
        const updateData: any = {
            description: fix.correctDescription
        };

        // 如果有X账号，更新officialLinks
        if (fix.xHandle) {
            let links = (person.officialLinks as any[]) || [];
            links = links.filter(link => {
                const u = (typeof link === 'string' ? link : link.url) || '';
                return !u.includes('twitter.com') && !u.includes('x.com');
            });
            links.push({
                title: 'X (Twitter)',
                url: `https://x.com/${fix.xHandle}`,
                platform: 'twitter'
            });
            updateData.officialLinks = links;
            console.log(`  添加X账号: @${fix.xHandle}`);
        }

        await prisma.people.update({
            where: { id: person.id },
            data: updateData
        });
        console.log(`  ✅ 描述已更新\n`);

        // 如果有X账号且当前没有头像，尝试下载
        if (fix.xHandle && (!person.avatarUrl || person.avatarUrl.includes('placeholder'))) {
            const filename = `${person.id}.jpg`;
            const filepath = path.join(AVATAR_DIR, filename);
            const avatarUrl = `https://unavatar.io/twitter/${fix.xHandle}`;

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
                console.log(`  ✅ 头像已更新: ${dbUrl}\n`);
            }
        }
    }

    console.log('=== 完成 ===');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
