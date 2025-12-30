// Add "Sam Altman" alias to the database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAlias() {
    // Find the Sam Altman record
    const person = await prisma.people.findFirst({
        where: { qid: 'Q7407093' }
    });

    if (!person) {
        console.log('Person not found');
        return;
    }

    console.log('Current aliases:', person.aliases);

    // Add "Sam Altman" if not already present
    if (!person.aliases.includes('Sam Altman')) {
        const newAliases = [...person.aliases, 'Sam Altman'];
        await prisma.people.update({
            where: { id: person.id },
            data: { aliases: newAliases }
        });
        console.log('Added "Sam Altman" alias');
        console.log('New aliases:', newAliases);
    } else {
        console.log('"Sam Altman" already exists');
    }

    await prisma.$disconnect();
}

addAlias();
