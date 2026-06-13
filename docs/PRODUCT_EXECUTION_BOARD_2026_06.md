# AI 人物库产品力执行板

> 日期: 2026-06-13
> 关联规划: `docs/PRODUCT_GROWTH_PLAN_2026_06.md`
> 关联手册: `docs/OPERATIONS_LAUNCH_GATE.md`

这份执行板服务 4 件事:

1. 把竞品启发转成可排期任务。
2. 把产品机会绑定到当前代码入口。
3. 把每个任务的完成证据写清楚。
4. 避免上线前把 blocked / pending 状态误报成 ready。

## 1. 当前判断

产品已经从“人物资料库”推进到第一版“AI 人物情报台”闭环。本轮已经把上线前最容易误判的几个能力补成可回读证据:

1. 动态情报能在生产环境稳定生成、回填、订阅和回读。
2. 高访问人物的关系、动态、来源可信度经得起抽样复核。
3. Newsletter、影响力校准、质量治理和上线门禁都有真实证据链。

## 1.1 关键目标状态

| 目标 | 当前状态 | 证据 | 剩余边界 |
|---|---|---|---|
| 生产迁移与 ActivityEvent 回填 | Completed | `npm run ops:readiness` 返回 ready；`activity.total=555`、`recent30d=555`；生产 launch gate ready | 后续只按增量事件继续物化，不再重复首次回填 |
| Newsletter 生产配置与小流量试发 | Completed | Resend 配置 ready；`newsletter.sent=1`；`NEWSLETTER_SEND_ENABLED=false` 被识别为发送观察后的安全关闭 | 下一次真实发送仍需显式确认并临时打开发送开关 |
| 高访问人物质量复核应用 | Completed | high80 质量队列复查 `criticalPeople=0`、`highPeople=0`、`qaReviewRows=0`；生产 launch gate quality ready | medium 队列仍可继续治理，但不阻塞上线 ready |
| 动态卡重要性理由 | Completed | 生产 `/digest` 和 `/topic/Agent` 已展示“看点”；`/api/activity` 前 10 条均含 `importanceReason` | 后续用点击率和来源点击率验证表达质量 |
| 话题 / 机构内容密度补强 | Completed | PG-009 复查 `Ready: 20/20 (100%)`，`thinEntityCount=0`，`remediationCandidateCount=0` | 新增核心 topic / org 或提高门槛时重新生成补强队列 |
| 影响力校准人工流程 | Completed (audit-only by design) | `InfluenceScoreAuditLog` ready；`influence.audits=24`；latest audit `status=reviewed`、`appliedScore=null`；目标复查 dry-run `returned=24`、`largeGap=0`，replay `errors=0` | 批量改 `People.influenceScore` 不属于本轮默认验收，仍需另行确认权重口径和写分授权 |
| 关系图谱可信默认面 | Completed | `audit:relation-graph --fail-on-risk` 返回 risk=0；生产 `/graph` 和筛选 URL 均 200 | 杨植麟等薄关系人物后续可补证据，但不阻塞默认可信图谱 |
| 人物 PK 报告 MVP | Completed | 生产 `/compare?people=...` 和已完成报告详情页均展示 13 个工具；生产 UX 测试 15/15 通过 | 后续提升报告质量和更多模板，不阻塞 MVP 上线 |

## 2. 任务总览

| ID | 优先级 | 任务 | 状态 | 依赖 | 验收证据 |
|---|---|---|---|---|---|
| PG-001 | P0 | 生产迁移安全确认 | Verified safe | `DATABASE_URL`、`DIRECT_URL` | `npm run ops:migration-plan` 输出 `safeToApply=true` |
| PG-002 | P0 | 生产迁移执行 | Completed | PG-001、显式生产确认 | `prisma migrate deploy` 成功，pending migrations 清零 |
| PG-003 | P0 | ActivityEvent 首次生产回填 | Completed | PG-002 | 近 30 天事件数、来源覆盖率、事件类型分布 |
| PG-004 | P0 | 严格生产 readiness 回读 | Completed | PG-005、PG-006、production deploy | production launch gate `gateStatus=ready`、readiness ready、responsive 18/18、quality 0 critical / 0 high |
| PG-005 | P0 | Newsletter 生产配置核验 | Completed | Resend domain、sender、API key、站点 URL | newsletter preflight 通过，production redeploy 完成，readiness ready |
| PG-006 | P0 | Newsletter 小流量真实试发 | Completed | PG-005、显式发送确认 | sent / failed / unsubscribe 可回读，`newsletter.sent=1` |
| PG-007 | P0 | 高访问人物质量复核首批应用 | Completed | 人工决策文件、显式执行确认 | 84 条 high queue 决策已写库；复跑 quality 后 highPeople=0，production launch gate ready |
| PG-008 | P1 | 动态卡重要性理由 | Completed | ActivityEvent 生产数据稳定 | 生产 `/digest`、`/topic/Agent` 和 `/api/activity` 证明动态卡显示“看点” |
| PG-009 | P1 | 话题和机构内容密度补强 | Completed | 动态和质量队列 | `audit:entity-density` 复查 ready 20/20，remediationQueue 清零 |
| PG-010 | P1 | 影响力校准人工流程 | Completed | 改分需另行确认 | dry-run、audit 写入、readiness 回读、目标复查 replay 无错误；默认不改主分 |
| PG-011 | P2 | 图谱交互增强 | Completed | 关系证据覆盖率达标 | risk=0、证据覆盖 100%、低置信默认曝光 0，生产 `/graph` 筛选 URL 200 |
| PG-012 | P1 | 计划缺口补齐: topic/org API、产业/新晋排序、关系变化动态 | Completed | PG-003 | build、UX、生产核心路由 200、响应式 18/18 |
| PG-013 | P1 | 人物 PK 报告 agent 工具链和 readiness | Completed | CompareReport 迁移、Inngest | 13 个工具、13 个生成步骤、completed 报告、readiness 和 production launch gate ready 证据 |

状态口径:

1. `Ready to run`: 代码和命令已具备，可以在合适环境执行。
2. `Waiting approval`: 会写生产数据或触发真实发送，需要爸明确确认。
3. `Waiting migration`: 数据表未上线前不能真实完成。
4. `Pending env`: 依赖生产密钥、域名、供应商或外部配置。
5. `Planned`: 产品方向明确，等待前置任务完成。
6. `Implemented locally`: 代码已落地，仍需要生产数据或线上证据完成验收。
7. `Audit ready`: 已有只读审计证据入口，内容补强本身仍待执行。
8. `Review pack ready`: 首批复核包和 dry-run 证据已生成，等待人工编辑决策文件和显式执行确认。
9. `Verified safe`: 已刷新当前只读证据，下一步会写生产或依赖外部配置。
10. `Guarded locally`: 脚本护栏和小样本验证已落地，真实生产执行仍受迁移、环境或显式确认限制。
11. `Batch ready`: 第一批候选包和 small batch 已整理完，等待人工补强或受控入库执行。
12. `Completed`: 生产动作已经执行，并通过只读回读确认。
13. `First batch complete`: 首批生产写入完成，后续可按 cursor 分段继续。
14. `Suggested decisions ready`: 已生成建议决策和 dry-run 结果，等待人工确认是否执行。
15. `Pending env + audit`: 基础数据链路已通，仍缺发送环境或审计观察。
16. `Pending newsletter env`: 除 Newsletter 发送环境和真实发送观察外，其他生产 readiness 已 ready。
17. `Partial applied`: 已按人工确认应用部分安全决策，剩余复核项继续保留。
18. `Audit written`: 审计日志已写入；是否改业务主表需要另行确认。
19. `Local preflight passed`: 本机环境和只读预检已通过，仍未代表部署环境或真实发送完成。
20. `Waiting send confirm + switch`: 真实发送前还需要显式发送授权，并把 `NEWSLETTER_SEND_ENABLED` 从 `false` 改为 `true`。
21. `Pending newsletter send observation`: 基础链路 ready，但还没有真实 sent delivery log。
22. `Send preflight passed locally`: 本机配置、Resend 域名和发送模式只读预检已通过；仍未代表部署环境同步或真实发送完成。
23. `Waiting subscriber + send confirm`: 真实发送还需要至少一个订阅邮箱、发送授权和临时打开发送开关。
24. `First test send completed`: 已完成 1 个测试邮箱真实发送，并写入 sent delivery log。
25. `Pending send switch by design`: 真实发送观察 ready，但 `NEWSLETTER_SEND_ENABLED=false` 是发完后恢复的安全状态。
26. `Env synced to Vercel`: Vercel production env 已写入；是否已被线上 deployment 读取取决于下一次 production redeploy。
27. `Live env redeployed`: 已对现有 Vercel production deployment 执行安全 redeploy，未从本机脏工作区上传新包。
28. `Local gate evidence passed`: 本地代码、接口、核心页面响应式和只读门禁证据已通过；仍不等于生产严格 ready。
29. `Production smoke passed`: 功能已发布到生产，核心 URL 和生产响应式 smoke 已通过；仍可能有质量队列 pending。
30. `Production gate evidence passed`: 功能链路已进入生产门禁证据；如果总门禁 pending，原因需单独列明。
31. `Production gate pending on quality`: 生产 readiness 和响应式已通过，门禁只因质量复核队列 high 保持 pending。
32. `Full high80 dry-run ready`: 当前 high quality queue 的全量建议决策和 dry-run 已通过，等待显式生产写入确认。

