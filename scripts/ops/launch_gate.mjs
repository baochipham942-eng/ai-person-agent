import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const DEFAULT_BASE_URL = 'http://127.0.0.1:4001';
const MAX_JSON_COMMAND_ATTEMPTS = 3;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const checks = [];

  const readiness = await runJsonCommand({
    key: 'readiness',
    label: 'Operations readiness',
    command: process.execPath,
    args: ['scripts/ops/readiness.mjs'],
  });
  checks.push(buildReadinessCheck(readiness, options));

  const quality = await runJsonCommand({
    key: 'quality',
    label: 'Quality review queue',
    command: process.execPath,
    args: [
      'scripts/audit/quality_review_queue.mjs',
      `--limit=${options.qualityLimit}`,
      '--format=json',
    ],
  });
  checks.push(buildQualityCheck(quality, options));

  if (options.skipResponsive) {
    checks.push({
      key: 'responsive',
      label: 'Responsive smoke',
      status: 'skipped',
      passedForExit: true,
      detail: 'Skipped by --skip-responsive',
      command: null,
      data: null,
    });
  } else {
    const responsiveArgs = [
      'scripts/qa/responsive_smoke.mjs',
      `--base-url=${options.baseUrl}`,
      `--screenshot-dir=${options.screenshotDir}`,
      `--timeout-ms=${options.timeoutMs}`,
      '--json-only',
    ];
    if (options.noScreenshots) responsiveArgs.push('--no-screenshots');

    const responsive = await runJsonCommand({
      key: 'responsive',
      label: 'Responsive smoke',
      command: process.execPath,
      args: responsiveArgs,
    });
    checks.push(buildResponsiveCheck(responsive, options));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    gateStatus: summarizeGateStatus(checks),
    passForExit: checks.every(check => check.passedForExit),
    options: {
      qualityLimit: options.qualityLimit,
      skipResponsive: options.skipResponsive,
      screenshotDir: options.noScreenshots ? null : options.screenshotDir,
      allowBlockedReadiness: options.allowBlockedReadiness,
      allowQualityHigh: options.allowQualityHigh,
    },
    checks,
  };

  if (options.output) {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, JSON.stringify(report, null, 2));
  }

  console.log(JSON.stringify(report, null, 2));

  if (!report.passForExit) {
    process.exitCode = 1;
  }
}

function buildReadinessCheck(result, options) {
  if (!result.ok) return failedCommandCheck(result);
  const status = result.data?.overallStatus || 'unknown';
  const passedForExit = status === 'ready' || options.allowBlockedReadiness;

  return {
    key: 'readiness',
    label: result.label,
    status,
    passedForExit,
    detail: status === 'ready'
      ? 'All launch readiness checks are ready'
      : `Readiness is ${status}; use this as production migration evidence, not as a ready signal`,
    command: result.commandLine,
    data: {
      overallStatus: status,
      schema: result.data?.schema,
      newsletterEnv: result.data?.newsletterEnv,
      checks: result.data?.checks,
    },
  };
}

function buildQualityCheck(result, options) {
  if (!result.ok) return failedCommandCheck(result);
  const stats = result.data?.stats || {};
  const criticalPeople = Number(stats.criticalPeople || 0);
  const highPeople = Number(stats.highPeople || 0);
  const status = criticalPeople > 0
    ? 'blocked'
    : highPeople > 0
      ? 'pending'
      : 'ready';
  const passedForExit = criticalPeople === 0 && (options.allowQualityHigh || highPeople === 0);

  return {
    key: 'quality',
    label: result.label,
    status,
    passedForExit,
    detail: `${criticalPeople} critical people, ${highPeople} high-priority people in quality queue`,
    command: result.commandLine,
    data: {
      stats,
      issueBreakdown: result.data?.issueBreakdown || [],
      topItems: (result.data?.items || []).slice(0, 5).map(item => ({
        person: item.person?.name,
        severity: item.severity,
        score: item.score,
        issues: item.issues?.map(issue => issue.label) || [],
      })),
    },
  };
}

function buildResponsiveCheck(result, options) {
  if (!result.ok) return failedCommandCheck(result);
  const failed = Number(result.data?.failed || 0);
  const status = failed > 0 ? 'blocked' : 'ready';

  return {
    key: 'responsive',
    label: result.label,
    status,
    passedForExit: failed === 0,
    detail: `${result.data?.passed || 0}/${result.data?.total || 0} responsive smoke checks passed`,
    command: result.commandLine,
    data: {
      baseUrl: result.data?.baseUrl,
      screenshotDir: options.noScreenshots ? null : result.data?.screenshotDir,
      total: result.data?.total,
      passed: result.data?.passed,
      failed: result.data?.failed,
      failures: (result.data?.results || [])
        .filter(item => item.status !== 'pass')
        .map(item => ({
          viewport: item.viewport,
          page: item.name,
          path: item.path,
          failures: item.failures,
        })),
    },
  };
}

