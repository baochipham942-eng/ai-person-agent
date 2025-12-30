
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
    const items = await prisma.rawPoolItem.groupBy({
        by: ['sourceType'],
        _count: {
            id: true
        }
    });
    console.log(JSON.stringify(items, null, 2));
}

checkData()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
