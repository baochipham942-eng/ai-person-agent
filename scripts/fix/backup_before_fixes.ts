/**
 * 批量修复前的回滚备份: 全量快照受影响的 4 张表当前状态。
 * 出问题可据此还原 (createMany 带显式 id 重建删除项, update 还原改动项)。
 * 用法: npx tsx scripts/fix/backup_before_fixes.ts
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../lib/db/prisma';

async function main() {
    const out = path.join(process.cwd(), 'docs/audit-2026-06/backup-2026-06-07.json');

    const [organizations, personRoles, personRelations, people] = await Promise.all([
        prisma.organization.findMany(),
        prisma.personRole.findMany({ select: { id: true, personId: true, organizationId: true, role: true, roleZh: true, startDate: true, endDate: true, source: true, confidence: true, advisorId: true } }),
        prisma.personRelation.findMany(),
        prisma.people.findMany({ select: { id: true, name: true, organization: true } }),
    ]);

    const snapshot = {
        _meta: { createdAt: '2026-06-07', purpose: 'rollback backup before apply_audit_fixes --execute' },
        counts: { organizations: organizations.length, personRoles: personRoles.length, personRelations: personRelations.length, people: people.length },
        organizations,
        personRoles,
        personRelations,
        people,
    };

    fs.writeFileSync(out, JSON.stringify(snapshot, null, 2));
    console.log(`✅ 备份写入: ${out}`);
    console.log(`   org ${organizations.length} | roles ${personRoles.length} | relations ${personRelations.length} | people ${people.length}`);
    process.exit(0);
}
main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
