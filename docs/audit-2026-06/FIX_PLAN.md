# AI 人物库 · 带优先级的修复行动清单

> 生成日期: 2026-06-09 · 单一行动视图
> 本文档 = [PRODUCT_AUDIT_AND_ROADMAP.md](./PRODUCT_AUDIT_AND_ROADMAP.md) 的优先级 × [PROGRESS.md](./PROGRESS.md) 的当前状态，合一为一张可执行清单。
> 问题底账见 [AUDIT_FINDINGS.md](./AUDIT_FINDINGS.md)（全库 change-list）。

## 状态图例

| 标记 | 含义 |
|------|------|
| ✅ | 已完成并验证 |
| 🔧 | 代码就绪，待运维执行 |
| ⏸ | 需产品决策才能推进 |
| 📋 | 待办 |
| 🔁 | 会话结束时仍在后台运行，**当前实际状态需复核** |

---

## 一、总览（按优先级）

| # | 任务 | 级别 | 状态 | 工作量 | 凭证 |
|---|------|------|------|--------|------|
| 1 | 修冷启动白屏（Neon 暂停 + SSR 注水 0） | 🔴 P0 | 🔧 代码已修，production smoke 已过，待部署冷库实测 | 0.5d | `ResearcherDirectory.tsx` / `app/page.tsx` |
| 2 | 修 "OpenAI基金会" 全库错译 | 🔴 P0 | ✅ 已清除（含 Tesla / 开放人工智能基金会残留） | 0.5d | DB 复核 0 残留 |
| 3 | 机构去重合并 | 🔴 P0 | ✅ safe 桶已追加 / 🔧 review 包已导出 | — | Organization 628 / `org_review.json` |
| 4 | scripts/ 治理（159 脚本归档） | 🔴 P0 | ✅ 根目录脚本已治理 | 0.5d | `scripts/archive/` |
| 5 | 修实习经历日期（end=now / 零时长） | 🟠 P1 | ✅ | 0.5d | `734447c`（7 条）|
| 6 | 删关联人物幻觉关系 | 🟠 P1 | ✅ 批量 / ✅ 校验闸 + needsReview 归零 | — | needsReview 0 |
| 7 | LLM Provider 抽象层 + 语义清洗地基 | 🟠 P1 | ✅ | 3-5d | `9638977` |
| 8 | 全量重洗 83 人（写 QAAuditLog） | 🟠 P1 | ✅ 已完成（67/67 有源 ready 已落库；16 人无 RawPoolItem） | — | `QAAuditLog` 4278 行 |
| 9 | 名册重盘（补新人 + 重抓现状） | 🟠 P1 | ✅ candidate 落库 + live fetch + 卡片基础覆盖 + 全部晋级 ready | — | active 136 / ready 94 / candidate 0 |
| 10 | influenceScore 重算 | 🟠 P1 | ✅ v2 已执行 | — | 230 人重算 / `influence_v2_scores.json` |
| 11 | career 规范化（currentTitle 错位） | 🟡 P2 | ✅ 泛化 role 已清空 / 📋 currentTitle mismatch 待裁定 | — | duplicate org/role/position-like/vague role 归零 |
| 12 | 移动端 pill 折行 / favicon 破图 / 视频缩略图 | 🟡 P2 | ✅ 代码已修，浏览器截图 smoke 已过 | — | `ResearcherDirectory.tsx` / `VideoSection.tsx` |
| 13 | Prisma 6 升级 + JSON 字段规范化 | 🟡 P2 | 🔧 JSON 入口已规范化 / Prisma 6 评估已过，依赖迁移待单独窗口 | — | `person-json.ts` |

---

## 二、🔴 P0 — 立即见效（不依赖大重构）

