import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const connectionString = process.env.DATABASE_URL!;

function isStudentRole(role: string | null | undefined): boolean {
  return Boolean(role && role.toLowerCase().includes('student'));
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

    type Hit = {
      id: string;
      name: string;
      currentCount: number;
      orgs: string[];
      roles: { role: string; org: string; orgType: string; start: Date | null; conf: number | null }[];
    };

    const hits: Hit[] = [];

    for (const p of people) {
      // “当前”角色 = endDate 为空 + 非学生（与 PersonHeader.generateCurrentTitle 一致）
      const current = (p.roles || []).filter(
        (r) => !r.endDate && !isStudentRole(r.role)
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
    const normOrg = (s: string) =>
      s
        .toLowerCase()
        .replace(/\(.*?\)|（.*?）/g, '')
        .replace(/\b(inc|ltd|llc|corp|co|company|的)\b|\.|,|，|inc\.|公司|集团|，/g, '')
        .replace(/[^a-z0-9一-龥]/g, '')
        .trim();

    // 学术/教育/学位机构（含高中、学位条目），这类“当前”角色多为合法并行或教育残留，不是“同时两份公司工作”的 bug
    const isAcademic = (name: string, type: string) =>
      type === 'university' ||
      /universit|institute|college|école|school|academy|大学|学院|研究院|研究所|学位|中学|高级中学|laborator|cifar|vector institute|高等研究|symphony|baptist/i.test(
        name
      );

    // 把当前雇主按规范名合并成“去重后实体”
    function distinctEmployers(h: Hit) {
      const groups: { norm: string; names: string[]; academic: boolean }[] = [];
      for (const r of h.roles) {
        const n = normOrg(r.org) || normOrg(r.role);
        // 名字互相包含也算同一实体
        let g = groups.find(
          (x) => x.norm === n || x.norm.includes(n) || n.includes(x.norm)
        );
        if (!g) {
          g = { norm: n, names: [], academic: true };
          groups.push(g);
        }
        if (!g.names.includes(r.org)) g.names.push(r.org);
        if (!isAcademic(r.org, r.orgType)) g.academic = false;
      }
      return groups;
    }

    const bucketA: Hit[] = []; // 纯重复组织（去重后只剩 1 个雇主）
    const bucketB: Hit[] = []; // 合法并行（去重后 ≥2 个，但全是学术机构）
    const bucketC: Hit[] = []; // 疑似过期旧职位（去重后 ≥2 个，且含公司类，最像 Boris 的真 bug）

    for (const h of hits) {
      const emps = distinctEmployers(h);
      const companyEmps = emps.filter((e) => !e.academic);
      if (emps.length < 2) bucketA.push(h);
      else if (companyEmps.length >= 2) bucketC.push(h); // ≥2 个非学术公司同时“在职” = 最像 Boris 的真 bug
      else bucketB.push(h); // 其余：含学术机构的并行 / 教育残留，多为合法或属其他 bug 类
    }
    // bucketC 内按非学术公司雇主数排序
    const compCount = (h: Hit) =>
      distinctEmployers(h).filter((e) => !e.academic).length;
    bucketC.sort((a, b) => compCount(b) - compCount(a));

    console.log('\n' + '='.repeat(80));
    console.log('\n按根因分桶：');
    console.log(`  A. 纯重复组织(去重后仅 1 雇主，显示重影非职位错)        : ${bucketA.length} 人`);
    console.log(`  B. 含学术并行/教育残留(可能合法或属其它 bug，需另议) : ${bucketB.length} 人`);
    console.log(`  C. ≥2 个公司同时“在职”(最像 Boris 真 bug，高置信)   : ${bucketC.length} 人`);

    const fmtC = (h: Hit) => {
      const comps = distinctEmployers(h)
        .filter((e) => !e.academic)
        .map((e) => e.names[0]);
      return `  - ${h.name} [${comps.length}司]: ${comps.join(' | ')}`;
    };
    const fmt = (h: Hit) => `  - ${h.name}: ${h.orgs.join(' | ')}`;
    console.log('\n--- Bucket C（最该修，需逐人核实，Boris 在此；只列非学术公司雇主）---');
    console.log(bucketC.map(fmtC).join('\n'));
    console.log('\n--- Bucket A（组织去重即可消除）---');
    console.log(bucketA.map(fmt).join('\n'));
  } catch (err: any) {
    console.error('查询失败:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