## 2.1 本轮增量记录

时间: 2026-06-13

本轮把规划里仍缺的几个基础能力往前推进:

1. 新增 `GET /api/topic/[slug]` 和 `GET /api/org/[slug]`，复用话题页和机构页的数据聚合函数，接口可供搜索、订阅、外部消费和后续客户端增量加载复用。
2. 首页榜单新增 `产业影响力` 和 `新晋上升` 两个排序入口；`industryImpact` 先按履历关系数量、综合影响力和近期访问排序，`risingScore` 先按近 7 天访问、入库时间和综合影响力排序。
3. `ActivityEvent` 补 `reviewStatus` 字段和迁移，默认动态只发布 `auto`、`confirmed`、`trusted` 且置信度不低于 0.7 的事件。
4. 动态层新增 `relation_change` 类型，并从 `trusted/confirmed` 且有证据 URL 或证据说明的 `PersonRelation` 生成关系变化事件；CLI 回填脚本和 Inngest 物化任务也同步支持关系事件。
5. 人物 PK 报告 agent 工具链从 `审查`、`报告` 两个标签扩展为 13 个工具: 选人、资料、指标、动态、关系、搜索、证据、观点、对齐、审查、报告、校验、保存。
6. 异步 PK 报告生成步骤同步扩展到 13 步，每条 `CompareReportEvent` 写入 `metadata.toolKey`，最终 `sourceSnapshot` 写入完整工具目录。
7. Operations readiness 新增 `CompareReport` / `CompareReportEvent` schema 检查和报告生成观察，`/admin/operations` 页面新增 CompareReport 卡片。
8. Operations readiness 将 Newsletter 基础发送配置和真实发送开关拆开: `sendConfigReady=true` 代表 provider、key、sender、站点 URL、token secret 齐全；`readyToSend=false` 仍代表当前不会真实发送。
9. 当 `sendConfigReady=true` 且已有 `newsletter.sent>0` 时，`NEWSLETTER_SEND_ENABLED=false` 被视为发完后的安全关闭，不再让上线 readiness 保持 pending。
10. 生产 URL 分批 smoke 曾发现旧 production deployment 未包含这批页面代码；经爸明确批准后，已执行 production deploy 并重新跑生产门禁，当前新路由不再 404。

本地验证:

1. `npm run build` 通过。
2. `GET /api/topic/Agent` 返回 200，包含 12 个 Top 人物、8 条动态、8 个作品，coverage 为 ready。
3. `GET /api/org/OpenAI` 返回 200，包含 12 个相关人物、8 个当前履历人物、8 个 alumni，coverage 为 ready。
4. `GET /api/person/directory?sortBy=industryImpact&limit=3` 和 `sortBy=risingScore&limit=3` 均返回 200。
5. `GET /api/activity?limit=10&days=365` 返回 200，默认事件 `reviewStatus=auto`，低置信事件数为 0。
6. `PERSON_UX_BASE_URL=http://127.0.0.1:4001 node --test scripts/test/person-directory-detail-ux.test.mjs` 通过 15/15。
7. `npm run qa:responsive -- --base-url=http://127.0.0.1:4001 --no-screenshots --json-only --timeout-ms=30000` 通过 18/18，覆盖首页、topic、org、digest、graph、watchlist、compare、admin quality、admin operations 的桌面和移动端。
8. `npm run ops:readiness` 返回 `overallStatus=ready`，`CompareReport` schema ready，`CompareReportEvent.metadata` ready，`compareReport.total=1`、`completed=1`。
9. `PERSON_UX_BASE_URL=http://127.0.0.1:4002 node --test scripts/test/person-directory-detail-ux.test.mjs` 通过 15/15，包含 `newsletterEnv.sendConfigReady` 断言。
10. `npm run ops:launch-gate -- --base-url=http://127.0.0.1:4002 --no-screenshots --output=/tmp/ai-person-launch-gate-readiness-ready.json` 返回 `passForExit=true`、`readiness=ready`、`responsive=18/18`，质量队列 `0 critical / 7 high`。
11. `npm run ops:production-launch-gate -- --skip-responsive --no-screenshots --output=/tmp/ai-person-production-launch-gate-readiness-ready-skip-responsive.json` 返回 `passForExit=true`、`readiness=ready`，但跳过了 production responsive。
12. 目录、周报和图谱公共头像出口统一过滤远程头像，只暴露本地 `/avatars/*.webp`，避免 Next Image 400 和第三方图片依赖。
13. 经爸确认可生产部署后，2026-06-13 执行 Vercel production deploy，最终最新 deployment 为 `dpl_CtGWxfZfzMjKBn3LZwf9g11fFoH5`，URL 为 `https://ai-person-agent-iee3i4b60-leolins-projects-0fe43c0f.vercel.app`，inspector 为 `https://vercel.com/leolins-projects-0fe43c0f/ai-person-agent/CtGWxfZfzMjKBn3LZwf9g11fFoH5`。
14. 生产域名 `https://people.llmxy.xyz` 回读: `/`、`/topic/Agent`、`/org/OpenAI`、`/digest`、`/graph`、`/watchlist`、`/compare`、`/admin/quality`、`/admin/operations`、`/api/admin/operations/readiness` 均返回 200。
15. 修复 `/org/OpenAI` 生产移动视口 hydration mismatch: `CompareButton` 延迟到 hydration 后读取本地对比状态；中文日期格式化统一 `Asia/Shanghai`；`qa:responsive` 增加 hydration settle 和完整 runtime exception 输出。
16. `npm run ops:production-launch-gate -- --no-screenshots --output=/tmp/ai-person-production-launch-gate-after-hydration-fix.json` 返回退出码 0、`passForExit=true`、readiness ready、responsive 18/18；总 `gateStatus=pending` 仅因 quality queue 为 `0 critical / 7 high`。
17. 2026-06-13 经爸明确批准后，执行 `/tmp/ai-person-quality-decisions-current-high80-full-suggested.json` 的 84 条生产质量决策，输出 `/tmp/ai-person-quality-apply-current-high80-full-execute.json`: `applied=84`、`noop=0`、`skipped=0`、`errors=0`。
18. 复跑 `npm run audit:quality-review -- --limit=80 --max-people=80 --batch-size=10 --severity=high --format=json --summary-output=/tmp/ai-person-quality-summary-current-high80-post-full-apply.json`，结果为 `queuedPeople=0`、`criticalPeople=0`、`highPeople=0`、`qaReviewRows=0`。
19. 复跑 `npm run ops:production-launch-gate -- --no-screenshots --output=/tmp/ai-person-production-launch-gate-after-quality-full-apply.json`，返回 `gateStatus=ready`、`passForExit=true`、readiness ready、quality `0 critical / 0 high`、responsive `18/18`。
20. 最终目标验收复跑 `npm run ops:production-launch-gate -- --no-screenshots --output=/tmp/ai-person-production-launch-gate-final-goal-audit.json`，仍返回 `gateStatus=ready`、`passForExit=true`、readiness ready、quality `0 critical / 0 high`、responsive `18/18`。

## 3. P0 执行切片

### PG-001: 生产迁移安全确认

目标:

在任何生产写入前，证明待执行 migrations 没有破坏性 SQL。

代码入口:

1. `scripts/ops/migration_plan.mjs`
2. `scripts/ops/production_rollout.mjs`
3. `prisma/migrations/*/migration.sql`

执行命令:

```bash
npm run ops:migration-plan -- --output=/tmp/ai-person-migration-plan.json
```

完成标准:

1. `safeToApply=true`
2. `destructiveCount=0`
3. `reviewCount=0`
4. pending migration 列表和 `prisma migrate status` 一致

本地证据:

