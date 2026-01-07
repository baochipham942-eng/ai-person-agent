
import { prisma } from '../lib/db/prisma';


async function main() {
    console.log('Starting Timeline (PersonRole) deduplication...');

    const people = await prisma.people.findMany();
    let totalDeleted = 0;

    for (const p of people) {
        const roles = await prisma.personRole.findMany({
            where: { personId: p.id },
            include: { organization: true },
            orderBy: { startDate: 'desc' } // Keep the latest/most complete maybe? Or just arbitrary.
        });

        if (roles.length <= 1) continue;

        const uniqueKeys = new Set<string>();
        const toDeleteIds: string[] = [];

        for (const r of roles) {
            // Generate a unique key for the role
            // Key: Org + Role + StartDate
            const org = (r.organization?.name || '').toLowerCase().trim();
            const roleName = (r.role || '').toLowerCase().trim();
            const start = r.startDate ? r.startDate.toISOString().split('T')[0] : 'no-date';

            const key = `${org}|${roleName}|${start}`;

            if (uniqueKeys.has(key)) {
                toDeleteIds.push(r.id);
            } else {
                uniqueKeys.add(key);
            }
        }

        if (toDeleteIds.length > 0) {
            await prisma.personRole.deleteMany({
                where: { id: { in: toDeleteIds } }
            });
            console.log(`[${p.name}] Deleted ${toDeleteIds.length} duplicate roles.`);
            totalDeleted += toDeleteIds.length;
        }
    }

    console.log(`\nTimeline deduplication complete. Deleted ${totalDeleted} items.`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
