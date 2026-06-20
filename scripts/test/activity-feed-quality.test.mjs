import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('activity feed ranks high-quality sources before raw recency', async () => {
  const source = await readFile('lib/activity.ts', 'utf8');

  assert.match(source, /FIRST_PARTY_DOMAINS/);
  assert.match(source, /DISCOVERY_ONLY_DOMAINS/);
  assert.match(source, /MEDIA_RELAY_DOMAINS/);
  assert.match(source, /ithome\.com/);
  assert.match(source, /openai\.com/);
  assert.match(source, /anthropic\.com/);
  assert.match(source, /compareActivityQuality/);
  assert.match(source, /activityQualityScore/);
  assert.match(source, /buildActivitySourceProfile/);
  assert.match(source, /company_attribute_source:\s*72/);
  assert.doesNotMatch(source, /\.sort\(\(left, right\) => eventTime\(right\) - eventTime\(left\)\)\s*\.filter\(event => \{/);
});

test('activity feed dedupes by URL and title signature with person diversity', async () => {
  const source = await readFile('lib/activity.ts', 'utf8');

  assert.match(source, /function buildActivityDedupeKeys/);
  assert.match(source, /canonicalActivityUrl/);
  assert.match(source, /activityTitleSignature/);
  assert.match(source, /person-source-day:\$\{event\.personId\}/);
  assert.match(source, /title:\$\{event\.personId\}:\$\{event\.eventType\}/);
});
