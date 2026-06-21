# 知识主题系统（Knowledge Threads）架构与契约

> 适用范围：`/threads` 列表页、`/threads/[slug]` 详情页、知识主题的数据来源/策展/人物三层。
> 本文是 **as-built 契约**，不是计划。改这套系统前必须读，尤其「DB ↔ JSON 分叉」一节。
> 最近大改：commit `43e443cd`（列表页+IA）、`04cef14e`（双区+真源治理）、`8c2a4112`（批量 8 主题+curated 终态+生成器）。

---

## 0. 一句话心智

知识主题是「把 AI 一线方法论拆成可读主题，每条讲清来源与推动者」的**重策展实体**。
它**不是** `People.topics[]` 那种标签 facet（那叫 topic/话题），而是有独立来源链、人物边、策展叙事的 `KnowledgeThread`。

---

## 1. ⚠️ 最危险的不变量：候选 JSON ↔ DB 分叉

**列表页和详情页读的不是同一份数据。改错地方 = 看不到效果，会误判成 bug。**

| 页面 | 读什么 | 代码入口 |
|---|---|---|
| **列表页 `/threads`** | **候选 JSON 注册表（同步、零 DB）** | `lib/threads-hub.ts` → `fetchThreadsHub()` |
| **详情页 `/threads/[slug]`** | **DB（KnowledgeThread* 表）** | `lib/knowledge-threads.ts` → `fetchKnowledgeThreadPage()`（`hasKnowledgeThreadStore` 为真就读 DB） |

- 候选 JSON（`data/knowledge-threads/*-sources.candidates.json`）与 DB **早已分叉**：DB 源更多、单独富集过，但 DB **继承了候选包的同样错误**（早期误挂 arXiv 等）。
- **改候选 JSON 只影响列表页 + presentation 派生，不影响详情页。** 要修详情页内容必须写 DB（见 §6 DB surgery）。
- 反例（真实踩过）：在候选 JSON 里改了一条来源，刷新详情页没变化 → 不是缓存 bug，是详情页根本不读 JSON。

**为什么列表页走 JSON 不走 DB**：初版让 12 主题各做全量 DB 拉取 → Neon 冷查 30–60s，页面像卡死。改纯 registry 同步后 0.27s。**列表页永远用 registry 同步聚合，绝不在列表里逐主题查 DB。**

---

## 2. 三层注册（加一个主题 = 加数据，不碰组件）

实体页分「结构数据」和「策展叙事」两层，组件是纯渲染。新增/修改主题只动这三处：

| 层 | 文件 | 内容 |
|---|---|---|
| **① 来源数据** | `data/knowledge-threads/<slug>-sources.candidates.json` | ≥15 源、5 角色齐、≥6 互证边。import 进 `lib/knowledge-threads.ts` 的 `SOURCE_PACK_FIXTURES`（import + 数组各加一行） |
| **② 策展叙事** | `lib/entity-presentations/thread-presentation.ts` 的 `THREAD_PRESENTATIONS` | 手写：`valueProp / problem / whyRead / roleInsights(5角色) / loopSteps / readerCanJudge`。手写质量优于 generated fallback |
| **③ 人物关联** | `lib/knowledge-thread-people.ts` 的 `CURATED_THREADS` | `people[{name, aliases?, relation, summary, sourceIds[]}]`，每人回链到 fixture 真实 source id |

`getThreadPresentationSeed(slug)` 优先取手写 `THREAD_PRESENTATIONS`，无则退到 `thread-presentations.generated.json`。

---

## 3. 候选包 schema 契约

```jsonc
{
  "thread": {
    "slug", "title",
    "status",            // 见 §4 生命周期
    "updatedAt", "category", "tags": [], "aliases": [],
    "definitionDraft",   // 英文一句定义
    "whyNow",            // 为什么现在重要
    "useBoundary"        // 范围界定，防与相邻主题套壳
  },
  "sourceRequirements": { "requiredRoles": [...5...], "minimumSourceCount": 15, ... },
  "sources": [{
    "id",                // 主键，CURATED_THREADS.sourceIds 回链它
    "role",              // signal | official_definition | transcript_context | paper_foundation | implementation_signal
    "sourceKind", "sourceOwner", "url", "title", "publishedAt",
    "whyRelevant", "confidence", "evidenceQuote", "reviewNotes",
    "status",            // verified | source_pack_review | needs_capture
    "metadata": { "role", "textStatus" },
    "text",              // 检索摘要（标题+相关性+证据+备注拼成）
    "urlHash"            // ⚠️ sha256(url)，唯一约束
  }],
  "edges": [{ "fromId", "toId", "relationType", "confidence", "evidenceNote" }],
  "review": { "missingRoles", "weakSources", "publishReadiness", "notes" }
}
```

