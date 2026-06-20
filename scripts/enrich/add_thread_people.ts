/**
 * 主题关键人物入库脚本
 *
 * 把「人物 ↔ 主题」策展里 audit 标为待确认、且确认为真人物的 owner 补进 People 库。
 * 复用 add_priority_ai_people.ts 的 Wikidata（免费）+ 头像下载逻辑；无 Wikidata 命中
 * 时生成 TEMP qid 仍建档。base 入库不调付费 API（Exa/Perplexity/DeepSeek）。
 * 入库后 status=pending、completeness=0，话题/影响力等需另跑可选 enrich（付费）补全。
 *
 * 用法: npx tsx scripts/enrich/add_thread_people.ts
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import { searchWikidata, getWikidataEntityWithTranslation } from '../../lib/datasources/wikidata';
import { downloadAndStoreAvatar } from '../../lib/storage/avatarStorage';

// 当前批次：generative-ui（生成式界面 / AI Artifacts）主题的锚定人物。
// 上一批（Addy Osmani / Geoffrey Huntley / Phil Schmid）已入库，脚本对已存在者自动跳过。
// 批次：batch2 主题（agent-memory / agent-skills / agent-security / computer-use）待补关键人物
const THREAD_PEOPLE = [
  {
    name: 'Patrick Lewis',
    aliases: [],
    searchHint: 'Patrick Lewis Cohere RAG retrieval augmented generation',
    organization: ['Cohere'],
    occupation: ['researcher'],
    xHandle: null,
    githubHandle: null,
    whyImportant:
      'RAG 原论文（2005.11401）一作，提出并命名「检索增强生成」，现在 Cohere，入选 TIME 2024 AI 百大影响力。',
  },
  {
    name: 'Douwe Kiela',
    aliases: ['douwekiela'],
    searchHint: 'Douwe Kiela Contextual AI RAG Stanford',
    organization: ['Contextual AI'],
    occupation: ['researcher', 'founder'],
    xHandle: 'douwekiela',
    githubHandle: null,
    whyImportant:
      'RAG 原论文资深通讯作者，Contextual AI 联创/CEO，持续推动 RAG / contextual AI 方向。',
  },
  {
    name: 'Ofir Press',
    aliases: ['ofirpress'],
    searchHint: 'Ofir Press Princeton Self-Ask SWE-agent SWE-bench',
    organization: ['Princeton University'],
    occupation: ['researcher'],
    xHandle: 'OfirPress',
    githubHandle: 'ofirpress',
    whyImportant:
      'Self-Ask 一作、SWE-agent/ACI 资深作者；自拆子问题法是 Deep Research「规划→子查询」前身，ACI 是 harness 工具层学术奠基。',
  },
  {
    name: 'Nathan Lambert',
    aliases: ['natolambert'],
    searchHint: 'Nathan Lambert Allen Institute AI2 RLHF post-training interconnects',
    organization: ['Allen Institute for AI'],
    occupation: ['researcher'],
    xHandle: 'natolambert',
    githubHandle: 'natolambert',
    whyImportant:
      'Ai2 后训练负责人，著《The RLHF Book》、主导 Tülu 3 与 RLVR，后训练领域最权威普及者。',
  },
  {
    name: 'Jeff Clune',
    aliases: [],
    searchHint: 'Jeff Clune UBC Sakana AI Darwin Godel Machine AI-GA open-ended',
    organization: ['University of British Columbia'],
    occupation: ['professor', 'researcher'],
    xHandle: 'jeffclune',
    githubHandle: null,
    whyImportant:
      '自进化 agent 旗手，主导 ADAS、Darwin Gödel Machine、AI Scientist，提出 AI-GA 三支柱。',
  },
  {
    name: 'Noah Shinn',
    aliases: ['noahshinn'],
    searchHint: 'Noah Shinn Reflexion language agents verbal reinforcement learning',
    organization: [],
    occupation: ['researcher'],
    xHandle: null,
    githubHandle: 'noahshinn',
    whyImportant:
      'Reflexion 一作，确立「语言反思 + episodic memory」的运行时自我修正范式。',
  },
  {
    name: 'Guanzhi Wang',
    aliases: ['guanzhi'],
    searchHint: 'Guanzhi Wang Voyager NVIDIA Caltech open-ended embodied agent',
    organization: ['NVIDIA'],
    occupation: ['researcher'],
    xHandle: 'GuanzhiWang',
    githubHandle: 'guanzhi',
    whyImportant:
      'Voyager 一作，建立「自动课程 + 可执行代码 skill library」的终身技能积累范式。',
  },
  {
    name: 'Jürgen Schmidhuber',
    aliases: ['Juergen Schmidhuber', 'Jurgen Schmidhuber'],
    searchHint: 'Jurgen Schmidhuber IDSIA Godel Machine LSTM artificial intelligence',
    organization: ['IDSIA'],
    occupation: ['professor', 'researcher'],
    xHandle: 'SchmidhuberAI',
    githubHandle: null,
    whyImportant:
      'Gödel Machine（2003）理论奠基者，定义「自我改写代码做可证明改进」的源头概念；LSTM 共同发明人。',
  },
  {
    name: 'Anthony Brohan',
    aliases: [],
    searchHint: 'Anthony Brohan Google DeepMind Robotics RT-1 RT-2',
    organization: ['Google DeepMind'],
    occupation: ['researcher'],
    xHandle: null,
    githubHandle: null,
    whyImportant:
      'RT-1 论文一作，奠定「Robotics Transformer」实时离散动作输出范式（VLA 路线奠基）。',
  },
  {
    name: 'Karol Hausman',
    aliases: [],
    searchHint: 'Karol Hausman Physical Intelligence robotics foundation model RT-2',
    organization: ['Physical Intelligence'],
    occupation: ['researcher', 'founder'],
    xHandle: null,
    githubHandle: null,
    whyImportant:
      'Physical Intelligence 联创（原 Google DeepMind），RT 系列与 Open X-Embodiment 时期机器人核心研究者。',
  },
  {
    name: 'Alex Kendall',
    aliases: ['alexgkendall'],
    searchHint: 'Alex Kendall Wayve CEO autonomous driving AV2.0 end-to-end',
    organization: ['Wayve'],
    occupation: ['founder', 'researcher'],
    xHandle: 'alexgkendall',
    githubHandle: 'alexgkendall',
    whyImportant:
      'Wayve 联创兼 CEO，提出 AV2.0，用端到端深度学习 + 生成式世界模型（GAIA）重做自动驾驶。',
  },
  {
    name: 'George Hotz',
    aliases: ['geohot'],
    searchHint: 'George Hotz comma.ai openpilot self-driving geohot',
    organization: ['comma.ai'],
    occupation: ['founder', 'software engineer'],
    xHandle: 'realGeorgeHotz',
    githubHandle: 'geohot',
    whyImportant:
      'comma.ai 创始人，用开源 openpilot 证明低成本端到端驾驶可行，推动行业开放。',
  },
];

function extractWhitelistDomains(links: { type: string; url: string }[]): string[] {
  const domains: string[] = [];
  for (const link of links) {
    try {
      domains.push(new URL(link.url).hostname);
    } catch {}
  }
  return [...new Set(domains)];
}

async function main() {
  console.log('🚀 开始导入主题关键人物...\n');
  let addedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const person of THREAD_PEOPLE) {
    console.log(`\n处理: ${person.name}`);
    try {
      const existing = await prisma.people.findFirst({
        where: {
          OR: [
            { name: { mode: 'insensitive', contains: person.name } },
            { aliases: { hasSome: [person.name, ...person.aliases] } },
          ],
        },
      });
      if (existing) {
        console.log(`  ⏭️ 已存在: ${existing.name}`);
        skippedCount++;
        continue;
      }

      const searchResults = await searchWikidata(person.searchHint, 3);
      let entity = null;
      let qid: string | null = null;
      if (searchResults.length > 0) {
        for (const result of searchResults) {
          const e = await getWikidataEntityWithTranslation(result.id);
          if (
            e &&
            (e.label.toLowerCase().includes(person.name.toLowerCase()) ||
              person.name.toLowerCase().includes(e.label.toLowerCase()) ||
              person.aliases.some(a => e.label.toLowerCase().includes(a.toLowerCase())))
          ) {
            entity = e;
            qid = result.id;
            break;
          }
        }
      }

      if (qid) {
        const existingQid = await prisma.people.findUnique({ where: { qid } });
        if (existingQid) {
          console.log(`  ⏭️ QID 已存在: ${existingQid.name}`);
          skippedCount++;
          continue;
        }
      }

      let localAvatarUrl: string | null = null;
      if (entity?.imageUrl) {
        localAvatarUrl = await downloadAndStoreAvatar(entity.imageUrl, qid || person.name);
      }

      const officialLinks: Array<{ type: string; platform: string; url: string; handle: string }> =
        (entity?.officialLinks as never[]) || [];
      if (person.xHandle) {
        officialLinks.push({ type: 'twitter', platform: 'twitter', url: `https://x.com/${person.xHandle}`, handle: person.xHandle });
      }
      if (person.githubHandle) {
        officialLinks.push({ type: 'github', platform: 'github', url: `https://github.com/${person.githubHandle}`, handle: person.githubHandle });
      }

      const finalQid = qid || `TEMP-${person.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now().toString(36)}`;
      const newPerson = await prisma.people.create({
        data: {
          qid: finalQid,
          name: entity?.label || person.name,
          // 始终把 seed 名与别名并入，保证「人物 ↔ 主题」resolver 能匹配到
          aliases: [...new Set([person.name, ...(entity?.aliases || []), ...person.aliases])],
          description: entity?.description || null,
          whyImportant: person.whyImportant,
          avatarUrl: localAvatarUrl,
          occupation: [...new Set([...(entity?.occupation || []), ...person.occupation])],
          organization: [...new Set([...(entity?.organization || []), ...person.organization])],
          officialLinks,
          sourceWhitelist: extractWhitelistDomains(officialLinks),
          status: 'pending',
          completeness: 0,
        },
      });

      console.log(`  ✅ 创建成功: ${newPerson.name} (ID: ${newPerson.id})`);
      console.log(`     QID: ${finalQid}${qid ? '' : ' (临时)'}`);
      addedCount++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (error) {
      console.error(`  ❌ 失败: ${error}`);
      failedCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 导入完成  新增 ${addedCount}　跳过 ${skippedCount}　失败 ${failedCount}`);
  console.log('='.repeat(50));
  console.log('\n💡 可选下一步（付费 API，按需手动跑）：recrawl_robust / enrich_openalex / enrich_topics_highlights / fix_missing_avatars');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
