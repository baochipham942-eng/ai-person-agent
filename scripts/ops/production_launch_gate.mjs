#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const DEFAULT_OUTPUT_DIR = '/tmp/ai-person-launch-gate-evidence';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  assertProductionUrl(baseUrl, options);

  const stamp = formatStamp(new Date());
  const outputDir = resolve(options.outputDir || DEFAULT_OUTPUT_DIR);
  const output = options.output || resolve(outputDir, `launch-gate-${stamp}.json`);
  const screenshotDir = options.noScreenshots
    ? null
    : options.screenshotDir || resolve(outputDir, `screenshots-${stamp}`);

  const args = [
    'scripts/ops/launch_gate.mjs',
    `--base-url=${baseUrl}`,
    `--output=${output}`,
    `--quality-limit=${options.qualityLimit}`,
    `--timeout-ms=${options.timeoutMs}`,
  ];

  if (screenshotDir) args.push(`--screenshot-dir=${screenshotDir}`);
  if (options.noScreenshots) args.push('--no-screenshots');
  if (options.skipResponsive) args.push('--skip-responsive');
  if (options.evidenceOnly) args.push('--allow-blocked-readiness');
  if (options.strictQuality) args.push('--strict-quality');

  process.exitCode = await run(process.execPath, args);
}

function parseArgs(args) {
  const options = {
    baseUrl: firstEnv('PRODUCTION_BASE_URL', 'LAUNCH_GATE_BASE_URL', 'NEXT_PUBLIC_SITE_URL', 'SITE_URL'),
    outputDir: process.env.LAUNCH_GATE_OUTPUT_DIR || DEFAULT_OUTPUT_DIR,
    output: null,
    screenshotDir: null,
    qualityLimit: clampInteger(process.env.LAUNCH_GATE_QUALITY_LIMIT, 1, 100, 20),
    timeoutMs: clampInteger(process.env.LAUNCH_GATE_TIMEOUT_MS, 1000, 60000, 30000),
    evidenceOnly: false,
    strictQuality: process.env.LAUNCH_GATE_STRICT_QUALITY === 'true',
    skipResponsive: false,
    noScreenshots: false,
    allowLocal: false,
  };

  for (const arg of args) {
    if (arg === '--evidence-only') options.evidenceOnly = true;
    if (arg === '--strict-quality') options.strictQuality = true;
    if (arg === '--skip-responsive') options.skipResponsive = true;
    if (arg === '--no-screenshots') options.noScreenshots = true;
    if (arg === '--allow-local') options.allowLocal = true;
    if (arg.startsWith('--base-url=')) options.baseUrl = arg.slice('--base-url='.length);
    if (arg.startsWith('--output-dir=')) options.outputDir = resolve(arg.slice('--output-dir='.length));
    if (arg.startsWith('--output=')) options.output = resolve(arg.slice('--output='.length));
    if (arg.startsWith('--screenshot-dir=')) options.screenshotDir = resolve(arg.slice('--screenshot-dir='.length));
    if (arg.startsWith('--quality-limit=')) options.qualityLimit = clampInteger(arg.slice('--quality-limit='.length), 1, 100, options.qualityLimit);
    if (arg.startsWith('--timeout-ms=')) options.timeoutMs = clampInteger(arg.slice('--timeout-ms='.length), 1000, 60000, options.timeoutMs);
  }

  return options;
}

function normalizeBaseUrl(value) {
  if (!value) {
    throw new Error('Missing production URL. Set PRODUCTION_BASE_URL or pass --base-url=https://example.com.');
  }

  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`Unsupported launch gate URL protocol: ${url.protocol}`);
  }
  return url.toString();
}

function assertProductionUrl(baseUrl, options) {
  const url = new URL(baseUrl);
  if (!options.allowLocal && LOCAL_HOSTS.has(url.hostname)) {
    throw new Error('Refusing to run production launch gate against a local URL. Pass --allow-local only for local verification.');
  }
}

function run(command, args) {
  return new Promise(resolvePromise => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
    child.on('error', error => {
      console.error(error);
      resolvePromise(1);
    });
    child.on('close', code => {
      resolvePromise(code || 0);
    });
  });
}

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return null;
}

function formatStamp(date) {
  return date.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
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
