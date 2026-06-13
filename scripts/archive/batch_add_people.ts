
import 'dotenv/config';
import { prisma } from './lib/db/prisma';
import { searchWikidata, getWikidataEntityWithTranslation } from './lib/datasources/wikidata';
import { downloadAndStoreAvatar } from './lib/storage/avatarStorage';
import { inngest } from './lib/inngest/client';

const TARGET_COUNT = 200; // Increased for expanded list

// List of high-profile people in Tech, AI, Science, Business
// Focused on AI leaders and researchers
const CANDIDATES = [
    // ========== NEW BATCH - 2026 Update ==========

    // Transformer Paper Authors (核心论文作者)
    'Noam Shazeer',       // Character.AI 联合创始人, Transformer 共同作者
    'Aidan Gomez',        // Cohere CEO, Transformer 共同作者
    'Jakob Uszkoreit',    // Inceptive 创始人, Transformer 共同作者
    'Niki Parmar',        // Essential AI 联合创始人, Transformer 共同作者
    'Ashish Vaswani',     // Essential AI 联合创始人, Transformer 第一作者
    'Llion Jones',        // Sakana AI 创始人, Transformer 共同作者

    // Microsoft AI (微软AI核心)
    'Kevin Scott',        // 微软 CTO
    'Mustafa Suleyman',   // 微软 AI CEO, DeepMind 联合创始人
    'Eric Horvitz',       // 微软首席科学官
    'Sébastien Bubeck',   // 微软研究院, Phi模型负责人

    // OpenAI Core (OpenAI 核心)
    'Mira Murati',        // 前 OpenAI CTO
    'John Schulman',      // PPO/RLHF 发明人, 现Anthropic
    'Kevin Weil',         // OpenAI CPO
    'Jan Leike',          // 前 OpenAI 对齐负责人
    'Wojciech Zaremba',   // OpenAI 联合创始人

    // AI Researchers (AI 研究者)
    'Richard Socher',     // You.com CEO, GloVe 发明人
    'Oriol Vinyals',      // DeepMind 研究总监, Seq2Seq 作者
    'Christopher Manning', // 斯坦福 NLP 教授
    'Percy Liang',        // 斯坦福 HAI, HELM 评测框架
    'Jitendra Malik',     // 伯克利 CV 泰斗
    'Alex Krizhevsky',    // AlexNet 作者

    // AI Safety (AI 安全)
    'Stuart Russell',     // UC Berkeley, AI安全权威
    'Max Tegmark',        // MIT, Future of Life Institute
    'Eliezer Yudkowsky',  // MIRI 创始人

    // AI Infra & Applications
    'Emad Mostaque',      // 前 Stability AI CEO
    'Nat Friedman',       // AI 投资人, 前 GitHub CEO
    'Daniel Gross',       // AI 投资人

    // China AI Core (中国AI核心人物 - Expanded)
    '张鹏',               // 智谱AI CEO (Zhang Peng)
    '唐杰',               // 智谱AI 首席科学家 (Tang Jie)
    '何恺明',             // ResNet 作者 (Kaiming He)
    '颜水成',             // 昆仑万维/Skywork (Yan Shuicheng)
    '贾佳亚',             // 思谋科技 (Jia Jiaya)
    '周伯文',             // 衔远科技 (Zhou Bowen)
    '李彦宏',             // 百度 (Robin Li)
    '马化腾',             // 腾讯 (Pony Ma)
    '张一鸣',             // 字节跳动 (Zhang Yiming)
    '雷军',               // 小米 (Lei Jun) - 大模型投入巨大
    '王小川',             // 百川智能 (Wang Xiaochuan)
    '李开复',             // 零一万物 (Lee Kai-Fu)
    '杨植麟',             // 月之暗面 (Yang Zhilin)
    '闫俊杰',             // MiniMax 创始人
    '沈向洋',             // 前微软全球执行副总裁, 小冰董事长
    '周明',               // 澜舟科技创始人
    '楼天城',             // 小马智行 CTO
    '唐文斌',             // 旷视科技 CTO
    '印奇',               // 旷视科技 CEO
    '徐立',               // 商汤科技 CEO
    '戴文渊',             // 第四范式创始人

    // ========== EXISTING CANDIDATES (Filtered) ==========

    // AI Legends
    'Yann LeCun', 'Yoshua Bengio', 'Demis Hassabis', 'Dario Amodei', 'Ilya Sutskever',
    'Fei-Fei Li', 'Andrew Ng', 'Daniela Amodei', 'Shane Legg', 'Geoffrey Hinton',

    // Tech Leaders (AI related)
    'Mark Zuckerberg', 'Satya Nadella', 'Larry Page', 'Sergey Brin', 'Sundar Pichai',
    'Elon Musk', 'Sam Altman', 'Jensen Huang', 'Lisa Su',

    // Notable
    'Vitalik Buterin', 'Linus Torvalds', 'Guido van Rossum',

    // Historical
    'Alan Turing', 'John von Neumann'
];

