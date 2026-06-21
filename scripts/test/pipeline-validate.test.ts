import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensurePipelinesRegistered } from '../../lib/admin/pipelines';
import { getPipeline } from '../../lib/admin/pipelines/registry';

test('single_person_refresh 无人物 → 报错', () => {
  ensurePipelinesRegistered();
  const p = getPipeline('single_person_refresh')!;
  assert.equal(p.validate!({ dryRun: true, targetPersonIds: [], options: {} }), '请选择一个人物');
});

test('new_person_build 无 QID → 报错', () => {
  ensurePipelinesRegistered();
  const p = getPipeline('new_person_build')!;
  assert.equal(p.validate!({ dryRun: true, targetPersonIds: [], options: { targetQids: '' } }), '请填写至少一个 Wikidata QID');
});

test('rebuild + 指定渠道 → 报错', () => {
  ensurePipelinesRegistered();
  const p = getPipeline('all_people_refresh')!;
  assert.equal(p.validate!({ dryRun: true, targetPersonIds: [], options: { refreshMode: 'rebuild', sourceTypes: ['exa'] } }), '清空重建模式不支持单独选择媒体渠道，请使用全部来源');
});

test('single_person_refresh 合法 → null', () => {
  ensurePipelinesRegistered();
  const p = getPipeline('single_person_refresh')!;
  assert.equal(p.validate!({ dryRun: true, targetPersonIds: ['p1'], options: {} }), null);
});

test('4 种 person pipeline 均已注册', () => {
  ensurePipelinesRegistered();
  for (const kind of ['new_person_build', 'single_person_refresh', 'multi_person_refresh', 'all_people_refresh']) {
    assert.ok(getPipeline(kind), `${kind} 应已注册`);
  }
});
