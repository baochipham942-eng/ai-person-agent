# 设计文档：管理员运维能力升级（P0 — 维护任务注册表通用化 + 内容管线上后台）

> 日期：2026-06-21
> 分支：`feat/admin-pipeline-registry`
> 状态：P0 设计已确认，待出实施计划

## 背景与问题

这几天产品面爆发式扩张，前台新增 6 个面向用户的内容域：知识主题 `/threads`、AI 公司目录 `/org`、作品 `/work`、课程 `/courses`、论文实体、公司官方博客抓取（`CompanySource`）。但 admin 后台仍停在「People + 账号」时代：

- **维护任务类型写死**：`lib/admin/maintenance.ts` 的 `runMaintenanceJob` 只认 4 种 person 任务（`new_person_build / single_person_refresh / multi_person_refresh / all_people_refresh`），`isMaintenanceKind` 在 **4 处**硬校验（run / retry / schedule scan + `app/api/admin/maintenance/jobs/route.ts`）。
- **质量复核全是 person 维度**：`lib/quality-review.ts` 问题类型只覆盖 `missing_profile / stale_profile / missing_relation_evidence / missing_activity_source / cards_missing_source`。
- **新内容管线 100% 脚本裸跑**：company-blogs / supadata captions / threads 深核 / papers / courses 全靠命令行手动跑，无 UI 触发、无定时、无质量监控、无审计留痕。这些恰恰是烧第三方额度（Exa/Jina/supadata，commit 里一堆 402/403/429 修复）、最易出错的管线。

**结论**：运维框架（队列/定时/审计/取消/重试）设计不错，但只长在 People 这一棵树上。把新管线「挂」到现有框架是性价比最高的升级。

## 分期策略（已确认）

P0 先行、独立上线独立验收 → P1 → P2。本文档详述 P0，P1/P2 见末尾占位节。

---

## P0 设计

### 目标

1. 把 `runMaintenanceJob` 从「写死 4 种 person 任务」改成「按管线注册表派生」，**4 种 person 任务行为零变化**。
2. 把 4 组烧额度/易出错的内容管线（company-blogs / supadata-captions / threads-deepcore / papers / courses）接进后台：可 UI 触发、可定时、可 dry-run、可取消重试、可看进度日志。
3. 给 admin 一张轻量只读「数据源健康」卡片（完整 API 计量表下沉 P1）。

### 架构：Pipeline Registry（管线注册表）

新增目录 `lib/admin/pipelines/`：

| 文件 | 职责 |
|------|------|
| `registry.ts` | `registerPipeline(p)` / `getPipeline(kind)` / `listPipelines()`；进程内单例注册表 |
| `context.ts` | `PipelineContext` — 封装当前 `runMaintenanceJob` 内联的横切关注点：`appendLog(level,msg,meta)` / `updateProgress(done,total)` / `checkCancellation(): Promise<boolean>` / `dryRun` / `options` 访问器 / `requestedById` |
| `types.ts` | `MaintenancePipeline` 接口定义 |
| `person.ts` | 把现有 4 种 person 任务从 `maintenance.ts` 抽出，注册成 4 条 pipeline（逻辑原样搬迁） |
| `content/*.ts` | 5 条内容管线的 pipeline 注册（薄封装，调 `lib/pipelines/<name>.ts` 核心函数） |
| `index.ts` | 汇总 import 并注册所有 pipeline；被 `maintenance.ts`、jobs route、UI 数据层引用 |

`MaintenancePipeline` 接口：

```ts
interface MaintenancePipeline {
  kind: string;                              // 任务类型标识，落 MaintenanceJob.kind
  label: string;                             // UI 中文标签
  category: 'person' | 'content';            // UI 分组
  optionFields?: PipelineOptionField[];      // 声明 UI 表单字段（驱动创建/定时表单）
  validate(input: ValidateInput): string | null;  // 返回错误文案或 null；jobs route 用它替代写死校验
  run(ctx: PipelineContext): Promise<void>;  // 执行体；通过 ctx 落日志/进度/取消
}
```