1. 2026-06-13 运行 `npm run ops:migration-plan -- --output=/tmp/ai-person-migration-plan.json`。
2. 当前 `migrationStatus.status=pending`，Prisma 识别 5 个迁移目录，其中 4 个 pending。
3. pending migrations: `20260613090000_activity_event`、`20260613093000_newsletter_delivery_log`、`20260613102000_influence_score_audit`、`20260613112000_newsletter_delivery_provider`。
4. `safeToApply=true`，`destructiveCount=0`，`reviewCount=0`，共 23 条 SQL statement。
5. 操作构成: create table 3、create unique index 1、create index 14、add foreign key 4、add columns 1。

### PG-002: 生产迁移执行

目标:

把 `ActivityEvent`、`NewsletterDeliveryLog`、`InfluenceScoreAuditLog` 和 newsletter provider 字段真正应用到生产数据库。

执行命令:

```bash
PRODUCTION_BASE_URL=https://people.example.com \
npm run ops:production-rollout -- \
  --confirm-production \
  --execute-migrations \
  --activity-limit=500 \
  --activity-batch-size=100 \
  --require-launch-gate \
  --evidence-only-launch-gate
```

完成标准:

1. rollout report 中 `migration-deploy.status=completed`
2. `pendingMigrations=[]`
3. readiness 中三张关键表不再是 blocked
4. launch gate 仍可保留 blocked，但原因不能再是 schema 未迁移

当前 dry-run 证据:

1. 2026-06-13 运行 `npm run ops:production-rollout -- --output=/tmp/ai-person-production-rollout-dry-run.json`。
2. `mode=dry_run`，`confirmedProduction=false`，`passForExit=true`，没有执行 migration、ActivityEvent 回填、newsletter 记录/发送或影响力审计写入。
3. `assessment.pendingMigrations` 仍为 4 个，`migrationPlanSafeToApply=true`。
4. dry-run next action 为 `npm run ops:production-rollout -- --confirm-production --execute-migrations`。
5. `activity-materialize` dry-run 默认最多扫描 500 条、按 100 条一批读取，并在 report 中输出 `nextCursor`，说明迁移后可以分段完成首次 ActivityEvent 回填。

生产执行证据:

1. 2026-06-13 经爸授权，直接运行 `npx prisma migrate deploy --schema=prisma/schema.prisma`。
2. 已应用 `20260613090000_activity_event`、`20260613093000_newsletter_delivery_log`、`20260613102000_influence_score_audit`、`20260613112000_newsletter_delivery_provider`。
3. 回读 `npx prisma migrate status --schema=prisma/schema.prisma` 返回 `Database schema is up to date!`。
4. `/tmp/ai-person-migration-plan-after-authorized.json` 显示 `pendingMigrations=[]`，三张关键表 readiness 均为 ready。

### PG-003: ActivityEvent 首次生产回填

目标:

让动态流从 fallback 进入持久化事件模式。

执行命令:

```bash
PRODUCTION_BASE_URL=https://people.example.com \
npm run ops:production-rollout -- \
  --confirm-production \
  --execute-activity-backfill \
  --activity-limit=500 \
  --activity-batch-size=100 \
  --require-launch-gate \
  --evidence-only-launch-gate
```

继续下一段时复用上一份 rollout report 里的 `steps[].data.nextCursor`:

```bash
PRODUCTION_BASE_URL=https://people.example.com \
npm run ops:production-rollout -- \
  --confirm-production \
  --execute-activity-backfill \
  --activity-limit=500 \
  --activity-batch-size=100 \
  --activity-cursor=<previous-nextCursor> \
  --require-launch-gate \
  --evidence-only-launch-gate
```

完成标准:

1. 近 30 天 `ActivityEvent` 数量大于 0
2. 默认动态流来源覆盖率为 100%
3. 事件类型至少覆盖 paper、github、video、article 中的 2 类
4. 首页、人物页、topic/org 页动态模块无生产异常

生产首批证据:

1. 2026-06-13 经爸授权，先 dry-run `node scripts/activity/materialize_activity_events.mjs --limit=500 --batch-size=100`。
2. dry-run 结果: `scanned=500`，`materializable=500`，`nextCursor=edf24e41-4280-4795-84d6-e849c90e0cf3`。
3. 生产首批写入运行 `node scripts/activity/materialize_activity_events.mjs --limit=500 --batch-size=100 --execute`。
4. 写入结果: `scanned=500`，`materializable=500`，`upserted=500`。
5. 回读 readiness: `activity.total=500`，`recent30d=500`，`activity-backfill=ready`。
6. 事件类型分布: article 443、video 22、github 20、podcast 15。
7. 首批写入耗时较长，原因是脚本逐条 upsert；下一段仍可用同一 cursor 小批跑，但建议后续优化为小 transaction chunk。

第二批证据:

1. 2026-06-13 经爸授权，从 cursor `edf24e41-4280-4795-84d6-e849c90e0cf3` 继续。
2. dry-run 结果: `scanned=27`，`materializable=27`，`nextCursor=fe239bb2-5be5-4dbd-812d-998b1b665481`。
3. 执行结果: `upserted=27`。
4. 回读 readiness: `activity.total=527`，`recent30d=527`，`activity-backfill=ready`。
5. 事件类型分布: article 467、video 23、github 21、podcast 16。
6. 因第二批不足 500 条，当前 90 天窗口内可物化事件已经跑到末尾。
7. 2026-06-13 当前只读回读 `npm run ops:readiness` 显示 `activity.total=555`、`recent30d=555`，且 `ActivityEvent.reviewStatus` 字段 ready。

### PG-004: 严格生产 readiness 回读

目标:

把生产状态从 blocked / pending 推进到可解释的发布证据。

执行命令:

```bash
PRODUCTION_BASE_URL=https://people.example.com \
npm run ops:production-launch-gate
```

完成标准:

1. 严格模式返回 0
2. `gateStatus=ready`
3. 响应式 smoke 无横向溢出、console error、关键文字缺失
4. 证据文件和截图目录可归档

当前证据:

1. 2026-06-13 运行 `npm run ops:migration-plan -- --output=/tmp/ai-person-migration-plan-review-status.json`，7 个迁移已识别，`pendingMigrations=[]`，`safeToApply=true`。
2. 2026-06-13 运行 `npm run ops:readiness`，`overallStatus=ready`；schema 全部 ready，`ActivityEvent.reviewStatus` 字段 ready，`CompareReportEvent.metadata` 字段 ready。
3. 当前回读: `activity.total=555`、`recent30d=555`、`newsletter.sent=1`、`influence.audits=24`、`compareReport.total=1`、`compareReport.completed=1`。
4. Newsletter 环境拆成两个口径: `sendConfigReady=true` 表示 provider、key、from email、site URL、token secret 已齐；`readyToSend=false` 表示当前安全开关关闭，不会真实发送。
5. `newsletter-env` 检查现在在 `sendConfigReady=true` 且 `newsletter.sent>0` 时返回 ready，detail 为 `NEWSLETTER_SEND_ENABLED=false is a safety switch after sent observation`。
6. 2026-06-13 运行 `npm run ops:launch-gate -- --base-url=http://127.0.0.1:4002 --no-screenshots --output=/tmp/ai-person-launch-gate-readiness-ready.json`。
7. 本地 launch gate 返回 `gateStatus=pending`、`passForExit=true`；readiness 为 ready，quality 为 `0 critical / 7 high`，responsive 为 `18/18`。
8. 2026-06-13 运行 `npm run ops:production-launch-gate -- --skip-responsive --no-screenshots --output=/tmp/ai-person-production-launch-gate-readiness-ready-skip-responsive.json`，返回 `gateStatus=pending`、`passForExit=true`；readiness ready，quality 仍为 `0 critical / 7 high`。
9. 经爸明确批准后，2026-06-13 执行 Vercel production deploy，最新 production deployment 为 `dpl_CtGWxfZfzMjKBn3LZwf9g11fFoH5`，URL 为 `https://ai-person-agent-iee3i4b60-leolins-projects-0fe43c0f.vercel.app`，已 aliased 到 `https://ai-person-agent.vercel.app`。
10. 生产域名 `https://people.llmxy.xyz` 回读: `/`、`/topic/Agent`、`/org/OpenAI`、`/digest`、`/graph`、`/watchlist`、`/compare`、`/admin/quality`、`/admin/operations`、`/api/admin/operations/readiness` 均返回 200。
11. 生产 `/org/OpenAI` 单页响应式复测通过 2/2，桌面和移动均无 console error、无横向溢出，标题为 `OpenAI AI 关键人物 | AI 人物库`，h1 为 `OpenAI AI 关键人物`。
12. 生产全量门禁 `npm run ops:production-launch-gate -- --no-screenshots --output=/tmp/ai-person-production-launch-gate-after-hydration-fix.json` 返回退出码 0、`passForExit=true`；readiness 为 ready，responsive 为 `18/18`。
13. 经爸明确批准后，执行 `/tmp/ai-person-quality-decisions-current-high80-full-suggested.json` 的 84 条质量决策，输出 `/tmp/ai-person-quality-apply-current-high80-full-execute.json`: `applied=84`、`skipped=0`、`errors=0`。
14. 复跑 high80 质量队列，输出 `/tmp/ai-person-quality-summary-current-high80-post-full-apply.json`: `queuedPeople=0`、`criticalPeople=0`、`highPeople=0`、`qaReviewRows=0`。
15. 生产全量门禁 `npm run ops:production-launch-gate -- --no-screenshots --output=/tmp/ai-person-production-launch-gate-after-quality-full-apply.json` 返回退出码 0，`gateStatus=ready`、`passForExit=true`；readiness 为 ready，quality 为 `0 critical / 0 high`，responsive 为 `18/18`。
16. 2026-06-13 最终目标验收复查 `npm run ops:production-launch-gate -- --no-screenshots --output=/tmp/ai-person-production-launch-gate-final-goal-audit.json` 仍返回 `gateStatus=ready`、`passForExit=true`；readiness ready，quality 为 `0 critical / 0 high`，responsive 为 `18/18`。
17. 六大目标最终复查时，Neon pooler 两次短抖动分别让 readiness / quality 子命令报 `P1001`；`scripts/ops/launch_gate.mjs` 已增加只针对 `P1001` / `Can't reach database server` 的最多 3 次短重试。随后运行 `npm run ops:production-launch-gate -- --no-screenshots --output=/tmp/ai-person-production-launch-gate-six-goals-final-recheck-3.json`，返回 `gateStatus=ready`、`passForExit=true`；readiness ready，quality `0 critical / 0 high`，responsive `18/18`。

