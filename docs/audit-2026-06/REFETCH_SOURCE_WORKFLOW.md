# Refetch Source Workflow

生成时间：2026-06-10

收尾状态（2026-06-11）：旧数据清洗层已完成。prune reject/review refetch 队列、原始 reject unresolved、原始 review unresolved、展示依赖 cleanup 都已处理到 `reviewUnresolvedRows=0` / `dependencyRows=0`。本文中部的“阶段性剩余”只记录当时批次推进快照，不代表当前待处理项。

## 目标

把 MiMo remediation 里的 `refetch_source` 队列推进成可复核的权威来源候选，并把通过门禁的来源按 additive 方式写入 RawPoolItem + QAAuditLog keep。这个阶段仍不直接改代表作品、不重写卡片。

## 输入

- remediation：`docs/audit-2026-06/data/exa_source_quality_review_dir/fact_claim_remediation_exa_source_quality_mimo.jsonl`
- claims：`docs/audit-2026-06/data/exa_source_quality_mimo_claims.jsonl`
- 入口脚本：`scripts/audit/refetch_source_remediation.mjs`

当前 `limit=999 --resume` 后，remediation 里有 490 条 `refetch_source`，都带 `sourceQueries`。Exa 额度耗尽后已切到 Tavily，490 条已全部审完：Exa 处理 200 条，Tavily 处理 290 条。

refetch 输出里，MiMo 判为 `replace_source=358`、`augment_source=71`、`no_good_source=39`、`human_review=22`。其中通过 apply 门禁的来源已写库：417 条新增 RawPoolItem，417 条对应 QAAuditLog keep。另有 110 个 source/decision 被跳过，主要是 blocked、低权威来源或非入库 decision。

第二轮 follow-up 已从 `no_good_source` / `human_review` / 低权威 blocker 里导出 78 条待重抓队列。Tavily advanced + MiMo 先跑 48 条，因 Tavily plan usage limit 在第 49 条早停；随后改用 AnySearch + MiMo 接完剩余 30 条。混合结果已全量完成：`replace_source=40`、`augment_source=15`、`no_good_source=20`、`human_review=3`，pending 已归零。通过 apply 门禁后，68 条 selected source 已写入或确认存在；本轮混合 apply 新增 25 条 RawPoolItem + 25 条 QAAuditLog keep，post-verify 显示 68/68 RawPoolItem 和 68/68 keep audit 都已存在。

11-key Tavily pool 放入 `.env.local` 后，又从 mixed 结果里的 unresolved / 主源不足行导出 tertiary 队列 27 条，并用 Tavily advanced + MiMo 跑完：`replace_source=3`、`augment_source=3`、`no_good_source=21`，pending 为 0，未再触发额度早停。tertiary apply 通过门禁写入/确认 6 条 selected source，其中新增 5 条 RawPoolItem + 5 条 QAAuditLog keep，post-verify 显示 6/6 RawPoolItem 和 6/6 keep audit 都已存在。

最终 hard tail 23 条已人工裁定并执行：21 条 `delete_raw_pool_item` 已删除 RawPoolItem，2 条 `keep_raw_pool_item` 保留并写入 `manual_hard_tail` keep 审计。保留项是 Yann LeCun 的 LinkedIn 本人帖和吴恩达的 Medium 本人文章；其余行经三轮 refetch 与人工复核后仍无法证明人物-来源直接关系，或只是低权威辅助来源。执行报告见 `docs/audit-2026-06/HARD_TAIL_MANUAL_DECISIONS.md` 和 `docs/audit-2026-06/HARD_TAIL_MANUAL_APPLY.md`。

