import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_PLAN = 'exports/youtube-captions/plans/youtube_caption_plan.json';
const DEFAULT_OUT_DIR = 'exports/youtube-captions/subtitles';
const DEFAULT_SUB_LANGS = 'en,en-orig,en.*,zh,zh-Hans,zh-Hant,zh-CN,zh-TW,zh.*';

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const targets = loadTargets(options);

  if (!targets.length) {
    console.log('No targets found.');
    return;
  }

  const selectedTargets = Number.isFinite(options.limit) ? targets.slice(0, options.limit) : targets;
  const subtitleRoot = path.resolve(options.outDir, options.batch);
  const statusDir = path.resolve(options.outDir, '_status');
  const archivePath = path.resolve(options.archive || path.join(statusDir, `${options.batch}.archive.txt`));
  const statusPath = path.join(statusDir, `${options.batch}.jsonl`);

  fs.mkdirSync(subtitleRoot, { recursive: true });
  fs.mkdirSync(statusDir, { recursive: true });

  console.log(JSON.stringify({
    mode: options.execute ? 'execute' : 'dry-run',
    batch: options.batch,
    targets: selectedTargets.length,
    subtitleRoot,
    archivePath,
    subLangs: options.subLangs,
    fallbackTimedtext: options.fallbackTimedtext,
    fallbackTimeoutMs: options.fallbackTimeoutMs,
    sleepSeconds: [options.sleepMin, options.sleepMax],
    commandTimeoutMs: options.commandTimeoutMs,
    cookiesFromBrowser: options.cookiesFromBrowser || null,
    preflightCaptionTracks: options.preflightCaptionTracks,
    preferTimedtextFallback: options.preferTimedtextFallback,
    poProviderBaseUrl: options.poProviderBaseUrl || null,
  }, null, 2));

  if (!options.execute) {
    console.log('\nFirst commands:');
    for (const target of selectedTargets.slice(0, 5)) {
      console.log(commandToString(options.ytDlpBin, buildYtDlpArgs(target, options, subtitleRoot, archivePath)));
    }
    console.log('\nDry-run only. Add --execute to run yt-dlp.');
    return;
  }

  for (let index = 0; index < selectedTargets.length; index += 1) {
    const target = selectedTargets[index];
    const existingFiles = listCaptionFiles(path.join(subtitleRoot, target.videoId));

    if (existingFiles.length && !options.force) {
      appendStatus(statusPath, {
        at: new Date().toISOString(),
        batch: options.batch,
        index: index + 1,
        total: selectedTargets.length,
        videoId: target.videoId,
        url: target.url,
        status: 'skipped_existing_caption',
        files: existingFiles,
      });
      console.log(`[${index + 1}/${selectedTargets.length}] ${target.videoId} skipped; caption file already exists.`);
      continue;
    }

    let preflight = null;
    if (options.preflightCaptionTracks) {
      preflight = await fetchCaptionTrackMetadata(target, options);
      if (preflight.status === 'no_caption_track') {
        appendStatus(statusPath, {
          at: new Date().toISOString(),
          batch: options.batch,
          index: index + 1,
          total: selectedTargets.length,
          videoId: target.videoId,
          url: target.url,
          primaryPerson: target.primaryPerson || null,
          status: 'no_caption_track',
          preflight: summarizeCaptionMetadata(preflight),
        });
        console.log(`[${index + 1}/${selectedTargets.length}] ${target.videoId} skipped; no caption tracks in player response.`);
        continue;
      }
    }

    if (options.preferTimedtextFallback && preflight?.status === 'track_found') {
      console.log(`[${index + 1}/${selectedTargets.length}] ${target.videoId} ${target.primaryPerson?.name || ''} timedtext`);
      const startedAt = Date.now();
      const fallback = await fetchTimedtextFallback(target, options, subtitleRoot, preflight);
      const durationMs = Date.now() - startedAt;
      const files = listCaptionFiles(path.join(subtitleRoot, target.videoId));

      if (fallback.status === 'success') {
        appendStatus(statusPath, {
          at: new Date().toISOString(),
          batch: options.batch,
          index: index + 1,
          total: selectedTargets.length,
          videoId: target.videoId,
          url: target.url,
          primaryPerson: target.primaryPerson || null,
          durationMs,
          status: 'success_timedtext_fallback',
          files,
          preflight: summarizeCaptionMetadata(preflight),
          fallback,
        });
        if (index < selectedTargets.length - 1) {
          await sleep(randomInt(options.sleepMin, options.sleepMax) * 1000);
        }
        continue;
      }
    }

    const args = buildYtDlpArgs(target, options, subtitleRoot, archivePath);
    console.log(`[${index + 1}/${selectedTargets.length}] ${target.videoId} ${target.primaryPerson?.name || ''}`);

    const startedAt = Date.now();
    const result = spawnSync(options.ytDlpBin, args, {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      timeout: options.commandTimeoutMs,
    });
    const durationMs = Date.now() - startedAt;
    const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
    let files = listCaptionFiles(path.join(subtitleRoot, target.videoId));
    let status = classifyResult(result, combinedOutput, files);
    let fallback = null;

    if (options.fallbackTimedtext && shouldTryTimedtextFallback(status)) {
      fallback = await fetchTimedtextFallback(target, options, subtitleRoot, preflight);
      files = listCaptionFiles(path.join(subtitleRoot, target.videoId));
      if (fallback.status === 'success') status = 'success_timedtext_fallback';
    }

    appendStatus(statusPath, {
      at: new Date().toISOString(),
      batch: options.batch,
      index: index + 1,
      total: selectedTargets.length,
      videoId: target.videoId,
      url: target.url,
      primaryPerson: target.primaryPerson || null,
      exitCode: result.status,
      signal: result.signal,
      durationMs,
      status,
      files,
      preflight: summarizeCaptionMetadata(preflight),
      fallback,
      stdoutTail: tail(result.stdout || '', 3000),
      stderrTail: tail(result.stderr || '', 3000),
    });

    if (status === 'rate_limited_or_blocked' && options.stopOnRateLimit) {
      console.log(`Stopped after rate-limit/block signal on ${target.videoId}.`);
      break;
    }

    if (status === 'command_timeout' && options.stopOnTimeout) {
      console.log(`Stopped after command timeout on ${target.videoId}. Check yt-dlp before resuming.`);
      break;
    }

    if (index < selectedTargets.length - 1) {
      await sleep(randomInt(options.sleepMin, options.sleepMax) * 1000);
    }
  }

  console.log(`Status written to ${statusPath}`);
}

