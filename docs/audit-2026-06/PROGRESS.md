# 执行进度总账 (2026-06-11)

> 单一进度视图。✅=已完成验证 / 🔧=代码就绪待单独运维窗口 / 🧭=已裁定口径 / ♻️=未来新增数据防回流

## 已完成 ✅

### 清洗+聚合地基 (代码已落, tsc 0 错误, 集成测试通过)
- `lib/ai/provider.ts` 多 provider 抽象 + 降级链 + 结构化输出
- `lib/utils/dedup.ts` SimHash 模糊去重
- `lib/agents/semantic-qa.ts` gemini-flash 语义打分
- `lib/agents/clean-orchestrator.ts` 三段式 cleanItems + 审计落库
- `QAAuditLog` 表 + pipeline 接入 + cardGenerator 聚合优化
- `RouterAgent` 已接入 QAAuditLog 反馈闭环：路由前读取近 90 天来源质量，低质可选源自动降权/跳过；fetch 阶段按 priority 收紧 `maxResults`
- `scripts/enrich/regenerate_cards.ts` 已补卡片重聚合入口并执行写库：默认 dry-run,按最新 QAAuditLog keep 过滤 RawPoolItem,支持 `--list`/`--person`/`--top-n`/`--min-items`/`--include-candidates`/`--candidates-only`/`--execute`
- `savePersonRoles()` 已补 career 入口规范化：机构 alias、无 QID 查找/创建、无机构 P39 跳过、Employee 不覆盖具体职位；`audit_career_normalization.ts` 与 `apply_career_normalization_safe.ts` 已补并执行 safe fix
- commit `9638977`
- 追加验证：`bunx tsc --noEmit` 通过

### 工具链与无关项目清理
- ESLint 工具链从越界的 ESLint 10 / TypeScript 6 调回兼容区间：ESLint 9.39.4 / TypeScript 5.9.3；`bun run lint` 已从加载崩溃恢复为真实 lint 结果。
- `public/coupon/`、`proxy/public/coupon/`、`public/coupon.zip`、`public/coupon 2.zip` 已删除，`proxy/index.js` 的 `/coupon` 本地静态路由已移除；代码侧无 coupon 路由/页面残留，文档仅保留删除记录。

### 批量数据修复 (已对生产 Neon 执行 + 验证)
- 机构 667→641 (删 34 冗余, OpenAI Foundation→OpenAI 等)
- 关系 297→286 (删 11 幻觉)
- 履历日期 7 条修复; 译名 4 条
- 回滚备份: `backup-2026-06-07.json`
- commit `734447c`
- ⚠️ 详情页 ISR(revalidate=3600) 1 小时内自动刷新; directory API 已显示新值

### 全量重洗审计 (非破坏性完成)
- ready 人员 83 个，其中 67 个有 RawPoolItem、16 个无原始材料可审
- `QAAuditLog` 已覆盖全部 67 个有源 ready 人员，共 4278 行
- 当时 verdict 分布：keep 2149 / reject 1199 / empty_content 460 / review 311 / duplicate 157 / incomplete 2
- `export_prune_candidates.ts` 已补只读 prune 候选导出；连同 candidate live audit 后共审过 RawPoolItem 4307 条。2026-06-09 safe prune 第一批删除 latest QA verdict 为 `duplicate` / `empty_content` / `incomplete` 的 619 条 RawPoolItem；当时进入后续判断的 reject/review 已在后续 strict bucket、manual prune、refetch 与 review manual apply 中处理到 `reviewUnresolvedRows=0` / `dependencyRows=0`。
- 结论：明确脏数据约 43%，把 review 算入风险约 50%
- `rewash_existing.ts` 已支持 `--list`、`--person`、`--limit`、`--dry-run`、断点续跑和 people 并发；默认不 prune

### 名册去重核对 (只读完成)
- 13 种子 → **11 真新增 + 2 同人需更新**
- Lilian Weng = 库内"李莲"(score40); Justin Johnson = 库内"贾斯汀·约翰逊"(score0)