### 1. 冷启动白屏 🔧
- **问题**：真实用户首访显示「0 位研究者」+ 空骨架屏，持续数秒（Neon 免费版闲置暂停 + 头部计数 SSR 注水成 0）。最伤体验。
- **已做（2026-06-07）**：`ResearcherDirectory.tsx` 首屏无数据时不再把人数 fallback 成 0；头部显示「加载中」，结果区显示「正在加载研究者」。API 非 2xx 会抛错，页面显示失败态和「重试」按钮，不再把错误误渲染成“未找到匹配”。
- **production smoke（2026-06-07）**：补强 `app/page.tsx` 的 Suspense fallback，生产 HTML 首屏已有「AI 人物库 / 正在加载研究者」，不再是纯 spinner，也未出现「0 位研究者」。本地 production 构建后验证 `/`、`/api/person/directory?limit=3`、人物详情页均返回 200；目录 API `total=219`，详情页仍能透出 4 条 `needs_review` 关系状态。
- **standalone 包验证（2026-06-07）**：当前 `next.config.ts` 使用 `output: 'standalone'`，已显式设置 `outputFileTracingRoot`，构建入口回到 `.next/standalone/server.js`。`npm run deploy:build` 已确认会把 `.next/static` 和 `public/` 复制进 standalone 包；本地真实入口验证 `/`、`/_next/static/chunks/123doanyjnwwq.css`、`/avatars/c7d6d3e3.webp`、`/api/person/directory?limit=3` 均为 200，浏览器 390×844 可见 219 人列表，无横向溢出。
- **待部署实测**：冷库状态下首屏不出现「0 位研究者」，无空骨架长驻。Neon 预热 / 付费档仍是运维层优化，代码侧已先兜住错误体验。
- **凭证**：`npm run build` 通过；production smoke 验证 `/`、`/api/person/directory?limit=3`、人物详情页均为 200，首页 HTML 含「AI 人物库 / 正在加载研究者」且不含「0 位研究者」。

### 2. "OpenAI基金会" 全库错译 ✅
- **问题**：所有 OpenAI 显示为「OpenAI基金会」、Tesla 显示「特斯拉公司」，机翻直译污染全库。
- **已做**：批量标准化，机构 **667→641**（删 34 冗余，含 OpenAI Foundation→OpenAI 等）。commit `734447c`，回滚备份 `backup-2026-06-07.json`。
- **注意**：详情页 ISR `revalidate=3600`，1 小时内自动刷新；directory API 已显示新值。
- **复核结果（2026-06-07）**：✅「OpenAI基金会」全库已无残留；✅「特斯拉公司」已标准化为「特斯拉」；✅ Elon Musk 残留的「开放人工智能基金会」已标准化为 OpenAI。回扫 `People.organization` / `People.currentTitle` / `Organization.nameZh` 中 `OpenAI基金会`、`开放人工智能基金会`、`特斯拉公司` 均为 0。另：「苹果公司」「网景公司」「麦肯锡公司」「字母表公司(Alphabet)」「Linux 基金会」等属正常中文译名，**不算错译，勿误删**；真正要清的是英文名硬加「公司/基金会」的（如 Y Combinator公司 / Loopt公司 / Reddit公司 / Mozilla公司）。

### 3. 机构去重合并 ✅ 部分 / 🔧 剩余
- **已做**：21 个高确定簇已合并（含在 `734447c`）。
- **追加执行（2026-06-07）**：safe 桶又合并/删除 13 个冗余 Organization，11 条 PersonRole 转指到 canonical，0 个 People.organization 数组受影响。覆盖：Google 明确别名 4 个、Google Brain 别名 1 个、Qualcomm 法人变体 2 个、CIFAR 全称变体 1 个、USTC 英文变体 1 个、Econet / Future of Humanity Institute / Leverhulme CFI / 佛罗伦萨美院各 1 个。`University of Science and Technology of China (USTC)` 已补 `nameZh=中国科学技术大学`。
- **当前状态**：Organization 总数 **628**；本轮被处理的 13 个旧机构名及其 PersonRole 回扫均为 0。
- **保留边界**：Google / Google Brain / Google Research / Google Cloud / Google DeepMind / Alphabet 不是单纯重复，仍分开；Stanford/NYU/CMU 子机构、Facebook/Meta 历史名、Twitter/X 改名口径、CAS ICT / Dalle Molle 这类 canonical 缺失项继续留在 needs_review。
- **复核清单（2026-06-07）**：新增 `scripts/audit/export_org_review.ts`，只读导出 `docs/audit-2026-06/data/org_review.json`。当前 review 包覆盖 10 个边界簇、49 条 Organization 候选、170 条 PersonRole 引用、18 个 People.organization 展示值。
- **待办** 🔧：对 `org_review.json` 里的 Stanford / NYU / CMU 子机构、Facebook/Meta 历史名、Twitter/X 改名、CAS ICT、Dalle Molle/IDSIA、IBM Research、UBC、King's College 逐簇拍板；确认 safe 的再合并，历史名和子机构边界继续保留。