function loadTargets(options) {
  if (options.idsFile) {
    const text = fs.readFileSync(options.idsFile, 'utf8');
    return text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        const videoId = extractVideoId(line) || line;
        return {
          videoId,
          url: line.startsWith('http') ? line : normalizeYouTubeUrl(videoId),
        };
      });
  }

  const planPath = path.resolve(options.plan);
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const batch = plan.batches?.[options.batch];

  if (!batch) {
    throw new Error(`Batch "${options.batch}" not found in ${planPath}`);
  }

  return batch.items.map(item => ({
    videoId: item.videoId,
    url: item.url || normalizeYouTubeUrl(item.videoId),
    title: item.title || '',
    primaryPerson: item.primaryPerson || null,
    minTextLength: item.minTextLength,
    reasons: item.reasons || [],
  }));
}

function buildYtDlpArgs(target, options, subtitleRoot, archivePath) {
  const outputTemplate = path.join(subtitleRoot, '%(id)s', '%(id)s.%(ext)s');
  const args = [
    '--skip-download',
    '--write-subs',
    '--write-auto-subs',
    '--sub-langs',
    options.subLangs,
    '--sub-format',
    options.subFormat,
    '--convert-subs',
    'vtt',
    '--no-playlist',
    '--retries',
    String(options.retries),
    '--fragment-retries',
    String(options.fragmentRetries),
    '--socket-timeout',
    String(options.socketTimeout),
    '--download-archive',
    archivePath,
    '--output',
    outputTemplate,
  ];

  if (options.cookiesFromBrowser) {
    args.push('--cookies-from-browser', options.cookiesFromBrowser);
  }

  if (options.proxy) {
    args.push('--proxy', options.proxy);
  }

  args.push(target.url);
  return args;
}