prune reject/review 尾巴已完成同一套 refetch workflow。`build_prune_tail_refetch_queue.mjs` 已把十六批 manual prune 后剩余的 515 条 `reject/review` 行转成 `prune_tail_refetch_queue.jsonl`；515 条已全量用 Tavily advanced + MiMo 跑完二十六批，并经过人工 curation 后执行 additive apply。二十六批合计：587 个 MiMo selected source 中移除 191 个不放行来源，345 个唯一 source 通过 apply 门禁；新增 205 条 RawPoolItem + 205 条 QAAuditLog keep，另 140 条既有来源确认已有 keep audit。post-verify 显示第一批 19/19、第二批 18/18、第三批 8/8、第四批 18/18、第五批 25/25、第六批 14/14、第七批 12/12、第八批 24/24、第九批 20/20、第十批 11/11、第十一批 5/5、第十二批 8/8、第十三批 4/4、第十四批 17/17、第十五批 13/13、第十六批 6/6、第十七批 15/15、第十八批 18/18、第十九批 15/15、第二十批 14/14、第二十一批 18/18、第二十二批 20/20、第二十三批 2/2、第二十四批 9/9、第二十五批 4/4、第二十六批 8/8 selected source 已存在且 keep audit 已存在。之后对原始 latest QA verdict 为 `reject` 的 unresolved 行做人工裁定：96 条中 89 条删除 RawPoolItem 并写入 `manual_prune_tail_after_refetch` reject 审计；7 条展示依赖继续用 card/source manual 决策处理，归档 4 张 active card、更新 1 张 card sourceUrl、修复 2 条 GitHub profile RawPoolItem 为 keep，并删除 5 条旧 reject RawPoolItem。随后导出原始 `review` unresolved 124 条，对其中 `refetch=no_good_source` 且无展示依赖的 41 条执行人工删除并写入 `manual_prune_tail_review_no_good` reject 审计；再对剩余 `human_review` 中 37 条页面壳、登录墙、短夸赞、转发或无证据片段执行显式 low-info 人工删除并写入 `manual_prune_tail_review_low_info` reject 审计；然后归档 Greg Brockman 1 张过期 Codex 限额 active card，并删除其带展示依赖的 `no_good_source` RawPoolItem，写入 `manual_prune_tail_review_dependency_low_info` reject 审计；再对 Noam Shazeer / Chris Olah / 朱军 / Lukasz Kaiser / Eric Horvitz / Yann LeCun 共 7 条内容足量且人物命中的直接来源写入 keep 审计；之后删除 7 条无展示依赖的薄源/错配源，写入 `manual_prune_tail_review_thin_mismatch` reject 审计。最后 31 条 `human_review` 已继续人工裁定：7 条 GitHub 短仓库抓取修复为 keep，5 条展示依赖直接来源写 keep，10 条自包含 X 直发来源写 keep，8 条低价值或低上下文来源删除，1 条 Alec Radford 空主页先从 People.officialLinks 精确移除再删除 RawPoolItem。最终导出显示 `reviewUnresolvedRows=0`、`dependencyRows=0`。

## 处理链路

1. 读取 `refetch_source` rows，保留原始 RawPoolItem 标题、URL、source quality flags 和 MiMo 的 evidence requirements。
2. 对每条 row 的 `sourceQueries` 调搜索 provider，当前支持 Exa search + contents、Tavily search + raw content、AnySearch search/batch_search，去重 URL，保留候选标题、正文摘要、发布时间、作者和 host。
3. 用轻量启发式给候选打 `authorityScore`，只作为排序信号：人物姓名命中、组织/主题命中、正文足量、官方/学术/可靠媒体加分；搜索页、登录墙、空内容、社媒 UGC 降分。
4. 把候选交给 MiMo 判定：`replace_source`、`augment_source`、`no_good_source`、`human_review`。
5. 输出 JSONL、summary 和 markdown 报告，供后续人工或脚本 apply 设计使用。

权威口径加一层硬规则：Wikipedia、普通 Medium/Substack、社媒/UGC、Google Scholar 搜索页这类只能作为辅助线索，不能单独作为 `replace_source`。如果 MiMo 把这类来源单独判成替换，脚本会降级为 `augment_source` 并加 `replacement_needs_primary_or_credible_source` blocker；如果只是混入 replace 的辅助来源，脚本保留 decision 但加 `replacement_contains_auxiliary_low_authority_source` blocker。

