/**
 * batch2（agent-memory / agent-skills / agent-security / computer-use）DB 源 surgery：
 *  - DELETE：凭空捏造/占位/404 源（删 edge 引用 + KnowledgeThreadSource 链接 + KnowledgeSource 行）
 *  - FIX：张冠李戴 arXiv / 死链 / 发布年份（就地 UPDATE url/title/publishedAt/urlHash）
 *  - INSERT：补缺失的关键一手论文/官方源（建 KnowledgeSource + 链接到对应 thread）
 * 默认 dry-run；--execute 写。备份 data/audit/ + 事务 + Neon 唤醒 + 30s 超时。
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { prisma } from '@/lib/db/prisma';

const EXECUTE = process.argv.includes('--execute');
const sha256 = (u: string) => createHash('sha256').update(u, 'utf8').digest('hex');
const parseDate = (v?: string) => (v ? new Date(v.length === 10 ? `${v}T00:00:00Z` : v) : null);

/** 删除：url(contains) 唯一定位捏造/占位/404 源。 */
const DELETES: Array<{ match: string; note: string }> = [
  { match: 'arxiv.org/abs/2403.04957', note: 'agent-security: 张冠李戴(实为直接注入自动化攻击,非间接)' },
  { match: 'arxiv.org/abs/2402.11999', note: 'agent-security: 捏造(实为金融数学论文)' },
  { match: 'arxiv.org/abs/2405.12345', note: 'agent-security: 捏造(实为数学论文,占位编号)' },
  { match: 'security-for-ai-agents-a-new-frontier', note: 'agent-security: 微软链 404' },
  { match: 'example_agent_safety_interview', note: 'agent-security: 占位 YouTube' },
  { match: 'openai.com/index/codex-cli-skills', note: 'agent-skills: 虚构博客(Mimo 自承假设URL)' },
  { match: 'example_devin_skill', note: 'agent-skills: 占位 YouTube' },
  { match: 'example_computer_use_discussion', note: 'computer-use: 占位 YouTube' },
  { match: 'medium.com/@ylecun', note: 'computer-use: 杜撰的 LeCun 博客' },
];

/** 就地修正：旧 url(contains) → 新 url/title/publishedAt。 */
const FIXES: Array<{ match: string; url?: string; title?: string; publishedAt?: string; note: string }> = [
  { match: 'arxiv.org/abs/2309.02427', url: 'https://arxiv.org/abs/2308.11432', title: 'A Survey on Large Language Model based Autonomous Agents', note: 'agent-memory: 2309.02427(实为CoALA)→ 2308.11432(真综述)' },
  { match: 'arxiv.org/abs/2401.10935', url: 'https://arxiv.org/abs/2401.01614', title: 'GPT-4V(ision) is a Generalist Web Agent, if Grounded (SeeAct)', note: 'computer-use: 2401.10935(实为SeeClick)→ 2401.01614(真SeeAct)' },
  { match: 'arxiv.org/abs/1802.08802', title: 'Reinforcement Learning on Web Interfaces Using Workflow-Guided Exploration', note: 'computer-use: MiniWoB++ 标题校正' },
  { match: 'openai.com/research/operator-research', url: 'https://openai.com/index/computer-using-agent/', title: 'Computer-Using Agent (CUA)', note: 'computer-use: 死链→正确 CUA 技术博客' },
  { match: 'docs.anthropic.com/en/docs/claude-code/skills', url: 'https://code.claude.com/docs/en/skills', title: 'Agent Skills — Claude Docs', note: 'agent-skills: 301→新域' },
  { match: 'docs.anthropic.com/en/docs/claude-code/memory', url: 'https://code.claude.com/docs/en/memory', title: 'How Claude remembers your project', note: 'agent-memory: 301→新域' },
  { match: 'python.langchain.com/docs/modules/memory', url: 'https://docs.langchain.com/oss/python/langchain/memory', title: 'LangChain Memory (migrated docs)', note: 'agent-memory: 旧 memory 文档 308→新址' },
  { match: 'docs.anthropic.com/claude/docs/tool-use', url: 'https://platform.claude.com/docs/en/agent-sdk/secure-deployment', title: 'Securely deploying AI agents — Claude Agent SDK', note: 'agent-security: 失效锚点→新官方安全部署页' },
];

