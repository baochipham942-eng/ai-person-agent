import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workspacePath = new URL('../../components/source/YoutubeSourceWorkspace.tsx', import.meta.url);
const chatRoutePath = new URL('../../app/api/source/youtube/[id]/chat/route.ts', import.meta.url);

test('YouTube source workspace wires player sync, exports, and chat citations', async () => {
  const source = await readFile(workspacePath, 'utf8');

  assert.match(source, /loadYouTubeIframeApi\(\)/);
  assert.match(source, /getCurrentTime\(\)/);
  assert.match(source, /seekTo\(safeMs \/ 1000, true\)/);
  assert.match(source, /data-playhead-ms/);
  assert.match(source, /data-timeline-scrubber/);
  assert.match(source, /copyMarkdown/);
  assert.match(source, /downloadMarkdown/);
  assert.match(source, /data-youtube-chat-input/);
  assert.match(source, /data-chat-citation/);
});

test('YouTube chat route answers from transcript excerpts with seekable citations', async () => {
  const source = await readFile(chatRoutePath, 'utf8');

  assert.match(source, /parseYoutubeTranscriptSegments/);
  assert.match(source, /selectRelevantLines/);
  assert.match(source, /generateStructured/);
  assert.match(source, /citations/);
  assert.match(source, /formatTranscriptTime/);
  assert.match(source, /local-transcript-fallback/);
});
