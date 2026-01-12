/**
 * 优先级 AI 人物入库脚本
 * 基于 Claude WebSearch 收集的高质量数据
 *
 * 用法: bun scripts/enrich/add_priority_ai_people.ts
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import { searchWikidata, getWikidataEntityWithTranslation } from '../../lib/datasources/wikidata';
import { downloadAndStoreAvatar } from '../../lib/storage/avatarStorage';

// 优先级 AI 人物种子数据（基于 Claude WebSearch 收集）
const PRIORITY_PEOPLE = [
    // ========== OpenAI 核心技术人员 ==========
    {
        name: 'Jerry Tworek',
        aliases: ['Jerzy Tworek'],
        searchHint: 'Jerry Tworek OpenAI',
        organization: ['OpenAI'],
        occupation: ['AI researcher', 'Research VP'],
        xHandle: 'jertworek',
        whyImportant: 'OpenAI 研究 VP，o1/o3 推理模型核心负责人，Codex/GitHub Copilot 主要贡献者，2026年1月离职',
    },
    {
        name: 'Jakub Pachocki',
        aliases: [],
        searchHint: 'Jakub Pachocki OpenAI',
        organization: ['OpenAI'],
        occupation: ['Chief Scientist', 'computer scientist'],
        xHandle: null,
        whyImportant: 'OpenAI 首席科学家（接替 Ilya Sutskever），GPT-4 技术负责人，o1/o3 推理模型架构师，波兰竞赛编程冠军',
    },
    {
        name: 'Mark Chen',
        aliases: [],
        searchHint: 'Mark Chen OpenAI CRO',
        organization: ['OpenAI', 'Jane Street'],
        occupation: ['Chief Research Officer', 'AI researcher'],
        xHandle: 'markchen90',
        whyImportant: 'OpenAI 首席研究官，DALL-E/Codex/GPT-4 视觉团队负责人，与 Jakub Pachocki 共同领导 OpenAI 研究',
    },
    {
        name: 'Lilian Weng',
        aliases: ['Weng Lilian'],
        searchHint: 'Lilian Weng OpenAI',
        organization: ['OpenAI', 'Thinking Machines Lab'],
        occupation: ['AI researcher', 'VP Research and Safety'],
        xHandle: 'lilianweng',
        githubHandle: 'lilianweng',
        whyImportant: 'OpenAI 前安全研究 VP，知名技术博客 Lil\'Log 作者，影响力极大的 AI 技术布道者，2025年离职创业',
    },

    // ========== Anthropic 核心人员 ==========
    {
        name: 'Tom Brown',
        aliases: ['Tom B Brown'],
        searchHint: 'Tom Brown GPT-3 Anthropic',
        organization: ['Anthropic', 'OpenAI', 'Google Brain'],
        occupation: ['AI researcher', 'co-founder'],
        xHandle: 'nottombrown',
        githubHandle: 'nottombrown',
        whyImportant: 'GPT-3 论文第一作者，Anthropic 联合创始人，自学成才的 AI 工程师，Scaling 突破关键人物',
    },
    {
        name: 'Jared Kaplan',
        aliases: [],
        searchHint: 'Jared Kaplan Anthropic Scaling Laws',
        organization: ['Anthropic', 'Johns Hopkins University'],
        occupation: ['Chief Science Officer', 'physicist', 'professor'],
        xHandle: null,
        whyImportant: 'Anthropic 首席科学官，Scaling Laws 论文第一作者，定义了大模型训练范式，物理学博士转 AI',
    },
    {
        name: 'Sam McCandlish',
        aliases: [],
        searchHint: 'Sam McCandlish Anthropic',
        organization: ['Anthropic', 'OpenAI'],
        occupation: ['co-founder', 'AI researcher'],
        xHandle: 'samsamoa',
        whyImportant: 'Anthropic 联合创始人，Scaling Laws 合著者，斯坦福物理学博士，前 OpenAI AI Safety 团队',
    },

    // ========== 关键技术贡献者 ==========
    {
        name: 'Jason Wei',
        aliases: [],
        searchHint: 'Jason Wei Chain-of-Thought OpenAI',
        organization: ['Meta', 'OpenAI', 'Google Brain'],
        occupation: ['AI researcher'],
        xHandle: '_jasonwei',
        whyImportant: 'Chain-of-Thought Prompting 发明者，OpenAI o1 共同创造者，MGSM/BBH 评测创建者，2025年加入 Meta',
    },
    {
        name: 'Tri Dao',
        aliases: [],
        searchHint: 'Tri Dao FlashAttention Stanford',
        organization: ['Princeton University', 'Together AI', 'Stanford University'],
        occupation: ['professor', 'Chief Scientist', 'AI researcher'],
        xHandle: 'tri_dao',
        whyImportant: 'FlashAttention 发明者（所有主流大模型都在使用），Together AI 首席科学家，普林斯顿助理教授',
    },
    {
        name: 'David Silver',
        aliases: [],
        searchHint: 'David Silver DeepMind AlphaGo',
        organization: ['Google DeepMind', 'University College London'],
        occupation: ['research scientist', 'professor'],
        xHandle: null,
        whyImportant: 'AlphaGo/AlphaZero 负责人，强化学习领域里程碑贡献，ACM Computing Prize 获得者，27万+引用',
    },
    {
        name: 'Dan Hendrycks',
        aliases: ['Daniel Hendrycks'],
        searchHint: 'Dan Hendrycks MMLU CAIS',
        organization: ['Center for AI Safety', 'UC Berkeley', 'xAI', 'Scale AI'],
        occupation: ['researcher', 'director'],
        xHandle: 'DanHendrycks',
        githubHandle: 'hendrycks',
        whyImportant: 'MMLU/GELU/MATH 基准创建者，CAIS 总监，xAI 和 Scale AI 顾问，AI 安全领域核心人物',
    },
    {
        name: 'Hyung Won Chung',
        aliases: [],
        searchHint: 'Hyung Won Chung FLAN instruction tuning',
        organization: ['Meta', 'OpenAI', 'Google Brain', 'MIT'],
        occupation: ['AI researcher'],
        xHandle: 'hwchung27',
        whyImportant: 'Instruction Tuning (FLAN) 第一作者，OpenAI o1 贡献者，2025年加入 Meta Superintelligence Labs',
    },
    {
        name: 'Barret Zoph',
        aliases: [],
        searchHint: 'Barret Zoph Neural Architecture Search',
        organization: ['Thinking Machines', 'OpenAI', 'Google Brain'],
        occupation: ['CTO', 'co-founder', 'AI researcher'],
        xHandle: 'barret_zoph',
        whyImportant: 'Neural Architecture Search (NAS) 开创者，前 OpenAI 研究 VP，ChatGPT Post-Training 团队创建者',
    },
    {
        name: 'Harrison Chase',
        aliases: [],
        searchHint: 'Harrison Chase LangChain',
        organization: ['LangChain'],
        occupation: ['CEO', 'founder', 'software engineer'],
        xHandle: 'hwchase17',
        githubHandle: 'hwchase17',
        whyImportant: 'LangChain 创始人兼 CEO，Agent 生态核心人物，RAG 模式推广者，Sequoia/Benchmark 投资',
    },

    // ========== AI 安全专家 ==========
    {
        name: 'Stuart Russell',
        aliases: ['Stuart J. Russell'],
        searchHint: 'Stuart Russell Berkeley AI safety',
        organization: ['UC Berkeley', 'CHAI'],
        occupation: ['professor', 'computer scientist'],
        xHandle: null,
        whyImportant: 'AI 安全学术奠基人，《人工智能：现代方法》教科书作者，CHAI 创始人，2021 BBC Reith Lectures',
    },
    {
        name: 'Eliezer Yudkowsky',
        aliases: ['Eliezer Shlomo Yudkowsky'],
        searchHint: 'Eliezer Yudkowsky MIRI',
        organization: ['MIRI'],
        occupation: ['researcher', 'writer'],
        xHandle: 'ESYudkowsky',
        whyImportant: 'AI 对齐思想先驱，MIRI 创始人，LessWrong 核心人物，《如果有人建造它，所有人都会死》作者',
    },

    // ========== 中国/欧洲 AI 人物 ==========
    {
        name: '王小川',
        aliases: ['Wang Xiaochuan'],
        searchHint: '王小川 百川智能',
        organization: ['百川智能', '搜狗'],
        occupation: ['CEO', 'entrepreneur'],
        xHandle: null,
        whyImportant: '百川智能创始人兼 CEO，前搜狗 CEO，清华大学博士，2024年 TIME 全球AI领袖',
    },
    {
        name: '陈天石',
        aliases: ['Chen Tianshi'],
        searchHint: '陈天石 寒武纪',
        organization: ['寒武纪', '中国科学院'],
        occupation: ['CEO', 'professor'],
        xHandle: null,
        whyImportant: '寒武纪创始人兼 CEO，中国 AI 芯片领军人物，2024年寒武纪股价涨幅 383%',
    },
    {
        name: 'Guillaume Lample',
        aliases: [],
        searchHint: 'Guillaume Lample Mistral AI',
        organization: ['Mistral AI', 'Meta'],
        occupation: ['Chief Scientist', 'co-founder'],
        xHandle: null,
        whyImportant: 'Mistral AI 联合创始人兼首席科学家，LLaMA 核心贡献者，法国首位 AI 亿万富翁之一',
    },
    {
        name: 'Jakob Uszkoreit',
        aliases: [],
        searchHint: 'Jakob Uszkoreit Transformer Inceptive',
        organization: ['Inceptive', 'Google Brain'],
        occupation: ['CEO', 'co-founder'],
        xHandle: 'kyosu',
        whyImportant: 'Transformer 论文《Attention Is All You Need》作者之一，Inceptive（AI+RNA）创始人',
    },
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
    console.log('🚀 开始导入优先级 AI 人物...\n');

    let addedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const person of PRIORITY_PEOPLE) {
        console.log(`\n[${addedCount + skippedCount + failedCount + 1}/${PRIORITY_PEOPLE.length}] 处理: ${person.name}`);

        try {
            // 1. 检查是否已存在
            const existing = await prisma.people.findFirst({
                where: {
                    OR: [
                        { name: { mode: 'insensitive', contains: person.name } },
                        { aliases: { hasSome: [person.name, ...person.aliases] } }
                    ]
                }
            });

            if (existing) {
                console.log(`  ⏭️ 已存在: ${existing.name}`);
                skippedCount++;
                continue;
            }

            // 2. 搜索 Wikidata
            const searchResults = await searchWikidata(person.searchHint, 3);

            let entity = null;
            let qid = null;

            if (searchResults.length > 0) {
                // 尝试找到最匹配的结果
                for (const result of searchResults) {
                    const e = await getWikidataEntityWithTranslation(result.id);
                    if (e && (
                        e.label.toLowerCase().includes(person.name.toLowerCase()) ||
                        person.name.toLowerCase().includes(e.label.toLowerCase())
                    )) {
                        entity = e;
                        qid = result.id;
                        break;
                    }
                }

                // 如果没有完全匹配，用第一个结果
                if (!entity && searchResults[0]) {
                    entity = await getWikidataEntityWithTranslation(searchResults[0].id);
                    qid = searchResults[0].id;
                }
            }

            // 3. 检查 QID 是否已存在
            if (qid) {
                const existingQid = await prisma.people.findUnique({ where: { qid } });
                if (existingQid) {
                    console.log(`  ⏭️ QID 已存在: ${existingQid.name}`);
                    skippedCount++;
                    continue;
                }
            }

            // 4. 下载头像
            let localAvatarUrl: string | null = null;
            if (entity?.imageUrl) {
                localAvatarUrl = await downloadAndStoreAvatar(entity.imageUrl, qid || person.name);
            }

            // 5. 构建官方链接
            const officialLinks: any[] = entity?.officialLinks || [];

            if (person.xHandle) {
                officialLinks.push({
                    type: 'twitter',
                    platform: 'twitter',
                    url: `https://x.com/${person.xHandle}`,
                    handle: person.xHandle
                });
            }

            if ((person as any).githubHandle) {
                officialLinks.push({
                    type: 'github',
                    platform: 'github',
                    url: `https://github.com/${(person as any).githubHandle}`,
                    handle: (person as any).githubHandle
                });
            }

            // 6. 创建人物记录
            // 如果没有 Wikidata QID，生成一个临时 ID (格式: TEMP-{name-hash})
            const finalQid = qid || `TEMP-${person.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now().toString(36)}`;

            const newPerson = await prisma.people.create({
                data: {
                    qid: finalQid,
                    name: entity?.label || person.name,
                    aliases: [...new Set([...(entity?.aliases || []), ...person.aliases])],
                    description: entity?.description || null,
                    whyImportant: person.whyImportant,
                    avatarUrl: localAvatarUrl,
                    occupation: [...new Set([...(entity?.occupation || []), ...person.occupation])],
                    organization: [...new Set([...(entity?.organization || []), ...person.organization])],
                    officialLinks: officialLinks,
                    sourceWhitelist: extractWhitelistDomains(officialLinks),
                    status: 'pending',
                    completeness: 0,
                }
            });

            console.log(`  ✅ 创建成功: ${newPerson.name} (ID: ${newPerson.id})`);
            console.log(`     QID: ${finalQid}${qid ? '' : ' (临时)'}`);
            if (qid) console.log(`     Wikidata: https://www.wikidata.org/wiki/${qid}`);
            if (person.xHandle) console.log(`     X: @${person.xHandle}`);
            addedCount++;

            // 等待避免 API 限流
            await new Promise(r => setTimeout(r, 2000));

        } catch (error) {
            console.error(`  ❌ 失败: ${error}`);
            failedCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 导入完成');
    console.log(`  ✅ 新增: ${addedCount}`);
    console.log(`  ⏭️ 跳过: ${skippedCount}`);
    console.log(`  ❌ 失败: ${failedCount}`);
    console.log('='.repeat(50));

    console.log('\n💡 下一步操作:');
    console.log('  1. bun scripts/enrich/recrawl_robust.ts      # 补全职业历史');
    console.log('  2. bun scripts/enrich/enrich_openalex.ts     # 获取学术指标');
    console.log('  3. bun scripts/enrich/fetch_x_bios.ts        # 获取 Twitter 信息');
    console.log('  4. bun scripts/enrich/enrich_topics_highlights.ts  # AI 话题标签');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
