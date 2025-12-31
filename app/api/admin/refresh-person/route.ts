import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getWikidataEntityWithTranslation } from '@/lib/datasources/wikidata';
import { inngest } from '@/lib/inngest/client';

// POST /api/admin/refresh-person
// Body: { personId: string }
export async function POST(request: NextRequest) {
    try {
        const { personId } = await request.json();

        if (!personId) {
            return NextResponse.json({ error: 'Missing personId' }, { status: 400 });
        }

        // 1. Find person
        const person = await prisma.people.findUnique({ where: { id: personId } });

        if (!person) {
            return NextResponse.json({ error: 'Person not found' }, { status: 404 });
        }

        // 2. Get latest Wikidata info
        const entity = await getWikidataEntityWithTranslation(person.qid);

        if (!entity) {
            return NextResponse.json({ error: 'Failed to fetch Wikidata' }, { status: 500 });
        }

        // 3. Update person with latest Wikidata data
        await prisma.people.update({
            where: { id: personId },
            data: {
                name: entity.label,
                description: entity.description,
                aliases: entity.aliases,
                occupation: entity.occupation || [],
                organization: entity.organization || [],
                officialLinks: entity.officialLinks,
                avatarUrl: entity.imageUrl || person.avatarUrl,
                status: 'building',
            }
        });

        // 4. Clear old raw items
        const deletedItems = await prisma.rawPoolItem.deleteMany({
            where: { personId }
        });

        // 5. Clear old cards
        const deletedCards = await prisma.card.deleteMany({
            where: { personId }
        });

        // 6. Trigger Inngest job
        await inngest.send({
            name: 'person/created',
            data: {
                personId: person.id,
                personName: entity.label,
                englishName: entity.englishLabel,
                qid: person.qid,
                orcid: entity.orcid,
                officialLinks: entity.officialLinks,
                aliases: entity.aliases,
            }
        });

        return NextResponse.json({
            success: true,
            personId,
            name: entity.label,
            qid: person.qid,
            orcid: entity.orcid,
            github: entity.officialLinks.find(l => l.type === 'github')?.handle,
            twitter: entity.officialLinks.find(l => l.type === 'x')?.handle,
            youtube: entity.officialLinks.find(l => l.type === 'youtube')?.handle,
            deletedItems: deletedItems.count,
            deletedCards: deletedCards.count,
            message: 'Refresh triggered',
        });
    } catch (error) {
        console.error('Refresh person error:', error);
        return NextResponse.json({
            error: 'Internal error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
