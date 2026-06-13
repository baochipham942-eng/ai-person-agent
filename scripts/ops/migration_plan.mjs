#!/usr/bin/env node
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const MIGRATIONS_DIR = 'prisma/migrations';
const SCHEMA_PATH = 'prisma/schema.prisma';
const DESTRUCTIVE_PATTERNS = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bDROP\s+INDEX\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bUPDATE\s+["\w.]+\s+SET\b/i,
  /\bALTER\s+TABLE\b[\s\S]*\bDROP\b/i,
];
const REVIEW_PATTERNS = [
  /\bALTER\s+TABLE\b[\s\S]*\bRENAME\b/i,
  /\bALTER\s+TABLE\b[\s\S]*\bALTER\s+COLUMN\b/i,
  /\bINSERT\s+INTO\b/i,
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const migrationStatus = options.localOnly
    ? { status: 'skipped', exitCode: null, pendingMigrations: null, stdoutPreview: '', stderrPreview: 'Skipped by --local-only' }
    : await readMigrationStatus();
  const migrations = await analyzeMigrations(migrationStatus.pendingMigrations, options);
  const summary = summarizePlan(migrationStatus, migrations);
  const report = {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    safeToApply: summary.safeToApply,
    migrationStatus,
    summary,
    migrations,
    nextActions: buildNextActions(summary),
  };

  if (options.output) {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, JSON.stringify(report, null, 2));
  }

  console.log(JSON.stringify(report, null, 2));
  if (!report.safeToApply) process.exitCode = 1;
}

async function readMigrationStatus() {
  const result = await runCommand(prismaCommand(), ['migrate', 'status', `--schema=${SCHEMA_PATH}`]);
  const pendingMigrations = parsePendingMigrations(result.stdout);
  const migrationCount = parseMigrationCount(result.stdout);
  const datasource = parseDatasource(result.stdout);
  const status = result.exitCode === 0
    ? 'ready'
    : pendingMigrations.length > 0
      ? 'pending'
      : 'failed';

  return {
    status,
    exitCode: result.exitCode,
    migrationCount,
    pendingMigrations,
    datasource,
    stdoutPreview: redactPreview(result.stdout),
    stderrPreview: redactPreview(result.stderr),
  };
}

async function analyzeMigrations(pendingMigrations, options) {
  const migrationNames = pendingMigrations?.length
    ? pendingMigrations
    : options.localOnly
      ? await listMigrationNames()
      : [];
  const selectedNames = options.includeAll ? await listMigrationNames() : migrationNames;

  const migrations = [];
  for (const name of selectedNames) {
    const sqlPath = join(MIGRATIONS_DIR, name, 'migration.sql');
    const sql = await readFile(sqlPath, 'utf8');
    const statements = splitSqlStatements(sql);
    const operations = statements.map((statement, index) => classifyStatement(statement, index + 1));
    migrations.push({
      name,
      path: sqlPath,
      statementCount: statements.length,
      safeToApply: operations.every(operation => operation.risk === 'safe'),
      hasDestructiveSql: operations.some(operation => operation.risk === 'destructive'),
      needsReview: operations.some(operation => operation.risk !== 'safe'),
      operations,
    });
  }
  return migrations;
}

function classifyStatement(statement, ordinal) {
  const normalized = statement.replace(/\s+/g, ' ').trim();
  const destructivePattern = DESTRUCTIVE_PATTERNS.find(pattern => pattern.test(normalized));
  if (destructivePattern) {
    return operation({ ordinal, statement: normalized, type: 'destructive_sql', risk: 'destructive' });
  }

  const reviewPattern = REVIEW_PATTERNS.find(pattern => pattern.test(normalized));
  if (reviewPattern) {
    return operation({ ordinal, statement: normalized, type: 'manual_review_sql', risk: 'review' });
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
  if (/^ALTER\s+TABLE\b[\s\S]*\bADD\s+COLUMN\b/i.test(normalized)) {
    const columnCount = (normalized.match(/\bADD\s+COLUMN\b/gi) || []).length;
    return operation({ ordinal, statement: normalized, type: columnCount > 1 ? 'add_columns' : 'add_column', objectName: readAlterTableName(normalized), columnCount });
  }

  return operation({ ordinal, statement: normalized, type: 'unknown_sql', risk: 'review' });
}

function operation({ ordinal, statement, type, objectName = null, columnCount = null, risk = 'safe' }) {
  return {
    ordinal,
    type,
    risk,
    objectName,
    columnCount,
    statementPreview: statement.slice(0, 320),
  };
}

function summarizePlan(migrationStatus, migrations) {
  const destructiveStatements = migrations.flatMap(migration => migration.operations.filter(operation => operation.risk === 'destructive'));
  const reviewStatements = migrations.flatMap(migration => migration.operations.filter(operation => operation.risk === 'review'));
  const safeToApply = migrationStatus.status !== 'failed'
    && destructiveStatements.length === 0
    && reviewStatements.length === 0;
  return {
    status: migrationStatus.status === 'failed'
      ? 'failed'
      : destructiveStatements.length > 0
        ? 'blocked'
        : reviewStatements.length > 0
          ? 'review'
          : migrations.length > 0
            ? 'ready_to_apply'
            : 'no_pending_migrations',
    safeToApply,
    pendingMigrationCount: migrations.length,
    statementCount: migrations.reduce((sum, migration) => sum + migration.statementCount, 0),
    destructiveCount: destructiveStatements.length,
    reviewCount: reviewStatements.length,
    operationBreakdown: countBy(migrations.flatMap(migration => migration.operations), operation => operation.type),
  };
}

function buildNextActions(summary) {
  if (summary.status === 'failed') {
    return [{ key: 'verify-migration-status', command: 'npm run ops:migration-plan', detail: 'Fix database connectivity or migration status failure before production writes' }];
  }
  if (!summary.safeToApply) {
    return [{ key: 'review-migration-sql', command: 'npm run ops:migration-plan -- --include-all', detail: 'Review destructive or unknown migration SQL before deploy' }];
  }
  if (summary.pendingMigrationCount > 0) {
    return [{ key: 'apply-migrations', command: 'npm run ops:production-rollout -- --confirm-production --execute-migrations', detail: 'Apply pending migrations after reviewing this migration plan' }];
  }
  return [{ key: 'readiness', command: 'npm run ops:readiness', detail: 'Re-check readiness after migrations are already applied' }];
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

async function listMigrationNames() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
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

function parseMigrationCount(stdout) {
  const match = stdout.match(/(\d+)\s+migrations?\s+found in prisma\/migrations/i);
  return match ? Number(match[1]) : null;
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

function readAlterTableName(statement) {
  return statement.match(/^ALTER\s+TABLE\s+"([^"]+)"/i)?.[1] || null;
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

function prismaCommand() {
  return process.platform === 'win32'
    ? resolve('node_modules/.bin/prisma.cmd')
    : resolve('node_modules/.bin/prisma');
}

function parseArgs(args) {
  const options = {
    includeAll: false,
    localOnly: false,
    output: null,
  };
  for (const arg of args) {
    if (arg === '--include-all') options.includeAll = true;
    if (arg === '--local-only') options.localOnly = true;
    if (arg.startsWith('--output=')) options.output = resolve(arg.slice('--output='.length));
  }
  return options;
}

function countBy(values, getKey) {
  return values.reduce((acc, value) => {
    const key = getKey(value) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function redactPreview(text) {
  return text
    .slice(0, 1800)
    .replace(/(postgres(?:ql)?:\/\/)[^\s"']+/gi, '$1[redacted]');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