### 4. scripts/ 治理 📋
- **问题**：159 个脚本失控。
- **搬迁前复核（2026-06-07）**：已跟踪脚本里根目录 `.ts` 有 35 个；规范目录已有 `audit/` 32 个、`enrich/` 58 个、`fix/` 13 个、`tools/` 18 个。本轮工作区同时存在多份 untracked 新脚本，不能直接批量搬家，否则会把未确认现场卷进去。
- **已做（2026-06-07）**：新增 `scripts/README.md`，标出常用入口、目录归属和归档规则；33 个无直接引用的 git tracked 根目录历史脚本已移入 `scripts/archive/`；3 个 untracked 根目录修复脚本也已归档。根目录当前只保留 README 中仍出现的课程测试入口 `test_courses.ts`、`test_courses_free.ts`。

---

## 三、🟠 P1 — 数据质量 & 地基

### 5. 实习/履历日期修复 ✅
- **已做**：履历日期 7 条修复（end<start、零时长、实习 end=now→null）。commit `734447c`。

### 6. 关联人物幻觉关系 ✅ 批量 / 🔧 校验闸
- **已做**：关系 **297→286**，删 11 条 LLM 编造关系（如 Karpathy↔Hassabis/Hinton 误标同事）。commit `734447c`；另 26 条 uncertain 保留不动。
- **新增校验闸（2026-06-07）**：`lib/agents/relation-validation.ts` 已接入 `fetch_related_people.ts`、`enrich_relations_ai.ts`、`enrich_relations_exa.ts`、`enrich_relations_perplexity.ts`。Wikidata 结构化源可直接通过；AI/Exa/Perplexity 写库前必须有可验证的角色重叠、共同创始证据或 source-backed 文本/citation。另修正 `enrich_relations_ai.ts` 中 advisor/advisee 入库方向，避免新关系继续反向写入。
- **复核清单（2026-06-07）**：新增 `scripts/audit/export_relation_review.ts`，用 Neon raw SQL 只读导出 `docs/audit-2026-06/data/relation_review.json`。当前 286 条关系里：Wikidata trusted 78 条，履历证据可确认 77 条，needs_review 131 条；needs_review 分布为 colleague 35 / collaborator 70 / cofounder 21 / advisor 5。
- **状态字段（2026-06-07）**：`PersonRelation` 已新增 `reviewStatus` / `evidenceUrl` / `evidenceNote`，并用 `scripts/fix/backfill_relation_review_status.ts` 回填全库：trusted 78 / confirmed 77 / needs_review 131。新关系写入脚本会跟随校验结果填状态；详情页关联人物对 `needs_review` 用弱化标签显示。
- **高敏复核（2026-06-09）**：新增 `docs/audit-2026-06/relation_decisions.json` 和 `scripts/fix/apply_relation_review_decisions.ts`，基于 OpenAI launch post、DNNresearch acquisition、Anthropic、Thinking Machines、AIX Ventures、YC mentor、Karpathy advisor、DeepMind founders、Hugging Face investor 等来源执行 confirm/delete。`export_relation_review.ts` 已改为尊重 DB `reviewStatus`；该阶段重导出后 total 280 / trusted 78 / confirmedByRoles 97 / needsReview 105，高敏 advisor/cofounder bucket 已清空。
- **弱 colleague 清理（2026-06-09）**：对 28 条 `colleague_no_shared_org` 逐条复核，删除 27 条 Perplexity 弱关系，保留 1 条 Exa 关系；重导出后 total 253 / trusted 78 / confirmedByRoles 97 / needsReview 78。该阶段 needsReview 分布：collaborator_publication_claim 35 / collaborator_project_claim 35 / colleague_same_org_dates_missing 7 / colleague_no_shared_org 1。
- **证据小批次（2026-06-09）**：基于 arXiv Transformer 作者表、Stanford HAI 说明、ImageNet 论文记录确认 7 条 collaborator，并删除 5 条 Hinton-Transformer / Manning-Ng HAI 错边。该阶段重导出后 total 248 / trusted 78 / confirmedByRoles 104 / needsReview 66。
- **证据小批次第二段（2026-06-09）**：基于 Seq2Seq、Scaling Instruction-Finetuned Language Models、GAN、Bahdanau attention、AlexNet 的公开论文记录确认 7 条 collaborator，并删除 1 条 Barret Zoph Transformer 错边。重导出后 total 247 / trusted 78 / confirmedByRoles 111 / needsReview 58。该阶段 needsReview 分布：collaborator_publication_claim 18 / collaborator_project_claim 32 / colleague_same_org_dates_missing 7 / colleague_no_shared_org 1。
- **证据小批次第三段（2026-06-09）**：基于 FLAN / PPO / Turing Award / OpenAI launch 等公开来源确认 6 条 source-backed 关系。重导出后 total 247 / trusted 78 / confirmedByRoles 117 / needsReview 52。该阶段 needsReview 分布：collaborator_publication_claim 16 / collaborator_project_claim 28 / colleague_same_org_dates_missing 7 / colleague_no_shared_org 1。
- **证据小批次第四段（2026-06-09）**：基于 arXiv / Nature / JMLR 作者表确认 10 条论文关系，并删除 24 条公司合作、公开信共同署名、泛泛同台等弱 collaborator 边。重导出后 total 223 / trusted 78 / confirmedByRoles 127 / needsReview 18。该阶段 needsReview 分布：collaborator_publication_claim 8 / collaborator_project_claim 2 / colleague_same_org_dates_missing 7 / colleague_no_shared_org 1。
- **证据小批次第五段（2026-06-09）**：基于 arXiv 作者表确认 Yoshua Bengio-Ruslan Salakhutdinov、Lukasz Kaiser-Quoc Le 2 条论文关系，并删除 8 条剩余弱 collaborator 边。重导出后 total 215 / trusted 78 / confirmedByRoles 129 / needsReview 8。该阶段 needsReview 只剩 colleague_same_org_dates_missing 7 / colleague_no_shared_org 1。
- **colleague 最终清理（2026-06-09）**：删除最终 8 条无日期 overlap 或无共享机构证据的 colleague 边。重导出后 total 207 / trusted 78 / confirmedByRoles 129 / needsReview 0；`relation_review_buckets.json` 当前 totalNeedsReview 0。
- **待办** 🔧：relation needs_review 已归零；后续重点是守住 `relation-validation`，避免新抓取重新写入弱边。

