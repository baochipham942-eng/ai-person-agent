import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const DEFAULT_PLAN = 'exports/youtube-captions/plans/youtube_caption_plan.json';
const DEFAULT_MANIFESTS = [
  'exports/youtube-captions/worker-bundle/remaining_manifest.jsonl',
  'exports/youtube-captions/review/newly_filled_from_supplement.jsonl',
];
const DEFAULT_SOURCE_DIRS = [
  'exports/youtube-captions/subtitles/local',
  '/Users/linchen/Downloads/remaining',
];

const prisma = new PrismaClient();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const videoIndex = loadVideoIndex(options);
  const captionGroups = loadCaptionGroups(options.sourceDirs);
  const selected = buildImportItems(captionGroups, videoIndex, options);
  const limited = Number.isFinite(options.limit) ? selected.slice(0, options.limit) : selected;

  const summary = {
    mode: options.execute ? 'execute' : 'dry-run',
    sourceDirs: options.sourceDirs,
    captionVideosFound: captionGroups.size,
    mappedCaptionVideos: selected.length,
    importRows: limited.reduce((sum, item) => sum + item.personRows.length, 0),
    skipped: {
      missingMapping: selected.missingMapping || 0,
      tooShort: selected.tooShort || 0,
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!options.execute) {
    printPreview(limited);
    console.log('\nDry-run only. Add --execute to insert or update RawPoolItem rows.');
    return;
  }

  const result = await importItems(limited, options);
  console.log(JSON.stringify(result, null, 2));
}

function loadVideoIndex(options) {
  const byVideoId = new Map();

  if (fs.existsSync(options.plan)) {
    const plan = JSON.parse(fs.readFileSync(options.plan, 'utf8'));
    for (const batch of Object.values(plan.batches || {})) {
      for (const item of batch.items || []) {
        addVideoIndexItem(byVideoId, item);
      }
    }
  }

  for (const manifestPath of options.manifests) {
    if (!fs.existsSync(manifestPath)) continue;
    const lines = fs.readFileSync(manifestPath, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      addVideoIndexItem(byVideoId, JSON.parse(line));
    }
  }

  return byVideoId;
}

function addVideoIndexItem(byVideoId, item) {
  if (!item?.videoId) return;
  const existing = byVideoId.get(item.videoId);
  const merged = {
    ...(existing || {}),
    ...item,
    sourceItems: mergeSourceItems(existing?.sourceItems || [], item.sourceItems || sourceItemsFromPrimary(item)),
  };
  byVideoId.set(item.videoId, merged);
}

function sourceItemsFromPrimary(item) {
  if (!item.primaryPerson?.id) return [];
  return [{
    personId: item.primaryPerson.id,
    personName: item.primaryPerson.name,
    title: item.title || '',
    url: item.url || normalizeYouTubeUrl(item.videoId),
    originalUrl: item.url || normalizeYouTubeUrl(item.videoId),
    publishedAt: null,
    isOfficial: false,
    videoCategory: null,
    channelId: null,
    author: null,
  }];
}

function mergeSourceItems(left, right) {
  const byPerson = new Map();
  for (const item of [...left, ...right]) {
    if (!item?.personId) continue;
    byPerson.set(item.personId, { ...(byPerson.get(item.personId) || {}), ...item });
  }
  return [...byPerson.values()];
}

function loadCaptionGroups(sourceDirs) {
  const groups = new Map();
  for (const dir of sourceDirs) {
    const root = path.resolve(dir);
    if (!fs.existsSync(root)) continue;
    for (const file of walk(root)) {
      if (!/\.(vtt|srt|json3)$/i.test(file)) continue;
      const videoId = inferVideoId(file);
      if (!videoId) continue;
      const files = groups.get(videoId) || [];
      files.push(file);
      groups.set(videoId, files);
    }
  }
  return groups;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(fullPath);
    else if (entry.isFile()) yield fullPath;
  }
}

function inferVideoId(file) {
  const parent = path.basename(path.dirname(file));
  if (/^[A-Za-z0-9_-]{11}$/.test(parent)) return parent;
  const base = path.basename(file);
  const match = base.match(/^([A-Za-z0-9_-]{11})[.\-]/);
  return match?.[1] || null;
}

