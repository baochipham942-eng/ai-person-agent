# 管理员运维能力升级 P0 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `runMaintenanceJob` 从写死 4 种 person 任务改成「管线注册表派生」，并把 5 条烧第三方额度的内容管线（company-blogs / youtube-captions / threads-link / openalex-papers / courses）接进现有后台队列（触发/定时/dry-run/取消重试/进度日志）。

**Architecture:** 新增 `lib/admin/pipelines/` 注册表层（types/registry/context/index），把执行器 `runMaintenanceJob` 瘦身成「生命周期外壳」——状态机（running/completed/failed/cancelled）由外壳独占，业务逻辑下沉到各 pipeline 的 `run(ctx)`。现有 4 种 person 任务原样搬进 `person.ts` 注册成 pipeline，行为零变化。5 条内容脚本各把核心循环抽进 `lib/pipelines/<name>.ts` 的 `run<Name>(opts, ctx?)`，CLI `main()` 变薄壳调它、后台 pipeline 也调它（CLI 与后台共用一份核心）。

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Prisma 5 (PostgreSQL/Neon) / Inngest（后台编排）/ Arco Design + Tailwind（admin UI）/ `node --test`（测试，沿用 `scripts/test/*.test.ts`）。包管理器 **bun**；测试与脚本用 **npx tsx**（bun 下 Prisma 原生引擎本机签名冲突，见脚本头注释）。

**关键约束（不可违反）：**
- person 4 种任务搬迁后**对外可见行为不变**（最终状态、日志文案、进度计数）。Phase B 收尾必须回归绿灯才进 Phase C。
- 内容管线默认 **dry-run**；后台跑真实抓取（execute）烧 Exa/Jina/supadata 额度，验收只跑 dry-run，不在 P0 用 execute 批量抓。
- 5 条 CLI 脚本**仍能命令行裸跑**（薄壳不破坏 `npx tsx scripts/...`）。
- 生命周期状态由外壳独占，pipeline.run() **不自己写终态**。

**测试运行约定：** 测试文件放 `scripts/test/*.test.ts`，用 `npx tsx --test scripts/test/<name>.test.ts` 跑。注册表/上下文/状态机测试用内存 fake，**不连真库**（context 的副作用通过依赖注入 mock）。

---

## 文件结构

**新建：**
- `lib/admin/pipelines/types.ts` — `MaintenancePipeline` / `PipelineContext` / `PipelineOptionField` 等接口
- `lib/admin/pipelines/registry.ts` — 进程内注册表：register/get/list/reset
- `lib/admin/pipelines/context.ts` — `createPipelineContext(job, deps?)` 工厂，封装 log/进度/取消
- `lib/admin/pipelines/person.ts` — 4 种 person 任务搬迁 + 注册
- `lib/admin/pipelines/content/company-blogs.ts` — company-blogs pipeline 注册
- `lib/admin/pipelines/content/youtube-captions.ts` — 同上
- `lib/admin/pipelines/content/threads-link.ts` — 同上
- `lib/admin/pipelines/content/openalex-papers.ts` — 同上
- `lib/admin/pipelines/content/courses.ts` — 同上
- `lib/admin/pipelines/index.ts` — import 上述全部，副作用注册；导出 `ensurePipelinesRegistered()`
- `lib/pipelines/company-blogs.ts` — 从脚本抽出的核心 `runCompanyBlogs(opts, ctx?)`
- `lib/pipelines/youtube-captions.ts` / `threads-link.ts` / `openalex-papers.ts` / `courses-enrich.ts` — 同上
- `lib/admin/datasource-health.ts` — 从 MaintenanceJobLog 聚合数据源健康
- `app/api/admin/maintenance/pipelines/route.ts` — 只读下发 pipeline 元数据给 UI
- `scripts/test/pipeline-registry.test.ts` / `pipeline-lifecycle.test.ts` / `pipeline-validate.test.ts` / `datasource-health.test.ts` — 测试

**修改：**
- `lib/admin/maintenance.ts` — `runMaintenanceJob` 瘦身为外壳；删除 person 专属函数（搬走）；`isMaintenanceKind`→`getPipeline`；retry/schedule scan 改用注册表
- `lib/inngest/maintenanceJobs.ts` — 运行前调 `ensurePipelinesRegistered()`
- `app/api/admin/maintenance/jobs/route.ts` — 校验改注册表派生；调 `pipeline.validate()`
- `app/admin/maintenance/MaintenanceClient.tsx` — kind 下拉按 category 分组、按 optionFields 渲染内容管线字段
- `app/admin/maintenance/MaintenanceScheduleClient.tsx` — 同源改造
- `app/admin/maintenance/page.tsx` — 注入 pipeline 元数据 + 渲染数据源健康卡片
- 5 条脚本 `scripts/enrich/fetch_company_blogs.ts` 等 — `main()` 改薄壳

---

## Phase A — 注册表地基（纯逻辑，TDD）

### Task 1: 定义 pipeline 类型

**Files:**
- Create: `lib/admin/pipelines/types.ts`

- [ ] **Step 1: 写类型文件**

```ts
// lib/admin/pipelines/types.ts
export type PipelineCategory = 'person' | 'content';

export type PipelineOptionFieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select';

export interface PipelineOptionField {
  key: string;
  label: string;
  type: PipelineOptionFieldType;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  /** type==='select' 时的可选项 */
  options?: Array<{ value: string; label: string }>;
  help?: string;
}

export interface PipelineValidateInput {
  dryRun: boolean;
  targetPersonIds: string[];
  options: Record<string, unknown>;
}

export type PipelineLogLevel = 'info' | 'warning' | 'error';

/** pipeline 运行时拿到的横切能力。所有写副作用收口在这里，便于单测 mock。 */
export interface PipelineContext {
  jobId: string;
  dryRun: boolean;
  options: Record<string, unknown>;
  requestedById: string | null;
  targetPersonIds: string[];
  log(level: PipelineLogLevel, message: string, metadata?: Record<string, unknown>): Promise<void>;
  setTotal(total: number): Promise<void>;
  setDone(done: number): Promise<void>;
  /** 只读检查：是否已请求取消（job.status==='cancelling'）。pipeline 见 true 应尽快 return，由外壳负责落终态。 */
  isCancelled(): Promise<boolean>;
}

export interface MaintenancePipeline {
  kind: string;
  label: string;
  category: PipelineCategory;
  optionFields?: PipelineOptionField[];
  /** 返回错误文案表示校验不通过；返回 null 表示通过。缺省视为通过。 */
  validate?(input: PipelineValidateInput): string | null;
  run(ctx: PipelineContext): Promise<void>;
}
```

- [ ] **Step 2: 验证编译**

Run: `cd /Users/linchen/Downloads/ai/ai-person-agent && bunx tsc --noEmit`
Expected: 零错误（新文件无引用方暂不报错）

- [ ] **Step 3: Commit**

```bash
git add lib/admin/pipelines/types.ts
git commit -m "feat(pipelines): 定义 MaintenancePipeline 类型契约"
```

---

### Task 2: 实现注册表

**Files:**
- Create: `lib/admin/pipelines/registry.ts`
- Test: `scripts/test/pipeline-registry.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// scripts/test/pipeline-registry.test.ts
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx tsx --test scripts/test/pipeline-registry.test.ts`
Expected: FAIL（`registry` 模块不存在 / 导入报错）

- [ ] **Step 3: 写实现**

