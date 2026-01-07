
import { prisma } from '../lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

async function downloadImage(url: string): Promise<string | null> {
    return new Promise(async (resolve) => {
        const hash = crypto.createHash('md5').update(url).digest('hex');
        const ext = path.extname(url).split('?')[0] || '.jpg';
        const filename = `${hash}${ext}`;
        const filepath = path.join(AVATAR_DIR, filename);

        if (fs.existsSync(filepath)) {
            console.log(`Image already exists locally: ${filename}`);
            resolve(`/avatars/${filename}`);
            return;
        }

        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'Bot/1.0' } });
            if (!res.ok) {
                console.error(`Failed to download ${url}: Status ${res.status}`);
                resolve(null);
                return;
            }

            const buffer = await res.arrayBuffer();
            fs.writeFileSync(filepath, Buffer.from(buffer));
            console.log(`Saved to ${filepath}`);
            resolve(`/avatars/${filename}`);
        } catch (e) {
            console.error(`Error downloading ${url}:`, e);
            resolve(null);
        }
    });
}

async function main() {
    const people = await prisma.people.findMany({
        where: {
            OR: [
                { avatarUrl: { contains: 'github.com' } },
                { avatarUrl: { contains: 'githubusercontent.com' } },
                { avatarUrl: { startsWith: 'http' } }
            ],
            status: { not: 'error' }
        }
    });

    console.log(`Found ${people.length} external avatars.`);

    for (const p of people) {
        if (p.avatarUrl?.startsWith('http')) {
            console.log(`Downloading for ${p.name}: ${p.avatarUrl}`);
            const localPath = await downloadImage(p.avatarUrl);
            if (localPath) {
                await prisma.people.update({
                    where: { id: p.id },
                    data: { avatarUrl: localPath }
                });
                console.log(`Updated ${p.name} -> ${localPath}`);
            }
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
