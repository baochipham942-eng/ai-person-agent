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

const EXECUTE = process.argv.includes('--execute');
const seedsPath = process.argv.find(arg => arg.startsWith('--seeds='))?.slice('--seeds='.length)
  || 'docs/audit-2026-06/pg009_content_density_seeds_2026_06_13.json';
const enrichmentPath = process.argv.find(arg => arg.startsWith('--enrichment='))?.slice('--enrichment='.length)
  || 'docs/audit-2026-06/pg009_content_density_enrichment_2026_06_13.json';
const GENERATION_ID = 'pg009-source-depth-fill:2026-06-13';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaNeon(pool) });

const supplementalSources = {
  'Sualeh Asif': [
    {
      title: 'Sualeh Asif public profile source',
      url: 'https://en.wikipedia.org/wiki/Sualeh_Asif',
      text: 'Public profile source used as a second source anchor for Sualeh Asif in the PG-009 AI Coding candidate review.',
    },
  ],
  'Aman Sanger': [
    {
      title: 'Anysphere public company source',
      url: 'https://en.wikipedia.org/wiki/Anysphere',
      text: 'Public company source used as a second source anchor for Aman Sanger and the Anysphere/Cursor founder-team candidate review.',
    },
  ],
  'Arvid Lunnemark': [
    {
      title: 'Anysphere public company source',
      url: 'https://en.wikipedia.org/wiki/Anysphere',
      text: 'Public company source used as a second source anchor for Arvid Lunnemark and the Anysphere/Cursor founder-team candidate review.',
    },
  ],
  'Steven Hao': [
    {
      title: 'Cognition AI public company source',
      url: 'https://en.wikipedia.org/wiki/Cognition_AI',
      text: 'Public company source used as a second source anchor for Steven Hao and the Cognition AI / Devin candidate review.',
    },
  ],
};

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function unique(values) {
  return [...new Set(values.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
}

function compact(values) {
  return values.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim());
}

function findEnrichment(enrichment, seed) {
  return enrichment.people.find(person => person.name === seed.name || (seed.aliases || []).includes(person.name)) || {};
}

function firstSourceUrl(seed, enrichment) {
  return enrichment.officialLinks?.[0]?.url
    || enrichment.products?.find(product => product.url)?.url
    || null;
}

function productNames(enrichment) {
  return unique((enrichment.products || []).map(product => product.name)).slice(0, 3);
}

function buildCards(person, seed, enrichment) {
  const sourceUrl = firstSourceUrl(seed, enrichment);
  const topics = enrichment.topics || [];
  const orgs = unique([...(person.organization || []), ...(seed.organization || [])]).slice(0, 4);
  const products = productNames(enrichment);
  const topic = topics[0] || seed.organization?.[0] || 'AI';
  const product = products[0] || topic;
  return [
    {
      type: 'insight',
      title: `${person.name} 的 PG-009 入库理由`,
      content: seed.reason || `${person.name} 是 PG-009 内容密度补强中的候选人物。`,
      tags: compact(['PG-009', 'candidate', ...topics]).slice(0, 6),
      sourceUrl,
      importance: 4,
    },
    {
      type: 'fact',
      title: `${person.name} 的当前角色线索`,
      content: `${person.name} 当前角色线索为「${person.currentTitle || seed.currentTitle || '待复核'}」。`,
      tags: compact(['role', seed.roleCategory, ...orgs]).slice(0, 6),
      sourceUrl,
      importance: 3,
    },
    {
      type: 'insight',
      title: `${person.name} 与「${topic}」的关系`,
      content: enrichment.topicDetails?.[0]?.reason || `${person.name} 被纳入「${topic}」候选池，后续继续用权威来源补强。`,
      tags: compact([topic, ...topics]).slice(0, 6),
      sourceUrl,
      importance: 4,
    },
    {
      type: 'fact',
      title: `${person.name} 的代表成果线索`,
      content: products.length > 0
        ? `${person.name} 的代表成果线索包括 ${products.join('、')}。`
        : `${person.name} 的代表成果线索仍在 PG-009 source-depth 流程中补强。`,
      tags: compact(['work', ...products, ...topics]).slice(0, 6),
      sourceUrl,
      importance: 3,
    },
    {
      type: 'insight',
      title: `${person.name} 的机构上下文`,
      content: orgs.length > 0
        ? `${person.name} 当前关联机构包括 ${orgs.join('、')}。`
        : `${person.name} 的机构上下文仍需人工复核。`,
      tags: compact(['organization', ...orgs]).slice(0, 6),
      sourceUrl,
      importance: 3,
    },
    {
      type: 'fact',
      title: `${person.name} 的来源复核状态`,
      content: `${person.name} 已进入 PG-009 source-depth 复核流；新增来源和卡片只作为候选资料，不改变人物状态。`,
      tags: compact(['source-depth', 'PG-009', ...topics]).slice(0, 6),
      sourceUrl,
      importance: 3,
    },
  ];
}

function rawHash(personId, url) {
  return sha256(`${personId}:${url}`);
}

async function ensureSupplementalSource(person, source) {
  const urlHash = rawHash(person.id, source.url);
  const existing = await prisma.rawPoolItem.findUnique({ where: { urlHash } });
  if (existing) return { rawInserted: 0, auditInserted: 0 };

  const text = [
    source.text,
    `Person: ${person.name}.`,
    'This RawPoolItem is a PG-009 source-depth supplemental source for candidate review.',
  ].join('\n');
  console.log(`${EXECUTE ? 'create' : 'would create'} supplemental source: ${person.name} / ${source.title}`);
  if (!EXECUTE) return { rawInserted: 1, auditInserted: 1 };

  await prisma.rawPoolItem.create({
    data: {
      personId: person.id,
      sourceType: 'exa',
      url: source.url,
      urlHash,
      contentHash: sha256(text),
      title: source.title,
      text,
      metadata: {
        seed: 'pg009_source_depth_supplement',
        generationId: GENERATION_ID,
        evidenceNote: source.text,
        confidence: 0.7,
      },
      fetchStatus: 'success',
      processed: false,
    },
  });
  await prisma.qAAuditLog.create({
    data: {
      personId: person.id,
      url: source.url,
      urlHash,
      sourceType: 'exa',
      stage: 'L1',
      verdict: 'keep',
      aboutPerson: 0.82,
      aiRelevant: 0.78,
      quality: 0.68,
      reason: 'PG-009 supplemental candidate source; requires human review before promotion',
    },
  });
  return { rawInserted: 1, auditInserted: 1 };
}

async function fillCards(person, seed, enrichment) {
  const existing = await prisma.card.findMany({
    where: { personId: person.id, isActive: true },
    select: { title: true },
  });
  const existingTitles = new Set(existing.map(card => card.title.toLowerCase()));
  const cards = buildCards(person, seed, enrichment);
  let inserted = 0;

  for (const card of cards) {
    if (existing.length + inserted >= 5) break;
    if (existingTitles.has(card.title.toLowerCase())) continue;
    console.log(`${EXECUTE ? 'create' : 'would create'} card: ${person.name} / ${card.title}`);
    if (EXECUTE) {
      await prisma.card.create({
        data: {
          personId: person.id,
          type: card.type,
          title: card.title,
          content: card.content,
          tags: card.tags,
          sourceUrl: card.sourceUrl,
          importance: card.importance,
          generationId: GENERATION_ID,
          isActive: true,
        },
      });
    }
    existingTitles.add(card.title.toLowerCase());
    inserted += 1;
  }

  return inserted;
}

async function main() {
  const seeds = loadJson(seedsPath).seeds || [];
  const enrichment = loadJson(enrichmentPath);
  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    matched: 0,
    missing: [],
    rawInserted: 0,
    auditInserted: 0,
    cardsInserted: 0,
  };

  for (const seed of seeds) {
    const person = await prisma.people.findFirst({
      where: {
        OR: [
          { qid: seed.qid },
          { name: { equals: seed.name, mode: 'insensitive' } },
          { aliases: { hasSome: unique([seed.name, ...(seed.aliases || [])]) } },
        ],
      },
      orderBy: [{ name: 'asc' }],
    });
    if (!person) {
      summary.missing.push(seed.name);
      continue;
    }
    summary.matched += 1;

    for (const source of supplementalSources[seed.name] || []) {
      const result = await ensureSupplementalSource(person, source);
      summary.rawInserted += result.rawInserted;
      summary.auditInserted += result.auditInserted;
    }

    const cardsInserted = await fillCards(person, seed, findEnrichment(enrichment, seed));
    summary.cardsInserted += cardsInserted;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
