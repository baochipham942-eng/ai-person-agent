import { prisma } from './lib/db/prisma';
import { fetchRawCareerData, savePersonRoles } from './lib/datasources/career';

async function test() {
    // Get Sam Altman
    const person = await prisma.people.findFirst({
        where: { name: { contains: 'Sam Altman' } }
    });

    if (!person) {
        console.log('Sam Altman not found');
        return;
    }

    console.log('Testing for:', person.name, person.qid);

    // Fetch raw career data
    const rawData = await fetchRawCareerData(person.qid);
    console.log('Raw career data:', rawData.length, 'items');
    console.log('Sample:', JSON.stringify(rawData.slice(0, 2), null, 2));

    // Save to new tables
    await savePersonRoles(person.id, rawData);
    console.log('Saved to PersonRole table');

    // Verify
    const roles = await prisma.personRole.findMany({
        where: { personId: person.id },
        include: { organization: true }
    });
    console.log('PersonRoles saved:', roles.length);
    if (roles.length > 0) {
        console.log('Sample role:', JSON.stringify(roles[0], null, 2));
    }
}

test().catch(console.error).finally(() => prisma.$disconnect());