function classifyResult(result, output, files) {
  if (files.length > 0 && result.status === 0) return 'success';
  if (files.length > 0) return 'partial_success';
  if (/429|too many requests|rate.?limit|unusual traffic|HTTP Error 403|Sign in to confirm|not a bot|confirm you.?re not a bot/i.test(output)) {
    return 'rate_limited_or_blocked';
  }
  if (/no subtitles|There are no subtitles|has no subtitles/i.test(output)) {
    return 'no_caption';
  }
  if (result.error?.code === 'ETIMEDOUT') return 'command_timeout';
  if (result.error) return 'spawn_error';
  if (result.status === 0) return files.length ? 'success' : 'no_caption_or_not_selected';
  return 'failed';
}

function shouldTryTimedtextFallback(status) {
  return [
    'no_caption',
    'no_caption_or_not_selected',
    'failed',
    'command_timeout',
  ].includes(status);
}

async function fetchTimedtextFallback(target, options, subtitleRoot, metadata = null) {
  const videoDir = path.join(subtitleRoot, target.videoId);
  fs.mkdirSync(videoDir, { recursive: true });

  try {
    metadata ||= await fetchCaptionTrackMetadata(target, options);

    if (metadata.status !== 'track_found') {
      return {
        status: metadata.status,
        available: metadata.available || [],
      };
    }

    const selectedTrack = metadata.track;
    const captionUrl = new URL(selectedTrack.baseUrl);
    captionUrl.searchParams.set('fmt', 'vtt');

    let captionResult = await fetchCaptionText(captionUrl, target, options);
    let usedPoToken = false;
    let poProviderStatus = null;

    if ((!captionResult.ok || !captionResult.text.trim()) && options.poProviderBaseUrl) {
      const poResult = await fetchPoToken(target.videoId, options);
      poProviderStatus = poResult.status;

      if (poResult.status === 'success') {
        const tokenCaptionUrl = new URL(selectedTrack.baseUrl);
        tokenCaptionUrl.searchParams.set('fmt', 'vtt');
        tokenCaptionUrl.searchParams.set('pot', poResult.poToken);
        tokenCaptionUrl.searchParams.set('potc', '1');
        tokenCaptionUrl.searchParams.set('c', 'WEB');
        captionResult = await fetchCaptionText(tokenCaptionUrl, target, options);
        usedPoToken = true;
      }
    }

    if (!captionResult.ok) {
      return {
        status: 'caption_fetch_failed',
        httpStatus: captionResult.httpStatus,
        poProviderStatus,
        usedPoToken,
      };
    }

    const captionText = captionResult.text;
    if (!captionText.trim()) {
      return {
        status: 'empty_caption',
        poProviderStatus,
        usedPoToken,
      };
    }

    const suffix = selectedTrack.kind === 'asr' ? 'auto' : 'manual';
    const language = safeFilePart(selectedTrack.languageCode || 'unknown');
    const captionPath = path.join(videoDir, `${target.videoId}.${language}.${suffix}.fallback.vtt`);
    fs.writeFileSync(captionPath, captionText);

    return {
      status: 'success',
      path: captionPath,
      languageCode: selectedTrack.languageCode || null,
      name: captionName(selectedTrack),
      kind: selectedTrack.kind || null,
      bytes: Buffer.byteLength(captionText),
      poProviderStatus,
      usedPoToken,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error?.message || String(error),
      name: error?.name || null,
    };
  }
}

async function fetchCaptionText(captionUrl, target, options) {
  const captionRes = await fetchWithTimeout(captionUrl, {
    headers: {
      'user-agent': userAgent(),
      referer: target.url,
    },
  }, options.fallbackTimeoutMs);

  return {
    ok: captionRes.ok,
    httpStatus: captionRes.status,
    text: await captionRes.text(),
  };
}

async function fetchPoToken(videoId, options) {
  try {
    const providerUrl = new URL('/get_pot', options.poProviderBaseUrl);
    const response = await fetchWithTimeout(providerUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        content_binding: videoId,
        innertube_context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20260227.01.00',
          },
        },
      }),
    }, options.fallbackTimeoutMs);

    if (!response.ok) {
      return { status: 'provider_http_error', httpStatus: response.status };
    }

    const json = await response.json();
    if (!json.poToken) {
      return { status: 'provider_missing_token' };
    }

    return {
      status: 'success',
      poToken: json.poToken,
      expiresAt: json.expiresAt || null,
    };
  } catch (error) {
    return {
      status: 'provider_error',
      message: error?.message || String(error),
    };
  }
}

