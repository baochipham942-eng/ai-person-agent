import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const EXECUTE = process.argv.includes('--execute');
const seedsPath = process.argv.find(arg => arg.startsWith('--seeds='))?.slice('--seeds='.length)
  || 'docs/audit-2026-06/apple_huawei_ai_leaders_roster_seeds_2026_06_13.json';
const enrichmentPath = process.argv.find(arg => arg.startsWith('--enrichment='))?.slice('--enrichment='.length)
  || 'docs/audit-2026-06/apple_huawei_ai_leaders_roster_enrichment_2026_06_13.json';
const policyPath = 'docs/audit-2026-06/CONTENT_REVIEW_POLICY.json';

const prisma = new PrismaClient();

const profileRoles = [
  {
    person: 'Amar Subramanya',
    organization: { name: 'Apple Inc.', nameZh: '苹果公司', type: 'company' },
    role: 'Vice President of AI',
    roleZh: 'AI 副总裁',
    startDate: '2025-12-01',
    endDate: null,
  },
  {
    person: 'John Giannandrea',
    organization: { name: 'Apple Inc.', nameZh: '苹果公司', type: 'company' },
    role: 'Senior Vice President, Machine Learning and AI Strategy',
    roleZh: '机器学习与 AI 战略高级副总裁',
    startDate: '2018-01-01',
    endDate: '2025-12-01',
    matchRoleTerms: ['Machine Learning and AI Strategy', 'Chief of Machine Learning and AI Strategy'],
  },
  {
    person: '张平安',
    organization: { name: '华为集团', nameZh: '华为集团', type: 'company' },
    role: 'Executive Director',
    roleZh: '常务董事',
    startDate: null,
    endDate: null,
  },
  {
    person: '张平安',
    organization: { name: '华为云', nameZh: '华为云', type: 'company' },
    role: 'CEO of Huawei Cloud Computing BU',
    roleZh: '华为云计算 BU CEO',
    startDate: null,
    endDate: null,
  },
  {
    person: '田奇',
    organization: { name: '华为云', nameZh: '华为云', type: 'company' },
    role: 'Chief Scientist, Artificial Intelligence',
    roleZh: '人工智能领域首席科学家',
    startDate: null,
    endDate: null,
  },
];

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8'));
}

