# 数据模型：实体关系与分类法

> 适用范围：人物库的 5 个实体、6 条关系边、模型/作品分类法。
> DB 字段清单见 `CLAUDE.md`「Key Database Models」；本文补 **实体关系图 + 分类法硬规则**（CLAUDE.md 没有的）。
> 最近大改：`40b42c5e`（人↔主题边）、`e1492a37`（作品实体 /work）、`50f4f07b`（课程实体）、`91cc75cf`（论文实体）。

---

## 1. 五个实体

| 实体 | DB 表 | 是不是独立实体 | 说明 |
|---|---|---|---|
| **人物** | `People` | ✅ | 核心实体 |
| **公司** | `Organization`（字段 `wikidataQid` 不是 `qid`） | ✅ | |
| **知识主题** | `KnowledgeThread*` | ✅ 重策展实体 | 见 KNOWLEDGE_THREADS.md |
| **作品/成果** | `Product` + `ProductContributor` | ✅ | /work，模型/产品/工具/框架/架构/实验室/基准 |
| **课程** | `Course` | ✅（外链，不建详情页） | /courses 聚合 |
| ~~话题 topic~~ | `People.topics[]` | ❌ **facet 标签，不是实体** | 别和「知识主题」混 |

> ⚠️ **topic（话题）≠ thread（知识主题）**：topic 是 `People.topics[]` 的标签 facet（如 "Agent"、"大模型"）；thread 是有来源链/人物边/策展叙事的 `KnowledgeThread` 实体。

---

## 2. 六条关系边

```
                    ┌─────────────┐
                    │   知识主题   │
                    └──┬───────┬──┘
         person↔thread │       │ company↔thread
        (CURATED_THREADS)      │ (CompanyThreadLink)
                    ┌──┴──┐  ┌─┴────┐
                    │ 人物 │──│ 公司 │
                    └──┬──┘  └──────┘
                       │ person↔company
                       │ (PersonRole + organization[])
              person↔work │
        (ProductContributor)│
                    ┌──────┴──────┐
                    │  作品/成果   │── company↔work / thread↔work
                    └─────────────┘
```

| # | 边 | 载体 | 状态 |
|---|---|---|---|
| 1 | 人 ↔ 公司 | `PersonRole`（有履历）+ `People.organization[]`（数组，可能无 PersonRole） | ✅ |
| 2 | 人 ↔ 主题 | `CURATED_THREADS[].people`（策展驱动，渲染时只读查 People） | ✅ |
| 3 | 人 ↔ 作品 | `ProductContributor` | ✅ |
| 4 | 公司 ↔ 主题 | `CompanyThreadLink`（背景链接，财报类只留公司页不计 readiness） | ✅ |
| 5 | 主题 ↔ 来源 | `KnowledgeThreadSource` / 候选 JSON sources | ✅ |
| 6 | 作品 ↔ 公司/人 | Product 的 org/contributor | ✅ |

**架构决策（人↔主题为何不建 DB 表）**：主题页是 fixture/策展驱动渲染，故人↔主题用 **策展驱动 + 渲染时只读查 People**，不提前建无人渲染的 `ThreadPersonLink` DB 表（死代码，降为「主题迁 DB 后」scale 路径）。匹配不到 owner = **只产 review 清单不自动建占位**。

---

## 3. 分类法硬规则（被产品负责人两轮纠正，强记）

### 作品/成果（lib/work-taxonomy.ts = 单一真理源）
- **用户可见一律「作品/成果」**，type 区分：模型 / 产品 / 工具 / 框架 / 架构 / 实验室 / 基准。
- **GPT-4 / Claude 是模型，永不标「产品」。**
- **模型必须收敛到系列**（`MODEL_SERIES` 折叠规则）：GPT-1..5 → GPT；o1/o3 → o 系列；Claude 各版本 → Claude。否则人物页被同系列版本刷屏 = 噪音（Altman 页面被 GPT-1..5 刷屏）。
- **CEO/founder（roleCategory=founder）不进作品贡献者主区**，走公司边（回填扫描跳过）。
- 回填脚本（`materialize_products.ts`）与运行时（人物页 FeaturedWorks）共用 `lib/work-taxonomy.ts` 的 `slugifyWork`/`normalizeWorkType`，保证 slug 一致。

### 该提炼 vs 不该提炼成实体
- ✅ 提炼：作品/产品（最高杠杆，散在 223/286 人 products JSON 且跨人重复）、论文、课程。
- ❌ 不提炼：来源（留参考层）、语录（太薄）、事件（是流，进 ActivityEvent）。

---

## 4. 身份字段（消歧详见 ENRICHMENT_AND_IDENTITY.md）

`People` 关键身份字段：`qid`（唯一，无 Wikidata 命中用 `TEMP-*`）、`openalexId`（学术论文可靠抓取路径）、`officialLinks`（含 ORCID）、`aliases[]`。

- **身份字段写入即便机构匹配也可能被上游脏别名带偏**（贾扬清库里存了错别名 "Jia Deng"=Princeton 邓嘉）。**身份批量写必须 dry-run 给产品负责人过目再 --execute。**

---

## 5. 内容/流实体

| 实体 | 表 | 用途 |
|---|---|---|
| 动态事件 | `ActivityEvent`（eventType: video/paper/article/podcast…） | 首页本周推荐异质卡片流 |
| 原始池 | `RawPoolItem` | 抓取原文（≤1000 字进 text） |
| 搜索索引 | `SearchDocument` + `ContentChunk` | FTS + 向量检索（embed 见错题本凭证坑） |
| 清洗审计 | `QAAuditLog` | 三段式清洗决策日志 |

---

## 6. 关键文件索引

| 文件 | 职责 |
|---|---|
| `prisma/schema.prisma` | DB 模型真理源 |
| `lib/work-taxonomy.ts` | 作品归类 + MODEL_SERIES 折叠 |
| `lib/knowledge-thread-people.ts` | 人↔主题边（CURATED_THREADS） |
| `lib/products.ts` | 作品实体读模型 |
| `CLAUDE.md` § Key Database Models | 全字段清单（MCP 查询驼峰字段注意双引号） |
