
import { prisma } from '../lib/db/prisma';

async function list() {
    const codes = await prisma.invitationCode.findMany();
    console.log('--- All Invitation Codes ---');
    if (codes.length === 0) {
        console.log('No codes found.');
    } else {
        codes.forEach(c => {
            console.log(`Code: ${c.code}, Expires: ${c.expiresAt.toISOString()}, Used: ${c.usedCount}/${c.maxUsages}, ID: ${c.id}`);
        });
    }
}

list()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
