#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const DEFAULT_OUTPUT_DIR = '/tmp/ai-person-rollout-evidence';
const PREVIEW_LIMIT = 1800;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  assertWriteGuards(options);

  const stamp = formatStamp(new Date());
  const outputDir = resolve(options.outputDir || DEFAULT_OUTPUT_DIR);
  const output = options.output || resolve(outputDir, `production-rollout-${stamp}.json`);
  const steps = [];

  const migrationStatus = await runStep({
    key: 'migration-status',
    label: 'Prisma migration status',
    command: prismaCommand(),
    args: ['migrate', 'status', '--schema=prisma/schema.prisma'],
    required: false,
  });
  steps.push(migrationStatus);

  const migrationPlan = await runStep({
    key: 'migration-plan',
    label: 'Migration SQL plan',
    command: process.execPath,
    args: ['scripts/ops/migration_plan.mjs'],
    required: false,
    parseJson: true,
  });
  steps.push(migrationPlan);
  if (shouldStopAfterStep(migrationPlan, options)) {
    pushSkippedRemainder(steps, plannedStepsAfter('migration-plan', options), stopReason(migrationPlan));
    return finishRun({ options, output, steps });
  }

  if (options.executeMigrations) {
    const migrationDeploy = await runStep({
      key: 'migration-deploy',
      label: 'Apply Prisma migrations',
      command: prismaCommand(),
      args: ['migrate', 'deploy', '--schema=prisma/schema.prisma'],
      required: true,
      writes: true,
    });
    steps.push(migrationDeploy);
    if (shouldStopAfterStep(migrationDeploy, options)) {
      pushSkippedRemainder(steps, plannedStepsAfter('migration-deploy', options), stopReason(migrationDeploy));
      return finishRun({ options, output, steps });
    }
  } else {
    steps.push(skippedStep('migration-deploy', 'Apply Prisma migrations', 'Pass --execute-migrations with --confirm-production'));
  }

  const readinessBefore = await runStep({
    key: 'readiness-before',
    label: 'Readiness before rollout actions',
    command: process.execPath,
    args: ['scripts/ops/readiness.mjs'],
    required: true,
    parseJson: true,
  });
  steps.push(readinessBefore);
  if (shouldStopAfterStep(readinessBefore, options)) {
    pushSkippedRemainder(steps, plannedStepsAfter('readiness-before', options), stopReason(readinessBefore));
    return finishRun({ options, output, steps });
  }

  const activityMaterialize = await runStep({
    key: 'activity-materialize',
    label: options.executeActivityBackfill ? 'Materialize ActivityEvent rows' : 'ActivityEvent backfill dry run',
    command: process.execPath,
    args: [
      'scripts/activity/materialize_activity_events.mjs',
      `--days=${options.activityDays}`,
      `--limit=${options.activityLimit}`,
      `--batch-size=${options.activityBatchSize}`,
      ...(options.activityCursor ? [`--cursor=${options.activityCursor}`] : []),
      ...(options.executeActivityBackfill ? ['--execute'] : []),
    ],
    required: options.executeActivityBackfill,
    writes: options.executeActivityBackfill,
    parseJson: true,
  });
  steps.push(activityMaterialize);
  if (shouldStopAfterStep(activityMaterialize, options)) {
    pushSkippedRemainder(steps, plannedStepsAfter('activity-materialize', options), stopReason(activityMaterialize));
    return finishRun({ options, output, steps });
  }

  const newsletterWeekly = await runStep({
    key: 'newsletter-weekly',
    label: newsletterLabel(options),
    command: process.execPath,
    args: [
      'scripts/newsletter/build_weekly_digest_email.mjs',
      `--days=${options.newsletterDays}`,
      `--limit=${options.newsletterLimit}`,
      `--event-limit=${options.newsletterEventLimit}`,
      ...(options.sendNewsletter ? ['--send'] : options.recordNewsletter ? ['--record'] : []),
    ],
    required: options.recordNewsletter || options.sendNewsletter,
    writes: options.recordNewsletter || options.sendNewsletter,
    externalSideEffect: options.sendNewsletter,
    parseJson: true,
  });
  steps.push(newsletterWeekly);
  if (shouldStopAfterStep(newsletterWeekly, options)) {
    pushSkippedRemainder(steps, plannedStepsAfter('newsletter-weekly', options), stopReason(newsletterWeekly));
    return finishRun({ options, output, steps });
  }

  const influenceCalibration = await runStep({
    key: 'influence-calibration',
    label: influenceLabel(options),
    command: process.execPath,
    args: [
      'scripts/influence/calibrate_scores.mjs',
      `--limit=${options.influenceLimit}`,
      `--status=${options.influenceStatus}`,
      ...(options.executeInfluenceAudit || options.applyInfluenceScore ? ['--execute'] : []),
      ...(options.applyInfluenceScore ? ['--apply-score'] : []),
    ],
    required: options.executeInfluenceAudit || options.applyInfluenceScore,
    writes: options.executeInfluenceAudit || options.applyInfluenceScore,
    parseJson: true,
  });
  steps.push(influenceCalibration);
  if (shouldStopAfterStep(influenceCalibration, options)) {
    pushSkippedRemainder(steps, plannedStepsAfter('influence-calibration', options), stopReason(influenceCalibration));
    return finishRun({ options, output, steps });
  }

  const readinessAfter = await runStep({
    key: 'readiness-after',
    label: 'Readiness after rollout actions',
    command: process.execPath,
    args: ['scripts/ops/readiness.mjs'],
    required: true,
    parseJson: true,
  });
  steps.push(readinessAfter);
  if (shouldStopAfterStep(readinessAfter, options)) {
    pushSkippedRemainder(steps, plannedStepsAfter('readiness-after', options), stopReason(readinessAfter));
    return finishRun({ options, output, steps });
  }

  if (options.baseUrl || options.requireLaunchGate) {
    steps.push(await runStep({
      key: 'launch-gate',
      label: 'Production launch gate',
      command: process.execPath,
      args: [
        'scripts/ops/production_launch_gate.mjs',
        ...(options.baseUrl ? [`--base-url=${options.baseUrl}`] : []),
        `--output=${resolve(outputDir, `launch-gate-${stamp}.json`)}`,
        `--quality-limit=${options.qualityLimit}`,
        `--timeout-ms=${options.launchGateTimeoutMs}`,
        ...(options.skipResponsive ? ['--skip-responsive'] : []),
        ...(options.evidenceOnlyLaunchGate ? ['--evidence-only'] : []),
        ...(options.allowLocal ? ['--allow-local'] : []),
      ],
      required: options.requireLaunchGate,
      parseJson: true,
    }));
  } else {
    steps.push(skippedStep('launch-gate', 'Production launch gate', 'Set PRODUCTION_BASE_URL or pass --base-url'));
  }

  return finishRun({ options, output, steps });
}

