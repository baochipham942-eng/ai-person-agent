import { prisma } from '@/lib/db/prisma';
import { workTypeLabel } from '@/lib/work-taxonomy';
import type { PaperGuide } from './schemas';
import type { PaperRelatedThread, PaperRelatedWork, PaperSourceRecord } from './types';
import { buildPaperIdentityKeys } from './identity';
import { paperAbstract } from './metadata';
import { withNeonWakeup } from './storage';
import {
  asRecord,
  normalizeComparablePaperUrl,
  normalizePaperTitleKey,
} from './utils';

export async function getPaperRelatedWorks(
  source: PaperSourceRecord,
  guide: PaperGuide,
  relatedThreads: PaperRelatedThread[] = [],
): Promise<PaperRelatedWork[]> {
  const metadata = asRecord(source.metadata);
  const identifiers = buildPaperIdentityKeys(source, metadata);
  const abstract = paperAbstract(source, metadata);
  const titleKey = normalizePaperTitleKey(source.title);
  const paperTextKey = normalizePaperTitleKey([
    abstract,
    guide.summary,
    guide.problem,
    guide.novelty,
    guide.method,
    guide.experiments,
    guide.limitations,
    guide.fit.whyRelevantToProduct,
  ].join(' '));
  const threadSlugs = new Set(relatedThreads.map(thread => thread.slug));

  const products = await withNeonWakeup(() => prisma.product.findMany({
    select: {
      slug: true,
      name: true,
      aliases: true,
      type: true,
      organizationName: true,
      url: true,
      threadSlugs: true,
      priorityScore: true,
    },
    orderBy: { priorityScore: 'desc' },
    take: 200,
  }));

  const matches: PaperRelatedWork[] = [];
  for (const product of products) {
    const urlKey = normalizeComparablePaperUrl(product.url);
    if (urlKey && identifiers.urls.has(urlKey)) {
      matches.push(paperRelatedWorkFromProduct(product, 'work_url', 0.96));
      continue;
    }

    const names = [product.name, ...product.aliases];
    const nameKeys = [...new Set(names.map(normalizePaperTitleKey).filter(isSafeWorkNeedle))];
    if (nameKeys.some(nameKey => containsNormalizedPhrase(titleKey, nameKey))) {
      matches.push(paperRelatedWorkFromProduct(product, 'title_mention', 0.9));
      continue;
    }

    if (nameKeys.some(nameKey => containsNormalizedPhrase(paperTextKey, nameKey))) {
      matches.push(paperRelatedWorkFromProduct(product, 'paper_text_mention', 0.76));
      continue;
    }

    if (product.threadSlugs.some(slug => threadSlugs.has(slug))) {
      matches.push(paperRelatedWorkFromProduct(product, 'thread_overlap', 0.68));
    }
  }

  return matches
    .sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name))
    .slice(0, 6);
}

function paperRelatedWorkFromProduct(
  product: {
    slug: string;
    name: string;
    type: string;
    organizationName: string | null;
    url: string | null;
  },
  matchReason: PaperRelatedWork['matchReason'],
  confidence: number,
): PaperRelatedWork {
  return {
    slug: product.slug,
    name: product.name,
    href: `/work/${product.slug}`,
    type: product.type,
    typeLabel: workTypeLabel(product.type),
    organizationName: product.organizationName,
    url: product.url,
    confidence,
    matchReason,
  };
}

const GENERIC_WORK_NEEDLES = new Set([
  'ai',
  'agent',
  'agents',
  'code',
  'datasets',
  'framework',
  'github',
  'gpt',
  'model',
  'models',
  'paper',
  'papers',
  'research',
  'tool',
]);

function isSafeWorkNeedle(value: string): boolean {
  if (!value || GENERIC_WORK_NEEDLES.has(value)) return false;
  const tokens = value.split(/\s+/).filter(Boolean);
  return value.length >= 7 || tokens.length >= 2;
}

function containsNormalizedPhrase(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}