### PG-005 / PG-006: Newsletter 生产配置与小流量试发

目标:

证明订阅功能不只会生成 dry-run，也能真实发送、失败可观察、用户可退订。

准备项:

1. `NEWSLETTER_EMAIL_PROVIDER=resend`
2. `RESEND_API_KEY`
3. `NEWSLETTER_FROM_EMAIL`
4. `NEWSLETTER_SEND_ENABLED=true`
5. `PRODUCTION_BASE_URL`
6. `NEWSLETTER_TOKEN_SECRET`

本地只读核验:

```bash
npm run newsletter:weekly -- --preflight --limit=5 --event-limit=8
npm run newsletter:weekly -- --limit=5 --event-limit=8
```

生产发送预检，不发送邮件:

```bash
npm run newsletter:weekly -- \
  --preflight \
  --send \
  --confirm-newsletter-send \
  --limit=5 \
  --event-limit=8
```

小流量试发命令，必须等爸确认后再跑:

```bash
npm run ops:production-rollout -- \
  --confirm-production \
  --send-newsletter \
  --confirm-newsletter-send \
  --newsletter-limit=5 \
  --newsletter-event-limit=8 \
  --require-launch-gate \
  --evidence-only-launch-gate
```

当前安全护栏:

1. Newsletter 脚本默认 `limit=5`、`event-limit=8`，传更大值会被压回小流量上限。
2. `--send` 必须带 `--confirm-newsletter-send`；通过 production rollout 调用时也必须由父命令显式携带确认。
3. 真实 `--send` 会在读取订阅和调用 provider 前自动执行同一套 preflight；任一检查失败都会退出。
4. `--preflight` 只读检查 delivery log schema、站点 URL、token secret、provider、send enabled、Resend key 和 sender。
5. 退订链接优先使用 `PRODUCTION_BASE_URL`，再回退到公开站点 URL。

当前配置证据:

1. 迁移后 `NewsletterDeliveryLog` 和 provider columns 已 ready。
2. 本机 `.env.local` 已写入 `PRODUCTION_BASE_URL=https://people.llmxy.xyz`、`NEWSLETTER_EMAIL_PROVIDER=resend`、Resend API key、`NEWSLETTER_FROM_EMAIL=AI 人物库 <newsletter@llmxy.xyz>`、`NEWSLETTER_REPLY_TO=newsletter@llmxy.xyz` 和 `NEWSLETTER_TOKEN_SECRET`。
3. `NEWSLETTER_SEND_ENABLED=false` 仍保持关闭，避免误发真实邮件。
4. `scripts/newsletter/build_weekly_digest_email.mjs` 已加载 `.env` 和 `.env.local`，本机直接运行 preflight 不再需要临时传 URL。
5. 2026-06-13 本机验证: `node --check scripts/newsletter/build_weekly_digest_email.mjs` 通过。
6. 2026-06-13 本机验证: `npm run newsletter:weekly -- --preflight --limit=5 --event-limit=8` 通过。
7. 2026-06-13 本机验证: `npm run newsletter:weekly -- --limit=5 --event-limit=8` 通过，`subscriptions=0`、`generated=0`，没有写 delivery log，没有发送邮件。
8. 2026-06-13 Resend API 只读查询确认 `llmxy.xyz` 状态为 `verified`。
9. 2026-06-13 临时传 `NEWSLETTER_SEND_ENABLED=true` 跑发送模式 preflight，通过 `npm run newsletter:weekly -- --preflight --send --confirm-newsletter-send --limit=5 --event-limit=8`；因为带 `--preflight`，没有发送邮件、没有写 log。
10. 2026-06-13 经爸授权，写入测试订阅 `317054513@qq.com`，frequency 为 `weekly`。
11. 2026-06-13 经爸授权，临时传 `NEWSLETTER_SEND_ENABLED=true` 跑真实小流量发送: `generated=1`、`sent=1`、`failed=0`、`provider=resend`。
12. 回读 `NewsletterDeliveryLog` 最新记录: `status=sent`、`provider=resend`、`attempts=1`，provider message id 已存在。
13. Vercel production env 已同步到项目 `ai-person-agent`: `PRODUCTION_BASE_URL`、`NEWSLETTER_EMAIL_PROVIDER`、`NEWSLETTER_SEND_ENABLED=false`、`RESEND_API_KEY`、`NEWSLETTER_FROM_EMAIL`、`NEWSLETTER_REPLY_TO`、`NEWSLETTER_TOKEN_SECRET` 均存在且为 encrypted。
14. 2026-06-13 对现有 production deployment `ai-person-agent-jrgozvmj6-leolins-projects-0fe43c0f.vercel.app` 执行 Vercel `redeploy --target production`，新 deployment 为 `ai-person-agent-f4dk8c1x2-leolins-projects-0fe43c0f.vercel.app`，meta 显示 `action=redeploy`、`originalDeploymentId=dpl_2nSxHLtfJLzU23GHhjoUkwuVEsSj`。
15. 本次未从当前脏工作区直接触发 production deploy；线上 production alias 已切换到 redeploy 结果。
16. 线上 smoke check: `https://people.llmxy.xyz/` 返回 200，`/api/person/directory?limit=3` 返回 `total=252`。
17. 下一批真发送仍需要确认收件范围，并临时打开 `NEWSLETTER_SEND_ENABLED=true`。

完成标准:

1. `NewsletterDeliveryLog` 记录 sent / failed / dry_run
2. provider messageId 可回读
3. failed 有失败原因
4. unsubscribe token 能完成退订
5. 后台 newsletter 监控页展示 provider 分布和失败率

### PG-007: 高访问人物质量复核首批应用

目标:

先把最容易被用户看到的人物做成可信样板。

准备命令:

```bash
npm run audit:quality-review -- \
  --limit=20 \
  --batch-size=10 \
  --relation-row-limit=600 \
  --activity-row-limit=600 \
  --qa-row-limit=200 \
  --summary-output=/tmp/ai-person-quality-summary.json \
  --decision-template=/tmp/ai-person-quality-decisions.json \
  --review-pack-output=/tmp/ai-person-quality-review-pack.json
```

人工决策回放 dry-run:

```bash
npm run audit:quality-apply -- \
  --file=/tmp/ai-person-quality-decisions.json \
  --limit=20 \
  --batch-size=10 \
  --summary-output=/tmp/ai-person-quality-apply-summary.json
```

应用命令，需显式确认:

```bash
npm run audit:quality-apply -- \
  --file=/tmp/ai-person-quality-decisions.json \
  --limit=20 \
  --batch-size=10 \
  --summary-output=/tmp/ai-person-quality-apply-summary.json \
  --execute
```

分批续跑:

```bash
npm run audit:quality-review -- \
  --limit=20 \
  --batch-size=10 \
  --relation-row-limit=600 \
  --activity-row-limit=600 \
  --qa-row-limit=200 \
  --resume-offset=<上次 summary.scan.nextResumeOffset> \
  --summary-output=/tmp/ai-person-quality-summary-next.json \
  --decision-template=/tmp/ai-person-quality-decisions-next.json \
  --review-pack-output=/tmp/ai-person-quality-review-pack-next.json

npm run audit:quality-apply -- \
  --file=/tmp/ai-person-quality-decisions.json \
  --limit=20 \
  --batch-size=10 \
  --resume-offset=<上次 apply summary.nextResumeOffset> \
  --summary-output=/tmp/ai-person-quality-apply-summary-next.json
```

