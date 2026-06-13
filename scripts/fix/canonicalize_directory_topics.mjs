/**
 * Canonicalize persisted directory topics using lib/person-directory-topics.json.
 *
 * Default is dry-run. Pass --apply to write to DB.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const APPLY = process.argv.includes('--apply');
const OUT = process.argv.find((arg) => arg.startsWith('--out='))?.slice('--out='.length)
  || `docs/audit-2026-06/data/topic_canonicalization_${APPLY ? 'apply' : 'dry_run'}_${timestampForFile()}.json`;

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL');
}

const registry = JSON.parse(
  fs.readFileSync(new URL('../../lib/person-directory-topics.json', import.meta.url), 'utf8')
);
const sql = neon(process.env.DATABASE_URL);
const canonicalByKey = buildCanonicalTopicMap(registry);
const tableExistence = new Map();
const skippedTables = [];

function buildCanonicalTopicMap(topicRegistry) {
  const result = new Map();
  for (const topic of topicRegistry.topics || []) {
    if (!topic?.label) continue;
    result.set(topicKey(topic.label), topic.label);
    for (const alias of topic.aliases || []) {
      result.set(topicKey(alias), topic.label);
    }
  }
  return result;
}

function topicKey(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeTopic(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return canonicalByKey.get(topicKey(trimmed)) || trimmed;
}

function canonicalizeTopics(values) {
  if (!Array.isArray(values)) return { value: [], changed: false, replacements: [] };

  const seen = new Set();
  const next = [];
  const replacements = [];

  for (const rawValue of values) {
    const before = String(rawValue || '').trim();
    if (!before) continue;
    const after = normalizeTopic(before);
    if (!after || seen.has(after)) {
      if (before && after !== before) replacements.push({ from: before, to: after || null });
      continue;
    }
    seen.add(after);
    next.push(after);
    if (after !== before) replacements.push({ from: before, to: after });
  }

  return {
    value: next,
    changed: !sameStringArray(values, next),
    replacements,
  };
}

function canonicalizeTopicDetails(value) {
  if (!Array.isArray(value)) return { value, changed: false, replacements: [] };

  let changed = false;
  const replacements = [];
  const result = [];
  const indexByTopic = new Map();

  for (const item of value) {
    if (!isRecord(item) || typeof item.topic !== 'string') {
      result.push(item);
      continue;
    }

    const before = item.topic.trim();
    const after = normalizeTopic(before);
    const nextItem = after && after !== before ? { ...item, topic: after } : item;
    if (after && after !== before) {
      changed = true;
      replacements.push({ from: before, to: after });
    }

    if (after && indexByTopic.has(after)) {
      changed = true;
      const existingIndex = indexByTopic.get(after);
      if (preferTopicDetail(nextItem, result[existingIndex])) {
        result[existingIndex] = nextItem;
      }
      continue;
    }

    if (after) indexByTopic.set(after, result.length);
    result.push(nextItem);
  }

  return { value: result, changed, replacements };
}

function preferTopicDetail(candidate, existing) {
  const candidateRank = Number(candidate?.rank);
  const existingRank = Number(existing?.rank);
  if (Number.isFinite(candidateRank) && Number.isFinite(existingRank)) {
    return candidateRank < existingRank;
  }
  if (Number.isFinite(candidateRank)) return true;
  if (Number.isFinite(existingRank)) return false;
  return textWeight(candidate) > textWeight(existing);
}

function textWeight(value) {
  if (!isRecord(value)) return 0;
  return [
    value.reason,
    value.description,
    value.quote?.text,
    value.quote?.source,
    value.quote?.url,
  ].filter((item) => typeof item === 'string').join('').length;
}

function canonicalizeProfileInterests(value) {
  if (!isRecord(value)) return { value, changed: false, replacements: [] };

  const topics = Array.isArray(value.topics)
    ? cleanStrings(value.topics)
    : objectKeysFromTruthyValues(value.topicMap);
  const organizations = Array.isArray(value.organizations)
    ? cleanStrings(value.organizations)
    : objectKeysFromTruthyValues(value.organizationMap);
  const legacyTopics = Object.keys(value)
    .filter((key) => !['topics', 'organizations', 'topicMap', 'organizationMap'].includes(key))
    .filter((key) => Boolean(value[key]));
  const topicResult = canonicalizeTopics([...topics, ...legacyTopics]);
  const next = {
    topics: topicResult.value,
    organizations: uniqueStrings(organizations),
  };

  return {
    value: next,
    changed: stableStringify(value) !== stableStringify(next),
    replacements: topicResult.replacements,
  };
}

function cleanStrings(values) {
  return values.map((value) => String(value || '').trim()).filter(Boolean);
}

function objectKeysFromTruthyValues(value) {
  if (!isRecord(value)) return [];
  return Object.keys(value).filter((key) => Boolean(value[key]));
}

function uniqueStrings(values) {
  return [...new Set(cleanStrings(values))];
}

function sameStringArray(left, right) {
  return JSON.stringify(cleanStrings(left)) === JSON.stringify(cleanStrings(right));
}

function stableStringify(value) {
  return JSON.stringify(sortJson(value));
}

function jsonbParam(value) {
  return value == null ? null : JSON.stringify(value);
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortJson(value[key])])
  );
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function buildTopicRanks(people) {
  const sorted = [...people]
    .filter((person) => person.nextTopics.length > 0)
    .sort((left, right) => {
      const scoreDelta = Number(right.influenceScore || 0) - Number(left.influenceScore || 0);
      if (scoreDelta !== 0) return scoreDelta;
      return String(left.name || '').localeCompare(String(right.name || ''));
    });
  const ranksByTopic = new Map();

  for (const person of sorted) {
    for (const topic of person.nextTopics) {
      if (!ranksByTopic.has(topic)) ranksByTopic.set(topic, new Map());
      const ranks = ranksByTopic.get(topic);
      ranks.set(person.id, ranks.size + 1);
    }
  }

  const result = new Map();
  for (const person of people) {
    const ranks = {};
    for (const topic of person.nextTopics) {
      const rank = ranksByTopic.get(topic)?.get(person.id);
      if (rank) ranks[topic] = rank;
    }
    result.set(person.id, ranks);
  }
  return result;
}

function summarizeReplacements(items) {
  const counts = new Map();
  for (const item of items) {
    for (const replacement of item.replacements || []) {
      if (!replacement.from || !replacement.to || replacement.from === replacement.to) continue;
      const key = `${replacement.from} -> ${replacement.to}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => {
      const [from, to] = label.split(' -> ');
      return { from, to, count };
    })
    .sort((left, right) => right.count - left.count || left.from.localeCompare(right.from));
}

async function loadPeopleChanges() {
  const rows = await sql`
    SELECT id, name, topics, "topicRanks", "topicDetails", "influenceScore"
    FROM "People"
    WHERE COALESCE(array_length(topics, 1), 0) > 0
       OR "topicRanks" IS NOT NULL
       OR "topicDetails" IS NOT NULL
    ORDER BY "influenceScore" DESC, name ASC
  `;

  const prepared = rows.map((row) => {
    const topicResult = canonicalizeTopics(row.topics || []);
    const detailResult = canonicalizeTopicDetails(row.topicDetails);
    return {
      ...row,
      nextTopics: topicResult.value,
      nextTopicDetails: detailResult.value,
      topicChanged: topicResult.changed,
      topicDetailChanged: detailResult.changed,
      replacements: [...topicResult.replacements, ...detailResult.replacements],
    };
  });
  const nextRanksByPerson = buildTopicRanks(prepared);

  return prepared.map((row) => {
    const nextTopicRanks = nextRanksByPerson.get(row.id) || {};
    const topicRankChanged = stableStringify(row.topicRanks || {}) !== stableStringify(nextTopicRanks);
    return {
      ...row,
      nextTopicRanks,
      topicRankChanged,
      changed: row.topicChanged || row.topicDetailChanged || topicRankChanged,
    };
  });
}

async function loadArrayTopicChanges(tableName, fields) {
  if (!(await tableExists(tableName))) {
    skippedTables.push(tableName);
    return [];
  }

  const rows = await sql(
    `SELECT ${fields.id}, ${fields.label}, topics FROM "${tableName}" WHERE COALESCE(array_length(topics, 1), 0) > 0 ORDER BY ${fields.label} ASC`
  );

  return rows.map((row) => {
    const topicResult = canonicalizeTopics(row.topics || []);
    return {
      ...row,
      nextTopics: topicResult.value,
      replacements: topicResult.replacements,
      changed: topicResult.changed,
    };
  });
}

async function tableExists(tableName) {
  if (tableExistence.has(tableName)) return tableExistence.get(tableName);
  const rows = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS exists
  `;
  const exists = Boolean(rows[0]?.exists);
  tableExistence.set(tableName, exists);
  return exists;
}

async function loadProfileChanges() {
  const rows = await sql`
    SELECT id, "userId", "topicInterests"
    FROM "UserProfile"
    WHERE "topicInterests" IS NOT NULL
    ORDER BY "updatedAt" DESC
  `;

  return rows.map((row) => {
    const result = canonicalizeProfileInterests(row.topicInterests);
    return {
      ...row,
      nextTopicInterests: result.value,
      replacements: result.replacements,
      changed: result.changed,
    };
  });
}

async function applyPeopleChanges(changes) {
  for (const row of changes.filter((item) => item.changed)) {
    await sql`
      UPDATE "People"
      SET topics = ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(row.nextTopics)}::jsonb)),
          "topicRanks" = ${JSON.stringify(row.nextTopicRanks)}::jsonb,
          "topicDetails" = ${jsonbParam(row.nextTopicDetails)}::jsonb,
          "updatedAt" = NOW()
      WHERE id = ${row.id}
    `;
  }
}

async function applyArrayTopicChanges(tableName, changes) {
  for (const row of changes.filter((item) => item.changed)) {
    if (tableName === 'ActivityEvent') {
      await sql`
        UPDATE "ActivityEvent"
        SET topics = ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(row.nextTopics)}::jsonb)),
            "updatedAt" = NOW()
        WHERE id = ${row.id}
      `;
      continue;
    }
    if (tableName === 'Course') {
      await sql`
        UPDATE "Course"
        SET topics = ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(row.nextTopics)}::jsonb)),
            "updatedAt" = NOW()
        WHERE id = ${row.id}
      `;
      continue;
    }
    throw new Error(`Unsupported table for topic array update: ${tableName}`);
  }
}

async function applyProfileChanges(changes) {
  for (const row of changes.filter((item) => item.changed)) {
    await sql`
      UPDATE "UserProfile"
      SET "topicInterests" = ${JSON.stringify(row.nextTopicInterests)}::jsonb,
          "updatedAt" = NOW()
      WHERE id = ${row.id}
    `;
  }
}

async function countRemainingAliasOccurrences() {
  const [people, activityEvents, courses, profiles] = await Promise.all([
    sql`SELECT topics, "topicDetails", "topicRanks" FROM "People"`,
    tableExists('ActivityEvent').then((exists) => exists ? sql`SELECT topics FROM "ActivityEvent"` : []),
    tableExists('Course').then((exists) => exists ? sql`SELECT topics FROM "Course"` : []),
    sql`SELECT "topicInterests" FROM "UserProfile"`,
  ]);
  const occurrences = [];

  for (const row of people) {
    collectStaleTopics(occurrences, 'People.topics', row.topics || []);
    collectStaleTopics(occurrences, 'People.topicRanks', Object.keys(isRecord(row.topicRanks) ? row.topicRanks : {}));
    collectStaleTopics(
      occurrences,
      'People.topicDetails',
      Array.isArray(row.topicDetails)
        ? row.topicDetails.map((detail) => isRecord(detail) ? detail.topic : '').filter(Boolean)
        : []
    );
  }
  for (const row of activityEvents) collectStaleTopics(occurrences, 'ActivityEvent.topics', row.topics || []);
  for (const row of courses) collectStaleTopics(occurrences, 'Course.topics', row.topics || []);
  for (const row of profiles) {
    const rawTopics = extractProfileTopicInterests(row.topicInterests);
    collectStaleTopics(occurrences, 'UserProfile.topicInterests', rawTopics);
  }

  return summarizeReplacements([{ replacements: occurrences }]);
}

function extractProfileTopicInterests(value) {
  if (!isRecord(value)) return [];
  const topics = Array.isArray(value.topics)
    ? cleanStrings(value.topics)
    : objectKeysFromTruthyValues(value.topicMap);
  const legacyTopics = Object.keys(value)
    .filter((key) => !['topics', 'organizations', 'topicMap', 'organizationMap'].includes(key))
    .filter((key) => Boolean(value[key]));
  return [...topics, ...legacyTopics];
}

function collectStaleTopics(target, location, topics) {
  for (const topic of topics) {
    const normalized = normalizeTopic(topic);
    if (normalized && normalized !== String(topic || '').trim()) {
      target.push({ from: `${location}:${topic}`, to: normalized });
    }
  }
}

function sampleChanges(changes, formatter, limit = 12) {
  return changes
    .filter((item) => item.changed)
    .slice(0, limit)
    .map(formatter);
}

async function main() {
  const [peopleChanges, activityChanges, courseChanges, profileChanges] = await Promise.all([
    loadPeopleChanges(),
    loadArrayTopicChanges('ActivityEvent', { id: 'id', label: 'title' }),
    loadArrayTopicChanges('Course', { id: 'id', label: 'title' }),
    loadProfileChanges(),
  ]);

  const beforeSummary = {
    peopleRows: peopleChanges.length,
    peopleChanged: peopleChanges.filter((item) => item.changed).length,
    peopleTopicsChanged: peopleChanges.filter((item) => item.topicChanged).length,
    peopleTopicDetailsChanged: peopleChanges.filter((item) => item.topicDetailChanged).length,
    peopleTopicRanksChanged: peopleChanges.filter((item) => item.topicRankChanged).length,
    activityEventsRows: activityChanges.length,
    activityEventsChanged: activityChanges.filter((item) => item.changed).length,
    courseRows: courseChanges.length,
    coursesChanged: courseChanges.filter((item) => item.changed).length,
    userProfileRows: profileChanges.length,
    userProfilesChanged: profileChanges.filter((item) => item.changed).length,
  };

  if (APPLY) {
    await applyPeopleChanges(peopleChanges);
    await applyArrayTopicChanges('ActivityEvent', activityChanges);
    await applyArrayTopicChanges('Course', courseChanges);
    await applyProfileChanges(profileChanges);
  }

  const remainingAliasOccurrences = APPLY ? await countRemainingAliasOccurrences() : null;
  const payload = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    registryTopics: registry.topics.map((topic) => topic.label),
    summary: {
      ...beforeSummary,
      skippedTables,
      replacementCounts: summarizeReplacements([
        ...peopleChanges,
        ...activityChanges,
        ...courseChanges,
        ...profileChanges,
      ]).slice(0, 80),
      remainingAliasOccurrences,
    },
    samples: {
      people: sampleChanges(peopleChanges, (row) => ({
        id: row.id,
        name: row.name,
        topics: row.topics,
        nextTopics: row.nextTopics,
        topicRankChanged: row.topicRankChanged,
        topicDetailChanged: row.topicDetailChanged,
      })),
      activityEvents: sampleChanges(activityChanges, (row) => ({
        id: row.id,
        title: row.title,
        topics: row.topics,
        nextTopics: row.nextTopics,
      })),
      courses: sampleChanges(courseChanges, (row) => ({
        id: row.id,
        title: row.title,
        topics: row.topics,
        nextTopics: row.nextTopics,
      })),
      userProfiles: sampleChanges(profileChanges, (row) => ({
        id: row.id,
        userId: row.userId,
        topicInterests: row.topicInterests,
        nextTopicInterests: row.nextTopicInterests,
      })),
    },
  };

  const outPath = path.join(process.cwd(), OUT);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`${APPLY ? 'Applied' : 'Dry-run'} directory topic canonicalization -> ${OUT}`);
  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
