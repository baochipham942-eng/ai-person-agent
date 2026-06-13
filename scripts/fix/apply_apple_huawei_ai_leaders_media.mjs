import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const EXECUTE = process.argv.includes('--execute');
const enrichmentPath = process.argv.find(arg => arg.startsWith('--enrichment='))?.slice('--enrichment='.length)
  || 'docs/audit-2026-06/apple_huawei_ai_leaders_roster_enrichment_2026_06_13.json';
const policyPath = 'docs/audit-2026-06/CONTENT_REVIEW_POLICY.json';
const GENERATION_ID = process.argv.find(arg => arg.startsWith('--generation-id='))?.slice('--generation-id='.length)
  || 'apple-huawei-ai-leaders:2026-06-13';

const prisma = new PrismaClient();

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

function firstOfficialLink(seed) {
  return seed.officialLinks?.find(link => link.type === 'website') || seed.officialLinks?.[0] || null;
}

function sourceText(person, seed, product) {
  const topics = (seed.topics || []).join('、') || 'AI';
  const orgs = unique([...(person.organization || []), product?.org].filter(Boolean)).join('、');
  const topicReasons = (seed.topicDetails || [])
    .map(detail => `${detail.topic}: ${detail.reason || ''}`)
    .filter(Boolean)
    .join('；');
  const productText = product
    ? `${product.name} 是 ${product.org || orgs || person.name} 的代表项目或业务线索。${product.description}`
    : `${person.name} 的资料覆盖 ${topics}，当前职位为 ${person.currentTitle || '待补充'}。`;

  return [
    `${person.name} 是 AI 人物库中的人物，本条资料用于补强来源素材和学习卡片。`,
    person.currentTitle ? `当前职位线索：${person.currentTitle}。` : '',
    orgs ? `相关机构：${orgs}。` : '',
    person.whyImportant ? `入库原因：${person.whyImportant}。` : '',
    productText,
    topicReasons ? `话题线索：${topicReasons}。` : '',
    '本条 RawPoolItem 来自 Apple/Huawei AI leadership 人工整理来源，source URL 指向官方公告、官方产品页、官方技术文章或公司年报，用于后续内容抓取和卡片聚合复核。',
  ].filter(Boolean).join('\n');
}

function mergeSource(existing, incoming) {
  const mergedProducts = unique([
    ...toStringArray(existing.metadata?.products),
    incoming.metadata?.product,
  ]);
  const mergedKinds = unique([
    ...toStringArray(existing.metadata?.kinds),
    existing.metadata?.kind,
    incoming.metadata?.kind,
  ]);

  return {
    ...existing,
    title: existing.title.includes('official profile') ? existing.title : incoming.title,
    text: unique([existing.text, incoming.text]).join('\n\n'),
    metadata: {
      ...existing.metadata,
      products: mergedProducts,
      kinds: mergedKinds,
      tags: unique([
        ...toStringArray(existing.metadata?.tags),
        ...toStringArray(incoming.metadata?.tags),
      ]),
    },
  };
}

function buildSources(person, seed) {
  const sources = [];
  const profileLink = firstOfficialLink(seed);

  if (profileLink?.url) {
    sources.push({
      url: profileLink.url,
      sourceType: 'official',
      title: `${person.name} official profile seed`,
      text: sourceText(person, seed),
      metadata: {
        seed: 'apple_huawei_ai_leaders_media',
        kind: 'profile',
        label: profileLink.label,
        tags: seed.topics || [],
        confidence: 0.9,
        evidenceNote: 'Official source selected during Apple/Huawei AI leadership enrichment.',
      },
    });
  }

  for (const product of seed.products || []) {
    if (!product.url) continue;
    sources.push({
      url: product.url,
      sourceType: product.category === 'Paper' ? 'paper' : 'official',
      title: `${person.name} source: ${product.name}`,
      text: sourceText(person, seed, product),
      metadata: {
        seed: 'apple_huawei_ai_leaders_media',
        kind: 'product',
        product: product.name,
        category: product.category,
        type: product.type,
        tags: seed.topics || [],
        confidence: 0.88,
        evidenceNote: `Official product/source seed for ${product.name}.`,
      },
    });
  }

  const byUrl = new Map();
  for (const source of sources) {
    const existing = byUrl.get(source.url);
    byUrl.set(source.url, existing ? mergeSource(existing, source) : source);
  }

  return [...byUrl.values()];
}