function unique(values) {
  return [...new Set(values.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
}

function slug(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
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

function findEnrichment(enrichment, seed) {
  return enrichment.people.find(person => person.name === seed.name || (seed.aliases || []).includes(person.name)) || {};
}

async function findPerson(seed) {
  const terms = unique([seed.name, seed.nameZh, ...(seed.aliases || [])]);
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
  if (!EXECUTE) return { id: `dry-${orgSeed.name}`, ...orgSeed };
  return prisma.organization.create({ data: orgSeed });
}

async function upsertRole(person, roleSeed) {
  const org = await ensureOrganization(roleSeed.organization);
  const existing = await prisma.personRole.findFirst({
    where: {
      personId: person.id,
      organizationId: org.id,
      OR: [
        { role: roleSeed.role },
        ...(roleSeed.matchRoleTerms || []).map(term => ({ role: { contains: term, mode: 'insensitive' } })),
      ],
    },
  });

  const data = {
    role: roleSeed.role,
    roleZh: roleSeed.roleZh,
    startDate: roleSeed.startDate ? new Date(roleSeed.startDate) : null,
    endDate: roleSeed.endDate ? new Date(roleSeed.endDate) : null,
    source: 'manual-official-2026-06-13',
    confidence: 0.9,
  };

  if (existing) {
    const changed = existing.role !== data.role
      || existing.roleZh !== data.roleZh
      || String(existing.startDate || '') !== String(data.startDate || '')
      || String(existing.endDate || '') !== String(data.endDate || '')
      || existing.source !== data.source
      || existing.confidence !== data.confidence;
    if (!changed) return false;
    console.log(`${EXECUTE ? 'update' : 'would update'} role: ${person.name} / ${roleSeed.role} @ ${roleSeed.organization.name}`);
    if (EXECUTE) {
      await prisma.personRole.update({ where: { id: existing.id }, data });
    }
    return true;
  }

  console.log(`${EXECUTE ? 'create' : 'would create'} role: ${person.name} / ${roleSeed.role} @ ${roleSeed.organization.name}`);
  if (EXECUTE) {
    await prisma.personRole.create({
      data: {
        personId: person.id,
        organizationId: org.id,
        role: roleSeed.role,
        ...data,
      },
    });
  }
  return true;
}

async function applyPerson(seed, enrichmentSeed, policy) {
  const existing = await findPerson(seed);
  const aliases = unique([...(existing?.aliases || []), seed.name, seed.nameZh, ...(seed.aliases || [])]);
  const organization = unique([...(existing?.organization || []), ...(seed.organization || [])]);
  const existingLinks = Array.isArray(existing?.officialLinks) ? existing.officialLinks : [];
  const existingProducts = Array.isArray(existing?.products) ? existing.products : [];
  const existingTopicDetails = Array.isArray(existing?.topicDetails) ? existing.topicDetails : [];
  const officialLinks = mergeByKey(existingLinks, enrichmentSeed.officialLinks || [], link => `${link.type}:${link.url}`.toLowerCase());
  const products = mergeByKey(existingProducts, enrichmentSeed.products || [], product => `${product.name}:${product.url || ''}`.toLowerCase());
  const topicDetails = mergeByKey(existingTopicDetails, enrichmentSeed.topicDetails || [], detail => detail.topic.toLowerCase());
  const topics = unique([...(existing?.topics || []), ...(enrichmentSeed.topics || [])]);
  const sourceWhitelist = unique([...(existing?.sourceWhitelist || []), ...(enrichmentSeed.sourceWhitelist || []), ...domainsFromLinks(officialLinks, products)]);
  const completeness = Math.max(existing?.completeness || 0, policy.candidateCompletenessFloors.minimalProfile);

  const patch = {
    aliases,
    organization,
    currentTitle: seed.currentTitle || existing?.currentTitle || null,
    roleCategory: seed.roleCategory || existing?.roleCategory || null,
    whyImportant: seed.reason || existing?.whyImportant || null,
    description: existing?.description || seed.reason || null,
    officialLinks,
    products,
    topics,
    topicDetails,
    sourceWhitelist,
    completeness,
  };

  if (existing) {
    const changed = !sameJson(existing.aliases, patch.aliases)
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

    if (changed) {
      console.log(`${EXECUTE ? 'update' : 'would update'} person: ${existing.name}`);
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

    console.log(`already up to date person: ${existing.name}`);
    return { person: existing, changed: false, inserted: false };
  }

  const qid = seed.qid || `CANDIDATE-${slug(seed.name)}`;
  console.log(`${EXECUTE ? 'create' : 'would create'} person: ${seed.name} (${qid})`);
  if (!EXECUTE) {
    return {
      person: { id: `dry-${qid}`, name: seed.name },
      changed: true,
      inserted: true,
    };
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
      status: policy.candidateIntake.defaultStatus,
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

async function main() {
  const seeds = loadJson(seedsPath).seeds;
  const enrichment = loadJson(enrichmentPath);
  const policy = loadJson(policyPath);
  let inserted = 0;
  let updated = 0;
  let rolesChanged = 0;

  console.log(`Apple/Huawei AI leader mode: ${EXECUTE ? 'execute' : 'dry-run'} | seeds=${seeds.length}`);

  for (const seed of seeds) {
    const result = await applyPerson(seed, findEnrichment(enrichment, seed), policy);
    if (result.inserted) inserted += 1;
    else if (result.changed) updated += 1;

    for (const roleSeed of profileRoles.filter(role => role.person === seed.name)) {
      if (await upsertRole(result.person, roleSeed)) rolesChanged += 1;
    }
  }

  console.log(JSON.stringify({ mode: EXECUTE ? 'execute' : 'dry-run', inserted, updated, rolesChanged }, null, 2));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