async function fetchCaptionTrackMetadata(target, options) {
  const pageRes = await fetchWithTimeout(target.url, {
    headers: {
      'user-agent': userAgent(),
      'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    },
  }, options.fallbackTimeoutMs);

  if (!pageRes.ok) {
    return { status: 'page_fetch_failed', httpStatus: pageRes.status };
  }

  const html = await pageRes.text();
  const playerResponse = extractPlayerResponse(html);

  if (!playerResponse) {
    return { status: 'player_response_not_found' };
  }

  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const available = tracks.map(track => ({
    languageCode: track.languageCode,
    name: captionName(track),
    kind: track.kind || null,
  }));

  if (!tracks.length) {
    return {
      status: 'no_caption_track',
      available,
    };
  }

  const selectedTrack = selectCaptionTrack(tracks, options.subLangs);
  if (!selectedTrack) {
    return {
      status: 'no_selected_caption_track',
      available,
    };
  }

  return {
    status: 'track_found',
    track: selectedTrack,
    selected: {
      languageCode: selectedTrack.languageCode,
      name: captionName(selectedTrack),
      kind: selectedTrack.kind || null,
    },
    available,
  };
}

function extractPlayerResponse(html) {
  const marker = 'ytInitialPlayerResponse';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return null;

  const braceStart = html.indexOf('{', markerIndex);
  if (braceStart < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = braceStart; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(html.slice(braceStart, index + 1));
      }
    }
  }

  return null;
}

function selectCaptionTrack(tracks, subLangs) {
  if (!tracks.length) return null;

  const patterns = subLangs
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  const manualTracks = tracks.filter(track => track.kind !== 'asr');
  const autoTracks = tracks.filter(track => track.kind === 'asr');
  const orderedTracks = [...manualTracks, ...autoTracks];

  for (const pattern of patterns) {
    const match = orderedTracks.find(track => languageMatches(track.languageCode || '', pattern));
    if (match) return match;
  }

  return orderedTracks[0] || null;
}

function languageMatches(languageCode, pattern) {
  if (!pattern || pattern === 'all') return true;
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return languageCode === prefix || languageCode.startsWith(`${prefix}-`);
  }
  return languageCode === pattern;
}

function captionName(track) {
  return track?.name?.simpleText || track?.name?.runs?.map(run => run.text).join('') || null;
}

function summarizeCaptionMetadata(metadata) {
  if (!metadata) return null;
  const { track, ...summary } = metadata;
  return summary;
}

function safeFilePart(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, '_') || 'unknown';
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function userAgent() {
  return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
}

function listCaptionFiles(videoDir) {
  if (!fs.existsSync(videoDir)) return [];
  return fs.readdirSync(videoDir)
    .filter(file => /\.(vtt|srt|ttml|srv\d?|json3)$/i.test(file))
    .sort()
    .map(file => path.join(videoDir, file));
}

function appendStatus(statusPath, row) {
  fs.appendFileSync(statusPath, `${JSON.stringify(row)}\n`);
}

function commandToString(bin, args) {
  return [bin, ...args].map(shellQuote).join(' ');
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:=@,+-]+$/.test(value)) return value;
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function extractVideoId(value) {
  if (!value) return null;
  const normalized = value.startsWith('//') ? `https:${value}` : value;

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
    // Fall through to regex extraction.
  }

  const match = normalized.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{6,})/);
  return match ? cleanVideoId(match[1]) : cleanVideoId(normalized);
}

function cleanVideoId(value) {
  if (!value) return null;
  const match = String(value).match(/[A-Za-z0-9_-]{6,}/);
  return match ? match[0] : null;
}

function normalizeYouTubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return lower + Math.floor(Math.random() * (upper - lower + 1));
}

function tail(value, maxLength) {
  if (value.length <= maxLength) return value;
  return value.slice(value.length - maxLength);
}