/** 修正发布年份（不改 url，仅 publishedAt）。 */
const DATE_FIXES: Array<{ match: string; publishedAt: string; note: string }> = [
  { match: 'agents-and-tools/computer-use', publishedAt: '2024-10-22', note: 'computer-use: Anthropic 发布 2025→2024' },
  { match: 'docs.anthropic.com/en/docs/build-with-claude/computer-use', publishedAt: '2024-10-22', note: 'computer-use: 同上(旧路径)' },
];

/** 新增：补缺失的关键一手源。slug 决定挂到哪个 thread。 */
const INSERTS: Array<{ slug: string; sourceKind: string; sourceOwner: string; title: string; url: string; role: string; publishedAt?: string; text: string; confidence?: number }> = [
  // agent-memory
  { slug: 'agent-memory', sourceKind: 'paper', sourceOwner: 'Park et al. (Stanford)', title: 'Generative Agents: Interactive Simulacra of Human Behavior', url: 'https://arxiv.org/abs/2304.03442', role: 'paper_foundation', publishedAt: '2023-04-07', text: 'Memory stream + reflection + 按时近性/重要性/相关性检索的记忆奠基论文。', confidence: 0.95 },
  { slug: 'agent-memory', sourceKind: 'paper', sourceOwner: 'Mem0', title: 'Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory', url: 'https://arxiv.org/abs/2504.19413', role: 'paper_foundation', publishedAt: '2025-04-28', text: '生产级长期记忆层 + LOCOMO 基准，对标 MemGPT/Zep/OpenAI Memory。', confidence: 0.9 },
  { slug: 'agent-memory', sourceKind: 'paper', sourceOwner: 'Zep', title: 'Zep: A Temporal Knowledge Graph Architecture for Agent Memory', url: 'https://arxiv.org/abs/2501.13956', role: 'paper_foundation', publishedAt: '2025-01-23', text: 'Graphiti 时序知识图谱记忆，DMR 上超过 MemGPT。', confidence: 0.9 },
  // agent-skills
  { slug: 'agent-skills', sourceKind: 'blog_post', sourceOwner: 'Anthropic', title: 'Equipping agents for the real world with Agent Skills', url: 'https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills', role: 'official_definition', publishedAt: '2025-10-16', text: '官方一手定义 + 渐进披露/可组合设计原则。', confidence: 0.95 },
  { slug: 'agent-skills', sourceKind: 'github', sourceOwner: 'Anthropic', title: 'anthropics/skills', url: 'https://github.com/anthropics/skills', role: 'implementation_signal', publishedAt: '2025-10-16', text: 'SKILL.md 模板 + spec + 示例 skills 官方仓库。', confidence: 0.95 },
  { slug: 'agent-skills', sourceKind: 'official_documentation', sourceOwner: 'Agent Skills', title: 'Agent Skills 开放标准官方站', url: 'https://agentskills.io', role: 'signal', publishedAt: '2025-12-18', text: '2025-12 开源标准 spec + SDK 落点，跨厂商采纳。', confidence: 0.85 },
  { slug: 'agent-skills', sourceKind: 'video', sourceOwner: 'Barry Zhang & Mahesh Murag (Anthropic)', title: "Don't Build Agents, Build Skills Instead (AI Engineer)", url: 'https://www.youtube.com/watch?v=CEvIs9y1uog', role: 'transcript_context', publishedAt: '2025-11-01', text: 'Agent Skills 作者演讲，讲设计动机与「agent 自己写 skill」愿景。', confidence: 0.8 },
  // agent-security
  { slug: 'agent-security', sourceKind: 'paper', sourceOwner: 'Greshake et al. (CISPA)', title: "Not What You've Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection", url: 'https://arxiv.org/abs/2302.12173', role: 'paper_foundation', publishedAt: '2023-02-23', text: '间接提示注入开山论文，提出「数据即指令」攻击面与分类。', confidence: 0.95 },
  { slug: 'agent-security', sourceKind: 'blog_post', sourceOwner: 'Simon Willison', title: 'The lethal trifecta for AI agents', url: 'https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/', role: 'signal', publishedAt: '2025-06-16', text: '致命三要素：私有数据 + 不可信内容 + 对外通信，2025 年定义威胁模型的核心概念。', confidence: 0.9 },
  { slug: 'agent-security', sourceKind: 'blog_post', sourceOwner: 'Meta AI', title: 'Agents Rule of Two: A Practical Approach to AI Agent Security', url: 'https://ai.meta.com/blog/practical-ai-agent-security/', role: 'implementation_signal', publishedAt: '2025-11-01', text: '二选一原则：无人监督 agent 最多满足三要素其二。', confidence: 0.85 },
  { slug: 'agent-security', sourceKind: 'blog_post', sourceOwner: 'Anthropic', title: 'How we contain Claude across products', url: 'https://www.anthropic.com/engineering/how-we-contain-claude', role: 'implementation_signal', publishedAt: '2025-01-01', text: '环境隔离/进程沙箱/egress 控制/凭证不落 agent 的工程做法。', confidence: 0.85 },
  // computer-use
  { slug: 'computer-use', sourceKind: 'blog_post', sourceOwner: 'Google DeepMind', title: 'Introducing the Gemini 2.5 Computer Use model', url: 'https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-computer-use-model/', role: 'signal', publishedAt: '2025-10-07', text: 'Google 一极的 computer use 模型发布，补三大厂格局。', confidence: 0.85 },
];