async function finishRun({ options, output, steps }) {
  const assessment = buildAssessment(steps);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: options.hasWriteActions ? 'production_execute' : 'dry_run',
    confirmedProduction: options.confirmProduction,
    output,
    options: publicOptions(options),
    status: summarizeSteps(steps),
    passForExit: steps.every(step => step.exitPass),
    assessment,
    steps,
  };

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (!report.passForExit) process.exitCode = 1;
}

function parseArgs(args) {
  const options = {
    baseUrl: firstEnv('PRODUCTION_BASE_URL', 'ROLLOUT_BASE_URL', 'LAUNCH_GATE_BASE_URL'),
    outputDir: process.env.ROLLOUT_OUTPUT_DIR || DEFAULT_OUTPUT_DIR,
    output: null,
    confirmProduction: false,
    executeMigrations: false,
    executeActivityBackfill: false,
    recordNewsletter: false,
    sendNewsletter: false,
    confirmNewsletterSend: false,
    executeInfluenceAudit: false,
    applyInfluenceScore: false,
    confirmScoreApply: false,
    requireLaunchGate: false,
    evidenceOnlyLaunchGate: false,
    skipResponsive: false,
    allowLocal: false,
    activityDays: clampInteger(process.env.ROLLOUT_ACTIVITY_DAYS, 1, 365, 90),
    activityLimit: clampInteger(process.env.ROLLOUT_ACTIVITY_LIMIT, 1, 500, 500),
    activityBatchSize: clampInteger(process.env.ROLLOUT_ACTIVITY_BATCH_SIZE, 1, 500, 100),
    activityCursor: process.env.ROLLOUT_ACTIVITY_CURSOR || null,
    newsletterDays: clampInteger(process.env.ROLLOUT_NEWSLETTER_DAYS, 1, 30, 7),
    newsletterLimit: clampInteger(process.env.ROLLOUT_NEWSLETTER_LIMIT, 1, 500, 50),
    newsletterEventLimit: clampInteger(process.env.ROLLOUT_NEWSLETTER_EVENT_LIMIT, 1, 24, 12),
    influenceLimit: clampInteger(process.env.ROLLOUT_INFLUENCE_LIMIT, 1, 200, 24),
    influenceStatus: process.env.ROLLOUT_INFLUENCE_STATUS || 'all',
    qualityLimit: clampInteger(process.env.LAUNCH_GATE_QUALITY_LIMIT, 1, 100, 20),
    launchGateTimeoutMs: clampInteger(process.env.LAUNCH_GATE_TIMEOUT_MS, 1000, 60000, 30000),
  };

  for (const arg of args) {
    if (arg === '--confirm-production') options.confirmProduction = true;
    if (arg === '--execute-migrations') options.executeMigrations = true;
    if (arg === '--execute-activity-backfill') options.executeActivityBackfill = true;
    if (arg === '--record-newsletter') options.recordNewsletter = true;
    if (arg === '--send-newsletter') {
      options.sendNewsletter = true;
      options.recordNewsletter = true;
    }
    if (arg === '--confirm-newsletter-send') options.confirmNewsletterSend = true;
    if (arg === '--execute-influence-audit') options.executeInfluenceAudit = true;
    if (arg === '--apply-influence-score') {
      options.applyInfluenceScore = true;
      options.executeInfluenceAudit = true;
    }
    if (arg === '--confirm-score-apply') options.confirmScoreApply = true;
    if (arg === '--require-launch-gate') options.requireLaunchGate = true;
    if (arg === '--evidence-only-launch-gate') options.evidenceOnlyLaunchGate = true;
    if (arg === '--skip-responsive') options.skipResponsive = true;
    if (arg === '--allow-local') options.allowLocal = true;
    if (arg.startsWith('--base-url=')) options.baseUrl = arg.slice('--base-url='.length);
    if (arg.startsWith('--output-dir=')) options.outputDir = resolve(arg.slice('--output-dir='.length));
    if (arg.startsWith('--output=')) options.output = resolve(arg.slice('--output='.length));
    if (arg.startsWith('--activity-days=')) options.activityDays = clampInteger(arg.slice('--activity-days='.length), 1, 365, options.activityDays);
    if (arg.startsWith('--activity-limit=')) options.activityLimit = clampInteger(arg.slice('--activity-limit='.length), 1, 500, options.activityLimit);
    if (arg.startsWith('--activity-batch-size=')) options.activityBatchSize = clampInteger(arg.slice('--activity-batch-size='.length), 1, 500, options.activityBatchSize);
    if (arg.startsWith('--activity-cursor=')) options.activityCursor = arg.slice('--activity-cursor='.length).trim() || null;
    if (arg.startsWith('--newsletter-days=')) options.newsletterDays = clampInteger(arg.slice('--newsletter-days='.length), 1, 30, options.newsletterDays);
    if (arg.startsWith('--newsletter-limit=')) options.newsletterLimit = clampInteger(arg.slice('--newsletter-limit='.length), 1, 500, options.newsletterLimit);
    if (arg.startsWith('--newsletter-event-limit=')) options.newsletterEventLimit = clampInteger(arg.slice('--newsletter-event-limit='.length), 1, 24, options.newsletterEventLimit);
    if (arg.startsWith('--influence-limit=')) options.influenceLimit = clampInteger(arg.slice('--influence-limit='.length), 1, 200, options.influenceLimit);
    if (arg.startsWith('--influence-status=')) options.influenceStatus = arg.slice('--influence-status='.length) || options.influenceStatus;
    if (arg.startsWith('--quality-limit=')) options.qualityLimit = clampInteger(arg.slice('--quality-limit='.length), 1, 100, options.qualityLimit);
    if (arg.startsWith('--timeout-ms=')) options.launchGateTimeoutMs = clampInteger(arg.slice('--timeout-ms='.length), 1000, 60000, options.launchGateTimeoutMs);
  }

  options.hasWriteActions = Boolean(
    options.executeMigrations
      || options.executeActivityBackfill
      || options.recordNewsletter
      || options.sendNewsletter
      || options.executeInfluenceAudit
      || options.applyInfluenceScore,
  );
  options.activityBatchSize = Math.min(options.activityBatchSize, options.activityLimit);

  return options;
}

