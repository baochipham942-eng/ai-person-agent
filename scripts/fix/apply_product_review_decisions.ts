/**
 * Apply source-backed product/achievement review decisions.
 *
 * Default is dry-run. Use --execute to mutate the database.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

type Product = {
  name: string;
  org?: string;
  year?: string | number;
  description: string;
  url?: string;
  icon?: string;
  logo?: string;
  category?: string;
  type?: string;
  role?: string;
  stats?: Record<string, unknown>;
};

type TopicDetail = {
  topic: string;
  rank: number;
  reason?: string;
  description?: string;
  paperCount?: number;
  citations?: number;
  quote?: {
    text: string;
    source: string;
    url?: string;
  };
};

type Decision = {
  personId: string;
  person: string;
  action: 'replace_products_and_topics';
  products: Product[];
  topics: string[];
  topicDetails: TopicDetail[];
  cardUpdates?: {
    cardId: string;
    title?: string;
    content?: string;
  }[];
  removeProductNames?: string[];
  removeTopicNames?: string[];
  evidenceUrls: string[];
  evidenceNote: string;
};

type Payload = {
  decisions: Decision[];
};

type PeopleRow = {
  id: string;
  name: string;
  products: unknown;
  topics: string[];
  topicDetails: unknown;
};

type CardRow = {
  id: string;
  title: string;
  content: string;
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const DECISIONS_PATH = args.find(arg => arg.startsWith('--decisions='))?.slice('--decisions='.length)
  || 'docs/audit-2026-06/product_review_decisions.json';

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function normalize(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function arraysEqual(left: unknown, right: unknown): boolean {
  return normalize(left) === normalize(right);
}

async function loadPerson(id: string): Promise<PeopleRow | null> {
  const rows = await sql`
    SELECT id, name, products, topics, "topicDetails"
    FROM "People"
    WHERE id = ${id}
  ` as PeopleRow[];

  return rows[0] || null;
}

async function loadCard(cardId: string, personId: string): Promise<CardRow | null> {
  const rows = await sql`
    SELECT id, title, content
    FROM "Card"
    WHERE id = ${cardId}
      AND "personId" = ${personId}
  ` as CardRow[];

  return rows[0] || null;
}

async function main() {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), DECISIONS_PATH), 'utf-8'),
  ) as Payload;

  console.log(`Product review decisions mode: ${EXECUTE ? 'execute' : 'dry-run'}`);

  let matched = 0;
  let missing = 0;
  let alreadyApplied = 0;
  let updated = 0;
  let cardsUpdated = 0;

  for (const decision of payload.decisions) {
    if (decision.action !== 'replace_products_and_topics') {
      throw new Error(`Unsupported action: ${(decision as { action: string }).action}`);
    }

    const person = await loadPerson(decision.personId);
    if (!person) {
      missing += 1;
      console.log(`missing person: ${decision.person} (${decision.personId})`);
      continue;
    }

    matched += 1;
    if (person.name !== decision.person) {
      console.log(`name mismatch: decision=${decision.person} db=${person.name} (${person.id})`);
    }

    const productsChanged = !arraysEqual(person.products, decision.products);
    const topicsChanged = !arraysEqual(person.topics || [], decision.topics);
    const topicDetailsChanged = !arraysEqual(person.topicDetails, decision.topicDetails);
    const cardUpdates: Array<{
      card: CardRow;
      title: string;
      content: string;
    }> = [];

    for (const update of decision.cardUpdates || []) {
      const card = await loadCard(update.cardId, person.id);
      if (!card) {
        console.log(`missing card for ${person.name}: ${update.cardId}`);
        continue;
      }

      const nextTitle = update.title ?? card.title;
      const nextContent = update.content ?? card.content;
      if (card.title !== nextTitle || card.content !== nextContent) {
        cardUpdates.push({ card, title: nextTitle, content: nextContent });
      }
    }

    if (!productsChanged && !topicsChanged && !topicDetailsChanged && cardUpdates.length === 0) {
      alreadyApplied += 1;
      console.log(`already applied: ${person.name}`);
      continue;
    }

    console.log(`${EXECUTE ? 'update' : 'would update'} ${person.name}`);
    if (productsChanged) {
      console.log(`  products: ${normalize(person.products)} -> ${normalize(decision.products)}`);
    }
    if (topicsChanged) {
      console.log(`  topics: ${normalize(person.topics || [])} -> ${normalize(decision.topics)}`);
    }
    if (topicDetailsChanged) {
      console.log(`  topicDetails: ${normalize(person.topicDetails)} -> ${normalize(decision.topicDetails)}`);
    }
    for (const update of cardUpdates) {
      console.log(`  card ${update.card.id}`);
      if (update.card.title !== update.title) {
        console.log(`    title: ${JSON.stringify(update.card.title)} -> ${JSON.stringify(update.title)}`);
      }
      if (update.card.content !== update.content) {
        console.log(`    content: ${JSON.stringify(update.card.content)} -> ${JSON.stringify(update.content)}`);
      }
    }
    console.log(`  remove products: ${(decision.removeProductNames || []).join(', ') || '(none)'}`);
    console.log(`  remove topics: ${(decision.removeTopicNames || []).join(', ') || '(none)'}`);
    console.log(`  evidence: ${decision.evidenceUrls.join(', ')}`);
    console.log(`  note: ${decision.evidenceNote}`);

    if (EXECUTE) {
      await sql`
        UPDATE "People"
        SET
          products = ${JSON.stringify(decision.products)}::jsonb,
          topics = ${decision.topics},
          "topicDetails" = ${JSON.stringify(decision.topicDetails)}::jsonb,
          "updatedAt" = NOW()
        WHERE id = ${person.id}
      `;
      updated += 1;

      for (const update of cardUpdates) {
        await sql`
          UPDATE "Card"
          SET
            title = ${update.title},
            content = ${update.content},
            "updatedAt" = NOW()
          WHERE id = ${update.card.id}
        `;
        cardsUpdated += 1;
      }
    }
  }

  console.log(JSON.stringify({
    mode: EXECUTE ? 'execute' : 'dry-run',
    decisions: payload.decisions.length,
    matched,
    missing,
    alreadyApplied,
    updated,
    cardsUpdated,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
