import fs from 'node:fs';
import path from 'node:path';

const PLAN_PATH = 'exports/youtube-captions/plans/youtube_caption_plan.json';
const LOCAL_STATUS_PATH = 'exports/youtube-captions/subtitles/_status/local.jsonl';
const FETCH_SCRIPT_PATH = 'scripts/enrich/fetch_youtube_captions_with_ytdlp.mjs';
const OUT_DIR = 'exports/youtube-captions/worker-bundle';

const CAPTURED_STATUSES = new Set([
  'success',
  'success_timedtext_fallback',
  'partial_success',
]);

function main() {
  const plan = readJson(PLAN_PATH);
  const latestLocalStatus = readLatestLocalStatus(LOCAL_STATUS_PATH);
  const items = flattenPlanItems(plan);
  const remaining = [];

  for (const item of items) {
    const prior = latestLocalStatus.get(item.videoId) || null;
    if (isCaptured(prior)) continue;

    remaining.push({
      ...item,
      priorLocalStatus: prior?.status || null,
      priorLocalIndex: prior?.index || null,
    });
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.copyFileSync(FETCH_SCRIPT_PATH, path.join(OUT_DIR, 'fetch_youtube_captions_with_ytdlp.mjs'));

  writeText(path.join(OUT_DIR, 'remaining_video_ids.txt'), `${remaining.map(item => item.videoId).join('\n')}\n`);
  writeText(path.join(OUT_DIR, 'remaining_urls.txt'), `${remaining.map(item => item.url).join('\n')}\n`);
  writeText(path.join(OUT_DIR, 'remaining_manifest.jsonl'), `${remaining.map(item => JSON.stringify(item)).join('\n')}\n`);
  writeText(path.join(OUT_DIR, 'run_youtube_caption_worker.sh'), runnerScript());
  fs.chmodSync(path.join(OUT_DIR, 'run_youtube_caption_worker.sh'), 0o755);
  writeText(path.join(OUT_DIR, 'README.md'), readmeText(remaining));

  const counts = summarize(remaining);
  console.log(JSON.stringify({
    outDir: path.resolve(OUT_DIR),
    totalRemaining: remaining.length,
    counts,
  }, null, 2));
}

function flattenPlanItems(plan) {
  const batches = plan.batches || {};
  const seen = new Set();
  const items = [];

  for (const [batchName, batch] of Object.entries(batches)) {
    for (let index = 0; index < (batch.items || []).length; index += 1) {
      const item = batch.items[index];
      if (!item?.videoId || seen.has(item.videoId)) continue;
      seen.add(item.videoId);
      items.push({
        sourceBatch: batchName,
        sourceIndex: index + 1,
        videoId: item.videoId,
        url: item.url || `https://www.youtube.com/watch?v=${item.videoId}`,
        title: item.title || '',
        primaryPerson: item.primaryPerson || null,
        reasons: item.reasons || [],
      });
    }
  }

  return items;
}

function readLatestLocalStatus(statusPath) {
  const latest = new Map();
  if (!fs.existsSync(statusPath)) return latest;

  const lines = fs.readFileSync(statusPath, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const row = JSON.parse(line);
    if (row.batch === 'local' && row.total === 200 && row.videoId) {
      latest.set(row.videoId, row);
    }
  }

  return latest;
}

function isCaptured(row) {
  if (!row) return false;
  if (CAPTURED_STATUSES.has(row.status)) return true;
  return row.status === 'skipped_existing_caption' && Array.isArray(row.files) && row.files.length > 0;
}

function summarize(items) {
  const counts = { bySourceBatch: {}, byPriorLocalStatus: {} };
  for (const item of items) {
    counts.bySourceBatch[item.sourceBatch] = (counts.bySourceBatch[item.sourceBatch] || 0) + 1;
    const status = item.priorLocalStatus || 'not_attempted_here';
    counts.byPriorLocalStatus[status] = (counts.byPriorLocalStatus[status] || 0) + 1;
  }
  return counts;
}

function runnerScript() {
  return String.raw`#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="\${YTCAP_PORT:-4416}"
SLEEP_MIN="\${YTCAP_SLEEP_MIN:-5}"
SLEEP_MAX="\${YTCAP_SLEEP_MAX:-15}"
COMMAND_TIMEOUT_MS="\${YTCAP_COMMAND_TIMEOUT_MS:-60000}"
FALLBACK_TIMEOUT_MS="\${YTCAP_FALLBACK_TIMEOUT_MS:-30000}"
OUT_DIR="\${YTCAP_OUT_DIR:-$SCRIPT_DIR/output}"
PROVIDER_DIR="$SCRIPT_DIR/bgutil-ytdlp-pot-provider"
LOG_DIR="$OUT_DIR/logs"
mkdir -p "$LOG_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "node is required. Install Node.js 20+ first." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required. Install Python 3.10+ first." >&2
  exit 1
fi

if [ ! -d "$PROVIDER_DIR" ]; then
  git clone --single-branch --branch 1.3.1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git "$PROVIDER_DIR"
fi

if [ ! -f "$PROVIDER_DIR/server/build/main.js" ]; then
  (cd "$PROVIDER_DIR/server" && npm ci && npx tsc)
fi

if [ ! -x "$SCRIPT_DIR/.venv/bin/yt-dlp" ]; then
  python3 -m venv "$SCRIPT_DIR/.venv"
  "$SCRIPT_DIR/.venv/bin/python" -m pip install -U pip
  "$SCRIPT_DIR/.venv/bin/python" -m pip install -U yt-dlp curl-cffi bgutil-ytdlp-pot-provider
fi
YTDLP_BIN="\${YTCAP_YTDLP_BIN:-$SCRIPT_DIR/.venv/bin/yt-dlp}"

if [ "\${YTCAP_NO_PROVIDER:-0}" != "1" ]; then
  if curl -sS --max-time 2 "http://127.0.0.1:$PORT/ping" >/dev/null 2>&1; then
    echo "PO token provider already listening on $PORT"
  else
    if command -v screen >/dev/null 2>&1; then
      screen -S ytcap-provider -X quit >/dev/null 2>&1 || true
      screen -dmS ytcap-provider bash -lc "cd '$PROVIDER_DIR/server' && node build/main.js --port '$PORT' > '$LOG_DIR/bgutil-provider.log' 2>&1"
    else
      (cd "$PROVIDER_DIR/server" && nohup node build/main.js --port "$PORT" > "$LOG_DIR/bgutil-provider.log" 2>&1 &)
    fi

    for _ in $(seq 1 20); do
      if curl -sS --max-time 2 "http://127.0.0.1:$PORT/ping" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done

    curl -sS --max-time 5 "http://127.0.0.1:$PORT/ping" >/dev/null
  fi
fi

ARGS=(
  "$SCRIPT_DIR/fetch_youtube_captions_with_ytdlp.mjs"
  "--ids-file=$SCRIPT_DIR/remaining_video_ids.txt"
  "--batch=remaining"
  "--out-dir=$OUT_DIR"
  "--execute"
  "--sleep-min=$SLEEP_MIN"
  "--sleep-max=$SLEEP_MAX"
  "--command-timeout-ms=$COMMAND_TIMEOUT_MS"
  "--fallback-timeout-ms=$FALLBACK_TIMEOUT_MS"
  "--yt-dlp-bin=$YTDLP_BIN"
  "--po-provider-base-url=http://127.0.0.1:$PORT"
  "--no-stop-on-timeout"
)

if [ -n "\${YTCAP_COOKIES_FROM_BROWSER:-}" ]; then
  ARGS+=("--cookies-from-browser=$YTCAP_COOKIES_FROM_BROWSER")
fi

if [ "\${YTCAP_YTDLP_ONLY:-0}" = "1" ]; then
  ARGS+=("--no-preflight-caption-tracks" "--no-prefer-timedtext-fallback")
fi

if [ "\${YTCAP_NO_PROVIDER:-0}" = "1" ]; then
  ARGS+=("--no-po-provider")
fi

node "\${ARGS[@]}" 2>&1 | tee "$LOG_DIR/remaining-fetch-$(date +%Y%m%d-%H%M%S).log"

node <<'NODE'
const fs = require('fs');
const statusPath = 'output/subtitles/_status/remaining.jsonl';
if (!fs.existsSync(statusPath)) {
  console.log('No status file found.');
  process.exit(0);
}
const rows = fs.readFileSync(statusPath, 'utf8').trim().split(/\n/).filter(Boolean).map(JSON.parse);
const latest = new Map();
for (const row of rows) latest.set(row.videoId, row);
const counts = {};
for (const row of latest.values()) counts[row.status] = (counts[row.status] || 0) + 1;
console.log(JSON.stringify({ processed: latest.size, counts }, null, 2));
NODE
`.replaceAll('\\${', '${');
}

function readmeText(remaining) {
  const counts = summarize(remaining);
  return `# YouTube Caption Worker Bundle

This bundle contains the remaining YouTube video IDs that still need captions.

## What to run

\`\`\`bash
tar xzf youtube-caption-worker-bundle.tar.gz
cd worker-bundle
./run_youtube_caption_worker.sh
\`\`\`

The runner installs a local yt-dlp venv, starts a local PO token provider, then writes VTT files under:

\`\`\`
output/subtitles/remaining/
output/subtitles/_status/remaining.jsonl
\`\`\`

Send the whole \`output/\` directory back when it finishes.

## If YouTube asks for sign-in

If the normal run says many videos have no caption tracks or YouTube says "Sign in to confirm you're not a bot", use your logged-in browser through yt-dlp:

\`\`\`bash
YTCAP_YTDLP_ONLY=1 YTCAP_COOKIES_FROM_BROWSER=chrome ./run_youtube_caption_worker.sh
\`\`\`

Use \`firefox\` instead of \`chrome\` if your YouTube session is in Firefox.

## Tuning

\`\`\`bash
YTCAP_SLEEP_MIN=10 YTCAP_SLEEP_MAX=25 ./run_youtube_caption_worker.sh
YTCAP_PORT=4417 ./run_youtube_caption_worker.sh
\`\`\`

## Remaining set

Total remaining: ${remaining.length}

By source batch:

\`\`\`json
${JSON.stringify(counts.bySourceBatch, null, 2)}
\`\`\`

By previous local status:

\`\`\`json
${JSON.stringify(counts.byPriorLocalStatus, null, 2)}
\`\`\`
`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeText(filePath, text) {
  fs.writeFileSync(filePath, text);
}

main();