function assertWriteGuards(options) {
  if (options.hasWriteActions && !options.confirmProduction) {
    throw new Error('Production write actions require --confirm-production.');
  }
  if (options.sendNewsletter && !options.confirmNewsletterSend) {
    throw new Error('Newsletter sending requires --confirm-newsletter-send.');
  }
  if (options.applyInfluenceScore && !options.confirmScoreApply) {
    throw new Error('Applying influence scores requires --confirm-score-apply.');
  }
}

async function runStep(step) {
  const startedAt = new Date();
  const result = await runCommand(step.command, step.args);
  const parsed = step.parseJson ? parseFirstJsonObject(result.stdout) : null;
  const data = buildStepData(step.key, result, parsed);
  const status = result.exitCode === 0 ? 'completed' : step.required ? 'failed' : 'warning';
  return {
    key: step.key,
    label: step.label,
    status,
    exitPass: result.exitCode === 0 || !step.required,
    required: step.required,
    writes: Boolean(step.writes),
    externalSideEffect: Boolean(step.externalSideEffect),
    command: [step.command, ...step.args].join(' '),
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    exitCode: result.exitCode,
    data: redactData(data),
    stdoutPreview: redactPreview(result.stdout),
    stderrPreview: redactPreview(result.stderr),
  };
}

