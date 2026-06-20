import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import { isAcademicLikeOrganization, isPrimaryEmploymentRole, normalizeEmployerName } from '../../lib/person-role-kind';

neonConfig.webSocketConstructor = ws;
const connectionString = process.env.DATABASE_URL!;
const REVIEW_QUEUE = path.join(process.cwd(), 'data/audit/concurrent-roles-review.json');

interface ReviewRoleEntry { roleId: string; idx: number }
interface ReviewVerdict { status: string; confidence: number }
interface ReviewItem {
  personId: string;
  roles?: ReviewRoleEntry[];
  verdicts?: Record<string, ReviewVerdict>;
}

function loadReviewMap(): Record<string, ReviewItem> {
  if (!fs.existsSync(REVIEW_QUEUE)) return {};
  try {
    const items = JSON.parse(fs.readFileSync(REVIEW_QUEUE, 'utf8')) as ReviewItem[];
    return Object.fromEntries(items.map((item) => [item.personId, item]));
  } catch {
    return {};
  }
}

function reviewVerdictForRole(review: ReviewItem | undefined, roleId: string): ReviewVerdict | null {
  if (!review?.roles || !review.verdicts) return null;
  const role = review.roles.find((entry) => entry.roleId === roleId);
  if (!role) return null;
  return review.verdicts[String(role.idx)] || null;
}

