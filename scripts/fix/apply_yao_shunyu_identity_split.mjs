/**
 * Split the two Shunyu Yao identities and repair the existing mixed cards.
 *
 * Default is dry-run. Use --execute to mutate People, PersonRole, RawPoolItem,
 * QAAuditLog, Card, and local avatar files for the named people only.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/yao_shunyu_identity_split_repairs.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/yao_shunyu_identity_split_apply_log.json';
const EXECUTE = process.argv.includes('--execute');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function toDate(value) {
  return value ? new Date(value) : null;
}

function toJson(value) {
  return JSON.stringify(value || null);
}

function normalizeUrl(url) {
  return String(url || '').replace(/\/index\.html$/, '/');
}

function compact(value, max = 10000) {
  const text = String(value || '').replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}...`;
}

async function findPerson(profile) {
  const terms = unique([profile.name, ...(profile.matchNames || []), ...(profile.aliases || [])]);
  const exactRows = await sql`
    SELECT *
    FROM "People"
    WHERE name = ${profile.name}
       OR qid = ${profile.qid}
    ORDER BY
      CASE WHEN name = ${profile.name} THEN 0 ELSE 1 END,
      CASE WHEN qid = ${profile.qid} THEN 0 ELSE 1 END,
      "influenceScore" DESC,
      name ASC
    LIMIT 1
  `;
  if (exactRows[0]) return exactRows[0];
  if (profile.allowAliasMatch === false) return null;

  const rows = await sql`
    SELECT *
    FROM "People"
    WHERE name = ANY(${terms}::text[])
       OR aliases && ${terms}::text[]
    ORDER BY
      CASE WHEN name = ${profile.name} THEN 0 ELSE 1 END,
      "influenceScore" DESC,
      name ASC
    LIMIT 1
  `;
  return rows[0] || null;
}

async function upsertPerson(profile) {
  const existing = await findPerson(profile);
  const avatarUrl = profile.avatar ? `/avatars/${profile.avatar.filename}` : existing?.avatarUrl || null;
  const next = {
    qid: profile.forceQid ? profile.qid : (existing?.qid || profile.qid),
    name: profile.name,
    aliases: unique([...(existing?.aliases || []), ...(profile.aliases || [])]),
    description: profile.description,
    whyImportant: profile.whyImportant,
    avatarUrl,
    country: profile.country || existing?.country || null,
    occupation: unique([...(existing?.occupation || []), ...(profile.occupation || [])]),
    organization: unique([...(profile.organization || []), ...(existing?.organization || [])]),
    officialLinks: profile.replaceOfficialLinks
      ? asArray(profile.officialLinks)
      : mergeLinks(existing?.officialLinks, profile.officialLinks),
    sourceWhitelist: profile.replaceSourceWhitelist
      ? unique(profile.sourceWhitelist || [])
      : unique([...(existing?.sourceWhitelist || []), ...(profile.sourceWhitelist || [])]),
    status: profile.status || existing?.status || 'active',
    completeness: Math.max(Number(existing?.completeness || 0), 70),
    topics: unique([...(profile.topics || []), ...(existing?.topics || [])]),
    highlights: profile.replaceHighlights ? asArray(profile.highlights) : (existing?.highlights ?? null),
    roleCategory: profile.roleCategory || existing?.roleCategory || null,
    influenceScore: Math.max(Number(existing?.influenceScore || 0), Number(profile.influenceScoreFloor || 0)),
    currentTitle: profile.currentTitle || existing?.currentTitle || null,
    products: profile.replaceProducts
      ? asArray(profile.products)
      : mergeNamedObjects(existing?.products, profile.products),
    education: profile.replaceEducation
      ? asArray(profile.education)
      : mergeNamedObjects(existing?.education, profile.education, 'school'),
    lastFetchedAt: {
      ...(asObject(existing?.lastFetchedAt) || {}),
      manual_identity_split: new Date().toISOString(),
    },
  };

  if (!existing) {
    if (EXECUTE) {
      await sql`
        INSERT INTO "People" (
          id, qid, name, aliases, description, "whyImportant", "avatarUrl", country,
          occupation, organization, "officialLinks", "sourceWhitelist", status, completeness,
          topics, highlights, "roleCategory", "influenceScore", "currentTitle", products, education,
          "lastFetchedAt", "createdAt", "updatedAt"
        )
        VALUES (
          ${crypto.randomUUID()}, ${next.qid}, ${next.name}, ${next.aliases}, ${next.description},
          ${next.whyImportant}, ${next.avatarUrl}, ${next.country}, ${next.occupation},
          ${next.organization}, ${toJson(next.officialLinks)}::jsonb, ${next.sourceWhitelist},
          ${next.status}, ${next.completeness}, ${next.topics}, ${toJson(next.highlights)}::jsonb,
          ${next.roleCategory}, ${next.influenceScore}, ${next.currentTitle}, ${toJson(next.products)}::jsonb,
          ${toJson(next.education)}::jsonb, ${toJson(next.lastFetchedAt)}::jsonb, NOW(), NOW()
        )
      `;
    }
    const created = await findPerson(profile);
    return { action: EXECUTE ? 'insert_person' : 'would_insert_person', person: created || { ...next, id: null } };
  }

  if (EXECUTE) {
    await sql`
      UPDATE "People"
      SET
        qid = ${next.qid},
        name = ${next.name},
        aliases = ${next.aliases},
        description = ${next.description},
        "whyImportant" = ${next.whyImportant},
        "avatarUrl" = ${next.avatarUrl},
        country = ${next.country},
        occupation = ${next.occupation},
        organization = ${next.organization},
        "officialLinks" = ${toJson(next.officialLinks)}::jsonb,
        "sourceWhitelist" = ${next.sourceWhitelist},
        status = ${next.status},
        completeness = ${next.completeness},
        topics = ${next.topics},
        highlights = ${toJson(next.highlights)}::jsonb,
        "roleCategory" = ${next.roleCategory},
        "influenceScore" = ${next.influenceScore},
        "currentTitle" = ${next.currentTitle},
        products = ${toJson(next.products)}::jsonb,
        education = ${toJson(next.education)}::jsonb,
        "lastFetchedAt" = ${toJson(next.lastFetchedAt)}::jsonb,
        "updatedAt" = NOW()
      WHERE id = ${existing.id}
    `;
  }
  return { action: EXECUTE ? 'update_person' : 'would_update_person', person: { ...existing, ...next } };
}

function asObject(value) {
  if (!value || Array.isArray(value)) return {};
  return typeof value === 'object' ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function mergeLinks(existing, incoming) {
  const merged = [];
  const seen = new Set();
  for (const link of [...asArray(existing), ...asArray(incoming)]) {
    const key = normalizeUrl(link?.url || link?.title || JSON.stringify(link));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(link);
  }
  return merged;
}

function mergeNamedObjects(existing, incoming, nameKey = 'name') {
  const merged = [];
  const seen = new Set();
  for (const item of [...asArray(existing), ...asArray(incoming)]) {
    const key = String(item?.[nameKey] || item?.name || item?.title || JSON.stringify(item)).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

async function ensureAvatar(profile) {
  if (!profile.avatar) return { status: 'no_avatar', profile: profile.name };
  const targets = [
    path.join(process.cwd(), 'public/avatars', profile.avatar.filename),
    path.join(process.cwd(), 'proxy/public/avatars', profile.avatar.filename),
  ];
  const exists = targets.every((target) => fs.existsSync(target));
  if (exists) return { status: 'already_exists', avatar: profile.avatar.filename };

  if (!EXECUTE) return { status: 'would_write_avatar', avatar: profile.avatar.filename };

  const response = await fetch(profile.avatar.sourceUrl, {
    headers: { 'User-Agent': 'AI-Person-Agent/1.0 avatar-localizer' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`avatar fetch failed ${response.status} ${profile.avatar.sourceUrl}`);
  const input = Buffer.from(await response.arrayBuffer());
  const output = await sharp(input).resize(256, 256, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
  for (const target of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, output);
  }
  return { status: 'wrote_avatar', avatar: profile.avatar.filename, bytes: output.length };
}

async function ensureOrg(role) {
  const rows = await sql`
    SELECT id, name, "nameZh", type
    FROM "Organization"
    WHERE name = ${role.organizationName}
       OR "nameZh" = ${role.organizationName}
       OR name = ${role.organizationNameZh || role.organizationName}
       OR "nameZh" = ${role.organizationNameZh || role.organizationName}
    ORDER BY
      CASE WHEN name = ${role.organizationName} THEN 0 ELSE 1 END,
      name ASC
    LIMIT 1
  `;
  if (rows[0]) return { org: rows[0], action: 'existing_org' };

  const org = {
    id: crypto.randomUUID(),
    name: role.organizationName,
    nameZh: role.organizationNameZh || role.organizationName,
    type: role.organizationType || 'company',
  };
  if (EXECUTE) {
    await sql`
      INSERT INTO "Organization" (id, name, "nameZh", type)
      VALUES (${org.id}, ${org.name}, ${org.nameZh}, ${org.type})
    `;
  }
  return { org, action: EXECUTE ? 'insert_org' : 'would_insert_org' };
}

async function upsertRole(person, role) {
  const { org, action: orgAction } = await ensureOrg(role);
  const roleRows = await sql`
    SELECT id, role, "startDate", "endDate"
    FROM "PersonRole"
    WHERE "personId" = ${person.id}
      AND "organizationId" = ${org.id}
      AND (
        role = ${role.role}
        OR role = ${role.roleZh || role.role}
        OR "roleZh" = ${role.roleZh || role.role}
      )
    ORDER BY "endDate" NULLS FIRST, "startDate" DESC NULLS LAST
    LIMIT 1
  `;
  const fallbackRoleRows = roleRows.length > 0 ? roleRows : await sql`
    SELECT id, role, "startDate", "endDate"
    FROM "PersonRole"
    WHERE "personId" = ${person.id}
      AND "organizationId" = ${org.id}
    ORDER BY "endDate" NULLS FIRST, "startDate" DESC NULLS LAST
    LIMIT 1
  `;

  if (fallbackRoleRows[0]) {
    if (EXECUTE) {
      await sql`
        UPDATE "PersonRole"
        SET role = ${role.role},
            "roleZh" = ${role.roleZh || null},
            "startDate" = ${toDate(role.startDate)},
            "endDate" = ${toDate(role.endDate)},
            source = ${role.source || 'manual_identity_split'},
            confidence = ${Number(role.confidence ?? 0.8)}
        WHERE id = ${fallbackRoleRows[0].id}
      `;
    }
    return { action: EXECUTE ? 'update_role' : 'would_update_role', orgAction, role: role.role, org: org.name };
  }

  if (EXECUTE) {
    await sql`
      INSERT INTO "PersonRole" (
        id, "personId", "organizationId", role, "roleZh", "startDate", "endDate", source, confidence
      )
      VALUES (
        ${crypto.randomUUID()}, ${person.id}, ${org.id}, ${role.role}, ${role.roleZh || null},
        ${toDate(role.startDate)}, ${toDate(role.endDate)}, ${role.source || 'manual_identity_split'},
        ${Number(role.confidence ?? 0.8)}
      )
    `;
  }
  return { action: EXECUTE ? 'insert_role' : 'would_insert_role', orgAction, role: role.role, org: org.name };
}

async function upsertSource(person, source) {
  const urlHash = sha256(`${person.id}:${source.url}`);
  const text = compact(source.text);
  const existingRaw = await sql`
    SELECT id FROM "RawPoolItem"
    WHERE "personId" = ${person.id} AND ("urlHash" = ${urlHash} OR url = ${source.url})
    LIMIT 1
  `;
  const contentHash = sha256(text);

  if (EXECUTE) {
    await sql`
      INSERT INTO "RawPoolItem" (
        id, "personId", "sourceType", url, "urlHash", "contentHash", title, text,
        metadata, "fetchStatus", "fetchedAt", processed
      )
      VALUES (
        ${crypto.randomUUID()}, ${person.id}, ${source.sourceType || 'manual'}, ${source.url},
        ${urlHash}, ${contentHash}, ${source.title}, ${text},
        ${toJson({
          seed: 'yao_shunyu_identity_split',
          reason: source.reason || null,
          capturedAt: new Date().toISOString(),
        })}::jsonb,
        ${'success'}, NOW(), ${false}
      )
      ON CONFLICT ("urlHash") DO UPDATE
      SET title = EXCLUDED.title,
          text = EXCLUDED.text,
          metadata = EXCLUDED.metadata,
          "contentHash" = EXCLUDED."contentHash",
          "fetchedAt" = EXCLUDED."fetchedAt",
          "fetchStatus" = EXCLUDED."fetchStatus"
    `;

    await sql`
      INSERT INTO "QAAuditLog" (
        id, "personId", url, "urlHash", "sourceType", stage, verdict,
        "aboutPerson", "aiRelevant", quality, reason
      )
      VALUES (
        ${crypto.randomUUID()}, ${person.id}, ${source.url}, ${urlHash},
        ${source.sourceType || 'manual'}, ${'L1'}, ${'keep'}, ${0.9}, ${0.86}, ${0.8},
        ${source.reason || 'identity split supporting source'}
      )
    `;
  }

  return {
    action: existingRaw.length ? (EXECUTE ? 'update_source' : 'would_update_source') : (EXECUTE ? 'insert_source' : 'would_insert_source'),
    url: source.url,
  };
}

async function upsertCard(person, card) {
  const rows = await sql`
    SELECT id FROM "Card"
    WHERE "personId" = ${person.id}
      AND lower(title) = lower(${card.title})
    LIMIT 1
  `;

  if (rows[0]) {
    if (EXECUTE) {
      await sql`
        UPDATE "Card"
        SET type = ${card.type || 'fact'},
            content = ${card.content},
            tags = ${card.tags || []},
            "sourceUrl" = ${card.sourceUrl || null},
            importance = ${Number(card.importance || 5)},
            "isActive" = true,
            "archivedAt" = NULL,
            "updatedAt" = NOW()
        WHERE id = ${rows[0].id}
      `;
    }
    return { action: EXECUTE ? 'update_card' : 'would_update_card', title: card.title };
  }

  if (EXECUTE) {
    await sql`
      INSERT INTO "Card" (
        id, "personId", type, title, content, tags, "sourceUrl", importance,
        "generationId", "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        ${crypto.randomUUID()}, ${person.id}, ${card.type || 'fact'}, ${card.title}, ${card.content},
        ${card.tags || []}, ${card.sourceUrl || null}, ${Number(card.importance || 5)},
        ${'yao-shunyu-identity-split:2026-06-11'}, ${true}, NOW(), NOW()
      )
    `;
  }
  return { action: EXECUTE ? 'insert_card' : 'would_insert_card', title: card.title };
}

async function archiveWrongCards(decision) {
  const rows = await sql`
    SELECT c.id, c.title, c."sourceUrl"
    FROM "Card" c
    JOIN "People" p ON p.id = c."personId"
    WHERE p.name = ${decision.personName}
      AND c."isActive" = true
      AND c."sourceUrl" = ANY(${decision.sourceUrls}::text[])
  `;
  if (EXECUTE && rows.length > 0) {
    await sql`
      UPDATE "Card"
      SET "isActive" = false,
          "archivedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE id = ANY(${rows.map((row) => row.id)}::text[])
    `;
  }
  return rows.map((row) => ({
    action: EXECUTE ? 'archive_card' : 'would_archive_card',
    title: row.title,
    sourceUrl: row.sourceUrl,
  }));
}

async function fixExistingCardText(decisions) {
  const log = [];
  for (const decision of decisions || []) {
    const rows = await sql`
      SELECT c.id, c.title, c.content
      FROM "Card" c
      JOIN "People" p ON p.id = c."personId"
      WHERE p.name = ${decision.personName}
        AND c."sourceUrl" = ${decision.sourceUrl}
        AND c."isActive" = true
    `;
    for (const row of rows) {
      const nextContent = String(row.content || '').replaceAll(decision.replace.from, decision.replace.to);
      if (EXECUTE && nextContent !== row.content) {
        await sql`
          UPDATE "Card"
          SET content = ${nextContent}, "updatedAt" = NOW()
          WHERE id = ${row.id}
        `;
      }
      log.push({
        action: nextContent === row.content ? 'unchanged_card_text' : (EXECUTE ? 'update_card_text' : 'would_update_card_text'),
        title: row.title,
      });
    }
  }
  return log;
}

async function deleteRawSources(decisions) {
  const log = [];
  for (const decision of decisions || []) {
    const urls = unique(decision.urls || []);
    if (urls.length === 0) continue;
    const rows = await sql`
      SELECT r.id, r."personId", p.name AS person, r.url, r."urlHash", r."sourceType", r.title
      FROM "RawPoolItem" r
      JOIN "People" p ON p.id = r."personId"
      WHERE p.name = ${decision.personName}
        AND r.url = ANY(${urls}::text[])
      ORDER BY r.url
    `;
    const foundUrls = new Set(rows.map((row) => row.url));
    for (const url of urls) {
      if (!foundUrls.has(url)) {
        log.push({
          action: 'missing_raw_source',
          person: decision.personName,
          url,
          reason: decision.reason || null,
        });
      }
    }
    if (EXECUTE && rows.length > 0) {
      for (const row of rows) {
        await sql`
          INSERT INTO "QAAuditLog" (
            id, "personId", url, "urlHash", "sourceType", stage, verdict,
            "aboutPerson", "aiRelevant", quality, reason
          )
          VALUES (
            ${crypto.randomUUID()}, ${row.personId}, ${row.url}, ${row.urlHash},
            ${row.sourceType}, ${'yao_shunyu_identity_split'}, ${'wrong_person'},
            ${0.02}, ${0.05}, ${0.05},
            ${decision.reason || 'wrong Shunyu Yao identity attached to this person'}
          )
        `;
      }
      await sql`
        DELETE FROM "RawPoolItem"
        WHERE id = ANY(${rows.map((row) => row.id)}::text[])
      `;
    }
    for (const row of rows) {
      log.push({
        action: EXECUTE ? 'delete_raw_source' : 'would_delete_raw_source',
        person: row.person,
        title: row.title,
        url: row.url,
        reason: decision.reason || null,
      });
    }
  }
  return log;
}

async function repairOrganizationTypes(repairs) {
  const log = [];
  for (const repair of repairs || []) {
    const rows = await sql`
      SELECT id, name, "nameZh", type
      FROM "Organization"
      WHERE name = ${repair.name}
         OR "nameZh" = ${repair.name}
      ORDER BY CASE WHEN name = ${repair.name} THEN 0 ELSE 1 END, name ASC
    `;
    if (rows.length === 0) {
      log.push({ action: 'missing_org_type_target', name: repair.name, nextType: repair.type });
      continue;
    }
    for (const row of rows) {
      const changed = row.type !== repair.type;
      if (EXECUTE && changed) {
        await sql`
          UPDATE "Organization"
          SET type = ${repair.type}
          WHERE id = ${row.id}
        `;
      }
      log.push({
        action: changed ? (EXECUTE ? 'update_org_type' : 'would_update_org_type') : 'already_applied_org_type',
        name: row.name,
        nameZh: row.nameZh,
        previousType: row.type,
        nextType: repair.type,
      });
    }
  }
  return log;
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), INPUT), 'utf8'));
  const log = [];
  console.log(`Yao identity split mode: ${EXECUTE ? 'execute' : 'dry-run'}`);

  for (const profile of payload.people) {
    const avatarLog = await ensureAvatar(profile);
    log.push({ profile: profile.key, ...avatarLog });

    const personResult = await upsertPerson(profile);
    log.push({ profile: profile.key, action: personResult.action, person: personResult.person.name, personId: personResult.person.id });
    const person = personResult.person.id ? personResult.person : await findPerson(profile);
    if (!person?.id && !EXECUTE) {
      for (const role of profile.roles || []) log.push({ profile: profile.key, action: 'would_insert_role', role: role.role, org: role.organizationName });
      for (const source of profile.sources || []) log.push({ profile: profile.key, action: 'would_insert_source', url: source.url });
      for (const card of profile.cards || []) log.push({ profile: profile.key, action: 'would_insert_card', title: card.title });
      continue;
    }

    for (const role of profile.roles || []) {
      log.push({ profile: profile.key, ...(await upsertRole(person, role)) });
    }
    for (const source of profile.sources || []) {
      log.push({ profile: profile.key, ...(await upsertSource(person, source)) });
    }
    for (const card of profile.cards || []) {
      log.push({ profile: profile.key, ...(await upsertCard(person, card)) });
    }
  }

  if (payload.archiveCardsFrom) {
    log.push(...(await archiveWrongCards(payload.archiveCardsFrom)));
  }
  log.push(...(await fixExistingCardText(payload.fixExistingCards)));
  log.push(...(await deleteRawSources(payload.deleteRawSources)));
  log.push(...(await repairOrganizationTypes(payload.organizationTypeRepairs)));

  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    people: payload.people.length,
    insertPeople: log.filter((row) => row.action === 'insert_person').length,
    wouldInsertPeople: log.filter((row) => row.action === 'would_insert_person').length,
    updatePeople: log.filter((row) => row.action === 'update_person').length,
    wouldUpdatePeople: log.filter((row) => row.action === 'would_update_person').length,
    insertRoles: log.filter((row) => row.action === 'insert_role').length,
    wouldInsertRoles: log.filter((row) => row.action === 'would_insert_role').length,
    updateRoles: log.filter((row) => row.action === 'update_role').length,
    wouldUpdateRoles: log.filter((row) => row.action === 'would_update_role').length,
    insertedCards: log.filter((row) => row.action === 'insert_card').length,
    archivedCards: log.filter((row) => row.action === 'archive_card').length,
    deletedRawSources: log.filter((row) => row.action === 'delete_raw_source').length,
    updatedOrgTypes: log.filter((row) => row.action === 'update_org_type').length,
    wroteAvatars: log.filter((row) => row.status === 'wrote_avatar').length,
  };

  fs.writeFileSync(path.join(process.cwd(), OUT), `${JSON.stringify({ summary, log }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Log written: ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
