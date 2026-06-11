/**
 * Apply additive source-depth repairs for candidate people.
 *
 * Default is dry-run. Use --execute to mutate RawPoolItem, QAAuditLog, Card,
 * People.avatarUrl, and People.completeness. The script only touches people
 * named in the input file.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/candidate_source_depth_repairs.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/candidate_source_depth_repairs_apply_log.json';
const EXECUTE = process.argv.includes('--execute');
const ALLOW_AVATAR_OVERWRITE = process.argv.includes('--allow-avatar-overwrite');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function md5(value) {
  return crypto.createHash('md5').update(value).digest('hex');
}

function compact(value, max = 8000) {
  const text = String(value || '').replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}...`;
}

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function loadPerson(name) {
  const rows = await sql`
    SELECT id, name, status, completeness, "avatarUrl"
    FROM "People"
    WHERE name = ${name} OR aliases && ${[name]}::text[]
    ORDER BY CASE WHEN status = ${'candidate'} THEN 0 ELSE 1 END, name ASC
    LIMIT 1
  `;
  return rows[0] || null;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent': 'AI-Person-Agent/1.0 candidate-source-depth-repair',
      Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`fetch ${source.url} failed status=${response.status}`);
  }

  const html = await response.text();
  const text = stripHtml(html);
  const missingTerms = (source.requiredTerms || []).filter((term) => {
    return !text.toLowerCase().includes(String(term).toLowerCase());
  });
  if (missingTerms.length > 0) {
    throw new Error(`required terms missing for ${source.url}: ${missingTerms.join(', ')}`);
  }

  const title = compact(
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || source.title || source.url,
    300,
  );

  return {
    title,
    text: compact([
      source.reason ? `Repair reason: ${source.reason}` : '',
      text,
    ].filter(Boolean).join('\n\n'), 10000),
    contentType: response.headers.get('content-type') || null,
  };
}

async function deleteSource(person, decision) {
  const urlHash = sha256(`${person.id}:${decision.url}`);
  const rawRows = await sql`
    SELECT id, url, title
    FROM "RawPoolItem"
    WHERE "personId" = ${person.id}
      AND ("urlHash" = ${urlHash} OR url = ${decision.url})
  `;
  const auditRows = await sql`
    SELECT id
    FROM "QAAuditLog"
    WHERE "personId" = ${person.id}
      AND ("urlHash" = ${urlHash} OR url = ${decision.url})
  `;

  if (EXECUTE) {
    await sql`
      DELETE FROM "QAAuditLog"
      WHERE "personId" = ${person.id}
        AND ("urlHash" = ${urlHash} OR url = ${decision.url})
    `;
    await sql`
      DELETE FROM "RawPoolItem"
      WHERE "personId" = ${person.id}
        AND ("urlHash" = ${urlHash} OR url = ${decision.url})
    `;
  }

  return {
    person: person.name,
    url: decision.url,
    status: rawRows.length || auditRows.length ? (EXECUTE ? 'deleted' : 'would_delete') : 'not_found',
    rawRows: rawRows.length,
    auditRows: auditRows.length,
    reason: decision.reason || null,
  };
}

async function upsertSource(person, source) {
  const fetched = await fetchSource(source);
  const urlHash = sha256(`${person.id}:${source.url}`);
  const contentHash = sha256(fetched.text);
  const existingRaw = await sql`
    SELECT id
    FROM "RawPoolItem"
    WHERE "urlHash" = ${urlHash}
    LIMIT 1
  `;
  const existingAudit = await sql`
    SELECT id
    FROM "QAAuditLog"
    WHERE "personId" = ${person.id}
      AND "urlHash" = ${urlHash}
      AND verdict = ${'keep'}
    LIMIT 1
  `;

  if (EXECUTE) {
    await sql`
      INSERT INTO "RawPoolItem" (
        id, "personId", "sourceType", url, "urlHash", "contentHash", title, text,
        "publishedAt", metadata, "fetchStatus", "fetchedAt", processed
      )
      VALUES (
        ${crypto.randomUUID()}, ${person.id}, ${source.sourceType || 'official'}, ${source.url}, ${urlHash}, ${contentHash},
        ${source.title || fetched.title}, ${fetched.text}, ${null},
        ${JSON.stringify({
          seed: 'candidate_live_fetch',
          appliedFrom: 'candidate_source_depth_repair',
          fetchedLive: true,
          contentType: fetched.contentType,
          requiredTerms: source.requiredTerms || [],
          repairReason: source.reason || null,
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

    if (existingAudit.length === 0) {
      await sql`
        INSERT INTO "QAAuditLog" (
          id, "personId", url, "urlHash", "sourceType", stage, verdict,
          "aboutPerson", "aiRelevant", quality, reason
        )
        VALUES (
          ${crypto.randomUUID()}, ${person.id}, ${source.url}, ${urlHash}, ${source.sourceType || 'official'}, ${'L1'}, ${'keep'},
          ${0.9}, ${0.88}, ${0.78}, ${source.reason || 'candidate source-depth live repair'}
        )
      `;
    }

    await sql`
      UPDATE "People"
      SET completeness = GREATEST(COALESCE(completeness, 0), ${45}),
          "updatedAt" = NOW()
      WHERE id = ${person.id}
    `;
  }

  return {
    person: person.name,
    url: source.url,
    status: existingRaw.length ? (EXECUTE ? 'updated' : 'would_update') : (EXECUTE ? 'inserted' : 'would_insert'),
    auditStatus: existingAudit.length ? 'already_keep' : (EXECUTE ? 'inserted_keep' : 'would_insert_keep'),
    textLength: fetched.text.length,
    title: source.title || fetched.title,
  };
}

async function insertCard(person, card) {
  const existing = await sql`
    SELECT id
    FROM "Card"
    WHERE "personId" = ${person.id}
      AND "isActive" = true
      AND lower(title) = lower(${card.title})
    LIMIT 1
  `;

  if (existing.length === 0 && EXECUTE) {
    await sql`
      INSERT INTO "Card" (
        id, "personId", type, title, content, tags, "sourceUrl", importance,
        "generationId", "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        ${crypto.randomUUID()}, ${person.id}, ${card.type || 'fact'}, ${card.title}, ${card.content},
        ${card.tags || []}, ${card.sourceUrl || null}, ${card.importance || 3},
        ${'candidate-source-depth-repair:2026-06-11'}, ${true}, NOW(), NOW()
      )
    `;
  }

  return {
    person: person.name,
    title: card.title,
    status: existing.length ? 'already_exists' : (EXECUTE ? 'inserted' : 'would_insert'),
    sourceUrl: card.sourceUrl || null,
  };
}

async function applyAvatar(person, decision) {
  const shouldOverwrite = ALLOW_AVATAR_OVERWRITE || decision.overwriteExisting;
  if (person.avatarUrl && !shouldOverwrite) {
    return {
      person: person.name,
      status: 'skipped_existing_avatar',
      previousAvatarUrl: person.avatarUrl,
      nextAvatarUrl: null,
      evidenceUrl: decision.evidenceUrl || null,
    };
  }

  const response = await fetch(decision.imageUrl, {
    headers: { 'User-Agent': 'AI-Person-Agent/1.0 candidate-avatar-repair' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`avatar fetch failed ${decision.imageUrl} status=${response.status}`);
  }

  const input = Buffer.from(await response.arrayBuffer());
  const base = `${slug(person.name)}-${md5(person.id).slice(0, 8)}`;
  const avatarDir = path.join(process.cwd(), 'public', 'avatars');
  const outputPath = path.join(avatarDir, `${base}.webp`);
  const publicPath = `/avatars/${base}.webp`;

  if (EXECUTE) {
    fs.mkdirSync(avatarDir, { recursive: true });
    await sharp(input)
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .webp({ quality: 84, effort: 6 })
      .toFile(outputPath);

    await sql`
      UPDATE "People"
      SET "avatarUrl" = ${publicPath},
          "updatedAt" = NOW()
      WHERE id = ${person.id}
    `;
  }

  return {
    person: person.name,
    status: EXECUTE ? 'updated' : 'would_update',
    previousAvatarUrl: person.avatarUrl,
    nextAvatarUrl: publicPath,
    inputBytes: input.length,
    outputPath: EXECUTE ? outputPath : null,
    evidenceUrl: decision.evidenceUrl || null,
    evidenceNote: decision.evidenceNote || null,
  };
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), INPUT), 'utf8'));
  const peopleByName = new Map();
  const personFor = async (name) => {
    if (!peopleByName.has(name)) peopleByName.set(name, await loadPerson(name));
    return peopleByName.get(name);
  };

  const report = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    input: INPUT,
    summary: {
      missingPeople: 0,
      sourceDeletes: 0,
      sources: 0,
      cards: 0,
      avatars: 0,
      errors: 0,
    },
    missingPeople: [],
    deletedSources: [],
    sources: [],
    cards: [],
    avatars: [],
    errors: [],
  };

  console.log(`Candidate source-depth repair mode: ${EXECUTE ? 'execute' : 'dry-run'}`);

  for (const decision of payload.deleteSources || []) {
    const person = await personFor(decision.person);
    if (!person) {
      report.summary.missingPeople += 1;
      report.missingPeople.push(decision.person);
      continue;
    }
    try {
      const result = await deleteSource(person, decision);
      report.deletedSources.push(result);
      if (result.status === 'deleted' || result.status === 'would_delete') report.summary.sourceDeletes += 1;
      console.log(`${result.status} source ${person.name}: ${decision.url}`);
    } catch (error) {
      report.summary.errors += 1;
      report.errors.push({ kind: 'deleteSource', person: decision.person, url: decision.url, error: error.message });
      console.error(`delete source failed ${decision.person}: ${error.message}`);
    }
  }

  for (const source of payload.sources || []) {
    const person = await personFor(source.person);
    if (!person) {
      report.summary.missingPeople += 1;
      report.missingPeople.push(source.person);
      continue;
    }
    try {
      const result = await upsertSource(person, source);
      report.sources.push(result);
      report.summary.sources += 1;
      console.log(`${result.status} source ${person.name}: ${source.url}`);
    } catch (error) {
      report.summary.errors += 1;
      report.errors.push({ kind: 'source', person: source.person, url: source.url, error: error.message });
      console.error(`source failed ${source.person}: ${error.message}`);
    }
  }

  for (const card of payload.cards || []) {
    const person = await personFor(card.person);
    if (!person) {
      report.summary.missingPeople += 1;
      report.missingPeople.push(card.person);
      continue;
    }
    try {
      const result = await insertCard(person, card);
      report.cards.push(result);
      if (result.status === 'inserted' || result.status === 'would_insert') report.summary.cards += 1;
      console.log(`${result.status} card ${person.name}: ${card.title}`);
    } catch (error) {
      report.summary.errors += 1;
      report.errors.push({ kind: 'card', person: card.person, title: card.title, error: error.message });
      console.error(`card failed ${card.person}: ${error.message}`);
    }
  }

  for (const avatar of payload.avatars || []) {
    const person = await personFor(avatar.person);
    if (!person) {
      report.summary.missingPeople += 1;
      report.missingPeople.push(avatar.person);
      continue;
    }
    try {
      const result = await applyAvatar(person, avatar);
      report.avatars.push(result);
      if (result.status === 'updated' || result.status === 'would_update') report.summary.avatars += 1;
      console.log(`${result.status} avatar ${person.name}: ${result.nextAvatarUrl || result.previousAvatarUrl || '<none>'}`);
    } catch (error) {
      report.summary.errors += 1;
      report.errors.push({ kind: 'avatar', person: avatar.person, imageUrl: avatar.imageUrl, error: error.message });
      console.error(`avatar failed ${avatar.person}: ${error.message}`);
    }
  }

  report.missingPeople = [...new Set(report.missingPeople)];
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Candidate source-depth repair report written: ${OUT}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