运行级错误要和内容级错误分开处理。Exa `NO_MORE_CREDITS` / HTTP 402、Tavily/AnySearch quota 或 rate limit 是 provider blocker，不代表某条 claim 没有好来源；脚本会停止继续取新任务并保留 pending，等额度恢复或切换 provider 后用 `--resume` 继续。普通抓取失败或 MiMo 输出解析失败才会写成单条 `human_review`。

## 命令

只预览任务：

```bash
node scripts/audit/refetch_source_remediation.mjs --dry-run --limit=20
```

跑一小批默认 Exa + MiMo：

```bash
node scripts/audit/refetch_source_remediation.mjs --limit=20 --resume --concurrency=1
```

继续当前批次：

```bash
node scripts/audit/refetch_source_remediation.mjs --provider=tavily --limit=490 --resume --concurrency=1
```

Tavily 当前使用省额度的默认参数：`--tavily-search-depth=basic --tavily-raw-content=text`。如果某批候选太薄，可对小批量改用：

```bash
node scripts/audit/refetch_source_remediation.mjs --provider=tavily --tavily-search-depth=advanced --limit=20 --resume --concurrency=1
```

Tavily 支持 key pool。脚本会按顺序读取 `TAVILY_API_KEYS`（逗号/空白分隔）、`TAVILY_API_KEY_1..N` 和单个 `TAVILY_API_KEY`，请求时轮换使用；单个 key 返回 quota/rate limit 后会标记耗尽并切到下一个，全部 key 耗尽才早停。当前本机 `.env.local` 已放入 11 个唯一 Tavily key；此前第 49 条 follow-up 在 HTTP 432 后停止，是因为当时只检测到单个 `TAVILY_API_KEY`。

Tavily 卡住后，用 AnySearch 接续混合结果：

```bash
cp docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_tavily_mimo.jsonl \
  docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_mixed_mimo.jsonl

node scripts/audit/refetch_source_remediation.mjs \
  --provider=anysearch \
  --in=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_queue.jsonl \
  --out=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_mixed_mimo.jsonl \
  --summary-out=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_mixed_mimo_summary.json \
  --report-out=docs/audit-2026-06/REFETCH_SOURCE_FOLLOWUP_MIXED_MIMO.md \
  --limit=78 --resume --search-results=5 --max-candidates=8 --concurrency=1
```

key pool 恢复后，用 Tavily advanced 跑 tertiary 队列：

```bash
node scripts/audit/build_refetch_followup_queue.mjs \
  --in=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_mixed_mimo.jsonl \
  --out=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_tertiary_queue.jsonl \
  --summary-out=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_tertiary_queue_summary.json \
  --report-out=docs/audit-2026-06/REFETCH_SOURCE_TERTIARY_QUEUE.md \
  --exclude-replace-aux-blockers

node scripts/audit/refetch_source_remediation.mjs \
  --provider=tavily --tavily-search-depth=advanced --tavily-raw-content=text \
  --in=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_tertiary_queue.jsonl \
  --out=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_tertiary_tavily_mimo.jsonl \
  --summary-out=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_tertiary_tavily_mimo_summary.json \
  --report-out=docs/audit-2026-06/REFETCH_SOURCE_TERTIARY_TAVILY_MIMO.md \
  --limit=27 --resume --search-results=5 --max-candidates=10 --concurrency=2
```

prune-tail 队列已完成。最后一批按 20 条窗口推进，实际处理剩余 15 条，先 refetch，再 curation，再 apply：

```bash
node scripts/audit/refetch_source_remediation.mjs \
  --provider=tavily --tavily-search-depth=advanced --tavily-raw-content=text \
  --in=docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl \
  --claims=docs/audit-2026-06/data/prune_tail_refetch_claims.jsonl \
  --out=docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch26.jsonl \
  --summary-out=docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch26_summary.json \
  --report-out=docs/audit-2026-06/PRUNE_TAIL_REFETCH_TAVILY_MIMO_BATCH26.md \
  --offset=500 --limit=20 --resume --search-results=5 --max-candidates=10 --concurrency=1

node scripts/audit/curate_prune_tail_refetch_results.mjs \
  --in=docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch26.jsonl \
  --out=docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch26_curated.jsonl \
  --summary-out=docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch26_curated_summary.json \
  --report-out=docs/audit-2026-06/PRUNE_TAIL_REFETCH_TAVILY_MIMO_BATCH26_CURATED.md

node scripts/fix/apply_refetch_source_candidates.mjs \
  --in=docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch26_curated.jsonl \
  --out=docs/audit-2026-06/data/prune_tail_refetch_batch26_curated_apply_dry_run_log.json \
  --archive=docs/audit-2026-06/data/prune_tail_refetch_batch26_curated_apply_dry_run_archive.json \
  --report-out=docs/audit-2026-06/PRUNE_TAIL_REFETCH_BATCH26_CURATED_APPLY_DRY_RUN.md \
  --decisions=replace_source,augment_source --limit=0
```

