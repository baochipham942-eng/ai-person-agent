# AI 人物库 · 带优先级的修复行动清单

> 生成日期: 2026-06-07 · 单一行动视图
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
| 6 | 删关联人物幻觉关系 | 🟠 P1 | ✅ 批量 / ✅ 校验闸 + 状态字段 | — | `relation_review.json` / `reviewStatus` |
| 7 | LLM Provider 抽象层 + 语义清洗地基 | 🟠 P1 | ✅ | 3-5d | `9638977` |
| 8 | 全量重洗 83 人（写 QAAuditLog） | 🟠 P1 | ✅ 已完成（67/67 有源 ready 已落库；16 人无 RawPoolItem） | — | `QAAuditLog` 4278 行 |
| 9 | 名册重盘（补新人 + 重抓现状） | 🟠 P1 | ⏸ | 2-3d | `roster_seeds.json` |
| 10 | influenceScore 重算 | 🟠 P1 | ⏸ | — | 需定权重 |
| 11 | career 规范化（currentTitle 错位） | 🟡 P2 | ✅ 部分 | — | `a6f2377`（7 条）|
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
- **待办** 🔧：下一轮人工复核 `relation_review.json` 中 needs_review；确认后把对应关系从 `needs_review` 改为 `confirmed`，或删除确认为幻觉的关系。

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
- **最终落库**：`QAAuditLog` 共 **4278 行**，最后写入 **2026-06-07 13:16:54（北京）**。verdict 分布：keep 2149 / reject 1199 / empty_content 460 / review 311 / duplicate 157 / incomplete 2。
- **脏数据全景**：keep 约 50%，明确 reject+empty+duplicate+incomplete 约 43%；把 review 也算入待处理风险，则约 50%。这和抽样里 37-72% 的脏数据判断一致。
- **脚本修正**：`rewash_existing.ts` 已改成 Neon serverless raw SQL，避开 Bun + Prisma native engine 签名冲突；默认只处理未审且有 RawPoolItem 的 ready 人员，支持 `--list`、`--person`、`--limit`、`--dry-run`、断点续跑和 people 并发。
- **安全边界**：本轮只写 `QAAuditLog`，没有 prune，也没有删除 `RawPoolItem`。`--prune --yes-prune` 仍是破坏性操作，需单独确认。
- **运行注意**：中转站有 15 req/min 限制；脚本默认已调成 `--concurrency=1 --semantic-concurrency=1 --semantic-delay-ms=4500`，需要提速时再显式改参数。

### 9. 名册重盘 ⏸
- **就绪**：13 种子已核对 → **11 真新增 + 2 同人需更新**（`roster_seeds.json`）。Lilian Weng=库内「李莲」、Justin Johnson=库内「贾斯汀·约翰逊」。
- **卡住点**：审计警告「半成品入库会拉低排序」，应**先定 influenceScore 口径**（#10）再走完整 enrich。
- **重抓现状教训**：测 grok 时它谎称「Karpathy 加入 Anthropic」（幻觉）——现状必须从权威源重抓，不靠 LLM 记忆。

### 10. influenceScore 重算 ⏸
- **问题**：前三 Karpathy(90.9)/Bengio(84.6)/LeCun(84.5) 学术权重导向；Altman/黄仁勋/Dario 等产业领袖被低估。86 条 score=0（未计算占位）。
- **卡住点**：学术 vs 产业影响力配比是**纯产品决策**，需你定权重口径，才能动算法。

---

## 四、🟡 P2 — 打磨收尾

| 任务 | 状态 | 说明 |
|------|------|------|
| career 规范化 currentTitle | ✅ 部分 | 7 条已修（Mira Murati/苏姿丰/IBM CEO 等），commit `a6f2377`；其余待扫 |
| 移动端筛选 pill 折行 | ✅ | `ResearcherDirectory.tsx` 已给视图 tab 和筛选 chip 加 `whitespace-nowrap`，移动端 tab 允许横向滚动；浏览器 390×844 截图确认「热度排序 / 按话题 / 按机构 / 按角色」均单行，页面无横向溢出 |
| favicon 破图 | 🔧 | `TimelineSection.tsx` favicon 加载失败时回落到机构首字母 |
| 视频缩略图空白 | ✅ | `VideoSection.tsx` / `ContentTabs.tsx` 缩略图失败时显示稳定占位；YouTube ID 识别补了 shorts/embed/live；浏览器详情页确认 Karpathy 4 个视频缩略图可见且无破图 |
| 视觉回归截图 | ✅ | Codex Browser 已补截图：`/private/tmp/ai-person-home-desktop-loaded.png`、`/private/tmp/ai-person-home-mobile-loaded.png`、`/private/tmp/ai-person-karpathy-products.png`、`/private/tmp/ai-person-karpathy-videos.png` |
| Prisma 6 + JSON 字段规范化 | 🔧 | 新增 `lib/utils/person-json.ts`，详情页与目录 API 已对 `officialLinks` / `highlights` / `topicRanks` / `topicDetails` / `quotes` / `products` / `education` / `metadata` 做安全标准化；`npx prisma validate` 与 `npx -y prisma@6.19.3 validate` 均通过，Prisma 6 仅提示 `driverAdapters` preview 已废弃，真正依赖迁移需同步升级 `prisma` / `@prisma/client` / `@prisma/adapter-neon` 并生成锁文件，留单独窗口处理 |
| 卡片有序聚合重生成 | 📋 | 代码已改，待重跑 |
| Router 反馈闭环 | 📋 | — |

---

## 五、⏸ 等你拍板的 4 个决策点

这几项**卡在产品判断 / 不可逆操作边界**，代码都已就绪：

1. **prune** — 删 audit 标记的 reject+重复数据（破坏性，有 `backup-2026-06-07.json` 兜底）。
2. **influenceScore 权重** — 学术 vs 产业影响力配比（纯产品决策，#9 名册落地依赖此）。
3. **名册落地** — 11 新增 + 2 更新何时入库（依赖 #2 的评分口径）。
4. **部署** — 清洗代码上线 + 详情页缓存策略（on-demand revalidate?），推生产。

---

## 六、建议动手顺序

1. **#1 冷启动白屏 + #4 scripts 治理** 可立即独立做，不依赖任何决策。
2. **基于 #8 的 4278 行 audit 结果定 prune 边界**，先筛 reject+duplicate，review 单独人工看。
3. **你定 #10 influenceScore 权重** → 解锁 #9 名册落地。
4. 最后 **#部署** 让所有改动在线上可见。

> 关联文档：[UPGRADE_PLAN.md](../UPGRADE_PLAN.md)（技术债详情 + key 验证）· [CLEANING_AGGREGATION_OPTIMIZATION.md](../CLEANING_AGGREGATION_OPTIMIZATION.md)（清洗聚合方案）· [DATA_QUALITY_ISSUES.md](../../DATA_QUALITY_ISSUES.md)（2026-01 历史扫描）
