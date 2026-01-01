
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    // QIDs for Daniel Gross (Q19364797) - we know this one
    // Lukasz Kaiser -> likely Qsomething
    // Wojciech Zaremba -> Qsomething

    // Let's just search by name again to see what happened
    const names = ['Daniel Gross', 'Lukasz Kaiser', 'Wojciech Zaremba'];
    for (const name of names) {
        const p = await prisma.people.findFirst({
            where: { name: { contains: name } }
        });
        if (p) {
            console.log(`Found ${name}: ${p.id}, QID: ${p.qid}, Name: ${p.name}`);
        } else {
            console.log(`${name} NOT found.`);
        }
    }
}

check()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