本地证据:

1. 2026-06-13 本地队列扫描 80 人，57 人入队，58 个问题。
2. critical=0，high=8，主要问题为 `qa_review_backlog` 50 人 294 条。
3. 首批 review pack 覆盖 20 人，生成 60 条可编辑决策样本。
4. 默认模板 dry-run 前 20 条为 noop，skipped=0，errors=0，确认不会误写数据。
5. 队列和 apply dry-run 均支持 `--limit`、`--batch-size`、`--resume-offset`、`--summary-output`；summary 记录 `nextResumeOffset`、批次数、错误数和可归档结果。
6. 队列阶段支持 `--relation-row-limit`、`--activity-row-limit`、`--qa-row-limit`，默认每批最多读取 600 条关系、600 条近期动态和 200 条 QA backlog。
7. apply 阶段默认仍是 dry-run，只有显式 `--execute` 才写入；单条决策异常会进入 `results[].status=error`，不会中断后续决策检查。

2026-06-13 最新 20 人建议决策:

1. 运行 `npm run audit:quality-review -- --limit=20 --batch-size=10 --relation-row-limit=600 --activity-row-limit=600 --qa-row-limit=200`。
2. 输出 `/tmp/ai-person-quality-summary-latest20.json`、`/tmp/ai-person-quality-decisions-latest20.json`、`/tmp/ai-person-quality-review-pack-latest20.json`。
3. 本批扫描 30 人、队列 26 人、输出前 20 人，`critical=0`、`high=3`。
4. 主要问题为 `qa_review_backlog` 25 人 126 条，另有 `thin_recent_activity` 2 人。
5. 建议决策文件为 `/tmp/ai-person-quality-decisions-suggested-latest20.json`，策略为稳定来源建议 `keep`、社媒/泛新闻/低质量来源继续 `review`。
6. 建议决策统计: `keep=8`、`review=50`、总计 58 条。
7. dry-run 回放 `/tmp/ai-person-quality-apply-suggested-latest20.json` 通过: `dryRun=58`、`applied=0`、`skipped=0`、`errors=0`。
8. 2026-06-13 经爸授权，只应用 8 条 `keep` 建议，生成 `/tmp/ai-person-quality-decisions-keep-only-latest20.json`。
9. 执行结果 `/tmp/ai-person-quality-apply-keep-only-latest20.json`: `applied=8`、`skipped=0`、`errors=0`。
10. 50 条继续 `review` 的决策未执行，保留原有详细 review reason，避免用泛化建议覆盖人工备注。
11. 应用后复跑同口径 review pack，输出 `/tmp/ai-person-quality-summary-post-keep-apply.json`。
12. 回读结果: `critical=0`、`high=2`，`qaReviewRows=118`，高优先级从 3 降到 2，QA review backlog 从 126 降到 118。

2026-06-13 二次建议决策:

1. 生成 `docs/QUALITY_REVIEW_SECOND_PASS_2026_06_13.md`、`/tmp/ai-person-quality-decisions-second-pass-suggested.json` 和 dry-run 结果。
2. 建议总数 56 条: `keep=12`、`reject=24`、`review=20`。
3. 高优先级人物仍集中在 Elon Musk 和杰夫·迪恩；Richard Socher、黄仁勋、Andrej Karpathy、Sam Altman、李飞飞、Dario Amodei、Ilya Sutskever 有较多 reject 建议。
4. 原 `/tmp` 建议文件被临时目录清理后，按同一口径重新生成当前 56 条 review decisions。
5. 经爸授权，只保留 `keep + reject` 形成 `/tmp/ai-person-quality-decisions-second-pass-keep-reject.json`，共 36 条: `keep=12`、`reject=24`，20 条 `review` 未写入执行文件。
6. dry-run `/tmp/ai-person-quality-apply-second-pass-keep-reject-dry-run.json` 通过: `dryRun=36`、`skipped=0`、`errors=0`。
7. 执行 `/tmp/ai-person-quality-apply-second-pass-keep-reject-execute.json`: `applied=36`、`skipped=0`、`errors=0`。
8. 应用后复跑同口径 review pack，输出 `/tmp/ai-person-quality-summary-post-second-pass-keep-reject.json`。
9. 回读结果: `critical=0`、`high=2`、`qaReviewRows=82`，QA review backlog 从 118 降到 82。

2026-06-13 三次建议决策:

1. 生成 `docs/QUALITY_REVIEW_THIRD_PASS_2026_06_13.md`、`/tmp/ai-person-quality-review-pack-third-pass-high80.json`、`/tmp/ai-person-quality-decisions-third-pass-high80-template.json`。
2. 本次按 launch gate 口径扫描: `--limit=80 --max-people=80 --batch-size=10 --severity=high`，覆盖 80 个高访问人物。
3. 当前 high 队列: `critical=0`、`high=7`、`qaReviewRows=84`，全部来自 `qa_review_backlog`。
4. high 人物为 Elon Musk、杰夫·迪恩、Chris Olah、亚历克·拉德福德、阿希什·瓦斯瓦尼、Hyung Won Chung、Daniela Amodei。
5. 建议决策文件 `/tmp/ai-person-quality-decisions-third-pass-high80-suggested.json` 共 21 条: `reject=18`、`keep=3`、`review=0`。
6. dry-run `/tmp/ai-person-quality-apply-third-pass-high80-dry-run.json` 通过: `dryRun=21`、`applied=0`、`skipped=0`、`errors=0`。
7. 本轮没有执行 `--execute`，因此数据库未写入，quality queue 数字不会下降；应用这批建议仍需要显式确认。

2026-06-13 全量 high80 建议决策:

1. 刷新当前门禁口径队列，输出 `/tmp/ai-person-quality-summary-current-high80.json`、`/tmp/ai-person-quality-decisions-current-high80-template.json`、`/tmp/ai-person-quality-review-pack-current-high80.json`。
2. 当前 high queue 仍为 `critical=0`、`high=7`、`qaReviewRows=84`，全部来自 `qa_review_backlog`；relation、activity、card source coverage 均为 100%。
3. 额外导出 84 条全量 review rows 到 `/tmp/ai-person-quality-current-high80-all-review-rows.json`，避免只处理队列样本。
4. 生成 `docs/QUALITY_REVIEW_FULL_HIGH80_2026_06_13.md` 和 `/tmp/ai-person-quality-decisions-current-high80-full-suggested.json`。
5. 全量建议共 84 条: `keep=18`、`reject=66`、`review=0`，覆盖 Elon Musk、杰夫·迪恩、Chris Olah、亚历克·拉德福德、阿希什·瓦斯瓦尼、Hyung Won Chung、Daniela Amodei。
6. dry-run `/tmp/ai-person-quality-apply-current-high80-full-dry-run.json` 通过: `dryRun=84`、`applied=0`、`noop=0`、`skipped=0`、`errors=0`。
7. 经爸明确批准后，执行写库命令，输出 `/tmp/ai-person-quality-apply-current-high80-full-execute.json`。
8. 执行结果: `mode=execute`、`processedDecisions=84`、`applied=84`、`noop=0`、`skipped=0`、`errors=0`、`completed=true`。
9. 复跑 high80 审计，输出 `/tmp/ai-person-quality-summary-current-high80-post-full-apply.json`: `queuedPeople=0`、`criticalPeople=0`、`highPeople=0`、`qaReviewRows=0`。
10. 复跑生产门禁，输出 `/tmp/ai-person-production-launch-gate-after-quality-full-apply.json`: `gateStatus=ready`、`passForExit=true`、readiness ready、quality `0 critical / 0 high`、responsive `18/18`。

完成标准:

1. critical 问题清零
2. high 问题下降
3. confirmed 关系证据覆盖率提升
4. 动态无来源事件不进入默认流
5. review pack、决策文件和 apply log 可归档

## 4. P1 产品增强

### PG-008: 动态卡重要性理由

竞品启发:

Semantic Scholar 和 HF Papers 的价值不只在“新”，还在于告诉用户为什么值得看。

当前入口:

1. `components/home/ActivityFeed.tsx`
2. `components/person/sections/RecentActivity.tsx`
3. `lib/activity.ts`

建议改动:

1. 为事件增加 `importanceReason` 或前端派生解释。
2. paper 事件解释引用、作者、话题或来源。
3. github 事件解释 stars、repo 类型或人物关系。
4. article / video 事件解释来源和人物相关性。

