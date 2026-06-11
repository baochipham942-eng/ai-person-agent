# 新人入库口径与防回流关卡

日期：2026-06-11

## 入口口径

新人只从 `candidate` 开始，不在名册导入阶段直接变成 `ready`。`roster_seeds.json` 必须至少给出 `name`、`roleCategory`、`organization`、`currentTitle` 和 `reason`，并且先跑去重 dry-run；出现歧义匹配时停住人工判定。

`roster_enrichment.json` 必须覆盖每个 seed，并且至少有 topics、officialLinks、products、topicDetails。新增人选不能只靠 X/Twitter、LinkedIn、搜索页、空主页、speaker/profile 壳页或低上下文公司页支撑。GitHub 个人页可以作为身份和头像辅助证据，但不能单独让候选人晋级。

## 晋级门槛

当前版本化阈值见 `CONTENT_REVIEW_POLICY.json`：

- `completeness >= 45`
- `rawCount >= 2`
- `keepCount >= 2`
- `liveCount >= 1`
- `cardCount >= 5`
- `avatarUrl` 存在才允许 promotion execute

`export_candidate_readiness.ts` 会把头像缺失单独分到 `ready_missing_avatar`；`promote_candidate_readiness.ts` 会把头像作为真正晋级 blocker。

## Preflight 顺序

新增人选或新人资料补全进入执行前，先跑：

```bash
npm run audit:newcomer-preflight
```

这个命令只读执行：

- 静态检查 `roster_seeds.json` 与 `roster_enrichment.json` 是否符合入口口径。
- dry-run `apply_roster_candidates.ts`，歧义匹配直接失败。
- dry-run `apply_roster_enrichment.ts`，已存在人物缺 enrichment 直接失败；新插入候选在插入前缺 DB match 属于预期。
- 导出 candidate readiness 并 dry-run promotion，存在 held candidate 时失败。
- 跑 `npm run audit:content-guard`，确认旧数据闭环没有回流。

这套关卡用于未来新增数据防回流，不改变本轮 Neo/MiMo 旧数据已完成的结论。

新增数据已经写入后，再跑：

```bash
npm run audit:post-ingest-guard
```

这个命令刷新 prune unresolved、career、relation 和 card 当前复核产物，再调用 `audit:content-guard`。它只更新 `docs/audit-2026-06` 下的审计文件，不抓取、不调模型、不写业务表。任何新增抓取、新关系/履历写入、卡片生成或新人晋级后，都用它做一次防回流验收。