### 7. LLM 抽象层 + 语义清洗地基 ✅
- **已做**（commit `9638977`，tsc 0 错误 + 集成测试通过）：
  - `lib/ai/provider.ts` 多 provider 抽象 + 降级链 + 结构化输出
  - `lib/utils/dedup.ts` SimHash 模糊去重
  - `lib/agents/semantic-qa.ts` gemini-flash 语义打分（后续并发池提速 3-4×，commit `a6f2377`）
  - `lib/agents/clean-orchestrator.ts` 三段式 cleanItems + 审计落库
  - `QAAuditLog` 表 + pipeline 接入 + cardGenerator 聚合优化
- **新 key 已验证**（中转站 `jiuuij.de5.net/v1`）：gemini-3-flash-preview（清洗主力）+ grok-4.3-medium（抓 X，带 handle 校验闸）。

### 8. 全量重洗 83 人 ✅ 已完成
- **实测结论（2026-06-07 复核）**：库内 `People` 共 219 人，其中 ready 83 人；这 83 人里 **67 人有 RawPoolItem**、**16 人没有 RawPoolItem**。`QAAuditLog` 已覆盖全部 67 个有源 ready 人员，剩余 16 人无原始材料可审。
- **最终落库**：`QAAuditLog` 初始全量重洗共 **4278 行**，最后写入 **2026-06-07 13:16:54（北京）**。candidate live audit 后，共审过 RawPoolItem 4307 条；safe prune 第一批后，当前 RawPoolItem 审计面为 3688 条，verdict 分布：keep 2178 / reject 1199 / review 311。
- **脏数据全景**：safe prune 前 keep 约 50%，明确 reject+empty+duplicate+incomplete 约 43%；把 review 也算入待处理风险，则约 50%。safe prune 第一批已删除 duplicate 157 / empty_content 460 / incomplete 2，剩余 reject 1199 留作下一批边界确认。
- **脚本修正**：`rewash_existing.ts` 已改成 Neon serverless raw SQL，避开 Bun + Prisma native engine 签名冲突；默认只处理未审且有 RawPoolItem 的 ready 人员，支持 `--list`、`--person`、`--limit`、`--dry-run`、断点续跑和 people 并发。
- **安全边界**：第一批 prune 只删除 latest QA verdict 为 `duplicate` / `empty_content` / `incomplete` 的 RawPoolItem 619 条；`QAAuditLog` 和 `Card` 未删除。`export_prune_candidates.ts` 重导出后，默认候选只剩 reject 1199 条，review 311 条保留人工看；删除快照见 `prune_archive_safe.json`，执行摘要见 `prune_execution_safe.json`。
- **运行注意**：中转站有 15 req/min 限制；脚本默认已调成 `--concurrency=1 --semantic-concurrency=1 --semantic-delay-ms=4500`，需要提速时再显式改参数。

