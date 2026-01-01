import { prisma } from './lib/db/prisma';

async function main() {
    const names = ['Greg Brockman', '安德烈·卡帕西'];
    const people = await prisma.people.findMany({
        where: {
            name: {
                in: names
            }
        },
        select: {
            id: true,
            name: true,
            avatarUrl: true
        }
    });
    console.log(JSON.stringify(people, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
