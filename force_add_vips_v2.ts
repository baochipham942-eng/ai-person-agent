
import { PrismaClient } from '@prisma/client';
import { searchWikidata, getWikidataEntityWithTranslation } from './lib/datasources/wikidata';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

const MISSING_VIPS = [
    {
        name: 'Daniel Gross',
        handle: 'danielgross',
        keywords: ['investor', 'ai', 'combinator', 'apple', 'machine learning', 'entrepreneur'],
        preferredQid: 'Q19364797'
    },
    {
        name: 'Lukasz Kaiser',
        handle: 'lukaszkaiser',
        keywords: ['transformer', 'google', 'openai', 'researcher', 'neural'],
    },
    {
        name: 'Wojciech Zaremba',
        handle: 'woj_zaremba',
        keywords: ['openai', 'cofounder', 'robotics'],
    }
];

async function downloadAvatar(url: string, filepath: string): Promise<boolean> {
    try {
        const cmd = `curl -L -f -k -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${filepath}" "${url}"`;
        await execPromise(cmd);

        if (!fs.existsSync(filepath)) return false;
        const stats = fs.statSync(filepath);
        if (stats.size < 1000) {
            console.log(`  File too small (${stats.size} bytes), deleting.`);
            fs.unlinkSync(filepath);
            return false;
        }
        return true;
    } catch (error) {
        console.error(`  Download failed: ${(error as Error).message}`);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        return false;
    }
}

async function main() {
    for (const vip of MISSING_VIPS) {
        console.log(`\nProcessing ${vip.name}...`);

        let person = await prisma.people.findFirst({
            where: { name: { contains: vip.name, mode: 'insensitive' } }
        });

        if (!person) {
            console.log(`  Not found in DB. Searching Wikidata...`);
            let targetQid: string | null = null;

            if (vip.preferredQid) {
                console.log(`  Using preferred QID: ${vip.preferredQid}`);
                targetQid = vip.preferredQid;
            } else {
                const results = await searchWikidata(vip.name, 10);

                if (results.length > 0) {
                    // Filter by keywords
                    const candidates = results.filter(r => {
                        const desc = (r.description || '').toLowerCase();
                        return vip.keywords.some(k => desc.includes(k.toLowerCase()));
                    });

                    if (candidates.length > 0) {
                        console.log(`  Found matching candidate: ${candidates[0].label} (${candidates[0].id}) - ${candidates[0].description}`);
                        targetQid = candidates[0].id;
                    } else {
                        console.log(`  No candidates matched keywords: ${vip.keywords.join(', ')}`);
                        console.log(`  Top result was: ${results[0].label} - ${results[0].description}`);
                        // Fallback to top result if keywords fail? Maybe risky.
                        // Better to skip than add garbage.
                        console.log(`  Skipping to avoid adding wrong person.`);
                        continue;
                    }
                } else {
                    console.log(`  No Wikidata results found.`);
                    continue;
                }
            }

            const entity = await getWikidataEntityWithTranslation(targetQid);
            if (!entity) {
                console.log(`  Failed to fetch entity details for ${targetQid}.`);
                continue;
            }

            // Create person
            person = await prisma.people.create({
                data: {
                    qid: entity.qid,
                    name: entity.label,
                    aliases: entity.aliases,
                    description: entity.description,
                    avatarUrl: null,
                    occupation: entity.occupation || [],
                    organization: entity.organization || [],
                    officialLinks: entity.officialLinks,
                    status: 'pending',
                    completeness: 0
                }
            });
            console.log(`  Created person: ${person.name} (${person.id})`);
        } else {
            console.log(`  Found existing person: ${person.name}`);
        }

        // Update Handle
        console.log(`  Updating handle to @${vip.handle}...`);
        let links = (person.officialLinks as any[]) || [];
        links = links.filter(link => {
            if (typeof link === 'string') return !link.includes('twitter.com') && !link.includes('x.com');
            if (typeof link === 'object' && link.url) return !link.url.includes('twitter.com') && !link.url.includes('x.com');
            return true;
        });
        links.push({
            title: 'X (Twitter)',
            url: `https://x.com/${vip.handle}`,
            platform: 'twitter'
        });

        person = await prisma.people.update({
            where: { id: person.id },
            data: { officialLinks: links }
        });

        // Download Avatar
        const filename = `${person.id}.jpg`;
        const filepath = path.join(AVATAR_DIR, filename);
        const avatarUrl = `https://unavatar.io/twitter/${vip.handle}`;

        console.log(`  Downloading avatar from ${avatarUrl}...`);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

        const success = await downloadAvatar(avatarUrl, filepath);
        if (success) {
            const fileBuffer = fs.readFileSync(filepath);
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const dbUrl = `/avatars/${filename}?v=${hash.substring(0, 8)}`;

            await prisma.people.update({
                where: { id: person.id },
                data: { avatarUrl: dbUrl }
            });
            console.log(`  Avatar updated to ${dbUrl}`);
        } else {
            console.log(`  Failed to download avatar. Keeping previous/null.`);
        }
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
