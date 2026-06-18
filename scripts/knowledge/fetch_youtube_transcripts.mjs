#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  SOURCE_ROLES,
  buildPack,
  cleanText,
  fetchText,
  makeKnowledgeSource,
  parseArgs,
  readInputList,
  uniqueByUrl,
  writeJson,
} from './common.mjs';

const SCRIPT = 'fetch_youtube_transcripts';
const CAPTION_EXTENSIONS = /\.(vtt|srt|json3)$/i;

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseYouTubeArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const targets = uniqueByUrl(collectTargets(options))
    .slice(0, options.limit)
    .map(target => normalizeTarget(target));
  const localCaptionIndex = indexLocalCaptions(options.captionDir);
  const accessIssues = [];
  const sources = [];
  const candidates = [];

  for (const target of targets) {
    const captionFiles = localCaptionIndex.get(target.videoId) || [];
    const bestCaption = chooseBestCaption(captionFiles);
    let probe = null;

    if (options.probe) {
      probe = await probeCaptionTracks(target, options);
      if (probe.status !== 'track_found') {
        accessIssues.push({
          url: target.url,
          status: probe.httpStatus || null,
          reason: probe.status,
        });
      }
    }

    candidates.push({
      videoId: target.videoId,
      url: target.url,
      title: target.title || null,
      localCaptionFiles: captionFiles,
      bestCaption,
      probe,
      suggestedCommand: buildSuggestedCommand(target, options),
    });

    if (bestCaption) {
      const transcript = readCaptionText(bestCaption);
      sources.push(makeKnowledgeSource({
        sourceKind: 'youtube_caption',
        sourceOwner: target.channel || null,
        title: target.title || `YouTube transcript ${target.videoId}`,
        url: target.url,
        text: transcript,
        publishedAt: target.publishedAt || null,
        role: SOURCE_ROLES.youtube,
        maxChars: options.maxChars,
        metadata: {
          videoId: target.videoId,
          captionFile: bestCaption,
          captionBytes: fs.statSync(bestCaption).size,
          probe,
        },
      }));
    }
  }

  writeJson(buildPack({
    script: SCRIPT,
    inputs: {
      url: options.url,
      input: options.input,
      idsFile: options.idsFile,
      captionDir: options.captionDir,
      limit: options.limit,
      probe: options.probe,
    },
    sources,
    stats: {
      videos: targets.length,
      candidates: candidates.length,
      localCaptionSources: sources.length,
      accessIssues: accessIssues.length,
    },
    accessIssues,
    notes: [
      'Dry-run only. No YouTube Data API calls and no DB writes.',
      'Use the suggestedCommand or existing youtube:caption-fetch script to download captions when needed.',
    ],
  }), options.output);
}

function parseYouTubeArgs(argv) {
  const options = parseArgs(argv);
  options.captionDir = 'exports/youtube-captions/subtitles/local';
  options.idsFile = null;
  options.probe = false;
  options.ytDlpBin = 'yt-dlp';
  options.subLangs = 'en.*,zh.*,all';

  for (const arg of argv) {
    if (arg === '--probe') options.probe = true;
    else if (arg.startsWith('--caption-dir=')) options.captionDir = arg.slice('--caption-dir='.length);
    else if (arg.startsWith('--ids-file=')) options.idsFile = arg.slice('--ids-file='.length);
    else if (arg.startsWith('--yt-dlp-bin=')) options.ytDlpBin = arg.slice('--yt-dlp-bin='.length);
    else if (arg.startsWith('--sub-langs=')) options.subLangs = arg.slice('--sub-langs='.length);
  }

  return options;
}

function collectTargets(options) {
  const values = [...options.url];
  if (options.input) values.push(...readInputList(options.input));
  if (options.idsFile) values.push(...readInputList(options.idsFile));
  return values.map(value => {
    if (typeof value === 'string') return { url: normalizeYouTubeUrl(extractVideoId(value)), raw: value };
    return {
      ...value,
      url: value.url || normalizeYouTubeUrl(value.videoId),
    };
  }).filter(item => extractVideoId(item.url || item.videoId || item.raw));
}

function normalizeTarget(target) {
  const videoId = extractVideoId(target.url || target.videoId || target.raw);
  return {
    videoId,
    url: normalizeYouTubeUrl(videoId),
    title: target.title || '',
    channel: target.channel || target.channelTitle || null,
    publishedAt: target.publishedAt || null,
  };
}

