/**
 * Recalculate topicRanks from current influenceScore using Neon raw SQL.
 *
 * Default is dry-run. Use --execute to update People.topicRanks.
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

type PersonTopicRow = {
  id: string;
  name: string;
  topics: string[] | null;
  influenceScore: number;
};

const EXECUTE = process.argv.includes('--execute');
if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const people = await sql`
    SELECT id, name, topics, "influenceScore"
    FROM "People"
    WHERE array_length(topics, 1) > 0
    ORDER BY "influenceScore" DESC, name ASC
  ` as PersonTopicRow[];

  const allTopics = new Set<string>();
  for (const person of people) {
    for (const topic of person.topics || []) allTopics.add(topic);
  }

  const topicRankings = new Map<string, Map<string, number>>();
  for (const topic of allTopics) {
    const peopleWithTopic = people.filter(person => (person.topics || []).includes(topic));
    const ranks = new Map<string, number>();
    peopleWithTopic.forEach((person, index) => ranks.set(person.id, index + 1));
    topicRankings.set(topic, ranks);
  }

  let updated = 0;
  for (const person of people) {
    const topicRanks: Record<string, number> = {};
    for (const topic of person.topics || []) {
      const rank = topicRankings.get(topic)?.get(person.id);
      if (rank) topicRanks[topic] = rank;
    }
    if (EXECUTE) {
      await sql`
        UPDATE "People"
        SET "topicRanks" = ${JSON.stringify(topicRanks)}::jsonb
        WHERE id = ${person.id}
      `;
    }
    updated += 1;
  }

  console.log(`Topic ranks mode: ${EXECUTE ? 'execute' : 'dry-run'} | people=${people.length} | topics=${allTopics.size}`);
  for (const topic of ['大语言模型', 'Scaling', 'Agent', 'AGI', '对齐']) {
    const top = people.filter(person => (person.topics || []).includes(topic)).slice(0, 3);
    if (top.length > 0) {
      console.log(`${topic}: ${top.map((person, idx) => `#${idx + 1} ${person.name}(${person.influenceScore.toFixed(1)})`).join(', ')}`);
    }
  }
  if (EXECUTE) console.log(`Updated ${updated} People.topicRanks rows.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
