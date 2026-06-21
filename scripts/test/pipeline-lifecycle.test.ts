import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPipelineContext, type ContextDeps } from '../../lib/admin/pipelines/context';

function fakeDeps() {
  const logs: Array<{ level: string; message: string }> = [];
  const progress: Array<{ progressTotal?: number; progressDone?: number }> = [];
  let status = 'running';
  const deps: ContextDeps = {
    appendLog: async (_jobId, level, message) => { logs.push({ level, message }); },
    setProgress: async (_jobId, patch) => { progress.push(patch); },
    readStatus: async () => status,
  };
  return { deps, logs, progress, setStatus: (s: string) => { status = s; } };
}

const baseJob = {
  id: 'job1', dryRun: true, options: { limit: 5 } as Record<string, unknown>,
  requestedById: 'admin1', targetPersonIds: ['p1'],
};

test('log 透传到 appendLog', async () => {
  const f = fakeDeps();
  const ctx = createPipelineContext(baseJob, f.deps);
  await ctx.log('info', '你好');
  assert.deepEqual(f.logs, [{ level: 'info', message: '你好' }]);
});

test('setTotal/setDone 透传到 setProgress', async () => {
  const f = fakeDeps();
  const ctx = createPipelineContext(baseJob, f.deps);
  await ctx.setTotal(10);
  await ctx.setDone(3);
  assert.deepEqual(f.progress, [{ progressTotal: 10 }, { progressDone: 3 }]);
});

test('isCancelled 读 status===cancelling', async () => {
  const f = fakeDeps();
  const ctx = createPipelineContext(baseJob, f.deps);
  assert.equal(await ctx.isCancelled(), false);
  f.setStatus('cancelling');
  assert.equal(await ctx.isCancelled(), true);
});

test('ctx 暴露 job 字段', () => {
  const f = fakeDeps();
  const ctx = createPipelineContext(baseJob, f.deps);
  assert.equal(ctx.dryRun, true);
  assert.equal(ctx.options.limit, 5);
  assert.equal(ctx.requestedById, 'admin1');
  assert.deepEqual(ctx.targetPersonIds, ['p1']);
});
