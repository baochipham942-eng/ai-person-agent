// Script to export data from local database
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const localPrisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://linchen@localhost:5432/ai_person'
        }
    }
});

async function exportData() {
    try {
        console.log('Connecting to local database...');

        // Export all tables
        const users = await localPrisma.user.findMany();
        const invitationCodes = await localPrisma.invitationCode.findMany();
        const people = await localPrisma.people.findMany();
        const cards = await localPrisma.card.findMany();
        const rawPoolItems = await localPrisma.rawPoolItem.findMany();
        const searchSessions = await localPrisma.searchSession.findMany();
        const userProfiles = await localPrisma.userProfile.findMany();

        const data = {
            users,
            invitationCodes,
            people,
            cards,
            rawPoolItems,
            searchSessions,
            userProfiles
        };

        console.log('Data counts:');
        console.log(`- Users: ${users.length}`);
        console.log(`- InvitationCodes: ${invitationCodes.length}`);
        console.log(`- People: ${people.length}`);
        console.log(`- Cards: ${cards.length}`);
        console.log(`- RawPoolItems: ${rawPoolItems.length}`);
        console.log(`- SearchSessions: ${searchSessions.length}`);
        console.log(`- UserProfiles: ${userProfiles.length}`);

        fs.writeFileSync('/tmp/ai_person_export.json', JSON.stringify(data, null, 2));
        console.log('\nData exported to /tmp/ai_person_export.json');

    } catch (error) {
        console.error('Export error:', error);
    } finally {
        await localPrisma.$disconnect();
    }
}

exportData();
