
import { prisma } from '../lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

async function downloadImage(url: string | null): Promise<string | null> {
    if (!url) return null;

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

async function getWikidataImage(qid: string): Promise<string | null> {
    try {
        const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();
        const entity = data.entities[qid];
        if (!entity) return null;

        // P18 is the property for "image"
        const claims = entity.claims['P18'];
        if (claims && claims.length > 0) {
            const fileName = claims[0].mainsnak.datavalue.value;
            // Wikimedia Commons URL construction
            const encodedName = encodeURIComponent(fileName).replace(/%20/g, '_');
            return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedName}`;
        }
        return null;
    } catch (e) {
        console.error(`Error fetching Wikidata for ${qid}:`, e);
        return null;
    }
}

async function main() {
    const people = await prisma.people.findMany({
        where: {
            OR: [
                { avatarUrl: null },
                { avatarUrl: '' }
            ],
            qid: { not: '' },  // qid 是 string 类型，使用非空字符串过滤
            status: { not: 'error' }
        }
    });

    console.log(`Found ${people.length} missing avatars with QIDs.`);

    for (const p of people) {
        if (p.qid) {
            console.log(`Checking Wikidata (${p.qid}) for ${p.name}...`);
            const imageUrl = await getWikidataImage(p.qid);

            if (imageUrl) {
                console.log(`Found image: ${imageUrl}`);
                const localPath = await downloadImage(imageUrl);

                if (localPath) {
                    await prisma.people.update({
                        where: { id: p.id },
                        data: { avatarUrl: localPath }
                    });
                    console.log(`Updated ${p.name} -> ${localPath}`);
                }
            } else {
                console.log(`No image claim found for ${p.name} (${p.qid})`);
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
