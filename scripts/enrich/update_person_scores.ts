
import { prisma } from '../lib/db/prisma';


const SCORES: Record<string, number> = {
    // Tier 10: The Gods & Kings (10.0 - 10.9)
    'Geoffrey Hinton': 10.9,  // Deep Learning Godfather
    '杰弗里·辛顿': 10.9,
    '黄仁勋': 10.8,           // NVIDIA, Computing Power
    'Ilya Sutskever': 10.8,   // SSI / OpenAI, Model Architect
    '伊利亚·苏茨克维': 10.8,
    'Demis Hassabis': 10.7,   // DeepMind, AGI & Science
    '德米斯·哈萨比斯': 10.7,
    'Sam Altman': 10.6,       // OpenAI, Industry Driver
    'Yann LeCun': 10.5,       // Meta AI, CNN
    '杨立昆': 10.5,
    'Yoshua Bengio': 10.5,    // Turing Award
    '约书亚·本吉奥': 10.5,
    'Dario Amodei': 10.4,     // Anthropic, Safety & Scaling
    '达里奥·阿莫代': 10.4,
    '李飞飞': 10.2,           // ImageNet, Vision
    'Elon Musk': 10.1,        // xAI, Early OpenAI
    '伊隆·马斯克': 10.1,

    // Tier 9: Architects & Builders (9.0 - 9.9)
    'Ashish Vaswani': 9.9,    // Transformer Lead
    '阿希什·瓦斯瓦尼': 9.9,
    'Noam Shazeer': 9.9,      // Attention, MoE, Character.ai
    'Alec Radford': 9.8,      // GPT Creator
    '亚历克·拉德福德': 9.8,
    'Jeff Dean': 9.7,         // Google AI System
    '杰夫·迪恩': 9.7,
    'Greg Brockman': 9.6,     // OpenAI Engineering
    'Andrej Karpathy': 9.5,   // AI Education, Autopilot
    '安德烈·卡帕西': 9.5,
    'Kaiming He': 9.5,        // ResNet
    'Satya Nadella': 9.4,     // Microsoft CEO
    '萨提亚·纳德拉': 9.4,
    '李开复': 9.2,            // AI Evangelist (CN)

    // Tier 8: Founders & Researchers (8.0 - 8.9)
    'Mustafa Suleyman': 8.8,  // Inflection
    'David Silver': 8.8,      // RL, AlphaGo
    'Chris Olah': 8.7,        // Interpretability
    'Arthur Mensch': 8.6,     // Mistral
    'Aidan Gomez': 8.5,       // Cohere
    'Jeremy Howard': 8.5,     // fast.ai, accessible AI
    '杰里米·霍华德': 8.5,
    'Andrew Ng': 8.4,         // Education
    '吴恩达': 8.4,
    'Paul Graham': 8.3,       // Ecosystem
    'Marc Andreessen': 8.3,   // Capital
    '杨植麟': 8.2,            // Moonshot (CN)

    // Tier 7: Notable Leaders (7.0 - 7.9)
    'Mira Murati': 7.9,       // OpenAI Product
    'Scott Wu': 7.8,          // Devin
    'Jakob Uszkoreit': 7.7,   // Transformer
    '雅各布·乌什科雷特': 7.7,
    'Lukasz Kaiser': 7.7,     // Transformer
    '唐杰': 7.6,              // Zhipu (CN)
    'Richard Socher': 7.5,
    '印奇': 7.5,              // Megvii (CN)
    '颜水成': 7.4,
    '周伯文': 7.4,
    '季逸超': 7.3,
    '姚舜禹': 7.3,
    'Chip Huyen': 7.2,
    'Allie K. Miller': 7.1,

    // Tier 6: CEOs & Others
    'Mark Zuckerberg': 6.9,
    'Sundar Pichai': 6.9,
    'Clément Delangue': 6.8,  // Hugging Face
    '克莱芒·德朗格': 6.8,
    'Raquel Urtasun': 6.7,
    '闫俊杰': 6.6,
    '戴文渊': 6.6,
    'John Giannandrea': 6.5,
};

async function main() {
    console.log('Starting score update...');

    const allPeople = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            aliases: true,
        }
    });

    for (const person of allPeople) {
        let score = SCORES[person.name];

        // 1. Check aliases if name not found
        if (!score && person.aliases && person.aliases.length > 0) {
            for (const alias of person.aliases) {
                if (SCORES[alias]) {
                    score = SCORES[alias];
                    console.log(`Matched alias "${alias}" for "${person.name}" -> ${score}`);
                    break;
                }
            }
        }

        // 2. Fuzzy match
        if (!score) {
            if (person.name.includes('Altman')) score = 10.6;
            else if (person.name.includes('Hinton')) score = 10.9;
            else if (person.name.includes('LeCun')) score = 10.5;
            else if (person.name.includes('Bengio')) score = 10.5;
            else if (person.name.includes('Hassabis')) score = 10.7;
            else if (person.name.includes('Musk')) score = 10.1;
            else score = 5;
        }

        // Use raw SQL to bypass "cached plan must not change result type" error
        // caused by column type change (Int -> Float) and connection pooling.
        await prisma.$executeRaw`UPDATE "People" SET "aiContributionScore" = ${score} WHERE id = ${person.id}`;

        if (score > 5) {
            console.log(`Updated ${person.name} with score ${score}`);
        }
    }

    console.log('Score update complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