function buildImportItems(captionGroups, videoIndex, options) {
  const items = [];
  let missingMapping = 0;
  let tooShort = 0;

  for (const [videoId, files] of captionGroups) {
    const candidate = videoIndex.get(videoId);
    if (!candidate) {
      missingMapping += 1;
      continue;
    }

    const best = chooseBestCaption(files);
    const transcript = readCaptionText(best);
    if (transcript.length < options.minChars) {
      tooShort += 1;
      continue;
    }

    const sourceItems = mergeSourceItems([], candidate.sourceItems || sourceItemsFromPrimary(candidate));
    if (!sourceItems.length) {
      missingMapping += 1;
      continue;
    }

    items.push({
      videoId,
      url: candidate.url || normalizeYouTubeUrl(videoId),
      title: candidate.title || `YouTube video ${videoId}`,
      transcript,
      captionFile: best,
      captionBytes: fs.statSync(best).size,
      personRows: sourceItems.map(source => ({
        personId: source.personId,
        personName: source.personName || candidate.primaryPerson?.name || '',
        publishedAt: source.publishedAt || candidate.publishedAt || null,
        originalRawPoolItemId: source.id || null,
        isOfficial: source.isOfficial === true,
        videoCategory: source.videoCategory || null,
        channelId: source.channelId || null,
        author: source.author || null,
      })),
    });
  }

  items.sort((left, right) => left.title.localeCompare(right.title));
  items.missingMapping = missingMapping;
  items.tooShort = tooShort;
  return items;
}

function chooseBestCaption(files) {
  return [...files].sort((left, right) => scoreCaptionFile(right) - scoreCaptionFile(left) || right.localeCompare(left))[0];
}

function scoreCaptionFile(file) {
  const name = path.basename(file).toLowerCase();
  const bytes = fs.statSync(file).size;
  let score = Math.min(bytes / 10_000, 50);
  if (/\.(en|en-us|en-gb|en-orig)(?:[.\-]|$)/.test(name)) score += 40;
  if (/\.(zh-hans|zh|zh-cn)(?:[.\-]|$)/.test(name)) score += 34;
  if (name.includes('.manual.') || !name.includes('.auto.')) score += 14;
  if (name.includes('.auto.')) score -= 6;
  if (name.includes('fallback')) score += 2;
  return score;
}

function readCaptionText(file) {
  const raw = fs.readFileSync(file, 'utf8');
  if (/\.json3$/i.test(file)) return cleanCaptionLines(readJson3Lines(raw));
  return cleanCaptionLines(raw.split(/\r?\n/));
}

function readJson3Lines(raw) {
  try {
    const parsed = JSON.parse(raw);
    return (parsed.events || [])
      .flatMap(event => event.segs || [])
      .map(seg => seg.utf8 || '')
      .join('')
      .split(/\r?\n/);
  } catch {
    return [];
  }
}

