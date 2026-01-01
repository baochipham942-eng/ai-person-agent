
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
    const fixes = [
        {
            name: 'Mark Zuckerberg',
            aliases: ['马克·扎克伯格'],
            url: 'https://imageio.forbes.com/specials-images/imageserve/5c76b7d331358e35dd2773a9/0x0.jpg?format=jpg&crop=4401,4401,x0,y0,safe&height=416&width=416&fit=bounds'
        },
        {
            name: 'Yoshua Bengio',
            url: 'https://yoshuabengio.org/wp-content/uploads/2021/12/1.BENGIO_Yoshua_credit_Camille-Gladu-Drouin_dec2019-1-1-scaled.jpg'
        },
        {
            name: '凯文·斯科特', // Kevin Scott
            url: 'https://news.microsoft.com/source/wp-content/uploads/2025/02/Kevin-Scott-scaled.jpg'
        },
        {
            name: 'Aidan Gomez',
            url: 'https://cdn.sanity.io/images/rjtqmwfu/web3-prod/5c456fb8bb24c24be0df160f5192b4e1dd8a2f4b-648x720.png?auto=format&fit=max&q=90&w=324'
        },
        {
            name: '颜水成', // Yan Shuicheng
            url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdjNP-XK5pBTBSscJnBhxnYOFt0Fo7W6lBqP-yY6DGLlGOEVFg-j8sCmnW&s'
        }
    ];

    for (const fix of fixes) {
        console.log(`Fixing ${fix.name}...`);
        const p = await prisma.people.findFirst({
            where: {
                OR: [
                    { name: fix.name },
                    ...(fix.aliases ? fix.aliases.map(a => ({ name: a })) : [])
                ]
            }
        });

        if (p) {
            const path = await downloadAvatar(fix.url, p.id);
            if (path) {
                await prisma.people.update({ where: { id: p.id }, data: { avatarUrl: path } });
                console.log(`✅ ${p.name} updated.`);
            } else {
                console.log(`❌ Failed to download for ${p.name}`);
            }
        } else {
            console.log(`⚠️ Person not found: ${fix.name}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
