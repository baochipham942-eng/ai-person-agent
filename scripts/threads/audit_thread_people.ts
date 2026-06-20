#!/usr/bin/env tsx
/**
 * 只读审计：检查策展的「人物 ↔ 主题」关系里，哪些 owner 名字在 People 库匹配不到。
 *
 * 用途：每次往 lib/knowledge-thread-people.ts 的 CURATED_THREADS 加/改人物后跑一遍，
 * 把匹配不到的名字作为 review 清单人工确认（按决策：不自动建占位 People）。
 *
 * 运行：npx tsx scripts/threads/audit_thread_people.ts
 * 仅做 SELECT，不写任何数据。
 */
import { listCuratedThreadSeeds, resolveThreadPeople } from '@/lib/knowledge-thread-people';

async function main() {
  const seeds = listCuratedThreadSeeds();
  let totalLinks = 0;
  let totalMatched = 0;
  const unmatchedRows: Array<{ thread: string; name: string; relation: string }> = [];

  for (const seed of seeds) {
    if (seed.people.length === 0) {
      console.log(`· ${seed.slug}：尚未策展关键人物（跳过）`);
      continue;
    }
    const { matched, unmatched } = await resolveThreadPeople(seed.slug);
    totalLinks += seed.people.length;
    totalMatched += matched.length;
    console.log(
      `· ${seed.slug}：${matched.length}/${seed.people.length} 已匹配人物库` +
        (unmatched.length > 0 ? `，${unmatched.length} 条待确认` : '')
    );
    for (const person of unmatched) {
      unmatchedRows.push({ thread: seed.slug, name: person.name, relation: person.relationLabel });
    }
  }

  console.log('\n========== 审计汇总 ==========');
  console.log(`关系总数：${totalLinks}　已匹配：${totalMatched}　待确认：${unmatchedRows.length}`);

  if (unmatchedRows.length > 0) {
    console.log('\n⚠️ 以下 owner 在 People 库匹配不到（review 清单，需人工确认是否入库 / 补别名）：');
    for (const row of unmatchedRows) {
      console.log(`   [${row.thread}] ${row.name}（${row.relation}）`);
    }
    console.log('\n处理建议：确认是真人物且值得收录 → 走正常入库流程；只是别名不一致 → 在 seed 的 aliases 里补。');
  } else {
    console.log('\n✅ 全部已策展人物都能在人物库匹配到。');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('审计失败：', error);
    process.exit(1);
  });
