# 内容清洗 & 聚合逻辑优化方案

> 生成: 2026-06-09
> 范围: QA Agent 清洗链路 + Inngest pipeline 聚合链路 + 卡片/职业数据聚合
> 结论: 当前清洗=纯规则关键词匹配(门槛形同虚设),聚合=无序截断+精确去重(脏数据累积)。
>       新接入的 gemini-3-flash-preview 额度正好补上"语义判断"这一层。

## ✅ 实现进度 (2026-06-09)

清洗地基已落地并端到端验证:
- `lib/ai/provider.ts` — 多 provider 统一抽象 + 降级链 + 结构化输出(json_object+zod+修复重试)
- `lib/utils/dedup.ts` — SimHash 模糊去重 (L2)
- `lib/agents/semantic-qa.ts` — gemini-flash 批量语义打分 (L1: aboutPerson/aiRelevant/quality + verdict)
- `lib/agents/clean-orchestrator.ts` — 三段式编排 `cleanItems()`: L0(规则硬过滤,复用 QAAgent 关掉关键词判定) → L2(模糊去重) → L1(语义) + 审计落库
- `QAAuditLog` 表已 push (记录每条 item 各阶段决策)
- `lib/inngest/pipeline.ts` qa-check 步骤已接入 `cleanItems`
- `RouterAgent` 已接入 QAAuditLog 反馈: route step 读取近 90 天各来源 verdict 分布, 可选低质源自动降权/跳过, 高通过率源提权, fetch 阶段按 priority 收紧 `maxResults`
- 卡片重聚合脚本已补齐并执行: `scripts/enrich/regenerate_cards.ts` 默认 dry-run, 只使用最新 `QAAuditLog` verdict=keep 的 RawPoolItem, 支持 `--list`/`--person`/`--top-n`/`--min-items`/`--include-candidates`/`--candidates-only`/`--execute`, 并走 Neon raw SQL 避开 Bun+Prisma native engine 签名问题。ready 人群新增 327 张卡、覆盖 59 人；candidate 人群追加 41 张卡、11 人当前均有 5-7 张卡；薄输入保护 `--min-items=3` 已加，topN 已作为保存上限执行，18 张薄输入误生成卡已删除，复核 `thin=[]`。
- 卡片 generation 展示替换机制已补齐: `Card` 增加 `generationId` / `isActive` / `archivedAt` 并已对生产 Neon 执行 additive ALTER；人物详情页只展示激活卡，`apply_card_reaggregation_plan.mjs` 默认 archive-active，旧卡保留历史；`cardGenerator.ts`、`regenerate_cards.ts`、candidate deep enrichment 和 refresh/fix-qid/去重脚本均已接入激活卡口径。验证: Prisma validate/generate、`tsc --noEmit`、DB dry-run/execute、周明重聚合 dry-run、`regenerate_cards --list --limit=1` 均通过。
- career 规范化入口已补齐并执行 safe fix: `savePersonRoles()` 入库前标准化机构名、跳过无机构 P39 职位、无 QID 机构不再用 fake qid upsert、笼统 Employee 不覆盖更具体职位；新增 `audit_career_normalization.ts`、`export_career_review_buckets.ts`、`apply_career_normalization_safe.ts`、`apply_career_review_safe_fixes.ts`、`apply_career_review_decisions.ts` 和 `apply_current_title_decisions.ts`(默认 dry-run)。本轮合并 Cambricon Technologies / DeepSeek 重复机构，去重 Christopher Manning / Noam Shazeer 的 organization 数组，删除 Zuckerberg 1 条 exact duplicate role，删除空 CTO Organization，把 CEO/professor/board of directors member position-like Organization 清到 0，并把 Daniela Amodei / Ethan Mollick / Marc Benioff / Marian Croak / 唐杰 / 李莲的 Employee 泛化 role 更新为具体职位，补正李开复在 Apple / CMU 的 2 条泛化履历，删除 Mira Murati @ Goldman Sachs 的冲突 Employee 行；随后把 33 条 education generic role 按证据更新为学位/学习阶段，删除 3 条不可信教育噪声；再按三批来源支持决策补正 currentTitle / People.organization。当前 Organization 622 / PersonRole 1114 / vagueRoles 0 / currentTitle mismatch 0。
- influenceScore v2 已补齐并执行: `scripts/enrich/recalculate_influence_v2.ts` 使用产品导向权重重算 230 人，主榜定义为影响力榜，权重保持 AI 原创贡献 35 / 产业生态 25 / 权威信号 20 / 学习价值 10 / 近况 10；`candidate`/`pending` 乘数 0.35；候选池清空和 prune 第一批后均已重算，`scripts/enrich/calculate_topic_ranks_v2.ts` 已更新 229 人、54 个 topic。
- roster candidate flow 已补齐并执行: `scripts/enrich/apply_roster_candidates.ts` 默认 dry-run，`--execute` 已插入 11 个 `status=candidate` 新人并更新 Lilian Weng / Justin Johnson 两个既有人物。
- roster enrichment flow 已补齐并执行: `docs/audit-2026-06/roster_enrichment.json` 提供可审种子，`scripts/enrich/apply_roster_enrichment.ts` 默认 dry-run，`--execute` 已为 11 个 candidate 补齐 topics / products / officialLinks / sourceWhitelist；重跑为 13 matched / 0 missing / 0 delta。
- candidate deep enrichment 第一段已执行: `scripts/enrich/apply_candidate_deep_enrichment.ts` 默认 dry-run，`--execute` 已为 11 个 candidate 追加去重 RawPoolItem 19 条、QA keep 19 条、source-backed starter cards 26 张、GitHub 高置信头像 4 个；重跑为 0 delta。
- candidate live fetch 第二段已执行: `scripts/enrich/fetch_candidate_live_sources.ts` 默认 dry-run，`--execute` 已把 11 个 candidate 的 officialLinks 真抓并回填 RawPoolItem / QAAuditLog；当前 21 条 live RawPoolItem，11 个 candidate completeness=45，7 个头像通过核图保留。candidate 卡片重聚合后共有 29 条 RawPoolItem / 29 条 QA keep / 67 张卡；`export_candidate_readiness.ts` 已导出 11 人事实门槛达标，`promote_candidate_readiness.ts --execute` 先将 7 个有头像 candidate 升为 ready。随后 `candidate_avatar_decisions.json` 与 `apply_candidate_avatar_decisions.ts --execute` 为剩余 4 人补齐来源支持真人头像，并将 Aravind Srinivas / Brett Adcock / Junyang Lin / Tim Brooks 升为 ready；当前 active 136 / ready 94 / candidate 0。
- career / relation review buckets 已补齐: `scripts/audit/export_career_review_buckets.ts` 和 `scripts/audit/export_relation_review_buckets.ts` 均为只读导出，分别生成 career 和 relation 的后续人工裁定包。
- prune 第一批已执行: `scripts/audit/export_prune_candidates.ts` 已导出 `prune_candidates.json`；`scripts/fix/prune_raw_pool_items.ts --execute` 已按 safe 边界删除 `duplicate` 157 / `empty_content` 460 / `incomplete` 2，共 619 条 RawPoolItem，并保留 `prune_archive_safe.json` 快照。当前 RawPoolItem 审计面 3688 条，只剩 `reject` 1199 条作为下一批候选，review 311 条保留人工看。
- relation 高敏复核、弱 colleague 清理和证据小批次已执行: `scripts/fix/apply_relation_review_decisions.ts` 默认 dry-run，`--execute` 已确认 OpenAI/DNNresearch/Anthropic/Thinking Machines/AIX/YC/Transformer/HAI/ImageNet/Seq2Seq/FLAN/GAN/Bahdanau attention/AlexNet/Turing Award/AlphaFold/Codex 等 52 条外部证据关系，删除 12 条高敏或描述错误 false-positive、27 条无共同机构证据的 Perplexity colleague 噪声、32 条公司合作/公开信共同署名/泛泛同台等弱 collaborator 边，以及最终 8 条无日期 overlap 或无共享机构证据的 colleague 边；`export_relation_review.ts` 已尊重 DB reviewStatus，needsReview 131→0，高敏 advisor/cofounder/collaborator/colleague bucket 已清空。
- **验证**: 造测试集跑通; 关键根因(只提"Google"的内容旧逻辑误收)被 L1 正确判 reject (ap=0); 抓错人正确拒; tsc 0 错误

