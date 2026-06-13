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
const stageArg = args.find(arg => arg.startsWith('--stage='))?.slice('--stage='.length) || 'all';
const STAGE = ['all', 'people', 'sources'].includes(stageArg) ? stageArg : 'all';
const seedsPath = args.find(arg => arg.startsWith('--seeds='))?.slice('--seeds='.length)
  || 'docs/audit-2026-06/pg009_content_density_seeds_2026_06_13.json';
const enrichmentPath = args.find(arg => arg.startsWith('--enrichment='))?.slice('--enrichment='.length)
  || 'docs/audit-2026-06/pg009_content_density_enrichment_2026_06_13.json';
const sourcesPath = args.find(arg => arg.startsWith('--sources='))?.slice('--sources='.length)
  || 'docs/audit-2026-06/pg009_content_density_sources_2026_06_13.json';
const policyPath = 'docs/audit-2026-06/CONTENT_REVIEW_POLICY.json';
const GENERATION_ID = args.find(arg => arg.startsWith('--generation-id='))?.slice('--generation-id='.length)
  || 'pg009-content-density:2026-06-13';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaNeon(pool) });

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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function mergeByKey(existing, incoming, keyOf) {
  const merged = [...existing];
  const seen = new Set(existing.map(keyOf));
  for (const item of incoming) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

function domainsFromLinks(links, products) {
  return unique([...links.map(link => link.url), ...products.map(product => product.url)].map(url => {
    if (!url) return null;
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }));
}

function linkKey(link) {
  return `${link.type || 'website'}:${link.url}`.toLowerCase();
}

function productKey(product) {
  return `${product.name}:${product.url || ''}`.toLowerCase();
}

function topicDetailKey(detail) {
  return String(detail.topic || '').toLowerCase();
}

function seedTerms(seed) {
  return unique([seed.name, seed.nameZh, ...(seed.aliases || []), ...(seed.dedupCheck || [])]);
}

function findEnrichment(enrichment, seed) {
  const terms = new Set(seedTerms(seed).map(term => term.toLowerCase()));
  return enrichment.people.find(person => terms.has(String(person.name || '').toLowerCase())) || {};
}

async function findPersonBySeed(seed) {
  const terms = seedTerms(seed);
  const qid = seed.qid || `CANDIDATE-${slug(seed.name)}`;
  return prisma.people.findFirst({
    where: {
      OR: [
        { qid },
        ...terms.map(term => ({ name: { equals: term, mode: 'insensitive' } })),
        { aliases: { hasSome: terms } },
      ],
    },
    orderBy: [{ influenceScore: 'desc' }, { name: 'asc' }],
  });
}

async function findPersonByName(name) {
  return prisma.people.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
        { aliases: { has: name } },
      ],
    },
    orderBy: [{ influenceScore: 'desc' }, { name: 'asc' }],
  });
}

async function ensureOrganization(orgSeed) {
  const existing = await prisma.organization.findFirst({
    where: {
      OR: [
        { name: { equals: orgSeed.name, mode: 'insensitive' } },
        ...(orgSeed.nameZh ? [{ nameZh: { equals: orgSeed.nameZh, mode: 'insensitive' } }] : []),
      ],
    },
  });
  if (existing) return existing;

  console.log(`${EXECUTE ? 'create' : 'would create'} organization: ${orgSeed.name}`);
  if (!EXECUTE) return { id: `dry-${slug(orgSeed.name)}`, ...orgSeed };
  return prisma.organization.create({
    data: {
      name: orgSeed.name,
      nameZh: orgSeed.nameZh || null,
      type: orgSeed.type || 'company',
      description: orgSeed.description || null,
    },
  });
}

async function upsertRole(person, roleSeed) {
  if (!roleSeed?.organization?.name) return false;
  const org = await ensureOrganization(roleSeed.organization);
  const role = roleSeed.role || 'Member';
  const existing = EXECUTE || !String(person.id).startsWith('dry-')
    ? await prisma.personRole.findFirst({
        where: {
          personId: person.id,
          organizationId: org.id,
          role: { equals: role, mode: 'insensitive' },
        },
      })
    : null;

  const data = {
    role,
    roleZh: roleSeed.roleZh || null,
    startDate: roleSeed.startDate ? new Date(roleSeed.startDate) : null,
    endDate: roleSeed.endDate ? new Date(roleSeed.endDate) : null,
    source: roleSeed.source || 'pg009-content-density-2026-06-13',
    confidence: typeof roleSeed.confidence === 'number' ? roleSeed.confidence : 0.8,
  };

  if (existing) {
    const changed = existing.role !== data.role
      || existing.roleZh !== data.roleZh
      || String(existing.startDate || '') !== String(data.startDate || '')
      || String(existing.endDate || '') !== String(data.endDate || '')
      || existing.source !== data.source
      || existing.confidence !== data.confidence;
    if (!changed) return false;
    console.log(`${EXECUTE ? 'update' : 'would update'} role: ${person.name} / ${role} @ ${roleSeed.organization.name}`);
    if (EXECUTE) await prisma.personRole.update({ where: { id: existing.id }, data });
    return true;
  }

  console.log(`${EXECUTE ? 'create' : 'would create'} role: ${person.name} / ${role} @ ${roleSeed.organization.name}`);
  if (EXECUTE) {
    await prisma.personRole.create({
      data: {
        personId: person.id,
        organizationId: org.id,
        ...data,
      },
    });
  }
  return true;
}

