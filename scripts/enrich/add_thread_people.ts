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
    name: 'Charles Packer',
    aliases: ['cpacker'],
    searchHint: 'Charles Packer MemGPT Letta UC Berkeley',
    organization: ['Letta'],
    occupation: ['researcher', 'founder'],
    xHandle: 'charlespacker',
    githubHandle: 'cpacker',
    whyImportant:
      'MemGPT 第一作者、Letta 联合创始人/CEO；把「LLM 即操作系统 / 内存分层」概念产品化，是智能体记忆领域旗手。',
  },
  {
    name: 'Joon Sung Park',
    aliases: ['joonspk'],
    searchHint: 'Joon Sung Park Stanford Generative Agents',
    organization: ['Stanford University'],
    occupation: ['researcher'],
    xHandle: null,
    githubHandle: 'joonspk-research',
    whyImportant:
      'Stanford Generative Agents 第一作者；「记忆流 + 反思 + 三因子检索」奠基者，被后续几乎所有记忆架构引用。',
  },
  {
    name: 'Taranjeet Singh',
    aliases: ['taranjeetio'],
    searchHint: 'Taranjeet Singh mem0 founder CEO',
    organization: ['Mem0'],
    occupation: ['founder', 'software engineer'],
    xHandle: 'taranjeetio',
    githubHandle: 'taranjeetio',
    whyImportant:
      'mem0 创始人/CEO；工业界采用最广的开源记忆层及 Mem0 论文（LOCOMO 基准）背后推手。',
  },
  {
    name: 'Barry Zhang',
    aliases: ['barry-zhang'],
    searchHint: 'Barry Zhang Anthropic Agent Skills',
    organization: ['Anthropic'],
    occupation: ['engineer', 'researcher'],
    xHandle: null,
    githubHandle: null,
    whyImportant:
      'Anthropic，Agent Skills 共同作者，主导该形态设计；演讲《Don’t Build Agents, Build Skills Instead》联合主讲。',
  },
  {
    name: 'Mahesh Murag',
    aliases: ['mahesh-murag'],
    searchHint: 'Mahesh Murag Anthropic Agent Skills MCP',
    organization: ['Anthropic'],
    occupation: ['engineer'],
    xHandle: null,
    githubHandle: null,
    whyImportant:
      'Anthropic，Agent Skills 共同作者；此前也是 MCP 推广关键人物。',
  },
  {
    name: 'Simon Willison',
    aliases: ['simonw'],
    searchHint: 'Simon Willison Datasette prompt injection lethal trifecta',
    organization: ['Datasette'],
    occupation: ['software engineer', 'writer'],
    xHandle: 'simonw',
    githubHandle: 'simonw',
    whyImportant:
      '提出「致命三要素（Lethal Trifecta）」，2025–2026 智能体安全威胁模型的核心定义者，prompt injection 攻防最活跃的追踪者。',
  },
  {
    name: 'Kai Greshake',
    aliases: ['kai-greshake'],
    searchHint: 'Kai Greshake indirect prompt injection CISPA',
    organization: ['CISPA'],
    occupation: ['researcher'],
    xHandle: null,
    githubHandle: 'kai-greshake',
    whyImportant:
      '间接提示注入（indirect prompt injection）开山论文一作，把「数据即指令」的攻击面带入学术与工业视野。',
  },
  {
    name: 'Tao Yu',
    aliases: ['taoyds'],
    searchHint: 'Tao Yu University of Hong Kong OSWorld xlang computer use',
    organization: ['University of Hong Kong'],
    occupation: ['professor', 'researcher'],
    xHandle: null,
    githubHandle: 'taoyds',
    whyImportant:
      'OSWorld 通讯/资深作者（HKU / xlang-ai）；定义了 computer use 最权威的跨 OS 桌面基准。',
  },
  {
    name: 'Erik Schluntz',
    aliases: ['erikschluntz'],
    searchHint: 'Erik Schluntz Anthropic computer use building effective agents',
    organization: ['Anthropic'],
    occupation: ['engineer'],
    xHandle: null,
    githubHandle: null,
    whyImportant:
      'Anthropic 技术团队成员，深度参与 computer use / 《Building Effective Agents》/ agent 构建。',
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
