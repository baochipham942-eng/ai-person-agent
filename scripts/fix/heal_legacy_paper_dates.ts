/**
 * 修老 paper RawPoolItem 的 null publishedAt（让"老论文冒充新鲜"在 feed 里消失）。
 *
 * 背景：老批次的 openalex 论文条目 publishedAt 为空，materialize `occurredAt = publishedAt || fetchedAt`
 * 借抓取日，导致 2019 HuggingFace 库论文之类在首页"本周推荐"冒充新鲜（weekly-picks 的 PAPER_MAX_AGE_DAYS
 * 按 occurredAt 过滤也拦不住，因为 occurredAt 是假的抓取日）。本脚本按标题去 OpenAlex 查真实
 * publicationDate 回填，并打 `seed:'openalex'` 标，让 materialize --seed=openalex 重算 occurredAt。
 *
 * 范围：只修 `sourceType='openalex'` 且 publishedAt 为空、标题像真实论文的行；占位/搜索结果垃圾
 *      （'candidate' / 'source:' / 'OpenReview' / 'ML Anthology' / '[PDF]...'）跳过——那是独立的历史脏数据。
 *
 * 用法：
 *   npx tsx scripts/fix/heal_legacy_paper_dates.ts            # dry-run
 *   npx tsx scripts/fix/heal_legacy_paper_dates.ts --execute  # 回填 publishedAt
 *   之后：node scripts/activity/materialize_activity_events.mjs --execute --seed=openalex
 *
 * 成本：OpenAlex 免费；安全：dry-run 默认，标题需归一精确/高重叠匹配才采信，每行 try/catch。
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { prisma } from '@/lib/db/prisma';

const OPENALEX = 'https://api.openalex.org';
const MAILTO = 'ai-person-agent@example.com';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const JUNK_TITLE = /candidate|source:|openreview|ml anthology|acl anthology|\[pdf\]|\| home|nips$|arxiv:/i;

function normalize(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** 标题去 OpenAlex 查真实 publication_date；要求归一标题精确或高重叠才采信。 */
async function lookupPublicationDate(title: string): Promise<string | null> {
  const url = `${OPENALEX}/works?search=${encodeURIComponent(title)}&per_page=3&mailto=${MAILTO}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const results: any[] = data.results || [];
  const normQuery = normalize(title);
  for (const w of results) {
    const normTitle = normalize(w.title || '');
    if (!normTitle || !w.publication_date) continue;
    const exact = normTitle === normQuery;
    const contained = normTitle.includes(normQuery) || normQuery.includes(normTitle);
    if (exact || (contained && Math.abs(normTitle.length - normQuery.length) < 12)) {
      return w.publication_date; // YYYY-MM-DD
    }
  }
  return null;
}

async function main() {
  const execute = process.argv.includes('--execute');
  console.log(`🩹 heal_legacy_paper_dates — ${execute ? '执行回填' : 'DRY-RUN'}`);
  await prisma.people.count();

  const rows = await prisma.rawPoolItem.findMany({
    where: { sourceType: 'openalex', publishedAt: null },
    select: { id: true, title: true, metadata: true, person: { select: { name: true } } },
  });
  console.log(`   openalex 类 null-publishedAt = ${rows.length}\n`);

  const stats = { processed: 0, healed: 0, junk: 0, notFound: 0, failed: 0 };
  for (const row of rows) {
    stats.processed++;
    const title = (row.title || '').trim();
    if (!title || JUNK_TITLE.test(title)) { stats.junk++; continue; }

    let date: string | null = null;
    try {
      date = await lookupPublicationDate(title);
      await sleep(150);
    } catch (error) {
      stats.failed++;
      console.error(`   ✗ 查询失败 ${title.slice(0, 40)}:`, (error as Error).message);
      continue;
    }
    if (!date) { stats.notFound++; console.log(`   ? 查不到真实日期: ${row.person?.name} :: ${title.slice(0, 48)}`); continue; }

    console.log(`   ✓ ${date}  ${row.person?.name} :: ${title.slice(0, 48)}`);
    if (!execute) continue;

    try {
      const meta = (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)) ? row.metadata as Record<string, unknown> : {};
      await prisma.rawPoolItem.update({
        where: { id: row.id },
        data: { publishedAt: new Date(date), processed: false, metadata: { ...meta, seed: 'openalex', healedDate: true } },
      });
      stats.healed++;
    } catch (error) {
      stats.failed++;
      console.error(`   ✗ 回填失败 ${title.slice(0, 40)}:`, (error as Error).message);
    }
  }

  console.log('\n📊 汇总');
  console.log(`   扫描 ${stats.processed}（跳过占位/垃圾 ${stats.junk}，查不到 ${stats.notFound}，失败 ${stats.failed}）`);
  if (execute) {
    console.log(`   已回填 publishedAt ${stats.healed}`);
    console.log('\n下一步：node scripts/activity/materialize_activity_events.mjs --execute --seed=openalex');
  } else {
    console.log(`   DRY-RUN：${rows.length - stats.junk - stats.notFound - stats.failed} 条可回填。加 --execute 执行。`);
  }
  await prisma.$disconnect();
}

main().catch(error => { console.error(error); process.exit(1); });
