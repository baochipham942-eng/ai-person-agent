import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = util.promisify(exec);
const prisma = new PrismaClient();

const HANDLE_UPDATES = [
    { name: '姚舜禹', handle: 'ShunyuYao12' },   // Was yaoshunyu (WRONG)
    { name: 'Yao Shunyu', handle: 'ShunyuYao12' },
    { name: 'Haider Khan', handle: 'HaidarKhan_' }, // Was haiderkhanai (WRONG)
    { name: 'Joelle Pineau', handle: 'jpineau1' },  // Was jpaborom (WRONG)
    { name: '乔尔·皮诺', handle: 'jpineau1' },
    { name: 'Tang Jie', handle: 'jietang' },       // Was None
    { name: '唐杰', handle: 'jietang' },
    { name: 'Liu Zhiyuan', handle: 'zibuyu9' },    // Was None
    { name: '刘知远', handle: 'zibuyu9' }
];

const HANDLE_REMOVALS = [
    'Yan Junjie', '闫俊杰', // Was yanjun_ai (WRONG)
    'David Silver', '大卫·西尔弗' // Was davidsilver (WRONG/Fake)
];

async function updateHandle(name: string, handle: string) {
    const person = await prisma.people.findFirst({ where: { name } });
    if (!person) return;

    const currentLinks = (person.officialLinks as any[]) || [];
    let updatedLinks = currentLinks.filter((l: any) => l.type !== 'x' && l.type !== 'twitter');

    updatedLinks.push({
        title: 'X',
        url: `https://x.com/${handle}`,
        type: 'x'
    });

    await prisma.people.update({
        where: { id: person.id },
        data: { officialLinks: updatedLinks }
    });
    console.log(`✅ Updated handle for ${name} -> @${handle}`);

    // Download Avatar
    const avatarUrl = `https://unavatar.io/twitter/${handle}`;
    const filename = `${person.id}.jpg`;
    const filepath = path.join(process.cwd(), 'public', 'avatars', filename);

    try {
        const cmd = `curl -L -k -A "Mozilla/5.0" --max-time 15 -o "${filepath}" "${avatarUrl}"`;
        await execAsync(cmd);

        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            if (stats.size > 2000) {
                await prisma.people.update({
                    where: { id: person.id },
                    data: { avatarUrl: `/avatars/${filename}` }
                });
                console.log(`  ✅ Avatar downloaded (${(stats.size / 1024).toFixed(1)}KB)`);
            } else {
                console.log(`  ⚠️ Downloaded avatar too small (${stats.size} bytes). Ignoring.`);
                fs.unlinkSync(filepath);
            }
        }
    } catch (e) {
        console.log(`  ❌ Failed to download: ${e}`);
    }
}

async function removeHandle(name: string) {
    const person = await prisma.people.findFirst({ where: { name } });
    if (!person) return;

    const currentLinks = (person.officialLinks as any[]) || [];
    const hasX = currentLinks.some((l: any) => l.type === 'x' || l.type === 'twitter');

    if (hasX) {
        const updatedLinks = currentLinks.filter((l: any) => l.type !== 'x' && l.type !== 'twitter');
        await prisma.people.update({
            where: { id: person.id },
            data: { officialLinks: updatedLinks }
        });
        console.log(`🗑️ Removed invalid handle for ${name}`);
    }
}

async function main() {
    console.log('--- Applying Handle Fixes V3 ---');

    for (const update of HANDLE_UPDATES) {
        await updateHandle(update.name, update.handle);
    }

    for (const name of HANDLE_REMOVALS) {
        await removeHandle(name);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
