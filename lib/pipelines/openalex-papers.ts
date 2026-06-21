/**
 * 按作者名批量抓 OpenAlex 论文 → RawPoolItem(sourceType='openalex') 核心。
 * 从 scripts/enrich/fetch_openalex_papers.ts 抽出，CLI 与后台共用。
 * 同名消歧逻辑保守搬迁（避免历史"张冠李戴"教训）。
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { searchOpenAlexAuthor, getAuthorWorks } from '@/lib/datasources/openalex';
import { buildRawPoolIdentity, contentHash } from '@/lib/rawpool-identity';
import { makeLogger, type PipelineRunHooks } from './hooks';

/** 默认只取近 18 个月发表的论文——刷新"本周推荐"论文流要近作。 */
export const DEFAULT_SINCE_DAYS = 548;
/** 唯一精确同名（无机构信号）路径的引用下限——挡张冠李戴。 */
const NAME_ONLY_MIN_CITATIONS = 1000;

export interface OpenalexPapersOptions {
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function normalize(value: string): string {
  return (value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, ' ')
    .trim();
}

interface AuthorMatch { authorId: string; displayName: string; confidence: number; reason: string; }

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
    withAff.sort((x, y) => Number(y.exact) - Number(x.exact) || y.a.worksCount - x.a.worksCount);
    const best = withAff[0];
    return {
      authorId: best.a.id,
      displayName: best.a.displayName,
      confidence: best.exact ? 0.88 : 0.74,
      reason: best.exact ? 'name_exact+affiliation' : 'name_partial+affiliation',
    };
  }

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
  return null;
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

async function resolvePeople(opts: OpenalexPapersOptions): Promise<PersonRow[]> {
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
  const rows = await prisma.people.findMany({ where, select, orderBy: { influenceScore: 'desc' }, take: opts.limit });
  return rows as PersonRow[];
}

interface WorkRecord { url: string; title: string; text: string; publishedAt: Date | null; metadata: Record<string, unknown>; }

export async function runOpenalexPapers(opts: OpenalexPapersOptions, hooks: PipelineRunHooks = {}): Promise<{ written: number; worksFound: number }> {
  const log = makeLogger(hooks);
  await log('info', `OpenAlex 论文抓取：${opts.execute ? '执行写库' : 'DRY-RUN（不写库）'} | 人群=${opts.names ? `指定 ${opts.names.length} 人` : `${opts.roles}（前 ${opts.limit} 人）`}，每人 ${opts.works} 篇${opts.since ? `，仅 ${opts.since.toISOString().slice(0, 10)} 后` : '，全时段'}`);

  await prisma.people.count(); // 唤醒 Neon
  const people = await resolvePeople(opts);
  await hooks.setTotal?.(people.length);
  await log('info', `命中 ${people.length} 人`);

  const stats = { processed: 0, matchedVerified: 0, matchedSearch: 0, ambiguous: 0, noAuthor: 0, worksFound: 0, written: 0, skippedNoDate: 0, failed: 0 };

  for (const [idx, person] of people.entries()) {
    if (await hooks.isCancelled?.()) return { written: stats.written, worksFound: stats.worksFound };
    stats.processed++;

    let match: AuthorMatch | null = null;
    if (person.openalexId) {
      match = { authorId: person.openalexId, displayName: person.name, confidence: 0.9, reason: 'verified_openalexId' };
      stats.matchedVerified++;
    } else {
      const candidates = [person.name, ...(person.aliases || [])].filter(Boolean);
      for (const cand of candidates) {
        const authors = await searchOpenAlexAuthor(cand);
        await sleep(opts.delayMs);
        if (authors.length === 0) continue;
        match = disambiguate(cand, person.organization || [], authors);
        if (match) break;
        stats.ambiguous++;
      }
      if (match) stats.matchedSearch++;
    }

    if (!match) {
      stats.noAuthor++;
      if (!opts.quiet) await log('info', `- ${person.name}: 无 openalexId 且名搜无法安全归属，跳过`);
      await hooks.setDone?.(idx + 1);
      continue;
    }

    const works = await getAuthorWorks(match.authorId, opts.works, opts.since);
    await sleep(opts.delayMs);

    const records: WorkRecord[] = [];
    for (const w of works) {
      if (!w.title || !w.url) continue;
      if (opts.minCitations && (w.citationCount || 0) < opts.minCitations) continue;
      const publishedAt = w.publicationDate ? new Date(w.publicationDate) : null;
      if (!publishedAt || Number.isNaN(publishedAt.getTime())) { stats.skippedNoDate++; continue; }
      records.push({
        url: w.url,
        title: w.title,
        text: w.abstract || w.title,
        publishedAt,
        metadata: {
          sourceKind: 'paper',
          seed: 'openalex',
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
      if (!opts.quiet) await log('info', `· ${person.name} ⇐ ${match.displayName} [${match.reason}]：0 篇可用`);
      await hooks.setDone?.(idx + 1);
      continue;
    }
    await log('info', `· ${person.name} ⇐ ${match.displayName} [${match.reason} c=${match.confidence}]：${records.length} 篇`);

    if (opts.execute) {
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
            metadata: r.metadata as Prisma.InputJsonValue,
            fetchStatus: 'success',
            processed: false,
          };
          await prisma.rawPoolItem.upsert({
            where: { urlHash },
            create: data,
            update: { title: r.title, text: r.text, publishedAt: r.publishedAt, metadata: r.metadata as Prisma.InputJsonValue, processed: false },
          });
          stats.written++;
        } catch (error) {
          stats.failed++;
          await log('error', `写入失败 ${person.name} / ${r.title.slice(0, 40)}: ${(error as Error).message}`);
        }
      }
    }
    await hooks.setDone?.(idx + 1);
  }

  await log('info', `完成：处理 ${stats.processed} 人，归属 ${stats.matchedVerified + stats.matchedSearch}，可用论文 ${stats.worksFound}${opts.execute ? `，已写 ${stats.written}（失败 ${stats.failed}）` : '（DRY-RUN 未写库）'}`);
  return { written: stats.written, worksFound: stats.worksFound };
}
