# 上线门禁运行手册

这份手册只管一件事：上线前或周期巡检时，用同一条命令证明网站的核心产品路径、数据 readiness 和质量复核状态。

## 本地证据包

本地或迁移前排查时，可以允许 readiness 保持 blocked，但命令返回 0，方便把当前状态归档：

```bash
npm run ops:launch-gate -- \
  --base-url=http://127.0.0.1:4001 \
  --output=/tmp/ai-person-launch-gate.json \
  --allow-blocked-readiness
```

证据包会包含三块：

1. `ops:readiness`：迁移、回填、newsletter 环境和影响力校准观察。
2. `audit:quality-review`：critical/high 队列和问题分布。
3. `qa:responsive`：核心路径桌面/移动端 smoke 与截图目录。

## 生产周期门禁

生产巡检使用 `ops:production-launch-gate`。它默认拒绝 localhost，避免把本地 URL 当生产证据。

```bash
PRODUCTION_BASE_URL=https://people.example.com \
npm run ops:production-launch-gate
```

默认输出目录是 `/tmp/ai-person-launch-gate-evidence`，每次会生成：

1. `launch-gate-<timestamp>.json`
2. `screenshots-<timestamp>/`

如果只是迁移前留证，不想因为 readiness blocked 让计划任务报警，可以用：

```bash
PRODUCTION_BASE_URL=https://people.example.com \
npm run ops:production-launch-gate -- --evidence-only
```

严格发布前不要使用 `--evidence-only`。这时 readiness blocked、quality critical 或响应式失败都会让命令返回非 0。

## 推荐环境变量

```bash
PRODUCTION_BASE_URL=https://people.example.com
LAUNCH_GATE_OUTPUT_DIR=/var/log/ai-person-launch-gate
LAUNCH_GATE_QUALITY_LIMIT=20
LAUNCH_GATE_TIMEOUT_MS=30000
LAUNCH_GATE_STRICT_QUALITY=false
```

## Cron 示例

```cron
15 9 * * * cd /path/to/ai-person-agent && PRODUCTION_BASE_URL=https://people.example.com npm run ops:production-launch-gate >> /var/log/ai-person-launch-gate/cron.log 2>&1
```

## 判定口径

1. `gateStatus=ready`：可以作为上线或健康证据。
2. `gateStatus=pending`：可用但有待处理队列，通常是 high quality queue 或观察数据不足。
3. `gateStatus=blocked`：不能当 ready 证据，必须先处理迁移、发送观察、critical 质量问题或响应式失败。
4. `gateStatus=failed`：脚本或依赖执行失败，先排命令、浏览器、数据库连接和环境变量。
5. Newsletter readiness 不要求 `NEWSLETTER_SEND_ENABLED` 常开；当 provider、API key、sender、站点 URL、token secret 都齐，并且已有真实 `sent` delivery log 时，`NEWSLETTER_SEND_ENABLED=false` 视为发完后的安全关闭。下一次真实发送仍必须临时打开开关并显式确认。
6. 如果 production URL 对新增产品路由返回 404，这不是 readiness 问题，是应用代码尚未发布到当前 production deployment；需要明确批准 production deploy 后再跑严格门禁。

## 最近生产证据

2026-06-13 经明确批准后已执行 Vercel production deploy，最新 deployment 为 `dpl_CtGWxfZfzMjKBn3LZwf9g11fFoH5`。

最新生产门禁命令:

```bash
npm run ops:production-launch-gate -- \
  --no-screenshots \
  --output=/tmp/ai-person-production-launch-gate-final-goal-audit.json
```

结果口径:

1. `passForExit=true`，命令退出码为 0。
2. `readiness=ready`，schema、ActivityEvent、Newsletter sent observation、Influence audit、CompareReport observation 均 ready。
3. `responsive=18/18`，覆盖首页、topic、org、digest、graph、watchlist、compare、admin quality、admin operations 的桌面和移动端。
4. `gateStatus=ready`，quality queue 为 `0 critical / 0 high`。
5. 经爸明确批准后，已执行 high queue 全量建议文件 `/tmp/ai-person-quality-decisions-current-high80-full-suggested.json`，共 84 条: `keep=18`、`reject=66`。
6. 写库结果 `/tmp/ai-person-quality-apply-current-high80-full-execute.json`: `applied=84`、`noop=0`、`skipped=0`、`errors=0`。
7. 复跑 high80 审计 `/tmp/ai-person-quality-summary-current-high80-post-full-apply.json`: `queuedPeople=0`、`criticalPeople=0`、`highPeople=0`、`qaReviewRows=0`。
8. 最终目标验收门禁 `/tmp/ai-person-production-launch-gate-final-goal-audit.json`: `gateStatus=ready`、`passForExit=true`、readiness ready、quality `0 critical / 0 high`、responsive `18/18`。

## 生产上线编排

上线执行前先跑 dry-run 编排。它会检查迁移状态、readiness、ActivityEvent 回填预估、newsletter 草稿、影响力校准预估，并可选跑生产 launch gate：

```bash
PRODUCTION_BASE_URL=https://people.example.com \
npm run ops:production-rollout -- \
  --require-launch-gate \
  --evidence-only-launch-gate
```

默认不会写数据库、不会发邮件、不会改分数。输出目录默认是 `/tmp/ai-person-rollout-evidence`，会生成 `production-rollout-<timestamp>.json`。

报告顶层的 `assessment` 会把长命令输出整理成三类信息：

1. `pendingMigrations`：Prisma 还未应用的迁移。
2. `blockers`：readiness、migration 和 launch gate 当前挡住 ready 的原因。
3. `nextActions`：下一步应该执行的命令和原因。

如果 `blockers` 里出现 `database-connectivity`，先检查 `DATABASE_URL` / `DIRECT_URL`、Neon 状态和本机网络，不要继续执行迁移、回填、发信或改分数。
这类硬失败会触发快停，后续依赖数据库的步骤会标为 `skipped`，避免继续消耗时间或制造误导证据。

迁移前也可以单独生成 SQL 计划：

```bash
npm run ops:migration-plan -- --output=/tmp/ai-person-migration-plan.json
```

这份计划会列出 pending migrations、DDL 操作类型和是否包含 drop、truncate、delete、update、unknown SQL。只有 `safeToApply=true` 时才继续执行 `--execute-migrations`。

生产写入必须显式确认：

```bash
PRODUCTION_BASE_URL=https://people.example.com \
npm run ops:production-rollout -- \
  --confirm-production \
  --execute-migrations \
  --execute-activity-backfill \
  --record-newsletter \
  --execute-influence-audit \
  --require-launch-gate
```

真实发送 newsletter 还要额外确认：

```bash
npm run ops:production-rollout -- \
  --confirm-production \
  --send-newsletter \
  --confirm-newsletter-send
```

批量应用影响力分数也要额外确认：

```bash
npm run ops:production-rollout -- \
  --confirm-production \
  --apply-influence-score \
  --confirm-score-apply
```

上线建议顺序：

1. 先 dry-run：确认迁移状态、迁移 SQL 计划、回填规模、newsletter 草稿数量和质量复核状态。
2. 按 `assessment.nextActions` 处理迁移和 ActivityEvent 回填。
3. newsletter 先 `--record-newsletter` 观察投递日志，再小范围 `--send-newsletter`。
4. 影响力先 `--execute-influence-audit` 留审计，再决定是否 `--apply-influence-score`。
5. 最后跑严格 `ops:production-launch-gate`，不用 `--evidence-only`。