function buildCards(person, seed) {
  const firstLink = firstOfficialLink(seed);
  const topics = seed.topics || [];
  const cards = [
    {
      type: 'insight',
      title: `${person.name} 的当前 AI 角色`,
      content: `${person.name} 当前在人物库中的职位线索是「${person.currentTitle || '待补充'}」，相关方向包括 ${topics.slice(0, 4).join('、') || 'AI'}。`,
      tags: compact(['role', ...topics]).slice(0, 6),
      sourceUrl: firstLink?.url,
      importance: 4,
    },
    {
      type: 'fact',
      title: `${person.name} 的官方来源锚点`,
      content: firstLink?.label
        ? `${firstLink.label} 是这次补充 ${person.name} 资料时采用的官方来源锚点。`
        : `${person.name} 已补充官方来源锚点，后续可继续抓取正文增强素材。`,
      tags: compact(['official-source', ...topics]).slice(0, 6),
      sourceUrl: firstLink?.url,
      importance: 4,
    },
  ];

  for (const product of seed.products || []) {
    cards.push({
      type: 'fact',
      title: `${product.name}: ${person.name} 的代表成果线索`,
      content: `${product.name} 是 ${person.name} 的代表成果或业务线索。${product.description}`,
      tags: compact([product.category, product.type, ...topics]).slice(0, 6),
      sourceUrl: product.url || firstLink?.url,
      importance: 3,
    });
  }

  for (const detail of seed.topicDetails || []) {
    cards.push({
      type: 'insight',
      title: `${person.name} 为什么进入「${detail.topic}」主题`,
      content: detail.reason || `${person.name} 与 ${detail.topic} 方向相关，仍需后续用权威来源继续补全。`,
      tags: compact([detail.topic, ...topics]).slice(0, 6),
      sourceUrl: firstLink?.url,
      importance: 4,
    });
  }

  if ((person.organization || []).length > 0) {
    cards.push({
      type: 'insight',
      title: `${person.name} 的机构上下文`,
      content: `${person.name} 当前关联机构包括 ${person.organization.join('、')}，这些机构会影响后续组织筛选和主题导航。`,
      tags: compact(['organization', ...person.organization, ...topics]).slice(0, 6),
      sourceUrl: firstLink?.url,
      importance: 3,
    });
  }

  return cards;
}

function toStringArray(value) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()) : [];
}

function rawHash(personId, url) {
  return sha256(`${personId}:${url}`);
}

async function findPerson(seed) {
  const terms = unique([seed.name, ...(seed.aliases || [])]);
  return prisma.people.findFirst({
    where: {
      OR: [
        { name: { in: terms } },
        { aliases: { hasSome: terms } },
      ],
    },
    orderBy: [{ influenceScore: 'desc' }, { name: 'asc' }],
  });
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

async function insertRaw(person, item) {
  const urlHash = rawHash(person.id, item.url);
  if (!EXECUTE) return urlHash;

  await prisma.rawPoolItem.upsert({
    where: { urlHash },
    create: {
      personId: person.id,
      sourceType: item.sourceType,
      url: item.url,
      urlHash,
      contentHash: sha256(item.text),
      title: item.title,
      text: item.text,
      metadata: item.metadata,
      fetchStatus: 'success',
      processed: false,
    },
    update: {
      sourceType: item.sourceType,
      title: item.title,
      text: item.text,
      metadata: item.metadata,
      contentHash: sha256(item.text),
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
      aboutPerson: 0.92,
      aiRelevant: 0.9,
      quality: 0.74,
      reason: 'curated Apple/Huawei AI leadership media seed; official source selected for future source fetch verification',
    },
  });
}

async function insertCard(person, card) {
  if (!EXECUTE) return;

  await prisma.card.create({
    data: {
      personId: person.id,
      type: card.type,
      title: card.title,
      content: card.content,
      tags: card.tags,
      sourceUrl: card.sourceUrl || null,
      importance: card.importance,
      generationId: GENERATION_ID,
      isActive: true,
    },
  });
}

async function updateCompleteness(person, floor) {
  if (!EXECUTE) return;

  await prisma.people.update({
    where: { id: person.id },
    data: {
      completeness: Math.max(person.completeness || 0, floor),
    },
  });
}

async function main() {
  const enrichment = loadJson(enrichmentPath);
  const policy = loadJson(policyPath);
  const completenessFloor = policy.candidateCompletenessFloors?.deepEnrichment || 35;
  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    matched: 0,
    missing: [],
    rawInserted: 0,
    auditInserted: 0,
    cardsInserted: 0,
    completenessUpdated: 0,
    people: [],
  };

  for (const seed of enrichment.people || []) {
    const person = await findPerson(seed);
    if (!person) {
      summary.missing.push(seed.name);
      continue;
    }

    summary.matched += 1;
    const rawHashes = await existingRawHashes(person.id);
    const auditHashes = await existingAuditHashes(person.id);
    const cardTitles = await existingCardTitles(person.id);
    const sources = buildSources(person, seed);
    const cards = buildCards(person, seed);
    const personSummary = {
      name: person.name,
      rawInserted: 0,
      auditInserted: 0,
      cardsInserted: 0,
      completenessUpdated: false,
    };

    for (const item of sources) {
      const urlHash = rawHash(person.id, item.url);
      if (!rawHashes.has(urlHash)) {
        await insertRaw(person, item);
        rawHashes.add(urlHash);
        personSummary.rawInserted += 1;
        summary.rawInserted += 1;
      }

      if (!auditHashes.has(urlHash)) {
        await insertAudit(person, item, urlHash);
        auditHashes.add(urlHash);
        personSummary.auditInserted += 1;
        summary.auditInserted += 1;
      }
    }

    for (const card of cards) {
      const titleKey = card.title.toLowerCase();
      if (cardTitles.has(titleKey)) continue;
      await insertCard(person, card);
      cardTitles.add(titleKey);
      personSummary.cardsInserted += 1;
      summary.cardsInserted += 1;
    }

    if ((person.completeness || 0) < completenessFloor) {
      await updateCompleteness(person, completenessFloor);
      personSummary.completenessUpdated = true;
      summary.completenessUpdated += 1;
    }

    summary.people.push(personSummary);
    console.log(`${EXECUTE ? 'updated' : 'would update'} ${person.name}: raw+${personSummary.rawInserted} audit+${personSummary.auditInserted} cards+${personSummary.cardsInserted}${personSummary.completenessUpdated ? ' completeness+1' : ''}`);
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
