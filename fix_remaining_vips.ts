
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const prisma = new PrismaClient();

const TARGETS = [
    {
        name: 'Jason Wei',
        url: 'https://aiconference.com/wp-content/uploads/2024/04/Jason-Wei.jpg'
    },
    {
        name: '颜水成',
        url: 'https://yanshuicheng.info/_next/static/media/bg-shuicheng-hr.b09f4fce.webp'
    }
];

async function downloadAvatar(url: string, filename: string): Promise<boolean> {
    const filepath = path.join(process.cwd(), 'public', 'avatars', filename);
    try {
        // -L follows redirects, -k allows insecure, -A matches a standard browser
        const curlCommand = `curl -L -k -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${filepath}" "${url}"`;
        await execAsync(curlCommand);

        // Check if file exists and has size
        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            if (stats.size > 3000) { // > 3KB
                console.log(`✅ Downloaded ${filename} (${(stats.size / 1024).toFixed(1)}KB)`);
                return true;
            } else {
                console.log(`⚠️ Downloaded file too small: ${filename} (${stats.size} bytes). Deleting.`);
                fs.unlinkSync(filepath);
                return false;
            }
        }
    } catch (error) {
        console.error(`❌ Failed to download ${url}:`, error);
    }
    return false;
}

async function main() {
    console.log('--- Fixing Remaining VIPs ---');

    for (const target of TARGETS) {
        const person = await prisma.people.findFirst({
            where: { name: target.name }
        });

        if (!person) {
            console.log(`⚠️ Person not found: ${target.name}`);
            continue;
        }

        const ext = target.url.includes('.webp') ? '.webp' : '.jpg';
        const filename = `${person.id}${ext}`;
        const publicUrl = `/avatars/${filename}`;

        console.log(`Processing ${target.name}...`);
        const success = await downloadAvatar(target.url, filename);

        if (success) {
            await prisma.people.update({
                where: { id: person.id },
                data: {
                    avatarUrl: publicUrl,
                    lastFetchedAt: new Date()
                }
            });
            console.log(`✅ Updated DB for ${target.name}`);
        } else {
            console.log(`❌ Failed to update ${target.name}`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
