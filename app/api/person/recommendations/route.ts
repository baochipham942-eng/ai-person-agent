import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// 热度排序映射（用于前端排序）
const POPULARITY: Record<string, number> = {
    // Tier 10: 核心 AI 领袖 (Godfathers & Current Top Lab Leads)
    'Sam Altman': 10,       // OpenAI CEO
    'Demis Hassabis': 10,   // DeepMind CEO
    'Dario Amodei': 10,     // Anthropic CEO
    'Geoffrey Hinton': 10,  // Turing Award
    'Yann LeCun': 10,       // Turing Award, Meta Chief AI
    'Yoshua Bengio': 10,    // Turing Award
    'Ilya Sutskever': 10,   // SSI / OpenAI Co-founder
    '黄仁勋': 10,           // NVIDIA
    '李飞飞': 10,           // Stanford, ImageNet

    // Tier 9: 关键技术贡献者 & 顶级高管
    'Greg Brockman': 9,
    'Andrej Karpathy': 9,
    'Jeff Dean': 9,         // Google Chief Scientist
    'Noam Shazeer': 9,      // Transformer, Character.ai
    'Alec Radford': 9,      // GPT Creator
    'Ashish Vaswani': 9,    // Transformer Lead Author
    'Kaiming He': 9,        // ResNet (何恺明)
    '李开复': 9,            // 01.AI, AI 普及

    // Tier 8: 独角兽创始人 & 知名研究者
    'Mustafa Suleyman': 8,  // Inflection / Microsoft
    'Chris Olah': 8,        // Anthropic (Interpretability)
    'David Silver': 8,      // AlphaGo 
    'Aidan Gomez': 8,       // Cohere
    'Arthur Mensch': 8,     // Mistral
    '杨植麟': 8,            // 月之暗面 (Kimi)
    'Andrew Ng': 8,         // Coursera, DeepLearning.AI (吴恩达)
    '吴恩达': 8,

    // Tier 7: 国内 AI 新锐 & 重要研究员
    '季逸超': 7,            // 面壁智能
    '姚舜禹': 7,            // 阶跃星辰
    '唐杰': 7,              // 智谱AI / 清华
    '周伯文': 7,            // 衔远科技
    'Mira Murati': 7,       // OpenAI CTO
    'Jakob Uszkoreit': 7,   // Transformer
    'Lukasz Kaiser': 7,     // Transformer

    // Tier 6: 科技巨头 CEO (非 AI 核心但有重大影响) & 其他创业者
    'Elon Musk': 6,         // xAI (Influence is high but primary fame is wider)
    'Mark Zuckerberg': 6,   // Meta (Llama is huge, but he is general tech)
    'Satya Nadella': 6,
    'Sundar Pichai': 6,
    '张一鸣': 5,            // 字节 (User requested downgrade)
    '王慧文': 4,            // 光年之外 (User requested downgrade)
    '王兴': 4,              // 美团
    '雷军': 4,              // 小米
    '宿华': 4,              // 快手
    '闫俊杰': 6,            // MiniMax
    '戴文渊': 6,            // 第四范式
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