```ts
// lib/admin/pipelines/registry.ts
import type { MaintenancePipeline } from './types';

const registry = new Map<string, MaintenancePipeline>();

export function registerPipeline(pipeline: MaintenancePipeline): void {
  if (registry.has(pipeline.kind)) {
    throw new Error(`管线已注册: ${pipeline.kind}`);
  }
  registry.set(pipeline.kind, pipeline);
}

export function getPipeline(kind: string): MaintenancePipeline | undefined {
  return registry.get(kind);
}

export function listPipelines(): MaintenancePipeline[] {
  return [...registry.values()];
}

/** 仅供测试重置注册表。 */
export function resetRegistry(): void {
  registry.clear();
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx tsx --test scripts/test/pipeline-registry.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
git add lib/admin/pipelines/registry.ts scripts/test/pipeline-registry.test.ts
git commit -m "feat(pipelines): 进程内管线注册表 + 单测"
```

---

### Task 3: 实现 context 工厂（依赖注入版，可单测）

**Files:**
- Create: `lib/admin/pipelines/context.ts`
- Test: `scripts/test/pipeline-lifecycle.test.ts`（本任务先建 context 部分）

**说明：** `createPipelineContext` 默认绑定真 prisma/`appendMaintenanceLog`，但接受可选 `deps` 注入，测试传 fake 记录调用、不连库。

- [ ] **Step 1: 写失败测试（context 行为）**

```ts
// scripts/test/pipeline-lifecycle.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPipelineContext, type ContextDeps } from '../../lib/admin/pipelines/context';

function fakeDeps() {
  const logs: Array<{ level: string; message: string }> = [];
  const progress: Array<{ total?: number; done?: number }> = [];
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx tsx --test scripts/test/pipeline-lifecycle.test.ts`
Expected: FAIL（`context` 模块不存在）

- [ ] **Step 3: 写实现**

```ts
// lib/admin/pipelines/context.ts
import { prisma } from '@/lib/db/prisma';
import { appendMaintenanceLog } from '@/lib/admin/maintenance';
import type { PipelineContext, PipelineLogLevel } from './types';

export interface PipelineJobLike {
  id: string;
  dryRun: boolean;
  options: Record<string, unknown>;
  requestedById: string | null;
  targetPersonIds: string[];
}

/** 把写副作用抽成可注入依赖，便于单测。生产用默认实现（真 prisma）。 */
export interface ContextDeps {
  appendLog(jobId: string, level: PipelineLogLevel, message: string, metadata?: Record<string, unknown>): Promise<void>;
  setProgress(jobId: string, patch: { progressTotal?: number; progressDone?: number }): Promise<void>;
  readStatus(jobId: string): Promise<string | null>;
}

const defaultDeps: ContextDeps = {
  appendLog: (jobId, level, message, metadata) => appendMaintenanceLog(jobId, level, message, metadata),
  setProgress: async (jobId, patch) => {
    await prisma.maintenanceJob.update({ where: { id: jobId }, data: patch });
  },
  readStatus: async (jobId) => {
    const job = await prisma.maintenanceJob.findUnique({ where: { id: jobId }, select: { status: true } });
    return job?.status ?? null;
  },
};

export function createPipelineContext(job: PipelineJobLike, deps: ContextDeps = defaultDeps): PipelineContext {
  return {
    jobId: job.id,
    dryRun: job.dryRun,
    options: job.options,
    requestedById: job.requestedById,
    targetPersonIds: job.targetPersonIds,
    log: (level, message, metadata) => deps.appendLog(job.id, level, message, metadata),
    setTotal: (total) => deps.setProgress(job.id, { progressTotal: total }),
    setDone: (done) => deps.setProgress(job.id, { progressDone: done }),
    isCancelled: async () => (await deps.readStatus(job.id)) === 'cancelling',
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx tsx --test scripts/test/pipeline-lifecycle.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
git add lib/admin/pipelines/context.ts scripts/test/pipeline-lifecycle.test.ts
git commit -m "feat(pipelines): 可注入的 PipelineContext 工厂 + 单测"
```

> 注：此时 `context.ts` import 了 `appendMaintenanceLog`（`maintenance.ts` 现有导出，line 566）。无循环依赖问题（maintenance.ts 尚未 import context）。

---

## Phase B — 执行器外壳化 + person 搬迁（高风险，回归把关）

### Task 4: person 4 种任务搬进 person.ts 并注册

**Files:**
- Create: `lib/admin/pipelines/person.ts`
- Modify: `lib/admin/maintenance.ts`（删除搬走的函数）

**搬迁清单（从 `lib/admin/maintenance.ts` 整体移动到 `person.ts`，逻辑一字不改，仅把「直接写库的进度/日志/取消」换成 ctx 调用）：**
- `MaintenanceKind` / `MaintenanceRefreshMode` / `MaintenanceSourceType` 类型 + `MAINTENANCE_KIND_LABELS` + `MAINTENANCE_SOURCE_TYPES`（line 7–18）→ 移到 person.ts 并 `export`（仍需被 UI/route 引用）
- `resolveTargets`（line 350–382）、`runNewPersonBuildJob`（384–442）、`createPersonFromQid`（468–495）、`preparePersonForRebuild`（497–529）、`triggerPersonUpdate`（531–564）、`personSelect`（582–591）
- option 解析助手 `getRefreshMode` / `getSourceTypes` / `normalizeSourceType` / `normalizeOfficialLinks` / `getTargetQids` / `getOption` / `getStringOption` / `isRecord` / `uniqueStrings` / `clampInteger` / `extractWhitelistDomains`（这些被 person 逻辑用；若 maintenance.ts 仍需同名助手，各自保留私有副本，DRY 让位于解耦）
- `MaintenancePerson` 类型（line 31–39）

**关键改写：** 原 `runMaintenanceJob` 里 line 210–278 的 person 主体逻辑拆成两条 pipeline.run：
- `new_person_build` → 调搬来的 `runNewPersonBuildJob` 改写版
- `single/multi/all_people_refresh` → 共用一条 refresh 主体

进度/日志/取消的替换规则：
- `await prisma.maintenanceJob.update({ data: { progressTotal: N } })` → `await ctx.setTotal(N)`
- `await prisma.maintenanceJob.update({ data: { progressDone: i+1 } })` → `await ctx.setDone(i + 1)`
- `await appendMaintenanceLog(jobId, level, msg, meta)` → `await ctx.log(level, msg, meta)`
- `if (await finishIfCancellationRequested(jobId)) return;` → `if (await ctx.isCancelled()) return;`（**不再自己置 cancelled，外壳负责**）
- 删除原来 person 主体末尾「置 status=completed」「置 status=cancelled/failed」的 update（**终态全归外壳**）

- [ ] **Step 1: 写 person.ts**

