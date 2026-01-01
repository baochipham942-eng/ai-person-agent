import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const person = await prisma.people.findFirst({
        where: { OR: [{ name: 'David Silver' }, { name: '大卫·西尔弗' }] }
    });

    if (!person) {
        console.log('David Silver not found');
        return;
    }

    const srcPath = path.join(process.cwd(), 'public', 'avatars', 'test_david_silver.jpg');
    const destFilename = `${person.id}.jpg`;
    const destPath = path.join(process.cwd(), 'public', 'avatars', destFilename);

    if (fs.existsSync(srcPath)) {
        fs.renameSync(srcPath, destPath);
        await prisma.people.update({
            where: { id: person.id },
            data: { avatarUrl: `/avatars/${destFilename}` }
        });
        console.log(`✅ Updated David Silver avatar`);
    } else {
        console.log('❌ Download failed, file missing');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
