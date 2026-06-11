# Neo/MiMo 内容审查收尾

日期：2026-06-11

## 结论

旧数据层已完成：prune reject/review 尾巴、refetch 后人工裁定、review unresolved、展示依赖 cleanup、Alec Radford 空主页 officialLink 移除、保守改写复核、top 5 卡片重聚合复核都已收齐。当前完成态以 `PRUNE_TAIL_REVIEW_UNRESOLVED.md`、`CARD_REAGGREGATION_APPLY.md`、`CARD_REAGGREGATION_CURRENT_VERIFY.md` 和本文件为准。

## 已完成

- 原始 review unresolved 已清零：`reviewUnresolvedRows=0`、`dependencyRows=0`。
- 低质、错配、低上下文、空主页等已按人工裁定删除或写 keep 审计；保留来源不再进入 unresolved。
- Alec Radford 空主页 `https://newmu.github.io/` 已从 `People.officialLinks` 精确移除，并删除对应 RawPoolItem。
- 历史保守改写决策 dry-run 复核为 `alreadyApplied=5` / `updated=0` / `cardsUpdated=0`。
- 当前 RawPoolItem 现场重新生成的保守改写只剩 4 个可追溯展示影响，dry-run 复核为 `alreadyApplied=4` / `updated=0` / `cardsUpdated=0`。
- top 5 卡片重聚合已执行，68 张旧卡归档替换为 24 张 MiMo keep/rewrite 卡；内容级复核 `expectedTotal=24` / `actualTotal=24` / `mismatchedPeople=0`。
- career、relation、org 当前防回流基线已写清：position-like org / vague role / currentTitle mismatch / relation needs_review 都是 0；机构剩余边界已裁定保留分开。

## 验证命令

```bash
npm run audit:content-guard
npm run audit:newcomer-preflight
npm run audit:post-ingest-guard
node scripts/audit/export_prune_tail_review_unresolved.mjs --out=docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json --report-out=docs/audit-2026-06/PRUNE_TAIL_REVIEW_UNRESOLVED.md
bun scripts/fix/apply_product_review_decisions.ts --decisions=docs/audit-2026-06/data/exa_source_quality_review_dir/conservative_rewrite_decisions_draft.json
node --check scripts/audit/content_review_policy.mjs
node --check scripts/audit/preflight_newcomer_intake.mjs
node --check scripts/audit/export_prune_tail_review_unresolved.mjs
node --check scripts/fix/apply_card_reaggregation_plan.mjs
node --check scripts/audit/build_prune_tail_refetch_queue.mjs
node --check scripts/fix/apply_people_official_link_decisions.mjs
git diff --check
```

关键 JSON 复核：

```bash
node -e "const fs=require('fs'); for (const p of ['docs/audit-2026-06/data/exa_source_quality_review_dir/conservative_rewrite_decisions_draft.json','docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan.json','docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan_mimo_review.json','docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json','docs/audit-2026-06/data/people_official_link_decisions_prune_tail_review.json']) JSON.parse(fs.readFileSync(p,'utf8')); console.log('json ok')"
```

2026-06-11 最新验证结果：

- `npm run audit:content-guard` 通过：prune unresolved 0 / dependency 0，career buckets empty，relation needsReview 0，cards 24=24，conservative rewrite skipped 0。
- `npm run audit:newcomer-preflight` 通过：`seeds=13` / `enrichment=13` / `inserted=0` / `updated=0` / `ambiguous=0` / `matched=13` / `missing=0` / candidate readiness `{}` / promotion `candidates=0` / `held=0`，并串起 content guard。
- `npm run audit:post-ingest-guard` 通过：刷新 prune/career/relation/card 当前审计产物，dry-run 保守改写，再跑 content guard；只更新 audit 文件，不写业务表。报告见 `POST_INGEST_CONTENT_GUARD.md`。
- `bun scripts/fix/apply_product_review_decisions.ts --decisions=...conservative_rewrite_decisions_draft.json` dry-run 通过：`alreadyApplied=5` / `updated=0` / `cardsUpdated=0`。
- `node scripts/fix/apply_card_reaggregation_plan.mjs ...CARD_REAGGREGATION_CURRENT_VERIFY.md` dry-run 通过：`peopleEligible=5` / `existingCards=24` / `replacementCards=24` / `skippedPeople=0`。
- `node --check` 相关脚本通过，关键 JSON parse 通过，`git diff --check` 通过。

## 未来防回流

- 新抓取或新生成后先跑 `npm run audit:content-guard`；如果 `reviewUnresolvedRows`、`dependencyRows`、career mismatch、relation needs_review 或 card reaggregation mismatch 回升，再开小批 review。
- 新增人选执行前先跑 `npm run audit:newcomer-preflight`；入口和晋级阈值以 `CONTENT_REVIEW_POLICY.json` 与 `CANDIDATE_INTAKE_POLICY.md` 为准。
- 新增数据写入后跑 `npm run audit:post-ingest-guard`，它会先刷新轻量审计产物再判定，避免 guard 只看旧文件。
- 新代表成果或卡片改动继续先跑保守改写 dry-run，再跑 card reaggregation dry-run；确认 source-backed 后才执行。
- 新履历、关系、机构写入继续守住 career-normalization、relation-validation 和 org boundary review。这里属于新增数据防回流关卡，不是旧数据遗留。
