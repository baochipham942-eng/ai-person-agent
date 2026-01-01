
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
        preferredQid: 'Q27733815'
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
        try {
            let person = null;
            let targetQid: string | null = vip.preferredQid || null;
            let entity = null;

            // 1. Resolve QID if not provided
            if (!targetQid) {
                const results = await searchWikidata(vip.name, 10);
                if (results.length > 0) {
                    const candidates = results.filter(r => {
                        const desc = (r.description || '').toLowerCase();
                        return vip.keywords.some(k => desc.includes(k.toLowerCase()));
                    });

                    if (candidates.length > 0) {
                        console.log(`  Found matching candidate: ${candidates[0].label} (${candidates[0].id})`);
                        targetQid = candidates[0].id;
                    }
                }
            }

            if (!targetQid) {
                console.log(`  Could not identify QID for ${vip.name}`);
                continue;
            }

            // 2. Check if person exists by QID
            person = await prisma.people.findUnique({ where: { qid: targetQid } });

            if (!person) {
                // Check by Name also just in case
                person = await prisma.people.findFirst({
                    where: { name: { contains: vip.name, mode: 'insensitive' } }
                });
            }

            // 3. Get Entity Details
            entity = await getWikidataEntityWithTranslation(targetQid);
            if (!entity) {
                console.log(`  Failed to fetch entity details for ${targetQid}.`);
                continue;
            }

            // Use English label if available, otherwise entity.label
            // Actually entity.label might be localized. entity.englishLabel?
            // Let's check getWikidataEntityWithTranslation return type locally...
            // Assuming it returns what I saw in batch_add_people.ts: englishLabel, label.

            const finalName = vip.name; // Force the name we want (English)

            if (!person) {
                console.log(`  Creating new person: ${finalName} (${targetQid})`);
                person = await prisma.people.create({
                    data: {
                        qid: entity.qid,
                        name: finalName,
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
            } else {
                console.log(`  Updating existing person: ${person.name} (${person.id}) -> likely renaming to ${finalName}`);
                // Verify QID matches
                if (person.qid !== targetQid && person.qid) {
                    console.log(`  WARNING: ID mismatch? Existing QID: ${person.qid}, Target: ${targetQid}`);
                    // Should we update QID? Only if unique constraint allows.
                    // If collision, we have a problem.
                }

                await prisma.people.update({
                    where: { id: person.id },
                    data: {
                        name: finalName,
                        qid: targetQid, // Ensure QID is set
                    }
                });
            }

            // 4. Update Handle
            console.log(`  Updating handle to @${vip.handle}...`);
            let links = (person.officialLinks as any[]) || [];
            links = links.filter(link => {
                const u = (typeof link === 'string' ? link : link.url) || '';
                return !u.includes('twitter.com') && !u.includes('x.com');
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

            // 5. Download Avatar
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
                console.log(`  Failed to download avatar.`);
            }

        } catch (e) {
            console.error(`  Error processing ${vip.name}:`, e);
        }
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