function extractWhitelistDomains(links: { type: string; url: string }[]): string[] {
    const domains: string[] = [];
    for (const link of links) {
        try {
            const url = new URL(link.url);
            domains.push(url.hostname);
        } catch { }
    }
    return [...new Set(domains)];
}

async function main() {
    console.log('Starting batch import...');

    // Check current count
    const currentCount = await prisma.people.count();
    console.log(`Current count: ${currentCount}`);

    let addedCount = 0;

    for (const name of CANDIDATES) {
        // if (currentCount + addedCount >= TARGET_COUNT) break;

        console.log(`\nProcessing candidate: ${name}`);

        try {
            // 1. Check if exists loosely by name
            const existing = await prisma.people.findFirst({
                where: { OR: [{ name: { mode: 'insensitive', contains: name } }, { aliases: { has: name } }] }
            });

            if (existing) {
                console.log(`- Already exists: ${existing.name}`);
                continue;
            }

            // 2. Search Wikidata
            const searchResults = await searchWikidata(name, 1);
            if (searchResults.length === 0) {
                console.log(`- No Wikidata results found for ${name}`);
                continue;
            }

            const firstResult = searchResults[0];
            const qid = firstResult.id;

            // 3. Check stricter by QID
            const existingQid = await prisma.people.findUnique({ where: { qid } });
            if (existingQid) {
                console.log(`- Already exists (by QID): ${existingQid.name}`);
                continue;
            }

            // 4. Get full entity
            const entity = await getWikidataEntityWithTranslation(qid);
            if (!entity) {
                console.log(`- Failed to get entity details for ${qid}`);
                continue;
            }

            // 5. Download Avatar
            let localAvatarUrl: string | null = null;
            if (entity.imageUrl) {
                localAvatarUrl = await downloadAndStoreAvatar(entity.imageUrl, qid);
            }

            // 6. Create Person
            const newPerson = await prisma.people.create({
                data: {
                    qid: entity.qid,
                    name: entity.label,
                    aliases: entity.aliases,
                    description: entity.description,
                    avatarUrl: localAvatarUrl,
                    occupation: entity.occupation || [],
                    organization: entity.organization || [],
                    officialLinks: entity.officialLinks,
                    sourceWhitelist: extractWhitelistDomains(entity.officialLinks),
                    status: 'pending',
                    completeness: 0,
                }
            });

            console.log(`+ Created: ${newPerson.name} (${newPerson.id})`);
            addedCount++;

            // 7. Trigger Inngest
            try {
                await inngest.send({
                    name: 'person/created',
                    data: {
                        personId: newPerson.id,
                        personName: newPerson.name,
                        englishName: entity.englishLabel,
                        qid: newPerson.qid,
                        orcid: entity.orcid,
                        officialLinks: entity.officialLinks,
                        aliases: newPerson.aliases,
                    },
                });
                console.log(`  > Triggered enrichment job`);
            } catch (ignore) {
                console.log(`  > Failed to trigger job: ${ignore}`);
            }

            // Sleep to be nice to APIs
            await new Promise(r => setTimeout(r, 3000));

        } catch (error) {
            console.error(`Error processing ${name}:`, error);
        }
    }

    console.log(`\nBatch import finished. Added ${addedCount} people.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
