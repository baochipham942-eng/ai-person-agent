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
  || 'docs/audit-2026-06/cohere_perplexity_density_works_2026_06_13.json';
const outPath = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length) || null;

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaNeon(pool) });

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8'));
}

function resolvePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function rawHash(personId, url) {
  return sha256(`${personId}:${url}`);
}

function compact(values) {
  return values.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim());
}

function unique(values) {
  return [...new Set(compact(values))];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function sourceLabel(sourceType) {
  if (sourceType === 'official') return 'Official';
  if (sourceType === 'github') return 'GitHub';
  return 'OpenAlex';
}

function sourceText(item) {
  return [
    item.text,
    `Organization: ${item.organization}.`,
    item.tags?.length ? `Tags: ${item.tags.join(', ')}.` : '',
    'This RawPoolItem is a curated entity-density works backfill and should remain reviewable through QAAuditLog.',
  ].filter(Boolean).join('\n');
}

function sourceMetadata(existing, item, generationId) {
  return {
    ...asObject(existing?.metadata),
    seed: 'entity_density_works_backfill',
    generationId,
    contentDensityLane: 'works',
    targetEntities: [{ type: 'organization', label: item.organization }],
    tags: unique(item.tags || []),
    organizations: unique([item.organization]),
    sourceLabel: sourceLabel(item.sourceType),
    evidenceNote: item.evidenceNote || item.text || null,
    confidence: item.sourceType === 'official' ? 0.82 : 0.86,
  };
}

function rowChanged(existing, data) {
  if (!existing) return true;
  return existing.sourceType !== data.sourceType
    || existing.title !== data.title
    || existing.text !== data.text
    || JSON.stringify(existing.metadata ?? null) !== JSON.stringify(data.metadata ?? null)
    || existing.fetchStatus !== 'success'
    || existing.processed !== false
    || String(existing.publishedAt || '') !== String(data.publishedAt || '');
}

async function findReadyPerson(name) {
  return prisma.people.findFirst({
    where: {
      status: { in: ['ready', 'active'] },
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
        { aliases: { has: name } },
      ],
    },
    orderBy: [{ influenceScore: 'desc' }, { name: 'asc' }],
  });
}

async function upsertWork(item, generationId) {
  const person = await findReadyPerson(item.person);
  if (!person) {
    console.log(`missing ready person: ${item.person} / ${item.title}`);
    return { status: 'missing_person', person: item.person, title: item.title, rawChanged: false, auditInserted: false };
  }

  const urlHash = rawHash(person.id, item.url);
  const existing = await prisma.rawPoolItem.findUnique({ where: { urlHash } });
  const text = sourceText(item);
  const data = {
    personId: person.id,
    sourceType: item.sourceType,
    url: item.url,
    urlHash,
    contentHash: sha256(text),
    title: item.title,
    text,
    publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
    metadata: sourceMetadata(existing, item, generationId),
    fetchStatus: 'success',
    processed: false,
  };

  const changed = rowChanged(existing, data);
  if (changed) {
    console.log(`${EXECUTE ? (existing ? 'update' : 'create') : (existing ? 'would update' : 'would create')} work: ${person.name} / ${item.title}`);
    if (EXECUTE) {
      await prisma.rawPoolItem.upsert({
        where: { urlHash },
        create: data,
        update: {
          sourceType: data.sourceType,
          contentHash: data.contentHash,
          title: data.title,
          text: data.text,
          publishedAt: data.publishedAt,
          metadata: data.metadata,
          fetchStatus: 'success',
          processed: false,
          fetchedAt: new Date(),
        },
      });
    }
  } else {
    console.log(`unchanged work: ${person.name} / ${item.title}`);
  }

  const audit = await prisma.qAAuditLog.findFirst({
    where: {
      personId: person.id,
      urlHash,
      sourceType: item.sourceType,
      stage: 'L1',
      verdict: 'keep',
    },
    select: { id: true },
  });
  const auditInserted = !audit;
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
          aboutPerson: 0.84,
          aiRelevant: 0.9,
          quality: item.sourceType === 'official' ? 0.76 : 0.82,
          reason: `curated entity-density works backfill for ${item.organization}; source-backed representative work`,
        },
      });
    }
  }

  return {
    status: existing ? 'updated_existing' : 'created',
    person: person.name,
    organization: item.organization,
    title: item.title,
    url: item.url,
    rawChanged: changed,
    auditInserted,
  };
}

async function main() {
  const input = loadJson(inputPath);
  const generationId = input.generationId || 'density-works-backfill:manual';
  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    inputPath,
    generationId,
    attempted: input.works?.length || 0,
    rawChanged: 0,
    auditInserted: 0,
    missingPeople: [],
    results: [],
  };

  for (const item of input.works || []) {
    const result = await upsertWork(item, generationId);
    summary.results.push(result);
    if (result.rawChanged) summary.rawChanged += 1;
    if (result.auditInserted) summary.auditInserted += 1;
    if (result.status === 'missing_person') summary.missingPeople.push(result.person);
  }

  if (outPath) {
    fs.writeFileSync(resolvePath(outPath), `${JSON.stringify(summary, null, 2)}\n`);
    console.error(`Wrote density works backfill summary: ${outPath}`);
  }

  console.log(JSON.stringify({
    mode: summary.mode,
    attempted: summary.attempted,
    rawChanged: summary.rawChanged,
    auditInserted: summary.auditInserted,
    missingPeople: summary.missingPeople,
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
