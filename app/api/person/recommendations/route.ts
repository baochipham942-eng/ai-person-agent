import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// 热度排序映射（用于前端排序）
const POPULARITY: Record<string, number> = {
    'Sam Altman': 10,
    'Elon Musk': 10,
    '黄仁勋': 10,
    'Greg Brockman': 9,
    'Demis Hassabis': 9,
    'Dario Amodei': 9,
    'Geoffrey Hinton': 8,
    'Yann LeCun': 8,
    'Yoshua Bengio': 8,
    '李飞飞': 8,
    'Andrej Karpathy': 7,
    'Ilya Sutskever': 7,
    '吴恩达': 7,
    'Mustafa Suleyman': 7,
    'Aidan Gomez': 6,
    'Arthur Mensch': 6,
    'Emad Mostaque': 6,
    'Alexandr Wang': 6,
    'Dylan Field': 6,
    'Mira Murati': 6,
    'Noam Shazeer': 6,
    'John Schulman': 6,
};

export async function GET() {
    try {
        const people = await prisma.people.findMany({
            where: {
                status: {
                    not: 'error',
                },
            },
            select: {
                id: true,
                name: true,
                avatarUrl: true,
                occupation: true,
                description: true,
                status: true,
            },
        });

        // 按热度排序
        const sorted = people.sort((a, b) => {
            const popA = POPULARITY[a.name] || 5;
            const popB = POPULARITY[b.name] || 5;
            if (popB !== popA) return popB - popA;
            return a.name.localeCompare(b.name);
        });

        return NextResponse.json(sorted);
    } catch (error) {
        console.error('Failed to fetch people recommendations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch people recommendations' },
            { status: 500 }
        );
    }
}
