
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
    // Zuckerberg URL (Raw)
    const zuckRaw = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Mark_Zuckerberg_F8_2019_Keynote_(32830578717)_(cropped).jpg/800px-Mark_Zuckerberg_F8_2019_Keynote_(32830578717)_(cropped).jpg';
    const zuckWeserv = `https://images.weserv.nl/?url=${encodeURIComponent(zuckRaw)}`;

    // Bengio URL (Raw)
    const bengioRaw = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Yoshua_Bengio_2019_cropped.jpg/800px-Yoshua_Bengio_2019_cropped.jpg';
    const bengioWeserv = `https://images.weserv.nl/?url=${encodeURIComponent(bengioRaw)}`;

    // Fix Zuck
    const zuck = await prisma.people.findFirst({ where: { OR: [{ name: 'Mark Zuckerberg' }, { name: '马克·扎克伯格' }] } });
    if (zuck) {
        const path = await downloadAvatar(zuckWeserv, zuck.id);
        if (path) {
            await prisma.people.update({ where: { id: zuck.id }, data: { avatarUrl: path } });
            console.log('✅ Zuckerberg Avatar Fixed.');
        }
    }

    // Fix Bengio
    const bengio = await prisma.people.findFirst({ where: { name: 'Yoshua Bengio' } });
    if (bengio) {
        const path = await downloadAvatar(bengioWeserv, bengio.id);
        if (path) {
            await prisma.people.update({ where: { id: bengio.id }, data: { avatarUrl: path } });
            console.log('✅ Bengio Avatar Fixed.');
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
