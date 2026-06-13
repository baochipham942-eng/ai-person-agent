import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const DEFAULT_OUT_DIR = 'exports/youtube-captions';
const READY_STATUSES = ['ready', 'active'];

const prisma = new PrismaClient();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const where = { sourceType: 'youtube' };
  if (!options.includeAllPeople) {
    where.person = { status: { in: READY_STATUSES } };
  }

  const rows = await prisma.rawPoolItem.findMany({
    where,
    select: {
      id: true,
      personId: true,
      url: true,
      title: true,
      text: true,
      publishedAt: true,
      fetchedAt: true,
      metadata: true,
      person: {
        select: {
          id: true,
          name: true,
          status: true,
          influenceScore: true,
          weeklyViewCount: true,
          viewCount: true,
        },
      },
    },
    orderBy: [
      { person: { influenceScore: 'desc' } },
      { fetchedAt: 'desc' },
    ],
  });

  const candidates = buildVideoCandidates(rows, options);
  const ordered = orderCandidates(candidates, options);
  const limited = Number.isFinite(options.limit) ? ordered.slice(0, options.limit) : ordered;
  const batches = splitBatches(limited, options);
  const plan = buildPlan(rows, candidates, batches, options);

  printSummary(plan);

  if (options.write) {
    writePlan(plan, options);
  } else {
    console.log('\nDry-run only. Add --write to save plan files.');
  }
}

function buildVideoCandidates(rows, options) {
  const byVideoId = new Map();
  let skippedMissingVideoId = 0;

  for (const row of rows) {
    const metadata = safeObject(row.metadata);
    const videoId = extractVideoId(row.url, metadata);

    if (!videoId) {
      skippedMissingVideoId += 1;
      continue;
    }

    const textLength = row.text?.length || 0;
    if (options.onlyThinBelow && textLength >= options.onlyThinBelow) {
      continue;
    }

    const sourceItem = {
      id: row.id,
      personId: row.personId,
      personName: row.person.name,
      personStatus: row.person.status,
      influenceScore: numberOrZero(row.person.influenceScore),
      weeklyViewCount: numberOrZero(row.person.weeklyViewCount),
      viewCount: numberOrZero(row.person.viewCount),
      title: row.title || '',
      url: normalizeYouTubeUrl(videoId),
      originalUrl: row.url,
      textLength,
      publishedAt: row.publishedAt?.toISOString?.() || null,
      fetchedAt: row.fetchedAt?.toISOString?.() || null,
      isOfficial: metadata.isOfficial === true,
      videoCategory: typeof metadata.videoCategory === 'string' ? metadata.videoCategory : null,
      channelId: typeof metadata.channelId === 'string' ? metadata.channelId : null,
      author: typeof metadata.author === 'string' ? metadata.author : null,
    };

    const current = byVideoId.get(videoId) || {
      videoId,
      url: normalizeYouTubeUrl(videoId),
      sourceItems: [],
      skippedMissingVideoId,
    };

    current.sourceItems.push(sourceItem);
    byVideoId.set(videoId, current);
  }

  const candidates = [];
  for (const candidate of byVideoId.values()) {
    candidate.sourceItems.sort(compareSourceItems);
    candidate.primary = candidate.sourceItems[0];
    candidate.people = summarizePeople(candidate.sourceItems);
    candidate.minTextLength = Math.min(...candidate.sourceItems.map(item => item.textLength));
    candidate.maxInfluenceScore = Math.max(...candidate.sourceItems.map(item => item.influenceScore));
    candidate.rawPoolItemCount = candidate.sourceItems.length;
    candidate.priorityScore = priorityScore(candidate);
    candidate.reasons = priorityReasons(candidate);
    candidate.title = candidate.primary.title;
    candidates.push(candidate);
  }

  return candidates;
}

function orderCandidates(candidates, options) {
  const byPerson = new Map();

  for (const candidate of candidates) {
    const personId = candidate.primary.personId;
    if (!byPerson.has(personId)) {
      byPerson.set(personId, {
        personId,
        name: candidate.primary.personName,
        influenceScore: candidate.primary.influenceScore,
        weeklyViewCount: candidate.primary.weeklyViewCount,
        viewCount: candidate.primary.viewCount,
        items: [],
      });
    }
    byPerson.get(personId).items.push(candidate);
  }

  const people = Array.from(byPerson.values()).sort(comparePeople);
  for (const person of people) {
    person.items.sort(compareCandidatesWithinPerson);
  }

  if (!options.perPersonLimit || options.perPersonLimit <= 0) {
    return people.flatMap(person => person.items);
  }

  const firstPass = [];
  const overflow = [];
  for (const person of people) {
    firstPass.push(...person.items.slice(0, options.perPersonLimit));
    overflow.push(...person.items.slice(options.perPersonLimit));
  }

  overflow.sort(compareCandidatesGlobal);
  return [...firstPass, ...overflow];
}

