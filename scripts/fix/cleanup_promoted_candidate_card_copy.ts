/**
 * Cleanup stale starter-card copy after candidate people are promoted.
 *
 * Default is dry-run. Use --execute to mutate Card rows.
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

type CardRow = {
  id: string;
  personId: string;
  person: string;
  status: string;
  title: string;
  content: string;
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function nextTitle(title: string): string {
  return title.replace(' 的代表线索', ' 的代表成果线索');
}

function nextContent(row: CardRow): string {
  const pattern = new RegExp(`^${escapeRegExp(row.person)} 当前处于 candidate 状态，(.+?) 是后续补全时最值得优先核实的代表项目。`);
  return row.content.replace(pattern, (_match, itemName: string) => {
    return `${itemName} 是 ${row.person} 的代表成果线索，后续可继续补强来源与细节。`;
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const rows = await sql`
    SELECT
      c.id,
      c."personId",
      p.name AS person,
      p.status,
      c.title,
      c.content
    FROM "Card" c
    JOIN "People" p ON p.id = c."personId"
    WHERE p.status <> 'candidate'
      AND (c.title LIKE ${'%代表线索%'} OR c.content LIKE ${'%candidate 状态%'})
    ORDER BY p.name, c.title
  ` as CardRow[];

  let updated = 0;
  console.log(`Promoted candidate card copy mode: ${EXECUTE ? 'execute' : 'dry-run'}`);
  console.log(`matched=${rows.length}`);

  for (const row of rows) {
    const title = nextTitle(row.title);
    const content = nextContent(row);
    const changed = title !== row.title || content !== row.content;

    if (!changed) {
      console.log(`unchanged pattern: ${row.person} ${row.id}`);
      continue;
    }

    console.log(`${EXECUTE ? 'update' : 'would update'} ${row.person} ${row.id}`);
    if (title !== row.title) console.log(`  title: ${JSON.stringify(row.title)} -> ${JSON.stringify(title)}`);
    if (content !== row.content) console.log(`  content: ${JSON.stringify(row.content)} -> ${JSON.stringify(content)}`);

    if (EXECUTE) {
      await sql`
        UPDATE "Card"
        SET title = ${title}, content = ${content}, "updatedAt" = NOW()
        WHERE id = ${row.id}
      `;
      updated += 1;
    }
  }

  console.log(JSON.stringify({
    mode: EXECUTE ? 'execute' : 'dry-run',
    matched: rows.length,
    updated,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
