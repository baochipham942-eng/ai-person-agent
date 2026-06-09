/**
 * Export review buckets for People.products.
 *
 * Read-only. The products field currently carries product families, models,
 * tools, frameworks, methods, datasets, and sometimes API channels. This audit
 * makes that mix visible so product/data decisions can be reviewed in batches.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

type Product = {
  name?: string;
  org?: string;
  year?: string | number;
  description?: string;
  url?: string;
  icon?: string;
  logo?: string;
  type?: string;
  category?: string;
  role?: string;
  stats?: Record<string, unknown>;
};

type PeopleRow = {
  id: string;
  name: string;
  status: string;
  currentTitle: string | null;
  organization: string[];
  topics: string[];
  products: Product[] | null;
};

type ProductReviewRow = {
  personId: string;
  person: string;
  status: string;
  currentTitle: string | null;
  organization: string[];
  topics: string[];
  product: Product;
  bucket: string;
  reasons: string[];
  recommendedAction: string;
};

const args = process.argv.slice(2);
const OUT = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length)
  || 'docs/audit-2026-06/data/product_review_buckets.json';

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asProducts(value: unknown): Product[] {
  return Array.isArray(value) ? value.filter(isRecord) as Product[] : [];
}

function text(product: Product): string {
  return [
    product.name,
    product.category,
    product.type,
    product.role,
    product.description,
    product.url,
  ].filter(Boolean).join(' ');
}

function category(product: Product): string {
  return String(product.category || '').toLowerCase();
}

function name(product: Product): string {
  return String(product.name || '');
}

function hasGithubSignal(product: Product): boolean {
  const url = String(product.url || '');
  const type = String(product.type || '').toLowerCase();
  return type === 'github' || url.includes('github.com') || Boolean(product.stats && ('stars' in product.stats || 'forks' in product.stats));
}

function hasApiChannelSignal(product: Product): boolean {
  const n = name(product);
  return /\b(api|sdk)\b/i.test(n)
    || /openai service/i.test(n)
    || /\bmaas\b/i.test(n)
    || /coding plan/i.test(n);
}

function hasSpecificModelVersionSignal(product: Product): boolean {
  const n = name(product);
  return /\b(gpt-?3|gpt-?4|gpt-?4o|claude\s+[0-9]|sonnet|opus|haiku|o1|o3|o4|gemini\s+[0-9]|mixtral|deepseek-v[0-9]|llama\s*[0-9]|pytorch\s*[0-9])/i.test(n);
}

function hasResearchArtifactSignal(product: Product): boolean {
  const c = category(product);
  const n = name(product);
  return /framework|method|dataset|benchmark|paper|research/.test(c)
    || /constitutional ai|rlhf|backpropagation|transformer architecture|scaling laws|mmlu|squad|imagenet|caltech-101|dropout|pagerank/i.test(n);
}

function hasModelFamilySignal(product: Product): boolean {
  const c = category(product);
  return /ai model|model/.test(c);
}

function hasProductPlatformSignal(product: Product): boolean {
  const c = category(product);
  return /platform|product|service|tool|hardware|chip/.test(c);
}

function bucketProduct(product: Product): { bucket: string; reasons: string[]; recommendedAction: string } {
  const reasons: string[] = [];

  if (hasGithubSignal(product)) {
    reasons.push('github_or_repo_signal');
    return {
      bucket: 'open_source_or_repo',
      reasons,
      recommendedAction: 'Move to or verify against the open-source tab when the item is a repository rather than a product family.',
    };
  }

  if (hasApiChannelSignal(product)) {
    reasons.push('api_or_sdk_name');
    return {
      bucket: 'api_channel',
      reasons,
      recommendedAction: 'Usually fold into the parent product/platform instead of showing as a separate representative achievement.',
    };
  }

  if (hasSpecificModelVersionSignal(product)) {
    reasons.push('specific_model_version_name');
    return {
      bucket: 'specific_model_version',
      reasons,
      recommendedAction: 'For founder/executive pages, replace with family-level product unless the person directly led that exact release.',
    };
  }

  if (hasResearchArtifactSignal(product)) {
    reasons.push('research_artifact_or_method');
    return {
      bucket: 'research_artifact_or_method',
      reasons,
      recommendedAction: 'Keep as representative achievement when source-backed, but do not label the tab as product.',
    };
  }

  if (hasModelFamilySignal(product)) {
    reasons.push('model_family_or_ai_model_category');
    return {
      bucket: 'model_family',
      reasons,
      recommendedAction: 'Keep when it names a canonical model family; review if it is a release/version hidden in the description.',
    };
  }

  if (hasProductPlatformSignal(product)) {
    reasons.push('product_platform_or_tool_category');
    return {
      bucket: 'product_platform_or_tool',
      reasons,
      recommendedAction: 'Generally safe as a representative achievement if the person relation is source-backed.',
    };
  }

  const body = text(product);
  if (!body.trim()) reasons.push('empty_or_malformed_product');
  return {
    bucket: 'uncategorized',
    reasons,
    recommendedAction: 'Manual review required.',
  };
}

function summarize(items: ProductReviewRow[], key: (item: ProductReviewRow) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const value = key(item);
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const people = await sql`
    SELECT id, name, status, "currentTitle", organization, topics, products
    FROM "People"
    WHERE products IS NOT NULL
    ORDER BY name
  ` as PeopleRow[];

  const rows: ProductReviewRow[] = [];
  for (const person of people) {
    for (const product of asProducts(person.products)) {
      const bucket = bucketProduct(product);
      rows.push({
        personId: person.id,
        person: person.name,
        status: person.status,
        currentTitle: person.currentTitle,
        organization: person.organization || [],
        topics: person.topics || [],
        product,
        ...bucket,
      });
    }
  }

  rows.sort((a, b) => a.bucket.localeCompare(b.bucket)
    || a.person.localeCompare(b.person)
    || String(a.product.name || '').localeCompare(String(b.product.name || '')));

  const payload = {
    generatedAt: new Date().toISOString(),
    summary: {
      peopleWithProducts: people.length,
      totalProductRows: rows.length,
      byBucket: summarize(rows, row => row.bucket),
      byStatus: summarize(rows, row => row.status),
    },
    guidance: {
      targetUiLabel: '代表成果',
      productFamilyRule: 'Founder/executive pages should prefer canonical product families over individual model versions or API channels.',
      researchRule: 'Frameworks, methods, datasets, and benchmarks can remain as representative achievements when source-backed.',
      apiRule: 'APIs and SDKs should normally be folded into their parent platform unless the person specifically owns that developer product.',
    },
    rows,
  };

  const outPath = path.join(process.cwd(), OUT);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`Product review buckets written: ${OUT}`);
  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
