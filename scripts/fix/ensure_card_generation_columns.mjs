/**
 * Add generation/active-state columns used by the non-destructive Card workflow.
 *
 * Default is dry-run. Use --execute to mutate the database.
 *
 * Usage:
 *   node scripts/fix/ensure_card_generation_columns.mjs
 *   node scripts/fix/ensure_card_generation_columns.mjs --execute
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const EXECUTE = process.argv.includes('--execute');

loadExtraEnv();

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');

const sql = neon(process.env.DATABASE_URL);

const STATEMENTS = [
  'ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "generationId" TEXT;',
  'ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;',
  'ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);',
  'CREATE INDEX IF NOT EXISTS "Card_personId_isActive_idx" ON "Card"("personId", "isActive");',
  'CREATE INDEX IF NOT EXISTS "Card_generationId_idx" ON "Card"("generationId");',
];

function loadExtraEnv() {
  for (const file of [
    path.join(os.homedir(), '.code-agent/.env'),
    path.resolve('.env'),
    path.resolve('.env.local'),
  ]) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(file));
      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // Optional env file.
    }
  }
}

async function loadColumns() {
  return await sql`
    SELECT column_name AS name, data_type AS type, is_nullable AS nullable, column_default AS "default"
    FROM information_schema.columns
    WHERE table_schema = ${'public'}
      AND table_name = ${'Card'}
      AND column_name IN (${'generationId'}, ${'isActive'}, ${'archivedAt'})
    ORDER BY column_name
  `;
}

async function applyStatements() {
  await sql`ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "generationId" TEXT`;
  await sql`ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`;
  await sql`ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3)`;
  await sql`CREATE INDEX IF NOT EXISTS "Card_personId_isActive_idx" ON "Card"("personId", "isActive")`;
  await sql`CREATE INDEX IF NOT EXISTS "Card_generationId_idx" ON "Card"("generationId")`;
}

async function main() {
  const before = await loadColumns();
  if (EXECUTE) {
    await applyStatements();
  }
  const after = await loadColumns();
  console.log(JSON.stringify({
    mode: EXECUTE ? 'execute' : 'dry-run',
    statements: STATEMENTS,
    before,
    after,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