function indexLocalCaptions(captionDir) {
  const index = new Map();
  const root = path.resolve(captionDir);
  if (!fs.existsSync(root)) return index;

  for (const file of walk(root)) {
    if (!CAPTION_EXTENSIONS.test(file)) continue;
    const videoId = inferVideoId(file);
    if (!videoId) continue;
    const files = index.get(videoId) || [];
    files.push(file);
    index.set(videoId, files);
  }

  for (const [videoId, files] of index.entries()) {
    index.set(videoId, files.sort());
  }
  return index;
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

function chooseBestCaption(files) {
  if (!files.length) return null;
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
  return score;
}

function readCaptionText(file) {
  const raw = fs.readFileSync(file, 'utf8');
  if (/\.json3$/i.test(file)) return cleanText(readJson3Lines(raw).join('\n'));
  return cleanCaptionLines(raw.split(/\r?\n/));
}

function readJson3Lines(raw) {
  try {
    const parsed = JSON.parse(raw);
    return (parsed.events || [])
      .flatMap(event => event.segs || [])
      .map(seg => seg.utf8 || '');
  } catch {
    return [];
  }
}

function cleanCaptionLines(lines) {
  const cleaned = [];
  let previous = '';

  for (const originalLine of lines) {
    const line = cleanText(originalLine)
      .replace(/<[^>]+>/g, '')
      .replace(/\{\\an\d+\}/g, '')
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

  return cleanText(cleaned.join('\n'));
}

async function probeCaptionTracks(target, options) {
  try {
    const response = await fetchText(target.url, { timeoutMs: options.timeoutMs });
    if (!response.ok) return { status: 'page_fetch_failed', httpStatus: response.status };
    const playerResponse = extractPlayerResponse(response.text);
    if (!playerResponse) return { status: 'player_response_not_found' };
    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (!tracks.length) return { status: 'no_caption_track', available: [] };
    return {
      status: 'track_found',
      available: tracks.map(track => ({
        languageCode: track.languageCode || null,
        name: captionName(track),
        kind: track.kind || null,
      })),
    };
  } catch (error) {
    return { status: 'probe_error', message: error.message || String(error) };
  }
}

function extractPlayerResponse(html) {
  const markerIndex = html.indexOf('ytInitialPlayerResponse');
  if (markerIndex < 0) return null;
  const braceStart = html.indexOf('{', markerIndex);
  if (braceStart < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = braceStart; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(braceStart, index + 1));
    }
  }
  return null;
}

function captionName(track) {
  return track?.name?.simpleText || track?.name?.runs?.map(run => run.text).join('') || null;
}

function buildSuggestedCommand(target, options) {
  return [
    'node',
    'scripts/enrich/fetch_youtube_captions_with_ytdlp.mjs',
    `--ids-file=<file-with-${target.videoId}>`,
    `--sub-langs=${options.subLangs}`,
    '--execute',
  ].join(' ');
}

function extractVideoId(value) {
  if (!value) return null;
  const normalized = String(value).startsWith('//') ? `https:${value}` : String(value);
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') return cleanVideoId(parsed.pathname.split('/').filter(Boolean)[0]);
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const queryVideo = parsed.searchParams.get('v');
      if (queryVideo) return cleanVideoId(queryVideo);
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live', 'v'].includes(parts[0]) && parts[1]) return cleanVideoId(parts[1]);
    }
  } catch {
    // Fall through to regex.
  }
  const match = normalized.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{6,})/);
  return match ? cleanVideoId(match[1]) : cleanVideoId(normalized);
}

function cleanVideoId(value) {
  const match = String(value || '').match(/[A-Za-z0-9_-]{6,}/);
  return match ? match[0] : null;
}

function normalizeYouTubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/knowledge/fetch_youtube_transcripts.mjs --url=https://www.youtube.com/watch?v=VIDEO_ID
  node scripts/knowledge/fetch_youtube_transcripts.mjs --ids-file=videos.txt --caption-dir=exports/youtube-captions/subtitles/local

Options:
  --url=URL            YouTube URL or ID. Repeatable.
  --ids-file=PATH      txt list of YouTube URLs/IDs.
  --input=PATH         txt or JSON source list.
  --caption-dir=PATH   Local caption root to inspect.
  --probe              Probe YouTube page caption track metadata.
  --output=PATH        Write JSON to file instead of stdout.
  --limit=N            Max videos.
`);
}