function splitBatches(items, options) {
  const localItems = items.slice(0, options.localLimit);
  const lobsterItems = items.slice(options.localLimit, options.localLimit + options.lobsterLimit);
  const deferredItems = items.slice(options.localLimit + options.lobsterLimit);

  return {
    local: buildBatch('local', 'local computer yt-dlp', localItems),
    lobster: buildBatch('lobster', 'lobster yt-dlp', lobsterItems),
    deferred: buildBatch('deferred', 'hold for later', deferredItems),
  };
}

function buildBatch(key, runner, items) {
  return {
    key,
    runner,
    count: items.length,
    peopleCount: new Set(items.map(item => item.primary.personId)).size,
    rawPoolItemCount: items.reduce((sum, item) => sum + item.rawPoolItemCount, 0),
    items: items.map(item => serializeCandidate(item)),
  };
}

function serializeCandidate(candidate) {
  return {
    videoId: candidate.videoId,
    url: candidate.url,
    title: candidate.title,
    priorityScore: round(candidate.priorityScore),
    reasons: candidate.reasons,
    minTextLength: candidate.minTextLength,
    rawPoolItemCount: candidate.rawPoolItemCount,
    primaryPerson: {
      id: candidate.primary.personId,
      name: candidate.primary.personName,
      influenceScore: candidate.primary.influenceScore,
      weeklyViewCount: candidate.primary.weeklyViewCount,
      viewCount: candidate.primary.viewCount,
    },
    people: candidate.people,
    sourceItems: candidate.sourceItems,
  };
}

function buildPlan(rows, candidates, batches, options) {
  const candidatesByVideo = new Map(candidates.map(item => [item.videoId, item]));
  const rowsWithVideoId = rows.filter(row => extractVideoId(row.url, safeObject(row.metadata))).length;

  return {
    generatedAt: new Date().toISOString(),
    description: 'YouTube caption fetch batches. Local handles highest-value videoIds, lobster handles the second batch, deferred is intentionally held back.',
    options: {
      localLimit: options.localLimit,
      lobsterLimit: options.lobsterLimit,
      perPersonLimit: options.perPersonLimit,
      onlyThinBelow: options.onlyThinBelow,
      includeAllPeople: options.includeAllPeople,
      limit: Number.isFinite(options.limit) ? options.limit : null,
    },
    source: {
      rawRows: rows.length,
      rowsWithVideoId,
      distinctVideoIds: candidatesByVideo.size,
      distinctPeople: new Set(candidates.flatMap(item => item.people.map(person => person.id))).size,
    },
    batches,
  };
}

function writePlan(plan, options) {
  const planDir = path.resolve(options.outDir, 'plans');
  fs.mkdirSync(planDir, { recursive: true });

  const planPath = path.join(planDir, 'youtube_caption_plan.json');
  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);

  for (const [batchKey, batch] of Object.entries(plan.batches)) {
    fs.writeFileSync(
      path.join(planDir, `${batchKey}_video_ids.txt`),
      `${batch.items.map(item => item.videoId).join('\n')}${batch.items.length ? '\n' : ''}`,
    );
    fs.writeFileSync(
      path.join(planDir, `${batchKey}_urls.txt`),
      `${batch.items.map(item => item.url).join('\n')}${batch.items.length ? '\n' : ''}`,
    );
    fs.writeFileSync(
      path.join(planDir, `${batchKey}_manifest.jsonl`),
      batch.items.map(item => JSON.stringify(item)).join('\n') + (batch.items.length ? '\n' : ''),
    );
  }

  console.log(`\nWrote plan: ${planPath}`);
  console.log(`Wrote batch files under: ${planDir}`);
}

function printSummary(plan) {
  console.log('YouTube caption batch plan');
  console.log(JSON.stringify({
    source: plan.source,
    options: plan.options,
    batches: Object.fromEntries(Object.entries(plan.batches).map(([key, batch]) => [
      key,
      {
        videos: batch.count,
        people: batch.peopleCount,
        rawPoolItems: batch.rawPoolItemCount,
      },
    ])),
  }, null, 2));

  for (const [key, batch] of Object.entries(plan.batches)) {
    const preview = batch.items.slice(0, 5).map(item => ({
      videoId: item.videoId,
      person: item.primaryPerson.name,
      influenceScore: item.primaryPerson.influenceScore,
      minTextLength: item.minTextLength,
      reasons: item.reasons,
      title: item.title,
    }));
    console.log(`\n${key} preview`);
    console.log(JSON.stringify(preview, null, 2));
  }
}

function comparePeople(a, b) {
  return (
    b.influenceScore - a.influenceScore ||
    b.weeklyViewCount - a.weeklyViewCount ||
    b.viewCount - a.viewCount ||
    a.name.localeCompare(b.name)
  );
}

function compareSourceItems(a, b) {
  return (
    b.influenceScore - a.influenceScore ||
    Number(a.textLength > 1000) - Number(b.textLength > 1000) ||
    a.textLength - b.textLength ||
    Number(b.isOfficial) - Number(a.isOfficial) ||
    String(b.fetchedAt || '').localeCompare(String(a.fetchedAt || '')) ||
    a.id.localeCompare(b.id)
  );
}