function buildPersonPatch(seed, enrichmentSeed, existing, policy) {
  const existingLinks = asArray(existing?.officialLinks);
  const existingProducts = asArray(existing?.products);
  const existingTopicDetails = asArray(existing?.topicDetails);
  const officialLinks = mergeByKey(existingLinks, enrichmentSeed.officialLinks || [], linkKey);
  const products = mergeByKey(existingProducts, enrichmentSeed.products || [], productKey);
  const topicDetails = mergeByKey(existingTopicDetails, enrichmentSeed.topicDetails || [], topicDetailKey);
  const topics = unique([...(existing?.topics || []), ...(enrichmentSeed.topics || [])]);
  const aliases = unique([...(existing?.aliases || []), seed.name, seed.nameZh, ...(seed.aliases || [])]);
  const organization = unique([...(existing?.organization || []), ...(seed.organization || [])]);
  const sourceWhitelist = unique([
    ...(existing?.sourceWhitelist || []),
    ...(enrichmentSeed.sourceWhitelist || []),
    ...domainsFromLinks(officialLinks, products),
  ]);
  const completeness = Math.max(
    existing?.completeness || 0,
    policy.candidateCompletenessFloors?.minimalProfile || 25,
  );

  return {
    aliases,
    organization,
    currentTitle: existing?.currentTitle || seed.currentTitle || null,
    roleCategory: existing?.roleCategory || seed.roleCategory || null,
    whyImportant: existing?.whyImportant || seed.reason || null,
    description: existing?.description || seed.reason || null,
    officialLinks,
    products,
    topics,
    topicDetails,
    sourceWhitelist,
    completeness,
  };
}

function personChanged(existing, patch) {
  return !sameJson(existing.aliases, patch.aliases)
    || !sameJson(existing.organization, patch.organization)
    || existing.currentTitle !== patch.currentTitle
    || existing.roleCategory !== patch.roleCategory
    || existing.whyImportant !== patch.whyImportant
    || !sameJson(existing.officialLinks, patch.officialLinks)
    || !sameJson(existing.products, patch.products)
    || !sameJson(existing.topics, patch.topics)
    || !sameJson(existing.topicDetails, patch.topicDetails)
    || !sameJson(existing.sourceWhitelist, patch.sourceWhitelist)
    || (existing.completeness || 0) !== patch.completeness;
}

async function applyPerson(seed, enrichmentSeed, policy) {
  const existing = await findPersonBySeed(seed);
  const patch = buildPersonPatch(seed, enrichmentSeed, existing, policy);

  if (existing) {
    if (!personChanged(existing, patch)) {
      console.log(`already up to date person: ${existing.name}`);
      return { person: existing, changed: false, inserted: false };
    }

    console.log(`${EXECUTE ? 'update' : 'would update'} person: ${existing.name}`);
    console.log(`  +aliases=${patch.aliases.length - (existing.aliases || []).length} +orgs=${patch.organization.length - (existing.organization || []).length} +links=${patch.officialLinks.length - asArray(existing.officialLinks).length} +products=${patch.products.length - asArray(existing.products).length} +topics=${patch.topics.length - (existing.topics || []).length}`);
    if (EXECUTE) {
      await prisma.people.update({
        where: { id: existing.id },
        data: {
          aliases: patch.aliases,
          organization: patch.organization,
          currentTitle: patch.currentTitle,
          roleCategory: patch.roleCategory,
          whyImportant: patch.whyImportant,
          description: patch.description,
          officialLinks: patch.officialLinks,
          products: patch.products,
          topics: patch.topics,
          topicDetails: patch.topicDetails,
          sourceWhitelist: patch.sourceWhitelist,
          completeness: patch.completeness,
        },
      });
    }
    return { person: existing, changed: true, inserted: false };
  }

  const qid = seed.qid || `CANDIDATE-${slug(seed.name)}`;
  console.log(`${EXECUTE ? 'create' : 'would create'} person: ${seed.name} (${qid})`);
  if (!EXECUTE) {
    return { person: { id: `dry-${qid}`, name: seed.name, completeness: 0 }, changed: true, inserted: true };
  }

  const person = await prisma.people.create({
    data: {
      qid,
      name: seed.name,
      aliases: patch.aliases,
      description: patch.description,
      whyImportant: patch.whyImportant,
      aiContributionScore: 5,
      occupation: unique([seed.roleCategory]),
      organization: patch.organization,
      officialLinks: patch.officialLinks,
      sourceWhitelist: patch.sourceWhitelist,
      status: policy.candidateIntake?.defaultStatus || 'candidate',
      completeness: patch.completeness,
      topics: patch.topics,
      topicDetails: patch.topicDetails,
      roleCategory: patch.roleCategory,
      currentTitle: patch.currentTitle,
      influenceScore: 0,
      products: patch.products,
      highlights: [],
      quotes: [],
      education: [],
    },
  });
  return { person, changed: true, inserted: true };
}

