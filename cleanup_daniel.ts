
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndFix() {
    const wrong = await prisma.people.findFirst({
        where: { name: 'Daniel Gross' }
    });

    if (wrong) {
        console.log(`Found Daniel Gross: ${wrong.id}, QID: ${wrong.qid}`);
        console.log(`Description: ${wrong.description}`);

        if (wrong.description && wrong.description.includes('holocaust')) {
            console.log('Deleting incorrect entry...');
            await prisma.people.delete({ where: { id: wrong.id } });
            console.log('Deleted.');
        } else {
            console.log('Entry seems compatible or verified manually?');
        }
    } else {
        console.log('No "Daniel Gross" found in DB.');
    }
}

checkAndFix()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
