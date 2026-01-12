/**
 * AI 教育者/公开课人物入库脚本
 * 添加有公开课、教程的AI领域重要人物
 *
 * 用法: bun scripts/enrich/add_ai_educators.ts
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import { searchWikidata, getWikidataEntityWithTranslation } from '../../lib/datasources/wikidata';
import { downloadAndStoreAvatar } from '../../lib/storage/avatarStorage';

// AI 教育者/公开课人物
const AI_EDUCATORS = [
    // ========== 学术界（有公开课的教授） ==========
    {
        name: 'Sergey Levine',
        aliases: ['Sergey Levine'],
        searchHint: 'Sergey Levine UC Berkeley robotics',
        organization: ['UC Berkeley', 'Google Brain'],
        occupation: ['professor', 'AI researcher'],
        xHandle: 'svaborik',
        githubHandle: null,
        youtubeUrl: 'https://www.youtube.com/playlist?list=PL_iWQOsE6TfX7MaC6C3HcdOf1g337dlC9',
        whyImportant: 'UC Berkeley 教授，CS 285 Deep RL 课程主讲，深度强化学习领域最受欢迎的公开课，机器人学习先驱',
    },
    {
        name: 'Chelsea Finn',
        aliases: ['Chelsea Finn'],
        searchHint: 'Chelsea Finn Stanford MAML meta-learning',
        organization: ['Stanford University', 'Google Brain'],
        occupation: ['professor', 'AI researcher'],
        xHandle: 'chelseabfinn',
        githubHandle: 'cbfinn',
        youtubeUrl: null,
        whyImportant: 'Stanford 助理教授，Meta-Learning (MAML) 发明者，CS 330 课程主讲，机器人学习+少样本学习开创者',
    },
    {
        name: 'Graham Neubig',
        aliases: ['Graham Neubig'],
        searchHint: 'Graham Neubig CMU NLP',
        organization: ['Carnegie Mellon University'],
        occupation: ['professor', 'AI researcher'],
        xHandle: 'gaborneubig',
        githubHandle: 'neubig',
        youtubeUrl: 'https://www.youtube.com/@neubig',
        whyImportant: 'CMU 副教授，Advanced NLP 课程主讲，神经机器翻译专家，每年更新免费 NLP 课程，LTI 核心教授',
    },
    {
        name: 'Tom Mitchell',
        aliases: ['Tom M. Mitchell', 'Thomas Mitchell'],
        searchHint: 'Tom Mitchell CMU machine learning textbook',
        organization: ['Carnegie Mellon University'],
        occupation: ['professor', 'computer scientist'],
        xHandle: null,
        githubHandle: null,
        youtubeUrl: 'https://www.youtube.com/playlist?list=PLIG2x2RJ_4LROtn9mTZ6rkBln842hE7ty',
        whyImportant: 'CMU 教授，《Machine Learning》教科书作者（ML领域经典），机器学习学科奠基人之一',
    },
    {
        name: 'Alexander Amini',
        aliases: ['Alex Amini'],
        searchHint: 'Alexander Amini MIT deep learning 6.S191',
        organization: ['MIT'],
        occupation: ['professor', 'AI researcher'],
        xHandle: 'xaborik',
        githubHandle: 'aamini',
        youtubeUrl: 'https://www.youtube.com/@AAmini',
        whyImportant: 'MIT 6.S191 深度学习入门课程主讲，introtodeeplearning.com 创建者，每年更新，百万+观看',
    },
    {
        name: 'Leslie Kaelbling',
        aliases: ['Leslie Pack Kaelbling'],
        searchHint: 'Leslie Kaelbling MIT robotics POMDP',
        organization: ['MIT'],
        occupation: ['professor', 'computer scientist'],
        xHandle: null,
        githubHandle: null,
        youtubeUrl: null,
        whyImportant: 'MIT 教授，POMDP/强化学习先驱，MIT 6.036 机器学习课程讲师，IJCAI Computers and Thought Award',
    },
    {
        name: 'Dan Klein',
        aliases: ['Daniel Klein'],
        searchHint: 'Dan Klein UC Berkeley NLP AI',
        organization: ['UC Berkeley'],
        occupation: ['professor', 'computer scientist'],
        xHandle: null,
        githubHandle: null,
        youtubeUrl: 'https://www.youtube.com/channel/UCOFsXLMqQFXaFeMNHlpIp9g',
        whyImportant: 'UC Berkeley 教授，CS 188 AI 经典课程主讲，NLP/解析器专家，ACL Fellow',
    },

    // ========== 企业界（有教程的实践者） ==========
    {
        name: 'Jason Liu',
        aliases: ['Jason Liu jxnl'],
        searchHint: 'Jason Liu Instructor pydantic LLM',
        organization: ['Independent Consultant', 'StitchFix', 'Meta'],
        occupation: ['AI consultant', 'software engineer', 'educator'],
        xHandle: 'jxnlco',
        githubHandle: 'jxnl',
        youtubeUrl: null,
        whyImportant: 'Instructor 库作者（最流行的LLM结构化输出框架），W&B 课程讲师，"Pydantic is all you need" 提出者',
    },
    {
        name: 'Hamel Husain',
        aliases: ['Hamel Husain'],
        searchHint: 'Hamel Husain Parlance Labs GitHub LLM',
        organization: ['Parlance Labs', 'GitHub', 'Airbnb', 'DataRobot'],
        occupation: ['AI consultant', 'educator', 'software engineer'],
        xHandle: 'HamelHusain',
        githubHandle: 'hamelsmu',
        youtubeUrl: 'https://www.youtube.com/@hamelhusain7140',
        whyImportant: 'Parlance Labs 创始人，LLM Evals 权威，培训 2000+ OpenAI/Anthropic/Google 工程师，Mastering LLMs 课程创建者',
    },
    {
        name: 'Sam Witteveen',
        aliases: ['Sam Witteveen'],
        searchHint: 'Sam Witteveen AI Makerspace LangChain',
        organization: ['AI Makerspace', 'Red Dragon AI'],
        occupation: ['AI educator', 'entrepreneur', 'software engineer'],
        xHandle: 'sam_witteveen',
        githubHandle: 'samwit',
        youtubeUrl: 'https://www.youtube.com/@samwitteveenai',
        whyImportant: 'AI Makerspace 联合创始人，YouTube 最全面的 LangChain/CrewAI/RAG 教程，Google Developer Expert',
    },
    {
        name: 'Jay Alammar',
        aliases: ['Jay Alammar'],
        searchHint: 'Jay Alammar illustrated transformer BERT',
        organization: ['Cohere'],
        occupation: ['AI educator', 'software engineer', 'author'],
        xHandle: 'JayAlammar',
        githubHandle: 'jalammar',
        youtubeUrl: 'https://www.youtube.com/@arp_ai',
        whyImportant: 'Illustrated Transformer/BERT/GPT 系列作者（业界最佳可视化教程），《Hands-On LLM》合著者，Cohere 工程师',
    },
    {
        name: 'Louis-François Bouchard',
        aliases: ['Louis Bouchard', "What's AI"],
        searchHint: 'Louis-Francois Bouchard Whats AI YouTube',
        organization: ['Towards AI'],
        occupation: ['AI educator', 'content creator', 'entrepreneur'],
        xHandle: 'Whats_AI',
        githubHandle: 'louisfb01',
        youtubeUrl: 'https://www.youtube.com/@WhatsAI',
        whyImportant: "What's AI YouTube 频道创建者（16万+订阅），Towards AI 联合创始人，AI 论文解读专家，《Building LLMs for Production》作者",
    },
    {
        name: 'Lex Fridman',
        aliases: ['Lex Fridman'],
        searchHint: 'Lex Fridman MIT podcast AI',
        organization: ['MIT'],
        occupation: ['research scientist', 'podcast host'],
        xHandle: 'lexfridman',
        githubHandle: 'lexfridman',
        youtubeUrl: 'https://www.youtube.com/@lexfridman',
        whyImportant: 'Lex Fridman Podcast 主持人（400万+订阅），MIT 研究员，采访过几乎所有 AI 领域重要人物',
    },

    // ========== 补充的重要教授 ==========
    {
        name: 'Yann Dubois',
        aliases: ['Yann Dubois'],
        searchHint: 'Yann Dubois Stanford AlpacaFarm',
        organization: ['Stanford University', 'Anthropic'],
        occupation: ['AI researcher', 'PhD student'],
        xHandle: 'yanaborik',
        githubHandle: 'YannDubs',
        youtubeUrl: null,
        whyImportant: 'Stanford 博士生，AlpacaFarm/Alpaca-Eval 作者，CS229 LLM 专题讲师，2025年加入 Anthropic',
    },
    {
        name: 'Tianqi Chen',
        aliases: ['Tianqi Chen', '陈天奇'],
        searchHint: 'Tianqi Chen XGBoost TVM CMU',
        organization: ['Carnegie Mellon University', 'OctoAI'],
        occupation: ['professor', 'software engineer'],
        xHandle: 'taborik_',
        githubHandle: 'tqchen',
        youtubeUrl: null,
        whyImportant: 'XGBoost、TVM、MXNet 作者，CMU 助理教授，机器学习系统（MLSys）领域奠基人，Apache TVM 创建者',
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
    console.log('🚀 开始导入 AI 教育者/公开课人物...\n');

    let addedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const person of AI_EDUCATORS) {
        console.log(`\n[${addedCount + skippedCount + failedCount + 1}/${AI_EDUCATORS.length}] 处理: ${person.name}`);

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
                        e.label.toLowerCase().includes(person.name.split(' ')[0].toLowerCase()) ||
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

            if (person.githubHandle) {
                officialLinks.push({
                    type: 'github',
                    platform: 'github',
                    url: `https://github.com/${person.githubHandle}`,
                    handle: person.githubHandle
                });
            }

            if (person.youtubeUrl) {
                officialLinks.push({
                    type: 'youtube',
                    platform: 'youtube',
                    url: person.youtubeUrl,
                    title: 'YouTube'
                });
            }

            // 6. 创建人物记录
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
            if (person.youtubeUrl) console.log(`     YouTube: ${person.youtubeUrl}`);
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
