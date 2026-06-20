import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { prisma } from '@/lib/db/prisma';
import { getDirectoryOrganizationAliases } from '@/lib/person-directory-config';

const ORGS = ['OpenAI', 'Anthropic', 'Google', 'xAI', 'DeepSeek', 'Meta'];

async function main() {
  await prisma.people.count(); // wake DB

  for (const org of ORGS) {
    const aliases = getDirectoryOrganizationAliases(org);
    console.log(`\n================= ${org} (aliases: ${aliases.join(', ')}) =================`);

    // --- CompanySource: counts by role ---
    const orgRow = await prisma.organization.findFirst({
      where: { OR: aliases.flatMap(v => [
        { name: { equals: v, mode: 'insensitive' as const } },
        { nameZh: { equals: v, mode: 'insensitive' as const } },
      ]) },
      select: { id: true, name: true, nameZh: true },
    });
    if (!orgRow) { console.log('  [Organization row NOT FOUND]'); continue; }

    const sources = await prisma.companySource.findMany({
      where: { organizationId: orgRow.id },
      select: { role: true, sourceKind: true, title: true },
    });
    const byRole: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    for (const s of sources) {
      byRole[s.role] = (byRole[s.role] || 0) + 1;
      byKind[s.sourceKind] = (byKind[s.sourceKind] || 0) + 1;
    }
    console.log(`  CompanySource total: ${sources.length}`);
    console.log(`    by role : ${JSON.stringify(byRole)}`);
    console.log(`    by kind : ${JSON.stringify(byKind)}`);

    // --- PersonRole at org (current vs alumni), person.status filter ---
    const roleWhere = {
      organization: { OR: [ { name: { in: aliases } }, { nameZh: { in: aliases } } ] },
    };
    const rolesAll = await prisma.personRole.findMany({
      where: roleWhere,
      select: { endDate: true, person: { select: { id: true, name: true, status: true, currentTitle: true } } },
    });
    const readyRoles = rolesAll.filter(r => ['ready', 'active'].includes(r.person.status));
    const currentIds = new Set(readyRoles.filter(r => !r.endDate).map(r => r.person.id));
    const alumniIds = new Set(readyRoles.filter(r => r.endDate).map(r => r.person.id));
    console.log(`  PersonRole rows: ${rolesAll.length} (ready/active people: ${readyRoles.length})`);
    console.log(`    current (no endDate, ready): ${currentIds.size}, alumni: ${alumniIds.size}`);

    // --- People with org in organization[] array but NO PersonRole at org ---
    const peopleByArray = await prisma.people.findMany({
      where: {
        status: { in: ['ready', 'active'] },
        organization: { hasSome: aliases },
      },
      select: { id: true, name: true, currentTitle: true, organization: true, influenceScore: true },
    });
    const rolePersonIds = new Set(rolesAll.map(r => r.person.id));
    const arrayOnly = peopleByArray.filter(p => !rolePersonIds.has(p.id));
    console.log(`  People with org in organization[] & ready: ${peopleByArray.length}`);
    console.log(`    of those WITHOUT any PersonRole at org (invisible to roster): ${arrayOnly.length}`);
    if (arrayOnly.length) {
      console.log('    examples: ' + arrayOnly.slice(0, 12).map(p => `${p.name}[inf=${p.influenceScore ?? '-'}]`).join(', '));
    }

    // --- Directory eligibility: roles.some OR currentTitle contains alias (NO organization[] branch) ---
    const titleMatchOnly = peopleByArray.filter(p =>
      !rolePersonIds.has(p.id) &&
      !aliases.some(a => (p.currentTitle || '').toLowerCase().includes(a.toLowerCase()))
    );
    console.log(`    of those ALSO not matched by currentTitle (fully excluded from org directory): ${titleMatchOnly.length}`);
    if (titleMatchOnly.length) {
      console.log('    fully-excluded examples: ' + titleMatchOnly.slice(0, 12).map(p => p.name).join(', '));
    }
  }

  // --- Specific people lookups ---
  console.log('\n================= SPECIFIC PEOPLE =================');
  const names = ['Cat Wu', 'Catherine Wu', 'Tibo', 'Thibault Sottiaux', 'Amanda Askell', 'Lilian Weng'];
  for (const n of names) {
    const ppl = await prisma.people.findMany({
      where: { OR: [ { name: { contains: n, mode: 'insensitive' } }, { aliases: { hasSome: [n] } } ] },
      select: { id: true, name: true, status: true, organization: true, currentTitle: true, influenceScore: true,
        roles: { select: { role: true, endDate: true, organization: { select: { name: true } } } } },
    });
    if (!ppl.length) { console.log(`  "${n}": NOT IN DB`); continue; }
    for (const p of ppl) {
      console.log(`  "${n}" -> ${p.name} [status=${p.status}, inf=${p.influenceScore ?? '-'}] org[]=${JSON.stringify(p.organization)} title=${JSON.stringify(p.currentTitle)}`);
      console.log(`      roles: ${p.roles.map(r => `${r.organization?.name}:${r.role}${r.endDate ? '(ended)' : '(current)'}`).join(' | ') || 'NONE'}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