验收:

1. 默认动态卡能看到一句“为什么现在值得看”。
2. 无足够证据时显示来源和时间，不编造重要性。
3. 质量复核队列能发现薄动态。

本地实现:

1. `lib/activity.ts` 统一派生 `importanceReason`，持久化事件优先使用 `evidenceNote`。
2. RawPool fallback 按 paper、github、video、podcast、role_change、article 生成保守看点说明。
3. `components/activity/ActivityEventList.tsx` 统一展示“看点”，覆盖首页、人物页、话题页、机构页和关注页。

2026-06-13 生产复查:

1. 生产 `/digest` 返回 200，HTML 中出现 12 处“看点”。
2. 生产 `/topic/Agent` 返回 200，HTML 中出现 8 处“看点”。
3. 生产 `/api/activity?limit=10&days=365` 返回 200，前 10 条事件均包含 `importanceReason`，`reviewStatus=auto`，`confidence>=0.78`。
4. 本轮源码回读确认 `components/activity/ActivityEventList.tsx` 和 `app/digest/page.tsx` 都展示“看点”，`lib/activity.ts` 支持 `relation_change` 和 `evidenceNote` 优先解释。

### PG-009: 话题和机构内容密度补强

竞品启发:

The Org、HF Papers、Semantic Scholar 都说明垂直入口必须有足够内容密度，空列表会破坏产品心智。

当前入口:

1. `app/topic/[slug]/page.tsx`
2. `app/org/[slug]/page.tsx`
3. `lib/entity-pages.ts`
4. `scripts/audit/entity_density_audit.mjs`

建议门槛:

1. 核心 topic 至少 10 个相关人物、10 条动态、5 个代表作品。
2. 核心 org 至少 5 个当前/历史人物、5 条动态、清晰机构简介。
3. 内容不足时降级为策展说明和推荐相关 topic / org。

验收:

1. 10 个核心 topic 和 10 个核心 org 达标。
2. 页面首屏不只是列表。
3. URL 可分享，移动端无横向溢出。

审计命令:

```bash
npm run audit:entity-density -- --output=/tmp/ai-person-entity-density.json
```

补强队列:

```bash
npm run audit:entity-density -- \
  --output=/tmp/ai-person-entity-density.json \
  --remediation-output=/tmp/ai-person-entity-remediation.json \
  --top=8 \
  --batch-size=3 \
  --sample-limit=2
```

按缺口类型拆下一批:

```bash
npm run audit:entity-density -- \
  --output=/tmp/ai-person-entity-density-people.json \
  --remediation-output=/tmp/ai-person-entity-remediation-people.json \
  --top=8 \
  --batch-missing=people \
  --batch-size=3 \
  --sample-limit=1 \
  --source-row-limit=40
```

当前审计口径:

1. topic 默认要求至少 10 个相关人物、10 条近 365 天动态、5 个代表论文或项目。
2. org 默认要求至少 5 个相关人物、5 条近 365 天动态、5 个代表论文或项目。
3. 输出每个 topic / org 的 source mix、work mix、top people、sample activity 和 sample works。
4. `--fail-on-thin` 可用于把薄入口变成 CI 或发布前阻断项。
5. `--top=N` 是 `--remediation-limit=N` 的短参数，用来只输出前 N 个补强候选。
6. `--batch-missing=people|activity|works|all` 可按缺口类型拆批，`--batch-size=N` 控制下一批执行清单大小。
7. `--sample-limit=N` 控制每个入口输出的 sample activity / works 数量，`--source-row-limit=N` 控制单入口候选源查询上限；默认仍只审计核心 10 个 topic 和 10 个 org。
8. `remediationQueue` 会把 thin 入口按缺口强度稳定排序，并生成补人物、补动态、补代表论文或项目的下一步动作。
9. `remediationBatches` 会按缺口类型拆成 people / activity / works 三组；同一个入口如果同时缺多项，会进入多个缺口组，`nextBatchExecutionList` 会按队列排序去重后生成下一批可直接执行的清单。

页面实现:

1. `lib/entity-pages.ts` 为 topic/org 页面计算 `coverage`，包含人物、动态、代表作品的实际覆盖量、目标门槛和缺口。
2. `components/entity/EntityPageBlocks.tsx` 新增 `CoveragePanel`，达标显示“达标”，薄入口显示“补强中”和缺口指标。
3. `/topic/[slug]` 和 `/org/[slug]` 的 header 统计改用覆盖总量，不再只显示当前 UI 展示条数。

2026-06-13 本地审计快照:

1. 受限核心 20 入口审计中 10 个 ready，10 个 thin，ready rate 为 50%；验证命令使用 `--top=8 --batch-size=5 --sample-limit=1 --source-row-limit=40`，输出到 `/tmp`。
2. topic 已达标: 大语言模型、Scaling、高效训练、Transformer、自监督学习、推理、代码生成。
3. org 已达标: OpenAI、Anthropic、DeepMind。
4. 人物数不足: RAG、开发者工具/AI Coding、xAI、Mistral、Perplexity、Hugging Face、DeepSeek、Kimi。
5. 动态不足: 开发者工具/AI Coding、Perplexity、Hugging Face、DeepSeek。
6. 代表作品不足: Agent、RAG、开发者工具/AI Coding、xAI、Cohere、Perplexity、Hugging Face、DeepSeek、Kimi。
7. 下一批最该补: 开发者工具/AI Coding、DeepSeek、Hugging Face、Kimi、Perplexity；这 5 个会进入 `nextBatchExecutionList`。
8. `remediationQueue` 当前前 8 个为 开发者工具/AI Coding、DeepSeek、Hugging Face、Kimi、Perplexity、RAG、Cohere、Mistral；每个入口都有 targetDelta、sourceTypes、验收口径和 search brief。
9. 2026-06-13 批处理护栏已补: 默认候选源单入口上限降到 80，支持 `--top`、`--batch-missing`、`--batch-size`、`--sample-limit`、`--source-row-limit`；补强 JSON 会额外输出 `remediationBatches` 和 `nextBatchExecutionList`。

2026-06-13 第一批候选包:

1. 入口文档: `docs/CONTENT_DENSITY_BATCH_2026_06_13_PG009_FIRST.md`。
2. 只读复跑命令使用 `--top=8 --batch-size=5 --sample-limit=1 --source-row-limit=40`，输出 `/tmp/ai-person-entity-density-pg009-first-batch.json` 和 `/tmp/ai-person-entity-remediation-pg009-first-batch.json`。
3. `scripts/audit/entity_density_audit.mjs` 的 remediation JSON 现在额外输出 `candidatePackages`，把 `nextBatchExecutionList` 拆成 `people`、`activity`、`works` 三组 small batch。
4. 最小目标: 开发者工具/AI Coding 补 8 人、9 条动态、4 个作品；DeepSeek 补 3 人、5 条动态、5 个作品；Hugging Face 补 2 人、5 条动态、5 个作品；Kimi 补 4 人、5 个作品；Perplexity 补 1 人、4 条动态、4 个作品。
5. 执行顺序: 先 people，再 activity，最后 works；本批只整理候选和证据包，不直接写数据库。
6. People 候选包已生成: `docs/CONTENT_DENSITY_PEOPLE_CANDIDATES_2026_06_13.md`。
7. 本批候选共 18 人，覆盖 AI Coding +8、DeepSeek +3、Hugging Face +2、Kimi +4、Perplexity +1。
8. 仍需人工复核的来源集中在 Cursor/Anysphere 团队来源、Windsurf Douglas Chen、Kimi 英文名与当前角色、Perplexity Dmitry Shevelenko 官方团队证据。
9. Activity + Works 候选包已生成: `docs/CONTENT_DENSITY_ACTIVITY_WORKS_CANDIDATES_2026_06_13.md`。
10. 本批候选共 46 条: Activity 23 条、Works 23 条，覆盖开发者工具/AI Coding、DeepSeek、Hugging Face、Kimi、Perplexity。
11. 本批只做资料包和人工复核线索，不写数据库；Perplexity 官方页、DeepSeek V3 系列 tag、Kimi K2 arXiv 状态和部分产品 blog slug 仍需人工或浏览器复核。

2026-06-13 收敛复查:

1. 运行 `node scripts/fix/apply_pg009_content_density_batch.mjs --stage=all`，dry-run 返回 `people.inserted=0`、`people.updated=0`、`rolesChanged=0`、`rawInserted=0`、`auditInserted=0`、`cardsInserted=0`、`missingPeople=0`，说明 PG-009 seeds / sources 当前已被消费，不需要重复写入。
2. 复跑 `npm run audit:entity-density -- --top=8 --batch-size=5 --sample-limit=1 --source-row-limit=40 --output=/tmp/ai-person-entity-density-pg009-recheck.json --remediation-output=/tmp/ai-person-entity-remediation-pg009-recheck.json`。
3. 审计结果: `Ready: 20/20 (100%)`，`thinEntityCount=0`，`remediationCandidateCount=0`，`nextBatchCount=0`。
4. 原第一批 5 个薄入口已达标: 开发者工具/AI Coding `people=10 activity=22 works=14`，DeepSeek `people=5 activity=7 works=6`，Hugging Face `people=6 activity=12 works=8`，Kimi `people=5 activity=40 works=6`，Perplexity `people=5 activity=5 works=5`。
5. 本项当前按核心 10 个 topic + 10 个 org 的密度门槛可标记完成；后续只在新增核心 topic / org 或提高门槛时重新生成 remediation queue。
6. 质量门禁清理后再次复跑同口径审计，输出 `/tmp/ai-person-entity-density-current-after-quality-ready.json` 和 `/tmp/ai-person-entity-remediation-current-after-quality-ready.json`。
7. 当前复查结果仍为 `Ready: 20/20 (100%)`、`readyRate=1`、`thinEntityCount=0`、`remediationCandidateCount=0`、`nextBatchCount=0`。

### PG-010: 影响力校准人工流程

竞品启发:

榜单有入口价值，但黑箱分数会损害信任。需要像 Semantic Scholar 区分引用和影响力引用那样解释口径。

当前入口:

1. `lib/influence-scoring.ts`
2. `lib/influence-scoring-config.json`
3. `app/admin/influence/page.tsx`
4. `scripts/influence/calibrate_scores.mjs`

决策模板:

```bash
npm run influence:calibrate -- \
  --limit=24 \
  --batch-size=8 \
  --status=review \
  --decision-template=/tmp/ai-person-influence-decisions.json \
  --summary-output=/tmp/ai-person-influence-calibration-summary.json
```

决策回放:

```bash
npm run influence:calibrate -- \
  --decisions=/tmp/ai-person-influence-decisions.json \
  --limit=24 \
  --batch-size=8 \
  --summary-output=/tmp/ai-person-influence-replay-summary.json
```

写审计日志:

```bash
npm run influence:calibrate -- \
  --decisions=/tmp/ai-person-influence-decisions.json \
  --limit=24 \
  --batch-size=8 \
  --execute \
  --reviewer=<name> \
  --summary-output=/tmp/ai-person-influence-audit-summary.json
```

应用分数需要额外确认:

```bash
npm run influence:calibrate -- \
  --decisions=/tmp/ai-person-influence-decisions.json \
  --limit=24 \
  --batch-size=8 \
  --execute \
  --apply-score \
  --reviewer=<name> \
  --summary-output=/tmp/ai-person-influence-apply-summary.json
```

验收:

1. 每个候选展示存量分、版本预估分、差异原因。
2. 审计日志记录权重版本和人工状态。
3. 默认不批量改线上 `People.influenceScore`。
4. 决策模板支持 `reviewed`、`ignored`、`applied` 三种人工动作。
5. 决策回放默认 dry-run；只有 `--execute` 写审计，只有再加 `--apply-score` 才改分。
6. 生产执行默认 `--limit<=24`、`--batch-size<=8`；需要续跑时使用上一次 summary 里的 `nextResumeAfterPersonId` 传给 `--resume-after-person-id`。
7. `--summary-output` 必须写到 `/tmp`，保存候选数、差异分布、批量大小、resume 标记和决策 replay 结果。

2026-06-13 建议决策:

1. 运行 `npm run influence:calibrate -- --limit=24 --batch-size=8 --status=review`。
2. 输出 `/tmp/ai-person-influence-decisions-latest24.json` 和 `/tmp/ai-person-influence-summary-latest24.json`。
3. 本批扫描 72 人，返回 24 个 review 候选，`largeGap=0`。
4. 建议文件 `/tmp/ai-person-influence-decisions-suggested-latest24.json` 全部标为 `reviewed`，reviewer 为 `Aix`。
5. 建议策略: 本轮先只写审计，不改 `People.influenceScore`；应用分数留到人工确认权重口径后再做。
6. dry-run replay `/tmp/ai-person-influence-replay-suggested-latest24.json` 通过: `dryRun=24`、`auditWritten=0`、`applied=0`、`skipped=0`、`errors=0`。
7. 2026-06-13 经爸授权，运行 `npm run influence:calibrate -- --decisions=/tmp/ai-person-influence-decisions-suggested-latest24.json --limit=24 --batch-size=8 --execute --reviewer=Aix`。
8. 执行结果 `/tmp/ai-person-influence-audit-suggested-latest24.json`: `auditWritten=24`、`applied=0`、`skipped=0`、`errors=0`。
9. 回读 readiness: `influence.audits=24`，latest audit `status=reviewed`，`appliedScore=null`。

2026-06-13 当前复查:

1. 复跑只读模板命令，输出 `/tmp/ai-person-influence-decisions-current-after-quality-ready.json` 和 `/tmp/ai-person-influence-summary-current-after-quality-ready.json`。
2. 结果为 `mode=dry_run`、`scanned=72`、`returned=24`、`largeGap=0`、`review=24`。
3. 本轮没有传入 `--execute` 或 `--apply-score`，因此没有新增审计写入，也没有改 `People.influenceScore`。
4. 生产 readiness 仍显示 `InfluenceScoreAuditLog` ready、`influence.audits=24`；改分继续作为另行授权动作处理。
5. 目标收口复查再次运行只读模板命令，输出 `/tmp/ai-person-influence-decisions-goal-recheck.json` 和 `/tmp/ai-person-influence-calibration-goal-recheck.json`。
6. 当前复查结果为 `mode=dry_run`、`scanned=72`、`returned=24`、`largeGap=0`、`review=24`、`aligned=0`，没有发现高差异异常。
7. 使用同一模板执行决策回放 dry-run，输出 `/tmp/ai-person-influence-replay-goal-recheck.json`。
8. 回放结果为 `decisions=24`、`dryRun=24`、`auditWritten=0`、`applied=0`、`skipped=0`、`errors=0`，证明当前人工决策链路可回放且默认不写库。
9. 复跑 `npm run ops:readiness` 返回 `overallStatus=ready`，其中 `influence-audit-schema=ready`、`influence-audit-observation=ready`，detail 为 `24 calibration audit rows`。
10. 直接回读 `InfluenceScoreAuditLog`: `total=24`，`status=reviewed` 共 24 条，`appliedScore` 非空为 0；latest audit reviewer 为 `Aix`，`scoreVersion=influence-score-v2026-06-13`。这说明第六项目标完成的是可解释、可审计的人工校准流程，批量改主分仍保持受控边界。

### PG-011: 图谱交互增强

竞品启发:

The Org、AMiner 和天眼查类产品证明，关系入口的核心价值不是“画一张复杂图”，而是让用户能顺着可信关系继续查人，并能判断每条边是否可靠。

当前入口:

1. `components/person/sections/RelatedPeople.tsx`
2. `components/person/sections/RelationshipGraphExplorer.tsx`
3. `lib/relation-graph.ts`
4. `lib/global-relationship-graph.ts`
5. `app/graph/page.tsx`
6. `scripts/audit/relation_graph_audit.mjs`

本地实现:

1. 人物页关系从简单网格升级为一跳关系图，支持按导师、学生、联创、同事、合作者等类型过滤。
2. 人物页新增二跳关系探索，只读取已确认关系，并展示路径置信度和证据边数量。
3. `/graph` 全局关系图谱支持按话题、机构、关系类型筛选，默认排除 `needs_review`。
4. 默认关系曝光增加 `confidence >= 0.75` 门槛，低置信 trusted/confirmed 关系进入折叠复核区，不混入默认可信图谱。
5. 关系图谱审计脚本可量化默认关系证据覆盖、低置信默认曝光、低置信排除量和待核关系 backlog。
6. 全局图谱侧栏新增关键连接点和可追踪关系，优先展示证据边、路径置信度和高连接人物。
7. `fetchGlobalRelationshipGraph` 增加 8 秒超时和 degraded 空态，数据库连接抖动时页面保持 200，不直接暴露 Next 错误页。

审计命令:

```bash
npm run audit:relation-graph -- --output=/tmp/ai-person-relation-graph.json
```

严格门禁:

```bash
npm run audit:relation-graph -- --fail-on-risk
```

验收:

1. 默认关系图谱中 `lowConfidenceDefaultExposure=0`。
2. 默认可信关系证据覆盖率达到 95% 以上。
3. `needs_review` 和低置信关系不出现在默认关系图谱，只进入折叠复核区或质量队列。
4. `/graph` 可分享，并能按 topic、organization、relationType 过滤。
5. `/graph` 在数据库慢查询或短暂连接异常时返回 degraded 空态，不返回 500。
6. 关系证据覆盖达标后，再考虑更强的可视化交互，不提前做视觉复杂化。

