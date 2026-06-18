#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

neonConfig.webSocketConstructor = ws;

const DEFAULT_INPUT = 'docs/knowledge-threads/loop-engineering-sources.candidates.json';
const REQUIRED_ROLES = [
  'signal',
  'official_definition',
  'transcript_context',
  'paper_foundation',
  'implementation_signal',
];
const DEFAULT_THREAD = {
  slug: 'loop-engineering',
  title: 'Loop Engineering',
  summary: 'Source-backed knowledge thread for iterative coding-agent workflows.',
  whyNow: 'Reviewed X, official docs, transcripts, papers, and implementation sources now cover the required evidence roles.',
  category: 'agentic_coding',
  tags: ['coding_agents', 'workflow', 'claude_code'],
  aliases: ['coding loop', 'agentic coding workflow'],
};

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const payload = readJson(options.input);
  const thread = normalizeThread(payload, options);
  const sources = normalizeSources(payload);
  const edges = normalizeEdges(payload);
  const review = reviewPack({ sources, edges, requiredRoles: options.requiredRoles });
  const db = getDbInfo();

  const summary = {
    dryRun: !options.execute,
    input: path.resolve(options.input),
    db,
    thread,
    review,
    rows: {
      knowledgeThread: 1,
      knowledgeSources: sources.length,
      knowledgeThreadSources: sources.length,
      knowledgeThreadEdges: edges.length,
    },
    sample: {
      sources: sources.slice(0, 3).map(source => ({
        id: source.id,
        role: source.role,
        title: source.title,
        url: source.url,
      })),
      edges: edges.slice(0, 3),
    },
  };

  if (!options.execute) {
    writeSummary(summary, options.output);
    return;
  }

  assertWritableDb(db, options);
  if (!review.pass) {
    throw new Error(`Refusing to materialize a non-ready pack: ${JSON.stringify(review)}`);
  }

  const prisma = createPrismaClient();
  try {
    const result = await materialize({ prisma, thread, sources, edges });
    writeSummary({ ...summary, materialized: result }, options.output);
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    output: null,
    execute: false,
    allowRemoteDev: false,
    status: 'review_ready',
    confidence: 0.82,
    priorityScore: 0.8,
    requiredRoles: REQUIRED_ROLES,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--allow-remote-dev') options.allowRemoteDev = true;
    else if (arg.startsWith('--input=')) options.input = arg.slice('--input='.length);
    else if (arg.startsWith('--output=')) options.output = arg.slice('--output='.length);
    else if (arg.startsWith('--status=')) options.status = arg.slice('--status='.length);
    else if (arg.startsWith('--confidence=')) options.confidence = Number(arg.slice('--confidence='.length));
    else if (arg.startsWith('--priority-score=')) options.priorityScore = Number(arg.slice('--priority-score='.length));
    else if (arg.startsWith('--required-role=')) {
      if (options.requiredRoles === REQUIRED_ROLES) options.requiredRoles = [];
      options.requiredRoles.push(arg.slice('--required-role='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function normalizeThread(payload, options) {
  const sourceThread = payload.thread || {};
  return {
    id: `knowledge-thread:${sourceThread.slug || DEFAULT_THREAD.slug}`,
    slug: sourceThread.slug || DEFAULT_THREAD.slug,
    title: sourceThread.title || DEFAULT_THREAD.title,
    summary: sourceThread.summary || sourceThread.definitionDraft || DEFAULT_THREAD.summary,
    whyNow: sourceThread.whyNow || DEFAULT_THREAD.whyNow,
    status: options.status,
    priorityScore: finiteNumber(options.priorityScore, 0.8),
    confidence: finiteNumber(options.confidence, 0.82),
    category: sourceThread.category || DEFAULT_THREAD.category,
    tags: Array.isArray(sourceThread.tags) ? sourceThread.tags : DEFAULT_THREAD.tags,
    aliases: Array.isArray(sourceThread.aliases) ? sourceThread.aliases : DEFAULT_THREAD.aliases,
    refreshCadenceDays: finiteNumber(sourceThread.refreshCadenceDays, 14),
    lastReviewedAt: sourceThread.updatedAt ? toDate(sourceThread.updatedAt) : new Date(),
  };
}

function normalizeSources(payload) {
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  return sources.map(source => ({
    id: source.id,
    role: source.metadata?.role || source.role,
    sourceKind: source.sourceKind || 'unknown',
    sourceOwner: source.sourceOwner || source.owner || ownerFromUrl(source.url),
    title: source.title || source.id || source.url,
    url: source.url,
    urlHash: source.urlHash,
    text: source.text || buildReviewText(source),
    publishedAt: toDate(source.publishedAt),
    fetchedAt: new Date(),
    relevanceScore: finiteNumber(source.confidence ?? source.relevanceScore, 0.8),
    sourceWeight: source.role === 'official_definition' ? 1 : 0.8,
    evidenceQuote: source.evidenceQuote || null,
    summary: source.whyRelevant || source.summary || null,
    status: source.status || defaultSourceStatus(source.role),
    metadata: {
      ...(source.metadata || {}),
      packSourceId: source.id,
      reviewNotes: source.reviewNotes || null,
      whyRelevant: source.whyRelevant || null,
      textStatus: source.metadata?.textStatus || 'review_summary_not_fulltext',
    },
  }));
}

function normalizeEdges(payload) {
  const edges = Array.isArray(payload.edges) ? payload.edges : [];
  return edges
    .map(edge => ({
      ...edge,
      fromSourceId: edge.fromSourceId || edge.fromId,
      toSourceId: edge.toSourceId || edge.toId,
    }))
    .filter(edge => edge.fromSourceId && edge.toSourceId && edge.relationType)
    .map(edge => ({
      id: edge.id || `${edge.fromSourceId}--${edge.toSourceId}--${edge.relationType}`,
      fromSourceId: edge.fromSourceId,
      toSourceId: edge.toSourceId,
      relationType: edge.relationType,
      confidence: finiteNumber(edge.confidence, 0.7),
      evidenceNote: edge.evidenceNote || null,
    }));
}

function reviewPack({ sources, edges, requiredRoles }) {
  const roleCounts = sources.reduce((acc, source) => {
    acc[source.role || 'unknown'] = (acc[source.role || 'unknown'] || 0) + 1;
    return acc;
  }, {});
  const missingRoles = requiredRoles.filter(role => !roleCounts[role]);
  const duplicateUrlHashes = duplicateKeys(sources.map(source => source.urlHash).filter(Boolean));
  const missingFields = sources
    .filter(source => !source.id || !source.role || !source.url || !source.urlHash || !source.title || !source.text)
    .map(source => ({ id: source.id || null, role: source.role || null, url: source.url || null }));
  const danglingEdges = edges
    .filter(edge => !sources.some(source => source.id === edge.fromSourceId) || !sources.some(source => source.id === edge.toSourceId))
    .map(edge => edge.id);

  return {
    pass: missingRoles.length === 0
      && duplicateUrlHashes.length === 0
      && missingFields.length === 0
      && danglingEdges.length === 0,
    roleCounts,
    missingRoles,
    duplicateUrlHashes,
    missingFields,
    danglingEdges,
  };
}

async function materialize({ prisma, thread, sources, edges }) {
  const result = {
    threadUpserted: false,
    sourcesUpserted: 0,
    threadSourcesUpserted: 0,
    edgesUpserted: 0,
  };

  const persistedThread = await prisma.knowledgeThread.upsert({
    where: { slug: thread.slug },
    update: {
      title: thread.title,
      summary: thread.summary,
      whyNow: thread.whyNow,
      status: thread.status,
      priorityScore: thread.priorityScore,
      confidence: thread.confidence,
      category: thread.category,
      tags: thread.tags,
      aliases: thread.aliases,
      refreshCadenceDays: thread.refreshCadenceDays,
      lastReviewedAt: thread.lastReviewedAt,
    },
    create: thread,
  });
  const sourceIdByPackId = new Map();
  result.threadUpserted = true;

  for (const source of sources) {
    const persistedSource = await prisma.knowledgeSource.upsert({
      where: { urlHash: source.urlHash },
      update: {
        sourceKind: source.sourceKind,
        sourceOwner: source.sourceOwner,
        title: source.title,
        url: source.url,
        text: source.text,
        publishedAt: source.publishedAt,
        fetchedAt: source.fetchedAt,
        metadata: source.metadata,
      },
      create: {
        id: source.id,
        sourceKind: source.sourceKind,
        sourceOwner: source.sourceOwner,
        title: source.title,
        url: source.url,
        urlHash: source.urlHash,
        text: source.text,
        publishedAt: source.publishedAt,
        fetchedAt: source.fetchedAt,
        metadata: source.metadata,
      },
    });
    sourceIdByPackId.set(source.id, persistedSource.id);
    result.sourcesUpserted += 1;

    const sourceId = persistedSource.id;
    await prisma.knowledgeThreadSource.upsert({
      where: {
        threadId_sourceId_role: {
          threadId: persistedThread.id,
          sourceId,
          role: source.role,
        },
      },
      update: {
        relevanceScore: source.relevanceScore,
        sourceWeight: source.sourceWeight,
        evidenceQuote: source.evidenceQuote,
        summary: source.summary,
        metadata: {
          ...source.metadata,
          status: source.status,
        },
      },
      create: {
        id: `knowledge-thread-source:${thread.slug}:${source.id}:${source.role}`,
        threadId: persistedThread.id,
        sourceId,
        role: source.role,
        relevanceScore: source.relevanceScore,
        sourceWeight: source.sourceWeight,
        evidenceQuote: source.evidenceQuote,
        summary: source.summary,
        metadata: {
          ...source.metadata,
          status: source.status,
        },
      },
    });
    result.threadSourcesUpserted += 1;
  }

  for (const edge of edges) {
    const fromSourceId = sourceIdByPackId.get(edge.fromSourceId) || edge.fromSourceId;
    const toSourceId = sourceIdByPackId.get(edge.toSourceId) || edge.toSourceId;
    await prisma.knowledgeThreadEdge.upsert({
      where: {
        threadId_fromSourceId_toSourceId_relationType: {
          threadId: persistedThread.id,
          fromSourceId,
          toSourceId,
          relationType: edge.relationType,
        },
      },
      update: {
        confidence: edge.confidence,
        evidenceNote: edge.evidenceNote,
      },
      create: {
        id: `knowledge-thread-edge:${thread.slug}:${edge.id}`,
        threadId: persistedThread.id,
        fromSourceId,
        toSourceId,
        relationType: edge.relationType,
        confidence: edge.confidence,
        evidenceNote: edge.evidenceNote,
      },
    });
    result.edgesUpserted += 1;
  }

  return result;
}

function createPrismaClient() {
  if (getDbInfo().local) return new PrismaClient();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter: new PrismaNeon(pool) });
}

function getDbInfo() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { configured: false, host: null, database: null, local: false };
  try {
    const url = new URL(connectionString);
    return {
      configured: true,
      host: url.hostname,
      database: url.pathname.replace(/^\//, '') || null,
      local: ['localhost', '127.0.0.1', '::1'].includes(url.hostname),
    };
  } catch {
    return { configured: true, host: 'unparseable', database: null, local: false };
  }
}

function assertWritableDb(db, options) {
  if (!db.configured) throw new Error('DATABASE_URL is not configured.');
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('Refusing to materialize while NODE_ENV=production or VERCEL is set.');
  }
  if (!db.local && !options.allowRemoteDev) {
    throw new Error(`Refusing to write to remote database host "${db.host}". Re-run with --allow-remote-dev only after confirming this is a dev database.`);
  }
}

function defaultSourceStatus(role) {
  return role === 'signal' || role === 'transcript_context' ? 'usable' : 'verified';
}

function buildReviewText(source) {
  return [
    source.title,
    source.whyRelevant,
    source.evidenceQuote ? `Evidence note: ${source.evidenceQuote}` : null,
    source.reviewNotes,
  ].filter(Boolean).join('\n\n');
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ownerFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function duplicateKeys(keys) {
  const counts = keys.reduce((acc, key) => {
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
}

function writeSummary(payload, outputPath) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (!outputPath) {
    process.stdout.write(text);
    return;
  }
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outputPath), text);
}

function printHelp() {
  console.log(`
Usage:
  node scripts/knowledge/materialize_thread_pack.mjs --input=docs/knowledge-threads/loop-engineering-sources.candidates.json
  node scripts/knowledge/materialize_thread_pack.mjs --execute --allow-remote-dev

Default mode is dry-run. Writes are refused for remote DATABASE_URL unless --allow-remote-dev is present.
`);
}