### 9. 名册重盘 ✅
- **已执行（2026-06-08）**：`scripts/enrich/apply_roster_candidates.ts --execute` 已将 11 个新人物写入 `status=candidate`，并更新 2 个既有人物：Lilian Weng→库内「李莲」、Justin Johnson→库内「贾斯汀·约翰逊」。
- **安全边界**：新增人物不进 `ready`，不假装完整；`candidate` 在 influenceScore v2 中乘数为 0.35，避免半成品直接冲进主榜。
- **复核结果**：重跑名册脚本为 inserted 0 / updated 13 / ambiguous 0；库内 `CANDIDATE-%` 共 11 个。
- **最小资料补全（2026-06-08）**：新增 `docs/audit-2026-06/roster_enrichment.json` 和 `scripts/enrich/apply_roster_enrichment.ts`，已补 11 个 candidate 的 topics / products / officialLinks / sourceWhitelist，并把 completeness 提到 25。重跑脚本为 matched 13 / missing 0 / delta 0。
- **深度 enrich 第一段（2026-06-09）**：新增 `scripts/enrich/apply_candidate_deep_enrichment.ts`，已为 11 个 candidate 追加去重后的 RawPoolItem 19 条、QA keep 19 条、starter cards 26 张，并给 4 个 GitHub 高置信 candidate 补 avatarUrl。candidate 仍保持 `status=candidate`，completeness=35。
- **深度 enrich 第二段（2026-06-09）**：新增 `scripts/enrich/fetch_candidate_live_sources.ts`，对 candidate officialLinks 做真实页面抓取并回填 RawPoolItem / QAAuditLog。当前 11 个 candidate 均有 live RawPoolItem，completeness=45；可用头像 7 个，明确过滤 Qwen OpenGraph 占位图、Brett 个人站 logo、Tim Hugging Face social card 和 Aravind GitHub identicon。
- **candidate 卡片重聚合（2026-06-09）**：`scripts/enrich/regenerate_cards.ts --candidates-only --limit=20 --min-items=1 --top-n=4 --execute` 已执行。本轮追加 41 张 source-backed 卡；11 个 candidate 当前共 29 条 RawPoolItem / 29 条 QA keep / 21 条 live RawPoolItem / 67 张卡，单人最低 5 张。
- **candidate readiness / promotion（2026-06-09）**：新增 `scripts/audit/export_candidate_readiness.ts`、`scripts/fix/promote_candidate_readiness.ts`、`candidate_readiness.json` 和 `candidate_promotion.json`。11 个 candidate 事实门槛均达标；先升 7 个有头像的人为 `ready`，随后新增 `candidate_avatar_decisions.json` 与 `scripts/fix/apply_candidate_avatar_decisions.ts`，为 Aravind Srinivas / Brett Adcock / Junyang Lin / Tim Brooks 补齐来源支持头像后再升 `ready`。当前 active 136 / ready 94 / candidate 0；source depth blocker 与 avatar blocker 均清零。
- **重抓现状教训**：测 grok 时它谎称「Karpathy 加入 Anthropic」（幻觉），现状补全仍必须从权威源重抓，不靠 LLM 记忆。