function parseArgs(args) {
  const options = {
    plan: DEFAULT_PLAN,
    idsFile: null,
    batch: 'local',
    outDir: DEFAULT_OUT_DIR,
    archive: null,
    subLangs: DEFAULT_SUB_LANGS,
    subFormat: 'vtt/best',
    ytDlpBin: 'yt-dlp',
    cookiesFromBrowser: '',
    proxy: '',
    limit: Number.POSITIVE_INFINITY,
    sleepMin: 2,
    sleepMax: 8,
    retries: 3,
    fragmentRetries: 3,
    socketTimeout: 30,
    commandTimeoutMs: 15 * 60 * 1000,
    fallbackTimeoutMs: 30 * 1000,
    execute: false,
    force: false,
    fallbackTimedtext: true,
    preflightCaptionTracks: true,
    preferTimedtextFallback: true,
    poProviderBaseUrl: 'http://127.0.0.1:4416',
    stopOnRateLimit: true,
    stopOnTimeout: true,
  };

  for (const arg of args) {
    if (arg === '--execute') options.execute = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--no-fallback-timedtext') options.fallbackTimedtext = false;
    else if (arg === '--no-preflight-caption-tracks') options.preflightCaptionTracks = false;
    else if (arg === '--no-prefer-timedtext-fallback') options.preferTimedtextFallback = false;
    else if (arg === '--no-po-provider') options.poProviderBaseUrl = '';
    else if (arg === '--no-stop-on-rate-limit') options.stopOnRateLimit = false;
    else if (arg === '--no-stop-on-timeout') options.stopOnTimeout = false;
    else if (arg.startsWith('--plan=')) options.plan = arg.slice('--plan='.length);
    else if (arg.startsWith('--ids-file=')) options.idsFile = arg.slice('--ids-file='.length);
    else if (arg.startsWith('--batch=')) options.batch = arg.slice('--batch='.length);
    else if (arg.startsWith('--out-dir=')) options.outDir = arg.slice('--out-dir='.length);
    else if (arg.startsWith('--archive=')) options.archive = arg.slice('--archive='.length);
    else if (arg.startsWith('--sub-langs=')) options.subLangs = arg.slice('--sub-langs='.length);
    else if (arg.startsWith('--sub-format=')) options.subFormat = arg.slice('--sub-format='.length);
    else if (arg.startsWith('--yt-dlp-bin=')) options.ytDlpBin = arg.slice('--yt-dlp-bin='.length);
    else if (arg.startsWith('--cookies-from-browser=')) options.cookiesFromBrowser = arg.slice('--cookies-from-browser='.length);
    else if (arg.startsWith('--proxy=')) options.proxy = arg.slice('--proxy='.length);
    else if (arg.startsWith('--po-provider-base-url=')) options.poProviderBaseUrl = arg.slice('--po-provider-base-url='.length);
    else if (arg.startsWith('--limit=')) options.limit = clampInteger(arg.slice('--limit='.length), 1, 1000000, options.limit);
    else if (arg.startsWith('--sleep-min=')) options.sleepMin = clampInteger(arg.slice('--sleep-min='.length), 0, 3600, options.sleepMin);
    else if (arg.startsWith('--sleep-max=')) options.sleepMax = clampInteger(arg.slice('--sleep-max='.length), 0, 3600, options.sleepMax);
    else if (arg.startsWith('--retries=')) options.retries = clampInteger(arg.slice('--retries='.length), 0, 20, options.retries);
    else if (arg.startsWith('--fragment-retries=')) options.fragmentRetries = clampInteger(arg.slice('--fragment-retries='.length), 0, 20, options.fragmentRetries);
    else if (arg.startsWith('--socket-timeout=')) options.socketTimeout = clampInteger(arg.slice('--socket-timeout='.length), 5, 300, options.socketTimeout);
    else if (arg.startsWith('--command-timeout-ms=')) options.commandTimeoutMs = clampInteger(arg.slice('--command-timeout-ms='.length), 1000, 24 * 60 * 60 * 1000, options.commandTimeoutMs);
    else if (arg.startsWith('--fallback-timeout-ms=')) options.fallbackTimeoutMs = clampInteger(arg.slice('--fallback-timeout-ms='.length), 1000, 10 * 60 * 1000, options.fallbackTimeoutMs);
  }

  if (!['local', 'lobster', 'deferred'].includes(options.batch) && !options.idsFile) {
    throw new Error('--batch must be local, lobster, or deferred when reading from a plan');
  }

  return options;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