function rawHash(personId, url) {
  return sha256(`${personId}:${url}`);
}

async function existingRawHashes(personId) {
  const rows = await prisma.rawPoolItem.findMany({
    where: { personId },
    select: { urlHash: true },
  });
  return new Set(rows.map(row => row.urlHash));
}

async function existingAuditHashes(personId) {
  const rows = await prisma.qAAuditLog.findMany({
    where: { personId },
    select: { urlHash: true },
    distinct: ['urlHash'],
  });
  return new Set(rows.map(row => row.urlHash));
}

async function existingCardTitles(personId) {
  const rows = await prisma.card.findMany({
    where: { personId, isActive: true },
    select: { title: true },
  });
  return new Set(rows.map(row => row.title.toLowerCase()));
}

function sourceText(item) {
  const targets = (item.targetEntities || []).map(entity => `${entity.type}:${entity.label}`).join(', ');
  return [
    item.text,
    targets ? `PG-009 target: ${targets}.` : '',
    item.organizations?.length ? `Organizations: ${item.organizations.join(', ')}.` : '',
    item.tags?.length ? `Tags: ${item.tags.join(', ')}.` : '',
    'This RawPoolItem is a curated PG-009 content-density seed and should remain reviewable through QAAuditLog.',
  ].filter(Boolean).join('\n');
}

function sourceMetadata(item) {
  return {
    seed: 'pg009_content_density',
    generationId: GENERATION_ID,
    contentDensityLane: item.lane,
    pg009Batch: '2026-06-13-first',
    targetEntities: item.targetEntities || [],
    tags: item.tags || [],
    organizations: item.organizations || [],
    priority: item.priority || null,
    evidenceNote: item.evidenceNote || item.text || null,
    sourceLabel: item.sourceType === 'official' ? 'Official' : item.sourceType,
    confidence: item.lane === 'works' ? 0.82 : 0.78,
  };
}

function buildCard(item) {
  const kind = item.lane === 'works' ? '代表作品' : '近期动态';
  return {
    type: 'fact',
    title: `${item.title}: PG-009 ${kind}线索`,
    content: `${item.title} 是 PG-009「${kind}」候选来源。${item.text || ''}`.trim(),
    tags: compact([item.lane, ...(item.tags || [])]).slice(0, 6),
    sourceUrl: item.url,
    importance: item.priority === 'P0' ? 4 : 3,
  };
}

async function upsertRaw(person, item) {
  const text = sourceText(item);
  const urlHash = rawHash(person.id, item.url);
  const contentHash = sha256(text);
  if (!EXECUTE) return urlHash;

  await prisma.rawPoolItem.upsert({
    where: { urlHash },
    create: {
      personId: person.id,
      sourceType: item.sourceType,
      url: item.url,
      urlHash,
      contentHash,
      title: item.title,
      text,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
      metadata: sourceMetadata(item),
      fetchStatus: 'success',
      processed: false,
    },
    update: {
      sourceType: item.sourceType,
      title: item.title,
      text,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
      metadata: sourceMetadata(item),
      contentHash,
      fetchStatus: 'success',
      processed: false,
      fetchedAt: new Date(),
    },
  });

  return urlHash;
}