function failedCommandCheck(result) {
  return {
    key: result.key,
    label: result.label,
    status: 'failed',
    passedForExit: false,
    detail: result.error || `Command exited ${result.exitCode}`,
    command: result.commandLine,
    data: {
      exitCode: result.exitCode,
      attempts: result.attempts || 1,
      retryReason: result.retryReason || null,
      stderr: result.stderr,
      stdoutPreview: result.stdout.slice(0, 2000),
    },
  };
}

function summarizeGateStatus(checks) {
  if (checks.some(check => check.status === 'failed')) return 'failed';
  if (checks.some(check => check.status === 'blocked')) return 'blocked';
  if (checks.some(check => check.status === 'pending')) return 'pending';
  return 'ready';
}

async function runJsonCommand({ key, label, command, args }) {
  const commandLine = [command, ...args].join(' ');
  let lastResult = null;

  for (let attempt = 1; attempt <= MAX_JSON_COMMAND_ATTEMPTS; attempt += 1) {
    const result = await runJsonCommandOnce({ key, label, command, args, commandLine });
    lastResult = {
      ...result,
      attempts: attempt,
    };

    if (result.ok) return lastResult;

    const retryReason = transientDatabaseFailureReason(result);
    if (retryReason && attempt < MAX_JSON_COMMAND_ATTEMPTS) {
      lastResult.retryReason = retryReason;
      console.error(`[launch_gate] ${key} hit ${retryReason}; retrying ${attempt + 1}/${MAX_JSON_COMMAND_ATTEMPTS}`);
      await wait(attempt * 1500);
      continue;
    }

    if (retryReason) lastResult.retryReason = retryReason;
    return lastResult;
  }

  return lastResult;
}

function runJsonCommandOnce({ key, label, command, args, commandLine }) {
  return new Promise(resolvePromise => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.on('error', error => {
      resolvePromise({ key, label, commandLine, ok: false, exitCode: null, stdout, stderr, error: error.message });
    });
    child.on('close', exitCode => {
      if (exitCode !== 0) {
        resolvePromise({ key, label, commandLine, ok: false, exitCode, stdout, stderr });
        return;
      }

      try {
        resolvePromise({ key, label, commandLine, ok: true, exitCode, stdout, stderr, data: JSON.parse(stdout) });
      } catch (error) {
        resolvePromise({ key, label, commandLine, ok: false, exitCode, stdout, stderr, error: `Invalid JSON output: ${error.message}` });
      }
    });
  });
}

function transientDatabaseFailureReason(result) {
  const haystack = `${result.error || ''}\n${result.stderr || ''}\n${result.stdout || ''}`;
  if (haystack.includes('P1001') || haystack.includes("Can't reach database server")) {
    return 'transient-prisma-p1001';
  }
  return null;
}

function wait(ms) {
  return new Promise(resolvePromise => {
    setTimeout(resolvePromise, ms);
  });
}

function parseArgs(args) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    qualityLimit: 20,
    screenshotDir: '/tmp/ai-person-launch-gate-screenshots',
    timeoutMs: 30000,
    output: null,
    skipResponsive: false,
    noScreenshots: false,
    allowBlockedReadiness: false,
    allowQualityHigh: true,
  };

  for (const arg of args) {
    if (arg === '--skip-responsive') options.skipResponsive = true;
    if (arg === '--no-screenshots') options.noScreenshots = true;
    if (arg === '--allow-blocked-readiness') options.allowBlockedReadiness = true;
    if (arg === '--strict-quality') options.allowQualityHigh = false;
    if (arg.startsWith('--base-url=')) options.baseUrl = arg.slice('--base-url='.length);
    if (arg.startsWith('--quality-limit=')) options.qualityLimit = clampInteger(arg.slice('--quality-limit='.length), 1, 100, options.qualityLimit);
    if (arg.startsWith('--screenshot-dir=')) options.screenshotDir = resolve(arg.slice('--screenshot-dir='.length));
    if (arg.startsWith('--timeout-ms=')) options.timeoutMs = clampInteger(arg.slice('--timeout-ms='.length), 1000, 60000, options.timeoutMs);
    if (arg.startsWith('--output=')) options.output = resolve(arg.slice('--output='.length));
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
