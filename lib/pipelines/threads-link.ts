/**
 * 内容（YouTube 字幕 / 官方博客）关键词 → 主题页 自动挂载核心。
 * 从 scripts/threads/link_content_to_threads.ts 抽出，CLI 与后台共用。
 */
import { prisma } from '@/lib/db/prisma';
import { sha256 } from '@/lib/rawpool-identity';
import { makeLogger, type PipelineRunHooks } from './hooks';

const ARTICLE_TYPES = ['official', 'personal_site', 'news', 'biography'];
export const THREADS_LINK_DEFAULT_TYPES = ['youtube_caption', ...ARTICLE_TYPES];

export interface ThreadsLinkOptions {
  execute: boolean;
  limit: number;
  minScore: number;
  highScore: number;
  maxPerItem: number;
  types: string[];
  includeCompany: boolean;
  quiet: boolean;
}

function metaRecord(m: unknown): Record<string, unknown> {
  return m && typeof m === 'object' && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}
function norm(s: string): string {
  return s.toLowerCase().replace(/[_\-/]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function significantWords(phrase: string): string[] {
  return norm(phrase).split(' ').filter(w => w.length >= 5);
}

interface ThreadVocab {
  id: string; slug: string; title: string;
  phrases: Set<string>;
  words: Set<string>;
}

function buildThreadVocab(t: { id: string; slug: string; title: string; tags: string[]; aliases: string[] }): ThreadVocab {
  const raw = [...t.tags, ...t.aliases, t.title, t.slug];
  const phrases = new Set<string>();
  const words = new Set<string>();
  for (const r of raw) {
    const n = norm(r);
    if (n) phrases.add(n);
    for (const w of significantWords(r)) words.add(w);
  }
  return { id: t.id, slug: t.slug, title: t.title, phrases, words };
}

function scoreMatch(terms: string[], vocab: ThreadVocab): { phraseScore: number; weakScore: number; matched: string[] } {
  const matched: string[] = [];
  let phraseScore = 0;
  let weakScore = 0;
  const seen = new Set<string>();
  for (const termRaw of terms) {
    const term = norm(termRaw);
    if (!term || seen.has(term)) continue;
    seen.add(term);
    if (vocab.phrases.has(term)) { phraseScore += 1.0; matched.push(term); continue; }
    const termIsPhrase = term.includes(' ');
    let medium = false;
    if (termIsPhrase) {
      for (const p of vocab.phrases) {
        if (p.length >= 5 && (p.includes(term) || term.includes(p))) { medium = true; break; }
      }
    }
    if (medium) { phraseScore += 0.6; matched.push(term); continue; }
    const tw = significantWords(term);
    if (tw.some(w => vocab.words.has(w))) weakScore += 0.3;
  }
  return {
    phraseScore: Math.round(phraseScore * 100) / 100,
    weakScore: Math.round(weakScore * 100) / 100,
    matched: Array.from(new Set(matched)).slice(0, 8),
  };
}

function roleForSource(_sourceType: string, sourceKind: unknown): string {
  if (sourceKind === 'youtube_caption') return 'transcript_context';
  return 'signal';
}

export async function runThreadsLink(opts: ThreadsLinkOptions, hooks: PipelineRunHooks = {}): Promise<{ linkCount: number; companyLinked: number }> {
  const log = makeLogger(hooks);
  await log('info', `内容关键词 → 主题页自动挂载：${opts.execute ? 'EXECUTE' : 'DRY-RUN'} | min=${opts.minScore} high=${opts.highScore} max/item=${opts.maxPerItem} | 类型=[${opts.types.join(',')}]`);

  const threads = await prisma.knowledgeThread.findMany({ select: { id: true, slug: true, title: true, tags: true, aliases: true } });
  if (threads.length === 0) {
    throw new Error('DB 无 KnowledgeThread。请先跑 scripts/threads/seed_threads_to_db.ts --execute');
  }
  const vocabs = threads.map(buildThreadVocab);
  await log('info', `主题数 ${threads.length}`);

  const wantCaption = opts.types.includes('youtube_caption');
  const articleTypes = opts.types.filter(t => t !== 'youtube_caption');
  const orConds: Array<Record<string, unknown>> = [];
  if (wantCaption) orConds.push({ sourceType: 'youtube', metadata: { path: ['sourceKind'], equals: 'youtube_caption' } });
  if (articleTypes.length) orConds.push({ sourceType: { in: articleTypes } });

  const items = await prisma.rawPoolItem.findMany({
    where: { OR: orConds },
    select: { id: true, personId: true, sourceType: true, title: true, url: true, metadata: true },
  });
  const withKw = items.filter(it => Array.isArray(metaRecord(it.metadata).keywords) && (metaRecord(it.metadata).keywords as unknown[]).length > 0);
  await log('info', `候选内容 ${items.length}，已抽关键词 ${withKw.length}`);

  const targets = withKw.slice(0, opts.limit);
  await hooks.setTotal?.(targets.length);
  let linkCount = 0, itemLinked = 0, lowConf = 0;
  const perThread = new Map<string, number>();

  for (const [idx, it] of targets.entries()) {
    if (await hooks.isCancelled?.()) return { linkCount, companyLinked: 0 };
    const m = metaRecord(it.metadata);
    const terms = [...((m.keywords as string[]) ?? []), ...((m.contentTopics as string[]) ?? [])];
    const scored = vocabs
      .map(v => ({ v, ...scoreMatch(terms, v) }))
      .filter(x => x.phraseScore >= opts.minScore)
      .sort((a, b) => (b.phraseScore + b.weakScore * 0.1) - (a.phraseScore + a.weakScore * 0.1))
      .slice(0, opts.maxPerItem);
    if (scored.length === 0) { await hooks.setDone?.(idx + 1); continue; }
    itemLinked++;

    for (const s of scored) {
      const role = roleForSource(it.sourceType, m.sourceKind);
      const excluded = s.phraseScore < opts.highScore;
      if (excluded) lowConf++;
      const relevanceScore = Math.min(0.92, 0.4 + 0.1 * s.phraseScore);
      perThread.set(s.v.slug, (perThread.get(s.v.slug) ?? 0) + 1);
      linkCount++;

      if (!opts.execute) continue;
      await prisma.knowledgeThreadSource.upsert({
        where: { threadId_rawPoolItemId_role: { threadId: s.v.id, rawPoolItemId: it.id, role } },
        create: {
          threadId: s.v.id, rawPoolItemId: it.id, role,
          relevanceScore,
          summary: typeof m.gist === 'string' && m.gist ? m.gist : null,
          metadata: { autoLinked: true, autoLinkScore: s.phraseScore, matchedTerms: s.matched, excludedFromTopicReadiness: excluded, linkedAt: new Date().toISOString() },
        },
        update: {
          relevanceScore,
          metadata: { autoLinked: true, autoLinkScore: s.phraseScore, matchedTerms: s.matched, excludedFromTopicReadiness: excluded, linkedAt: new Date().toISOString() },
        },
      });
    }
    await hooks.setDone?.(idx + 1);
  }

  // ===== 公司博客 CompanySource → 镜像 KnowledgeSource → 挂主题 =====
  let companyLinked = 0, companyItems = 0;
  if (opts.includeCompany) {
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
    const orgName = new Map(orgs.map(o => [o.id, o.name]));
    const cs = await prisma.companySource.findMany({
      where: { sourceKind: 'official_blog_article' },
      select: { id: true, organizationId: true, title: true, url: true, text: true, publishedAt: true, summary: true, metadata: true },
    });
    const csKw = cs.filter(c => Array.isArray(metaRecord(c.metadata).keywords) && (metaRecord(c.metadata).keywords as unknown[]).length > 0);
    await log('info', `公司博客候选 ${cs.length}，已抽关键词 ${csKw.length}`);
    for (const c of csKw.slice(0, opts.limit)) {
      if (await hooks.isCancelled?.()) break;
      const m = metaRecord(c.metadata);
      const terms = [...((m.keywords as string[]) ?? []), ...((m.contentTopics as string[]) ?? [])];
      const scored = vocabs.map(v => ({ v, ...scoreMatch(terms, v) }))
        .filter(x => x.phraseScore >= opts.minScore)
        .sort((a, b) => (b.phraseScore + b.weakScore * 0.1) - (a.phraseScore + a.weakScore * 0.1))
        .slice(0, opts.maxPerItem);
      if (!scored.length) continue;
      companyItems++;

      let ksId: string | null = null;
      if (opts.execute) {
        const urlHash = sha256(c.url);
        const ks = await prisma.knowledgeSource.upsert({
          where: { urlHash },
          create: { sourceKind: 'official_blog_article', sourceOwner: orgName.get(c.organizationId) ?? null, title: c.title, url: c.url, urlHash, text: c.text, publishedAt: c.publishedAt, metadata: { mirroredFromCompanySource: c.id } },
          update: { title: c.title, text: c.text },
        });
        ksId = ks.id;
      }
      for (const s of scored) {
        const role = 'signal';
        const excluded = s.phraseScore < opts.highScore;
        if (excluded) lowConf++;
        const relevanceScore = Math.min(0.92, 0.4 + 0.1 * s.phraseScore);
        perThread.set(s.v.slug, (perThread.get(s.v.slug) ?? 0) + 1);
        companyLinked++;
        if (!opts.execute || !ksId) continue;
        const linkMeta = { autoLinked: true, autoLinkScore: s.phraseScore, matchedTerms: s.matched, excludedFromTopicReadiness: excluded, fromCompanyBlog: true, linkedAt: new Date().toISOString() };
        await prisma.knowledgeThreadSource.upsert({
          where: { threadId_sourceId_role: { threadId: s.v.id, sourceId: ksId, role } },
          create: { threadId: s.v.id, sourceId: ksId, role, relevanceScore, summary: c.summary ?? (typeof m.gist === 'string' ? m.gist : null), metadata: linkMeta },
          update: { relevanceScore, metadata: linkMeta },
        });
      }
    }
    await log('info', `公司博客 ${companyItems} 篇${opts.execute ? '已' : '将'}挂载，共 ${companyLinked} 条关系`);
  }

  await log('info', `${itemLinked} 条内容${opts.execute ? '已' : '将'}挂载，共 ${linkCount} 条挂载关系（低置信不计就绪度 ${lowConf}）`);
  return { linkCount, companyLinked };
}
