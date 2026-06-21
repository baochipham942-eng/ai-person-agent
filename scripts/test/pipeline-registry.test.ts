import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerPipeline, getPipeline, listPipelines, resetRegistry } from '../../lib/admin/pipelines/registry';
import type { MaintenancePipeline } from '../../lib/admin/pipelines/types';

function fakePipeline(kind: string): MaintenancePipeline {
  return { kind, label: kind, category: 'content', run: async () => {} };
}

test('register + get 取回同一条', () => {
  resetRegistry();
  const p = fakePipeline('a');
  registerPipeline(p);
  assert.equal(getPipeline('a'), p);
});

test('未知 kind 返回 undefined', () => {
  resetRegistry();
  assert.equal(getPipeline('missing'), undefined);
});

test('重复注册同一 kind 抛错', () => {
  resetRegistry();
  registerPipeline(fakePipeline('dup'));
  assert.throws(() => registerPipeline(fakePipeline('dup')), /已注册/);
});

test('listPipelines 返回全部', () => {
  resetRegistry();
  registerPipeline(fakePipeline('a'));
  registerPipeline(fakePipeline('b'));
  assert.deepEqual(listPipelines().map(p => p.kind).sort(), ['a', 'b']);
});
