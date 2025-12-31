import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// GET /api/admin/list-people - List all people in database
export async function GET() {
    try {
        const people = await prisma.people.findMany({
            select: {
                id: true,
                qid: true,
                name: true,
                status: true,
                completeness: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return NextResponse.json({ people, count: people.length });
    } catch (error) {
        console.error('List people error:', error);
        return NextResponse.json({
            error: 'Internal error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
