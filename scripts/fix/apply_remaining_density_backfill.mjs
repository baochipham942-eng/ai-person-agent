import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const inputPath = args.find(arg => arg.startsWith('--input='))?.slice('--input='.length)
  || 'docs/audit-2026-06/remaining_density_backfill_2026_06_13.json';
const outPath = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length) || null;

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaNeon(pool) });

function resolvePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(resolvePath(filePath), 'utf-8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

function rawHash(personId, url) {
  return sha256(`${personId}:${url}`);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function compact(values) {
  return values.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim());
}

function unique(values) {
  return [...new Set(compact(values))];
}

function mergeStrings(existing, incoming) {
  return unique([...asArray(existing), ...asArray(incoming)]);
}

function keyOfLink(link) {
  return `${link?.type || 'website'}:${link?.url || ''}`.toLowerCase();
}

function keyOfProduct(product) {
  return `${product?.name || ''}:${product?.url || ''}`.toLowerCase();
}

function mergeObjects(existing, incoming, keyOf) {
  const merged = [...asArray(existing)];
  const seen = new Set(merged.map(keyOf));
  for (const item of asArray(incoming)) {
    const key = keyOf(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

function sourceLabel(sourceType) {
  if (sourceType === 'github') return 'GitHub';
  if (sourceType === 'openalex') return 'OpenAlex';
  return 'Web';
}

async function findPerson(seed) {
  const aliases = unique([seed.name, ...(seed.aliases || [])]);
  return prisma.people.findFirst({
    where: {
      OR: [
        { name: { equals: seed.name, mode: 'insensitive' } },
        { aliases: { hasSome: aliases } },
      ],
    },
    orderBy: [{ influenceScore: 'desc' }, { name: 'asc' }],
  });
}

function personPatch(seed, existing) {
  const officialLinks = mergeObjects(existing?.officialLinks, seed.officialLinks, keyOfLink);
  const products = mergeObjects(existing?.products, seed.products, keyOfProduct);
  return {
    qid: existing?.qid || `DENSITY-${slug(seed.name).toUpperCase()}`,
    name: existing?.name || seed.name,
    aliases: mergeStrings(existing?.aliases, unique([seed.name, ...(seed.aliases || [])])),
    description: existing?.description || seed.description || null,
    whyImportant: existing?.whyImportant || seed.whyImportant || seed.description || null,
    avatarUrl: existing?.avatarUrl || seed.avatarUrl || null,
    occupation: mergeStrings(existing?.occupation, [seed.roleCategory || 'researcher']),
    organization: mergeStrings(existing?.organization, seed.organization),
    officialLinks,
    sourceWhitelist: mergeStrings(existing?.sourceWhitelist, seed.sourceWhitelist),
    status: seed.status || existing?.status || 'ready',
    completeness: Math.max(existing?.completeness || 0, seed.completeness || 45),
    topics: mergeStrings(existing?.topics, seed.topics),
    roleCategory: existing?.roleCategory || seed.roleCategory || null,
    currentTitle: existing?.currentTitle || seed.currentTitle || null,
    products,
  };
}

function personChanged(existing, patch) {
  if (!existing) return true;
  return existing.description !== patch.description
    || existing.whyImportant !== patch.whyImportant
    || existing.avatarUrl !== patch.avatarUrl
    || existing.status !== patch.status
    || existing.completeness !== patch.completeness
    || existing.roleCategory !== patch.roleCategory
    || existing.currentTitle !== patch.currentTitle
    || JSON.stringify(existing.aliases) !== JSON.stringify(patch.aliases)
    || JSON.stringify(existing.occupation) !== JSON.stringify(patch.occupation)
    || JSON.stringify(existing.organization) !== JSON.stringify(patch.organization)
    || JSON.stringify(existing.officialLinks ?? []) !== JSON.stringify(patch.officialLinks)
    || JSON.stringify(existing.sourceWhitelist) !== JSON.stringify(patch.sourceWhitelist)
    || JSON.stringify(existing.topics) !== JSON.stringify(patch.topics)
    || JSON.stringify(existing.products ?? []) !== JSON.stringify(patch.products);
}

async function upsertPerson(seed) {
  const existing = await findPerson(seed);
  const patch = personPatch(seed, existing);
  const changed = personChanged(existing, patch);
  const action = existing ? 'update' : 'create';

  if (changed) {
    console.log(`${EXECUTE ? action : `would ${action}`} person: ${patch.name}`);
    if (EXECUTE) {
      if (existing) {
        await prisma.people.update({
          where: { id: existing.id },
          data: {
            aliases: patch.aliases,
            description: patch.description,
            whyImportant: patch.whyImportant,
            avatarUrl: patch.avatarUrl,
            occupation: patch.occupation,
            organization: patch.organization,
            officialLinks: patch.officialLinks,
            sourceWhitelist: patch.sourceWhitelist,
            status: patch.status,
            completeness: patch.completeness,
            topics: patch.topics,
            roleCategory: patch.roleCategory,
            currentTitle: patch.currentTitle,
            products: patch.products,
          },
        });
      } else {
        await prisma.people.create({
          data: {
            qid: patch.qid,
            name: patch.name,
            aliases: patch.aliases,
            description: patch.description,
            whyImportant: patch.whyImportant,
            aiContributionScore: 5,
            avatarUrl: patch.avatarUrl,
            occupation: patch.occupation,
            organization: patch.organization,
            officialLinks: patch.officialLinks,
            sourceWhitelist: patch.sourceWhitelist,
            status: patch.status,
            completeness: patch.completeness,
            topics: patch.topics,
            roleCategory: patch.roleCategory,
            currentTitle: patch.currentTitle,
            products: patch.products,
          },
        });
      }
    }
  } else {
    console.log(`unchanged person: ${patch.name}`);
  }

  const person = EXECUTE
    ? await findPerson(seed)
    : { id: existing?.id || `dry-${slug(seed.name)}`, ...patch };

  return {
    person,
    result: {
      name: patch.name,
      action: changed ? action : 'unchanged',
      existed: Boolean(existing),
      changed,
    },
  };
}

function sourceText(item, kind) {
  return [
    item.text,
    kind === 'work' && item.entity ? `Target entity: ${item.entity.type}:${item.entity.label}.` : '',
    item.tags?.length ? `Tags: ${item.tags.join(', ')}.` : '',
    'This RawPoolItem is a curated remaining density backfill source and should remain reviewable through QAAuditLog.',
  ].filter(Boolean).join('\n');
}

function sourceMetadata(existing, item, generationId, kind) {
  const metadata = asObject(item.metadata);
  return {
    ...asObject(existing?.metadata),
    ...metadata,
    seed: 'remaining_density_backfill',
    generationId,
    contentDensityLane: kind === 'work' ? 'works' : 'profile',
    targetEntities: item.entity ? [item.entity] : [],
    tags: unique(item.tags || []),
    sourceLabel: sourceLabel(item.sourceType),
    evidenceNote: item.text || null,
    confidence: kind === 'work' ? 0.84 : 0.76,
  };
}

async function ensureRawAndAudit(person, item, generationId, kind) {
  const urlHash = rawHash(person.id, item.url);
  const existing = EXECUTE
    ? await prisma.rawPoolItem.findUnique({ where: { urlHash } })
    : person.id.startsWith('dry-')
      ? null
      : await prisma.rawPoolItem.findUnique({ where: { urlHash } });
  const text = sourceText(item, kind);
  const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
  const metadata = sourceMetadata(existing, item, generationId, kind);
  const changed = !existing
    || existing.sourceType !== item.sourceType
    || existing.title !== item.title
    || existing.text !== text
    || JSON.stringify(existing.metadata ?? null) !== JSON.stringify(metadata)
    || existing.fetchStatus !== 'success';

  if (changed) {
    console.log(`${EXECUTE ? (existing ? 'update' : 'create') : (existing ? 'would update' : 'would create')} ${kind}: ${person.name} / ${item.title}`);
    if (EXECUTE) {
      await prisma.rawPoolItem.upsert({
        where: { urlHash },
        create: {
          personId: person.id,
          sourceType: item.sourceType,
          url: item.url,
          urlHash,
          contentHash: sha256(text),
          title: item.title,
          text,
          publishedAt,
          metadata,
          fetchStatus: 'success',
          processed: false,
        },
        update: {
          sourceType: item.sourceType,
          contentHash: sha256(text),
          title: item.title,
          text,
          publishedAt,
          metadata,
          fetchStatus: 'success',
          processed: false,
          fetchedAt: new Date(),
        },
      });
    }
  }

  const auditExists = !EXECUTE && person.id.startsWith('dry-')
    ? false
    : Boolean(await prisma.qAAuditLog.findFirst({
        where: {
          personId: person.id,
          urlHash,
          sourceType: item.sourceType,
          stage: 'L1',
          verdict: 'keep',
        },
        select: { id: true },
      }));
  const auditInserted = !auditExists;
  if (auditInserted) {
    console.log(`${EXECUTE ? 'create' : 'would create'} audit: ${person.name} / ${item.title}`);
    if (EXECUTE) {
      await prisma.qAAuditLog.create({
        data: {
          personId: person.id,
          url: item.url,
          urlHash,
          sourceType: item.sourceType,
          stage: 'L1',
          verdict: 'keep',
          aboutPerson: kind === 'work' ? 0.82 : 0.78,
          aiRelevant: 0.88,
          quality: kind === 'work' ? 0.78 : 0.72,
          reason: `${kind === 'work' ? 'works' : 'person source'} backfill for remaining entity density cleanup`,
        },
      });
    }
  }

  return {
    title: item.title,
    rawChanged: changed,
    auditInserted,
  };
}

async function main() {
  const input = loadJson(inputPath);
  const generationId = input.generationId || 'density-backfill:remaining-global';
  const peopleByName = new Map();
  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    inputPath,
    generationId,
    peopleAttempted: input.people?.length || 0,
    peopleChanged: 0,
    sourceRowsChanged: 0,
    workRowsChanged: 0,
    auditInserted: 0,
    missingWorkPeople: [],
    people: [],
    works: [],
  };

  for (const seed of input.people || []) {
    const { person, result } = await upsertPerson(seed);
    peopleByName.set(seed.name.toLowerCase(), person);
    summary.people.push(result);
    if (result.changed) summary.peopleChanged += 1;

    for (const source of seed.sources || []) {
      const rowResult = await ensureRawAndAudit(person, source, generationId, 'source');
      if (rowResult.rawChanged) summary.sourceRowsChanged += 1;
      if (rowResult.auditInserted) summary.auditInserted += 1;
    }
  }

  for (const work of input.works || []) {
    let person = peopleByName.get(String(work.person).toLowerCase());
    if (!person) person = await findPerson({ name: work.person, aliases: [work.person] });
    if (!person) {
      console.log(`missing work person: ${work.person} / ${work.title}`);
      summary.missingWorkPeople.push(work.person);
      continue;
    }
    const rowResult = await ensureRawAndAudit(person, work, generationId, 'work');
    summary.works.push({ person: person.name, title: work.title, ...rowResult });
    if (rowResult.rawChanged) summary.workRowsChanged += 1;
    if (rowResult.auditInserted) summary.auditInserted += 1;
  }

  if (outPath) {
    fs.writeFileSync(resolvePath(outPath), `${JSON.stringify(summary, null, 2)}\n`);
    console.error(`Wrote remaining density backfill summary: ${outPath}`);
  }

  console.log(JSON.stringify({
    mode: summary.mode,
    peopleAttempted: summary.peopleAttempted,
    peopleChanged: summary.peopleChanged,
    sourceRowsChanged: summary.sourceRowsChanged,
    workRowsChanged: summary.workRowsChanged,
    auditInserted: summary.auditInserted,
    missingWorkPeople: summary.missingWorkPeople,
  }, null, 2));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