2026-06-13 本地审计快照:

1. `npm run audit:relation-graph -- --limit=10 --fail-on-risk` 返回 0。
2. 高访问 10 人中 9 个 ready，1 个 thin，risk 为 0。
3. 默认可见关系 100 条，证据覆盖 100%，缺证据 0。
4. `lowConfidenceDefaultExposure=0`，`needsReview=0`。
5. 薄入口为杨植麟，原因是默认可见可信关系为 0，后续应补关系证据或保持图谱空态。
6. `npm run build` 返回 0，`/graph` 保持动态渲染，`/topic/[slug]` 和 `/org/[slug]` 不再参与构建期数据库预渲染。
7. 本地生产服务验证: `/graph` 200 约 5.36s，`/graph?topic=大语言模型` 200 约 4.57s，`/topic/大语言模型` 200 约 4.03s，`/org/OpenAI` 200 约 4.26s。
8. HTML 输出包含 `关键连接点` 和 `可追踪关系`，topic 图谱未误触发 degraded 空态。
9. 本轮 in-app browser 控制通道返回 `Transport closed`，视觉浏览器验收未完成；HTTP 和服务端日志已证明页面不再 500。

2026-06-13 当前复查:

1. 复跑 `npm run audit:relation-graph -- --limit=10 --fail-on-risk --output=/tmp/ai-person-relation-graph-current-after-quality-ready.json`，命令返回 0。
2. 审计结果: `audited=10`、`ready=9`、`thin=1`、`risk=0`。
3. 默认可见关系 100 条，证据覆盖 100%，缺证据 0。
4. `lowConfidenceDefaultExposure=0`、`lowConfidenceTrustedExcluded=0`、`needsReview=0`。
5. 生产 `/graph`、`/graph?topic=大语言模型`、`/graph?organization=OpenAI`、`/graph?relationType=colleague` 均返回 200，HTML 包含 `关键连接点` 和 `可追踪关系`，没有进入 degraded 空态。

### PG-013: 人物 PK 报告 agent 工具链和 readiness

目标:

把人物对比从字段并排升级为可保存、可审查、可分享的 PK 报告，并让上线门禁知道这条链路是否真的可用。

当前入口:

1. `lib/compare-report.ts`
2. `lib/compare-report-agent.ts`
3. `components/compare/CompareReportLauncher.tsx`
4. `app/compare/page.tsx`
5. `app/compare/reports/[id]/page.tsx`
6. `app/api/compare/reports/*`
7. `lib/operations-readiness.ts`
8. `scripts/ops/readiness.mjs`

本地实现:

1. `COMPARE_AGENT_TOOLS` 当前包含 13 个工具: 选人、资料、指标、动态、关系、搜索、证据、观点、对齐、审查、报告、校验、保存。
2. 异步生成链路 `COMPARE_REPORT_STEPS` 当前包含 13 个步骤，新增指标、关系、动态三个显式阶段。
3. 每条 `CompareReportEvent` 写入 `metadata.toolKey`，可以从进度事件回读工具身份。
4. `sourceSnapshot` 保存完整工具目录、证据数、搜索来源和 per-person 覆盖情况。
5. 生成弹窗、静态 `/compare` 工作台和 `/compare/reports/[id]` 详情页都会展示工具链。
6. Operations readiness 新增 `CompareReport` / `CompareReportEvent` schema 检查，要求 `CompareReportEvent.metadata` 字段存在。
7. Operations readiness 新增报告观察数据: total、completed、running、pending、failed 和 latestCreatedAt。
8. `tsconfig.json` 排除 `/exports`，避免外部导出产物里的 TypeScript 文件阻断 Next build。

本地验证:

1. `npx tsc --noEmit` 通过。
2. `node --check scripts/ops/readiness.mjs` 通过。
3. `npm run build` 通过。
4. `npm run ops:readiness` 显示 `compareReport.status=ready`、`eventMetadataColumn=true`、`total=1`、`completed=1`。
5. `PERSON_UX_BASE_URL=http://127.0.0.1:4001 node --test scripts/test/person-directory-detail-ux.test.mjs` 通过 15/15，其中包含 PK 工具链和 CompareReport readiness 断言。
6. `npm run qa:responsive -- --base-url=http://127.0.0.1:4001 --no-screenshots --json-only --timeout-ms=30000` 通过 18/18。
7. `npm run ops:launch-gate -- --base-url=http://127.0.0.1:4001 --no-screenshots --allow-blocked-readiness --output=/tmp/ai-person-launch-gate-compare-tools.json` 返回 `passForExit=true`，readiness 中 CompareReport schema 和 observation 均 ready。

剩余边界:

1. Compare / topic / org / admin 页面代码已发布到 production，生产 smoke 不再 404。
2. 生产 launch gate 已返回 `passForExit=true`，CompareReport schema 和 completed observation 都在 readiness 证据内。
3. 84 条 high queue 质量决策已写库，生产 launch gate 已返回 `gateStatus=ready`；PK 报告 MVP 不再被全局质量门禁挡住。

2026-06-13 生产复查:

1. `npm run ops:readiness` 返回 `overallStatus=ready`，`compareReport.total=1`、`completed=1`、`failed=0`，`CompareReportEvent.metadata` 字段 ready。
2. 生产 `/compare?people=<id1>,<id2>` 返回 200，HTML 包含 13 个 agent 工具标签: 选人、资料、指标、动态、关系、搜索、证据、观点、对齐、审查、报告、校验、保存。
3. 生产 `/api/compare/reports?limit=5` 返回 completed 报告，最新报告为 `Dario Amodei vs Sam Altman 人物 PK 报告`。
4. 生产 `/compare/reports/cmqc52h3n0001y0g6vygkta5s` 返回 200，HTML 包含 `Agent 工具链` 和完整 13 个工具标签。
5. `PERSON_UX_BASE_URL=https://people.llmxy.xyz node --test scripts/test/person-directory-detail-ux.test.mjs` 通过 15/15，其中包含 `compare report agent exposes the full MVP toolchain`。

### 横向稳定性: 媒体缩略图和构建链路

触发原因:

in-app browser 验证人物页时，Next Image 服务端优化 YouTube 缩略图会报 `upstream image ... resolved to private ip`。同时 `next/font/google` 会让 build 依赖 Google Fonts 外网请求，弱网或受限网络下会直接阻断构建。

本地修复:

1. `app/layout.tsx` 去掉 `next/font/google`，改用系统字体栈。
2. `app/globals.css` 明确中文优先的 sans / mono 字体变量。
3. `components/person/sections/VideoSection.tsx`、`CourseSection.tsx`、`ContentTabs.tsx` 的第三方媒体缩略图增加 `unoptimized`，保留占位和 `onError` 兜底。
4. `app/topic/[slug]/page.tsx` 和 `app/org/[slug]/page.tsx` 改为动态渲染，避免构建期批量 DB 查询因 TLS 抖动中断 build。
5. 本地 `dev` 脚本切到 `next dev --webpack -p 4001`，绕开 Turbopack 在当前目录结构下向父目录解析 `tailwindcss` 的问题。
6. `next.config.ts` 固定 `outputFileTracingRoot` 和 `turbopack.root` 为项目根目录，减少独立部署和 dev root 推断漂移。

验证:

1. `npm run build` 已通过，不再请求 Google Fonts。
2. `npm run lint` 和 `npx tsc --noEmit` 已通过。
3. in-app browser 打开 Andrej Karpathy 人物页，桌面和移动端都无横向溢出。
4. YouTube 缩略图直接使用 `https://i.ytimg.com/...`，不再走 `/_next/image`，服务端不再打印 upstream image 警告。
5. 2026-06-13 复跑 `npm run build`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` 均返回 0。

## 5. 决策边界

1. 任何生产写入都必须显式确认。
2. Newsletter 真实发送必须同时具备发送开关和二次确认。
3. 影响力分数批量应用必须先有审计日志和人工复核。
4. 低置信关系不能默认曝光为可信关系。
5. 没有 URL 或证据说明的动态不能进入默认动态流。
6. 竞品能力只作为产品启发，不能绕开数据授权和来源约束。

## 6. 每周复盘格式

每周复盘只看 6 个问题:

1. 本周新增多少有来源动态。
2. 多少高访问人物完成质量复核。
3. readiness / launch gate 是否进入 ready。
4. Newsletter 是否完成真实发送和退订回读。
5. 影响力校准是否有审计和人工结论。
6. 用户高意图动作是否增长: 来源点击、关注、比较、关系点击、周报访问。