function compareCandidatesWithinPerson(a, b) {
  return (
    b.priorityScore - a.priorityScore ||
    a.minTextLength - b.minTextLength ||
    String(b.primary.publishedAt || '').localeCompare(String(a.primary.publishedAt || '')) ||
    a.videoId.localeCompare(b.videoId)
  );
}

function compareCandidatesGlobal(a, b) {
  return (
    b.maxInfluenceScore - a.maxInfluenceScore ||
    b.priorityScore - a.priorityScore ||
    a.minTextLength - b.minTextLength ||
    a.videoId.localeCompare(b.videoId)
  );
}

function priorityScore(candidate) {
  let score = candidate.maxInfluenceScore * 100;

  if (candidate.minTextLength < 200) score += 25;
  else if (candidate.minTextLength < 1000) score += 12;

  if (candidate.sourceItems.some(item => item.isOfficial)) score += 10;
  if (candidate.sourceItems.some(item => item.videoCategory === 'self_talk')) score += 8;
  if (candidate.sourceItems.some(item => item.videoCategory === 'interview')) score += 6;
  if (candidate.rawPoolItemCount > 1) score += Math.min(8, candidate.rawPoolItemCount);

  return score;
}

function priorityReasons(candidate) {
  const reasons = [];

  if (candidate.minTextLength < 200) reasons.push('thin_text_lt_200');
  else if (candidate.minTextLength < 1000) reasons.push('thin_text_lt_1000');
  if (candidate.sourceItems.some(item => item.isOfficial)) reasons.push('official_channel');
  if (candidate.sourceItems.some(item => item.videoCategory === 'self_talk')) reasons.push('self_talk');
  if (candidate.sourceItems.some(item => item.videoCategory === 'interview')) reasons.push('interview');
  if (candidate.rawPoolItemCount > 1) reasons.push('shared_video');

  return reasons;
}

function summarizePeople(sourceItems) {
  const byPerson = new Map();
  for (const item of sourceItems) {
    const current = byPerson.get(item.personId) || {
      id: item.personId,
      name: item.personName,
      influenceScore: item.influenceScore,
      rawPoolItemCount: 0,
    };
    current.rawPoolItemCount += 1;
    byPerson.set(item.personId, current);
  }
  return Array.from(byPerson.values()).sort((a, b) => b.influenceScore - a.influenceScore || a.name.localeCompare(b.name));
}

function extractVideoId(url, metadata = {}) {
  if (typeof metadata.videoId === 'string' && metadata.videoId.trim()) {
    return cleanVideoId(metadata.videoId);
  }

  if (!url) return null;
  const normalized = url.startsWith('//') ? `https:${url}` : url;

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      return cleanVideoId(parsed.pathname.split('/').filter(Boolean)[0]);
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const queryVideo = parsed.searchParams.get('v');
      if (queryVideo) return cleanVideoId(queryVideo);

      const parts = parsed.pathname.split('/').filter(Boolean);
      const knownPrefixes = new Set(['embed', 'shorts', 'live', 'v']);
      if (knownPrefixes.has(parts[0]) && parts[1]) return cleanVideoId(parts[1]);
    }
  } catch {
    // Fall through to regex extraction.
  }

  const match = normalized.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{6,})/);
  return match ? cleanVideoId(match[1]) : null;
}

function cleanVideoId(value) {
  if (!value) return null;
  const match = String(value).match(/[A-Za-z0-9_-]{6,}/);
  return match ? match[0] : null;
}

function normalizeYouTubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function round(value) {
  return Number(value.toFixed(4));
}

function parseArgs(args) {
  const options = {
    outDir: DEFAULT_OUT_DIR,
    localLimit: 200,
    lobsterLimit: 200,
    perPersonLimit: 8,
    onlyThinBelow: null,
    includeAllPeople: false,
    limit: Number.POSITIVE_INFINITY,
    write: false,
  };

  for (const arg of args) {
    if (arg === '--write') options.write = true;
    else if (arg === '--include-all-people') options.includeAllPeople = true;
    else if (arg.startsWith('--out-dir=')) options.outDir = arg.slice('--out-dir='.length);
    else if (arg.startsWith('--local-limit=')) options.localLimit = clampInteger(arg.slice('--local-limit='.length), 0, 10000, options.localLimit);
    else if (arg.startsWith('--lobster-limit=')) options.lobsterLimit = clampInteger(arg.slice('--lobster-limit='.length), 0, 10000, options.lobsterLimit);
    else if (arg.startsWith('--per-person-limit=')) options.perPersonLimit = clampInteger(arg.slice('--per-person-limit='.length), 0, 1000, options.perPersonLimit);
    else if (arg.startsWith('--only-thin-below=')) options.onlyThinBelow = clampInteger(arg.slice('--only-thin-below='.length), 1, 1000000, 0) || null;
    else if (arg.startsWith('--limit=')) options.limit = clampInteger(arg.slice('--limit='.length), 1, 1000000, options.limit);
  }

  return options;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
