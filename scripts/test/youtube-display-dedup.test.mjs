import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('person YouTube display filters transcript support rows and dedupes by video key', async () => {
  const itemsRoute = await readFile('app/api/person/[id]/items/route.ts', 'utf8');
  const personPage = await readFile('app/person/[id]/page.tsx', 'utf8');

  assert.match(itemsRoute, /sourceType === 'youtube'/);
  assert.match(itemsRoute, /fetchYouTubeItems\(id, limit, offset\)/);
  assert.match(itemsRoute, /metadata->>'sourceKind' IS DISTINCT FROM 'youtube_caption'/);
  assert.match(itemsRoute, /ROW_NUMBER\(\) OVER \(\s*PARTITION BY video_key/);
  assert.match(itemsRoute, /COUNT\(\*\) OVER\(\)::int AS total/);

  assert.match(personPage, /youtubeDisplayCountRows/);
  assert.match(personPage, /COUNT\(DISTINCT video_key\)::int AS count/);
  assert.match(personPage, /metadata->>'sourceKind' IS DISTINCT FROM 'youtube_caption'/);
  assert.match(personPage, /sourceTypeCounts\.youtube = youtubeDisplayCountRows\[0\]\?\.count \|\| 0/);
});
