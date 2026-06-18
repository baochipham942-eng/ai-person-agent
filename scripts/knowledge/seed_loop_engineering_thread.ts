#!/usr/bin/env tsx
import { createHash } from 'node:crypto';

const THREAD_SLUG = 'loop-engineering';

interface SeedSource {
  key: string;
  role: string;
  sourceKind: string;
  sourceOwner?: string;
  title: string;
  url: string;
  summary: string;
  evidenceQuote?: string;
  relevanceScore: number;
  sourceWeight: number;
}

interface SeedEdge {
  fromKey: string;
  toKey: string;
  relationType: string;
  confidence: number;
  evidenceNote: string;
}

const seedSources: SeedSource[] = [
  {
    key: 'signal-boris-cherny',
    role: 'signal',
    sourceKind: 'x_signal',
    sourceOwner: 'Boris Cherny',
    title: 'Loop Engineering X signal',
    url: 'https://x.com/bcherny',
    summary: 'Freshness signal for the term. Needs exact reviewed post URL before import.',
    relevanceScore: 0.85,
    sourceWeight: 0.7,
  },
  {
    key: 'official-claude-code-docs',
    role: 'official_definition',
    sourceKind: 'official_doc',
    sourceOwner: 'Anthropic',
    title: 'Claude Code official docs',
    url: 'https://docs.anthropic.com/en/docs/claude-code',
    summary: 'Official material should anchor the product boundary and definition.',
    relevanceScore: 0.9,
    sourceWeight: 1,
  },
  {
    key: 'transcript-workflow-explanation',
    role: 'transcript_context',
    sourceKind: 'transcript',
    sourceOwner: 'Interview or product team',
    title: 'Coding-agent workflow transcript candidate',
    url: 'https://www.youtube.com/results?search_query=Claude+Code+workflow+interview',
    summary: 'Candidate placeholder until S1 provides a reviewed transcript URL and text.',
    relevanceScore: 0.72,
    sourceWeight: 0.8,
  },
  {
    key: 'paper-agentic-coding',
    role: 'paper_foundation',
    sourceKind: 'paper',
    title: 'Agentic coding and tool-use paper candidate',
    url: 'https://arxiv.org/search/cs?query=agentic+coding+tool+use&searchtype=all',
    summary: 'Candidate placeholder for method roots, evals, or technical constraints.',
    relevanceScore: 0.68,
    sourceWeight: 0.8,
  },
  {
    key: 'implementation-developer-workflow',
    role: 'implementation_signal',
    sourceKind: 'implementation_signal',
    sourceOwner: 'Developer ecosystem',
    title: 'Implementation source candidate',
    url: 'https://github.com/search?q=Claude+Code+workflow&type=repositories',
    summary: 'Candidate placeholder until S1 provides reviewed GitHub, example, SDK, or developer workflow material.',
    relevanceScore: 0.62,
    sourceWeight: 0.7,
  },
];

const seedEdges: SeedEdge[] = [
  {
    fromKey: 'signal-boris-cherny',
    toKey: 'official-claude-code-docs',
    relationType: 'tweet_keyword_to_official_definition',
    confidence: 0.4,
    evidenceNote: 'Dry-run candidate edge. Requires reviewed post and official quote before import.',
  },
  {
    fromKey: 'official-claude-code-docs',
    toKey: 'paper-agentic-coding',
    relationType: 'productized_as_to_method_foundation',
    confidence: 0.4,
    evidenceNote: 'Dry-run candidate edge. Requires reviewed product and paper linkage before import.',
  },
];

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.execute) {
    console.error('Refusing to write. This S2 seed is a dry-run skeleton; replace placeholders with reviewed S1 sources before enabling writes.');
    process.exitCode = 1;
    return;
  }

  const generatedAt = new Date().toISOString();
  const sourceRows = seedSources.map(source => ({
    key: source.key,
    sourceKind: source.sourceKind,
    sourceOwner: source.sourceOwner ?? null,
    title: source.title,
    url: source.url,
    urlHash: hashUrl(source.url),
    text: source.summary,
    metadata: {
      seed: THREAD_SLUG,
      generatedAt,
      reviewStatus: 'candidate_placeholder',
    },
  }));

  const threadSourceRows = seedSources.map(source => ({
    threadSlug: THREAD_SLUG,
    sourceKey: source.key,
    role: source.role,
    relevanceScore: source.relevanceScore,
    sourceWeight: source.sourceWeight,
    evidenceQuote: source.evidenceQuote ?? null,
    summary: source.summary,
    metadata: {
      seed: THREAD_SLUG,
      needsReview: true,
    },
  }));

  const output = {
    dryRun: true,
    generatedAt,
    thread: {
      slug: THREAD_SLUG,
      title: 'Loop Engineering',
      summary: 'A source-backed knowledge thread for iterative coding-agent workflows.',
      whyNow: 'Claude Code and adjacent coding agents are making workflow loops a product and research object, but the topic needs technical evidence separated from person-centric RawPoolItem data.',
      status: 'draft',
      priorityScore: 0.8,
      confidence: 0.3,
      category: 'agentic_coding',
      tags: ['coding_agents', 'workflow', 'claude_code'],
      aliases: ['coding loop', 'agentic coding workflow'],
      refreshCadenceDays: 14,
    },
    sources: sourceRows,
    threadSources: threadSourceRows,
    edges: seedEdges,
    counts: {
      sources: sourceRows.length,
      threadSources: threadSourceRows.length,
      edges: seedEdges.length,
    },
    optionalFutureContext: 'Company strategy, earnings, and IR materials can link back later through company_strategy_context or organization pages, but they are not required for Loop Engineering publish readiness.',
    nextStep: 'Replace placeholder URLs and summaries with the reviewed S1 source pack, then add an explicit write path in a later task.',
  };

  console.log(JSON.stringify(options.pretty ? output : compactOutput(output), null, options.pretty ? 2 : 0));
}

function parseArgs(args: string[]) {
  return {
    execute: args.includes('--execute'),
    pretty: !args.includes('--compact'),
  };
}

function hashUrl(url: string): string {
  return createHash('sha256').update(url.trim().toLowerCase()).digest('hex');
}

function compactOutput<T>(value: T): T {
  return value;
}

main();
