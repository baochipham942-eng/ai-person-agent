/**
 * 把深核新增进 JSON 候选包、但 DB 里还没有的源同步进生产 DB（INSERT，幂等）。
 * 仅插 DB 中按 url 不存在的源；已有的不动。建 KnowledgeSource(按 urlHash upsert) + KnowledgeThreadSource 链接。
 *
 * 默认 dry-run。加 --execute 才写。
 * 用法：bunx tsx scripts/fix/sync_new_thread_sources.ts [--execute]
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { prisma } from '@/lib/db/prisma';

const EXECUTE = process.argv.includes('--execute');
const sha256 = (u: string) => createHash('sha256').update(u, 'utf8').digest('hex');
const SLUGS = ['context-engineering', 'ai-evals', 'agentic-coding', 'generative-ui'];

function parseDate(v: unknown): Date | null {
  if (!v || typeof v !== 'string') return null;
  const d = new Date(v.length === 10 ? `${v}T00:00:00Z` : v);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  console.log(`\n== 同步深核新增源到 DB [${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}] ==\n`);
  await prisma.knowledgeThread.count(); // 唤醒 Neon

  let totalNew = 0;
  for (const slug of SLUGS) {
    const pack = JSON.parse(readFileSync(`data/knowledge-threads/${slug}-sources.candidates.json`, 'utf8'));
    const thread = await prisma.knowledgeThread.findUnique({
      where: { slug },
      select: { id: true, sources: { select: { source: { select: { url: true } } } } },
    });
    if (!thread) { console.log(`  ⚠️ ${slug} 不在 DB，跳过`); continue; }
    const dbUrls = new Set(thread.sources.map(s => s.source?.url).filter(Boolean));

    const missing = (pack.sources || []).filter((s: any) => s.url && !dbUrls.has(s.url));
    console.log(`— ${slug}：候选 ${pack.sources.length} 源，DB 缺 ${missing.length} 条 —`);
    for (const s of missing) {
      console.log(`  + [${s.role}] ${(s.title || s.url).slice(0, 60)}  (${s.url})`);
      totalNew++;
      if (!EXECUTE) continue;
      const urlHash = s.urlHash || sha256(s.url);
      const src = await prisma.knowledgeSource.upsert({
        where: { urlHash },
        update: {},
        create: {
          sourceKind: s.sourceKind || 'unknown',
          sourceOwner: s.sourceOwner || null,
          title: s.title || s.url,
          url: s.url,
          urlHash,
          text: s.text || s.whyRelevant || s.title || '',
          publishedAt: parseDate(s.publishedAt),
          metadata: { role: s.role, status: s.status || 'source_pack_review', addedBy: 'pilot-deepdive-2026-06-20' },
        },
      });
      await prisma.knowledgeThreadSource.upsert({
        where: { threadId_sourceId_role: { threadId: thread.id, sourceId: src.id, role: s.role } },
        update: {},
        create: {
          threadId: thread.id,
          sourceId: src.id,
          role: s.role,
          relevanceScore: typeof s.confidence === 'number' ? s.confidence : 0.7,
          evidenceQuote: s.evidenceQuote || null,
          summary: s.whyRelevant || null,
          metadata: { status: s.status || 'source_pack_review', addedBy: 'pilot-deepdive-2026-06-20' },
        },
      });
    }
  }

  console.log(`\n${EXECUTE ? '✅ 已插入' : '(dry-run) 将插入'} ${totalNew} 条新源链接。\n`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
