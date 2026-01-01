
import { prisma } from './lib/db/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

async function downloadAvatar(url: string, personId: string): Promise<string | null> {
    const filename = `${crypto.createHash('md5').update(personId + url).digest('hex').substring(0, 8)}.jpg`;
    const relativePath = `/avatars/${filename}`;
    const absolutePath = path.join(process.cwd(), 'public', relativePath);

    try {
        console.log(`Downloading ${url}...`);
        await execAsync(`curl -L -k -A "Mozilla/5.0" --max-time 30 -o "${absolutePath}" "${url}"`);

        if (fs.existsSync(absolutePath)) {
            const stats = fs.statSync(absolutePath);
            if (stats.size < 3000) {
                fs.unlinkSync(absolutePath);
                console.log(`❌ Too small (${stats.size} bytes).`);
                return null;
            }
            return relativePath;
        }
    } catch (e) {
        console.log(`Error downloading: ${e}`);
    }
    return null;
}

// Map for Known "Hard" cases (Wiki/Academic) -> Weserv
const MANUAL_FIXES: Record<string, string> = {
    'Zhu Jun': 'https://images.weserv.nl/?url=ml.cs.tsinghua.edu.cn/~jun/images/jun.jpg',
    '朱军': 'https://images.weserv.nl/?url=ml.cs.tsinghua.edu.cn/~jun/images/jun.jpg',
    'Paul Graham': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/4/4b/Paulgraham_240x320.jpg',
    'Eliezer Yudkowsky': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Eliezer_Yudkowsky%2C_Stanford_2006_%28square_crop%29.jpg/600px-Eliezer_Yudkowsky%2C_Stanford_2006_%28square_crop%29.jpg',
    'Marian Croak': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/d/d3/The_Next_Three_Billion-_Marian_Croak_speaking.jpg/800px-The_Next_Three_Billion-_Marian_Croak_speaking.jpg',
    'Stuart Russell': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Stuart_Russell_2022.jpg/600px-Stuart_Russell_2022.jpg',
    '斯图尔特 罗素': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Stuart_Russell_2022.jpg/600px-Stuart_Russell_2022.jpg',
    'David Silver': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/c/c8/David_Silver_Royal_Society.jpg/736px-David_Silver_Royal_Society.jpg',
    '大卫 西尔弗': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/c/c8/David_Silver_Royal_Society.jpg/736px-David_Silver_Royal_Society.jpg'
};

async function main() {
    console.log('Starting Comprehensive Fix...');

    // 1. Remove Garbage Handles (abornet)
    // Fetch all and iterate
    const allLinks = await prisma.people.findMany({ select: { id: true, officialLinks: true, name: true } });
    for (const p of allLinks) {
        let changed = false;
        const newLinks = (p.officialLinks as any[]).filter(link => {
            if (link.type === 'x' && (link.url?.includes('abornet') || link.handle?.includes('abornet'))) {
                console.log(`Removing garbage link for ${p.name}: ${link.url}`);
                changed = true;
                return false;
            }
            return true;
        });
        if (changed) {
            await prisma.people.update({ where: { id: p.id }, data: { officialLinks: newLinks } });
        }
    }

    // 2. Manual Fixes (Wiki/Academic)
    for (const [name, url] of Object.entries(MANUAL_FIXES)) {
        const p = await prisma.people.findFirst({ where: { name } });
        if (p) {
            console.log(`Processing Manual Fix for ${name}...`);
            const path = await downloadAvatar(url, p.id);
            if (path) {
                await prisma.people.update({ where: { id: p.id }, data: { avatarUrl: path } });
            }
        }
    }

    // 3. Localize Baidu Links
    const baiduPeople = await prisma.people.findMany({
        where: { avatarUrl: { contains: 'bcebos.com' } }
    });
    for (const p of baiduPeople) {
        if (p.avatarUrl) {
            console.log(`Localizing Baidu Image for ${p.name}...`);
            const path = await downloadAvatar(p.avatarUrl, p.id);
            if (path) {
                await prisma.people.update({ where: { id: p.id }, data: { avatarUrl: path } });
            } else {
                // If download fails (very rare for Baidu), keep the link? Or null?
                // Keep link if fail, user can see it at least.
                // But typically curl works fine for bcebos.
            }
        }
    }

    // 4. Clean up "Unavatar" URLs that are NOT local (Force Check)
    // Find people with 'unavatar.io' in DB string (not local path)
    const unavatarPeople = await prisma.people.findMany({
        where: { avatarUrl: { contains: 'unavatar.io' } }
    });
    for (const p of unavatarPeople) {
        if (p.avatarUrl) {
            console.log(`Checking Unavatar for ${p.name}: ${p.avatarUrl}`);
            const path = await downloadAvatar(p.avatarUrl, p.id);
            if (path) {
                await prisma.people.update({ where: { id: p.id }, data: { avatarUrl: path } });
            } else {
                console.log(`Failed/LowQual Unavatar for ${p.name}. Resetting to NULL.`);
                await prisma.people.update({ where: { id: p.id }, data: { avatarUrl: null } });
            }
        }
    }

    // 5. Special Case: Tom Brown (Reset) - likely garbage unavatar
    await prisma.people.updateMany({
        where: { name: '汤姆 布朗' },
        data: { avatarUrl: null }
    });

    console.log('✅ Comprehensive Fix Complete.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
