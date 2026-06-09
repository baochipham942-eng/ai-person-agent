# 执行进度总账 (2026-06-09)

> 单一进度视图。✅=已完成验证 / 🔧=代码就绪待运维 / ⏸=需产品决策 / 📋=待办

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
- verdict 分布：keep 2149 / reject 1199 / empty_content 460 / review 311 / duplicate 157 / incomplete 2
- `export_prune_candidates.ts` 已补只读 prune 候选导出；连同 candidate live audit 后共审过 RawPoolItem 4307 条。2026-06-09 已执行 safe prune 第一批，删除 latest QA verdict 为 `duplicate` / `empty_content` / `incomplete` 的 619 条 RawPoolItem；当前 RawPoolItem 审计面 3688 条，只剩 `reject` 1199 条作为后续 prune 候选，`review` 311 条继续保留人工看。
- 结论：明确脏数据约 43%，把 review 算入风险约 50%
- `rewash_existing.ts` 已支持 `--list`、`--person`、`--limit`、`--dry-run`、断点续跑和 people 并发；默认不 prune

### 名册去重核对 (只读完成)
- 13 种子 → **11 真新增 + 2 同人需更新**
- Lilian Weng = 库内"李莲"(score40); Justin Johnson = 库内"贾斯汀·约翰逊"(score0)

### career safe fix / 卡片重聚合 / score v2 / 名册 candidate ✅
- career safe fix 已对生产 Neon 执行：合并 Cambricon Technologies / DeepSeek 各 1 个重复 Organization，去重 Christopher Manning / Noam Shazeer 的 `People.organization`，删除 Zuckerberg 1 条 exact duplicate role；后续又用 `apply_career_review_safe_fixes.ts --execute` 删除 1 个无 role / 无 People 引用的空 `chief technology officer` Organization。
- career 人工口径第一批已执行：新增 `career_review_decisions.json` 与 `apply_career_review_decisions.ts`，将 CEO position-like Organization 下 6 条 role 转回 You.com / Alphabet / Google / Microsoft，删除 Rasmussen 的空泛 professor role，并清理 Richard Socher `People.organization` 里的「首席执行官」噪声；CEO/professor 两个 position-like Organization 已删除。随后删除 5 条 `Employee @ 董事会成员` 泛化 role，清理 2 个 People.organization 噪声，并删除空 `board of directors member` Organization；又把 Daniela Amodei / Ethan Mollick / Marc Benioff / Marian Croak 的 4 条 Employee 泛化 role 更新为具体职位，并补正李开复在 Apple / CMU 的 2 条泛化履历。
- career 复核结果：Organization 622 / PersonRole 1114 / People 230；duplicateOrgClusters 0、duplicateRoleGroups 0、peopleOrganizationDuplicates 0。position-like Organization 0、vagueRoles 0、currentTitleOrgMismatches 23。
- 卡片重聚合已执行：ready 人群近 2 小时新增 327 张卡，覆盖 59 人；脚本已加 `--min-items` 默认 3，并删除 18 张薄输入误生成卡，复核 `thin=[]`。candidate 人群已用 `--candidates-only --top-n=4 --execute` 追加 41 张 source-backed 卡，11 人当前均有 5-7 张卡。
- influenceScore v2 已执行并确认产品口径：230 人重算，定义为影响力榜，权重保持 AI 原创贡献 35 / 产业生态 25 / 权威信号 20 / 学习价值 10 / 近况 10；学习价值如需独立排序，后续走派生榜，不混进主榜口径。候选池清空和 prune 第一批后均已重算，报告见 `docs/audit-2026-06/data/influence_v2_scores.json`。
- topicRanks v2 已执行：229 人、54 个 topic 更新；李莲因 Thinking Machines Lab 信息补齐进入 Agent topic #3。
- 名册落地已按 candidate 口径执行：11 个新候选写入 `status=candidate`，Lilian Weng 更新到库内「李莲」，Justin Johnson 更新到库内「贾斯汀·约翰逊」；重跑名册脚本为 0 新增 / 13 已存在 / 0 歧义。
- candidate 最小资料补全已执行：新增 `roster_enrichment.json` 与 `apply_roster_enrichment.ts`，11 个候选均已补 topics / products / officialLinks / sourceWhitelist，completeness 提到 25；重跑 enrichment 为 13 matched / 0 missing / 0 delta。
- candidate 深度 enrich 第一段已执行：新增 `apply_candidate_deep_enrichment.ts`，为 11 个 candidate 追加 19 条去重后的 RawPoolItem、19 条 QA keep、26 张 source-backed starter cards，并为 4 个有 GitHub 个人账号的 candidate 补 avatarUrl；candidate 仍保持 `status=candidate`，completeness 提到 35。
- candidate 深度 enrich 第二段已执行：新增 `fetch_candidate_live_sources.ts`，对 11 个 candidate 的 officialLinks 做真实页面抓取并回填 RawPoolItem / QAAuditLog；当前 21 条 live RawPoolItem，11 个 candidate completeness 均为 45，7 个 candidate 有可用头像。Qwen OpenGraph 占位图、Brett 个人站 logo、Tim Hugging Face social card、Aravind GitHub identicon 均未作为头像保留。
- candidate 卡片重聚合已执行：11 个 candidate 共 29 条 RawPoolItem / 29 条 QA keep，其中 live RawPoolItem 21 条；本轮在 starter cards 26 张基础上追加 41 张，当前 candidate 卡片总数 67 张，单人最低 5 张。
- candidate readiness 已导出并执行晋级：新增 `candidate_readiness.json`、`candidate_promotion.json` 与 `promote_candidate_readiness.ts`，按 raw/keep/live/cards/completeness/avatar 分桶。新增 `candidate_avatar_decisions.json` 与 `apply_candidate_avatar_decisions.ts`，为 Aravind Srinivas / Brett Adcock / Junyang Lin / Tim Brooks 补齐来源支持的真人头像后，4 人已升 `ready`；当前库内 `active=136`、`ready=94`，candidate bucket 清空。
- career 人工口径包已导出并执行到泛化角色清零：新增 `career_review_buckets.json` 与 `career_review_decisions.json`。position-like、employment_generic_role、education_generic_role 均已清空；`People.organization` 产品定义确认为“展示身份锚点 + 重要背书机构”，完整履历继续由 `PersonRole` 承载。`current_title_decisions.json` 和 `apply_current_title_decisions.ts --execute` 已执行 10 条来源支持修正，currentTitle alias 噪声已在审计层排除，剩余 mismatch 分成 18 条缺 People.organization、5 条缺 known org。
- prune safe batch 已执行：新增 `prune_raw_pool_items.ts`，默认只处理 `duplicate` / `empty_content` / `incomplete`，本轮删除 619 条 RawPoolItem；`prune_archive_safe.json` 保留被删行快照，`prune_execution_safe.json` 记录执行摘要。`reject` 1199 条保留为下一批需抽样或单独确认的候选。
- relation needs_review 包已清空：`relation_review_buckets.json` 当前 totalNeedsReview 0。
- relation 高敏复核已处理：`relation_decisions.json` 与 `apply_relation_review_decisions.ts` 支持 confirm/delete；已确认 OpenAI / DNNresearch / Anthropic / Thinking Machines / AIX / YC 等 20 条高价值关系，并删除 6 条高敏 false-positive；随后删除 27 条无共同机构证据的 Perplexity colleague 噪声；又确认 Transformer / Stanford HAI / ImageNet 7 条关系，并删除 5 条 Hinton-Transformer / Manning-Ng HAI 错边。之后继续确认 Seq2Seq / FLAN / GAN / Bahdanau attention / AlexNet 等 7 条论文关系，并删除 1 条 Barret Zoph Transformer 错边；再确认 Jason Wei-Hyung Won Chung、Lukasz Kaiser-John Schulman、三位 Turing Award 共同获奖者、John Schulman-Elon Musk 等 6 条 source-backed 关系。本轮继续确认 Jan Leike-Dario Amodei、Jan Leike-Shane Legg、Lukasz Kaiser-Geoffrey Hinton、Lukasz Kaiser-Oriol Vinyals、Quoc Le-Jeff Dean、Wojciech Zaremba-Jan Leike、Lukasz Kaiser-Wojciech Zaremba、Oriol Vinyals-Demis Hassabis、Percy Liang-Christopher Manning、Yoshua Bengio-Hugo Larochelle、Yoshua Bengio-Ruslan Salakhutdinov、Lukasz Kaiser-Quoc Le 共 12 条论文关系，删除 32 条弱 collaborator 边，并删除最终 8 条无日期 overlap 或无共享机构证据的 colleague 边。`relation_review.json` 已重新导出，当前 total 207 / trusted 78 / confirmedByRoles 129 / needsReview 0。

