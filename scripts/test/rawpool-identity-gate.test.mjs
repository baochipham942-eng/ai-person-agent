import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('RawPoolItem gate uses canonical identity before QA and persistence', async () => {
  const identity = await readFile('lib/rawpool-identity.ts', 'utf8');
  const adapter = await readFile('lib/datasources/adapter.ts', 'utf8');
  const pipeline = await readFile('lib/inngest/pipeline.ts', 'utf8');
  const functions = await readFile('lib/inngest/functions.ts', 'utf8');
  const triggerScript = await readFile('scripts/enrich/trigger_content_fetch.ts', 'utf8');
  const xRefreshScript = await readFile('scripts/enrich/refresh_x_content.ts', 'utf8');
  const xHandleBackfillScript = await readFile('scripts/enrich/backfill_x_handles_from_wikidata.ts', 'utf8');
  const curatedXHandleBackfillScript = await readFile('scripts/enrich/backfill_x_handles_from_curated_seeds.ts', 'utf8');
  const youtubeScript = await readFile('scripts/enrich/fetch_official_youtube.ts', 'utf8');
  const podcastScript = await readFile('scripts/enrich/refresh_podcast_content.ts', 'utf8');

  assert.match(identity, /export function buildRawPoolIdentity/);
  assert.match(identity, /input\.personId/);
  assert.match(identity, /input\.sourceType/);
  assert.match(identity, /supportKindForRawPool/);
  assert.match(identity, /sourceKind === 'youtube_caption'/);
  assert.match(identity, /videoIdFromMetadataOrUrl/);
  assert.match(identity, /xPostIdFromUrl/);
  assert.match(identity, /githubRepoKey/);
  assert.match(identity, /isTrackingParam/);

  assert.match(adapter, /canonicalRawPoolKey/);
  assert.match(adapter, /sha256\(canonicalRawPoolKey/);

  assert.match(pipeline, /buildRawPoolIdentity/);
  assert.match(pipeline, /itemWithRawPoolIdentity/);
  assert.match(pipeline, /rawPoolCanonicalKey: identity\.canonicalKey/);
  assert.match(pipeline, /select: \{ urlHash: true, sourceType: true, url: true, metadata: true \}/);
  assert.doesNotMatch(pipeline, /import \{ hashUrl \} from '@\/lib\/datasources\/adapter'/);

  assert.match(functions, /buildRawPoolIdentity/);
  assert.match(functions, /rawPoolCanonicalKey: identity\.canonicalKey/);
  assert.doesNotMatch(functions, /crypto\.createHash\('md5'\)\.update\(normalizedUrl\)/);

  for (const script of [triggerScript, xRefreshScript, youtubeScript, podcastScript]) {
    assert.match(script, /buildRawPoolIdentity/);
    assert.match(script, /rawPoolCanonicalKey: identity\.canonicalKey/);
    assert.doesNotMatch(script, /crypto\.createHash\('md5'\)\.update\([^)]*\.url/);
  }

  assert.match(xRefreshScript, /args\.includes\('--execute'\)/);
  assert.match(xRefreshScript, /args\.includes\('--fetch-preview'\)/);
  assert.match(xRefreshScript, /args\.includes\('--include-existing-x'\)/);
  assert.match(xRefreshScript, /--stale-days/);
  assert.match(xRefreshScript, /--thin-count/);
  assert.match(xRefreshScript, /isExistingXRefreshTarget/);
  assert.match(xRefreshScript, /\.env\.production/);
  assert.match(xRefreshScript, /neon\(process\.env\.DATABASE_URL\)/);
  assert.match(xRefreshScript, /withRetry/);
  assert.match(xRefreshScript, /isTransientError/);
  assert.match(xRefreshScript, /INSERT INTO "QAAuditLog"/);
  assert.doesNotMatch(xRefreshScript, /PrismaClient/);
  assert.doesNotMatch(xRefreshScript, /deleteMany\(/);
  assert.doesNotMatch(xRefreshScript, /await prisma\.rawPoolItem\.upsert\([\s\S]*if \(!options\.execute\) continue;/);

  assert.match(xHandleBackfillScript, /P2002/);
  assert.match(xHandleBackfillScript, /Wikidata/);
  assert.match(xHandleBackfillScript, /process\.argv\.includes\('--execute'\)/);
  assert.match(xHandleBackfillScript, /hasValidXHandle/);

  assert.match(curatedXHandleBackfillScript, /curated_seed/);
  assert.match(curatedXHandleBackfillScript, /VERIFIED_HANDLES/);
  assert.match(curatedXHandleBackfillScript, /--verified-only/);
  assert.match(curatedXHandleBackfillScript, /add_priority_ai_people/);
  assert.match(curatedXHandleBackfillScript, /add_ai_educators/);
  assert.match(curatedXHandleBackfillScript, /process\.argv\.includes\('--execute'\)/);
});