async function insertAudit(person, item, urlHash) {
  if (!EXECUTE) return;
  await prisma.qAAuditLog.create({
    data: {
      personId: person.id,
      url: item.url,
      urlHash,
      sourceType: item.sourceType,
      stage: 'L1',
      verdict: 'keep',
      aboutPerson: 0.88,
      aiRelevant: 0.88,
      quality: item.priority === 'P0' ? 0.78 : 0.72,
      reason: 'curated PG-009 content-density source seed; additive source for later review and materialization',
    },
  });
}

async function insertCard(person, item) {
  if (!EXECUTE) return;
  const card = buildCard(item);
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

async function updateCompleteness(person, floor) {
  if (!EXECUTE || String(person.id).startsWith('dry-')) return;
  await prisma.people.update({
    where: { id: person.id },
    data: {
      completeness: Math.max(person.completeness || 0, floor),
    },
  });
}

async function applySource(item, plannedSeedNames, policy) {
  const person = await findPersonByName(item.person);
  const plannedOnly = !person && !EXECUTE && plannedSeedNames.has(String(item.person).toLowerCase());
  if (!person && !plannedOnly) {
    console.log(`missing source person: ${item.person} / ${item.title}`);
    return { missing: true, rawInserted: 0, auditInserted: 0, cardsInserted: 0, completenessUpdated: false, plannedOnly: false };
  }

  if (plannedOnly) {
    console.log(`would attach after candidate insert: ${item.person} / ${item.title}`);
    return { missing: false, rawInserted: 1, auditInserted: 1, cardsInserted: 1, completenessUpdated: true, plannedOnly: true };
  }

  const rawHashes = await existingRawHashes(person.id);
  const auditHashes = await existingAuditHashes(person.id);
  const cardTitles = await existingCardTitles(person.id);
  const urlHash = rawHash(person.id, item.url);
  const cardTitle = buildCard(item).title.toLowerCase();
  let rawInserted = 0;
  let auditInserted = 0;
  let cardsInserted = 0;

  if (!rawHashes.has(urlHash)) {
    await upsertRaw(person, item);
    rawInserted = 1;
  }
  if (!auditHashes.has(urlHash)) {
    await insertAudit(person, item, urlHash);
    auditInserted = 1;
  }
  if (!cardTitles.has(cardTitle)) {
    await insertCard(person, item);
    cardsInserted = 1;
  }

  const completenessFloor = policy.candidateCompletenessFloors?.deepEnrichment || 35;
  const completenessUpdated = (person.completeness || 0) < completenessFloor;
  if (completenessUpdated) await updateCompleteness(person, completenessFloor);

  console.log(`${EXECUTE ? 'updated' : 'would update'} source: ${person.name} / ${item.title} raw+${rawInserted} audit+${auditInserted} cards+${cardsInserted}${completenessUpdated ? ' completeness+1' : ''}`);
  return { missing: false, rawInserted, auditInserted, cardsInserted, completenessUpdated, plannedOnly: false };
}

async function main() {
  const seedsPayload = loadJson(seedsPath);
  const enrichmentPayload = loadJson(enrichmentPath);
  const sourcesPayload = loadJson(sourcesPath);
  const policy = loadJson(policyPath);
  const seeds = seedsPayload.seeds || [];
  const sources = sourcesPayload.items || [];
  const plannedSeedNames = new Set(seeds.map(seed => String(seed.name || '').toLowerCase()));
  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    stage: STAGE,
    people: { inserted: 0, updated: 0, rolesChanged: 0 },
    sources: { rawInserted: 0, auditInserted: 0, cardsInserted: 0, completenessUpdated: 0, missingPeople: 0, plannedOnly: 0 },
    heldSources: (sourcesPayload.held || []).length,
  };

  console.log(`PG-009 content density apply mode: ${summary.mode} | stage=${STAGE}`);

  if (STAGE === 'all' || STAGE === 'people') {
    for (const seed of seeds) {
      const result = await applyPerson(seed, findEnrichment(enrichmentPayload, seed), policy);
      if (result.inserted) summary.people.inserted += 1;
      else if (result.changed) summary.people.updated += 1;

      for (const roleSeed of seed.roles || []) {
        if (await upsertRole(result.person, roleSeed)) summary.people.rolesChanged += 1;
      }
    }
  }

  if (STAGE === 'all' || STAGE === 'sources') {
    for (const item of sources) {
      const result = await applySource(item, plannedSeedNames, policy);
      if (result.missing) {
        summary.sources.missingPeople += 1;
        continue;
      }
      if (result.plannedOnly) summary.sources.plannedOnly += 1;
      summary.sources.rawInserted += result.rawInserted;
      summary.sources.auditInserted += result.auditInserted;
      summary.sources.cardsInserted += result.cardsInserted;
      if (result.completenessUpdated) summary.sources.completenessUpdated += 1;
    }
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
