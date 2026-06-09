/**
 * Add source-backed seed items and starter cards for candidate People rows.
 *
 * Default is dry-run. Use --execute to mutate the database.
 */
import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

type OfficialLink = {
  type: string;
  url: string;
  handle?: string;
  label?: string;
};

type Product = {
  name: string;
  description: string;
  org?: string;
  year?: string | number;
  url?: string;
  category?: string;
  type?: string;
};

type TopicDetail = {
  topic: string;
  rank: number;
  reason?: string;
};

type EnrichmentSeed = {
  name: string;
  topics?: string[];
  officialLinks?: OfficialLink[];
  products?: Product[];
  topicDetails?: TopicDetail[];
};

type CandidatePerson = {
  id: string;
  name: string;
  aliases: string[] | null;
  status: string;
  currentTitle: string | null;
  whyImportant: string | null;
  organization: string[] | null;
  avatarUrl: string | null;
  completeness: number | null;
};

type SourceItem = {
  url: string;
  sourceType: string;
  title: string;
  text: string;
  metadata: Record<string, unknown>;
};

type StarterCard = {
  type: 'insight' | 'fact';
  title: string;
  content: string;
  tags: string[];
  sourceUrl?: string;
  importance: number;
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const INCLUDE_NON_CANDIDATES = args.includes('--include-non-candidates');
const SEEDS_PATH = args.find(arg => arg.startsWith('--seeds='))?.slice('--seeds='.length)
  || 'docs/audit-2026-06/roster_enrichment.json';

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function compact(values: Array<string | undefined | null>): string[] {
  return values.filter((value): value is string => Boolean(value && value.trim())).map(value => value.trim());
}

function firstWebsite(seed: EnrichmentSeed): OfficialLink | undefined {
  return seed.officialLinks?.find(link => link.type === 'website') || seed.officialLinks?.[0];
}

function githubAvatar(seed: EnrichmentSeed): string | null {
  const handle = seed.officialLinks?.find(link => link.type === 'github')?.handle;
  if (!handle || handle.includes('/')) return null;
  return `https://github.com/${handle}.png`;
}

function sourceText(person: CandidatePerson, seed: EnrichmentSeed, product?: Product): string {
  const topics = (seed.topics || []).join('、') || 'AI';
  const orgs = (person.organization || []).join('、') || product?.org || '';
  const topicReasons = (seed.topicDetails || [])
    .map(detail => `${detail.topic}: ${detail.reason || ''}`)
    .filter(Boolean)
    .join('；');
  const productText = product
    ? `${product.name} 是 ${product.org || orgs || person.name} 的代表项目，${product.description}。`
    : `${person.name} 的候选资料覆盖 ${topics}，当前职位为 ${person.currentTitle || '待补充'}。`;

  return [
    `${person.name} 是 AI 人物库 candidate 名册中的人物，当前仍保持 candidate 状态，资料用于后续人工复核和内容抓取。`,
    person.currentTitle ? `当前职位线索：${person.currentTitle}。` : '',
    orgs ? `相关机构：${orgs}。` : '',
    person.whyImportant ? `入库原因：${person.whyImportant}。` : '',
    productText,
    topicReasons ? `话题线索：${topicReasons}。` : '',
    `本条 RawPoolItem 来自 curated roster enrichment，source URL 指向权威主页、个人主页、公司页、论文页或产品页，用于生成 source-backed starter cards；后续仍需用真实抓取内容替换或补强。`,
  ].filter(Boolean).join('\n');
}

function buildSources(person: CandidatePerson, seed: EnrichmentSeed): SourceItem[] {
  const profileLink = firstWebsite(seed);
  const sources: SourceItem[] = [];

  if (profileLink) {
    sources.push({
      url: profileLink.url,
      sourceType: 'official',
      title: `${person.name} official profile seed`,
      text: sourceText(person, seed),
      metadata: {
        seed: 'roster_deep_enrichment',
        kind: 'profile',
        label: profileLink.label,
        topics: seed.topics || [],
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
        seed: 'roster_deep_enrichment',
        kind: 'product',
        product: product.name,
        category: product.category,
        topics: seed.topics || [],
      },
    });
  }

  const byUrl = new Map<string, SourceItem>();
  for (const source of sources) {
    const existing = byUrl.get(source.url);
    if (!existing) {
      byUrl.set(source.url, source);
      continue;
    }
    byUrl.set(source.url, {
      ...existing,
      title: existing.title.includes('official profile') ? existing.title : source.title,
      text: `${existing.text}\n\n${source.text}`,
      metadata: {
        ...existing.metadata,
        mergedKinds: [
          ...new Set([
            ...(Array.isArray(existing.metadata.mergedKinds) ? existing.metadata.mergedKinds as string[] : compact([existing.metadata.kind as string | undefined])),
            source.metadata.kind as string,
          ]),
        ],
      },
    });
  }

  return [...byUrl.values()];
}

function buildCards(person: CandidatePerson, seed: EnrichmentSeed): StarterCard[] {
  const topics = seed.topics || [];
  const cards: StarterCard[] = [];
  for (const product of seed.products || []) {
    cards.push({
      type: 'fact',
      title: `${product.name}: ${person.name} 的代表线索`,
      content: `${person.name} 当前处于 candidate 状态，${product.name} 是后续补全时最值得优先核实的代表项目。${product.description}`,
      tags: compact([product.category, product.type, ...topics]).slice(0, 6),
      sourceUrl: product.url,
      importance: 3,
    });
  }

  for (const detail of (seed.topicDetails || []).slice(0, 1)) {
    cards.push({
      type: 'insight',
      title: `${person.name} 为什么进入「${detail.topic}」候选池`,
      content: detail.reason || `${person.name} 与 ${detail.topic} 方向相关，仍需后续用权威来源继续补全。`,
      tags: compact([detail.topic, ...topics]).slice(0, 6),
      sourceUrl: firstWebsite(seed)?.url,
      importance: 4,
    });
  }

  return cards;
}

async function findPerson(seed: EnrichmentSeed): Promise<CandidatePerson | null> {
  const rows = await sql`
    SELECT id, name, aliases, status, "currentTitle", "whyImportant", organization, "avatarUrl", completeness
    FROM "People"
    WHERE name = ${seed.name}
       OR aliases && ${[seed.name]}::text[]
    ORDER BY CASE WHEN status = ${'candidate'} THEN 0 ELSE 1 END, name ASC
    LIMIT 1
  ` as CandidatePerson[];
  return rows[0] || null;
}

async function existingRawHashes(personId: string): Promise<Set<string>> {
  const rows = await sql`
    SELECT "urlHash"
    FROM "RawPoolItem"
    WHERE "personId" = ${personId}
  ` as Array<{ urlHash: string }>;
  return new Set(rows.map(row => row.urlHash));
}

async function existingAuditHashes(personId: string): Promise<Set<string>> {
  const rows = await sql`
    SELECT DISTINCT "urlHash"
    FROM "QAAuditLog"
    WHERE "personId" = ${personId}
  ` as Array<{ urlHash: string }>;
  return new Set(rows.map(row => row.urlHash));
}

async function existingCardTitles(personId: string): Promise<Set<string>> {
  const rows = await sql`
    SELECT title
    FROM "Card"
    WHERE "personId" = ${personId}
  ` as Array<{ title: string }>;
  return new Set(rows.map(row => row.title.toLowerCase()));
}

async function insertRaw(person: CandidatePerson, item: SourceItem): Promise<string> {
  const urlHash = sha256(`${person.id}:${item.url}`);
  const contentHash = sha256(item.text);
  const now = new Date();
  if (!EXECUTE) return urlHash;

  await sql`
    INSERT INTO "RawPoolItem" (
      id, "personId", "sourceType", url, "urlHash", "contentHash", title, text,
      "publishedAt", metadata, "fetchStatus", "fetchedAt", processed
    )
    VALUES (
      ${crypto.randomUUID()}, ${person.id}, ${item.sourceType}, ${item.url}, ${urlHash}, ${contentHash},
      ${item.title}, ${item.text}, ${null}, ${JSON.stringify(item.metadata)}::jsonb, ${'success'}, ${now}, ${false}
    )
    ON CONFLICT ("urlHash") DO UPDATE
    SET title = EXCLUDED.title,
        text = EXCLUDED.text,
        metadata = EXCLUDED.metadata,
        "contentHash" = EXCLUDED."contentHash",
        "fetchedAt" = EXCLUDED."fetchedAt"
  `;

  return urlHash;
}

async function insertAudit(person: CandidatePerson, item: SourceItem, urlHash: string): Promise<void> {
  if (!EXECUTE) return;
  await sql`
    INSERT INTO "QAAuditLog" (
      id, "personId", url, "urlHash", "sourceType", stage, verdict,
      "aboutPerson", "aiRelevant", quality, reason
    )
    VALUES (
      ${crypto.randomUUID()}, ${person.id}, ${item.url}, ${urlHash}, ${item.sourceType}, ${'L1'}, ${'keep'},
      ${0.92}, ${0.9}, ${0.72}, ${'curated candidate deep enrichment seed; requires future source fetch verification'}
    )
  `;
}

async function insertCard(person: CandidatePerson, card: StarterCard): Promise<void> {
  if (!EXECUTE) return;
  const now = new Date();
  await sql`
    INSERT INTO "Card" (id, "personId", type, title, content, tags, "sourceUrl", importance, "createdAt", "updatedAt")
    VALUES (
      ${crypto.randomUUID()}, ${person.id}, ${card.type}, ${card.title}, ${card.content},
      ${card.tags}, ${card.sourceUrl || null}, ${card.importance}, ${now}, ${now}
    )
  `;
}

async function updatePersonMeta(person: CandidatePerson, avatarUrl: string | null): Promise<void> {
  if (!EXECUTE) return;
  await sql`
    UPDATE "People"
    SET
      "avatarUrl" = COALESCE(NULLIF("avatarUrl", ''), ${avatarUrl}),
      completeness = GREATEST(COALESCE(completeness, 0), ${35}),
      "updatedAt" = NOW()
    WHERE id = ${person.id}
  `;
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), SEEDS_PATH), 'utf-8')) as { people: EnrichmentSeed[] };
  let matched = 0;
  let skippedNonCandidate = 0;
  let rawInserted = 0;
  let auditInserted = 0;
  let cardsInserted = 0;
  let avatarsUpdated = 0;

  console.log(`Candidate deep enrichment mode: ${EXECUTE ? 'execute' : 'dry-run'} | seeds=${payload.people.length}`);

  for (const seed of payload.people) {
    const person = await findPerson(seed);
    if (!person) {
      console.log(`missing: ${seed.name}`);
      continue;
    }
    if (person.status !== 'candidate' && !INCLUDE_NON_CANDIDATES) {
      skippedNonCandidate += 1;
      continue;
    }

    matched += 1;
    const rawHashes = await existingRawHashes(person.id);
    const auditHashes = await existingAuditHashes(person.id);
    const cardTitles = await existingCardTitles(person.id);
    const sources = buildSources(person, seed);
    const cards = buildCards(person, seed);
    const avatarUrl = githubAvatar(seed);

    let personRaw = 0;
    let personAudit = 0;
    let personCards = 0;

    for (const item of sources) {
      const urlHash = sha256(`${person.id}:${item.url}`);
      if (!rawHashes.has(urlHash)) {
        await insertRaw(person, item);
        rawInserted += 1;
        personRaw += 1;
        rawHashes.add(urlHash);
      }
      if (!auditHashes.has(urlHash)) {
        await insertAudit(person, item, urlHash);
        auditInserted += 1;
        personAudit += 1;
        auditHashes.add(urlHash);
      }
    }

    for (const card of cards) {
      if (cardTitles.has(card.title.toLowerCase())) continue;
      await insertCard(person, card);
      cardsInserted += 1;
      personCards += 1;
      cardTitles.add(card.title.toLowerCase());
    }

    if (avatarUrl && !person.avatarUrl) {
      avatarsUpdated += 1;
    }
    await updatePersonMeta(person, avatarUrl);

    console.log(`${EXECUTE ? 'updated' : 'would update'} ${person.name}: raw+${personRaw} audit+${personAudit} cards+${personCards}${avatarUrl && !person.avatarUrl ? ' avatar+1' : ''}`);
  }

  console.log(JSON.stringify({
    matched,
    skippedNonCandidate,
    rawInserted,
    auditInserted,
    cardsInserted,
    avatarsUpdated,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
