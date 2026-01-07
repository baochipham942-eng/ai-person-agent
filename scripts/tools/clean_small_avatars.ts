
import { prisma } from './lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log('Scanning for low-quality (small) avatars...');
    const people = await prisma.people.findMany({
        select: { id: true, avatarUrl: true, name: true }
    });

    let count = 0;
    for (const p of people) {
        if (p.avatarUrl?.startsWith('/avatars/')) {
            const absolutePath = path.join(process.cwd(), 'public', p.avatarUrl);
            if (fs.existsSync(absolutePath)) {
                const stats = fs.statSync(absolutePath);
                if (stats.size < 2000) { // < 2KB (Likely unavatar default/grey ghost)
                    console.log(`⚠️ Small file for ${p.name} (${stats.size} bytes). Resetting to NULL.`);
                    await prisma.people.update({
                        where: { id: p.id },
                        data: { avatarUrl: null }
                    });
                    fs.unlinkSync(absolutePath); // Delete it
                    count++;
                }
            }
        }
    }
    console.log(`\n✅ Cleaned ${count} low-quality avatars.`);

    // Check Kevin Scott
    const kevin = await prisma.people.findFirst({
        where: { OR: [{ name: '凯文斯科特' }, { name: 'Kevin Scott' }] }
    });
    console.log('\nKevin Scott Info:', kevin ? JSON.stringify(kevin, null, 2) : 'Not Found');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