输出：

- `docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_exa_mimo.jsonl`
- `docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_exa_mimo_summary.json`
- `docs/audit-2026-06/REFETCH_SOURCE_EXA_MIMO.md`

## Source-backed Apply

入口脚本：`scripts/fix/apply_refetch_source_candidates.mjs`

执行结果：

- 输入：490 条 refetch rows。
- 入库：417 条 source-backed RawPoolItem，全部为 additive 新增。
- 审计：417 条 QAAuditLog keep。
- 决策分布：`replace_source=367`、`augment_source=50`。
- 来源类型：generic web/exa 268、official 84、paper 37、YouTube 15、GitHub 6、podcast 7。
- 跳过：110 个 source/decision，包含 hard blocker、低权威来源、`no_good_source` / `human_review`。

复验命令：

```bash
node scripts/fix/apply_refetch_source_candidates.mjs \
  --out=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_apply_post_verify_log.json \
  --archive=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_apply_post_verify_archive.json \
  --report-out=docs/audit-2026-06/REFETCH_SOURCE_APPLY.md
```

复验结果显示 417 条 RawPoolItem 和 417 条 keep audit 已存在，dry-run 不再产生新增写入。

第二轮 follow-up apply：

- 输入：78 条 follow-up refetch rows。
- 入库/确认：68 条 selected source。
- 混合 apply 新增：25 条 RawPoolItem + 25 条 QAAuditLog keep。
- 混合 apply 已存在：43 条 selected source 在此前 apply 中已落库。
- post-verify：68 条 RawPoolItem 和 68 条 keep audit 全部存在，dry-run 不再产生新增写入。
- 跳过：23 条非选中 decision、7 条 blocker、1 条低权威来源。

第三轮 tertiary apply：

- 输入：27 条 tertiary refetch rows。
- 入库/确认：6 条 selected source。
- 新增：5 条 RawPoolItem + 5 条 QAAuditLog keep。
- 已存在：1 条 selected source 在此前 apply 中已落库。
- post-verify：6 条 RawPoolItem 和 6 条 keep audit 全部存在，dry-run 不再产生新增写入。
- 跳过：21 条非选中 decision、2 条 blocker。

Hard-tail manual apply：

- 输入：23 条 hard-tail rows。
- 人工裁定：21 条删除、2 条保留。
- 执行：写入 23 条 `QAAuditLog.stage=manual_hard_tail` 审计；删除 21 条 RawPoolItem。
- post-verify：hard-tail 目标中仅剩 2 条 RawPoolItem，分别为 Yann LeCun LinkedIn 本人帖、吴恩达 Medium 本人文章；审计日志为 `keep=2`、`reject=21`。

Prune-tail refetch apply：

