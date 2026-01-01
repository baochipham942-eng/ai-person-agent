import { prisma } from './lib/db/prisma';
import { searchWikidata, getWikidataEntityWithTranslation } from './lib/datasources/wikidata';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * 添加新的 AI 大厂人物 + 使用 Twitter 头像
 */

// 要添加的人物及其 Twitter handle
const NEW_AI_PEOPLE = [
    // OpenAI
    { name: 'Wojciech Zaremba', qid: 'Q27733815', twitter: 'wloadzaremba' },
    { name: 'Alec Radford', qid: 'Q29180956', twitter: null },
    { name: 'Lilian Weng', qid: 'Q132560483', twitter: 'lilianweng' },

    // Anthropic
    { name: 'Chris Olah', qid: 'Q50358648', twitter: 'ch402' },
    { name: 'Tom Brown', qid: 'Q114052496', twitter: null },
    { name: 'Jared Kaplan', qid: 'Q102649624', twitter: 'JaredKaplan3' },

    // DeepMind
    { name: 'David Silver', qid: 'Q119102257', twitter: null },
    { name: 'Koray Kavukcuoglu', qid: 'Q29221954', twitter: 'koaborom' },

    // Meta AI
    { name: 'Joelle Pineau', qid: 'Q44741969', twitter: 'jpaborom' },
    { name: 'Mike Schroepfer', qid: 'Q6848733', twitter: 'Schrep' },

    // Google
    { name: 'Jeff Dean', qid: 'Q6173703', twitter: 'JeffDean' },
    { name: 'Sundar Pichai', qid: 'Q3503829', twitter: 'sundarpichai' },

    // Microsoft
    { name: 'Kevin Scott', qid: 'Q1740254', twitter: 'kevinalscott' },
    { name: 'Eric Horvitz', qid: 'Q5386755', twitter: 'erichorvitz' },

    // NVIDIA
    { name: 'Bryan Catanzaro', qid: 'Q102502403', twitter: 'caborom' },

    // Transformer 论文作者
    { name: 'Ashish Vaswani', qid: 'Q44749723', twitter: null },
    { name: 'Jakob Uszkoreit', qid: 'Q98891246', twitter: null },
    { name: 'Lukasz Kaiser', qid: 'Q30251976', twitter: 'lukaborom' },

    // 中国 AI
    { name: '宿华', qid: 'Q104537499', twitter: null },
    { name: '张一鸣', qid: 'Q63306804', twitter: null },
    { name: '王兴', qid: 'Q17026272', twitter: null },
    { name: '雷军', qid: 'Q9000717', twitter: 'leaborom' },
];

async function downloadTwitterAvatar(handle: string, personId: string): Promise<string | null> {
    const url = `https://unavatar.io/twitter/${handle}?fallback=false`;

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

async function main() {
    console.log('=== 添加 AI 大厂人物 ===\n');

    let addedCount = 0;
    let skippedCount = 0;

    for (const person of NEW_AI_PEOPLE) {
        console.log(`\n处理: ${person.name}`);

        // 检查是否已存在
        const existing = await prisma.people.findUnique({
            where: { qid: person.qid }
        });

        if (existing) {
            console.log(`  - 已存在`);
            skippedCount++;
            continue;
        }

        // 获取 Wikidata 详情
        const entity = await getWikidataEntityWithTranslation(person.qid);
        if (!entity) {
            console.log(`  ✗ 无法获取 Wikidata 详情`);
            continue;
        }

        // 下载 Twitter 头像
        let avatarUrl: string | null = null;
        if (person.twitter) {
            console.log(`  下载 Twitter 头像 @${person.twitter}...`);
            avatarUrl = await downloadTwitterAvatar(person.twitter, person.qid);
            if (avatarUrl) {
                console.log(`  ✓ 头像: ${avatarUrl}`);
            }
        }

        // 如果没有 Twitter 头像，尝试 Wikidata 图片
        if (!avatarUrl && entity.imageUrl) {
            console.log(`  使用 Wikidata 图片...`);
            // 简单复用 Twitter 下载逻辑
            try {
                const response = await fetch(entity.imageUrl);
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const hash = crypto.createHash('md5').update(person.qid).digest('hex').slice(0, 8);
                    const filename = `${hash}.jpg`;
                    fs.writeFileSync(path.join(process.cwd(), 'public', 'avatars', filename), Buffer.from(buffer));
                    avatarUrl = `/avatars/${filename}`;
                    console.log(`  ✓ 头像: ${avatarUrl}`);
                }
            } catch { }
        }

        // 构建 officialLinks
        const officialLinks: any[] = [...(entity.officialLinks || [])];
        if (person.twitter && !officialLinks.some(l => l.type === 'x')) {
            officialLinks.push({
                type: 'x',
                url: `https://x.com/${person.twitter}`,
                handle: `@${person.twitter}`
            });
        }

        // 创建人物
        const newPerson = await prisma.people.create({
            data: {
                qid: entity.qid,
                name: entity.label,
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

        console.log(`  ✓ 创建成功: ${newPerson.name} (${newPerson.id})`);
        addedCount++;

        await new Promise(r => setTimeout(r, 800));
    }

    console.log(`\n=== 完成 ===`);
    console.log(`添加: ${addedCount}`);
    console.log(`跳过: ${skippedCount}`);

    const total = await prisma.people.count();
    console.log(`总人数: ${total}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
