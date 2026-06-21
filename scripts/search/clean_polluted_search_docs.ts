/**
 * 定向清洗：只重写被历史「来源替换/引用补救」blob 污染的 raw_pool_item SearchDocument。
 *
 * 复用 buildSearchDocumentRecord（id/textHash 方案与 materialize 一致），对每个脏文档：
 * 用 sanitizeIndexedText 清洗 text/summary → 重新分块 → 每文档独立 30s 事务里
 * 更新 SearchDocument + 删重建 ContentChunk + 置 embeddingStatus=pending。
 * 幂等、逐文档、可重跑。清洗后用 embed_content_chunks.ts 仅重嵌这些 NULL 向量的块。
 *
 * 用法：
 *   npx tsx scripts/search/clean_polluted_search_docs.ts            # dry-run，只统计
 *   npx tsx scripts/search/clean_polluted_search_docs.ts --execute  # 真正写库
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

import { prisma } from '../../lib/db/prisma';
import { buildSearchDocumentRecord } from '../../lib/search/search-index';
import { sanitizeIndexedText } from '../../lib/search/sanitize-content';

const MARKERS = ['Evidence quote', 'Selection reason', 'Source preview', 'Source queries', 'Repair reason', 'replace_source', 'Prefer official profile'];

async function main() {
  const execute = process.argv.includes('--execute');
  await prisma.people.count(); // 唤醒 Neon

  const rows = await prisma.searchDocument.findMany({
    where: { objectType: 'raw_pool_item', OR: MARKERS.map(m => ({ text: { contains: m } })) },
    select: {
      id: true, objectId: true, personId: true, threadId: true, organizationId: true,
      sourceType: true, title: true, summary: true, text: true, url: true,
      topics: true, organizations: true, publishedAt: true, fetchedAt: true, metadata: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`脏文档: ${rows.length}（${execute ? 'EXECUTE 写库' : 'DRY-RUN 只统计'}）`);

  let updated = 0, skipped = 0, chunks = 0, sample = 0;
  for (const row of rows) {
    const cleanText = sanitizeIndexedText(row.text);
    const cleanSummary = sanitizeIndexedText(row.summary) || null;

    const record = buildSearchDocumentRecord({
      objectType: 'raw_pool_item',
      objectId: row.objectId,
      personId: row.personId,
      threadId: row.threadId,
      organizationId: row.organizationId,
      sourceType: row.sourceType,
      title: row.title,
      summary: cleanSummary,
      text: cleanText,
      url: row.url,
      topics: row.topics,
      organizations: row.organizations,
      publishedAt: row.publishedAt,
      fetchedAt: row.fetchedAt,
      metadata: (row.metadata as Record<string, unknown>) || {},
    });

    if (!record) { skipped += 1; continue; }

    if (sample < 2) {
      console.log(`\n--- ${row.title?.slice(0, 50)}`);
      console.log('  before:', (row.text || '').slice(0, 90).replace(/\n/g, ' '));
      console.log('  after :', record.text.slice(0, 90));
      sample += 1;
    }

    if (execute) {
      const now = new Date();
      await prisma.$transaction(async tx => {
        await tx.searchDocument.update({
          where: { id: record.id },
          data: { text: record.text, summary: record.summary, textHash: record.textHash, embeddingStatus: record.embeddingStatus },
        });
        await tx.contentChunk.deleteMany({ where: { documentId: record.id } });
        if (record.chunks.length > 0) {
          await tx.contentChunk.createMany({
            data: record.chunks.map(c => ({
              id: c.id, documentId: c.documentId, objectType: c.objectType, objectId: c.objectId,
              chunkIndex: c.chunkIndex, title: c.title, text: c.text, tokenEstimate: c.tokenEstimate,
              textHash: c.textHash, metadata: c.metadata, createdAt: now, updatedAt: now,
            })),
          });
        }
      }, { maxWait: 15000, timeout: 30000 });
    }
    updated += 1;
    chunks += record.chunks.length;
    if (execute && updated % 50 === 0) console.log(`  进度 ${updated}/${rows.length}`);
  }

  console.log(`\n完成: updated=${updated} skipped(空文本)=${skipped} chunks重建=${chunks}`);
  if (!execute) console.log('DRY-RUN。加 --execute 写库。');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
