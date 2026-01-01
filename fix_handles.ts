
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

async function main() {
    console.log('Updating Twitter Handles...');

    // 1. Yoshua Bengio: @Yoshua_Bengio
    await prisma.people.updateMany({
        where: { name: 'Yoshua Bengio' },
        data: {
            officialLinks: [
                { type: 'x', url: 'https://x.com/Yoshua_Bengio', handle: '@Yoshua_Bengio' },
                { type: 'website', url: 'https://yoshuabengio.org' }
            ]
        }
    });

    // 2. Jason Wei: @JasonWei92
    // Also fix Data + Avatar
    const jason = await prisma.people.findFirst({ where: { name: 'Jason Wei' } });
    if (jason) {
        await prisma.people.update({
            where: { id: jason.id },
            data: {
                officialLinks: [
                    { type: 'x', url: 'https://x.com/JasonWei92', handle: '@JasonWei92' },
                    { type: 'website', url: 'https://jasonwei.net' }
                ]
            }
        });
        // Download Avatar from X (Unavatar)
        const path = await downloadAvatar('https://unavatar.io/twitter/JasonWei92', jason.id);
        if (path) {
            await prisma.people.update({ where: { id: jason.id }, data: { avatarUrl: path } });
            console.log('✅ Jason Wei Avatar Updated (from X).');
        }
    }

    // 3. Mark Zuckerberg: @finkd
    await prisma.people.updateMany({
        where: { OR: [{ name: 'Mark Zuckerberg' }, { name: '马克·扎克伯格' }] },
        data: {
            officialLinks: [
                { type: 'x', url: 'https://x.com/finkd', handle: '@finkd' }
            ]
        } // Preserve existing Avatar (Forbes)
    });

    // 4. Joanne Jang: @jikibot (Keeping it if it exists, verifying later)

    // 5. Clean up Yang Zhilin & Yan Shuicheng (Remove bad X links)
    await prisma.people.updateMany({
        where: { name: '杨植麟' },
        data: { officialLinks: [] } // Remove bad 'YangZhilin'
    });

    await prisma.people.updateMany({
        where: { name: '颜水成' },
        data: { officialLinks: [] }
    });

    console.log('handles updated.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
