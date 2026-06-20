/**
 * 给缺 openalexId 的核心人物批量补「已验证作者身份」：openalexId + ORCID + citationCount。
 *
 * 为什么要它：
 *  - 论文抓取（fetch_openalex_papers.ts）靠 `People.openalexId` 走可靠路径（免同名消歧）。
 *    全库 313 人里 99 人有 ID，学术人群（researcher+professor）里仍有 127 人缺 → 论文覆盖面卡在这。
 *  - 常规 Inngest 论文支线靠 ORCID（`functions.ts:333`），而全库 0 人填了 ORCID。本脚本在解析作者时
 *    顺手把 OpenAlex 返回的 ORCID 写进 `officialLinks`，**两条路一起解锁**。
 *
 * 为什么不直接跑 enrich_openalex.ts：它的 `isLikelyMatch` 有 `cited_by_count>1000 无条件认领`
 *  （L158），对常见名学者（如 Omar Khattab 那个 4896 引用的同名医学作者）会张冠李戴写错 ID，
 *  补全脚本写的是**身份字段**，错了会让 fetch_openalex_papers 忠实地抓错人论文，复合放大。
 *  故本脚本用与 fetch_openalex_papers 完全一致的**保守消歧**（机构重叠 OR 唯一精确同名），
 *  不可消歧者进 review 队列、绝不瞎写。
 *
 * 用法：
 *   npx tsx scripts/enrich/backfill_openalex_identity.ts                # dry-run，学术人群缺 ID 者
 *   npx tsx scripts/enrich/backfill_openalex_identity.ts --execute      # 写库
 *   npx tsx scripts/enrich/backfill_openalex_identity.ts --limit=40
 *   npx tsx scripts/enrich/backfill_openalex_identity.ts --roles=all    # 放宽到所有角色
 *   npx tsx scripts/enrich/backfill_openalex_identity.ts --names="李飞飞,Jeff Dean"
 *
 * 成本：OpenAlex 免费 API；安全：dry-run 默认，按 urlHash 无关——只在 openalexId 为空时写（幂等），
 *       ORCID 仅在 officialLinks 无 orcid 项时追加，每人 try/catch 抗 Neon 断连。
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { prisma } from '@/lib/db/prisma';
import { searchOpenAlexAuthor } from '@/lib/datasources/openalex';

interface Options {
  execute: boolean;
  quiet: boolean;
  limit: number;
  roles: 'academic' | 'all';
  names?: string[];
  excludeNames: Set<string>;
  delayMs: number;
}

function parseOptions(argv: string[]): Options {
  const opts: Options = { execute: false, quiet: false, limit: 60, roles: 'academic', excludeNames: new Set(), delayMs: 150 };
  for (const arg of argv) {
    if (arg === '--execute') opts.execute = true;
    else if (arg === '--quiet') opts.quiet = true;
    else if (arg === '--roles=all') opts.roles = 'all';
    else if (arg.startsWith('--limit=')) {
      const n = Number(arg.slice(8));
      if (Number.isFinite(n)) opts.limit = Math.min(1000, Math.max(1, Math.floor(n)));
    } else if (arg.startsWith('--names=')) {
      opts.names = arg.slice(8).split(',').map(s => s.trim()).filter(Boolean);
    } else if (arg.startsWith('--exclude-names=')) {
      for (const n of arg.slice(16).split(',').map(s => s.trim()).filter(Boolean)) opts.excludeNames.add(n);
    }
  }
  return opts;
}

/** 主名是否含非 ASCII（中文名）——这类靠 ASCII 别名搜索，别名一旦被污染（如贾扬清存成"Jia Deng"）
 *  机构还可能跟着错一起匹配上，是身份写入的高风险群，dry-run 要单独标出来人工核。 */
