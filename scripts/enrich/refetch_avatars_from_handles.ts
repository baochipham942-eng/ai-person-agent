
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const TARGETS = [
    { name: 'Joanne Jang', handle: 'joannejang' },
    { name: 'Aakash Gupta', handle: 'aakashg0' },
    { name: 'Daniel Gross', handle: 'danielgross' },
    { name: 'Lukasz Kaiser', handle: 'lukaszkaiser' },
    { name: 'Wojciech Zaremba', handle: 'woj_zaremba' },
];

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

async function downloadAvatar(url: string, filepath: string): Promise<boolean> {
    try {
        // curl with -L for redirects, -f to fail on 404/etc
        // Added User-Agent to avoid some blocking, though unavatar usually works fine
        const cmd = `curl -L -f -k -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${filepath}" "${url}"`;
        await execPromise(cmd);

        // Check if file exists and has size
        if (!fs.existsSync(filepath)) return false;
        const stats = fs.statSync(filepath);
        if (stats.size < 1000) { // < 1KB is suspicious
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

async function run() {
    for (const target of TARGETS) {
        console.log(`Processing ${target.name}...`);

        const person = await prisma.people.findFirst({
            where: { name: target.name }
        });

        if (!person) {
            console.log(`  Person not found in DB.`);
            continue;
        }

        const filename = `${person.id}.jpg`;
        const filepath = path.join(AVATAR_DIR, filename);
        const url = `https://unavatar.io/twitter/${target.handle}`;

        console.log(`  Downloading from ${url}...`);

        // Remove existing file to force refresh
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }

        const success = await downloadAvatar(url, filepath);

        if (success) {
            // Calculate hash
            const fileBuffer = fs.readFileSync(filepath);
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const dbUrl = `/avatars/${filename}?v=${hash.substring(0, 8)}`;

            await prisma.people.update({
                where: { id: person.id },
                data: { avatarUrl: dbUrl }
            });
            console.log(`  Success! Updated DB to ${dbUrl}`);
        } else {
            console.log(`  Failed to download valid avatar.`);
        }
    }
}

run()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