```ts
// lib/admin/pipelines/person.ts
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getWikidataEntity, getWikidataEntityWithTranslation } from '@/lib/datasources/wikidata';
import { inngest } from '@/lib/inngest/client';
import { downloadAndStoreAvatar } from '@/lib/storage/avatarStorage';
import { registerPipeline } from './registry';
import type { MaintenancePipeline, PipelineContext, PipelineValidateInput } from './types';

export type MaintenanceKind = 'new_person_build' | 'single_person_refresh' | 'multi_person_refresh' | 'all_people_refresh';
export type MaintenanceRefreshMode = 'incremental' | 'force' | 'rebuild';
export type MaintenanceSourceType = 'exa' | 'grok' | 'youtube' | 'openalex' | 'podcast' | 'github' | 'career';

export const MAINTENANCE_KIND_LABELS: Record<MaintenanceKind, string> = {
  new_person_build: '新人物首次构建',
  single_person_refresh: '单人物更新',
  multi_person_refresh: '多人物列表更新',
  all_people_refresh: '全站批量更新',
};
export const MAINTENANCE_SOURCE_TYPES = ['exa', 'grok', 'youtube', 'openalex', 'podcast', 'github', 'career'] as const;

// —— 以下 MaintenancePerson 类型 + resolveTargets / runNewPersonBuild / createPersonFromQid /
//    preparePersonForRebuild / triggerPersonUpdate / personSelect + 所有 option 助手，
//    从 lib/admin/maintenance.ts 原样搬来（line 引用见计划正文），
//    进度/日志/取消按「关键改写」规则替换为 ctx 调用。 ——

// refresh 主体（single/multi/all 共用），从原 runMaintenanceJob line 215–266 改写：
async function runRefresh(ctx: PipelineContext, kind: MaintenanceKind): Promise<void> {
  const people = await resolveTargets(kind, ctx.targetPersonIds, ctx.options as Prisma.JsonValue);
  const refreshMode = getRefreshMode(ctx.options);
  const sourceTypes = getSourceTypes(ctx.options);
  await ctx.setTotal(people.length);
  if (people.length === 0) await ctx.log('warning', '没有匹配到需要更新的人物');

  for (const [index, person] of people.entries()) {
    if (await ctx.isCancelled()) return;
    if (ctx.dryRun) {
      await ctx.log('info', `dry-run: 将${refreshMode === 'rebuild' ? '重建' : '刷新'} ${person.name}`, { personId: person.id, refreshMode, sourceTypes });
    } else {
      const prepared = refreshMode === 'rebuild' ? await preparePersonForRebuild(person) : person;
      const meta = await triggerPersonUpdate(prepared, ctx.options as Prisma.JsonValue);
      await ctx.log('info', `已投递 ${prepared.name} 的构建任务`, { personId: prepared.id, ...meta });
    }
    await ctx.setDone(index + 1);
  }
  if (await ctx.isCancelled()) return;
  await ctx.log('info', ctx.dryRun ? `dry-run 完成，共检查 ${people.length} 人` : `任务投递完成，共投递 ${people.length} 人`);
}

// new_person_build 主体，从原 runNewPersonBuildJob line 384–442 改写为用 ctx：
async function runNewPersonBuild(ctx: PipelineContext): Promise<void> {
  const qids = getTargetQids(ctx.options);
  const sourceTypes = getSourceTypes(ctx.options);
  const refreshMode = getRefreshMode(ctx.options);
  await ctx.setTotal(qids.length);
  if (qids.length === 0) await ctx.log('warning', '没有填写需要构建的新人物 QID');

  for (const [index, qid] of qids.entries()) {
    if (await ctx.isCancelled()) return;
    const existing = await prisma.people.findUnique({ where: { qid }, select: personSelect() });
    if (ctx.dryRun) {
      await ctx.log('info', existing ? `dry-run: ${qid} 已存在，将触发 ${existing.name}` : `dry-run: 将创建并构建 ${qid}`, { qid, personId: existing?.id, sourceTypes });
    } else {
      const { person, created } = existing
        ? { person: refreshMode === 'rebuild' ? await preparePersonForRebuild(existing) : existing, created: false }
        : { person: await createPersonFromQid(qid), created: true };
      const meta = await triggerPersonUpdate(person, ctx.options as Prisma.JsonValue);
      await ctx.log('info', `${created ? '已创建并投递' : '已存在并投递'} ${person.name}`, { qid, personId: person.id, ...meta });
    }
    await ctx.setDone(index + 1);
  }
  if (await ctx.isCancelled()) return;
  await ctx.log('info', ctx.dryRun ? `dry-run 完成，共检查 ${qids.length} 个 QID` : `任务投递完成，共投递 ${qids.length} 个 QID`);
}

function validatePerson(kind: MaintenanceKind) {
  return (input: PipelineValidateInput): string | null => {
    const refreshMode = getRefreshMode(input.options);
    const sourceTypes = getSourceTypes(input.options);
    if (kind === 'new_person_build' && getTargetQids(input.options).length === 0) return '请填写至少一个 Wikidata QID';
    if (kind === 'single_person_refresh' && input.targetPersonIds.length === 0) return '请选择一个人物';
    if (kind === 'multi_person_refresh' && input.targetPersonIds.length === 0) return '请填写至少一个人物 ID';
    if (refreshMode === 'rebuild' && sourceTypes.length > 0) return '清空重建模式不支持单独选择媒体渠道，请使用全部来源';
    return null;
  };
}

function personPipeline(kind: MaintenanceKind, run: (ctx: PipelineContext) => Promise<void>): MaintenancePipeline {
  return { kind, label: MAINTENANCE_KIND_LABELS[kind], category: 'person', validate: validatePerson(kind), run };
}

registerPipeline(personPipeline('new_person_build', runNewPersonBuild));
registerPipeline(personPipeline('single_person_refresh', ctx => runRefresh(ctx, 'single_person_refresh')));
registerPipeline(personPipeline('multi_person_refresh', ctx => runRefresh(ctx, 'multi_person_refresh')));
registerPipeline(personPipeline('all_people_refresh', ctx => runRefresh(ctx, 'all_people_refresh')));

// ... 搬来的 resolveTargets / createPersonFromQid / preparePersonForRebuild / triggerPersonUpdate /
//     personSelect / getRefreshMode / getSourceTypes / normalizeSourceType / normalizeOfficialLinks /
//     getTargetQids / getOption / getStringOption / isRecord / uniqueStrings / clampInteger /
//     extractWhitelistDomains + MaintenancePerson 类型，全部置于此文件下半部分（私有，不 export）。
```

- [ ] **Step 2: 从 maintenance.ts 删除搬走的函数**

把 Step 1 清单里的函数/类型从 `lib/admin/maintenance.ts` 删除。保留：`createAndQueueMaintenanceJob`、`enqueueMaintenanceJob`、`retryMaintenanceJob`、`cancelMaintenanceJob`、`runMaintenanceJob`（下个 Task 改）、`runDueMaintenanceSchedules`、`appendMaintenanceLog`、`commandForJob`、`toJsonObject`。`commandForJob` 仍需 `getRefreshMode`：在 maintenance.ts 保留一份私有 `getRefreshMode` + `isRecord` 副本（解耦优先）。

- [ ] **Step 3: 验证编译**

Run: `bunx tsc --noEmit`
Expected: 报错集中在 `maintenance.ts` 里 `runMaintenanceJob` 仍引用已删除的 person 函数 + `MaintenanceKind` 等导出被外部引用 → 下个 Task 修。**记录报错清单**，确认都属预期（无意外断点）。

- [ ] **Step 4: Commit（WIP，编译未绿，下个 Task 收口）**

```bash
git add lib/admin/pipelines/person.ts lib/admin/maintenance.ts
git commit -m "feat(pipelines): person 4 种任务搬进 person.ts 注册为 pipeline (WIP)"
```

---

### Task 5: runMaintenanceJob 瘦身为生命周期外壳

**Files:**
- Modify: `lib/admin/maintenance.ts`
- Create: `lib/admin/pipelines/index.ts`
- Test: `scripts/test/pipeline-lifecycle.test.ts`（追加外壳状态机测试）

- [ ] **Step 1: 建注册汇总入口**

```ts
// lib/admin/pipelines/index.ts
import './person';
import './content/company-blogs';
import './content/youtube-captions';
import './content/threads-link';
import './content/openalex-papers';
import './content/courses';

/** 确保所有 pipeline 已注册（import 副作用）。在执行器/路由入口调用一次。 */
export function ensurePipelinesRegistered(): void {
  // 仅触发上面的 import 副作用；空函数体即可。
}
```

