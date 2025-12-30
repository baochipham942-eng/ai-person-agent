// Script to import data to Neon database
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const neonPrisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
        }
    }
});

async function importData() {
    try {
        console.log('Loading exported data...');
        const data = JSON.parse(fs.readFileSync('/tmp/ai_person_export.json', 'utf-8'));

        console.log('Connecting to Neon database...');

        // Import in order to respect foreign keys

        // 1. Users
        if (data.users.length > 0) {
            console.log(`Importing ${data.users.length} users...`);
            for (const user of data.users) {
                await neonPrisma.user.upsert({
                    where: { id: user.id },
                    update: user,
                    create: user
                });
            }
        }

        // 2. Invitation Codes
        if (data.invitationCodes.length > 0) {
            console.log(`Importing ${data.invitationCodes.length} invitation codes...`);
            for (const code of data.invitationCodes) {
                await neonPrisma.invitationCode.upsert({
                    where: { id: code.id },
                    update: code,
                    create: code
                });
            }
        }

        // 3. People
        if (data.people.length > 0) {
            console.log(`Importing ${data.people.length} people...`);
            for (const person of data.people) {
                await neonPrisma.people.upsert({
                    where: { id: person.id },
                    update: person,
                    create: person
                });
            }
        }

        // 4. Cards
        if (data.cards.length > 0) {
            console.log(`Importing ${data.cards.length} cards...`);
            for (const card of data.cards) {
                await neonPrisma.card.upsert({
                    where: { id: card.id },
                    update: card,
                    create: card
                });
            }
        }

        // 5. RawPoolItems
        if (data.rawPoolItems.length > 0) {
            console.log(`Importing ${data.rawPoolItems.length} raw pool items...`);
            for (const item of data.rawPoolItems) {
                await neonPrisma.rawPoolItem.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // 6. SearchSessions (skip userId if user doesn't exist)
        if (data.searchSessions.length > 0) {
            console.log(`Importing ${data.searchSessions.length} search sessions...`);
            for (const session of data.searchSessions) {
                try {
                    await neonPrisma.searchSession.upsert({
                        where: { id: session.id },
                        update: session,
                        create: session
                    });
                } catch (e) {
                    // Skip if foreign key constraint fails
                    console.log(`Skipping session ${session.id}: ${e}`);
                }
            }
        }

        // 7. UserProfiles
        if (data.userProfiles.length > 0) {
            console.log(`Importing ${data.userProfiles.length} user profiles...`);
            for (const profile of data.userProfiles) {
                await neonPrisma.userProfile.upsert({
                    where: { id: profile.id },
                    update: profile,
                    create: profile
                });
            }
        }

        console.log('\n✅ Data import completed!');

    } catch (error) {
        console.error('Import error:', error);
    } finally {
        await neonPrisma.$disconnect();
    }
}

importData();
