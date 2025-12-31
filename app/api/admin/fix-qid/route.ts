import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getWikidataEntityWithTranslation } from '@/lib/datasources/wikidata';
import { inngest } from '@/lib/inngest/client';

// POST /api/admin/fix-qid
// Body: { oldQid: string, newQid: string }
export async function POST(request: NextRequest) {
    try {
        const { oldQid, newQid } = await request.json();

        if (!oldQid || !newQid) {
            return NextResponse.json({ error: 'Missing oldQid or newQid' }, { status: 400 });
        }

        // 1. Find person with old QID
        const person = await prisma.people.findUnique({ where: { qid: oldQid } });

        if (!person) {
            return NextResponse.json({ error: 'Person not found' }, { status: 404 });
        }

        // 2. Fetch new Wikidata entity
        const entity = await getWikidataEntityWithTranslation(newQid);

        if (!entity) {
            return NextResponse.json({ error: 'Failed to fetch Wikidata entity' }, { status: 500 });
        }

        // 3. Update person record
        await prisma.people.update({
            where: { id: person.id },
            data: {
                qid: newQid,
                name: entity.label,
                description: entity.description,
                aliases: entity.aliases,
                occupation: entity.occupation || [],
                organization: entity.organization || [],
                officialLinks: entity.officialLinks,
                avatarUrl: entity.imageUrl || person.avatarUrl,
                status: 'pending',
                completeness: 0,
            }
        });

        // 4. Clear old raw items
        const deletedItems = await prisma.rawPoolItem.deleteMany({
            where: { personId: person.id }
        });

        // 5. Clear old cards
        const deletedCards = await prisma.card.deleteMany({
            where: { personId: person.id }
        });

        // 6. Trigger Inngest job
        await inngest.send({
            name: 'person/created',
            data: {
                personId: person.id,
                personName: entity.label,
                englishName: entity.englishLabel,
                qid: newQid,
                orcid: entity.orcid,
                officialLinks: entity.officialLinks,
                aliases: entity.aliases,
            }
        });

        return NextResponse.json({
            success: true,
            personId: person.id,
            newQid,
            orcid: entity.orcid,
            github: entity.officialLinks.find(l => l.type === 'github')?.handle,
            twitter: entity.officialLinks.find(l => l.type === 'x')?.handle,
            youtube: entity.officialLinks.find(l => l.type === 'youtube')?.handle,
            deletedItems: deletedItems.count,
            deletedCards: deletedCards.count,
            message: 'QID fixed and enrichment triggered',
        });
    } catch (error) {
        console.error('Fix QID error:', error);
        return NextResponse.json({
            error: 'Internal error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
