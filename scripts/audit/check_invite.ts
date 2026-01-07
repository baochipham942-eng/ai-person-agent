
import { prisma } from './lib/db/prisma';

async function main() {
    const invites = await prisma.invitationCode.findMany({
        where: {
            code: {
                startsWith: 'XLSD',
                mode: 'insensitive'
            }
        }
    });

    if (invites.length === 0) {
        console.log(`No invitation codes found starting with 'XLSD'.`);
    } else {
        console.log(`Found ${invites.length} codes starting with 'XLSD':`);
        invites.forEach(invite => {
            console.log(`- Code: ${invite.code}`);
            console.log(`  Expires At: ${invite.expiresAt}`);
            console.log(`  Max Usages: ${invite.maxUsages}`);
            console.log(`  Used Count: ${invite.usedCount}`);
        });
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
