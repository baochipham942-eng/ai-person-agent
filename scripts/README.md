# Scripts

本目录按用途分层管理脚本，避免根目录继续堆积一次性修复和临时排查脚本。

## 常用入口

- `scripts/enrich/rewash_existing.ts`: 基于 RawPoolItem 重跑语义审计，写入 QAAuditLog；默认不 prune。
- `scripts/enrich/regenerate_cards.ts`: 基于 QAAuditLog keep 结果重聚合学习卡片；默认 dry-run，`--execute` 才写库；支持 `--include-candidates`、`--candidates-only`、`--top-n`，保存前会按 topN 截断。
- `scripts/enrich/recalculate_influence_v2.ts`: 按产品导向权重重算 `People.influenceScore`；默认 dry-run，`--execute` 才写库。
- `scripts/enrich/calculate_topic_ranks_v2.ts`: 按当前 influenceScore 重算 `People.topicRanks`；默认 dry-run，`--execute` 才写库。
- `scripts/enrich/apply_roster_candidates.ts`: 将 `roster_seeds.json` 落为 candidate 名册；默认 dry-run，`--execute` 才插入/更新 People。
- `scripts/enrich/apply_roster_enrichment.ts`: 将 `roster_enrichment.json` 合并到 People 的 topics / products / officialLinks / sourceWhitelist；默认 dry-run，`--execute` 才写库。
- `scripts/enrich/apply_candidate_deep_enrichment.ts`: 为 candidate 追加 curated RawPoolItem、QA keep、starter cards 和高置信 GitHub 头像；默认 dry-run，`--execute` 才写库。
- `scripts/enrich/fetch_candidate_live_sources.ts`: 抓取 candidate officialLinks 的真实页面内容，回填 RawPoolItem / QAAuditLog / 高置信头像；默认 dry-run，`--execute` 才写库。
- `scripts/audit/audit_career_normalization.ts`: 只读导出 career 规范化风险包。
- `scripts/audit/export_career_review_buckets.ts`: 只读把 career 剩余问题分成可人工裁定的 review buckets。
- `scripts/audit/export_relation_review_buckets.ts`: 只读把 `relation_review.json` 的 needs_review 分成高敏和低价值 review buckets。
- `scripts/audit/export_candidate_readiness.ts`: 只读导出 candidate 晋级复核分桶。
- `scripts/audit/export_prune_candidates.ts`: 只读导出 RawPoolItem prune 候选摘要；默认不删数据，`--full` 才输出完整候选列表。
- `scripts/fix/apply_career_normalization_safe.ts`: 执行确定性 career safe fix；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_career_review_safe_fixes.ts`: 按 `career_review_buckets.json` 执行二次确定性 safe fix；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_career_review_decisions.ts`: 按 `career_review_decisions.json` 执行人工裁定后的 role 转移/删除；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_current_title_decisions.ts`: 按 `current_title_decisions.json` 执行来源支持的 `currentTitle` / `People.organization` 修正；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_candidate_avatar_decisions.ts`: 按 `candidate_avatar_decisions.json` 执行来源支持的 candidate 头像修正；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_relation_review_decisions.ts`: 按 `relation_decisions.json` 确认或删除有外部证据支持的 PersonRelation；默认 dry-run，`--execute` 才写库。
- `scripts/fix/promote_candidate_readiness.ts`: 将事实门槛达标且有头像的 candidate 晋级为 ready；默认 dry-run，`--execute` 才写库。
- `scripts/fix/prune_raw_pool_items.ts`: 按最新 QA verdict 删除 RawPoolItem；默认只删 `duplicate` / `empty_content` / `incomplete`，`reject` 需显式 `--include-reject`。
- `scripts/enrich/trigger_content_fetch.ts`: 触发内容抓取。
- `scripts/enrich/recrawl_robust.ts`: 更稳健的重抓入口。
- `scripts/audit/audit_data_quality.ts`: 数据质量审计入口。
- `scripts/fix/apply_audit_fixes.ts`: 按审计结果执行修复；运行前确认 dry-run / execute 边界。
- `scripts/tools/export_people_csv.ts`: 导出人物 CSV。
- `scripts/test_courses.ts`: 课程抓取能力测试。
- `scripts/test_courses_free.ts`: 课程测试的免费源验证脚本。

## 目录归属

- `enrich/`: 抓取、补全、重洗、聚合类脚本。
- `audit/`: 只读审计、统计、冲突检测类脚本。
- `fix/`: 数据修复脚本，默认应支持 dry-run 或显式执行参数。
- `tools/`: 导入导出、转换、辅助工具。
- `cron/`: 可长期运行或定时调度的脚本。
- `archive/`: 不再作为常用入口的一次性历史脚本。

## 归档规则

1. 只移动 git 已跟踪的根目录一次性脚本；未跟踪脚本先确认来源和归属。
2. 破坏性脚本必须默认 dry-run，或要求 `--execute` / 明确确认后才写库。
3. 常用入口保留在规范目录，不放回 `scripts/` 根目录。
4. 搬迁脚本后同步更新 package scripts、文档引用和运行说明。

## 当前治理状态

2026-06-07 已将 33 个无直接引用的 git tracked 根目录脚本移入 `scripts/archive/`。根目录当前保留 2 个 `.ts`：

- tracked: `test_courses.ts`、`test_courses_free.ts`
- 已归档 untracked 修复脚本: `fix_data_quality_issues.ts`、`fix_dingjie.ts`、`fix_empty_organization.ts`

规范目录已包含 `audit/`、`enrich/`、`fix/`、`tools/` 等长期入口；根目录只保留明确仍在 README 中出现的课程测试入口。