> 注：本 Task 中 content/* 文件尚未创建（Phase D 建）。**为让编译通过，先建 5 个 content/* 空壳文件**，内容仅 `export {}`（占位），Phase D 再填实。或在 index.ts 暂时注释掉 content imports，Phase D 第一个 Task 解开——选后者更干净，本计划采用「先注释，Phase D Task 11 解开」。

修正后的 index.ts（Phase B 版本）：

```ts
// lib/admin/pipelines/index.ts
import './person';
// content pipelines 在 Phase D 逐条解开注释：
// import './content/company-blogs';
// import './content/youtube-captions';
// import './content/threads-link';
// import './content/openalex-papers';
// import './content/courses';

export function ensurePipelinesRegistered(): void {}
```

- [ ] **Step 2: 写外壳状态机失败测试**

在 `scripts/test/pipeline-lifecycle.test.ts` 追加。外壳逻辑需可注入，故新增 `runJobWithPipeline(job, pipeline, deps)` 纯函数（外壳核心），`runMaintenanceJob` 是它的「读真库 + 调它」薄封装。

```ts
// 追加到 scripts/test/pipeline-lifecycle.test.ts
import { runJobWithPipeline, type ShellDeps } from '../../lib/admin/pipelines/shell';
import type { MaintenancePipeline } from '../../lib/admin/pipelines/types';

function shellHarness(initialStatus = 'running') {
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

const job = { id: 'j', kind: 'k', dryRun: true, status: 'queued', options: {}, requestedById: null, targetPersonIds: [] };
const okPipeline: MaintenancePipeline = { kind: 'k', label: 'k', category: 'content', run: async () => {} };

test('run 正常返回 → 置 completed', async () => {
  const h = shellHarness();
  await runJobWithPipeline(job, okPipeline, h.deps);
  assert.equal(h.statusWrites.at(-1), 'completed');
});

test('run 抛错 → 置 failed', async () => {
  const h = shellHarness();
  const boom: MaintenancePipeline = { kind: 'k', label: 'k', category: 'content', run: async () => { throw new Error('炸'); } };
  await runJobWithPipeline(job, boom, h.deps);
  assert.equal(h.statusWrites.at(-1), 'failed');
});

test('运行中被请求取消 → 置 cancelled 不 completed', async () => {
  const h = shellHarness();
  const cancelDuring: MaintenancePipeline = { kind: 'k', label: 'k', category: 'content', run: async () => { h.setStatus('cancelling'); } };
  await runJobWithPipeline(job, cancelDuring, h.deps);
  assert.equal(h.statusWrites.at(-1), 'cancelled');
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npx tsx --test scripts/test/pipeline-lifecycle.test.ts`
Expected: FAIL（`shell` 模块不存在）

- [ ] **Step 4: 写外壳核心 shell.ts**

```ts
// lib/admin/pipelines/shell.ts
import type { MaintenancePipeline, PipelineContext, PipelineLogLevel } from './types';

export interface ShellJob {
  id: string;
  kind: string;
  dryRun: boolean;
  status: string;
  options: Record<string, unknown>;
  requestedById: string | null;
  targetPersonIds: string[];
}

export interface ShellDeps {
  /** 抢占式置 running（status notIn cancelled/cancelling 才成功）。返回是否抢到。 */
  claimRunning(jobId: string): Promise<boolean>;
  readStatus(jobId: string): Promise<string | null>;
  setStatus(jobId: string, status: string, extra?: { errorMessage?: string | null; completedAt?: boolean }): Promise<void>;
  appendLog(jobId: string, level: PipelineLogLevel, message: string): Promise<void>;
  makeContext(job: ShellJob): PipelineContext;
}