function buildStepData(key, result, parsed) {
  if (key === 'migration-status') return parsePrismaMigrationStatus(result.stdout);
  return parsed;
}

function runCommand(command, args) {
  return new Promise(resolvePromise => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', error => {
      resolvePromise({ exitCode: 1, stdout, stderr: `${stderr}\n${error.message}` });
    });
    child.on('close', exitCode => {
      resolvePromise({ exitCode: exitCode || 0, stdout, stderr });
    });
  });
}

function skippedStep(key, label, reason) {
  return {
    key,
    label,
    status: 'skipped',
    exitPass: true,
    required: false,
    writes: false,
    externalSideEffect: false,
    command: null,
    startedAt: null,
    finishedAt: null,
    exitCode: null,
    data: null,
    stdoutPreview: '',
    stderrPreview: reason,
  };
}

function summarizeSteps(steps) {
  if (steps.some(step => step.status === 'failed')) return 'failed';
  if (steps.some(step => step.status === 'warning')) return 'warning';
  if (steps.some(step => step.status === 'skipped')) return 'partial';
  return 'completed';
}

function shouldStopAfterStep(step) {
  return (step.status === 'failed' && (step.required || isDatabaseConnectivityFailure(step)))
    || (step.key === 'migration-plan' && step.data?.safeToApply === false);
}

function stopReason(step) {
  if (isDatabaseConnectivityFailure(step)) {
    return `Skipped because ${step.key} could not reach the database`;
  }
  if (step.key === 'migration-plan' && step.data?.safeToApply === false) {
    return 'Skipped because migration plan is not safe to apply';
  }
  return `Skipped because ${step.key} failed`;
}

function pushSkippedRemainder(steps, remainder, reason) {
  for (const step of remainder) {
    steps.push(skippedStep(step.key, step.label, reason));
  }
}

function plannedStepsAfter(key, options) {
  const planned = [
    { key: 'migration-plan', label: 'Migration SQL plan' },
    { key: 'migration-deploy', label: 'Apply Prisma migrations' },
    { key: 'readiness-before', label: 'Readiness before rollout actions' },
    {
      key: 'activity-materialize',
      label: options.executeActivityBackfill ? 'Materialize ActivityEvent rows' : 'ActivityEvent backfill dry run',
    },
    { key: 'newsletter-weekly', label: newsletterLabel(options) },
    { key: 'influence-calibration', label: influenceLabel(options) },
    { key: 'readiness-after', label: 'Readiness after rollout actions' },
    { key: 'launch-gate', label: 'Production launch gate' },
  ];
  const index = planned.findIndex(step => step.key === key);
  return index >= 0 ? planned.slice(index + 1) : [];
}

