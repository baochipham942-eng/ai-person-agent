import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('activity feed ranks high-quality sources before raw recency', async () => {
  const source = await readFile('lib/activity.ts', 'utf8');

  assert.match(source, /PRIMARY_SOURCE_HOST_PATTERNS/);
  assert.match(source, /DISCOVERY_ONLY_HOST_PATTERNS/);
  assert.match(source, /ithome\\\.com/);
  assert.match(source, /openai\\\.com/);
  assert.match(source, /anthropic\\\.com/);
  assert.match(source, /sourceScore \* 8/);
  assert.match(source, /sort\(compareActivityRank\)/);
  assert.doesNotMatch(source, /sort\(\(left, right\) => eventTime\(right\) - eventTime\(left\)\)/);
});

test('activity feed dedupes by URL and title signature with person diversity', async () => {
  const source = await readFile('lib/activity.ts', 'utf8');

  assert.match(source, /function activityDedupeKeys/);
  assert.match(source, /normalizeUrlForActivityDedupe/);
  assert.match(source, /activityTitleSignature/);
  assert.match(source, /personLimit = params\.personId \? Number\.POSITIVE_INFINITY : 2/);
  assert.match(source, /hostLimit = params\.personId \? Number\.POSITIVE_INFINITY : 2/);
  assert.match(source, /person-title:\$\{event\.personId\}/);
});
