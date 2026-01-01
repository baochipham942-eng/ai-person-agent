
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

// 通过Wikipedia REST API获取人物图片
async function getWikipediaImage(title: string, lang: string = 'en'): Promise<string | null> {
    try {
        const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'AIPersonAgent/1.0 (https://github.com/example; contact@example.com)'
            }
        });

        if (!response.ok) {
            console.log(`  Wikipedia API返回 ${response.status} for ${title}`);
            return null;
        }

        const data = await response.json();

        // 优先使用原始图片，否则使用缩略图
        if (data.originalimage?.source) {
            return data.originalimage.source;
        }
        if (data.thumbnail?.source) {
            // 修改缩略图URL获取更大尺寸
            return data.thumbnail.source.replace(/\/\d+px-/, '/500px-');
        }

        return null;
    } catch (error) {
        console.error(`  获取Wikipedia图片失败: ${(error as Error).message}`);
        return null;
    }
}

// 通过Wikidata QID获取图片
async function getWikidataImage(qid: string): Promise<string | null> {
    try {
        const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'AIPersonAgent/1.0'
            }
        });

        if (!response.ok) return null;

        const data = await response.json();
        const entity = data.entities?.[qid];

        // P18 是图片属性
        const imageValue = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (imageValue) {
            // 构造Wikimedia Commons图片URL
            const filename = imageValue.replace(/ /g, '_');
            const hash = require('crypto').createHash('md5').update(filename).digest('hex');
            return `https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash[0]}${hash[1]}/${encodeURIComponent(filename)}`;
        }

        return null;
    } catch (error) {
        console.error(`  获取Wikidata图片失败: ${(error as Error).message}`);
        return null;
    }
}

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
    console.log('=== 从Wikipedia补充缺失头像 ===\n');

    // 获取所有缺少头像的人
    const peopleWithoutAvatar = await prisma.people.findMany({
        where: {
            OR: [
                { avatarUrl: null },
                { avatarUrl: '' }
            ]
        },
        select: {
            id: true,
            name: true,
            qid: true,
            aliases: true
        }
    });

    console.log(`找到 ${peopleWithoutAvatar.length} 人缺少头像\n`);

    for (const person of peopleWithoutAvatar) {
        console.log(`处理: ${person.name} (${person.qid || 'no QID'})`);

        let imageUrl: string | null = null;

        // 1. 先尝试通过Wikidata QID获取
        if (person.qid) {
            console.log(`  尝试Wikidata ${person.qid}...`);
            imageUrl = await getWikidataImage(person.qid);
        }

        // 2. 尝试英文Wikipedia
        if (!imageUrl && person.aliases && person.aliases.length > 0) {
            // 找一个英文名字
            const englishName = person.aliases.find(a => /^[a-zA-Z\s]+$/.test(a));
            if (englishName) {
                console.log(`  尝试英文Wikipedia: ${englishName}...`);
                imageUrl = await getWikipediaImage(englishName, 'en');
            }
        }

        // 3. 尝试中文Wikipedia
        if (!imageUrl) {
            console.log(`  尝试中文Wikipedia: ${person.name}...`);
            imageUrl = await getWikipediaImage(person.name, 'zh');
        }

        if (imageUrl) {
            console.log(`  找到图片: ${imageUrl.substring(0, 80)}...`);

            const ext = imageUrl.includes('.png') ? '.png' : '.jpg';
            const filename = `${person.id}${ext}`;
            const filepath = path.join(AVATAR_DIR, filename);

            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

            const success = await downloadAvatar(imageUrl, filepath);
            if (success) {
                const fileBuffer = fs.readFileSync(filepath);
                const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                const dbUrl = `/avatars/${filename}?v=${hash.substring(0, 8)}`;

                await prisma.people.update({
                    where: { id: person.id },
                    data: { avatarUrl: dbUrl }
                });
                console.log(`  ✅ 头像更新成功: ${dbUrl}\n`);
            } else {
                console.log(`  ❌ 下载失败\n`);
            }
        } else {
            console.log(`  ❌ 未找到Wikipedia图片\n`);
        }

        // 避免请求太快
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n=== 完成 ===');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