## 代码就绪待运维 🔧
- **冷启动白屏**：代码侧已兜住，production smoke 通过，待部署后做冷库首访实测
- **机构去重剩余**：safe 桶已处理，`org_review.json` 已导出；Stanford/NYU/CMU 子机构、Facebook/Meta 历史名、Twitter/X 改名、CAS ICT、Dalle Molle/IDSIA、IBM Research、UBC、King's College 等需逐簇裁定
- **关联人物复核**：`relation_review.json` 已导出；`needs_review` 已归零
- **Prisma 6/7 迁移**：JSON 入口已规范化，validate 已过；依赖升级和锁文件迁移留单独窗口

## 需产品决策 ⏸
- **prune reject 桶**：safe batch 已删 619 条；`prune_candidates.json` 当前只剩 1199 条 `reject` 候选和 311 条 review。下一批是否删除 reject，需要先抽样或确认更严格边界。
- **influenceScore v2 微调**：主榜口径已确认并执行；后续只讨论细粒度权重，不再阻塞清洗闭环。
- **部署**: 清洗代码上线 + 详情页缓存策略(on-demand revalidate?)
- **卡片展示替换机制**：当前继续 append-only + QA keep + topN 去重；下一步如要改，应做 generation-based 展示替换，保留旧卡历史，不做物理删卡。

## 待办 📋
- career 后续：泛化 role 已清空；currentTitle org mismatch 剩 23 条，其中 18 条缺 People.organization、5 条缺 known org，需来源证据后再自动改。
- relation 后续：needs_review 已归零；后续只需防止新抓取绕过 relation-validation。
