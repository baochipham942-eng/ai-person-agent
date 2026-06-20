/**
 * 定点修复知识主题 DB 里已确认的错误源（方案 A：外科手术式，不碰其余富集内容）。
 *
 * 范围（仅这两主题已确认错误；mcp 无错误源，不动）：
 *  - reasoning-models：误挂 arXiv 2305.15818→2309.17179、2 条 OpenAI 死链 URL、2 组重复源
 *  - multi-agent-orchestration：误挂 arXiv 2310.12150→2501.06322、langgraph 死链、2 组重复源
 *
 * 默认 dry-run（只打印计划，不写库）。加 --execute 才写，写前全量备份受影响行到 data/audit/。
 * 用法：bunx tsx scripts/fix/fix_thread_db_sources.ts [--execute]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { prisma } from '@/lib/db/prisma';

const EXECUTE = process.argv.includes('--execute');
const sha256 = (u: string) => createHash('sha256').update(u, 'utf8').digest('hex');

/** 改正某条 KnowledgeSource 的 url/title（误挂 arXiv、死链）；urlHash 自动重算。 */
const URL_FIXES: Array<{ sourceId: string; url: string; title: string; note: string }> = [
  // reasoning-models
  {
    sourceId: 'cmqkw5b0g008q9f2in8rnmras',
    url: 'https://arxiv.org/abs/2309.17179',
    title: 'AlphaZero-like Tree-Search can Guide Large Language Model Decoding and Training',
    note: 'reasoning: 误挂 2305.15818(囚徒困境博弈)→ 2309.17179(TS-LLM)',
  },
  {
    sourceId: 'cmqkw553j00859f2iqpqu0ms2',
    url: 'https://openai.com/index/introducing-openai-o1-preview/',
    title: 'Introducing OpenAI o1-preview',
    note: 'reasoning: 修死链路径 introducing-openai-o1/ → introducing-openai-o1-preview/',
  },
  {
    sourceId: 'cmqkw5efn00929f2iwygmkn9n',
    url: 'https://openai.com/index/learning-to-reason-with-llms/',
    title: 'Learning to Reason with LLMs',
    note: 'reasoning: 修死链路径 /research/ → /index/',
  },
  // multi-agent-orchestration
  {
    sourceId: 'cmqkw466i005k9f2iemc0fqk1',
    url: 'https://arxiv.org/abs/2501.06322',
    title: 'Multi-Agent Collaboration Mechanisms: A Survey of LLMs',
    note: 'multi-agent: 误挂 2310.12150(RAG 论文)→ 2501.06322(协作机制综述)',
  },
  {
    sourceId: 'cmqkw43g5005b9f2izl0we0ek',
    url: 'https://docs.langchain.com/oss/python/langchain/multi-agent',
    title: 'Multi-agent systems — LangChain / LangGraph Docs',
    note: 'multi-agent: 修 langgraph 死链(301)→ docs.langchain.com 多智能体页',
  },
];

/** 重复源：保留 keepLinkId，删除 dropLinkId（其 sourceId 若被 edge 引用则改指向 keepSourceId）。 */
const DEDUPS: Array<{ keepSourceId: string; dropLinkId: string; dropSourceId: string; note: string }> = [
  { keepSourceId: 'cmqkw56u6008b9f2i3vq3fzch', dropLinkId: 'cmqkw5e1900919f2i7ge0j40c', dropSourceId: 'cmqkw5dk0008z9f2ittoir996', note: 'reasoning: 2501.12948 去重' },
  { keepSourceId: 'cmqkw58nd008h9f2i8nstqhib', dropLinkId: 'cmqkw5cfx008v9f2iwrlu21ie', dropSourceId: 'cmqkw5bxk008t9f2ibinft9mz', note: 'reasoning: 2305.20050 去重' },
  { keepSourceId: 'cmqkw42ds00589f2iyjc5pbaa', dropLinkId: 'cmqkw4bwt00649f2ix1bl10od', dropSourceId: 'cmqkw4bj500629f2i8xobt5ud', note: 'multi-agent: openai/swarm 去重' },
  { keepSourceId: 'cmqkw4493005e9f2ipcb2v59r', dropLinkId: 'cmqkw4aeg005y9f2iaaqnabtj', dropSourceId: 'cmqkw4a0j005w9f2iaw1sqxz3', note: 'multi-agent: microsoft/autogen 去重' },
];