- 输入：515 条 prune-tail refetch queue；515 条已完成二十六批 Tavily+MiMo。
- 入库/确认：345 条 selected source。
- 新增：205 条 RawPoolItem + 205 条 QAAuditLog keep。
- 已存在：140 条 selected source 在此前来源补强中已落库并已有 keep audit。
- 人工 curation 移除：Karpathy 污染页、Alec Radford 弱二级/社交源、Wikipedia、LinkedIn/X、Digg、Google Scholar、SingjuPost / Musixmatch / Happyscribe / Podwise / Y2Doc transcript 聚合、speaker bureau、Substack 存档页、火山引擎社区传记、INABR/凤凰网/IDC头条/新浪二手稿、DeepAI 聚合 profile、MBA智库百科、低权威评论/博客/转录站，以及不能证明具体 claim 的个人主页/背景报道/背景论文/泛访谈/视频页/背景播客页/学习笔记、低权威 newsletter/聚合站、背景争议文、旧职位公告/泛视频/剪辑视频、维基型二级页等 191 个来源。
- post-verify：第一批 19/19、第二批 18/18、第三批 8/8、第四批 18/18、第五批 25/25、第六批 14/14、第七批 12/12、第八批 24/24、第九批 20/20、第十批 11/11、第十一批 5/5、第十二批 8/8、第十三批 4/4、第十四批 17/17、第十五批 13/13、第十六批 6/6、第十七批 15/15、第十八批 18/18、第十九批 15/15、第二十批 14/14、第二十一批 18/18、第二十二批 20/20、第二十三批 2/2、第二十四批 9/9、第二十五批 4/4、第二十六批 8/8 RawPoolItem 和 keep audit 全部存在，dry-run 不再产生新增写入。
- 跳过：224 个 non-selected source/decision，保持 `human_review` / `no_good_source`。

Prune-tail remaining manual apply：

- 输入：refetch 后仍 unresolved 且原始 latest QA verdict 为 `reject` 的 96 条 RawPoolItem。
- 安全过滤：跳过 7 条 active Card.sourceUrl 或 People 展示字段依赖。
- 执行：删除 89 条 RawPoolItem，并写入 89 条 `QAAuditLog.stage=manual_prune_tail_after_refetch` reject 审计。
- post-verify：89/89 target 已 missing；第一轮人工删除后的只读统计显示 refetch 后 unresolved RawPoolItem 还剩 131 条。
- 剩余展示依赖：7 条进入 card/source manual apply。

Card/source manual apply after refetch：

- 输入：7 条由 active Card.sourceUrl 或 People 展示字段保护的原始 `reject`。
- 执行：4 张 active card 归档、1 张 Mustafa Suleyman card sourceUrl 改挂到 Inflection AI keep 来源、2 条 GitHub profile RawPoolItem 用 GitHub Users API 摘要修复并写 keep 审计、5 条解除依赖后的旧 reject RawPoolItem 删除。
- post-verify：4 张卡 `isActive=false`，Mustafa card sourceUrl 已更新，旧 reject RawPoolItem remaining=0，`manual_card_source_after_refetch` 审计为 keep 2 / reject 5。
- 当前剩余：124 条原始 `review` unresolved RawPoolItem。

Review no-good manual apply：

- 输入：`PRUNE_TAIL_REVIEW_UNRESOLVED.md` 中原始 `review` unresolved 124 条。
- 安全过滤：只选 `refetch=no_good_source` 且无 active Card.sourceUrl / People 展示依赖的 41 条；1 条带 active card 依赖跳过。
- 执行：删除 41 条 RawPoolItem，并写入 41 条 `QAAuditLog.stage=manual_prune_tail_review_no_good` reject 审计。
- post-verify：41/41 target 已 missing。
- 当前剩余：83 条 unresolved RawPoolItem，82 条 `human_review`，1 条带展示依赖的 `no_good_source`。

Review low-info manual apply：

- 输入：`PRUNE_TAIL_REVIEW_UNRESOLVED.md` 中剩余 83 条 unresolved RawPoolItem。
- 安全过滤：只选显式列入 `prune_tail_review_low_info_manual_decisions.json` 的 37 条页面壳、登录墙、短夸赞、转发或无证据片段；无 active Card.sourceUrl / People 展示依赖命中。
- 执行：删除 37 条 RawPoolItem，并写入 37 条 `QAAuditLog.stage=manual_prune_tail_review_low_info` reject 审计。
- post-verify：37/37 target 已 missing。
- 当前剩余：46 条 unresolved RawPoolItem，45 条 `human_review`，1 条带展示依赖的 `no_good_source`。

Review dependency low-info manual apply：