async function main() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 所有人物 + 其 PersonRole + 组织
    const people = await prisma.people.findMany({
      select: {
        id: true,
        name: true,
        currentTitle: true,
        organization: true,
        roles: {
          select: {
            id: true,
            role: true,
            roleZh: true,
            startDate: true,
            endDate: true,
            confidence: true,
            source: true,
            organization: { select: { name: true, nameZh: true, type: true } },
          },
        },
      },
    });

    type HitRole = { id: string; role: string; org: string; orgType: string; start: Date | null; conf: number | null };
    type Hit = {
      id: string;
      name: string;
      currentCount: number;
      orgs: string[];
      roles: HitRole[];
    };

    const reviewMap = loadReviewMap();
    const hits: Hit[] = [];

    for (const p of people) {
      // “当前雇主”只统计主雇佣关系，排除董事/顾问/课程/项目等并行头衔。
      const current = (p.roles || []).filter(
        (r) => !r.endDate && isPrimaryEmploymentRole(r)
      );
      // 按组织名去重（同公司多条算一个雇主）
      const orgNames = Array.from(
        new Set(current.map((r) => r.organization?.name || '(unknown)'))
      );
      if (orgNames.length >= 2) {
        hits.push({
          id: p.id,
          name: p.name,
          currentCount: current.length,
          orgs: orgNames,
          roles: current.map((r) => ({
            id: r.id,
            role: r.roleZh || r.role,
            org: r.organization?.nameZh || r.organization?.name || '(unknown)',
            orgType: r.organization?.type || '?',
            start: r.startDate,
            conf: r.confidence,
          })),
        });
      }
    }

    // 按当前雇主数量降序
    hits.sort((a, b) => b.orgs.length - a.orgs.length);

    console.log(`\n总人物数: ${people.length}`);
    console.log(`存在“多个当前雇主”(≥2 个 endDate 为空的非学生组织) 的人物: ${hits.length}\n`);
    console.log('='.repeat(80));

    for (const h of hits) {
      console.log(`\n【${h.name}】 (id=${h.id})  当前雇主 ${h.orgs.length} 个 / 当前角色 ${h.currentCount} 条`);
      console.log(`  People.organization[]: ${JSON.stringify(h.orgs)}`);
      for (const r of h.roles) {
        const start = r.start ? r.start.toISOString().slice(0, 10) : '无起始';
        const conf = r.conf != null ? r.conf.toFixed(2) : '?';
        console.log(`   - ${r.role} @ ${r.org} [${r.orgType}]  起:${start}  conf:${conf}  (endDate=null=至今)`);
      }
    }

    // ---- 按根因分桶 ----
    // 把当前雇主按规范名合并成“去重后实体”
    function distinctEmployers(h: Hit) {
      const groups: { norm: string; names: string[]; academic: boolean }[] = [];
      for (const r of h.roles) {
        const n = normalizeEmployerName(r.org) || normalizeEmployerName(r.role);
        // 名字互相包含也算同一实体
        let g = groups.find(
          (x) => x.norm === n || x.norm.includes(n) || n.includes(x.norm)
        );
        if (!g) {
          g = { norm: n, names: [], academic: true };
          groups.push(g);
        }
        if (!g.names.includes(r.org)) g.names.push(r.org);
        if (r.orgType === 'company' && !isAcademicLikeOrganization({ organizationName: r.org, organizationType: r.orgType })) g.academic = false;
      }
      return groups;
    }

    const bucketA: Hit[] = []; // 纯重复组织（去重后只剩 1 个雇主）
    const bucketB: Hit[] = []; // 合法并行（去重后 ≥2 个，但全是学术机构）
    const bucketC: Hit[] = []; // 仍需核验的多公司当前雇主
    const bucketD: Hit[] = []; // 已有 review 证据确认的真实并行

    for (const h of hits) {
      const emps = distinctEmployers(h);
      const companyEmps = emps.filter((e) => !e.academic);
      if (emps.length < 2) bucketA.push(h);
      else if (companyEmps.length >= 2 && hasVerifiedCurrentParallel(h)) bucketD.push(h);
      else if (companyEmps.length >= 2) bucketC.push(h);
      else bucketB.push(h); // 其余：含学术机构的并行 / 教育残留，多为合法或属其他 bug 类
    }
    function hasVerifiedCurrentParallel(h: Hit) {
      const review = reviewMap[h.id];
      const companyRoles = h.roles.filter(
        (r) => r.orgType === 'company' && !isAcademicLikeOrganization({ organizationName: r.org, organizationType: r.orgType })
      );
      const companyGroups = new Set(companyRoles.map((r) => normalizeEmployerName(r.org)));
      return companyGroups.size >= 2 && companyRoles.every((role) => {
        const verdict = reviewVerdictForRole(review, role.id);
        return verdict?.status === 'current' && verdict.confidence >= 0.8;
      });
    }
    // bucketC 内按非学术公司雇主数排序
    const compCount = (h: Hit) =>
      distinctEmployers(h).filter((e) => !e.academic).length;
    bucketC.sort((a, b) => compCount(b) - compCount(a));
    bucketD.sort((a, b) => compCount(b) - compCount(a));

    console.log('\n' + '='.repeat(80));
    console.log('\n按根因分桶：');
    console.log(`  A. 纯重复组织(去重后仅 1 雇主，显示重影非职位错)        : ${bucketA.length} 人`);
    console.log(`  B. 含学术并行/教育残留(可能合法或属其它 bug，需另议) : ${bucketB.length} 人`);
    console.log(`  C. ≥2 个公司同时“在职”(仍需核验/修正)              : ${bucketC.length} 人`);
    console.log(`  D. 已核实真实并行(不应算数据问题)                 : ${bucketD.length} 人`);

    const fmtC = (h: Hit) => {
      const comps = distinctEmployers(h)
        .filter((e) => !e.academic)
        .map((e) => e.names[0]);
      return `  - ${h.name} [${comps.length}司]: ${comps.join(' | ')}`;
    };
    const fmt = (h: Hit) => `  - ${h.name}: ${h.orgs.join(' | ')}`;
    console.log('\n--- Bucket C（最该修，需逐人核实，Boris 在此；只列非学术公司雇主）---');
    console.log(bucketC.map(fmtC).join('\n'));
    console.log('\n--- Bucket D（已有 review 证据确认真实并行；只列非学术公司雇主）---');
    console.log(bucketD.map(fmtC).join('\n'));
    console.log('\n--- Bucket A（组织去重即可消除）---');
    console.log(bucketA.map(fmt).join('\n'));
  } catch (err: any) {
    console.error('查询失败:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