### 执行器瘦身

`runMaintenanceJob` 改成**通用生命周期外壳**，不再含任何 person 专属分支：

```
1. load job
2. pipeline = getPipeline(job.kind)；找不到 → 标记 failed 并记录
3. 抢占式置 running（updateMany + status 守卫，沿用现有 cancel 安全逻辑）
4. try { await pipeline.run(ctx) }
5. 收尾：若 ctx 已因取消提前结束（checkCancellation 命中）→ 状态已是 cancelled，外壳不覆盖；
   否则 run() 正常返回 → 外壳置 completed
6. catch → 置 failed + errorMessage + 审计日志
```

**生命周期状态（running/completed/failed/cancelled）由外壳独占**，pipeline.run() 只负责业务逻辑 + 通过 ctx 落进度/日志/查取消，**不自己写终态**（消除双写歧义）。这与现状的差异：现在 person 逻辑在 `runMaintenanceJob` 末尾自己置 completed，搬迁后改由外壳统一兜底——对外可见行为（最终状态、日志）不变。

person 的 dry-run 文案、进度更新、取消检查（`checkCancellation` 取代内联的 `finishIfCancellationRequested`）等逻辑**原样搬进 `person.ts`**，对外行为不变。`isMaintenanceKind`（run/retry/schedule scan/jobs route 共 4 处）全替换为 `getPipeline(kind) != null`。

### 内容管线：抽核心进 lib + CLI 共用

对 5 条脚本做同一套动作（脚本结构一致：`main()` + `process.argv`，180–360 行）：

```
scripts/enrich/fetch_company_blogs.ts
  ① 核心循环抽进 lib/pipelines/company-blogs.ts → export async function runCompanyBlogs(opts, ctx?)
  ② 脚本 main() 变薄壳：解析 argv → 调 runCompanyBlogs(opts)（CLI 照常可跑）
  ③ lib/admin/pipelines/content/company-blogs.ts 注册 pipeline：run(ctx) → runCompanyBlogs(ctx.options, ctx)
```

`ctx?` 可选：传了走后台（进度/日志/取消落库），不传是 CLI 裸跑。**幂等性现成**（脚本靠 urlHash/contentHash 去重），不额外造。

涉及脚本与目标 lib 模块：

| 脚本 | 抽出到 | 注册 kind |
|------|--------|-----------|
| `scripts/enrich/fetch_company_blogs.ts` | `lib/pipelines/company-blogs.ts` | `company_blogs_fetch` |
| `scripts/enrich/fetch_youtube_captions.ts` | `lib/pipelines/youtube-captions.ts` | `youtube_captions_fetch` |
| `scripts/threads/link_content_to_threads.ts` | `lib/pipelines/threads-link.ts` | `threads_content_link` |
| `scripts/enrich/fetch_openalex_papers.ts` | `lib/pipelines/openalex-papers.ts` | `openalex_papers_fetch` |
| `scripts/enrich/enrich_courses.ts` | `lib/pipelines/courses-enrich.ts` | `courses_enrich` |

> 注：threads「深核」是组合动作，P0 先接 `link_content_to_threads`（内容挂主题，烧抓取/匹配）这条最具运维价值的子管线；其余 threads 子步骤（candidate packs / specs）属内容编辑，留 P2 CMS。

### 暂停 / 额度可见性

- **暂停**：复用现有两套机制——`MaintenanceSchedule.enabled` toggle（停未来定时）+ job cancel（停正在跑的）。**不新造全局开关**（YAGNI）。
- **数据源健康卡片**（轻量只读，P0 范围）：新增 `lib/admin/datasource-health.ts`，从 `MaintenanceJobLog.metadata` 聚合各管线最近 N 次运行的 成功/失败/跳过 计数 + 脚本已打的 402/403/429 额度信号；`/admin/maintenance` 或 `/admin/operations` 渲染只读卡片。**完整 API 调用计量表（每次落账）下沉 P1**（已确认）。

### UI 改造（`/admin/maintenance`）

