/**
 * Apply safe topic alignment fixes from full_person_content_review.json.
 *
 * Default is dry-run. Pass --apply to write to DB.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const APPLY = process.argv.includes('--apply');
const REVIEW = process.argv.find((arg) => arg.startsWith('--review='))?.slice('--review='.length)
  || 'docs/audit-2026-06/data/full_person_content_review.json';
const OUT = process.argv.find((arg) => arg.startsWith('--out='))?.slice('--out='.length)
  || `docs/audit-2026-06/data/topic_alignment_safe_${APPLY ? 'apply' : 'dry_run'}_log.json`;

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL');
}

const sql = neon(process.env.DATABASE_URL);

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value) {
  return isRecord(value) ? { ...value } : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function loadPerson(personId) {
  const rows = await sql`
    SELECT id, name, topics, "topicRanks", "topicDetails"
    FROM "People"
    WHERE id = ${personId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function main() {
  const review = JSON.parse(fs.readFileSync(path.join(process.cwd(), REVIEW), 'utf-8'));
  const candidates = asArray(review?.queues?.autoFixCandidates);
  const actions = [];

  for (const issue of candidates) {
    const person = await loadPerson(issue.personId);
    if (!person) {
      actions.push({ issue, action: 'skip_missing_person' });
      continue;
    }

    if (issue.code === 'topic_rank_not_in_topics') {
      const key = issue.objectLabel;
      const topicRanks = asRecord(person.topicRanks);
      if (Object.prototype.hasOwnProperty.call(topicRanks, key)) {
        const before = { ...topicRanks };
        delete topicRanks[key];
        if (APPLY) {
          await sql`UPDATE "People" SET "topicRanks" = ${JSON.stringify(topicRanks)}::jsonb WHERE id = ${person.id}`;
        }
        actions.push({
          personId: person.id,
          person: person.name,
          code: issue.code,
          action: APPLY ? 'updated' : 'would_update',
          before,
          after: topicRanks,
        });
      } else {
        actions.push({ personId: person.id, person: person.name, code: issue.code, action: 'skip_key_missing', key });
      }
      continue;
    }

    if (issue.code === 'topic_detail_alias_mismatch') {
      const fromTopic = issue.evidence?.detailTopic;
      const toTopic = issue.evidence?.matchedTopic;
      const details = asArray(person.topicDetails).map((detail) => isRecord(detail) ? { ...detail } : detail);
      let changed = false;
      const nextDetails = details.map((detail) => {
        if (isRecord(detail) && detail.topic === fromTopic) {
          changed = true;
          return { ...detail, topic: toTopic };
        }
        return detail;
      });

      if (changed) {
        if (APPLY) {
          await sql`UPDATE "People" SET "topicDetails" = ${JSON.stringify(nextDetails)}::jsonb WHERE id = ${person.id}`;
        }
        actions.push({
          personId: person.id,
          person: person.name,
          code: issue.code,
          action: APPLY ? 'updated' : 'would_update',
          fromTopic,
          toTopic,
        });
      } else {
        actions.push({ personId: person.id, person: person.name, code: issue.code, action: 'skip_topic_missing', fromTopic, toTopic });
      }
      continue;
    }

    actions.push({ personId: person.id, person: person.name, code: issue.code, action: 'skip_unsupported_code' });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    reviewGeneratedAt: review.generatedAt,
    summary: {
      candidates: candidates.length,
      updated: actions.filter((item) => item.action === 'updated').length,
      wouldUpdate: actions.filter((item) => item.action === 'would_update').length,
      skipped: actions.filter((item) => String(item.action).startsWith('skip')).length,
    },
    actions,
  };

  const outPath = path.join(process.cwd(), OUT);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`${APPLY ? 'Applied' : 'Dry-run'} topic alignment fixes -> ${OUT}`);
  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
