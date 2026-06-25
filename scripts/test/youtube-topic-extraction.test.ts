import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractPersistedVideoTopics } from '../../lib/youtube-topic-extraction';
import { buildTranscriptBlocks, type YoutubeTranscriptSegment } from '../../lib/youtube-transcript';

function segment(index: number, startMs: number, text: string): YoutubeTranscriptSegment {
  return {
    index,
    startMs,
    durationMs: 10_000,
    endMs: startMs + 10_000,
    text,
  };
}

test('extractPersistedVideoTopics reads stored Mimo topic timeline with millisecond boundaries', () => {
  const segments = [
    segment(0, 0, 'The community is avoiding a hard conversation about AI safety.'),
    segment(1, 10_000, 'Researchers need a clearer definition of risks.'),
    segment(2, 20_000, 'Governance needs benchmarks and concrete evaluation gates.'),
    segment(3, 30_000, 'Institutions should coordinate before deployment.'),
  ];
  const blocks = buildTranscriptBlocks(segments, 10_000);

  const result = extractPersistedVideoTopics({
    mimoTopicTimeline: [
      {
        title: '安全问题的定义',
        summary: '讨论 AI 安全议题为什么需要被直接定义。',
        startMs: 0,
        endMs: 20_000,
        keywords: ['safety'],
      },
      {
        title: '治理与评估',
        summary: '讨论部署前的评估和机构协作。',
        startMs: 20_000,
        endMs: 40_000,
        keywords: ['governance'],
      },
    ],
  }, blocks, segments);

  assert.ok(result);
  assert.equal(result.status, 'ready');
  assert.equal(result.topics.length, 2);
  assert.equal(result.topics[0].startMs, 0);
  assert.equal(result.topics[1].startMs, 20_000);
  assert.equal(result.topics[1].summary, '讨论部署前的评估和机构协作。');
  assert.equal(result.model, 'mimo-v2.5-pro');
  assert.equal(result.message, '已读取 Mimo 语义主题时间线。');
});

test('extractPersistedVideoTopics reads stored MiniMax topic timeline without Mimo labeling', () => {
  const segments = [
    segment(0, 0, 'The speaker frames the product problem.'),
    segment(1, 10_000, 'The workflow shifts into source workspace navigation.'),
    segment(2, 20_000, 'The transcript needs a synchronized topic timeline.'),
  ];
  const blocks = buildTranscriptBlocks(segments, 10_000);

  const result = extractPersistedVideoTopics({
    videoTopicTimeline: [
      {
        title: '工作区导航',
        summary: '讨论 source workspace 的视频和字幕联动。',
        startMs: 0,
        endMs: 30_000,
        keywords: ['workspace'],
      },
    ],
    topicTimelineProvider: 'minimax',
    topicTimelineModel: 'MiniMax-M2.7',
  }, blocks, segments);

  assert.ok(result);
  assert.equal(result.status, 'ready');
  assert.equal(result.topics.length, 1);
  assert.equal(result.model, 'MiniMax-M2.7');
  assert.equal(result.message, '已读取 MiniMax 语义主题时间线。');
});

test('extractPersistedVideoTopics ignores metadata tags without time boundaries', () => {
  const segments = [
    segment(0, 0, 'Short transcript.'),
    segment(1, 10_000, 'Still no semantic timeline.'),
  ];
  const blocks = buildTranscriptBlocks(segments, 10_000);

  const result = extractPersistedVideoTopics({
    contentTopics: ['AI safety', 'governance'],
    tags: ['AGI'],
  }, blocks, segments);

  assert.equal(result, null);
});
