import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// 热度排序映射（用于前端排序）
const POPULARITY: Record<string, number> = {
    // Tier 10: 超级明星
    'Sam Altman': 10,
    'Elon Musk': 10,
    '黄仁勋': 10,

    // Tier 9: AI 巨头领导者
    'Greg Brockman': 9,
    'Demis Hassabis': 9,
    'Dario Amodei': 9,
    '李开复': 9,  // 国内 AI 教父

    // Tier 8: 图灵奖/顶级学者
    'Geoffrey Hinton': 8,
    'Yann LeCun': 8,
    'Yoshua Bengio': 8,
    '李飞飞': 8,
    '杨植麟': 8,  // Kimi/月之暗面

    // Tier 7: 核心研究者/创始人
    'Andrej Karpathy': 7,
    'Ilya Sutskever': 7,
    '吴恩达': 7,
    'Mustafa Suleyman': 7,
    '季逸超': 7,  // 面壁智能
    '姚舜禹': 7,  // 阶跃星辰
    '唐杰': 7,    // 智谱AI

    // Tier 6: 知名人物
    'Aidan Gomez': 6,
    'Arthur Mensch': 6,
    'Emad Mostaque': 6,
    'Alexandr Wang': 6,
    'Dylan Field': 6,
    'Mira Murati': 6,
    'Noam Shazeer': 6,
    'John Schulman': 6,
    '闫俊杰': 6,  // MiniMax
    '戴文渊': 6,  // 第四范式
    '周明': 6,    // 澜舟科技
    '朱军': 6,    // 生数科技
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