硬性要求：
- **5 类角色每类 ≥2**（signal / official_definition / transcript_context / paper_foundation / implementation_signal）
- **总源数 ≥15**、**互证边 ≥6**
- `urlHash = sha256(url)`：`printf '%s' "$url" | shasum -a 256`，或生成器自动算
- 财报/IR/earnings call **不计入** topic readiness（属公司页证据，见 ENTITY_PAGES.md）

---

## 4. status 生命周期与排序

类型定义 `lib/knowledge-thread-fixtures/loop-engineering.ts:1`：
```ts
type KnowledgeThreadStatus = 'curated' | 'source_pack_review' | 'review_ready' | 'thin' | 'draft';
```

| status | 含义 | 排序权重（`threads-hub.ts` STATUS_MATURITY） |
|---|---|---|
| `curated` | 已策展定稿（终态） | 0（最前） |
| `review_ready` | 复核就绪（历史档，已弃用对外） | 1 |
| `source_pack_review` | 来源包待复核 | 2 |
| `thin` | 内容偏薄 | 3 |
| `draft` | 草稿 | 4 |

- 校验在 `lib/knowledge-threads.ts` 的 `toKnowledgeThreadStatus()`，加新 status 值必须同步改类型 + 校验 + STATUS_MATURITY。
- **status 当前不对外显示**（2026-06-21 删了列表卡片徽标 + 详情页「状态」Metric），只承载数据成熟度并驱动列表排序。曾有「复核就绪」徽标，因 11 主题全同一值=零区分度被删。
- DB 侧 `KnowledgeThread.status` 与候选 JSON 的 status 各自独立；DB status 现已无处显示=惰性。要对齐需写库（auto-mode 写闸）。

---

## 5. 生成器流水线（批量加主题的正路）

手写 350 行候选 JSON × N 个主题易错（urlHash、样板字段）。改用生成器：

```bash
npx tsx scripts/threads/build_candidate_packs.ts --only=<slug>   # 单个
npx tsx scripts/threads/build_candidate_packs.ts                 # 全部
npx tsx scripts/threads/build_candidate_packs.ts --dry-run       # 不写文件，只看角色统计
```

- **数据真理源**：`scripts/threads/new_thread_specs.ts` 的 `THREAD_SPECS`。每条 source 只填核心字段（id/role/sourceKind/sourceOwner/url/title/publishedAt/whyRelevant/confidence/evidenceQuote?/status?）。
- 生成器自动：算 `urlHash=sha256(url)`、拼 `text`、填 `metadata`、补 `sourceRequirements`/`review` 样板、status 默认 `verified`、整包 `thread.status='curated'`。
- 输出 `data/knowledge-threads/<slug>-sources.candidates.json`。**注册三层仍手动**（生成器只产候选 JSON）。

---

## 6. 人物解析与入库

- 解析：`lib/knowledge-thread-people.ts` 的 `resolveThreadPeople()` 把 `CURATED_THREADS[].people[].name`（+aliases）匹配 People 库。
- **未匹配 → review 队列，不自动建占位人物。** 要让锚定人物进详情页主区，必须入库：
  1. `scripts/enrich/add_thread_people.ts`（base）：Wikidata 免费建档 + 头像；无 Wikidata 命中建 `TEMP-*` qid 兜底（正常退路）。**searchHint 别堆太多关键词**——Wikidata `wbsearchentities` 是 label 前缀匹配，长串会命中空、全走 TEMP qid。
  2. `scripts/enrich/enrich_thread_people.ts`（富集，**付费**）：Tavily 搜 bio + DeepSeek 合成 description/topics/role + unavatar 头像（需 X/GitHub handle，无 handle 则无头像、首字母兜底）。
