#!/usr/bin/env node
/**
 * Read-only rollout preflight for CompanySource materialization.
 *
 * Default mode does not query the database. Add --check-db only when the
 * current DATABASE_URL is a confirmed local/dev/staging database.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const DEFAULT_INPUT = 'docs/company/anthropic-evidence-seed.json';
const COMPANY_MIGRATION = '20260618123000_company_sources';
const COMPANY_MIGRATION_SQL = `prisma/migrations/${COMPANY_MIGRATION}/migration.sql`;
const DESTRUCTIVE_PATTERNS = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bDROP\s+INDEX\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bUPDATE\s+["\w.]+\s+SET\b/i,
  /\bALTER\s+TABLE\b[\s\S]*\bDROP\b/i,
];

main()
  .catch(error => {
    console.error(error?.message || error);
    process.exitCode = 1;
  });

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const [dryRun, migration, db] = await Promise.all([
    runCompanyDryRun(options.input),
    analyzeCompanyMigration(),
    options.checkDb ? readMigrationStatus() : Promise.resolve(null),
  ]);
  const environment = getDbInfo();
  const checks = buildChecks({ options, environment, dryRun, migration, db });
  const report = {
    generatedAt: new Date().toISOString(),
    status: summarizeStatus(checks),
    input: resolve(options.input),
    environment,
    dryRun,
    migration,
    db,
    checks,
    nextActions: buildNextActions({ checks, options }),
  };

  if (options.output) {
    await mkdir(dirname(resolve(options.output)), { recursive: true });
    await writeFile(resolve(options.output), `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.status === 'blocked') process.exitCode = 1;
}

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    output: null,
    checkDb: false,
    allowRemoteDev: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--check-db') options.checkDb = true;
    else if (arg === '--allow-remote-dev') options.allowRemoteDev = true;
    else if (arg.startsWith('--input=')) options.input = arg.slice('--input='.length);
    else if (arg.startsWith('--out=')) options.output = arg.slice('--out='.length);
    else if (arg.startsWith('--output=')) options.output = arg.slice('--output='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function runCompanyDryRun(input) {
  const result = await runCommand(process.execPath, [
    'scripts/company/materialize_company_sources.mjs',
    `--input=${input}`,
    '--strict',
  ]);

  if (result.exitCode !== 0) {
    return {
      status: 'blocked',
      exitCode: result.exitCode,
      error: result.stderr || result.stdout || 'company materialize dry-run failed',
    };
  }

  try {
    const payload = JSON.parse(result.stdout);
    return {
      status: payload.review?.pass ? 'ready' : 'blocked',
      pass: payload.review?.pass === true,
      review: payload.review,
      rows: payload.dryRunResult?.rows || null,
      stagingStatus: payload.stagingBatch?.status || null,
      writeEnabled: payload.stagingBatch?.writeEnabled === true,
    };
  } catch (error) {
    return {
      status: 'blocked',
      exitCode: result.exitCode,
      error: `Invalid JSON from company materialize dry-run: ${error.message}`,
    };
  }
}

async function analyzeCompanyMigration() {
  const sqlPath = resolve(COMPANY_MIGRATION_SQL);
  let sql = '';
  try {
    sql = await readFile(sqlPath, 'utf8');
  } catch (error) {
    return {
      status: 'blocked',
      name: COMPANY_MIGRATION,
      path: sqlPath,
      error: error.message,
      safeToApply: false,
      operations: [],
    };
  }

  const statements = splitSqlStatements(sql);
  const operations = statements.map((statement, index) => classifyStatement(statement, index + 1));
  const destructiveCount = operations.filter(operation => operation.risk === 'destructive').length;
  const reviewCount = operations.filter(operation => operation.risk === 'review').length;
  const safeToApply = destructiveCount === 0 && reviewCount === 0;

  return {
    status: safeToApply ? 'ready' : destructiveCount > 0 ? 'blocked' : 'review',
    name: COMPANY_MIGRATION,
    path: sqlPath,
    statementCount: statements.length,
    safeToApply,
    destructiveCount,
    reviewCount,
    operations,
  };
}

function classifyStatement(statement, ordinal) {
  const normalized = statement.replace(/\s+/g, ' ').trim();
  if (DESTRUCTIVE_PATTERNS.some(pattern => pattern.test(normalized))) {
    return operation({ ordinal, statement: normalized, type: 'destructive_sql', risk: 'destructive' });
  }
  if (/^CREATE\s+TABLE\b/i.test(normalized)) {
    return operation({ ordinal, statement: normalized, type: 'create_table', objectName: readQuotedObject(normalized) });
  }
  if (/^CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(normalized)) {
    return operation({ ordinal, statement: normalized, type: normalized.includes('UNIQUE INDEX') ? 'create_unique_index' : 'create_index', objectName: readQuotedObject(normalized) });
  }
  if (/^ALTER\s+TABLE\b[\s\S]*\bADD\s+CONSTRAINT\b[\s\S]*\bFOREIGN\s+KEY\b/i.test(normalized)) {
    return operation({ ordinal, statement: normalized, type: 'add_foreign_key', objectName: readConstraintName(normalized) });
  }
  return operation({ ordinal, statement: normalized, type: 'unknown_sql', risk: 'review' });
}

function operation({ ordinal, statement, type, objectName = null, risk = 'safe' }) {
  return {
    ordinal,
    type,
    risk,
    objectName,
    statementPreview: statement.slice(0, 280),
  };
}

async function readMigrationStatus() {
  const result = await runCommand(prismaCommand(), ['migrate', 'status', '--schema=prisma/schema.prisma']);
  const pendingMigrations = parsePendingMigrations(result.stdout);
  return {
    status: result.exitCode === 0
      ? 'ready'
      : pendingMigrations.includes(COMPANY_MIGRATION)
        ? 'pending'
        : 'failed',
    exitCode: result.exitCode,
    companyMigrationPending: pendingMigrations.includes(COMPANY_MIGRATION),
    pendingMigrations,
    datasource: parseDatasource(result.stdout),
    stdoutPreview: redactPreview(result.stdout),
    stderrPreview: redactPreview(result.stderr),
  };
}

function buildChecks({ options, environment, dryRun, migration, db }) {
  const checks = [
    check('dry-run-pack', 'Company dry-run pack', dryRun.status, dryRun.pass ? `${dryRun.rows?.companySources || 0} sources, ${dryRun.rows?.companyThreadLinks || 0} thread links` : dryRun.error || 'dry-run review failed'),
    check('migration-sql', 'CompanySource migration SQL', migration.status, migration.safeToApply ? `${migration.statementCount} safe statements` : `${migration.destructiveCount} destructive, ${migration.reviewCount} review statements`),
    environmentCheck(environment, options),
  ];

  if (db) {
    checks.push(check(
      'database-migration-status',
      'Database migration status',
      db.status === 'ready' || db.status === 'pending' ? db.status : 'blocked',
      db.status === 'ready'
        ? 'Prisma reports database schema is up to date'
        : db.status === 'pending'
          ? `${COMPANY_MIGRATION} is pending`
          : db.stderrPreview || db.stdoutPreview || 'Migration status failed'
    ));
  } else {
    checks.push(check(
      'database-migration-status',
      'Database migration status',
      'pending',
      'Skipped by default; pass --check-db only for a confirmed local/dev/staging database'
    ));
  }

  checks.push(check(
    'execute-command',
    'Materialize execute command',
    checks.some(item => item.status === 'blocked') ? 'blocked' : db?.status === 'pending' || !db ? 'pending' : 'ready',
    buildExecuteDetail({ options, environment, db })
  ));

  return checks;
}

function environmentCheck(environment, options) {
  if (environment.nodeEnv === 'production' || environment.vercel) {
    return check('environment-write-guard', 'Environment write guard', 'blocked', 'NODE_ENV=production or VERCEL is set; execute mode must not run here');
  }
  if (!environment.configured) {
    return check('environment-write-guard', 'Environment write guard', 'blocked', 'DATABASE_URL is not configured');
  }
  if (!environment.local && !options.allowRemoteDev) {
    return check('environment-write-guard', 'Environment write guard', 'blocked', `Remote database host ${environment.host}; require --allow-remote-dev after confirming this is dev/staging`);
  }
  return check('environment-write-guard', 'Environment write guard', 'ready', environment.local ? 'Local database target' : `Remote dev/staging confirmed: ${environment.host}`);
}

function buildExecuteDetail({ options, environment, db }) {
  const command = [
    'pnpm company:materialize --',
    '--execute',
    '--create-organization',
    `--input=${DEFAULT_INPUT}`,
    '--output=/tmp/company-sources-apply.json',
    !environment.local && options.allowRemoteDev ? '--allow-remote-dev' : null,
  ].filter(Boolean).join(' ');

  if (environment.nodeEnv === 'production' || environment.vercel) return 'Blocked in production/Vercel environment';
  if (!environment.local && !options.allowRemoteDev) return 'Blocked until the remote DB is explicitly confirmed as dev/staging';
  if (!db) return `Pending DB status check. Next command after migration check: ${command}`;
  if (db.status === 'pending') return `Apply pending migration before materialize. Then run: ${command}`;
  if (db.status !== 'ready') return 'Blocked by migration status failure';
  return command;
}

function buildNextActions({ checks, options }) {
  if (checks.some(item => item.key === 'environment-write-guard' && item.status === 'blocked')) {
    return [
      {
        key: 'switch-database',
        command: 'Set DATABASE_URL to a local or confirmed dev/staging database, without VERCEL=true.',
        detail: 'The current environment is not allowed to execute company materialization.',
      },
    ];
  }
  if (!options.checkDb) {
    return [
      {
        key: 'check-db',
        command: 'pnpm company:preflight -- --check-db',
        detail: 'Run this only after confirming DATABASE_URL points to local/dev/staging.',
      },
    ];
  }
  if (checks.some(item => item.key === 'database-migration-status' && item.status === 'pending')) {
    return [
      {
        key: 'apply-company-migration',
        command: 'pnpm db:migrate',
        detail: 'Apply the CompanySource migration on the confirmed dev/staging database.',
      },
    ];
  }
  return [
    {
      key: 'materialize-company-sources',
      command: 'pnpm company:materialize -- --execute --create-organization --input=docs/company/anthropic-evidence-seed.json --output=/tmp/company-sources-apply.json',
      detail: 'Upsert reviewed CompanySource and CompanyThreadLink rows.',
    },
  ];
}

function summarizeStatus(checks) {
  if (checks.some(item => item.status === 'blocked')) return 'blocked';
  if (checks.some(item => item.status === 'pending')) return 'pending';
  return 'ready';
}

function check(key, label, status, detail) {
  return { key, label, status, detail };
}

function getDbInfo() {
  const connectionString = process.env.DATABASE_URL || '';
  const info = {
    configured: Boolean(connectionString),
    host: null,
    database: null,
    local: false,
    nodeEnv: process.env.NODE_ENV || null,
    vercel: Boolean(process.env.VERCEL),
  };
  try {
    if (connectionString) {
      const url = new URL(connectionString);
      info.host = url.hostname;
      info.database = url.pathname.replace(/^\//, '') || null;
      info.local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    }
  } catch {
    info.host = 'unparseable';
  }
  return info;
}

function splitSqlStatements(sql) {
  const withoutComments = sql
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  return withoutComments
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
}

function parsePendingMigrations(stdout) {
  const lines = stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const pendingIndex = lines.findIndex(line => line.startsWith('Following migrations have not yet been applied'));
  if (pendingIndex < 0) return [];
  const pending = [];
  for (const line of lines.slice(pendingIndex + 1)) {
    if (!/^\d{14}_[a-z0-9_]+$/i.test(line)) break;
    pending.push(line);
  }
  return pending;
}

function parseDatasource(stdout) {
  return stdout.split(/\r?\n/).map(line => line.trim()).find(line => line.startsWith('Datasource ')) || null;
}

function readQuotedObject(statement) {
  return statement.match(/"([^"]+)"/)?.[1] || null;
}

function readConstraintName(statement) {
  return statement.match(/ADD\s+CONSTRAINT\s+"([^"]+)"/i)?.[1] || null;
}

function redactPreview(value) {
  return String(value || '')
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, 'postgresql://<redacted>')
    .slice(0, 2000);
}

function prismaCommand() {
  return process.platform === 'win32'
    ? resolve('node_modules/.bin/prisma.cmd')
    : resolve('node_modules/.bin/prisma');
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
    child.on('error', error => resolvePromise({ exitCode: 1, stdout, stderr: `${stderr}\n${error.message}` }));
    child.on('close', exitCode => resolvePromise({ exitCode: exitCode || 0, stdout, stderr }));
  });
}

function printHelp() {
  console.log(`
Usage:
  pnpm company:preflight -- --input=docs/company/anthropic-evidence-seed.json
  pnpm company:preflight -- --check-db --output=/tmp/company-source-preflight.json

Default mode does not query the database. Use --check-db only after confirming DATABASE_URL points to a local/dev/staging database.
`);
}
