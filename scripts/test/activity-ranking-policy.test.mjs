import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('homepage activity ranking keeps source quality ahead of raw recency', async () => {
  const activity = await readFile('lib/activity.ts', 'utf8');

  assert.match(activity, /FIRST_PARTY_DOMAINS/);
  assert.match(activity, /DISCOVERY_ONLY_DOMAINS/);
  assert.match(activity, /MEDIA_RELAY_DOMAINS/);
  assert.match(activity, /OFFICIAL_X_HANDLES/);
  assert.match(activity, /compareActivityQuality/);
  assert.match(activity, /activityQualityScore/);
  assert.match(activity, /buildActivitySourceProfile/);
  assert.match(activity, /buildActivityDedupeKeys/);
  assert.match(activity, /canonicalActivityUrl/);
  assert.match(activity, /activityTitleSignature/);
  assert.match(activity, /isHomepageEligibleActivity/);
  assert.match(activity, /maxCompanySourceEvents/);
  assert.match(activity, /fetchCompanySourceActivityEvents/);
  assert.match(activity, /toCompanySourceActivityEvent/);
  assert.match(activity, /company_source/);

  assert.match(activity, /company_attribute_source:\s*72/);
  assert.match(activity, /event\.sourceType === 'company_source'/);
  assert.match(activity, /discovery_only_source:\s*22/);
  assert.match(activity, /ithome\.com/);
  assert.match(activity, /news\.ycombinator\.com/);
  assert.match(activity, /isGithubReleaseUrl/);
  assert.doesNotMatch(activity, /\.sort\(\(left, right\) => eventTime\(right\) - eventTime\(left\)\)\s*\.filter\(event => \{/);
});
