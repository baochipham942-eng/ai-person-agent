/**
 * C 桶核验流水线：对"同时 ≥2 家公司在职"的人，核实截至今天的真实当前雇主，
 * 为每条 endDate=null 的当前角色判定 current / past / error，past 给大致离职年月。
 * 取证：Tavily 网络搜索（Exa/Perplexity 已欠费）；判定：DeepSeek 结构化(zod，带 gemini 降级)。
 * 只产出 review 队列 JSON，绝不写库。
 *
 * 用法：
 *   npx tsx scripts/audit/verify_current_employer.ts            # 全量 C 桶
 *   npx tsx scripts/audit/verify_current_employer.ts --limit 5
 *   npx tsx scripts/audit/verify_current_employer.ts --only "Boris Cherny"
 *   npx tsx scripts/audit/verify_current_employer.ts --force    # 重跑已完成的
 *
 * ⚠️ 每人 1 次 Tavily + 1 次 DeepSeek，量小成本低。断点续跑。
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../../lib/db/prisma';
import { searchTavily } from '../../lib/tavily-search';
import { generateStructured } from '../../lib/ai/provider';
import { isAcademicLikeOrganization, isPrimaryEmploymentRole, normalizeEmployerName } from '../../lib/person-role-kind';

const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
const OUT = path.join(process.cwd(), 'data/audit/concurrent-roles-review.json');

const args = process.argv.slice(2);
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const names = args.includes('--names') ? args[args.indexOf('--names') + 1].split(',').map((s) => s.trim()) : null;
const deep = args.includes('--deep');
const force = args.includes('--force');

function distinctNormalizedEmployerNames(names: string[]): string[] {
  const groups: string[] = [];
  for (const raw of names) {
    const norm = normalizeEmployerName(raw);
    if (!norm) continue;
    if (!groups.some((g) => g === norm || g.includes(norm) || norm.includes(g))) {
      groups.push(norm);
    }
  }
  return groups;
}

function verdictForRole(review: ReviewItem | undefined, roleId: string): Verdict | null {
  if (!review?.roles || !review.verdicts) return null;
  const role = review.roles.find((entry) => entry.roleId === roleId);
  if (!role) return null;
  return review.verdicts[String(role.idx)] || null;
}

function hasVerifiedCurrentParallel(review: ReviewItem | undefined, roles: { id: string }[]): boolean {
  if (roles.length < 2) return false;
  return roles.every((role) => {
    const verdict = verdictForRole(review, role.id);
    return verdict?.status === 'current' && verdict.confidence >= 0.8;
  });
}

function buildSearchQueries(candidate: Candidate): string[] {
  const orgNames = [...new Set(candidate.roles.map((role) => role.org))].slice(0, 6).join(' ');
  return uniqueValues([
    ...candidate.roles.map((role) => `${candidate.name} "${role.org}" "${role.role}" current role 2025 2026`),
    ...candidate.roles.map((role) => `${candidate.name} "${role.org}" CEO founder company profile`),
    `${candidate.name} ${orgNames} current role 2025 2026 left joined`,
  ]);
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function dedupeHits<T extends { url: string }>(hits: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const hit of hits) {
    if (seen.has(hit.url)) continue;
    seen.add(hit.url);
    deduped.push(hit);
  }
  return deduped;
}

interface RoleEntry {
  roleId: string;
  idx: number;
  role: string;
  org: string;
  orgType: string;
  startDate: string | null;
}
interface Candidate { personId: string; name: string; description: string | null; roles: RoleEntry[] }
interface Verdict { status: string; endApprox: string | null; confidence: number; note: string }
interface ReviewItem {
  personId: string;
  name: string;
  description: string | null;
  roles: RoleEntry[];
  verdicts: Record<number, Verdict>;
  sources: { title: string; url: string; date: string | null }[];
  provider?: string;
  error?: string;
}

const VerdictSchema = z.object({
  verdicts: z.array(
    z.object({
      idx: z.number(),
      status: z.enum(['current', 'past', 'error', 'unknown']),
      endApprox: z.string().nullable().optional(),
      confidence: z.number().min(0).max(1),
      note: z.string(),
    })
  ),
});

function loadExisting(): Record<string, ReviewItem> {
  if (!fs.existsSync(OUT)) return {};
  try {
    const arr: ReviewItem[] = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    return Object.fromEntries(arr.map((x) => [x.personId, x]));
  } catch {
    return {};
  }
}
function save(map: Record<string, ReviewItem>) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(Object.values(map), null, 2));
}

async function main() {
  const map = loadExisting();
  const people = await prisma.people.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      roles: {
        select: {
          id: true,
          role: true,
          roleZh: true,
          startDate: true,
          endDate: true,
          organization: { select: { name: true, nameZh: true, type: true } },
        },
      },
    },
  });

  const candidates: Candidate[] = [];
  for (const p of people) {
    const current = (p.roles || []).filter((r) => !r.endDate && isPrimaryEmploymentRole(r));
    const companyRoles = current.filter((r) =>
      r.organization?.type === 'company' &&
      !isAcademicLikeOrganization({ organizationName: r.organization?.name, organizationType: r.organization?.type })
    );
    const distinctCompany = distinctNormalizedEmployerNames(companyRoles.map((r) => r.organization?.name || ''));
    if (distinctCompany.length < 2) continue;
    if (!force && hasVerifiedCurrentParallel(map[p.id], companyRoles)) continue;
    const roles: RoleEntry[] = current.map((r, i) => ({
      roleId: r.id,
      idx: i,
      role: r.roleZh || r.role,
      org: r.organization?.name || '(unknown)',
      orgType: r.organization?.type || '?',
      startDate: r.startDate ? r.startDate.toISOString().slice(0, 10) : null,
    }));
    candidates.push({ personId: p.id, name: p.name, description: p.description, roles });
  }

  let pool = candidates;
  if (only) pool = pool.filter((c) => c.name.includes(only));
  if (names) pool = pool.filter((c) => names.some((n) => c.name.includes(n)));
  console.log(`C 桶候选 ${candidates.length} 人，本次处理 ${Math.min(pool.length, limit)} 人\n`);

  let done = 0;

  for (const c of pool) {
    if (done >= limit) break;
    if (map[c.personId] && !map[c.personId].error && !force) continue;
    done++;

    try {
      // 1) 取证
      const queries = buildSearchQueries(c);
      const hits = dedupeHits(
        (await Promise.all(queries.map((query) =>
          searchTavily(query, {
            maxResults: deep ? 4 : 3,
            rawContent: 'text',
            searchDepth: deep ? 'advanced' : undefined,
          })
        ))).flat()
      ).slice(0, deep ? 12 : 8);
      const sources = hits.map((h: any) => ({
        title: h.title || '',
        url: h.url || '',
        date: h.publishedDate || h.published_date || null,
      }));
      const evidence = hits
        .map((h: any, i: number) => `(${i + 1}) [${h.publishedDate || '日期未知'}] ${h.title}\n${(h.text || h.rawContent || '').slice(0, 600)}\n来源:${h.url}`)
        .join('\n\n');

      const roleLines = c.roles
        .map((r) => `  idx=${r.idx}: ${r.role} @ ${r.org} (类型:${r.orgType}, 起始:${r.startDate || '未知'})`)
        .join('\n');

      // 2) 判定
      const { data, provider } = await generateStructured(
        [
          {
            role: 'system',
            content:
              '你是严谨的 AI 行业人物事实核查员。只依据给定证据 + 你的可靠常识判断，不要编造。',
          },
          {
            role: 'user',
            content: `截至 ${TODAY}，核实「${c.name}」的当前任职。
简介：${c.description?.slice(0, 300) || '(无)'}

数据库把下面这些职位都标成了"至今在职"(endDate 为空)，逐条判断：
${roleLines}

网络证据：
${evidence || '(无搜索结果，仅凭常识判断，confidence 调低)'}

对每个 idx 给出：
- status: "current"=此刻仍在该机构任此职 | "past"=已离开，应补离职日期 | "error"=这根本不是其真实雇主（如把影视作品/奖项/学位/不相干机构误当雇主）| "unknown"=证据不足
- endApprox: status=past 时给 "YYYY-MM" 或 "YYYY"，否则 null
- confidence: 0-1
- note: 一句中文依据（引用证据条目）

判定铁律：
1. 【最新证据决定现状】以日期最近的证据为准。若某机构在最新证据里仍被描述为此人现职（如"is now / current / Head of X at Y"），它就是 current，即使更早证据显示他曾离开——人会回流。反之，他"回流自"的上一家就是 past。
2. 【至少留一个 current】除非证据明确显示此人已完全退休/转入下一家，否则这些"在职"记录里至少有一个应判 current（通常是最新证据指向的那家）。不要把所有记录都判成 past。
3. 【真实并行】连续创业者/同时合法掌管多家公司真实存在（如同时经营多家企业的创始人），不要把真实并行任职误判为 past。
4. 把握不准就用 unknown，别硬猜。
返回 JSON：{"verdicts":[{"idx":0,"status":"...","endApprox":null,"confidence":0.0,"note":"..."}]}`,
          },
        ],
        VerdictSchema,
        { temperature: 0.1, maxTokens: 1500 }
      );

      const verdicts: Record<number, Verdict> = {};
      for (const v of data.verdicts) {
        verdicts[v.idx] = {
          status: v.status,
          endApprox: v.endApprox ?? null,
          confidence: v.confidence,
          note: v.note,
        };
      }
      map[c.personId] = { personId: c.personId, name: c.name, description: c.description, roles: c.roles, verdicts, sources, provider };

      const past = data.verdicts.filter((v) => v.status === 'past').length;
      const err = data.verdicts.filter((v) => v.status === 'error').length;
      const unk = data.verdicts.filter((v) => v.status === 'unknown').length;
      console.log(`[${done}] ${c.name} (${provider}, ${hits.length}源): ${c.roles.length}角色 → past:${past} error:${err} unknown:${unk}`);
    } catch (e: any) {
      map[c.personId] = { personId: c.personId, name: c.name, description: c.description, roles: c.roles, verdicts: {}, sources: [], error: e.message };
      console.log(`[${done}] ${c.name}: ❌ ${e.message?.slice(0, 140)}`);
    }
    save(map);
  }

  console.log(`\n完成 ${done} 人。队列写入: ${OUT}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