### 10. influenceScore 重算 ✅
- **已执行（2026-06-09）**：新增 `scripts/enrich/recalculate_influence_v2.ts`，并在 candidate 卡片补齐、全部 candidate 晋级 ready 和 prune 第一批后对 230 人写库。报告见 `docs/audit-2026-06/data/influence_v2_scores.json`。
- **产品口径**：主榜定义为影响力榜，AI 原创贡献 35 / 产业生态 25 / 权威信号 20 / 学习价值 10 / 近况 10；ready/active 乘数 1，building 0.55，candidate/pending 0.35，error 0。学习价值后续如需强化，应单独做派生榜。
- **主榜复核**：Top 10 为 Yann LeCun 80.82、Andrej Karpathy 80.71、Demis Hassabis 80.09、Ilya Sutskever 78.07、Yoshua Bengio 76.49、Dario Amodei 73.82、Greg Brockman 72.37、Geoffrey Hinton 71.30、Sam Altman 71.04、Arthur Mensch 68.38。
- **topicRanks**：新增 `scripts/enrich/calculate_topic_ranks_v2.ts`，candidate 卡片补齐后已更新 229 人、54 个 topic。示例：大语言模型 Top 3 为 Karpathy / Ilya / Dario；Agent Top 3 为 Sam Altman / Mustafa Suleyman / 李莲。

---

## 四、🟡 P2 — 打磨收尾

