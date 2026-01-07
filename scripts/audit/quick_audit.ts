import { prisma } from '../lib/db/prisma';

async function main() {
    console.log('Connecting to database...');

    // Simple count queries
    const totalPeople = await prisma.people.count();
    console.log('Total people:', totalPeople);

    const withWhyImportant = await prisma.people.count({
        where: { whyImportant: { not: null } }
    });
    console.log('With whyImportant:', withWhyImportant);
    console.log('Missing whyImportant:', totalPeople - withWhyImportant);

    // Avatar stats
    const withAvatar = await prisma.people.count({
        where: { avatarUrl: { not: null } }
    });
    console.log('\nWith avatar:', withAvatar);
    console.log('Missing avatar:', totalPeople - withAvatar);

    // Sample avatars
    const samplePeople = await prisma.people.findMany({
        select: { name: true, avatarUrl: true },
        take: 5
    });
    console.log('\nSample avatars:');
    for (const p of samplePeople) {
        console.log(`  ${p.name}: ${p.avatarUrl?.substring(0, 60)}...`);
    }

    // PersonRole stats
    const totalRoles = await prisma.personRole.count();
    const rolesWithStart = await prisma.personRole.count({
        where: { startDate: { not: null } }
    });
    console.log('\nTotal roles:', totalRoles);
    console.log('Roles with startDate:', rolesWithStart);
    console.log('Roles missing startDate:', totalRoles - rolesWithStart);

    await prisma.$disconnect();
    console.log('\nDone!');
}

main().catch(console.error);