function buildAssessment(steps) {
  const byKey = new Map(steps.map(step => [step.key, step]));
  const migrationStatus = byKey.get('migration-status')?.data || {};
  const migrationPlan = byKey.get('migration-plan')?.data;
  const readinessAfter = byKey.get('readiness-after')?.data;
  const launchGate = byKey.get('launch-gate')?.data;
  const blockers = [];
  const nextActions = [];

  const failedSteps = steps.filter(step => step.status === 'failed');
  if (failedSteps.length > 0) {
    for (const step of failedSteps) {
      blockers.push({
        key: step.key,
        detail: `${step.label} failed`,
        status: 'failed',
      });
    }
  }

  if (steps.some(step => isDatabaseConnectivityFailure(step))) {
    blockers.push({
      key: 'database-connectivity',
      detail: 'One or more rollout steps could not reach the database server',
      status: 'failed',
    });
    nextActions.push({
      key: 'verify-database-connectivity',
      command: 'npm run ops:readiness',
      detail: 'Verify DATABASE_URL / DIRECT_URL, Neon availability, and local network connectivity before running production writes',
    });
  }

  if ((migrationStatus.pendingMigrations || []).length > 0) {
    blockers.push({
      key: 'pending-migrations',
      detail: `${migrationStatus.pendingMigrations.length} migrations are not applied`,
      migrations: migrationStatus.pendingMigrations,
    });
    if (migrationPlan?.safeToApply) {
      nextActions.push({
        key: 'apply-migrations',
        command: 'npm run ops:production-rollout -- --confirm-production --execute-migrations',
        detail: 'Apply pending Prisma migrations before backfill, newsletter delivery logs, and influence audit observation',
      });
    } else {
      nextActions.push({
        key: 'review-migration-plan',
        command: 'npm run ops:migration-plan',
        detail: 'Review migration SQL plan before applying pending migrations',
      });
    }
  }

  if (migrationPlan && migrationPlan.safeToApply === false) {
    blockers.push({
      key: 'migration-plan',
      detail: `Migration plan is ${migrationPlan.status}`,
      status: migrationPlan.status,
    });
  }

  const readinessChecks = readinessAfter?.checks || [];
  for (const check of readinessChecks.filter(item => item.status === 'blocked' || item.status === 'pending')) {
    blockers.push({
      key: check.key,
      detail: check.detail,
      status: check.status,
    });
  }

  if (readinessAfter?.schema?.activityEvent?.exists) {
    if ((readinessAfter?.activity?.total || 0) === 0) {
      nextActions.push({
        key: 'activity-backfill',
        command: 'npm run ops:production-rollout -- --confirm-production --execute-activity-backfill --activity-limit=500 --activity-batch-size=100',
        detail: 'Materialize ActivityEvent rows after migration is applied; continue later with --activity-cursor from the previous report if needed',
      });
    }
  }

  if (readinessAfter?.schema?.newsletterDeliveryLog?.providerColumns) {
    if ((readinessAfter?.newsletter?.dryRun || 0) === 0) {
      nextActions.push({
        key: 'newsletter-record',
        command: 'npm run ops:production-rollout -- --confirm-production --record-newsletter',
        detail: 'Record a dry-run weekly digest before real sending',
      });
    }
    if (readinessAfter?.newsletterEnv?.readyToSend && (readinessAfter?.newsletter?.sent || 0) === 0) {
      nextActions.push({
        key: 'newsletter-send',
        command: 'npm run ops:production-rollout -- --confirm-production --send-newsletter --confirm-newsletter-send',
        detail: 'Send a real newsletter only after provider, sender, URL, and token secret are ready',
      });
    }
  }

  if (readinessAfter?.schema?.influenceScoreAuditLog?.exists && (readinessAfter?.influence?.audits || 0) === 0) {
    nextActions.push({
      key: 'influence-audit',
      command: 'npm run ops:production-rollout -- --confirm-production --execute-influence-audit',
      detail: 'Write influence calibration audit rows before applying score changes',
    });
  }

  if (launchGate?.gateStatus && launchGate.gateStatus !== 'ready') {
    blockers.push({
      key: 'launch-gate',
      detail: `Launch gate is ${launchGate.gateStatus}`,
      status: launchGate.gateStatus,
    });
  }

  if (nextActions.length === 0 && blockers.length === 0) {
    nextActions.push({
      key: 'strict-launch-gate',
      command: 'npm run ops:production-launch-gate',
      detail: 'Run strict production launch gate without evidence-only mode',
    });
  }

  return {
    readinessStatus: readinessAfter?.overallStatus || null,
    launchGateStatus: launchGate?.gateStatus || null,
    pendingMigrations: migrationStatus.pendingMigrations || [],
    migrationPlanStatus: migrationPlan?.status || null,
    migrationPlanSafeToApply: migrationPlan?.safeToApply ?? null,
    migrationOperationBreakdown: migrationPlan?.summary?.operationBreakdown || null,
    blockers: dedupeAssessmentItems(blockers),
    nextActions: dedupeAssessmentItems(nextActions),
  };
}

