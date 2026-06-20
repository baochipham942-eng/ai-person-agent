/**
 * 按作者名批量抓 OpenAlex 论文 → 写入 RawPoolItem（sourceType='openalex'）。
 *
 * 背景：常规 Inngest 管线的论文支线要求人物有 ORCID（functions.ts:333 `if (!orcid) return []`），
 * 而全库 0 人填了 ORCID → 论文支线对所有人永久空转，论文实体长期停更。
 * 本脚本绕开 ORCID，用 `searchOpenAlexAuthor`（按名搜）+ `getAuthorWorks` 直接抓，
 * 并把**真实 publicationDate 写进 RawPoolItem.publishedAt** —— 这是让首页"本周推荐"
 * 论文新鲜度过滤（weekly-picks.ts 的 PAPER_MAX_AGE_DAYS）生效的前提。
 *
 * 抓完跑 `scripts/activity/materialize_activity_events.mjs` 把 RawPoolItem 落成 paper ActivityEvent。
 *
 * 用法：
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts                 # dry-run，默认人群（researcher+professor）
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --execute       # 实际写库
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --limit=20      # 只处理前 20 人（按影响力降序）
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --works=8       # 每位作者取引用最高的 8 篇（默认 10）
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --since=2025-01-01  # 只取该日之后发表的
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --roles=all     # 放宽到所有角色（含 founder/engineer）
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --names="杨植麟,Andrej Karpathy"  # 指定人物
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --execute --quiet
 *
 * 成本：OpenAlex 免费 API（带 polite mailto），每人 1～N 次请求 + 取作品 1 次，含礼貌延迟。零付费。
 * 安全：dry-run 默认；同名消歧保守（无机构/姓名强信号则跳过，进 review 计数，不瞎挂论文，
 *       避免历史教训里的"张冠李戴"）；写库幂等（按 urlHash upsert）+ 每条 try/catch（抗 Neon ECONNRESET）。
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { prisma } from '@/lib/db/prisma';
import { searchOpenAlexAuthor, getAuthorWorks } from '@/lib/datasources/openalex';
import { buildRawPoolIdentity, contentHash } from '@/lib/rawpool-identity';

/** 默认只取近 18 个月发表的论文——刷新"本周推荐"论文流要近作，不要生涯名篇
 *  （getAuthorWorks 按引用降序，无下限会抓回 2015/2017 经典老论文）。--all-time 可放开。 */
const DEFAULT_SINCE_DAYS = 548;

/** 唯一精确同名（无机构信号）路径的引用下限——挡住高影响力本人匹配到近零引用同名小号的张冠李戴。 */
const NAME_ONLY_MIN_CITATIONS = 1000;

interface Options {
  execute: boolean;
  quiet: boolean;
  limit: number;
  works: number;
  since?: Date;
  allTime: boolean;
  roles: 'academic' | 'all';
  names?: string[];
  minCitations: number;
  delayMs: number;
}