### career safe fix / 卡片重聚合 / score v2 / 名册 candidate ✅
- career safe fix 已对生产 Neon 执行：合并 Cambricon Technologies / DeepSeek 各 1 个重复 Organization，去重 Christopher Manning / Noam Shazeer 的 `People.organization`，删除 Zuckerberg 1 条 exact duplicate role；后续又用 `apply_career_review_safe_fixes.ts --execute` 删除 1 个无 role / 无 People 引用的空 `chief technology officer` Organization。
- career 人工口径第一批已执行：新增 `career_review_decisions.json` 与 `apply_career_review_decisions.ts`，将 CEO position-like Organization 下 6 条 role 转回 You.com / Alphabet / Google / Microsoft，删除 Rasmussen 的空泛 professor role，并清理 Richard Socher `People.organization` 里的「首席执行官」噪声；CEO/professor 两个 position-like Organization 已删除。随后删除 5 条 `Employee @ 董事会成员` 泛化 role，清理 2 个 People.organization 噪声，并删除空 `board of directors member` Organization；又把 Daniela Amodei / Ethan Mollick / Marc Benioff / Marian Croak 的 4 条 Employee 泛化 role 更新为具体职位，并补正李开复在 Apple / CMU 的 2 条泛化履历。
- career 复核结果：Organization 613 / PersonRole 1114 / People 230；duplicateOrgClusters 0、duplicateRoleGroups 0、peopleOrganizationDuplicates 0。position-like Organization 0、vagueRoles 0、currentTitleOrgMismatches 0。
- 机构 review 已执行两批：第一批新增 `org_review_decisions_2026_06_10.json` 与 `apply_org_review_decisions.mjs`，合并 Stanford University / Carnegie Mellon University / Meta / CAS ICT / Dalle Molle Institute / IBM / King's College, Cambridge 7 个确定性重复簇，9 条 PersonRole 转指到 canonical，7 个 People.organization 展示值同步；随后把 Geoffrey Hinton 的 `Student @ King's College, Cambridge` 改为 `Undergraduate Student`。第二批新增 `org_review_decisions_second_2026_06_10.json`，合并 Stanford HAI 短名/全名重复、把 `Stanford University, Sequoia Professor` 转回 Stanford University，并统一 6 个 Facebook/FAIR/Meta Superintelligence Labs 展示标签；career audit 再次归零。
- 卡片重聚合已执行：ready 人群近 2 小时新增 327 张卡，覆盖 59 人；脚本已加 `--min-items` 默认 3，并删除 18 张薄输入误生成卡，复核 `thin=[]`。candidate 人群已用 `--candidates-only --top-n=4 --execute` 追加 41 张 source-backed 卡，11 人当前均有 5-7 张卡。
- influenceScore v2 已执行并确认产品口径：230 人重算，定义为影响力榜，权重保持 AI 原创贡献 35 / 产业生态 25 / 权威信号 20 / 学习价值 10 / 近况 10；学习价值如需独立排序，后续走派生榜，不混进主榜口径。候选池清空和 prune 第一批后均已重算，报告见 `docs/audit-2026-06/data/influence_v2_scores.json`。
- topicRanks v2 已执行：229 人、54 个 topic 更新；李莲因 Thinking Machines Lab 信息补齐进入 Agent topic #3。
- 名册落地已按 candidate 口径执行：11 个新候选写入 `status=candidate`，Lilian Weng 更新到库内「李莲」，Justin Johnson 更新到库内「贾斯汀·约翰逊」；重跑名册脚本为 0 新增 / 13 已存在 / 0 歧义。
- candidate 最小资料补全已执行：新增 `roster_enrichment.json` 与 `apply_roster_enrichment.ts`，11 个候选均已补 topics / products / officialLinks / sourceWhitelist，completeness 提到 25；重跑 enrichment 为 13 matched / 0 missing / 0 delta。
- candidate 深度 enrich 第一段已执行：新增 `apply_candidate_deep_enrichment.ts`，为 11 个 candidate 追加 19 条去重后的 RawPoolItem、19 条 QA keep、26 张 source-backed starter cards，并为 4 个有 GitHub 个人账号的 candidate 补 avatarUrl；candidate 仍保持 `status=candidate`，completeness 提到 35。
- candidate 深度 enrich 第二段已执行：新增 `fetch_candidate_live_sources.ts`，对 11 个 candidate 的 officialLinks 做真实页面抓取并回填 RawPoolItem / QAAuditLog；当前 21 条 live RawPoolItem，11 个 candidate completeness 均为 45，7 个 candidate 有可用头像。Qwen OpenGraph 占位图、Brett 个人站 logo、Tim Hugging Face social card、Aravind GitHub identicon 均未作为头像保留。
- candidate 卡片重聚合已执行：11 个 candidate 共 29 条 RawPoolItem / 29 条 QA keep，其中 live RawPoolItem 21 条；本轮在 starter cards 26 张基础上追加 41 张，当前 candidate 卡片总数 67 张，单人最低 5 张。
- candidate readiness 已导出并执行晋级：新增 `candidate_readiness.json`、`candidate_promotion.json` 与 `promote_candidate_readiness.ts`，按 raw/keep/live/cards/completeness/avatar 分桶。新增 `candidate_avatar_decisions.json` 与 `apply_candidate_avatar_decisions.ts`，为 Aravind Srinivas / Brett Adcock / Junyang Lin / Tim Brooks 补齐来源支持的真人头像后，4 人已升 `ready`；当前库内 `active=136`、`ready=94`，candidate bucket 清空。
- career 人工口径包已导出并执行到泛化角色清零：新增 `career_review_buckets.json` 与 `career_review_decisions.json`。position-like、employment_generic_role、education_generic_role 均已清空；`People.organization` 产品定义确认为“展示身份锚点 + 重要背书机构”，完整履历继续由 `PersonRole` 承载。`current_title_decisions.json` 与后续两批 2026-06-10 决策均已执行，currentTitle alias 噪声已在审计层排除，最终 currentTitle mismatch 归零。
- currentTitle 第二批和 final tail 人工裁定已执行：`current_title_decisions_remaining_2026_06_10.json` 写入 19 条，`current_title_decisions_final_tail_2026_06_10.json` 写入最后 4 条；复跑 dry-run 分别为 `alreadyApplied=19` / `updated=0` 和 `alreadyApplied=4` / `updated=0`。`audit_career_normalization.ts` 复核 currentTitle mismatch 从 23 降到 0。
- prune safe batch 已执行：新增 `prune_raw_pool_items.ts`，默认只处理 `duplicate` / `empty_content` / `incomplete`，本轮删除 619 条 RawPoolItem；`prune_archive_safe.json` 保留被删行快照，`prune_execution_safe.json` 记录执行摘要。当时保守留下的 reject/review 已在后续批次处理完成，不再是当前候选。
- Exa/Tavily refetch hard tail 已人工裁定并执行：23 条最终队列中，Yann LeCun LinkedIn 本人帖和吴恩达 Medium 本人文章保留，其余 21 条 RawPoolItem 删除；已写入 23 条 `QAAuditLog.stage=manual_hard_tail` 审计，post-verify 只剩 2 条保留 RawPoolItem，审计日志为 keep 2 / reject 21。
- 保守改写裁定已复核：历史执行文件 `conservative_rewrite_decisions_draft.json` 覆盖 5 个展示面决策、4 个产品描述和 2 张卡片，dry-run 返回 `alreadyApplied=5` / `updated=0` / `cardsUpdated=0`；清理后按当前 RawPoolItem 现场重新生成的 `/tmp/conservative_rewrite_decisions_current.json` 只剩 4 个可追溯展示决策、3 个产品描述和 2 张卡片，dry-run 返回 `alreadyApplied=4` / `updated=0` / `cardsUpdated=0`。当前无待执行保守改写。
- refetch 后 top 5 卡片重聚合已按单个人物执行：Yoshua Bengio / 周明 / 杨植麟 / 闫俊杰 / 亚历克·拉德福德共 68 张旧卡替换为 24 张 MiMo keep/rewrite 卡；1 张 human_review 跳过，3 张 rewrite 使用保守改写文本。数据库内容级复核为 expected 24 / actual 24 / mismatchedPeople 0。
- 卡片 generation 展示替换机制已完成：`Card` 已增加 `generationId` / `isActive` / `archivedAt`，生产 Neon 已执行 additive ALTER；人物详情页默认只展示 `isActive=true` 的卡片。`apply_card_reaggregation_plan.mjs` 默认从物理删除改为 archive-active，`regenerate_cards.ts` / `cardGenerator.ts` 新写入卡片带 generationId，refresh/fix-qid/去重脚本改为归档激活卡。验证：Prisma validate/generate、`tsc --noEmit`、DB dry-run/execute、周明重聚合 dry-run、`regenerate_cards --list --limit=1` 均通过。
- reject/review 第二批严格桶已执行：重导出后 `reject=924` / `review=306`，经 `analyze_prune_reject_review_buckets.mjs` 分出 266 条 strict delete candidates，并由 `apply_prune_reject_review_buckets.mjs --execute` 删除 RawPoolItem；post-verify 266/266 missing。随后十六批人工 prune 共删除 449 条主体错配、非 AI、低信息、失败抓取或机构级 RawPoolItem，并写入 `manual_prune_tail` 审计。该阶段曾留下 515 条进入人工复核、补源或低信息保留判断；这些尾巴已在后续 prune-tail refetch、manual apply、keep 审计和 display cleanup 中处理完成，最终 `reviewUnresolvedRows=0` / `dependencyRows=0`。第八批起由 `build_prune_review_manual_decisions.mjs` 生成，已跳过 active Card.sourceUrl 和 People display/source JSON 依赖；第十七批候选生成为 0，说明这套保守判删规则已基本见底。
- prune 尾巴补源已完成：新增 `build_prune_tail_refetch_queue.mjs`，把剩余 515 条 `reject/review` 尾巴生成 Tavily/Exa 可复用 refetch 队列。515 条已全量用 Tavily advanced + MiMo 完成二十六批 review，人工 curation 移除 Karpathy 污染页、Alec 弱二级/社交源、Wikipedia、LinkedIn/X、Digg、Google Scholar、SingjuPost / Musixmatch / Happyscribe / Podwise / Y2Doc transcript 聚合、speaker bureau、Substack 存档页、火山引擎社区传记、INABR/凤凰网/IDC头条/新浪二手稿、DeepAI 聚合 profile、MBA智库百科、低权威评论/博客/转录站，以及不能证明具体 claim 的个人主页/背景报道/背景论文/泛访谈/视频页/背景播客页/学习笔记、低权威 newsletter/聚合站、背景争议文、旧职位公告/泛视频/剪辑视频、维基型二级页等 191 个不放行来源；最终 345 个 selected source 通过 apply 门禁，其中新增 205 条 RawPoolItem + 205 条 QAAuditLog keep，另 140 条既有来源确认已有 keep audit。post-verify 显示第一批 19/19、第二批 18/18、第三批 8/8、第四批 18/18、第五批 25/25、第六批 14/14、第七批 12/12、第八批 24/24、第九批 20/20、第十批 11/11、第十一批 5/5、第十二批 8/8、第十三批 4/4、第十四批 17/17、第十五批 13/13、第十六批 6/6、第十七批 15/15、第十八批 18/18、第十九批 15/15、第二十批 14/14、第二十一批 18/18、第二十二批 20/20、第二十三批 2/2、第二十四批 9/9、第二十五批 4/4、第二十六批 8/8 selected source 均已存在且 keep audit 已存在。随后对原始 latest QA verdict 为 `reject` 且 refetch 后仍停在 `human_review` / `no_good_source` 的 96 条做人工裁定：跳过 7 条 active Card.sourceUrl 或 People 展示字段依赖，执行删除 89 条低质/错挂 RawPoolItem，并写入 89 条 `QAAuditLog.stage=manual_prune_tail_after_refetch` reject 审计；post-verify 显示 89/89 target 已 missing。再对 7 条依赖项做卡片/来源人工处置：归档 Sundar 1 张错源卡和 Greg 3 张低信息 X 卡，Mustafa 卡片改挂到 Inflection AI keep 来源，Chris Olah / Alec Radford 两条 GitHub profile RawPoolItem 用 GitHub Users API 修复并写 keep 审计，解除依赖后删除 5 条旧 reject RawPoolItem。之后导出 124 条原始 `review` unresolved：41 条 review no-good、37 条 review low-info、1 条 dependency low-info、7 条 thin/mismatch、5 条 residual low-value、3 条 low-context X、1 条 display-link cleanup 均已删除并完成 post-verify；4 条 keep-direct、3 条 dependency keep-direct、7 条 GitHub repo repair、5 条 remaining dependency keep、10 条 X direct keep 均已写入 keep 审计；Alec 空主页 officialLink 已从 `People.officialLinks` 移除。最终重导出显示 `existingRawPoolItems=31`、`latestKeepRowsExcluded=29`、`reviewUnresolvedRows=0`、`dependencyRows=0`。
- 残留 RawPoolItem 删除复扫已执行（2026-06-11）：按旧 remediation/delete 决策重新对当前 DB 做存在性与展示依赖检查，追加删除 60 条仍存活的坏抓取、错人、索引页、第三方产品测评、课程广告、公司/团队内容过度归因 RawPoolItem。其中 16 条来自旧 safe target 复扫，12 条来自残留错挂/坏抓取人工决策，31 条来自 over-attributed/低质来源人工决策，1 条 Quoc Le Fulbright 坏抓取在确认已有更好 keep 替代后删除。人工批次写入 44 条 reject 审计；post-verify 显示三份新增人工决策目标均已 missing，safe target 当前 `existingTargets=0`。最终旧删除命中只剩 8 条：4 条因 active Card/People JSON 依赖跳过，4 条因当前内容命中人物且 latest keep 保留；这些不作为本轮删除遗留。详情见 `RESIDUAL_RAWPOOL_DELETE_CLOSEOUT.md`。
- relation needs_review 包已清空：`relation_review_buckets.json` 当前 totalNeedsReview 0。
- relation 高敏复核已处理：`relation_decisions.json` 与 `apply_relation_review_decisions.ts` 支持 confirm/delete；已确认 OpenAI / DNNresearch / Anthropic / Thinking Machines / AIX / YC 等 20 条高价值关系，并删除 6 条高敏 false-positive；随后删除 27 条无共同机构证据的 Perplexity colleague 噪声；又确认 Transformer / Stanford HAI / ImageNet 7 条关系，并删除 5 条 Hinton-Transformer / Manning-Ng HAI 错边。之后继续确认 Seq2Seq / FLAN / GAN / Bahdanau attention / AlexNet 等 7 条论文关系，并删除 1 条 Barret Zoph Transformer 错边；再确认 Jason Wei-Hyung Won Chung、Lukasz Kaiser-John Schulman、三位 Turing Award 共同获奖者、John Schulman-Elon Musk 等 6 条 source-backed 关系。本轮继续确认 Jan Leike-Dario Amodei、Jan Leike-Shane Legg、Lukasz Kaiser-Geoffrey Hinton、Lukasz Kaiser-Oriol Vinyals、Quoc Le-Jeff Dean、Wojciech Zaremba-Jan Leike、Lukasz Kaiser-Wojciech Zaremba、Oriol Vinyals-Demis Hassabis、Percy Liang-Christopher Manning、Yoshua Bengio-Hugo Larochelle、Yoshua Bengio-Ruslan Salakhutdinov、Lukasz Kaiser-Quoc Le 共 12 条论文关系，删除 32 条弱 collaborator 边，并删除最终 8 条无日期 overlap 或无共享机构证据的 colleague 边。`relation_review.json` 已重新导出，当前 total 207 / trusted 78 / confirmedByRoles 129 / needsReview 0。
- 生产部署已完成：Vercel production deployment `dpl_3gS5j1pjLMTHTRVmC3a45PTxTmLy` 为 READY，`ai-person-agent.vercel.app` 与 FC 自定义域 `people.llmxy.xyz` 首页均返回 200 且 etag 同为 `a6d7e980b0601aa6f07292c2e446c3e6`；两域名 `/api/person/directory?limit=3` 均返回 `pagination.total=230`、`stats.totalPeople=230`。本地 `npm run build` / `npm run deploy:build` 均通过，`.vercelignore` 已排除 `docs/` 等大体积非运行文件。

## 代码就绪待单独运维窗口 🔧
- **冷启动白屏**：代码侧已兜住且已上线，生产首页和 directory API smoke 通过；冷库自然首访仍可后续回访，但不再阻塞本轮清洗闭环。
- **机构去重剩余**：两批 review 已执行，`org_review_after_second_decisions.json` 当前覆盖 9 个已裁定保留边界簇、36 条 Organization 候选、167 条 PersonRole 引用、14 个 People.organization 展示值；导出脚本已过滤合并后只剩单个 canonical 的簇和无引用机构噪声，并把剩余簇说明改为保留分开的产品口径。NYU/CMU/Stanford 子机构、Twitter/X 历史名、Facebook/FAIR/Meta AI/MetaMind、IBM Research、UBC、King's College NZ 等不再自动合并。
- **关联人物复核**：`relation_review.json` 已导出；`needs_review` 已归零
- **Prisma 6/7 迁移**：JSON 入口已规范化，validate 已过；依赖升级和锁文件迁移留单独窗口

## 已裁定口径 🧭
- **prune reject/review 尾巴**：safe batch、hard-tail manual、第二批 strict reject、十六批 manual prune、515 条 refetch、refetch 后 94 条 reject 删除、2 条 GitHub profile 修复、原始 `review` unresolved 124 条人工裁定，以及 2026-06-11 残留 RawPoolItem 60 条复扫删除均已执行；当前 `reviewUnresolvedRows=0`、`dependencyRows=0`。
- **prune reject/review 尾巴补源**：515 条 refetch 队列已全量处理完成；345 个 source 已 additive 写入/确认，refetch 后低风险 reject 尾巴已删除 94 条，2 条 GitHub profile 坏抓取已修复为 keep，原始 review 尾巴已清零；2026-06-11 复扫确认 refetch apply 当前无新增待写 selected source。后续不再按旧 sourceQueries 批量重抓。
- **机构边界剩余**：两批已裁定；NYU/CMU/Stanford 子机构、Twitter/X 历史名、Facebook/FAIR/Meta AI/MetaMind、IBM Research、UBC、King's College NZ 等按展示口径保留分开，后续只防止新抓取重新写入重复或职位型机构。
- **influenceScore v2 微调**：主榜口径已确认并执行；后续只讨论细粒度权重，不再阻塞清洗闭环。
- **卡片展示替换机制**：已完成 generation-based 展示替换。后续新审卡批次按 archive-active 策略推进，旧卡保留历史，前台只读激活卡。

## 未来新增数据防回流 ♻️
- 已补 `npm run audit:content-guard` 作为只读防回流关卡，覆盖 prune review unresolved、career normalization、relation needs_review、card reaggregation 和保守改写队列。
- 已补新人入库版本化口径：`CONTENT_REVIEW_POLICY.json` 统一 candidate 入口、completeness floor、readiness/promotion 阈值，`CANDIDATE_INTAKE_POLICY.md` 写清 seed/enrichment checklist 与弱来源边界。
- 已补 `npm run audit:newcomer-preflight` 作为新人执行前只读关卡：静态检查 roster seed/enrichment，dry-run 名册导入和资料补全，导出 readiness，dry-run promotion，并串起 `audit:content-guard`。
- 已补 `npm run audit:post-ingest-guard` 作为新增数据写入后的只读关卡：刷新 prune/career/relation/card 当前审计产物，dry-run 保守改写，再跑 `audit:content-guard`；它不抓取、不调模型、不写业务表。
- prune 后续：refetch 队列与原始 reject/review unresolved 已清零；新抓取/新生成后先跑 guard，发现回升再开小批 review。
- career/relation/org 后续：泛化 role、position-like org、currentTitle org mismatch 和 relation needs_review 均已清空；新增数据继续守住 normalization、validation 和 org boundary review。