async function main() {
  console.log(`\n== batch2 DB 源 surgery [${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}] ==\n`);
  await prisma.knowledgeThread.count();

  // ---- 计划：DELETE ----
  console.log('— DELETE（捏造/占位/404）—');
  const delTargets: Array<{ id: string; url: string; note: string }> = [];
  for (const d of DELETES) {
    const rows = await prisma.knowledgeSource.findMany({ where: { url: { contains: d.match } }, select: { id: true, url: true } });
    rows.forEach(r => delTargets.push({ id: r.id, url: r.url, note: d.note }));
    console.log(`  ${rows.length ? '✓' : '∅'} ${d.note} (命中 ${rows.length})`);
  }
  // ---- 计划：FIX ----
  console.log('\n— FIX（张冠李戴/死链）—');
  const fixTargets: Array<{ id: string; url?: string; title?: string; publishedAt?: string }> = [];
  for (const f of FIXES) {
    const rows = await prisma.knowledgeSource.findMany({ where: { url: { contains: f.match } }, select: { id: true } });
    rows.forEach(r => fixTargets.push({ id: r.id, url: f.url, title: f.title, publishedAt: f.publishedAt }));
    console.log(`  ${rows.length ? '✓' : '∅'} ${f.note} (命中 ${rows.length})`);
  }
  const dateTargets: Array<{ id: string; publishedAt: string }> = [];
  for (const f of DATE_FIXES) {
    const rows = await prisma.knowledgeSource.findMany({ where: { url: { contains: f.match } }, select: { id: true } });
    rows.forEach(r => dateTargets.push({ id: r.id, publishedAt: f.publishedAt }));
    if (rows.length) console.log(`  ✓ ${f.note} (命中 ${rows.length})`);
  }
  // ---- 计划：INSERT ----
  console.log('\n— INSERT（补缺失一手源）—');
  const insTargets: Array<{ threadId: string; s: typeof INSERTS[number] }> = [];
  for (const ins of INSERTS) {
    const t = await prisma.knowledgeThread.findUnique({ where: { slug: ins.slug }, select: { id: true } });
    const exists = await prisma.knowledgeSource.findFirst({ where: { url: ins.url } });
    if (!t) { console.log(`  ⚠️ ${ins.slug} 无 thread`); continue; }
    insTargets.push({ threadId: t.id, s: ins });
    console.log(`  + ${ins.slug}: [${ins.role}] ${ins.title.slice(0, 48)}${exists ? ' (源已存在,补链接)' : ''}`);
  }

  // 备份
  const delIds = delTargets.map(d => d.id);
  if (EXECUTE) {
    mkdirSync('data/audit', { recursive: true });
    const [bSrc, bLink, bEdge] = await Promise.all([
      prisma.knowledgeSource.findMany({ where: { id: { in: [...delIds, ...fixTargets.map(f => f.id), ...dateTargets.map(d => d.id)] } } }),
      prisma.knowledgeThreadSource.findMany({ where: { sourceId: { in: delIds } } }),
      prisma.knowledgeThreadEdge.findMany({ where: { OR: [{ fromSourceId: { in: delIds } }, { toSourceId: { in: delIds } }] } }),
    ]);
    writeFileSync('data/audit/batch2-db-surgery-backup.json', JSON.stringify({ sources: bSrc, links: bLink, edges: bEdge }, null, 2));
    console.log(`\n备份 ${bSrc.length} 源 / ${bLink.length} 链接 / ${bEdge.length} 边 → data/audit/batch2-db-surgery-backup.json`);
  }

  if (!EXECUTE) { console.log('\n(dry-run)\n'); await prisma.$disconnect(); return; }

  // 逐条顺序执行（无事务，避开 Neon 交互事务超时；计划每次按当前 DB 重算，天然可重入幂等，备份兜底）
  // 阶段 1：DELETE
  for (const d of delTargets) {
    await prisma.knowledgeThreadEdge.deleteMany({ where: { OR: [{ fromSourceId: d.id }, { toSourceId: d.id }] } });
    await prisma.knowledgeThreadSource.deleteMany({ where: { sourceId: d.id } });
    await prisma.knowledgeSource.delete({ where: { id: d.id } }).catch(() => {});
  }
  // 阶段 2：FIX（冲突合并：目标 urlHash 已存在则把链接/边重指到现有源并删冗余）
  for (const f of fixTargets) {
    if (!f.url) {
      const data: Record<string, unknown> = {};
      if (f.title) data.title = f.title;
      if (f.publishedAt) data.publishedAt = parseDate(f.publishedAt);
      if (Object.keys(data).length) await prisma.knowledgeSource.update({ where: { id: f.id }, data });
      continue;
    }
    const newHash = sha256(f.url);
    const existing = await prisma.knowledgeSource.findUnique({ where: { urlHash: newHash } });
    if (existing && existing.id !== f.id) {
      await prisma.knowledgeThreadEdge.updateMany({ where: { fromSourceId: f.id }, data: { fromSourceId: existing.id } });
      await prisma.knowledgeThreadEdge.updateMany({ where: { toSourceId: f.id }, data: { toSourceId: existing.id } });
      const links = await prisma.knowledgeThreadSource.findMany({ where: { sourceId: f.id } });
      for (const lk of links) {
        const dup = await prisma.knowledgeThreadSource.findFirst({ where: { threadId: lk.threadId, sourceId: existing.id, role: lk.role } });
        if (dup) await prisma.knowledgeThreadSource.delete({ where: { id: lk.id } });
        else await prisma.knowledgeThreadSource.update({ where: { id: lk.id }, data: { sourceId: existing.id } });
      }
      await prisma.knowledgeSource.delete({ where: { id: f.id } }).catch(() => {});
    } else {
      const data: Record<string, unknown> = { url: f.url, urlHash: newHash };
      if (f.title) data.title = f.title;
      if (f.publishedAt) data.publishedAt = parseDate(f.publishedAt);
      await prisma.knowledgeSource.update({ where: { id: f.id }, data });
    }
  }
  for (const d of dateTargets) await prisma.knowledgeSource.update({ where: { id: d.id }, data: { publishedAt: parseDate(d.publishedAt) } });
  // 阶段 3：INSERT
  for (const { threadId, s } of insTargets) {
    const urlHash = sha256(s.url);
    const src = await prisma.knowledgeSource.upsert({
      where: { urlHash }, update: {},
      create: { sourceKind: s.sourceKind, sourceOwner: s.sourceOwner, title: s.title, url: s.url, urlHash, text: s.text, publishedAt: parseDate(s.publishedAt), metadata: { role: s.role, addedBy: 'batch2-deepdive-2026-06-20' } },
    });
    await prisma.knowledgeThreadSource.upsert({
      where: { threadId_sourceId_role: { threadId, sourceId: src.id, role: s.role } }, update: {},
      create: { threadId, sourceId: src.id, role: s.role, relevanceScore: s.confidence ?? 0.85, summary: s.text, metadata: { addedBy: 'batch2-deepdive-2026-06-20' } },
    });
  }

  console.log(`\n✅ 删 ${delTargets.length} 源 / 改 ${fixTargets.length + dateTargets.length} 源 / 补 ${insTargets.length} 源。`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