async function main() {
  console.log(`\n== 知识主题 DB 源定点修复 [${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}] ==\n`);

  // 备份受影响行
  const affectedSourceIds = [...URL_FIXES.map(f => f.sourceId), ...DEDUPS.map(d => d.dropSourceId)];
  const affectedLinkIds = DEDUPS.map(d => d.dropLinkId);
  const backupSources = await prisma.knowledgeSource.findMany({ where: { id: { in: affectedSourceIds } } });
  const backupLinks = await prisma.knowledgeThreadSource.findMany({ where: { id: { in: affectedLinkIds } } });
  const dropSourceIds = DEDUPS.map(d => d.dropSourceId);
  const backupEdges = await prisma.knowledgeThreadEdge.findMany({
    where: { OR: [{ fromSourceId: { in: dropSourceIds } }, { toSourceId: { in: dropSourceIds } }] },
  });

  if (EXECUTE) {
    mkdirSync('data/audit', { recursive: true });
    const stamp = backupSources[0]?.updatedAt ? '' : '';
    writeFileSync(
      `data/audit/thread-db-sources-backup${stamp}.json`,
      JSON.stringify({ sources: backupSources, links: backupLinks, edges: backupEdges }, null, 2),
    );
    console.log(`已备份 ${backupSources.length} 源 / ${backupLinks.length} 链接 / ${backupEdges.length} 边到 data/audit/thread-db-sources-backup.json\n`);
  }

  // 计划：URL 修正
  console.log('— URL/标题修正 —');
  for (const f of URL_FIXES) {
    const cur = backupSources.find(s => s.id === f.sourceId);
    console.log(`  [${cur ? '✓' : '⚠️缺失'}] ${f.note}`);
    if (cur) console.log(`        ${cur.url}\n     →  ${f.url}`);
  }
  // 计划：去重
  console.log('\n— 去重（删多余链接 + 改边引用）—');
  for (const d of DEDUPS) {
    const edgesRef = backupEdges.filter(e => e.fromSourceId === d.dropSourceId || e.toSourceId === d.dropSourceId);
    console.log(`  ${d.note}: 删 link ${d.dropLinkId}${edgesRef.length ? `；改 ${edgesRef.length} 条边引用 → ${d.keepSourceId}` : ''}`);
  }

  if (!EXECUTE) {
    console.log('\n(dry-run，未写库。加 --execute 执行)\n');
    await prisma.$disconnect();
    return;
  }

  await prisma.knowledgeThread.count(); // 唤醒 Neon，避免冷启动占用事务时间
  await prisma.$transaction(
    async tx => {
      for (const f of URL_FIXES) {
        await tx.knowledgeSource.update({ where: { id: f.sourceId }, data: { url: f.url, title: f.title, urlHash: sha256(f.url) } });
      }
      for (const d of DEDUPS) {
        // 边引用改指向保留源（仅当确有引用）
        const refs = backupEdges.filter(e => e.fromSourceId === d.dropSourceId || e.toSourceId === d.dropSourceId);
        if (refs.some(e => e.fromSourceId === d.dropSourceId)) {
          await tx.knowledgeThreadEdge.updateMany({ where: { fromSourceId: d.dropSourceId }, data: { fromSourceId: d.keepSourceId } });
        }
        if (refs.some(e => e.toSourceId === d.dropSourceId)) {
          await tx.knowledgeThreadEdge.updateMany({ where: { toSourceId: d.dropSourceId }, data: { toSourceId: d.keepSourceId } });
        }
        // 删多余链接（保留 KnowledgeSource 行本身，避免影响其它主题）
        await tx.knowledgeThreadSource.delete({ where: { id: d.dropLinkId } });
      }
    },
    { timeout: 30000, maxWait: 15000 },
  );

  console.log('\n✅ 已执行。');
  await prisma.$disconnect();
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