- `app/admin/maintenance/MaintenanceClient.tsx`：`kind` 下拉从写死 4 个 `<option>` 改成由 `listPipelines()` 派生、按 `category` 分组（人物维护 / 内容管线）。每条 pipeline 按 `optionFields` 渲染自己的表单字段（person 保留现有 QID/人物/媒体渠道；content 管线按需暴露 `limit` / `since` 等）。
- `MaintenanceScheduleClient.tsx`：定时规则表单同源改造。
- pipeline 元数据（kind/label/category/optionFields）通过 server component 或新增只读 API `GET /api/admin/maintenance/pipelines` 下发给客户端。

### API 校验

`app/api/admin/maintenance/jobs/route.ts` 的 POST：`isMaintenanceKind` → `getPipeline(kind)`；写死的 person 专属校验（QID 必填、人物必选等）迁移进各 pipeline 的 `validate()`，route 统一调 `pipeline.validate(input)`。

### 审计 / 幂等

- 审计：job 创建/取消已写 `UserAuditLog`（`createAndQueueMaintenanceJob` / `cancelMaintenanceJob`），新管线自动继承，无需额外做。
- 幂等：内容脚本本就靠 urlHash/contentHash 去重，搬迁后保持。

### 单元边界（isolation）

- `registry.ts` 纯内存映射，无 IO，可独立单测。
- `context.ts` 把「写库副作用」收口成一个接口，pipeline 逻辑可 mock ctx 单测。
- 每条 `lib/pipelines/*.ts` 暴露纯函数 `run<Name>(opts, ctx?)`，输入输出清晰、可独立理解。
- `runMaintenanceJob` 外壳只剩生命周期状态机，person/content 差异全下沉到 pipeline。

## 测试与验收

- **单元测试**（`node --test` / `tsx --test`，沿用 `scripts/test/*.test.ts` 先例）：
  - registry 注册/查找/重复注册/未知 kind
  - 生命周期外壳状态机：正常完成 / 抛错置 failed / 取消路径
  - 各 pipeline 的 `validate()` 边界
- **回归**：4 种 person 任务搬迁后，dry-run 行为与搬迁前一致（日志文案、进度计数）。
- **验收门**：
  1. `bunx tsc --noEmit` 零错误
  2. dev server（4001）每条新管线建一个 dry-run job，UI 能看到进度/日志
  3. 4 种 person 任务 dry-run 行为不变
  4. 5 条 CLI 脚本仍能命令行裸跑（薄壳未破坏）

## 风险与回退

| 风险 | 缓解 |
|------|------|
| person 任务搬迁引入行为漂移 | 先做地基 + person 搬迁 + 回归绿灯，再接新管线（分步可回退） |
| 内容脚本抽核心时改坏 CLI | 薄壳 `main()` 保留，CLI 裸跑纳入验收门 |
| 后台跑内容管线烧额度失控 | 默认 dry-run；content pipeline 暴露 `limit`；额度信号进健康卡片 |
| Inngest serverless 长任务超时 | 沿用现有 `concurrency:1` + 进度落库；大批量靠 `limit` 分批，不在 P0 引入并发 |

---

## P1 / P2 范围占位（不展开，保证三期衔接不丢线）

### P1 — 质量与审计跟上
- `lib/quality-review.ts` 问题类型从 person 字段扩展到新内容域：threads 假源/占位 URL 检测、company-blogs 抓取失败、papers 张冠李戴（grounding 校验）。
- 新管线写操作进 `UserAuditLog`，对齐 person 审计覆盖。
- **完整 API 调用计量表**（每次 Exa/Jina/supadata/DeepSeek 调用落账）+ 额度看板从 P0 轻量版升级为计量版。

### P2 — 内容 CMS（可缓）
- threads / work / courses / org 的轻量 CRUD 编辑界面（当前全靠 seed 脚本）。
- threads 其余子步骤（candidate packs / specs）纳入编辑界面。
- 适用场景：内容量再大、或要交给非技术运营时。现阶段脚本可接受，不急。