function parsePrismaMigrationStatus(stdout) {
  const lines = stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const migrationCountLine = lines.find(line => /migrations? found in prisma\/migrations/.test(line));
  const migrationCount = migrationCountLine ? Number(migrationCountLine.match(/(\d+)/)?.[1] || 0) : null;
  const datasourceLine = lines.find(line => line.startsWith('Datasource ')) || null;
  const pendingIndex = lines.findIndex(line => line.startsWith('Following migrations have not yet been applied'));
  const pendingMigrations = [];

  if (pendingIndex >= 0) {
    for (const line of lines.slice(pendingIndex + 1)) {
      if (!/^\d{14}_[a-z0-9_]+$/i.test(line)) break;
      pendingMigrations.push(line);
    }
  }

  return {
    migrationCount,
    pendingMigrations,
    hasPendingMigrations: pendingMigrations.length > 0,
    datasource: datasourceLine,
  };
}

function dedupeAssessmentItems(items) {
  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    const key = `${item.key}:${item.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function isDatabaseConnectivityFailure(step) {
  const haystack = [
    step.stderrPreview,
    step.stdoutPreview,
    JSON.stringify(step.data || {}),
  ].join('\n');
  return haystack.includes("Can't reach database server")
    || haystack.includes('P1001')
    || haystack.includes('PrismaClientInitializationError');
}

function parseFirstJsonObject(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function prismaCommand() {
  return process.platform === 'win32'
    ? resolve('node_modules/.bin/prisma.cmd')
    : resolve('node_modules/.bin/prisma');
}

function newsletterLabel(options) {
  if (options.sendNewsletter) return 'Weekly newsletter real send';
  if (options.recordNewsletter) return 'Weekly newsletter dry-run record';
  return 'Weekly newsletter dry run';
}

function influenceLabel(options) {
  if (options.applyInfluenceScore) return 'Influence calibration and score apply';
  if (options.executeInfluenceAudit) return 'Influence calibration audit record';
  return 'Influence calibration dry run';
}

function publicOptions(options) {
  return {
    baseUrl: options.baseUrl || null,
    executeMigrations: options.executeMigrations,
    executeActivityBackfill: options.executeActivityBackfill,
    recordNewsletter: options.recordNewsletter,
    sendNewsletter: options.sendNewsletter,
    executeInfluenceAudit: options.executeInfluenceAudit,
    applyInfluenceScore: options.applyInfluenceScore,
    requireLaunchGate: options.requireLaunchGate,
    evidenceOnlyLaunchGate: options.evidenceOnlyLaunchGate,
    skipResponsive: options.skipResponsive,
    allowLocal: options.allowLocal,
    activityDays: options.activityDays,
    activityLimit: options.activityLimit,
    activityBatchSize: options.activityBatchSize,
    activityCursor: options.activityCursor,
    newsletterDays: options.newsletterDays,
    newsletterLimit: options.newsletterLimit,
    newsletterEventLimit: options.newsletterEventLimit,
    influenceLimit: options.influenceLimit,
    influenceStatus: options.influenceStatus,
    qualityLimit: options.qualityLimit,
    launchGateTimeoutMs: options.launchGateTimeoutMs,
  };
}

function redactPreview(text) {
  return text
    .slice(0, PREVIEW_LIMIT)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(postgres(?:ql)?:\/\/)[^\s"']+/gi, '$1[redacted]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[redacted]');
}

function redactData(value, key = '') {
  if (Array.isArray(value)) return value.map(item => redactData(item, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactData(entryValue, entryKey)]),
    );
  }
  if (typeof value !== 'string') return value;

  const normalizedKey = key.toLowerCase();
  if (normalizedKey.includes('email')) return '[email]';
  if (normalizedKey.includes('unsubscribe')) return '[redacted-url]';
  if (normalizedKey.includes('token')) return '[redacted]';
  if (normalizedKey.includes('apikey') || normalizedKey.includes('api_key')) return '[redacted]';

  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(postgres(?:ql)?:\/\/)[^\s"']+/gi, '$1[redacted]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[redacted]');
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
