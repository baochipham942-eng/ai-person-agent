import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPipelineContext, type ContextDeps } from '../../lib/admin/pipelines/context';
import { runJobWithPipeline, type ShellDeps, type ShellJob } from '../../lib/admin/pipelines/shell';
import type { MaintenancePipeline } from '../../lib/admin/pipelines/types';

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

// —— 外壳状态机 ——

function shellHarness(initialStatus = 'queued') {
  let status = initialStatus;
  const statusWrites: string[] = [];
  const deps: ShellDeps = {
    claimRunning: async () => { status = 'running'; return true; },
    readStatus: async () => status,
    setStatus: async (_id, s) => { status = s; statusWrites.push(s); },
    appendLog: async () => {},
    makeContext: (job) => ({
      jobId: job.id, dryRun: job.dryRun, options: job.options, requestedById: job.requestedById,
      targetPersonIds: job.targetPersonIds,
      log: async () => {}, setTotal: async () => {}, setDone: async () => {},
      isCancelled: async () => status === 'cancelling',
    }),
  };
  return { deps, statusWrites, setStatus: (s: string) => { status = s; } };
}

const shellJob: ShellJob = { id: 'j', kind: 'k', dryRun: true, status: 'queued', options: {}, requestedById: null, targetPersonIds: [] };
const okPipeline: MaintenancePipeline = { kind: 'k', label: 'k', category: 'content', run: async () => {} };

test('run 正常返回 → 置 completed', async () => {
  const h = shellHarness();
  await runJobWithPipeline(shellJob, okPipeline, h.deps);
  assert.equal(h.statusWrites.at(-1), 'completed');
});

test('run 抛错 → 置 failed', async () => {
  const h = shellHarness();
  const boom: MaintenancePipeline = { kind: 'k', label: 'k', category: 'content', run: async () => { throw new Error('炸'); } };
  await runJobWithPipeline(shellJob, boom, h.deps);
  assert.equal(h.statusWrites.at(-1), 'failed');
});

test('运行中被请求取消 → 置 cancelled 不 completed', async () => {
  const h = shellHarness();
  const cancelDuring: MaintenancePipeline = { kind: 'k', label: 'k', category: 'content', run: async () => { h.setStatus('cancelling'); } };
  await runJobWithPipeline(shellJob, cancelDuring, h.deps);
  assert.equal(h.statusWrites.at(-1), 'cancelled');
});

test('入队前已 cancelling → 不启动', async () => {
  const h = shellHarness('cancelling');
  await runJobWithPipeline({ ...shellJob, status: 'cancelling' }, okPipeline, h.deps);
  assert.deepEqual(h.statusWrites, []);
});
