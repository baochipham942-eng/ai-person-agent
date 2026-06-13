# Scripts

本目录按用途分层管理脚本，避免根目录继续堆积一次性修复和临时排查脚本。

## 常用入口

- `scripts/enrich/rewash_existing.ts`: 基于 RawPoolItem 重跑语义审计，写入 QAAuditLog；默认不 prune。
- `scripts/enrich/regenerate_cards.ts`: 基于 QAAuditLog keep 结果重聚合学习卡片；默认 dry-run，`--execute` 才写库；支持 `--include-active`、`--include-candidates`、`--candidates-only`、`--top-n`，保存前会按 topN 截断。
- `scripts/enrich/recalculate_influence_v2.ts`: 按产品导向权重重算 `People.influenceScore`；默认 dry-run，`--execute` 才写库。
- `scripts/enrich/calculate_topic_ranks_v2.ts`: 按当前 influenceScore 重算 `People.topicRanks`；默认 dry-run，`--execute` 才写库。
- `scripts/enrich/apply_roster_candidates.ts`: 将 `roster_seeds.json` 落为 candidate 名册；默认 dry-run，`--execute` 才插入/更新 People。
- `scripts/enrich/apply_roster_enrichment.ts`: 将 `roster_enrichment.json` 合并到 People 的 topics / products / officialLinks / sourceWhitelist；默认 dry-run，`--execute` 才写库。
- `scripts/enrich/apply_candidate_deep_enrichment.ts`: 为 candidate 追加 curated RawPoolItem、QA keep、starter cards 和高置信 GitHub 头像；默认 dry-run，`--execute` 才写库。
- `scripts/enrich/fetch_candidate_live_sources.ts`: 抓取 candidate officialLinks 的真实页面内容，回填 RawPoolItem / QAAuditLog / 高置信头像；默认 dry-run，`--execute` 才写库。
- `scripts/enrich/plan_youtube_caption_batches.mjs`: 只读按 `People.influenceScore` 和视频价值把 YouTube `videoId` 切成 `local` / `lobster` / `deferred` 三批；`--write` 才写入 `exports/youtube-captions/plans/`。
- `scripts/enrich/fetch_youtube_captions_with_ytdlp.mjs`: 按批次 plan 调 `yt-dlp` 抓字幕；默认 dry-run，`--execute` 才访问 YouTube，状态写入 `exports/youtube-captions/subtitles/_status/`。
- `scripts/audit/audit_career_normalization.ts`: 只读导出 career 规范化风险包。
- `scripts/audit/export_career_review_buckets.ts`: 只读把 career 剩余问题分成可人工裁定的 review buckets。
- `scripts/audit/export_relation_review_buckets.ts`: 只读把 `relation_review.json` 的 needs_review 分成高敏和低价值 review buckets。
- `scripts/audit/export_candidate_readiness.ts`: 只读导出 candidate 晋级复核分桶。
- `scripts/audit/export_prune_candidates.ts`: 只读导出 RawPoolItem prune 候选摘要；默认不删数据，`--full` 才输出完整候选列表。
- `scripts/audit/export_fact_claims.mjs`: 只读导出人物页可见 fact claims；支持 `--claim-type`、`--person`、`--person-id`。
- `scripts/audit/report_exa_source_quality.ts`: 只读用入库门禁策略扫描 Exa RawPoolItem，导出弱来源/错挂风险报告。
- `scripts/audit/build_exa_source_quality_remediation.mjs`: 只读把 Exa 弱来源报告拆成 strict prune / dedicated source / MiMo review 队列。
- `scripts/audit/verify_fact_claims_mimo.mjs`: 用 Xiaomi MiMo 审查导出的 fact claims；只写 review JSONL，不改库。
- `scripts/audit/remediate_fact_claim_issues_mimo.mjs`: 将已审出问题的 fact claims 编排成删除、重抓来源、保守改写和人工复核队列；只写 remediation JSONL/报告，不改库。
- `scripts/audit/refetch_source_remediation.mjs`: 只读消费 remediation 的 `refetch_source` 队列，用 Exa、Tavily 或 AnySearch 重抓候选来源并交给 MiMo 选择可替换/补强来源；Tavily 支持 `TAVILY_API_KEYS` 或 `TAVILY_API_KEY_1..N` 轮换；只写 JSONL/summary/报告，不改库。
- `scripts/audit/export_conservative_rewrite_queue.mjs`: 只读导出 `rewrite_conservative` 队列，并关联可能受影响的 People.products / Card，供人工确认后再改写。
- `scripts/audit/build_conservative_rewrite_decisions.mjs`: 从保守改写队列生成 `apply_product_review_decisions.ts` 可读的展示面改写草案；只写 draft JSON/报告，不改库。
- `scripts/audit/build_refetch_followup_queue.mjs`: 从 refetch 一轮结果里导出 `no_good_source` / `human_review` / 低权威 blocker 的二次补源队列；只写 JSONL/summary/报告，不改库。
- `scripts/audit/build_hard_tail_manual_decisions.mjs`: 从 refetch hard-tail 队列生成最终人工删改裁定文件；只写 decisions JSON/报告，不改库。
- `scripts/audit/build_card_reaggregation_plan.ts`: 只读按 source apply 影响面挑选人物，基于 audited keep RawPoolItem 生成卡片重聚合计划，并归档现有卡片用于回滚/复核。
- `scripts/audit/review_card_reaggregation_plan_mimo.mjs`: 只读用 MiMo 按 `sourceUrl` 对应 RawPoolItem 文本审查重聚合候选卡片，输出 keep/rewrite/drop/human_review。
- `scripts/audit/extract_new_high_source_claims_after_prune.mjs`: 对比 prune 后 source claims 与既有 review，导出新补位的高优先级 source claims。
- `scripts/audit/summarize_source_prune_iterations.mjs`: 汇总 source item 多轮安全删除结果，生成 `SOURCE_ITEM_SAFE_PRUNE_STATUS.md`。
- `scripts/audit/analyze_prune_reject_review_buckets.mjs`: 只读分析剩余 reject/review RawPoolItem，按错人、空抓取、作者证据缺失、低信息辅助页等分桶，并输出 strict delete candidates。
- `scripts/fix/apply_refetch_source_candidates.mjs`: 将 refetch 的 `replace_source` / `augment_source` 候选按门禁 additive 写入 RawPoolItem，并写入 QAAuditLog keep；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_product_review_decisions.ts`: 按人工/审查后的产品与卡片保守改写决策更新 People.products / topics / Card；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_card_reaggregation_plan.mjs`: 按 MiMo 审过的卡片重聚合计划执行单个人物卡片硬替换；默认 dry-run，`--execute` 必须同时提供 `--person`。
- `scripts/fix/apply_hard_tail_manual_decisions.mjs`: 按 hard-tail 人工裁定写入 `manual_hard_tail` 审计，并只删除明确标记 `delete_raw_pool_item` 的 RawPoolItem；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_prune_reject_review_buckets.mjs`: 只执行 `analyze_prune_reject_review_buckets.mjs` 产物里的 strict delete candidates，删除 RawPoolItem 并归档完整行；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_safe_rawpool_remediation.mjs`: 只执行通过严格门禁的 `delete_raw_pool_item` 修复；默认 dry-run，`--execute` 才删除 RawPoolItem。
- `scripts/fix/apply_career_normalization_safe.ts`: 执行确定性 career safe fix；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_career_review_safe_fixes.ts`: 按 `career_review_buckets.json` 执行二次确定性 safe fix；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_career_review_decisions.ts`: 按 `career_review_decisions.json` 执行人工裁定后的 role 转移/删除；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_current_title_decisions.ts`: 按 `current_title_decisions.json` 执行来源支持的 `currentTitle` / `People.organization` 修正；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_candidate_avatar_decisions.ts`: 按 `candidate_avatar_decisions.json` 执行来源支持的 candidate 头像修正；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_relation_review_decisions.ts`: 按 `relation_decisions.json` 确认或删除有外部证据支持的 PersonRelation；默认 dry-run，`--execute` 才写库。
- `scripts/fix/apply_former_colleague_relations.mjs`: 把只有历史任职重叠、没有当前共同机构的 `colleague` 清洗成 `former_colleague`；默认 dry-run，`--execute` 才写库，支持 `--person` 定向检查。
- `scripts/fix/promote_candidate_readiness.ts`: 将事实门槛达标且有头像的 candidate 晋级为 ready；默认 dry-run，`--execute` 才写库。
- `scripts/fix/prune_raw_pool_items.ts`: 按最新 QA verdict 删除 RawPoolItem；默认只删 `duplicate` / `empty_content` / `incomplete`，`reject` 需显式 `--include-reject`。
- `scripts/enrich/trigger_content_fetch.ts`: 触发内容抓取。
- `scripts/enrich/recrawl_robust.ts`: 更稳健的重抓入口。
- `scripts/audit/audit_data_quality.ts`: 数据质量审计入口。
- `scripts/fix/apply_audit_fixes.ts`: 按审计结果执行修复；运行前确认 dry-run / execute 边界。
- `scripts/tools/export_people_csv.ts`: 导出人物 CSV。
- `scripts/test_courses.ts`: 课程抓取能力测试。
- `scripts/test_courses_free.ts`: 课程测试的免费源验证脚本。

## YouTube 字幕批处理

1. 生成三批 videoId plan：`npm run youtube:caption-plan -- --local-limit=200 --lobster-limit=200 --write`
2. 启动本地 PO token provider。YouTube 自动字幕经常需要 PO token；没有 provider 时可能只能看到字幕列表，正文拿不到。
3. 本机先 dry-run 看命令：`npm run youtube:caption-fetch -- --batch=local --limit=2`
4. 本机执行第一批：`npm run youtube:caption-fetch -- --batch=local --execute --no-stop-on-timeout`
5. 龙虾执行第二批时复制 `exports/youtube-captions/plans/lobster_video_ids.txt`，再跑：`npm run youtube:caption-fetch -- --ids-file=lobster_video_ids.txt --batch=lobster --execute --no-stop-on-timeout`

当前默认只抓 `en,en.*`，先减少请求数和 429 风险。需要中文字幕时再显式传 `--sub-langs=zh,zh.*,en,en.*`。

抓取脚本会先读 YouTube watch page 的 captionTracks：没有字幕轨就直接记 `no_caption_track`；有目标字幕轨时，默认优先走 timedtext + 本地 PO provider 写 VTT，yt-dlp 作为兜底路径。

PO token provider 可放在 ignored 的 `exports/youtube-captions/` 下：

```bash
git clone --single-branch --branch 1.3.1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git exports/youtube-captions/bgutil-ytdlp-pot-provider
cd exports/youtube-captions/bgutil-ytdlp-pot-provider/server
npm ci
npx tsc
node build/main.js --port 4416
```

抓取脚本遇到 `rate_limited_or_blocked` 或 `command_timeout` 会默认停止整批，避免继续消耗 IP 信誉或卡住机器；如果已经写出字幕但后续语言失败，会记为 `partial_success` 并继续。

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
