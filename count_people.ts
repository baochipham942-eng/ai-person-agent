import { prisma } from './lib/db/prisma';

async function main() {
    const count = await prisma.people.count();
    console.log(`Current people count: ${count}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
