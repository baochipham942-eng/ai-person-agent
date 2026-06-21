import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeHealth, type JobRow, type LogRow } from '../../lib/admin/datasource-health';

test('按 kind 聚合完成/失败 + 额度信号', () => {
  const jobs: JobRow[] = [
    { id: 'j1', kind: 'company_blogs_fetch', status: 'completed' },
    { id: 'j2', kind: 'company_blogs_fetch', status: 'failed' },
    { id: 'j3', kind: 'youtube_captions_fetch', status: 'completed' },
  ];
  const logs: LogRow[] = [
    { jobId: 'j2', level: 'error', message: 'Jina 429 限流' },
    { jobId: 'j3', level: 'warning', message: 'supadata 402 额度耗尽' },
  ];
  const out = summarizeHealth(jobs, logs);
  const blog = out.find(r => r.kind === 'company_blogs_fetch')!;
  assert.equal(blog.completed, 1);
  assert.equal(blog.failed, 1);
  assert.equal(blog.quotaSignals, 1);
  const yt = out.find(r => r.kind === 'youtube_captions_fetch')!;
  assert.equal(yt.quotaSignals, 1);
});

test('无 job 返回空', () => {
  assert.deepEqual(summarizeHealth([], []), []);
});

test('额度信号关联到正确 kind，无匹配 job 的日志忽略', () => {
  const jobs: JobRow[] = [{ id: 'a', kind: 'openalex_papers_fetch', status: 'running' }];
  const logs: LogRow[] = [
    { jobId: 'a', level: 'warning', message: '正常信息' }, // 不含额度词
    { jobId: 'ghost', level: 'error', message: '429' },     // 无对应 job
  ];
  const out = summarizeHealth(jobs, logs);
  assert.equal(out[0].running, 1);
  assert.equal(out[0].quotaSignals, 0);
});
