/**
 * Apply organization review decisions.
 *
 * Default is dry-run. Execute mode merges only explicitly listed Organization
 * rows and optionally rewrites People.organization labels.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/org_review_decisions_2026_06_10.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/org_review_apply_log.json';
const ARCHIVE = getArg('--archive') || 'docs/audit-2026-06/data/org_review_apply_archive.json';
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/ORG_REVIEW_APPLY.md';
const EXECUTE = process.argv.includes('--execute');

loadExtraEnv();
if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function loadExtraEnv() {
  for (const file of [
    path.join(os.homedir(), '.code-agent/.env'),
    path.resolve('.env'),
    path.resolve('.env.local'),
  ]) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(file));
      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // Optional env file.
    }
  }
}

function compact(text, max = 180) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function roleKey(row) {
  return `${row.personId}|${row.role}|${row.startDate || 'null'}`;
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

async function loadOrganizations(ids) {
  if (!ids.length) return [];
  return await sql`
    SELECT id, name, "nameZh", type, "wikidataQid"
    FROM "Organization"
    WHERE id = ANY(${ids}::text[])
    ORDER BY name ASC
  `;
}

async function loadRoles(orgIds) {
  if (!orgIds.length) return [];
  return await sql`
    SELECT
      r.id,
      r."personId",
      p.name AS person,
      r.role,
      r."startDate"::text AS "startDate",
      r."endDate"::text AS "endDate",
      r."organizationId"
    FROM "PersonRole" r
    JOIN "People" p ON p.id = r."personId"
    WHERE r."organizationId" = ANY(${orgIds}::text[])
    ORDER BY p.name ASC, r.role ASC, r."startDate" ASC
  `;
}

async function loadPeopleForLabels(labels) {
  if (!labels.length) return [];
  return await sql`
    SELECT id, name, organization
    FROM "People"
    WHERE organization && ${labels}::text[]
    ORDER BY name ASC
  `;
}

async function planMerge(decision) {
  const canonical = (await loadOrganizations([decision.canonicalOrgId]))[0] || null;
  const members = await loadOrganizations(decision.memberOrgIds || []);
  const memberIds = members.map((row) => row.id);
  const missingMemberIds = (decision.memberOrgIds || []).filter((id) => !memberIds.includes(id));
  const canonicalRoles = canonical ? await loadRoles([canonical.id]) : [];
  const memberRoles = await loadRoles(memberIds);
  const existingKeys = new Set(canonicalRoles.map(roleKey));
  const roleActions = [];
  for (const role of memberRoles) {
    const key = roleKey(role);
    if (existingKeys.has(key)) {
      roleActions.push({ action: 'delete_duplicate_role', role });
    } else {
      roleActions.push({ action: 'repoint_role', role });
      existingKeys.add(key);
    }
  }

  const labelMap = {
    ...(decision.labelReplacements || {}),
  };
  if (canonical) {
    for (const member of members) {
      const canonicalLabel = decision.canonicalDisplayLabel || canonical.nameZh || canonical.name;
      if (member.name) labelMap[member.name] ||= canonicalLabel;
      if (member.nameZh) labelMap[member.nameZh] ||= canonicalLabel;
    }
  }

  const labels = Object.keys(labelMap);
  const people = await loadPeopleForLabels(labels);
  const peopleUpdates = people
    .map((person) => {
      const nextOrganization = dedupe((person.organization || []).map((value) => labelMap[value] || value));
      return {
        id: person.id,
        name: person.name,
        before: person.organization || [],
        after: nextOrganization,
        changed: JSON.stringify(person.organization || []) !== JSON.stringify(nextOrganization),
      };
    })
    .filter((row) => row.changed);

  return {
    decision,
    canonical,
    members,
    missingCanonical: !canonical,
    missingMemberIds,
    canonicalRoles,
    memberRoles,
    roleActions,
    labelMap,
    peopleUpdates,
  };
}

async function planPeopleLabelRewrite(decision) {
  const labelMap = {
    ...(decision.labelReplacements || {}),
  };
  const labels = Object.keys(labelMap);
  const people = await loadPeopleForLabels(labels);
  const peopleUpdates = people
    .map((person) => {
      const nextOrganization = dedupe((person.organization || []).map((value) => labelMap[value] || value));
      return {
        id: person.id,
        name: person.name,
        before: person.organization || [],
        after: nextOrganization,
        changed: JSON.stringify(person.organization || []) !== JSON.stringify(nextOrganization),
      };
    })
    .filter((row) => row.changed);

  return {
    decision,
    canonical: null,
    members: [],
    roleActions: [],
    labelMap,
    peopleUpdates,
  };
}

async function applyMerge(plan) {
  const queries = [];
  for (const action of plan.roleActions) {
    if (action.action === 'delete_duplicate_role') {
      queries.push((txn) => txn`DELETE FROM "PersonRole" WHERE id = ${action.role.id}`);
    } else {
      queries.push((txn) => txn`
        UPDATE "PersonRole"
        SET "organizationId" = ${plan.canonical.id}
        WHERE id = ${action.role.id}
      `);
    }
  }
  for (const update of plan.peopleUpdates) {
    queries.push((txn) => txn`
      UPDATE "People"
      SET organization = ${update.after}
      WHERE id = ${update.id}
    `);
  }
  if (plan.decision.canonicalUpdates) {
    const updates = plan.decision.canonicalUpdates;
    queries.push((txn) => txn`
      UPDATE "Organization"
      SET
        name = COALESCE(${updates.name ?? null}, name),
        "nameZh" = COALESCE(${updates.nameZh ?? null}, "nameZh"),
        type = COALESCE(${updates.type ?? null}, type),
        "wikidataQid" = COALESCE(${updates.wikidataQid ?? null}, "wikidataQid")
      WHERE id = ${plan.canonical.id}
    `);
  }
  if (plan.members.length) {
    queries.push((txn) => txn`
      DELETE FROM "Organization"
      WHERE id = ANY(${plan.members.map((row) => row.id)}::text[])
    `);
  }
  if (queries.length) {
    await sql.transaction((txn) => queries.map((query) => query(txn)));
  }
}

function countPlans(plans, fn) {
  return plans.reduce((sum, plan) => sum + fn(plan), 0);
}

function renderReport(payload) {
  const lines = [
    '# Organization Review Apply',
    '',
    `Generated at: ${payload.generatedAt}`,
    `Mode: ${payload.summary.mode}`,
    `Input: ${payload.summary.input}`,
    `Archive: ${payload.summary.archive}`,
    '',
    '## Counts',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| decisions | ${payload.summary.decisions} |`,
    `| merge decisions | ${payload.summary.mergeDecisions} |`,
    `| label rewrite decisions | ${payload.summary.labelRewriteDecisions || 0} |`,
    `| keep decisions | ${payload.summary.keepDecisions} |`,
    `| member organizations ${payload.summary.mode === 'execute' ? 'deleted' : 'to delete'} | ${payload.summary.memberOrganizations} |`,
    `| PersonRole rows ${payload.summary.mode === 'execute' ? 'repointed' : 'to repoint'} | ${payload.summary.rolesRepointed} |`,
    `| duplicate PersonRole rows ${payload.summary.mode === 'execute' ? 'deleted' : 'to delete'} | ${payload.summary.duplicateRolesDeleted} |`,
    `| People.organization rows ${payload.summary.mode === 'execute' ? 'updated' : 'to update'} | ${payload.summary.peopleUpdated} |`,
    '',
    '## Decisions',
    '',
    '| Action | Canonical / Cluster | Members | Role changes | People labels | Reason |',
    '| --- | --- | ---: | ---: | ---: | --- |',
    ...payload.plans.map((plan) => [
      plan.decision.action,
      plan.canonical?.name || plan.decision.clusterKey || plan.decision.canonicalOrgId || '',
      plan.members?.length || 0,
      plan.roleActions?.length || 0,
      plan.peopleUpdates?.length || 0,
      compact(plan.decision.reason, 220),
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const decisions = Array.isArray(payload.decisions) ? payload.decisions : [];
  const mergeDecisions = decisions.filter((row) => row.action === 'merge_organization');
  const labelRewriteDecisions = decisions.filter((row) => row.action === 'rewrite_people_organization_labels');
  const keepDecisions = decisions.filter((row) => row.action === 'keep_separate');
  const plans = [];
  const skipped = [];

  for (const decision of mergeDecisions) {
    const plan = await planMerge(decision);
    if (plan.missingCanonical || plan.missingMemberIds.length) {
      skipped.push({
        decision,
        missingCanonical: plan.missingCanonical,
        missingMemberIds: plan.missingMemberIds,
      });
      plans.push(plan);
      continue;
    }
    plans.push(plan);
    if (EXECUTE) await applyMerge(plan);
  }

  for (const decision of labelRewriteDecisions) {
    const plan = await planPeopleLabelRewrite(decision);
    plans.push(plan);
    if (EXECUTE) await applyMerge(plan);
  }

  for (const decision of keepDecisions) {
    plans.push({ decision, canonical: null, members: [], roleActions: [], peopleUpdates: [] });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    input: INPUT,
    archive: ARCHIVE,
    decisions: decisions.length,
    mergeDecisions: mergeDecisions.length,
    labelRewriteDecisions: labelRewriteDecisions.length,
    keepDecisions: keepDecisions.length,
    skipped: skipped.length,
    memberOrganizations: countPlans(plans, (plan) => plan.members?.length || 0),
    rolesRepointed: countPlans(plans, (plan) => (plan.roleActions || []).filter((row) => row.action === 'repoint_role').length),
    duplicateRolesDeleted: countPlans(plans, (plan) => (plan.roleActions || []).filter((row) => row.action === 'delete_duplicate_role').length),
    peopleUpdated: countPlans(plans, (plan) => plan.peopleUpdates?.length || 0),
  };

  const archivePayload = { generatedAt: summary.generatedAt, summary, skipped, plans };
  fs.mkdirSync(path.dirname(ARCHIVE), { recursive: true });
  fs.writeFileSync(ARCHIVE, `${JSON.stringify(archivePayload, null, 2)}\n`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify({ generatedAt: summary.generatedAt, summary, skipped }, null, 2)}\n`);
  renderReport({ generatedAt: summary.generatedAt, summary, plans });

  console.log(JSON.stringify({ out: OUT, archive: ARCHIVE, reportOut: REPORT_OUT, summary, skipped }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
