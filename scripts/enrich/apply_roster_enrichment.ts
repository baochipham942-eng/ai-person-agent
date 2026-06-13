/**
 * Enrich candidate roster People rows with minimum viable product-page fields.
 *
 * Default is dry-run. Use --execute to mutate the database.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { loadContentReviewPolicy } from '../audit/content_review_policy.mjs';

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
  icon?: string;
  logo?: string;
  category?: string;
  type?: string;
  stats?: Record<string, string>;
};

type TopicDetail = {
  topic: string;
  rank: number;
  reason?: string;
  description?: string;
};

type EnrichmentSeed = {
  name: string;
  topics?: string[];
  officialLinks?: OfficialLink[];
  products?: Product[];
  topicDetails?: TopicDetail[];
  sourceWhitelist?: string[];
};

type ExistingPerson = {
  id: string;
  name: string;
  aliases: string[] | null;
  status: string;
  officialLinks: unknown;
  products: unknown;
  topics: string[] | null;
  topicDetails: unknown;
  sourceWhitelist: string[] | null;
  completeness: number | null;
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const SEEDS_PATH = args.find(arg => arg.startsWith('--seeds='))?.slice('--seeds='.length)
  || 'docs/audit-2026-06/roster_enrichment.json';

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);
const policy = loadContentReviewPolicy();

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function unique(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())).map(value => value.trim()))];
}

function linkKey(link: OfficialLink): string {
  return `${link.type}:${link.url}`.toLowerCase();
}

function productKey(product: Product): string {
  return `${product.name}:${product.url || ''}`.toLowerCase();
}

function topicDetailKey(detail: TopicDetail): string {
  return detail.topic.toLowerCase();
}

function domainsFromUrls(urls: Array<string | undefined>): string[] {
  return unique(urls.map(url => {
    if (!url) return null;
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }));
}

function mergeByKey<T>(existing: T[], incoming: T[], getKey: (item: T) => string): T[] {
  const seen = new Set(existing.map(getKey));
  const merged = [...existing];
  for (const item of incoming) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

function hasChanges(patch: ReturnType<typeof buildPatch>, person: ExistingPerson): boolean {
  return patch.deltas.links !== 0
    || patch.deltas.products !== 0
    || patch.deltas.topics !== 0
    || patch.deltas.topicDetails !== 0
    || patch.deltas.sourceWhitelist !== 0
    || patch.completeness !== (person.completeness || 0);
}

async function findPerson(seed: EnrichmentSeed): Promise<ExistingPerson | null> {
  const name = seed.name;
  const rows = await sql`
    SELECT id, name, aliases, status, "officialLinks", products, topics, "topicDetails", "sourceWhitelist", completeness
    FROM "People"
    WHERE name = ${name}
       OR aliases && ${[name]}::text[]
    ORDER BY
      CASE WHEN name = ${name} THEN 0 ELSE 1 END,
      "influenceScore" DESC,
      name ASC
    LIMIT 1
  ` as ExistingPerson[];
  return rows[0] || null;
}

function buildPatch(seed: EnrichmentSeed, person: ExistingPerson) {
  const existingLinks = asArray<OfficialLink>(person.officialLinks);
  const existingProducts = asArray<Product>(person.products);
  const existingTopicDetails = asArray<TopicDetail>(person.topicDetails);

  const officialLinks = mergeByKey(existingLinks, seed.officialLinks || [], linkKey);
  const products = mergeByKey(existingProducts, seed.products || [], productKey);
  const topicDetails = mergeByKey(existingTopicDetails, seed.topicDetails || [], topicDetailKey);
  const topics = unique([...(person.topics || []), ...(seed.topics || [])]);

  const derivedDomains = domainsFromUrls([
    ...officialLinks.map(link => link.url),
    ...products.map(product => product.url),
  ]);
  const sourceWhitelist = unique([...(person.sourceWhitelist || []), ...(seed.sourceWhitelist || []), ...derivedDomains]);
  const completeness = Math.max(
    person.completeness || 0,
    person.status === policy.candidateIntake.defaultStatus
      ? policy.candidateCompletenessFloors.minimalProfile
      : person.completeness || 0,
  );

  return {
    officialLinks,
    products,
    topicDetails,
    topics,
    sourceWhitelist,
    completeness,
    deltas: {
      links: officialLinks.length - existingLinks.length,
      products: products.length - existingProducts.length,
      topics: topics.length - (person.topics || []).length,
      topicDetails: topicDetails.length - existingTopicDetails.length,
      sourceWhitelist: sourceWhitelist.length - (person.sourceWhitelist || []).length,
    },
  };
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), SEEDS_PATH), 'utf-8')) as { people: EnrichmentSeed[] };
  let matched = 0;
  let missing = 0;
  let updated = 0;

  console.log(`Roster enrichment mode: ${EXECUTE ? 'execute' : 'dry-run'} | seeds=${payload.people.length}`);

  for (const seed of payload.people) {
    const person = await findPerson(seed);
    if (!person) {
      missing += 1;
      console.log(`missing: ${seed.name}`);
      continue;
    }

    matched += 1;
    const patch = buildPatch(seed, person);
    if (!hasChanges(patch, person)) {
      console.log(`already up to date: ${person.name} (${person.status})`);
      continue;
    }

    console.log(`${EXECUTE ? 'update' : 'would update'} ${person.name} (${person.status})`);
    console.log(`  +links=${patch.deltas.links} +products=${patch.deltas.products} +topics=${patch.deltas.topics} +topicDetails=${patch.deltas.topicDetails} +domains=${patch.deltas.sourceWhitelist}`);

    if (!EXECUTE) continue;
    await sql`
      UPDATE "People"
      SET
        "officialLinks" = ${JSON.stringify(patch.officialLinks)}::jsonb,
        products = ${JSON.stringify(patch.products)}::jsonb,
        topics = ${patch.topics},
        "topicDetails" = ${JSON.stringify(patch.topicDetails)}::jsonb,
        "sourceWhitelist" = ${patch.sourceWhitelist},
        completeness = ${patch.completeness},
        "updatedAt" = NOW()
      WHERE id = ${person.id}
    `;
    updated += 1;
  }

  console.log(JSON.stringify({ matched, missing, updated }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