| 任务 | 状态 | 说明 |
|------|------|------|
| career 规范化 currentTitle | ✅ / 📋 | 7 条已修（Mira Murati/苏姿丰/IBM CEO 等）；`savePersonRoles()` 已补机构标准化、无 QID 查找/创建、无机构 P39 跳过、Employee 不覆盖具体职位；`apply_career_normalization_safe.ts --execute` 已合并 Cambricon Technologies / DeepSeek 重复机构，去重 Christopher Manning / Noam Shazeer 的 organization 数组，删除 Zuckerberg 1 条 exact duplicate role；`apply_career_review_safe_fixes.ts --execute` 已删除 1 个无 role / 无 People 引用的空 CTO Organization；`apply_career_review_decisions.ts --execute` 已把 CEO position-like 下 6 条 role 转回 You.com / Alphabet / Google / Microsoft，删除 Rasmussen 空泛 professor role，把 Elon Musk 在 OpenAI 的泛化 Employee 修为 Co-chair，删除 5 条 `Employee @ 董事会成员`，并删除 CEO/professor/board of directors member 三类 position-like Organization；随后把 Daniela Amodei / Ethan Mollick / Marc Benioff / Marian Croak / 唐杰 / 李莲等泛化 Employee 更新为具体职位，补正李开复在 Apple / CMU 的 2 条泛化履历，删除 Mira Murati @ Goldman Sachs 的冲突 Employee 行；本轮又把 33 条 education generic role 按证据更新为学位/学习阶段，删除 3 条不可信教育噪声。`People.organization` 口径确认为“展示身份锚点 + 重要背书机构”，完整履历由 `PersonRole` 承载；`apply_current_title_decisions.ts --execute` 已按 10 条来源支持决策补正 currentTitle / organization。复核：Organization 622 / PersonRole 1114 / People 230；duplicate org clusters 0 / duplicate role groups 0 / position-like org 0 / vague roles 0 / People.organization 重复 0。`audit_career_normalization.ts` 已把明确别名和组合字段噪声排除出 mismatch，当前只剩 currentTitle mismatch 23 条：18 条缺 People.organization、5 条缺 known org |
| 移动端筛选 pill 折行 | ✅ | `ResearcherDirectory.tsx` 已给视图 tab 和筛选 chip 加 `whitespace-nowrap`，移动端 tab 允许横向滚动；浏览器 390×844 截图确认「热度排序 / 按话题 / 按机构 / 按角色」均单行，页面无横向溢出 |
| favicon 破图 | 🔧 | `TimelineSection.tsx` favicon 加载失败时回落到机构首字母 |
| 视频缩略图空白 | ✅ | `VideoSection.tsx` / `ContentTabs.tsx` 缩略图失败时显示稳定占位；YouTube ID 识别补了 shorts/embed/live；浏览器详情页确认 Karpathy 4 个视频缩略图可见且无破图 |
| 视觉回归截图 | ✅ | Codex Browser 已补截图：`/private/tmp/ai-person-home-desktop-loaded.png`、`/private/tmp/ai-person-home-mobile-loaded.png`、`/private/tmp/ai-person-karpathy-products.png`、`/private/tmp/ai-person-karpathy-videos.png` |
| Prisma 6 + JSON 字段规范化 | 🔧 | 新增 `lib/utils/person-json.ts`，详情页与目录 API 已对 `officialLinks` / `highlights` / `topicRanks` / `topicDetails` / `quotes` / `products` / `education` / `metadata` 做安全标准化；`npx prisma validate` 与 `npx -y prisma@6.19.3 validate` 均通过，Prisma 6 仅提示 `driverAdapters` preview 已废弃，真正依赖迁移需同步升级 `prisma` / `@prisma/client` / `@prisma/adapter-neon` 并生成锁文件，留单独窗口处理 |
| 卡片有序聚合重生成 | ✅ / 📋 | `scripts/enrich/regenerate_cards.ts --execute` 已执行，默认只使用最新 QAAuditLog keep 过滤 RawPoolItem，不删旧卡；ready 人群新增 327 张卡、覆盖 59 人，candidate 人群追加 41 张卡、11 人均有 5-7 张卡。脚本已加 `--min-items=3` 薄输入保护、`--candidates-only` 候选人模式、topN 保存上限，并删除 18 张薄输入误生成卡，复核 `thin=[]`。后续展示层应做 generation-based 替换机制：新 generation 替换前台展示，旧卡保留历史，不直接物理删卡 |
| Router 反馈闭环 | ✅ | `lib/inngest/pipeline.ts` 路由前读取近 90 天 QAAuditLog 聚合；`RouterAgent` 会对历史低质的可选源降权/跳过，对高通过率源提权；fetch 阶段按 priority 收紧 `maxResults`；核心源不自动关闭；`bunx tsc --noEmit` 通过 |

---

## 五、⏸ 还需要产品口径的决策点

这几项**卡在产品判断 / 不可逆操作边界**，代码都已就绪：

1. **reject prune 第二批** — safe batch 已删除 619 条，`prune_candidates.json` 当前只剩 1199 条 reject 候选；是否删除需先抽样或确认更严格边界。
2. **卡片展示替换机制** — 当前 append-only 可继续运行；真正改展示层前，需要确认 generation 字段、前台默认展示规则和旧卡历史保留策略。
3. **部署** — 清洗代码上线 + 详情页缓存策略（on-demand revalidate?），推生产。

---

## 六、建议动手顺序

1. **reject prune 第二批**：先抽样 `prune_candidates.json` 里剩余 1199 条 reject，再决定是否删除；review 311 条继续人工看。
2. **currentTitle mismatch** 按 `career_review_buckets.json` 分批裁定；vague roles 已清空，下一步处理 18 条缺 People.organization、5 条缺 known org。
3. **relation needs_review** 已归零；后续只需在新抓取/导入后复跑 review bucket。
4. 最后 **#部署** 让所有改动在线上可见。

> 关联文档：[UPGRADE_PLAN.md](../UPGRADE_PLAN.md)（技术债详情 + key 验证）· [CLEANING_AGGREGATION_OPTIMIZATION.md](../CLEANING_AGGREGATION_OPTIMIZATION.md)（清洗聚合方案）· [DATA_QUALITY_ISSUES.md](../../DATA_QUALITY_ISSUES.md)（2026-01 历史扫描）