function hasNonAscii(s: string): boolean {
  return /[^\x00-\x7F]/.test(s);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 唯一精确同名（无机构信号）路径的引用下限。库里这些都是高影响力学者，
 * 名搜唯一精确名却匹配到 <此值 引用的 OpenAlex 主页，基本是同名小号（张冠李戴），降到 review。
 * 机构重叠路径是强信号，不受此闸约束（初级研究者也可能引用不高）。
 */
const NAME_ONLY_MIN_CITATIONS = 1000;

/**
 * 机构匹配路径的引用下限。机构对上但引用近零，多是 OpenAlex 的**碎片/重复 profile**
 * （大牛主 profile 没被搜出，匹配到同机构的空壳，如 Salakhutdinov cit=10、Efros cit=0、Kolter cit=23），
 * 写进去等于给错 ID。设较低（100）只挡碎片，保留 Leviathan/Cobbe 这类真初级研究者。
 */
const AFFILIATION_MIN_CITATIONS = 100;

/**
 * 中文机构名 → OpenAlex 英文机构关键词。person.organization 多为中文，OpenAlex affiliations 是英文，
 * 不映射则机构匹配对中文条目全失效（李飞飞/贾扬清等被误判不可消歧）。补常见 AI 机构即可救回一批。
 */
const ORG_CN_EN: Record<string, string[]> = {
  斯坦福: ['stanford'], 清华: ['tsinghua'], 北大: ['peking'], 北京大学: ['peking'],
  普林斯顿: ['princeton'], 麻省理工: ['mit', 'massachusetts institute'], 伯克利: ['berkeley'],
  卡内基梅隆: ['carnegie mellon'], 多伦多大学: ['toronto'], 蒙特利尔: ['montreal', 'mila'],
  谷歌: ['google'], 微软: ['microsoft'], 微软研究院: ['microsoft research'], 英伟达: ['nvidia'],
  脸书: ['facebook', 'meta'], 苹果: ['apple'], 亚马逊: ['amazon'], 腾讯: ['tencent'],
  阿里: ['alibaba'], 阿里巴巴: ['alibaba'], 百度: ['baidu'], 字节: ['bytedance'], 华为: ['huawei'],
  小米: ['xiaomi'], 智谱: ['zhipu', 'tsinghua'], 旷视: ['megvii'], 商汤: ['sensetime'],
  深度求索: ['deepseek'], 月之暗面: ['moonshot'], 麦吉尔: ['mcgill'], 约翰斯霍普金斯: ['johns hopkins'],
};

/** 归一：小写、去音标、去非字母数字（保留 CJK）、压空格。与 fetch_openalex_papers 一致。 */
function normalize(value: string): string {
  return (value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, ' ')
    .trim();
}

/** 把一个机构名展开成「归一原名 + 命中的英文关键词」，供机构匹配用。 */
function expandOrg(org: string): string[] {
  const norm = normalize(org);
  const out = [norm];
  for (const [cn, ens] of Object.entries(ORG_CN_EN)) {
    if (org.includes(cn)) out.push(...ens);
  }
  return out.filter(Boolean);
}

interface AuthorMatch {
  authorId: string;
  displayName: string;
  orcid: string | null;
  citedByCount: number;
  confidence: number;
  reason: string;
}

/**
 * 同名消歧——与 fetch_openalex_papers.ts 的 disambiguate 同一套判据，保证补进去的 ID
 * 正是论文抓取会信任的那个：
 *   精确名 + 机构重叠 → 0.88 / 部分名 + 机构重叠 → 0.74 / 唯一精确同名（无机构信号）→ 0.72
 *   多个精确同名且都无机构信号 → null（不可消歧，进 review）
 */
function disambiguate(
  candidate: string,
  orgs: string[],
  authors: Awaited<ReturnType<typeof searchOpenAlexAuthor>>,
): AuthorMatch | null {
  const normCand = normalize(candidate);
  const normOrgs = orgs.flatMap(expandOrg).filter(Boolean);

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

  const toMatch = (s: typeof scored[number], confidence: number, reason: string): AuthorMatch => ({
    authorId: s.a.id.replace('https://openalex.org/', ''),
    displayName: s.a.displayName,
    orcid: s.a.orcid ? String(s.a.orcid) : null,
    citedByCount: s.a.citedByCount,
    confidence,
    reason,
  });

  const withAff = scored.filter(s => (s.exact || s.partial) && s.affMatch);
  if (withAff.length > 0) {
    // 机构匹配优先精确名、再引用高者（取 canonical 而非碎片 profile）
    withAff.sort((x, y) => Number(y.exact) - Number(x.exact) || y.a.citedByCount - x.a.citedByCount);
    const best = withAff[0];
    if (best.a.citedByCount >= AFFILIATION_MIN_CITATIONS) {
      return toMatch(best, best.exact ? 0.88 : 0.74, best.exact ? 'name_exact+affiliation' : 'name_partial+affiliation');
    }
    // 机构对上但引用近零=碎片 profile，落到下面 name-only 闸（多半也不过）→ review
  }

  const exactOnes = scored.filter(s => s.exact);
  if (exactOnes.length === 1) {
    // 无机构信号的唯一精确名：加引用下限，挡住"高影响力本人 ↔ 近零引用同名小号"的张冠李戴。
    if (exactOnes[0].a.citedByCount < NAME_ONLY_MIN_CITATIONS) return null;
    return toMatch(exactOnes[0], 0.72, 'name_exact_unique(no_affiliation_signal)');
  }
  return null;
}

interface OfficialLink { type?: string; url?: string; handle?: string; [k: string]: unknown }

/** 已有 orcid 项就不动；否则追加一条。返回 [新数组, 是否变更]。 */
function withOrcidLink(links: unknown, orcid: string): [OfficialLink[], boolean] {
  const arr: OfficialLink[] = Array.isArray(links) ? (links as OfficialLink[]) : [];
  if (arr.some(l => l && l.type === 'orcid')) return [arr, false];
  const clean = orcid.replace('https://orcid.org/', '');
  return [[...arr, { type: 'orcid', url: `https://orcid.org/${clean}`, handle: clean }], true];
}

async function main() {
  const opts = parseOptions(process.argv.slice(2));
  const log = (msg: string) => { if (!opts.quiet) console.log(msg); };

  console.log(`🆔 backfill_openalex_identity — ${opts.execute ? '执行写库' : 'DRY-RUN（不写库）'}`);

  await prisma.people.count();

  const select = { id: true, name: true, aliases: true, organization: true, officialLinks: true, openalexId: true } as const;
  let people;
  if (opts.names && opts.names.length > 0) {
    people = await prisma.people.findMany({ where: { OR: opts.names.flatMap(n => [{ name: n }, { aliases: { has: n } }]) }, select });
  } else {
    const where: Record<string, unknown> = { status: { in: ['active', 'ready'] }, openalexId: null };
    if (opts.roles === 'academic') where.roleCategory = { in: ['researcher', 'professor'] };
    people = await prisma.people.findMany({ where, select, orderBy: { influenceScore: 'desc' }, take: opts.limit });
  }
  console.log(`   目标 ${people.length} 人（${opts.names ? '指定' : `${opts.roles}，缺 openalexId，按影响力降序`}）\n`);

  const stats = { processed: 0, matched: 0, ambiguous: 0, notFound: 0, idWritten: 0, orcidWritten: 0, failed: 0, skippedHasId: 0, cjkFlagged: 0, excluded: 0 };
  const review: string[] = [];

  for (const person of people) {
    stats.processed++;
    if (person.openalexId) { stats.skippedHasId++; continue; } // 幂等：已有 ID 不动

    const candidates = [person.name, ...(person.aliases || [])].filter(Boolean);
    let match: AuthorMatch | null = null;
    let ambiguousHit = false;
    for (const cand of candidates) {
      const authors = await searchOpenAlexAuthor(cand);
      await sleep(opts.delayMs);
      if (authors.length === 0) continue;
      match = disambiguate(cand, person.organization || [], authors);
      if (match) break;
      ambiguousHit = true;
    }

    if (!match) {
      if (ambiguousHit) { stats.ambiguous++; review.push(`${person.name}（有同名候选但无法安全消歧）`); }
      else { stats.notFound++; }
      log(`  - ${person.name}: 无可安全归属的作者，跳过`);
      continue;
    }
    stats.matched++;
    const orcidNote = match.orcid ? ` orcid=${match.orcid.replace('https://orcid.org/', '')}` : ' (无 orcid)';
    const cjkFlag = hasNonAscii(person.name) ? ' ⚠️中文名经别名匹配-需核' : '';
    if (cjkFlag) stats.cjkFlagged++;
    log(`  · ${person.name} ⇐ ${match.displayName} [${match.reason} c=${match.confidence}] cit=${match.citedByCount}${orcidNote}${cjkFlag}`);

    if (opts.excludeNames.has(person.name)) { stats.excluded++; log(`      ↳ 已在 --exclude-names，跳过写入`); continue; }
    if (!opts.execute) continue;

    try {
      const data: Record<string, unknown> = { openalexId: match.authorId, citationCount: match.citedByCount };
      if (match.orcid) {
        const [nextLinks, changed] = withOrcidLink(person.officialLinks, match.orcid);
        if (changed) { data.officialLinks = nextLinks; stats.orcidWritten++; }
      }
      await prisma.people.update({ where: { id: person.id }, data });
      stats.idWritten++;
    } catch (error) {
      stats.failed++;
      console.error(`    ✗ 写入失败 ${person.name}:`, (error as Error).message);
    }
  }

  console.log('\n📊 汇总');
  console.log(`   处理人数      ${stats.processed}（已有 ID 跳过 ${stats.skippedHasId}）`);
  console.log(`   可安全归属    ${stats.matched}（其中中文名经别名匹配需核 ${stats.cjkFlagged}${stats.excluded ? `，--exclude-names 排除 ${stats.excluded}` : ''}）`);
  console.log(`   不可消歧      ${stats.ambiguous}（进 review，不写）`);
  console.log(`   搜不到        ${stats.notFound}`);
  if (opts.execute) {
    console.log(`   已写 openalexId ${stats.idWritten}，其中带 ORCID ${stats.orcidWritten}（失败 ${stats.failed}）`);
  } else {
    console.log('\n这是 DRY-RUN。确认归属无误后加 --execute 写库。');
  }
  if (review.length > 0) {
    console.log(`\n⚠️ review 队列（${review.length}，需人工核 OpenAlex 主页）：`);
    for (const r of review.slice(0, 30)) console.log(`   - ${r}`);
  }

  await prisma.$disconnect();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
