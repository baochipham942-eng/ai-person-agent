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

const THREAD_PEOPLE = [
  {
    name: 'Addy Osmani',
    aliases: ['addyosmani'],
    searchHint: 'Addy Osmani Google Chrome engineer',
    organization: ['Google'],
    occupation: ['software engineer', 'author'],
    xHandle: 'addyosmani',
    githubHandle: 'addyosmani',
    whyImportant:
      'Google Chrome 工程负责人、知名前端布道者与作者；命名并定义 “Loop Engineering”——不再当那个手动 prompt agent 的人，而是设计替你 prompt 的外层系统。',
  },
  {
    name: 'Geoffrey Huntley',
    aliases: ['ghuntley'],
    searchHint: 'Geoffrey Huntley software engineer Ralph',
    organization: [],
    occupation: ['software engineer'],
    xHandle: 'GeoffreyHuntley',
    githubHandle: 'ghuntley',
    whyImportant:
      '独立工程师，提出 “Ralph loop”：反复喂同一 prompt、每轮清空上下文、靠磁盘状态文件记忆，证明只要持久化加可验证停止条件即可，是 /goal 等自主循环的技术原型。',
  },
  {
    name: 'Phil Schmid',
    aliases: ['Philipp Schmid', 'philschmid'],
    searchHint: 'Philipp Schmid AI Google DeepMind Hugging Face',
    organization: ['Google DeepMind', 'Hugging Face'],
    occupation: ['AI engineer', 'developer advocate'],
    xHandle: '_philschmid',
    githubHandle: 'philschmid',
    whyImportant:
      '前 Hugging Face、现 Google DeepMind 技术布道者；撰写定义性博客《The New Skill in AI is Not Prompting, It is Context Engineering》，把「上下文工程」讲清成一项可操作的工程技能。',
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