- 输入：`PRUNE_TAIL_REVIEW_UNRESOLVED.md` 中 1 条带 active card 依赖的 `no_good_source`。
- 执行：归档 Greg Brockman 1 张过期 Codex 限额 active card，并删除对应 RawPoolItem，写入 `QAAuditLog.stage=manual_prune_tail_review_dependency_low_info` reject 审计。
- post-verify：2/2 action 已不再 applicable。
- 当前剩余：45 条 unresolved RawPoolItem，全部为 `human_review`。

Review keep-direct manual apply：

- 输入：剩余 `human_review` 中 4 条内容足量、正文命中人物名、来源本身可直接支持人物或作品关系的 RawPoolItem。
- 执行：写入 4 条 `QAAuditLog.stage=manual_prune_tail_review_keep_direct` keep 审计；不删除、不改写 RawPoolItem。
- verify：重导出显示 `latestKeepRowsExcluded=4`。
- 当前剩余：41 条 unresolved RawPoolItem，全部为 `human_review`。

Review dependency keep-direct manual apply：

- 输入：剩余 `human_review` 中 3 条带展示依赖、内容足量、正文命中人物名和关键身份/事件的 RawPoolItem。
- 执行：写入 3 条 `QAAuditLog.stage=manual_prune_tail_review_dependency_keep_direct` keep 审计；不删除、不改写 RawPoolItem。
- verify：重导出显示 `latestKeepRowsExcluded=7`，`dependencyRows=5`。
- 当前剩余：38 条 unresolved RawPoolItem，全部为 `human_review`。

Review thin/mismatch manual apply：

- 输入：剩余 `human_review` 中 7 条无展示依赖、正文过薄、标题/人物错配或 refetch 后仍无法证明原始对象的 RawPoolItem。
- 执行：删除 7 条 RawPoolItem，并写入 7 条 `QAAuditLog.stage=manual_prune_tail_review_thin_mismatch` reject 审计。
- post-verify：7/7 target 已 missing。
- 阶段性剩余：31 条 `human_review` RawPoolItem，当时进入最后一轮人工裁定；后续 GitHub repo repair、dependency keep、X direct keep、residual/low-context 删除和 display-link cleanup 后已归零。

Review GitHub repo repair apply：

- 输入：剩余 `human_review` 中 7 条 GitHub 短仓库抓取，原始内容只有 repo 标题或空摘要，但 GitHub REST API 能证明仓库 owner、description、topics、stars/forks 和更新时间。
- 执行：用 GitHub repo metadata 更新 RawPoolItem 的 title/content/metadata/sourceType，并写入 7 条 `QAAuditLog.stage=manual_prune_tail_review_github_repo_repair` keep 审计。
- verify：重导出显示 `latestKeepRowsExcluded=14`，这 7 条不再进入 unresolved。

Review remaining dependency keep apply：

- 输入：剩余 `human_review` 中 5 条带展示依赖或 display 价值的直接来源：Daniela Amodei The Org、Hyung Won Chung 机器之心/新浪转载、Lilian Weng Fellows Fund、Alexandr Wang Substack、Shane Legg TIME。
- 执行：写入 5 条 `QAAuditLog.stage=manual_prune_tail_review_remaining_dependency_keep` keep 审计；不删除、不改写 RawPoolItem。
- verify：重导出显示 `latestKeepRowsExcluded=19`，当时仍有 1 条展示依赖 row；后续 display-link cleanup 后已归零。

Review X direct keep apply：

- 输入：剩余 `human_review` 中 10 条自包含 X 直发来源，正文或上下文足以支持人物观点、发布内容或作品关系。
- 执行：写入 10 条 `QAAuditLog.stage=manual_prune_tail_review_x_direct_keep` keep 审计；不删除、不改写 RawPoolItem。
- verify：重导出显示 keep 排除数继续增加，未产生删除。

Review residual low-value apply：

- 输入：剩余 `human_review` 中 5 条低价值来源：旧 About 链接页、mentor-fellows 低价值帖、不完整性能片段、泛 mission statement、泛 productive-year 帖。
- 执行：删除 5 条 RawPoolItem，并写入 5 条 `QAAuditLog.stage=manual_prune_tail_review_residual_low_value` reject 审计。
- post-verify：5/5 target 已 missing。

