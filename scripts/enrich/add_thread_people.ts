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
const THREAD_PEOPLE = [
  {
    name: 'Geoffrey Litt',
    aliases: ['geoffreylitt'],
    searchHint: 'Geoffrey Litt malleable software researcher Ink and Switch',
    organization: ['Ink & Switch'],
    occupation: ['researcher', 'computer scientist'],
    xHandle: 'geoffreylitt',
    githubHandle: 'geoffreylitt',
    whyImportant:
      'Ink & Switch 研究员、MIT 博士；2023 年《Malleable software in the age of LLMs》提出「用户用自然语言重塑软件本身」，是 AI Artifacts 与可塑界面（generative UI）的思想源头。',
  },
  {
    name: 'Haijun Xia',
    aliases: ['haijunxia'],
    searchHint: 'Haijun Xia UC San Diego HCI assistant professor',
    organization: ['UC San Diego'],
    occupation: ['professor', 'HCI researcher'],
    xHandle: null,
    githubHandle: null,
    whyImportant:
      'UC San Diego 人机交互助理教授；CHI 2025 task-driven 可塑界面与渐进式 UI 生成两篇论文的核心作者，把「说着话捏出软件」从口号形式化成可控的研究方法。',
  },
  {
    name: 'Yaniv Leviathan',
    aliases: ['yanivleviathan'],
    searchHint: 'Yaniv Leviathan Google distinguished engineer',
    organization: ['Google'],
    occupation: ['engineer', 'researcher'],
    xHandle: null,
    githubHandle: null,
    whyImportant:
      'Google 杰出工程师；《Generative UI: LLMs are Effective UI Generators》主作者，用实验证明现代 LLM 能为几乎任意 prompt 稳健生成高质量界面，把生成式 UI 从产品宣称拉回可测能力。',
  },
  {
    name: 'Guillermo Rauch',
    aliases: ['rauchg', 'rauch'],
    searchHint: 'Guillermo Rauch Vercel CEO Next.js',
    organization: ['Vercel'],
    occupation: ['entrepreneur', 'software engineer'],
    xHandle: 'rauchg',
    githubHandle: 'rauchg',
    whyImportant:
      'Vercel 创始人兼 CEO；推动 v0 与 AI SDK 生成式 UI，把「agent 就是前端」做成被数百万开发者使用的工具栈。',
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
