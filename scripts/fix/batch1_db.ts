/**
 * batch1（context-engineering / ai-evals / agentic-coding / generative-ui）DB 落地：
 *  - URL_UPDATES：DB 里旧 URL 的源就地改新 URL（过时 doc 路径），避免与 sync 新插重复。
 *  - INSERTS：候选包里真·新增的源插入 DB（Karpathy/Lütke X 帖、Google Research 博客）。
 * 默认 dry-run；--execute 才写，事务 + Neon 唤醒 + 30s 超时。
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { prisma } from '@/lib/db/prisma';

const EXECUTE = process.argv.includes('--execute');
const sha256 = (u: string) => createHash('sha256').update(u, 'utf8').digest('hex');
const parseDate = (v?: string) => (v ? new Date(v.length === 10 ? `${v}T00:00:00Z` : v) : null);

/** 旧 URL(contains) → 新 URL/title。就地 UPDATE 现有 KnowledgeSource。 */
const URL_UPDATES = [
  { match: 'code.claude.com/docs/en/slash-commands', url: 'https://code.claude.com/docs/en/skills', title: 'Extend Claude with skills', note: 'context-eng: slash-commands 已并入 skills' },
  { match: 'platform.openai.com/docs/guides/evals', url: 'https://developers.openai.com/api/docs/guides/evals', title: 'OpenAI Platform: Evaluating model performance (Evals)', note: 'ai-evals: OpenAI evals 路径迁移(301)' },
  { match: 'docs.smith.langchain.com', url: 'https://docs.langchain.com/langsmith/evaluation', title: 'LangSmith: Evaluation concepts', note: 'ai-evals: LangSmith 路径迁移(308)' },
];

/** 真·新增源：(slug, sourceId) 从候选 JSON 取数据插入 DB。 */
const INSERTS = [
  { slug: 'context-engineering', sourceId: 'sig_karpathy_context_engineering' },
  { slug: 'context-engineering', sourceId: 'sig_tobi_lutke_context_engineering' },
  { slug: 'generative-ui', sourceId: 'genui_google_research_genui_blog' },
];

async function main() {
  console.log(`\n== batch1 DB 落地 [${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}] ==\n`);
  await prisma.knowledgeThread.count();

  console.log('— URL 就地更新 —');
  const updates: Array<{ id: string; url: string; title: string }> = [];
  for (const u of URL_UPDATES) {
    const rows = await prisma.knowledgeSource.findMany({ where: { url: { contains: u.match } }, select: { id: true, url: true } });
    console.log(`  ${u.note}: 命中 ${rows.length} 条 → ${u.url}`);
    rows.forEach(r => updates.push({ id: r.id, url: u.url, title: u.title }));
  }

  console.log('\n— 新源插入 —');
  const inserts: Array<{ threadId: string; s: any }> = [];
  for (const ins of INSERTS) {
    const pack = JSON.parse(readFileSync(`data/knowledge-threads/${ins.slug}-sources.candidates.json`, 'utf8'));
    const s = (pack.sources || []).find((x: any) => x.id === ins.sourceId);
    const thread = await prisma.knowledgeThread.findUnique({ where: { slug: ins.slug }, select: { id: true } });
    if (!s || !thread) { console.log(`  ⚠️ ${ins.slug}/${ins.sourceId} 缺失，跳过`); continue; }
    const dup = await prisma.knowledgeSource.findFirst({ where: { url: s.url } });
    console.log(`  + ${ins.slug}: [${s.role}] ${(s.title || s.url).slice(0, 50)}${dup ? ' (DB已存在,仅补链接)' : ''}`);
    inserts.push({ threadId: thread.id, s });
  }

  if (!EXECUTE) { console.log('\n(dry-run)\n'); await prisma.$disconnect(); return; }

  await prisma.$transaction(async tx => {
    for (const u of updates) await tx.knowledgeSource.update({ where: { id: u.id }, data: { url: u.url, title: u.title, urlHash: sha256(u.url) } });
    for (const { threadId, s } of inserts) {
      const urlHash = s.urlHash || sha256(s.url);
      const src = await tx.knowledgeSource.upsert({
        where: { urlHash }, update: {},
        create: { sourceKind: s.sourceKind || 'unknown', sourceOwner: s.sourceOwner || null, title: s.title || s.url, url: s.url, urlHash, text: s.text || s.whyRelevant || s.title || '', publishedAt: parseDate(s.publishedAt), metadata: { role: s.role, status: s.status || 'source_pack_review', addedBy: 'batch1-deepdive-2026-06-20' } },
      });
      await tx.knowledgeThreadSource.upsert({
        where: { threadId_sourceId_role: { threadId, sourceId: src.id, role: s.role } }, update: {},
        create: { threadId, sourceId: src.id, role: s.role, relevanceScore: typeof s.confidence === 'number' ? s.confidence : 0.7, evidenceQuote: s.evidenceQuote || null, summary: s.whyRelevant || null, metadata: { status: s.status, addedBy: 'batch1-deepdive-2026-06-20' } },
      });
    }
  }, { timeout: 30000, maxWait: 15000 });

  console.log(`\n✅ 更新 ${updates.length} 源 URL，插入 ${inserts.length} 新源。`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
