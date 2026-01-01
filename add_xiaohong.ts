
import { prisma } from './lib/db/prisma';
import { inngest } from './lib/inngest/client';

async function main() {
    console.log('Adding Xiao Hong (肖弘)...');

    // Check if exists
    let person = await prisma.people.findFirst({
        where: {
            OR: [
                { name: '肖弘' },
                { name: '肖红' }
            ]
        }
    });

    if (!person) {
        // Search Wikidata for "Xiao Hong" is hard, but we can try to find QID via searching exact label? 
        // For now, leave QID empty.
        person = await prisma.people.create({
            data: {
                name: '肖弘',
                // englishName not in DB schema
                aliases: ['Red Xiao', '肖红', 'Xiao Hong Manus'],
                description: 'Founder and CEO of Manus AI, previously founded Nightingale Technology and Butterfly Effect Technology. Acquired by Meta.',
                organization: ['Manus AI', 'Meta'],
                occupation: ['Entrepreneur', 'CEO'],
                status: 'pending',
                sourceWhitelist: [],
                officialLinks: [], // Can be filled later or by fetch
                qid: 'Q-XIAO-HONG-PLACEHOLDER', // Placeholder
            }
        });
        console.log('Created:', person.name);
    } else {
        console.log('Person already exists:', person.name);
    }

    // Trigger build
    await inngest.send({
        name: 'person/created',
        data: {
            personId: person.id,
            personName: person.name,
            englishName: 'Xiao Hong',
            qid: person.qid || '',
            aliases: person.aliases,
            organization: person.organization,
            officialLinks: person.officialLinks || [],
            orcid: null, // No ORCID known
        }
    });
    console.log('Triggered build job.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
