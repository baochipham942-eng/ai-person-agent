import { prisma } from './lib/db/prisma';
import { getWikidataEntityWithTranslation } from './lib/datasources/wikidata';
import { inngest } from './lib/inngest/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * 添加 Mark Zuckerberg 并触发数据抓取
 */
async function main() {
    console.log('=== 添加 Mark Zuckerberg ===\n');

    const qid = 'Q36215';
    const name = 'Mark Zuckerberg';
    const twitter = 'finkd'; // 很久没用了，但可能有头像

    // 检查是否已存在
    const existing = await prisma.people.findUnique({
        where: { qid }
    });

    if (existing) {
        if (existing.status === 'deleted') {
            console.log('  恢复已删除的记录...');
            await prisma.people.update({
                where: { id: existing.id },
                data: { status: 'pending' }
            });
        } else {
            console.log('  已存在:', existing.name);
        }
    } else {
        // 获取 Wikidata 详情
        const entity = await getWikidataEntityWithTranslation(qid);

        if (!entity) {
            console.error('  ✗ 无法从 Wikidata 获取详情');
            return;
        }

        // 下载头像
        let avatarUrl: string | null = null;

        // 尝试 Twitter 头像
        console.log(`  下载 Twitter 头像 @${twitter}...`);
        try {
            const resp = await fetch(`https://unavatar.io/twitter/${twitter}?fallback=false`);
            if (resp.ok) {
                const buffer = await resp.arrayBuffer();
                if (buffer.byteLength > 1000) {
                    const hash = crypto.createHash('md5').update(qid).digest('hex').slice(0, 8);
                    const filename = `${hash}.jpg`;
                    fs.writeFileSync(path.join(process.cwd(), 'public', 'avatars', filename), Buffer.from(buffer));
                    avatarUrl = `/avatars/${filename}`;
                    console.log(`  ✓ Twitter 头像: ${avatarUrl}`);
                }
            }
        } catch { }

        // 如果失败，使用 Wikidata 图片
        if (!avatarUrl && entity.imageUrl) {
            console.log(`  使用 Wikidata 图片...`);
            try {
                const resp = await fetch(entity.imageUrl);
                if (resp.ok) {
                    const buffer = await resp.arrayBuffer();
                    const hash = crypto.createHash('md5').update(qid).digest('hex').slice(0, 8);
                    const filename = `${hash}.jpg`;
                    fs.writeFileSync(path.join(process.cwd(), 'public', 'avatars', filename), Buffer.from(buffer));
                    avatarUrl = `/avatars/${filename}`;
                    console.log(`  ✓ Wikidata 头像: ${avatarUrl}`);
                }
            } catch { }
        }

        // 构建 officialLinks
        const officialLinks = entity.officialLinks || [];
        if (!officialLinks.some(l => l.type === 'x')) {
            officialLinks.push({ type: 'x', url: `https://twitter.com/${twitter}`, handle: `@${twitter}` });
        }

        // 创建记录
        const person = await prisma.people.create({
            data: {
                qid: entity.qid,
                name: entity.label, // 可能是 "马克·扎克伯格"
                aliases: entity.aliases,
                description: entity.description,
                avatarUrl,
                occupation: entity.occupation || [],
                organization: entity.organization || [],
                officialLinks,
                sourceWhitelist: [],
                status: 'pending',
                completeness: 0,
            }
        });

        console.log(`  ✓ 创建成功: ${person.name}`);

        // 触发 Inngest
        console.log('  触发数据抓取...');
        await inngest.send({
            name: 'person/created',
            data: {
                personId: person.id,
                personName: person.name,
                englishName: 'Mark Zuckerberg',
                qid: person.qid,
                officialLinks: person.officialLinks || [],
                aliases: person.aliases,
            },
        });
        console.log('  ✓ 任务已发送');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