export async function runJobWithPipeline(job: ShellJob, pipeline: MaintenancePipeline, deps: ShellDeps): Promise<void> {
  if (job.status === 'cancelled' || job.status === 'cancelling') return;
  const claimed = await deps.claimRunning(job.id);
  if (!claimed) return;
  await deps.appendLog(job.id, 'info', `开始${pipeline.label}${job.dryRun ? ' dry-run' : ''}`);
  const ctx = deps.makeContext(job);
  try {
    await pipeline.run(ctx);
    const status = await deps.readStatus(job.id);
    if (status === 'cancelling') {
      await deps.setStatus(job.id, 'cancelled', { errorMessage: null, completedAt: true });
      await deps.appendLog(job.id, 'warning', '任务已取消');
    } else if (status === 'running') {
      await deps.setStatus(job.id, 'completed', { completedAt: true });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await deps.setStatus(job.id, 'failed', { errorMessage: message, completedAt: true });
    await deps.appendLog(job.id, 'error', message);
  }
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npx tsx --test scripts/test/pipeline-lifecycle.test.ts`
Expected: PASS（全部，含新增 3 条）

- [ ] **Step 6: 把 runMaintenanceJob 改成 shell 的薄封装**

替换 `lib/admin/maintenance.ts` 现有 `runMaintenanceJob`（line 186–279）为：

```ts
import { getPipeline } from './pipelines/registry';
import { ensurePipelinesRegistered } from './pipelines';
import { createPipelineContext } from './pipelines/context';
import { runJobWithPipeline, type ShellDeps } from './pipelines/shell';

export async function runMaintenanceJob(jobId: string) {
  ensurePipelinesRegistered();
  const job = await prisma.maintenanceJob.findUnique({ where: { id: jobId } });
  if (!job) return;
  const pipeline = getPipeline(job.kind);
  if (!pipeline) {
    await prisma.maintenanceJob.update({ where: { id: jobId }, data: { status: 'failed', errorMessage: `未知任务类型：${job.kind}`, completedAt: new Date() } });
    await appendMaintenanceLog(jobId, 'error', `未知任务类型：${job.kind}`);
    return;
  }
  const shellJob = {
    id: job.id, kind: job.kind, dryRun: job.dryRun, status: job.status,
    options: isRecord(job.options) ? job.options : {},
    requestedById: job.requestedById, targetPersonIds: job.targetPersonIds,
  };
  const deps: ShellDeps = {
    claimRunning: async (id) => {
      const r = await prisma.maintenanceJob.updateMany({
        where: { id, status: { notIn: ['cancelled', 'cancelling'] } },
        data: { status: 'running', startedAt: new Date(), errorMessage: null },
      });
      return r.count > 0;
    },
    readStatus: async (id) => (await prisma.maintenanceJob.findUnique({ where: { id }, select: { status: true } }))?.status ?? null,
    setStatus: async (id, status, extra) => {
      await prisma.maintenanceJob.update({ where: { id }, data: {
        status,
        ...(extra?.errorMessage !== undefined ? { errorMessage: extra.errorMessage } : {}),
        ...(extra?.completedAt ? { completedAt: new Date() } : {}),
      } });
    },
    appendLog: (id, level, message) => appendMaintenanceLog(id, level, message),
    makeContext: (j) => createPipelineContext(j),
  };
  await runJobWithPipeline(shellJob, pipeline, deps);
}
```

把 `runDueMaintenanceSchedules`（line 298）和 `retryMaintenanceJob`（line 117）里的 `isMaintenanceKind(...)` 守卫改成 `getPipeline(...) != null`；删除 maintenance.ts 末尾私有 `isMaintenanceKind`（line 602）。

- [ ] **Step 7: 全量编译 + 回归测试**

Run: `bunx tsc --noEmit && npx tsx --test scripts/test/pipeline-registry.test.ts scripts/test/pipeline-lifecycle.test.ts`
Expected: tsc 零错误；测试全 PASS

- [ ] **Step 8: Commit**

```bash
git add lib/admin/maintenance.ts lib/admin/pipelines/shell.ts lib/admin/pipelines/index.ts scripts/test/pipeline-lifecycle.test.ts
git commit -m "feat(pipelines): runMaintenanceJob 瘦身为生命周期外壳，状态机归外壳独占"
```

---

### Task 6: 接通 jobs route + schedule scan 校验，Inngest 入口注册

**Files:**
- Modify: `app/api/admin/maintenance/jobs/route.ts`
- Modify: `lib/inngest/maintenanceJobs.ts`
- Test: `scripts/test/pipeline-validate.test.ts`

- [ ] **Step 1: 写 person validate 边界测试**

```ts
// scripts/test/pipeline-validate.test.ts
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx tsx --test scripts/test/pipeline-validate.test.ts`
Expected: FAIL（若 person.ts 的 validate 尚未覆盖全 → 修 person.ts validate）

- [ ] **Step 3: 改 jobs route 用注册表校验**

`app/api/admin/maintenance/jobs/route.ts` POST 里：
- 删除 `if (!isMaintenanceKind(kind))` → 改 `const pipeline = getPipeline(kind); if (!pipeline) return NextResponse.json({ error: 'Unsupported maintenance kind' }, { status: 400 });`
- 删除写死的 person 专属校验块（QID/人物/rebuild 那几个 if）→ 改 `const err = pipeline.validate?.({ dryRun, targetPersonIds, options }); if (err) return NextResponse.json({ error: err }, { status: 400 });`
- 文件顶部 `import { getPipeline } from '@/lib/admin/pipelines/registry'; import { ensurePipelinesRegistered } from '@/lib/admin/pipelines';` 并在 handler 开头调 `ensurePipelinesRegistered()`
- 删除文件末尾私有 `isMaintenanceKind`
- `sanitizeOptions` 保留（仍要清洗 options）。注意：`MaintenanceKind` 等类型若 route 还引用，从 `@/lib/admin/pipelines/person` import

- [ ] **Step 4: Inngest 入口确保注册**

`lib/inngest/maintenanceJobs.ts` 顶部加 `import { ensurePipelinesRegistered } from '@/lib/admin/pipelines';`，在 `maintenanceJobRunner` 的 `step.run` 内、调 `runMaintenanceJob` 前调 `ensurePipelinesRegistered();`（`runMaintenanceJob` 内部已调，双保险无害）。

- [ ] **Step 5: 跑测试 + 编译**

Run: `npx tsx --test scripts/test/pipeline-validate.test.ts && bunx tsc --noEmit`
Expected: PASS + 零错误

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/maintenance/jobs/route.ts lib/inngest/maintenanceJobs.ts lib/admin/pipelines/person.ts scripts/test/pipeline-validate.test.ts
git commit -m "feat(pipelines): jobs route + inngest 接通注册表校验"
```

---

### Task 7: Phase B 回归验收门（person 行为不变）

**Files:** 无（验证任务）

- [ ] **Step 1: 全量编译**

Run: `bunx tsc --noEmit`
Expected: 零错误

- [ ] **Step 2: 全量单测**

Run: `npx tsx --test scripts/test/pipeline-registry.test.ts scripts/test/pipeline-lifecycle.test.ts scripts/test/pipeline-validate.test.ts`
Expected: 全 PASS

- [ ] **Step 3: dev server person dry-run 冒烟**

```bash
# 终端 A：bun dev（端口 4001）
# 浏览器或 curl 登录后台后，在 /admin/maintenance 建一个 single_person_refresh 的 dry-run job
# 验证：任务进队列 → 跑完 status=completed → 日志含「dry-run: 将刷新 X」「dry-run 完成，共检查 N 人」
```

Expected: dry-run 行为与搬迁前一致（日志文案、最终状态 completed）。如有差异，回到 Task 4/5 修正。

- [ ] **Step 4: 标记 Phase B 通过**

```bash
git commit --allow-empty -m "test: Phase B 回归通过——person 任务行为不变，可进 Phase C"
```

---

## Phase C — UI pipeline 感知 + pipeline 元数据 API

### Task 8: pipeline 元数据只读 API

**Files:**
- Create: `app/api/admin/maintenance/pipelines/route.ts`

- [ ] **Step 1: 写 route**

```ts
// app/api/admin/maintenance/pipelines/route.ts
import { NextResponse } from 'next/server';
import { requireAdminOrResponse } from '@/lib/auth/permissions';
import { ensurePipelinesRegistered } from '@/lib/admin/pipelines';
import { listPipelines } from '@/lib/admin/pipelines/registry';

export async function GET() {
  const { user, response } = await requireAdminOrResponse();
  if (response) return response;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  ensurePipelinesRegistered();
  const pipelines = listPipelines().map(p => ({
    kind: p.kind, label: p.label, category: p.category, optionFields: p.optionFields ?? [],
  }));
  return NextResponse.json({ pipelines });
}
```

> 校验 `requireAdminOrResponse` 的导出签名：见 `lib/auth/permissions.ts`，与 jobs route 用法一致。

- [ ] **Step 2: 编译**

Run: `bunx tsc --noEmit`
Expected: 零错误

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/maintenance/pipelines/route.ts
git commit -m "feat(admin): pipeline 元数据只读 API"
```

---

### Task 9: MaintenanceClient 内容管线表单

**Files:**
- Modify: `app/admin/maintenance/MaintenanceClient.tsx`
- Modify: `app/admin/maintenance/page.tsx`（把 pipeline 列表传进 client）

**策略（YAGNI）：** person 的 4 个 kind 保留**现有手写表单块**（QID/人物/媒体渠道，不动）。content pipeline 走**通用 optionFields 渲染**。kind 下拉按 category 分两个 `<optgroup>`。

- [ ] **Step 1: page.tsx 注入 pipeline 列表**

`app/admin/maintenance/page.tsx` 服务端读取 pipeline 元数据并传给 `<MaintenanceClient>`：

```ts
import { ensurePipelinesRegistered } from '@/lib/admin/pipelines';
import { listPipelines } from '@/lib/admin/pipelines/registry';
// ... 在组件内：
ensurePipelinesRegistered();
const pipelines = listPipelines().map(p => ({ kind: p.kind, label: p.label, category: p.category, optionFields: p.optionFields ?? [] }));
// <MaintenanceClient people={people} pipelines={pipelines} />
```

- [ ] **Step 2: MaintenanceClient 接收 pipelines + 渲染**

改 `MaintenanceClient.tsx`：
- props 加 `pipelines: PipelineMeta[]`（`PipelineMeta = { kind: string; label: string; category: 'person'|'content'; optionFields: PipelineOptionField[] }`，类型从 `@/lib/admin/pipelines/types` import）
- `kind` state 类型放宽为 `string`（不再是 4 个字面量联合）
- kind 下拉改为分组：

```tsx
<select value={kind} onChange={e => setKind(e.target.value)} className="...">
  <optgroup label="人物维护">
    {pipelines.filter(p => p.category === 'person').map(p => <option key={p.kind} value={p.kind}>{p.label}</option>)}
  </optgroup>
  <optgroup label="内容管线">
    {pipelines.filter(p => p.category === 'content').map(p => <option key={p.kind} value={p.kind}>{p.label}</option>)}
  </optgroup>
</select>
```

- 现有 person 条件块（`kind === 'new_person_build'` 等）保留不动
- 新增 content optionFields 通用渲染块 + content options state：

```tsx
const currentPipeline = pipelines.find(p => p.kind === kind);
const isContent = currentPipeline?.category === 'content';
const [contentOptions, setContentOptions] = useState<Record<string, string>>({});

// 在 person 块之后插入：
{isContent && currentPipeline?.optionFields.map(field => (
  <label key={field.key} className="grid gap-1 text-xs text-stone-500">
    {field.label}
    {field.type === 'textarea' ? (
      <textarea rows={3} placeholder={field.placeholder}
        value={contentOptions[field.key] ?? String(field.defaultValue ?? '')}
        onChange={e => setContentOptions(o => ({ ...o, [field.key]: e.target.value }))}
        className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900" />
    ) : (
      <input type={field.type === 'number' ? 'number' : 'text'} placeholder={field.placeholder}
        value={contentOptions[field.key] ?? String(field.defaultValue ?? '')}
        onChange={e => setContentOptions(o => ({ ...o, [field.key]: e.target.value }))}
        className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900" />
    )}
    {field.help && <span className="text-stone-400">{field.help}</span>}
  </label>
))}
```

- `createJob` 的 body：content 管线时 `targetPersonIds: []`、`options: contentOptions`（数字字段在提交时 `Number()`）；person 时保持现有逻辑。媒体渠道块、person 提示块用 `{!isContent && (...)}` 包住，仅 person 显示。

- [ ] **Step 3: 编译 + 冒烟**

Run: `bunx tsc --noEmit`
然后 `bun dev`，`/admin/maintenance` 确认：下拉出现「内容管线」分组（即便此时 content pipeline 尚未注册，分组为空也不报错——Phase D 注册后填充）。person 表单与之前一致。
Expected: 零错误，person 表单不回归

- [ ] **Step 4: Commit**

```bash
git add app/admin/maintenance/MaintenanceClient.tsx app/admin/maintenance/page.tsx
git commit -m "feat(admin): 维护表单 pipeline 感知——内容管线走 optionFields 通用渲染"
```

---

### Task 10: MaintenanceScheduleClient 同源改造

**Files:**
- Modify: `app/admin/maintenance/MaintenanceScheduleClient.tsx`

- [ ] **Step 1: 读现状**

Run: `sed -n '1,60p' app/admin/maintenance/MaintenanceScheduleClient.tsx`
确认它如何选 kind（大概率同样写死 4 个 option）。

- [ ] **Step 2: 同 Task 9 改造**

把定时规则表单的 kind 下拉改为接收 `pipelines` props、按 category 分组；content 管线的 options 同样走 optionFields。`page.tsx` 把 `pipelines` 也传给 schedule client。

- [ ] **Step 3: 编译**

Run: `bunx tsc --noEmit`
Expected: 零错误

- [ ] **Step 4: Commit**

```bash
git add app/admin/maintenance/MaintenanceScheduleClient.tsx app/admin/maintenance/page.tsx
git commit -m "feat(admin): 定时规则表单 pipeline 感知"
```

---

## Phase D — 5 条内容管线（每条：抽核心 → 薄壳 → 注册）

> 每条管线一个 Task，结构相同：① 在 `lib/pipelines/<name>.ts` 暴露 `run<Name>(opts, ctx?)`，把脚本核心循环搬进来，进度/日志/取消在 `ctx` 存在时调用、不存在时退化为 console；② 脚本 `main()` 改薄壳调它；③ `lib/admin/pipelines/content/<name>.ts` 注册 pipeline；④ `index.ts` 解开该 import。第一条 company-blogs 给完整代码做模板，其余按同构 recipe。

### Task 11: company-blogs 管线（模板，完整代码）

**Files:**
- Create: `lib/pipelines/company-blogs.ts`
- Create: `lib/admin/pipelines/content/company-blogs.ts`
- Modify: `scripts/enrich/fetch_company_blogs.ts`
- Modify: `lib/admin/pipelines/index.ts`（解开 company-blogs import）

- [ ] **Step 1: 抽核心到 lib/pipelines/company-blogs.ts**

把 `scripts/enrich/fetch_company_blogs.ts` 的 `norm` / `NICHE_TITLE_RE` / `isHfOfficial` / `resolveOrCreateOrg` / `scrapeListLinks` / `main` 主体搬进来，签名改为：

```ts
// lib/pipelines/company-blogs.ts
import { prisma } from '@/lib/db/prisma';
import { sha256 } from '@/lib/rawpool-identity';
import { fetchArticleText } from '@/lib/datasources/jina-reader';
import { extractContentKeywords } from '@/lib/ai/extract-keywords';
import { COMPANY_BLOGS, parseFeed, type CompanyBlog, type FeedItem } from '@/lib/datasources/company-blogs';

export interface CompanyBlogsOptions {
  execute: boolean;      // 后台对应 !dryRun
  only?: string;
  perCompany: number;
  quiet: boolean;
}

/** ctx 缺省=CLI 裸跑（console）；传入=后台（进度/日志/取消落库）。 */
export interface PipelineRunHooks {
  log?(level: 'info' | 'warning' | 'error', message: string, metadata?: Record<string, unknown>): Promise<void>;
  setTotal?(total: number): Promise<void>;
  setDone?(done: number): Promise<void>;
  isCancelled?(): Promise<boolean>;
}

export async function runCompanyBlogs(opts: CompanyBlogsOptions, hooks: PipelineRunHooks = {}): Promise<{ totalNew: number; totalSkip: number }> {
  const log = async (level: 'info' | 'warning' | 'error', msg: string, meta?: Record<string, unknown>) => {
    if (hooks.log) await hooks.log(level, msg, meta); else console.log(msg);
  };
  const targets = opts.only
    ? COMPANY_BLOGS.filter(c => norm(c.name) === norm(opts.only!) || norm(c.org) === norm(opts.only!))
    : COMPANY_BLOGS;
  await hooks.setTotal?.(targets.length);
  await log('info', `公司博客抓取：模式 ${opts.execute ? 'EXECUTE' : 'DRY-RUN'} | 目标 ${targets.length} 家 | 每家≤${opts.perCompany} 篇`);

  let totalNew = 0, totalSkip = 0;
  for (const [idx, cfg] of targets.entries()) {
    if (await hooks.isCancelled?.()) return { totalNew, totalSkip };
    // —— 原 main() for 循环体搬来：取列表 / 过滤 / upsert CompanySource ——
    // 把原 console.log/console.warn 换成 await log(...)；保留 resolveOrCreateOrg/scrapeListLinks 逻辑
    // ...（逐行搬迁，省略：与脚本 line 99–171 等价）
    await hooks.setDone?.(idx + 1);
  }
  await log('info', `${opts.execute ? '已新增' : '将抓取'} ${totalNew} 篇${opts.execute ? `，跳过 ${totalSkip}` : ''}`);
  return { totalNew, totalSkip };
}

// norm / NICHE_TITLE_RE / isHfOfficial / resolveOrCreateOrg / scrapeListLinks 搬到此文件下方（私有）。
```

> 注意：搬迁后 `resolveOrCreateOrg` 内部的 `console.log('+ 新建 org')` 改 `await log('info', ...)`；它需要 `log` 引用，故把它改成接收 `log` 参数或提到闭包内。最简：把 for 循环体整体留在 `runCompanyBlogs` 内联（与脚本一致），只把无状态纯函数 `norm/isHfOfficial/scrapeListLinks` 外置。**不连库的 `$disconnect()`/`process.exit()` 不要搬进 lib**（那是 CLI 收尾）。

- [ ] **Step 2: 脚本 main() 改薄壳**

`scripts/enrich/fetch_company_blogs.ts` 的 `main()` 改为：

```ts
import { runCompanyBlogs } from '../../lib/pipelines/company-blogs';

async function main() {
  const opts = parseOptions(); // 保留现有 parseOptions
  await runCompanyBlogs(opts); // 无 hooks = console 裸跑
  await prisma.$disconnect();
  process.exit(0);
}
main().catch(async e => { console.error('失败:', e); await prisma.$disconnect(); process.exit(1); });
```

删除脚本里已搬到 lib 的函数（保留 `parseOptions` + dotenv 加载 + main）。

- [ ] **Step 3: 注册 pipeline**

```ts
// lib/admin/pipelines/content/company-blogs.ts
import { registerPipeline } from '../registry';
import { runCompanyBlogs } from '@/lib/pipelines/company-blogs';
import type { PipelineContext } from '../types';

registerPipeline({
  kind: 'company_blogs_fetch',
  label: '公司官方博客抓取',
  category: 'content',
  optionFields: [
    { key: 'only', label: '仅某公司（可选）', type: 'text', placeholder: '如 OpenAI，留空抓全部' },
    { key: 'perCompany', label: '每家最多抓几篇', type: 'number', defaultValue: 15 },
  ],
  run: async (ctx: PipelineContext) => {
    const only = typeof ctx.options.only === 'string' && ctx.options.only.trim() ? ctx.options.only.trim() : undefined;
    const perCompany = Number(ctx.options.perCompany) || 15;
    await runCompanyBlogs(
      { execute: !ctx.dryRun, only, perCompany, quiet: true },
      { log: ctx.log, setTotal: ctx.setTotal, setDone: ctx.setDone, isCancelled: ctx.isCancelled },
    );
  },
});
```

- [ ] **Step 4: index.ts 解开 import**

把 `lib/admin/pipelines/index.ts` 的 `// import './content/company-blogs';` 取消注释。

- [ ] **Step 5: 编译 + CLI 裸跑 dry-run + 后台 dry-run**

```bash
bunx tsc --noEmit
# CLI 仍可裸跑（dry-run，不烧额度）：
npx tsx scripts/enrich/fetch_company_blogs.ts 2>&1 | tail -5
# 后台：bun dev → /admin/maintenance 选「公司官方博客抓取」建 dry-run job → 看进度/日志
```

Expected: tsc 零错误；CLI dry-run 打印「将抓取 N 篇」；后台 job 跑完 completed，日志有进度

- [ ] **Step 6: Commit**

```bash
git add lib/pipelines/company-blogs.ts lib/admin/pipelines/content/company-blogs.ts scripts/enrich/fetch_company_blogs.ts lib/admin/pipelines/index.ts
git commit -m "feat(pipelines): company-blogs 抓取接进后台（CLI 与后台共用核心）"
```

---

### Task 12: youtube-captions 管线

**Files:**
- Create: `lib/pipelines/youtube-captions.ts`
- Create: `lib/admin/pipelines/content/youtube-captions.ts`
- Modify: `scripts/enrich/fetch_youtube_captions.ts`
- Modify: `lib/admin/pipelines/index.ts`

按 Task 11 同构 recipe。核心读 `scripts/enrich/fetch_youtube_captions.ts`（314 行，`main()` 在 line 116）。

- [ ] **Step 1:** 把 `main()` 核心循环搬进 `lib/pipelines/youtube-captions.ts` 的 `runYoutubeCaptions(opts, hooks)`（复用 Task 11 的 `PipelineRunHooks` 接口——从 `lib/pipelines/company-blogs.ts` export 它，或抽到 `lib/pipelines/hooks.ts` 共享。**采用后者**：新建 `lib/pipelines/hooks.ts` 导出 `PipelineRunHooks`，Task 11 的文件回填 import）。opts 从脚本 `parseOptions`（line 50）的字段映射。
- [ ] **Step 2:** 脚本 `main()` 改薄壳调 `runYoutubeCaptions`。
- [ ] **Step 3:** 注册 `kind: 'youtube_captions_fetch'`，label「YouTube 字幕抓取」，optionFields 暴露 `limit`（每次处理上限，控额度）等脚本支持的开关。
- [ ] **Step 4:** index.ts 解开 import。
- [ ] **Step 5:** `bunx tsc --noEmit` + CLI dry-run + 后台 dry-run。
- [ ] **Step 6:** Commit `feat(pipelines): youtube-captions 抓取接进后台`

> 若发现该脚本有 `.mjs` 子 worker（`build_youtube_caption_worker_bundle.mjs` 等），**不纳入 P0**——只接 `fetch_youtube_captions.ts` 主路径，worker bundle 留脚本态。

---

### Task 13: threads-link 管线

**Files:**
- Create: `lib/pipelines/threads-link.ts`
- Create: `lib/admin/pipelines/content/threads-link.ts`
- Modify: `scripts/threads/link_content_to_threads.ts`
- Modify: `lib/admin/pipelines/index.ts`

按 Task 11 recipe。核心读 `scripts/threads/link_content_to_threads.ts`（270 行，`main()` 在 line 126）。
- [ ] **Step 1:** `runThreadsLink(opts, hooks)` 搬核心（内容挂主题：字幕/博客关键词匹配主题页）。
- [ ] **Step 2:** 脚本 main() 改薄壳。
- [ ] **Step 3:** 注册 `kind: 'threads_content_link'`，label「内容挂载知识主题」，optionFields 按脚本入参（如 `--only <slug>` → `only` 文本字段）。
- [ ] **Step 4:** index.ts 解开 import。
- [ ] **Step 5:** tsc + CLI dry-run + 后台 dry-run。
- [ ] **Step 6:** Commit `feat(pipelines): threads 内容挂载接进后台`

---

### Task 14: openalex-papers 管线

**Files:**
- Create: `lib/pipelines/openalex-papers.ts`
- Create: `lib/admin/pipelines/content/openalex-papers.ts`
- Modify: `scripts/enrich/fetch_openalex_papers.ts`
- Modify: `lib/admin/pipelines/index.ts`

按 recipe。核心读 `scripts/enrich/fetch_openalex_papers.ts`（361 行，`main()` 在 line 208，`parseOptions` 同文件）。
- [ ] **Step 1:** `runOpenalexPapers(opts, hooks)` 搬核心。
- [ ] **Step 2:** 脚本 main() 改薄壳。
- [ ] **Step 3:** 注册 `kind: 'openalex_papers_fetch'`，label「论文刷新（OpenAlex）」，optionFields 按 `parseOptions` 字段。
- [ ] **Step 4:** index.ts 解开 import。
- [ ] **Step 5:** tsc + CLI dry-run + 后台 dry-run。
- [ ] **Step 6:** Commit `feat(pipelines): openalex 论文刷新接进后台`

---

### Task 15: courses 管线

**Files:**
- Create: `lib/pipelines/courses-enrich.ts`
- Create: `lib/admin/pipelines/content/courses.ts`
- Modify: `scripts/enrich/enrich_courses.ts`
- Modify: `lib/admin/pipelines/index.ts`

按 recipe。核心读 `scripts/enrich/enrich_courses.ts`（268 行，`main()` 在 line 179）。
- [ ] **Step 1:** `runCoursesEnrich(opts, hooks)` 搬核心。
- [ ] **Step 2:** 脚本 main() 改薄壳。
- [ ] **Step 3:** 注册 `kind: 'courses_enrich'`，label「课程富集」，optionFields 按脚本入参。
- [ ] **Step 4:** index.ts 解开 import。
- [ ] **Step 5:** tsc + CLI dry-run + 后台 dry-run。
- [ ] **Step 6:** Commit `feat(pipelines): courses 富集接进后台`

---

## Phase E — 数据源健康卡片（轻量只读）

### Task 16: datasource-health 聚合逻辑

**Files:**
- Create: `lib/admin/datasource-health.ts`
- Test: `scripts/test/datasource-health.test.ts`

**数据来源：** `MaintenanceJobLog`（按 jobId→job.kind 关联）。聚合：各 content kind 最近 N 个 job 的 完成/失败 数 + 日志里命中额度信号（正则 `/\b(402|403|429)\b|额度|限流|quota/i`）的条数。

- [ ] **Step 1: 写失败测试（纯聚合函数）**

```ts
// scripts/test/datasource-health.test.ts
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx tsx --test scripts/test/datasource-health.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写实现**

```ts
// lib/admin/datasource-health.ts
import { prisma } from '@/lib/db/prisma';

export interface JobRow { id: string; kind: string; status: string; }
export interface LogRow { jobId: string; level: string; message: string; }
export interface HealthRow { kind: string; completed: number; failed: number; running: number; quotaSignals: number; }

const QUOTA_RE = /\b(402|403|429)\b|额度|限流|quota/i;

/** 纯聚合：不连库，便于单测。 */
export function summarizeHealth(jobs: JobRow[], logs: LogRow[]): HealthRow[] {
  const byKind = new Map<string, HealthRow>();
  const jobKind = new Map(jobs.map(j => [j.id, j.kind]));
  for (const j of jobs) {
    const row = byKind.get(j.kind) ?? { kind: j.kind, completed: 0, failed: 0, running: 0, quotaSignals: 0 };
    if (j.status === 'completed') row.completed += 1;
    else if (j.status === 'failed') row.failed += 1;
    else if (j.status === 'running') row.running += 1;
    byKind.set(j.kind, row);
  }
  for (const l of logs) {
    if (!QUOTA_RE.test(l.message)) continue;
    const kind = jobKind.get(l.jobId);
    if (!kind) continue;
    const row = byKind.get(kind);
    if (row) row.quotaSignals += 1;
  }
  return [...byKind.values()];
}

/** 读最近 N 个 content job + 其日志，返回健康汇总。 */
export async function getDatasourceHealth(limit = 50): Promise<HealthRow[]> {
  const jobs = await prisma.maintenanceJob.findMany({
    orderBy: { createdAt: 'desc' }, take: limit,
    select: { id: true, kind: true, status: true },
  });
  const logs = await prisma.maintenanceJobLog.findMany({
    where: { jobId: { in: jobs.map(j => j.id) }, level: { in: ['warning', 'error'] } },
    select: { jobId: true, level: true, message: true },
  });
  return summarizeHealth(jobs, logs).filter(r => r.kind !== 'single_person_refresh'); // 可选：只留内容管线，按需调整
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx tsx --test scripts/test/datasource-health.test.ts`
Expected: PASS（2 tests）

- [ ] **Step 5: Commit**

```bash
git add lib/admin/datasource-health.ts scripts/test/datasource-health.test.ts
git commit -m "feat(admin): 数据源健康聚合逻辑 + 单测"
```

---

### Task 17: 健康卡片渲染进 /admin/maintenance

**Files:**
- Modify: `app/admin/maintenance/page.tsx`

- [ ] **Step 1: page.tsx 渲染只读卡片**

```tsx
import { getDatasourceHealth } from '@/lib/admin/datasource-health';
// 组件内：
const health = await getDatasourceHealth();
// JSX（放在维护任务列表上方或下方）：
<section className="rounded-lg border border-stone-200 bg-white p-4">
  <h2 className="text-sm font-semibold text-stone-950">数据源健康（最近 50 个任务）</h2>
  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
    {health.length === 0 ? <p className="text-xs text-stone-400">暂无任务记录</p> :
      health.map(r => (
        <div key={r.kind} className="rounded-md border border-stone-100 bg-stone-50 px-3 py-2 text-xs">
          <div className="font-medium text-stone-700">{r.kind}</div>
          <div className="mt-1 text-stone-500">完成 {r.completed} · 失败 {r.failed} · 运行中 {r.running}</div>
          {r.quotaSignals > 0 && <div className="mt-1 text-amber-600">⚠ 额度/限流信号 {r.quotaSignals}</div>}
        </div>
      ))}
  </div>
</section>
```

- [ ] **Step 2: 编译 + 冒烟**

Run: `bunx tsc --noEmit` 然后 `bun dev` 看 `/admin/maintenance` 出现健康卡片
Expected: 零错误，卡片渲染（有任务时显示统计）

- [ ] **Step 3: Commit**

```bash
git add app/admin/maintenance/page.tsx
git commit -m "feat(admin): /admin/maintenance 数据源健康只读卡片"
```

---

## Phase F — P0 总验收

### Task 18: 全量验收门

**Files:** 无

- [ ] **Step 1: 全量编译**

Run: `bunx tsc --noEmit`
Expected: 零错误

- [ ] **Step 2: 全量单测**

Run: `npx tsx --test scripts/test/pipeline-registry.test.ts scripts/test/pipeline-lifecycle.test.ts scripts/test/pipeline-validate.test.ts scripts/test/datasource-health.test.ts`
Expected: 全 PASS

- [ ] **Step 3: 5 条 CLI 脚本裸跑 dry-run**

```bash
npx tsx scripts/enrich/fetch_company_blogs.ts 2>&1 | tail -3
npx tsx scripts/enrich/fetch_youtube_captions.ts --help 2>&1 | tail -3   # 或 dry-run 入口
npx tsx scripts/threads/link_content_to_threads.ts 2>&1 | tail -3
npx tsx scripts/enrich/fetch_openalex_papers.ts 2>&1 | tail -3
npx tsx scripts/enrich/enrich_courses.ts 2>&1 | tail -3
```

Expected: 各脚本仍能裸跑（薄壳未破坏），dry-run 不烧额度

- [ ] **Step 4: 后台冒烟（dev server）**

`bun dev` → `/admin/maintenance`：
- person：建 single_person_refresh dry-run → completed，日志正常（回归）
- 每条 content pipeline：建 dry-run job → completed，进度/日志可见
- 数据源健康卡片显示统计

Expected: 全通过

- [ ] **Step 5: 收尾 commit**

```bash
git commit --allow-empty -m "test: P0 总验收通过——注册表通用化 + 5 管线上后台 + 健康卡片"
```

---

## Self-Review 结论

- **Spec 覆盖：** 注册表（Task 1-3）/ 执行器外壳 + person 搬迁（Task 4-7）/ jobs route + schedule + inngest（Task 6）/ UI 感知（Task 8-10）/ 5 管线抽核心共用（Task 11-15）/ 暂停=复用 cancel+schedule（设计第 3 点，无新代码）/ 数据源健康轻量版（Task 16-17）/ 验收门（Task 7、18）。P1/P2 不在本计划（设计末尾占位）。✓ 全覆盖。
- **占位扫描：** Task 11 给完整模板代码；Task 12-15 是同构 recipe，明确了文件/kind/label/line 锚点/optionFields 来源——执行时读对应脚本搬迁。非 "TODO/TBD"，是「按模板对另一文件重复」的具体指令。✓
- **类型一致：** `PipelineContext`/`MaintenancePipeline`/`PipelineRunHooks`/`ShellDeps`/`ContextDeps`/`HealthRow` 在定义任务与引用任务间签名一致；`PipelineRunHooks` 在 Task 12 抽到 `lib/pipelines/hooks.ts` 共享（已注明回填 Task 11 import）。✓
- **风险点：** Phase B 是唯一高风险（person 行为漂移），用 Task 7 回归门兜底，绿灯才进 Phase C。Phase D 各管线独立、互不阻塞，可单条回退。
