
import { prisma } from './lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log('Scanning for broken avatar links...');
    const people = await prisma.people.findMany({
        select: { id: true, avatarUrl: true, name: true }
    });

    let count = 0;
    for (const p of people) {
        if (p.avatarUrl?.startsWith('/avatars/')) {
            const absolutePath = path.join(process.cwd(), 'public', p.avatarUrl);
            if (!fs.existsSync(absolutePath)) {
                console.log(`❌ Missing file for ${p.name} (${p.avatarUrl}). Resetting to NULL.`);
                await prisma.people.update({
                    where: { id: p.id },
                    data: { avatarUrl: null }
                });
                count++;
            }
        }
    }
    console.log(`\n✅ Fixed ${count} profiles with broken links.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