- 审计：`npx tsx scripts/threads/audit_thread_people.ts`（只读，产 matched/unmatched 清单）。
- 关系枚举：`proposer 提出者 / driver 推动者 / skeptic 质疑者 / implementer 落地者`。
- 详见 `ENRICHMENT_AND_IDENTITY.md`（消歧硬规则、成本、auto-mode 写闸）。

---

## 7. 反假源纪律（被产品负责人抓最狠的一条）

**概念必须 grounded 在真实来源、web 核实后再写，不套壳。**

- 改/建主题先联网核概念真伪，再动文案；artifact 不是你写的就先核对再改。
- **每个 arXiv/论文源必须核对 编号↔标题**，防张冠李戴。没把握的标 `source_pack_review`/`needs_capture` + reviewNote「发布前复核」，**绝不冒充 `verified`**。
- 工程概念无经典论文时，诚实标注「无同名奠基论文，用 X 代替」（如 harness-engineering 用 SWE-agent ACI 2405.15793 + ReAct 代替）。
- 裸词/流行词要落到工业界公认概念名（"artifact" → Generative UI / AI Artifacts）。
- **反例库（batch2 教训，全是纯生成式假源）**：agent-security 3 篇 arXiv 全捏造（2 篇竟是金融/数学论文）、computer-use 把 SeeAct 编号写成 SeeClick、假 LeCun 博客、占位 URL 遍地。
- **闸门**：pre-commit 钩子扫所有候选包，发现占位/捏造链接拦提交（2026-06-21 提交时扫 19 包通过）。

---

## 8. 验收清单（每次改完必跑）

```bash
bunx tsc --noEmit                                    # 0 错误
curl -s -o /dev/null -w "%{http_code}" http://localhost:4101/threads/<slug>   # 200
curl -s http://localhost:4101/threads | grep "共 .* 条"                        # 列表计数对
npx tsx scripts/threads/audit_thread_people.ts       # 人物匹配 N/N
```

---

## 9. 踩坑速查

| 现象 | 根因 | 处置 |
|---|---|---|
| 改候选 JSON 详情页没变 | DB↔JSON 分叉，详情页读 DB | 写 DB（scripts/fix/*），别改 JSON |
| 列表页卡死/没法上滑 | 列表逐主题全量查 DB，Neon 冷查 30–60s | 用 registry 同步（threads-hub.ts），不查 DB |
| `$transaction` 必超时回滚 | Neon 冷启动多查询 >5s（默认）甚至 >30s | 改逐条顺序执行（无事务）+ 每次按当前 DB 重算（可重入幂等）+ 备份兜底 |
| 子代理写候选 JSON 被拦 | 权限分类器随机拦子代理写 | 主代理自己写不拦 |
| node 直接 import lib/*.ts 报错 | 解析不了 `@/` 别名 | 验证走 dev server curl，不 node import |
| urlHash 冲突 | sha256(url) 唯一约束 | DB surgery 改为冲突合并（目标 url 已存在则重指链接/边 + 删冗余） |
| 入库人物全 TEMP qid | searchHint 关键词太多，Wikidata 没命中 | 用简短人名重搜；TEMP qid 不影响渲染（详情页按 name 匹配） |

---

## 10. 关键文件索引

| 文件 | 职责 |
|---|---|
| `lib/threads-hub.ts` | 列表页读模型（registry 同步聚合） |
| `lib/knowledge-threads.ts` | SOURCE_PACK_FIXTURES 注册 + DB 读模型 + status 校验 |
| `lib/knowledge-thread-fixtures/loop-engineering.ts` | KnowledgeThreadStatus 类型 + loop-engineering 静态 fixture |
| `lib/entity-presentations/thread-presentation.ts` | THREAD_PRESENTATIONS 策展叙事 |
| `lib/knowledge-thread-people.ts` | CURATED_THREADS 人物 + resolveThreadPeople |
| `data/knowledge-threads/*-sources.candidates.json` | 候选包（列表页数据源） |
| `scripts/threads/build_candidate_packs.ts` | 候选包生成器 |
| `scripts/threads/new_thread_specs.ts` | 生成器数据真理源 |
| `scripts/threads/audit_thread_people.ts` | 人物匹配审计（只读） |
| `components/threads/ThreadsHubView.tsx` | 列表页组件（纯渲染） |
| `components/knowledge/ThreadPageBlocks.tsx` | 详情页组件（纯渲染） |
