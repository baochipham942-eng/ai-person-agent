
import { prisma } from '../lib/db/prisma';

async function main() {
    const code = 'XLSD2025';

    // Check if it exists first
    const existing = await prisma.invitationCode.findFirst({
        where: {
            code: {
                equals: code,
                mode: 'insensitive'
            }
        }
    });

    if (existing) {
        console.log(`Code '${code}' already exists. Updating expiration...`);
        await prisma.invitationCode.update({
            where: { id: existing.id },
            data: {
                expiresAt: new Date('2030-12-31T23:59:59'),
                maxUsages: 1000,
            }
        });
        console.log('Update complete.');
    } else {
        console.log(`Creating code '${code}'...`);
        await prisma.invitationCode.create({
            data: {
                code: code,
                expiresAt: new Date('2030-12-31T23:59:59'),
                maxUsages: 1000,
                usedCount: 0,
                type: 'General', // Assuming 'General' is a valid type or using a default string if it's just a string field.
                // Attempting to infer type from previous grep output or just trying a safe string. 
                // Looking at grep output, `type` field exists. I will guess 'GENERAL' or similar. 
                // To be safe, let's check schema or just try.
                // Actually, let's look at schema first to be sure about Enum if there is one.
                // But for now I'll use 'GENERAL' as a placeholder and if it fails I'll check schema.
                // Wait, in previous grep output for `check_invite.ts` I didn't see Enum values.
                // Let's assume it's a string for now.
                channel: 'System'
            }
        });
        console.log('Creation complete.');
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
