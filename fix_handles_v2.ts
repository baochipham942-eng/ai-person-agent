import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = util.promisify(exec);
const prisma = new PrismaClient();

const HANDLE_FIXES = [
    { name: 'Joanne Jang', handle: 'joannejang' }, // Was jikibot
    { name: 'Aakash Gupta', handle: 'aakashg0' },
    { name: 'Daniel Gross', handle: 'danielgross' },
    { name: 'Lukasz Kaiser', handle: 'lukaszkaiser' },
    { name: 'Wojciech Zaremba', handle: 'woj_zaremba' }
];

async function updateHandle(name: string, handle: string) {
    const person = await prisma.people.findFirst({ where: { name } });
    if (!person) {
        console.log(`⚠️ Person not found: ${name}`);
        return;
    }

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

    // Attempt download using Unavatar
    const avatarUrl = `https://unavatar.io/twitter/${handle}`;
    const filename = `${person.id}.jpg`;
    const filepath = path.join(process.cwd(), 'public', 'avatars', filename);

    try {
        const cmd = `curl -L -k -A "Mozilla/5.0" --max-time 15 -o "${filepath}" "${avatarUrl}"`;
        await execAsync(cmd);

        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            if (stats.size > 3000) {
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
        console.log(`  ❌ Failed to download avatar: ${e}`);
    }
}

async function main() {
    console.log('--- Fixing X Handles ---');
    for (const fix of HANDLE_FIXES) {
        await updateHandle(fix.name, fix.handle);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