function parseOptions(argv: string[]): Options {
  const opts: Options = {
    execute: false,
    quiet: false,
    limit: 60,
    works: 10,
    allTime: false,
    roles: 'academic',
    minCitations: 0,
    delayMs: 150,
  };
  for (const arg of argv) {
    if (arg === '--execute') opts.execute = true;
    else if (arg === '--quiet') opts.quiet = true;
    else if (arg === '--all-time') opts.allTime = true;
    else if (arg === '--roles=all') opts.roles = 'all';
    else if (arg.startsWith('--limit=')) opts.limit = clampInt(arg.slice(8), 1, 1000, opts.limit);
    else if (arg.startsWith('--works=')) opts.works = clampInt(arg.slice(8), 1, 50, opts.works);
    else if (arg.startsWith('--min-citations=')) opts.minCitations = clampInt(arg.slice(16), 0, 1_000_000, opts.minCitations);
    else if (arg.startsWith('--delay=')) opts.delayMs = clampInt(arg.slice(8), 0, 5000, opts.delayMs);
    else if (arg.startsWith('--since=')) {
      const d = new Date(arg.slice(8));
      if (!Number.isNaN(d.getTime())) opts.since = d;
    } else if (arg.startsWith('--names=')) {
      opts.names = arg.slice(8).split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  // 未显式指定 --since 且未 --all-time → 套近 18 个月默认下限
  if (!opts.since && !opts.allTime) {
    opts.since = new Date(Date.now() - DEFAULT_SINCE_DAYS * 86_400_000);
  }
  return opts;
}

function clampInt(value: string, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** 归一：小写、去音标、去非字母数字、压空格——用于姓名/机构比对。 */
function normalize(value: string): string {
  return (value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, ' ')
    .trim();
}

interface AuthorMatch {
  authorId: string;
  displayName: string;
  confidence: number;
  reason: string;
}

/**
 * 同名消歧：在 OpenAlex 候选作者里挑一个能安全归属给本人的。
 * - 机构重叠（person.organization ∩ author.affiliations）= 强信号。
 * - 姓名精确归一匹配 = 基线。
 * 决策（保守，宁可跳过不瞎挂）：
 *   精确名 + 机构重叠 → 0.88
 *   部分名 + 机构重叠 → 0.74
 *   精确名 + 无机构信号但候选唯一显著 → 0.72（name-only）
 *   多个精确同名且都无机构信号 → 视为不可消歧，返回 null（进 review）
 */
function disambiguate(
  candidate: string,
  orgs: string[],
  authors: Awaited<ReturnType<typeof searchOpenAlexAuthor>>,
): AuthorMatch | null {
  const normCand = normalize(candidate);
  const normOrgs = orgs.map(normalize).filter(Boolean);

  const scored = authors.map(a => {
    const normName = normalize(a.displayName);
    const exact = normName === normCand;
    const partial = !exact && (normName.includes(normCand) || normCand.includes(normName));
    const affMatch = a.affiliations.some(aff => {
      const na = normalize(aff);
      return normOrgs.some(o => na && o && (na.includes(o) || o.includes(na)));
    });
    return { a, exact, partial, affMatch };
  });

  const withAff = scored.filter(s => (s.exact || s.partial) && s.affMatch);
  if (withAff.length > 0) {
    // 机构重叠优先精确名，其次作品多者
    withAff.sort((x, y) => Number(y.exact) - Number(x.exact) || y.a.worksCount - x.a.worksCount);
    const best = withAff[0];
    return {
      authorId: best.a.id,
      displayName: best.a.displayName,
      confidence: best.exact ? 0.88 : 0.74,
      reason: best.exact ? 'name_exact+affiliation' : 'name_partial+affiliation',
    };
  }

  // 无机构信号：只接受"唯一精确同名"，且加引用下限挡住"高影响力本人 ↔ 近零引用同名小号"的张冠李戴
  // （与 backfill_openalex_identity 的 NAME_ONLY_MIN_CITATIONS 一致）；多个精确同名无法安全消歧 → 跳过
  const exactOnes = scored.filter(s => s.exact);
  if (exactOnes.length === 1 && exactOnes[0].a.citedByCount >= NAME_ONLY_MIN_CITATIONS) {
    const best = exactOnes[0];
    return {
      authorId: best.a.id,
      displayName: best.a.displayName,
      confidence: 0.72,
      reason: 'name_exact_unique(no_affiliation_signal)',
    };
  }
  return null; // 不可消歧
}

interface PersonRow {
  id: string;
  name: string;
  aliases: string[];
  organization: string[];
  topics: string[];
  influenceScore: number | null;
  openalexId: string | null;
}

async function resolvePeople(opts: Options): Promise<PersonRow[]> {
  const select = { id: true, name: true, aliases: true, organization: true, topics: true, influenceScore: true, openalexId: true } as const;
  if (opts.names && opts.names.length > 0) {
    const rows = await prisma.people.findMany({
      where: { OR: opts.names.flatMap(n => [{ name: n }, { aliases: { has: n } }]) },
      select,
    });
    return rows as PersonRow[];
  }
  const where: Record<string, unknown> = { status: { in: ['active', 'ready'] } };
  if (opts.roles === 'academic') where.roleCategory = { in: ['researcher', 'professor'] };
  const rows = await prisma.people.findMany({
    where,
    select,
    orderBy: { influenceScore: 'desc' },
    take: opts.limit,
  });
  return rows as PersonRow[];
}

interface WorkRecord {
  url: string;
  title: string;
  text: string;
  publishedAt: Date | null;
  metadata: Record<string, unknown>;
}

async function main() {
  const opts = parseOptions(process.argv.slice(2));
  const log = (msg: string) => { if (!opts.quiet) console.log(msg); };

  console.log(`📚 fetch_openalex_papers — ${opts.execute ? '执行写库' : 'DRY-RUN（不写库）'}`);
  console.log(`   人群=${opts.names ? `指定 ${opts.names.length} 人` : `${opts.roles}（前 ${opts.limit} 人，按影响力降序）`}，每人取引用最高 ${opts.works} 篇，${opts.since ? `仅 ${opts.since.toISOString().slice(0, 10)} 后发表` : '全时段（--all-time）'}${opts.minCitations ? `，引用≥${opts.minCitations}` : ''}`);

  await prisma.people.count(); // 唤醒 Neon
  const people = await resolvePeople(opts);
  console.log(`   命中 ${people.length} 人\n`);

  const stats = {
    processed: 0,
    matchedVerified: 0,
    matchedSearch: 0,
    ambiguous: 0,
    noAuthor: 0,
    worksFound: 0,
    written: 0,
    skippedNoDate: 0,
    failed: 0,
  };

  for (const person of people) {
    stats.processed++;

    let match: AuthorMatch | null = null;

    if (person.openalexId) {
      // 可靠路径：库里已存 enrich_openalex 核验过的作者 ID，免同名消歧。
      match = { authorId: person.openalexId, displayName: person.name, confidence: 0.9, reason: 'verified_openalexId' };
      stats.matchedVerified++;
    } else {
      // 退路：按名搜 + 严格消歧（同名者多/profile 机构对不上时宁可跳过，不瞎挂）。
      const candidates = [person.name, ...(person.aliases || [])].filter(Boolean);
      for (const cand of candidates) {
        const authors = await searchOpenAlexAuthor(cand);
        await sleep(opts.delayMs);
        if (authors.length === 0) continue;
        match = disambiguate(cand, person.organization || [], authors);
        if (match) break;
        stats.ambiguous++; // 有候选但无法安全消歧，继续尝试别名
      }
      if (match) stats.matchedSearch++;
    }

    if (!match) {
      stats.noAuthor++;
      log(`  - ${person.name}: 无 openalexId 且名搜无法安全归属，跳过`);
      continue;
    }

    const works = await getAuthorWorks(match.authorId, opts.works, opts.since);
    await sleep(opts.delayMs);

    const records: WorkRecord[] = [];
    for (const w of works) {
      if (!w.title || !w.url) continue;
      if (opts.minCitations && (w.citationCount || 0) < opts.minCitations) continue;
      const publishedAt = w.publicationDate ? new Date(w.publicationDate) : null;
      if (!publishedAt || Number.isNaN(publishedAt.getTime())) {
        // 无真实发表日的论文不写：首页新鲜度过滤依赖真实 publishedAt，宁缺毋滥
        stats.skippedNoDate++;
        continue;
      }
      records.push({
        url: w.url,
        title: w.title,
        text: w.abstract || w.title,
        publishedAt,
        metadata: {
          sourceKind: 'paper',
          seed: 'openalex', // 给 materialize 的 --seed=openalex 精准定位本批，绕开 500 条扫描上限
          confidence: match.confidence,
          openalexWorkId: w.id,
          openalexAuthorId: match.authorId,
          authorMatch: match.reason,
          matchedAuthorName: match.displayName,
          venue: w.venue || null,
          doi: w.doi || null,
          citationCount: w.citationCount || 0,
        },
      });
    }
    stats.worksFound += records.length;

    if (records.length === 0) {
      log(`  · ${person.name} ⇐ ${match.displayName} [${match.reason}]：0 篇可用`);
      continue;
    }
    log(`  · ${person.name} ⇐ ${match.displayName} [${match.reason} c=${match.confidence}]：${records.length} 篇`);
    if (!opts.quiet) {
      for (const r of records.slice(0, 3)) {
        log(`      ${r.publishedAt!.toISOString().slice(0, 10)}  ${r.title.slice(0, 64)}`);
      }
    }

    if (!opts.execute) continue;

    for (const r of records) {
      try {
        const { urlHash } = buildRawPoolIdentity({ personId: person.id, sourceType: 'openalex', url: r.url, metadata: r.metadata });
        const data = {
          personId: person.id,
          sourceType: 'openalex',
          url: r.url,
          urlHash,
          contentHash: contentHash(r.text),
          title: r.title,
          text: r.text,
          publishedAt: r.publishedAt,
          metadata: r.metadata,
          fetchStatus: 'success',
          processed: false, // 置 false 让 materialize 重新拾取
        };
        await prisma.rawPoolItem.upsert({
          where: { urlHash },
          create: data,
          update: {
            title: r.title,
            text: r.text,
            publishedAt: r.publishedAt, // 关键：把真实发表日补回（修历史 null 借抓取日的问题）
            metadata: r.metadata,
            processed: false,
          },
        });
        stats.written++;
      } catch (error) {
        stats.failed++;
        console.error(`    ✗ 写入失败 ${person.name} / ${r.title.slice(0, 40)}:`, (error as Error).message);
      }
    }
  }

  console.log('\n📊 汇总');
  console.log(`   处理人数        ${stats.processed}`);
  console.log(`   归属作者        ${stats.matchedVerified + stats.matchedSearch}（已验证 openalexId ${stats.matchedVerified} + 名搜 ${stats.matchedSearch}）`);
  console.log(`   无作者/跳过     ${stats.noAuthor}（其中同名不可消歧累计 ${stats.ambiguous} 次）`);
  console.log(`   可用论文        ${stats.worksFound}（无发表日丢弃 ${stats.skippedNoDate}）`);
  if (opts.execute) {
    console.log(`   已写 RawPoolItem ${stats.written}（失败 ${stats.failed}）`);
    console.log('\n下一步：跑 materialize 把它们落成 paper ActivityEvent：');
    console.log('   node scripts/activity/materialize_activity_events.mjs --execute --seed=openalex');
  } else {
    console.log('\n这是 DRY-RUN。确认无误后加 --execute 写库。');
  }

  await prisma.$disconnect();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