待办: ① prune reject/review 尾巴人工复核或补源 ② A/B 误收误拒度量 ③ 部署后详情页缓存刷新验证

---

## 一、根因诊断(为什么数据脏)

### 清洗链路 = `lib/agents/qa-agent.ts`(纯规则,无语义)

| # | 问题 | 代码位置 | 后果 |
|---|------|---------|------|
| C1 | **AI 相关性判定靠子串命中,门槛失效** | `isAIRelevant()` aiKeywords 含 `'ai'`/`'api'`/`'model'`/`'google'` | `text.includes('ai')` 命中 rain/email/said/detail/campaign…几乎永真,这道闸等于不存在 |
| C2 | **身份判定 org 子串匹配太松** | `isAboutPerson()` 第 5 步 | 文本出现 "google" 就算"关于此人"→任何提 Google 的内容都收 |
| C3 | **AI 关键词兜底默认开** | `useAIKeywordFallback=true` | 含任一 AI 词即通过→身份门槛被架空 |
| C4 | **中文名拆字匹配** | `matchChineseName()` | "李飞飞"→文本有"李"+"飞"(可不连续)就中,误判率极高 |
| C5 | **去重只有精确 hash** | `runChecks()` urlHash/contentHash 全等 | 转发/不同 URL 同内容/截断近似内容全去不掉→重复累积 |
| C6 | **isOfficial=true 直接免检** | `isAIRelevant()`/`runChecks()` 第 5 步 | 但 isOfficial 标记本身不可靠(DATA_QUALITY P0#3 误标)→脏数据免检入库 |
| C7 | **confidence 阈值未校准** | `confidenceThreshold=50` | confidence 各 adapter 自填、标准不一,阈值无意义 |

### 聚合链路 = `lib/inngest/pipeline.ts` + `lib/ai/cardGenerator.ts`

| # | 问题 | 代码位置 | 后果 |
|---|------|---------|------|
| A1 | **卡片输入无序截断** | `generateCardsForPerson()` `rawItems.slice(0,10)` | 按 DB 默认顺序取前 10,可能全是低价值第三方分析;高价值原创内容被丢 |
| A2 | **卡片去重靠精确标题** | `saveCardsToDatabase()` `existingTitles.has(title)` | 换措辞的同义卡去不掉→卡片越积越多越重复 |
| A3 | **结构化输出脆弱+静默失败** | `chatStructuredCompletion`(正则剥 JSON) | 解析失败返回 `[]`,人物 0 卡片且无告警 |
| A4 | **只追加不重聚合** | pipeline 全程 | forceRefresh 重抓,但旧脏卡片/topic 不清理,只叠加 |
| A5 | **career 合并无冲突消解** | `savePersonRoles()` | 组织重复(Google 4 条)、职位笼统(Employee)、日期缺失全卡在这层 |
| A6 | **Router 无反馈闭环** | `routerAgent.analyze()` | 某源持续返垃圾,下次照抓,无学习 |

### 架构层

- **AO1 清洗全在规则层,没用 LLM**: "这条是否关于本人 / 是否 AI 相关 / 质量高低"本质是语义判断,关键词做不准。现已有 gemini-3-flash-preview(便宜)额度。
- **AO2 无质量可观测性**: QAReport 只 `console.log`,不落库。无法回溯单条拒/收原因,无法度量清洗效果,形不成数据飞轮。

---

## 二、优化方案

### 核心思路: 三段式清洗(规则预过滤 → LLM 语义判定 → 校准入库)+ 有序重聚合

```
原始 items
  → [L0 规则预过滤]  快/免费: 去空、精确去重、明显垃圾(现有 QA 规则保留但只做"硬过滤")
  → [L1 LLM 语义清洗] gemini-3-flash-preview 批量打分:
                      { isAboutPerson: 0-1, isAIRelevant: 0-1, qualityScore: 0-1, reason }
  → [L2 模糊去重]     contentHash → SimHash/embedding 近似去重(同内容不同 URL)
  → [L3 校准入库]     阈值过滤 + 落 QA 审计表(可回溯)
  → [聚合] 按 score 排序后喂卡片生成 + 语义去重卡片
```

### P0 改造项

**1. 新增 LLM 语义清洗层 `lib/agents/semantic-qa.ts`** (替代 C1/C2/C3/C4 关键词判定)
- 用 `gemini-3-flash-preview`(成本极低)批量判定,一次喂 N 条,zod schema 输出:
  ```ts
  z.object({ items: z.array(z.object({
    index: z.number(),
    aboutPerson: z.number().min(0).max(1),   // 是否关于本人
    aiRelevant: z.number().min(0).max(1),     // AI/科技相关度
    quality: z.number().min(0).max(1),        // 内容质量(信息密度/原创性)
    verdict: z.enum(['keep','reject','review']),
    reason: z.string(),
  })) })
  ```
- 规则层(现 QAAgent)降级为 **L0 硬过滤**: 只做空内容、精确 hash 去重、必填字段——快且免费,先砍掉明显垃圾再喂 LLM 省钱。
- isOfficial **不再免检**(修 C6),官方来源也过 L1(只是阈值放宽)。

**2. 模糊去重 `lib/utils/dedup.ts`** (修 C5)
- 文本 SimHash 或 MinHash 做近似去重(同推文转发、截断变体)。
- 轻量方案先上 SimHash(纯计算无 API 成本);后续可选 embedding(中转站若有 embedding 模型)。

**3. 有序卡片聚合** (修 A1/A2/A3)
- 喂 LLM 前按 `L1.quality * 0.6 + getIdentityScore * 0.4` 排序,取 Top-N(而非 DB 默认前 10)。
- 卡片生成换 `generateObject` + zod(接 #1 LLM 抽象层),失败重试 + 非静默告警。
- 卡片去重: 标题精确 → 标题/内容语义相似(embedding 或 LLM 判重)。
- 已补一次性重聚合入口 `scripts/enrich/regenerate_cards.ts`: 默认 dry-run、不删旧卡,使用最新 QA keep 结果过滤输入; `--execute` 只追加去重后的新卡。importance 已在 schema 层 clamp 到 1-5，topN 在保存前硬截断。
- 当前产品口径: 继续用 QA keep + topN 去重生成卡片；展示层已切到 generation-based 口径，新 generation 激活后替换前台展示，旧卡保留历史，不直接物理删卡。

**4. QA 审计落库 `QAAuditLog` 表** (修 AO2)
- 每条 item 的 verdict/score/reason 落库,字段: `personId, url, sourceType, verdict, aboutPerson, aiRelevant, quality, reason, createdAt`。
- 用途: 回溯单条决策、度量各源命中率、喂 Router 反馈闭环(A6)、形成数据飞轮。

### P1 改造项

**5. career 数据规范化合并** (修 A5)
- 入库前: 组织名标准化(复用 `ORG_ALIASES`)+ 模糊去重 + 日期冲突消解(多源取高置信)。
- 职位笼统("Employee")用 LLM 结合上下文补精确职位。
- 已补入口防线: 无机构 P39 不再把 CEO/professor 当 Organization; 无 QID 机构按 name/nameZh 查找或创建,避免重复 Organization; 更具体 role 会覆盖同区间的 Employee, Employee 不覆盖既有具体职位。
- 已补存量审计: `career_normalization_audit.json` 当前 Organization 622 / PersonRole 1114 / People 230; duplicate org clusters 0, position-like org 0, duplicate role group 0, vague roles 0, People.organization 重复 0, currentTitle org mismatch 0。
- 已执行 safe fix: 合并 Cambricon/DeepSeek 同名机构各 1 条 role ref,去重 Christopher Manning/Noam Shazeer 的 organization 数组,删除 Zuckerberg 1 条 exact duplicate role,删除空 CTO Organization,把 Elon Musk 在 OpenAI 的泛化 Employee 修为 Co-chair,删除 5 条 `Employee @ 董事会成员`,更新 Daniela Amodei / Ethan Mollick / Marc Benioff / Marian Croak / 唐杰 / 李莲的 Employee 泛化 role,补正李开复在 Apple / CMU 的 2 条泛化履历,删除 Mira Murati @ Goldman Sachs 的冲突 Employee 行,并把 CEO/professor/board of directors member position-like Organization 清到 0。

**6. Router 反馈闭环** (修 A6)
- 已接入: 读 QAAuditLog 统计各源近期命中率,样本足够且低质率高的可选源下次降权或跳过；核心源只降权不自动关闭；fetch 阶段会按 priority 收紧 `maxResults`。

**7. confidence 校准** (修 C7)
- 各 adapter confidence 重新定义口径,或废弃 confidence 阈值改用 L1.quality 统一打分。

---

## 三、成本估算(新 gemini 额度)

- L1 语义清洗: 每人物约 30-50 条 item,批量 10 条/请求 → 3-5 次 flash 调用/人物。
- 144 人物全量重洗 ≈ 500-700 次 flash 调用,gemini-3-flash-preview 单价极低,中转站额度足够。
- L0 规则预过滤先砍掉明显垃圾(空/重复),实际喂 LLM 量更少。

---

## 四、执行顺序

```
依赖: 先落地 UPGRADE_PLAN #1 LLM 抽象层(provider.ts),本方案的 L1/卡片生成都基于它

第一步(地基): #1 LLM 抽象层 → 接 gemini provider
第二步(清洗): 新增 semantic-qa.ts(L1) + dedup.ts(L2) + QAAuditLog 表 → QAAgent 降级为 L0
第三步(验证): 拿 5-10 个已知脏数据的人物跑 A/B,对比新旧清洗的 approved/rejected,看误收误拒率
第四步(聚合): 有序卡片聚合 + 卡片语义去重
第五步(回填): 144 人物全量重洗 + 重聚合(一次性脚本,带 --dry-run)
第六步(闭环): career 规范化合并 + Router 反馈
```

## 五、与现有方案的关系
- 本方案是 UPGRADE_PLAN.md **#4 数据质量债清理**的具体化,且依赖 **#1 LLM 抽象层**。
- 新 gemini/grok key 在此方案中的角色: gemini-3-flash 跑 L1 语义清洗(主力),grok 继续抓 X 内容(经 handle 校验闸)。
