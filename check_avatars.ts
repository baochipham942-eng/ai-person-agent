import { prisma } from './lib/db/prisma';

async function check() {
    const people = await prisma.people.findMany({
        select: { name: true, avatarUrl: true, occupation: true, description: true },
        orderBy: { createdAt: 'desc' }
    });

    const withAvatar = people.filter(p => p.avatarUrl && p.avatarUrl.length > 0);
    const withoutAvatar = people.filter(p => !p.avatarUrl);

    console.log('=== 有头像 (' + withAvatar.length + ') ===');
    withAvatar.forEach(p => console.log('✓', p.name, '-', p.avatarUrl));

    console.log('\n=== 无头像 (' + withoutAvatar.length + ') ===');
    withoutAvatar.forEach(p => console.log('✗', p.name));
}

check().catch(console.error).finally(() => prisma.$disconnect());