Review low-context X apply：

- 输入：剩余 `human_review` 中 3 条低上下文 X 来源：Chris Olah 两条过短技术片段、Yann LeCun 一条无法支撑人物作品关系的短技术帖。
- 执行：删除 3 条 RawPoolItem，并写入 3 条 `QAAuditLog.stage=manual_prune_tail_review_low_context_x` reject 审计。
- post-verify：3/3 target 已 missing。

People official link cleanup：

- 输入：Alec Radford `People.officialLinks` 里的空主页 `https://newmu.github.io/`，其 GitHub 与 X 链接已由更强来源保留。
- 执行：`scripts/fix/apply_people_official_link_decisions.mjs --execute` 精确移除该 URL，只改匹配的 officialLinks entry。
- verify：执行报告显示 1/1 applicable 已 applied。

Review display-link cleanup apply：

- 输入：最后 1 条 Alec Radford 空主页 RawPoolItem，先前因 People 展示字段依赖被保护。
- 执行：删除 1 条 RawPoolItem，并写入 1 条 `QAAuditLog.stage=manual_prune_tail_review_display_link_cleanup` reject 审计。
- post-verify：1/1 target 已 missing；最终导出显示 `reviewUnresolvedRows=0`、`dependencyRows=0`。

## 安全边界

- refetch 脚本只读数据库；apply 脚本默认 dry-run，只有 `--execute` 才写库。
- source-backed apply 只 additive 新增来源，不删除旧 RawPoolItem。
- hard-tail manual apply 只处理人工裁定文件里的明确 action：`delete_raw_pool_item` 删除 RawPoolItem，`keep_raw_pool_item` 只写 keep 审计。
- prune-tail after-refetch manual apply 只处理原始 latest QA verdict 为 `reject` 且无 active Card/People 展示依赖的人工裁定行。
- review manual apply 只处理显式决策文件里的 low-info / no-good 行，默认跳过 active Card/People 展示依赖。
- card/source manual apply 只处理人工确认的 active card sourceUrl 替换、卡片归档、坏抓取修复和解除依赖后的旧 reject RawPoolItem。
- People official link cleanup 只按 personId + exact URL 移除人工确认的空主页，不批量清理其它展示字段。
- 不对 `unsupported` / `over_attributed` 做自动删除或改写。
- `no_good_source` 和 `human_review` 不进入代表作品改写和卡片重聚合。
- 代表作品文案和卡片重聚合仍拆成独立 dry-run / execute 步骤。

## 与代表作品 / 卡片重聚合的关系

当前 refetch 候选里通过门禁的来源已经落库并写入 keep audit。代表作品改写历史执行文件覆盖 5 个展示面决策：4 个产品描述降级为团队/职位/共同作者口径，2 张高置信卡片改为保守归因；`bun scripts/fix/apply_product_review_decisions.ts --decisions=docs/audit-2026-06/data/exa_source_quality_review_dir/conservative_rewrite_decisions_draft.json` dry-run 复核为 `alreadyApplied=5`、`updated=0`、`cardsUpdated=0`。清理后按当前 RawPoolItem 现场重新生成的决策只剩 4 个可追溯展示影响、3 个产品描述和 2 张卡片，dry-run 复核为 `alreadyApplied=4`、`updated=0`、`cardsUpdated=0`。

卡片重聚合 top 5 已按单个人物执行：Yoshua Bengio、周明、杨植麟、闫俊杰、亚历克·拉德福德共 68 张旧卡替换为 24 张 MiMo keep/rewrite 卡；1 张 `human_review` 卡跳过，3 张 `rewrite` 卡使用 MiMo 保守改写文本。数据库内容级复核 current Card rows 与 MiMo keep/rewrite 集完全一致，`mismatchedPeople=0`；当前 dry-run 复核为 `peopleEligible=5`、`existingCards=24`、`replacementCards=24`。执行报告见 `docs/audit-2026-06/CARD_REAGGREGATION_APPLY.md`，当前复核见 `docs/audit-2026-06/CARD_REAGGREGATION_CURRENT_VERIFY.md`。