function cleanCaptionLines(lines) {
  const cleaned = [];
  let previous = '';

  for (const originalLine of lines) {
    const line = decodeEntities(originalLine)
      .replace(/<[^>]+>/g, '')
      .replace(/\{\\an\d+\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!line) continue;
    if (/^(WEBVTT|Kind:|Language:|NOTE\b|STYLE\b|REGION\b)/i.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{1,2}:\d{2}:\d{2}[,.]\d{3}/.test(line)) continue;
    if (/^\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{2}:\d{2}[,.]\d{3}/.test(line)) continue;
    if (line === previous) continue;

    cleaned.push(line);
    previous = line;
  }

  return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

async function importItems(items, options) {
  const now = new Date();
  const rawRows = [];
  const auditRows = [];

  for (const item of items) {
    for (const person of item.personRows) {
      const urlHash = sha256(`${person.personId}:${item.url}:youtube-caption:${item.videoId}`);
      const contentHash = sha256(item.transcript);
      const title = `YouTube 字幕：${item.title}`;
      const metadata = {
        sourceKind: 'youtube_caption',
        videoId: item.videoId,
        captionFile: item.captionFile,
        captionBytes: item.captionBytes,
        importedAt: now.toISOString(),
        originalRawPoolItemId: person.originalRawPoolItemId,
        isOfficial: person.isOfficial,
        videoCategory: person.videoCategory,
        channelId: person.channelId,
        author: person.author,
      };

      rawRows.push({
        personId: person.personId,
        sourceType: 'youtube',
        url: item.url,
        urlHash,
        contentHash,
        title,
        text: item.transcript,
        publishedAt: person.publishedAt ? new Date(person.publishedAt) : null,
        metadata,
        fetchStatus: 'success',
        errorCode: null,
        fetchedAt: now,
      });

      auditRows.push({
        personId: person.personId,
        url: item.url,
        urlHash,
        sourceType: 'youtube',
        stage: 'caption_import',
        verdict: 'keep',
        aboutPerson: 0.7,
        aiRelevant: 0.7,
        quality: Math.min(0.95, Math.max(0.55, item.transcript.length / 10_000)),
        reason: `Imported local YouTube caption transcript for PK report context. videoId=${item.videoId}`,
      });
    }
  }

  const urlHashes = rawRows.map(row => row.urlHash);
  const existingRawRows = await prisma.rawPoolItem.findMany({
    where: { urlHash: { in: urlHashes } },
    select: { urlHash: true },
  });
  const existingRawHashes = new Set(existingRawRows.map(row => row.urlHash));
  const rawRowsToCreate = rawRows.filter(row => !existingRawHashes.has(row.urlHash));
  const rawRowsToUpdate = options.updateExisting
    ? rawRows.filter(row => existingRawHashes.has(row.urlHash))
    : [];

  const createdRaw = rawRowsToCreate.length
    ? await prisma.rawPoolItem.createMany({
      data: rawRowsToCreate,
      skipDuplicates: true,
    })
    : { count: 0 };

  let updatedRaw = 0;
  for (const chunk of chunks(rawRowsToUpdate, options.updateConcurrency)) {
    await Promise.all(chunk.map(row => prisma.rawPoolItem.update({
      where: { urlHash: row.urlHash },
      data: {
        contentHash: row.contentHash,
        title: row.title,
        text: row.text,
        publishedAt: row.publishedAt,
        metadata: row.metadata,
        fetchStatus: row.fetchStatus,
        errorCode: row.errorCode,
        fetchedAt: row.fetchedAt,
      },
    })));
    updatedRaw += chunk.length;
  }

  let auditsCreated = 0;
  if (options.audit) {
    const existingAuditRows = await prisma.qAAuditLog.findMany({
      where: {
        urlHash: { in: urlHashes },
        stage: 'caption_import',
        verdict: 'keep',
      },
      select: {
        personId: true,
        urlHash: true,
      },
    });
    const existingAuditKeys = new Set(existingAuditRows.map(row => `${row.personId}:${row.urlHash}`));
    const auditRowsToCreate = auditRows.filter(row => !existingAuditKeys.has(`${row.personId}:${row.urlHash}`));
    const createdAudit = auditRowsToCreate.length
      ? await prisma.qAAuditLog.createMany({ data: auditRowsToCreate })
      : { count: 0 };
    auditsCreated = createdAudit.count;
  }

  return {
    processedVideos: items.length,
    existingRawPoolItems: existingRawHashes.size,
    createdRawPoolItems: createdRaw.count,
    updatedRawPoolItems: updatedRaw,
    auditsCreated,
  };
}

function chunks(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function printPreview(items) {
  for (const item of items.slice(0, 8)) {
    console.log([
      item.videoId,
      item.personRows.map(person => person.personName || person.personId).join(', '),
      `${item.transcript.length} chars`,
      path.basename(item.captionFile),
      item.title,
    ].join('\t'));
  }
}

function parseArgs(args) {
  const options = {
    execute: false,
    audit: true,
    plan: DEFAULT_PLAN,
    manifests: [...DEFAULT_MANIFESTS],
    sourceDirs: [...DEFAULT_SOURCE_DIRS],
    limit: Number.POSITIVE_INFINITY,
    minChars: 80,
    updateExisting: false,
    updateConcurrency: 8,
  };

  for (const arg of args) {
    if (arg === '--execute') options.execute = true;
    else if (arg === '--no-audit') options.audit = false;
    else if (arg === '--update-existing') options.updateExisting = true;
    else if (arg.startsWith('--plan=')) options.plan = arg.slice('--plan='.length);
    else if (arg.startsWith('--manifest=')) options.manifests.push(arg.slice('--manifest='.length));
    else if (arg.startsWith('--source-dir=')) {
      if (options.sourceDirs.join('|') === DEFAULT_SOURCE_DIRS.join('|')) options.sourceDirs = [];
      options.sourceDirs.push(arg.slice('--source-dir='.length));
    } else if (arg.startsWith('--limit=')) {
      options.limit = Number.parseInt(arg.slice('--limit='.length), 10);
    } else if (arg.startsWith('--min-chars=')) {
      options.minChars = Number.parseInt(arg.slice('--min-chars='.length), 10);
    } else if (arg.startsWith('--update-concurrency=')) {
      options.updateConcurrency = Math.max(1, Number.parseInt(arg.slice('--update-concurrency='.length), 10));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.plan = path.resolve(options.plan);
  options.manifests = options.manifests.map(item => path.resolve(item));
  options.sourceDirs = options.sourceDirs.map(item => path.resolve(item));
  return options;
}

function normalizeYouTubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
