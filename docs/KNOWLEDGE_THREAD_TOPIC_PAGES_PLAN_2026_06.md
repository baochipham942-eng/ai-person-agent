# 知识主题页完整计划

> 日期: 2026-06-18
> 当前样板: Loop Engineering
> 范围: 主题页、证据图谱、采集链路、Mimo 批量生产规范

## 1. 结论

Mimo 可以做后续批量主题页，但前提是先由主线程做出一个黄金样板，把判断标准显性化。

Mimo 适合做:

1. 按固定 schema 填充来源、摘要、证据片段和关联边。
2. 批量跑相邻主题页的数据补全。
3. 做事实复核、重复来源合并、薄弱证据标记。

Mimo 不适合一开始做:

1. 决定主题页的信息架构。
2. 判断哪些来源角色应该被产品化。
3. 设计跨来源关系类型和页面验收口径。

所以主线程先做 `Loop Engineering` 样板。样板过关后，Mimo 按同一套 schema 和验收清单批量生产。

## 2. 产品方向

现有 `/topic/[slug]` 更像人物目录页: 按话题聚合人物、动态和作品。下一步要新增一种更高价值的页面: 知识主题页。

知识主题页回答的问题是:

1. 一个前沿概念到底是什么。
2. 它为什么现在重要。
3. 哪些人最早或最新提到它。
4. 官方博客、产品文档、访谈字幕、论文和工程实现怎样互相印证。
5. 用户读完后应该关注哪些产品、论文、人物和后续变化。

产品价值来自把数据库孤岛连起来:

| 来源 | 当前价值 | 在主题页里的角色 |
|---|---|---|
| X / 推文 | 最新信号、术语冒头、人物判断 | signal |
| 官方博客 / 文档 / changelog | 产品定义、功能边界、正式说法 | official_definition / productized_as |
| YouTube / podcast 字幕 | 长解释、背景动机、实践经验 | transcript_context |
| 论文 | 方法根源、评测、技术约束 | paper_foundation |
| GitHub / examples | 工程落地、开发者采用 | implementation_signal |

财报、earnings call、SEC filing 和 IR 材料不作为 AI 技术主题页的一等来源。它们主要属于公司 / 机构聚合页，用来解释公司战略、资本开支、业务优先级和投入方向。技术主题页只在需要时引用公司页生成的 `company_strategy_context` 摘要回链，不把财报当成主题页达标条件。

## 3. 页面形态

新增页面建议用 `/threads/[slug]`，避免和当前 `/topic/[slug]` 目录页混在一起。

`/topic/[slug]` 继续负责广义话题目录，例如 Agent、RAG、推理、多模态。

`/threads/[slug]` 负责可策展的知识线程，例如:

1. Loop Engineering
2. Agentic Coding
3. Context Engineering
4. Computer Use
5. Tool Use
6. Inference Scaling
7. AI Coding Eval
8. Multi-agent Research
9. MCP
10. Enterprise AI Agents

## 4. 黄金样板: Loop Engineering

样板页必须做到四件事:

1. 把 Boris Cherny 的 X 信号放在正确位置: 它是入口和新鲜度线索，不是全部证据。
2. 把官方材料作为定义核心: Claude Code / Anthropic 官方博客、文档、changelog、research preview 优先。
3. 把 YouTube 或 podcast 字幕作为长解释层: 找到产品负责人、工程团队或相关访谈里对工作流、agent、coding loop 的解释。
4. 把论文和工程实现作为外部验证层: 论文解释技术根基，GitHub / examples / docs 解释落地路径。

样板页模块:

| 模块 | 内容 | 验收 |
|---|---|---|
| 首屏判断 | 概念定义、为什么现在重要、可信度、最后更新时间 | 3 句话内讲清，不写营销文案 |
| 证据地图 | X、官方、字幕、论文、工程实现按角色分组 | 至少 5 类来源 |
| 关键时间线 | 概念信号、产品发布、论文、工程实现 | 每个节点有来源 |
| 官方定义 | 官方博客 / docs 提炼出的定义和边界 | 官方来源优先 |
| 产品化路径 | 这个概念怎样落到 Claude Code / coding agent / workflow | 至少 2 条官方或产品来源 |
| 人物信号 | Boris 等人的观点和关键词 | 只做信号，不当最终事实 |
| 深度解释 | YouTube / podcast 字幕中的长段解释 | 必须有字幕文本或可引用转写 |
| 论文根基 | agent、tool use、coding eval、workflow 相关论文 | 说明关联方式 |
| 公司策略回链 | 如果公司页已有 AI 投入或战略摘要，主题页可作为旁证链接 | 可选，不计入主题页达标 |
| 行动卡 | 用户接下来该读什么、试什么、跟踪什么 | 每条绑定来源 |

样板通过标准:

1. 至少 15 条证据来源。
2. 至少覆盖 `signal`、`official_definition`、`transcript_context`、`paper_foundation`、`implementation_signal` 五种角色。
3. 至少 6 条跨来源关联边，例如 `tweet_keyword -> official_blog`、`official_blog -> paper`、`docs -> github_example`。
4. 页面上的每个强判断都有来源。
5. `pnpm lint`、`pnpm build`、本地浏览器 smoke 通过。

## 5. 数据模型

当前 `RawPoolItem` 强绑定 `personId`，适合人物资料池，不适合承载产品博客、论文主题、YouTube 字幕和 GitHub examples 这种非人物中心来源。知识主题页要新增主题中心的数据层，不要继续把所有东西硬塞到某个人下面。公司财报和 IR 材料应进入公司 / 机构页的数据层，再通过摘要回链到相关技术主题。

建议新增 4 张表:

```prisma
model KnowledgeThread {
  id                  String   @id @default(cuid())
  slug                String   @unique
  title               String
  summary             String
  whyNow              String?
  status              String   @default("draft")
  priorityScore       Float    @default(0)
  confidence          Float    @default(0.7)
  category            String?
  tags                String[] @default([])
  aliases             String[] @default([])
  refreshCadenceDays  Int      @default(14)
  lastReviewedAt      DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model KnowledgeSource {
  id            String   @id @default(cuid())
  sourceKind    String
  sourceOwner   String?
  title         String
  url           String
  urlHash       String   @unique
  text          String
  publishedAt   DateTime?
  fetchedAt     DateTime @default(now())
  metadata      Json?
}

model KnowledgeThreadSource {
  id              String   @id @default(cuid())
  threadId        String
  sourceId        String?
  rawPoolItemId   String?
  role            String
  relevanceScore  Float    @default(0.8)
  sourceWeight    Float    @default(1.0)
  evidenceQuote   String?
  summary         String?
  metadata        Json?
  createdAt       DateTime @default(now())
}

model KnowledgeThreadEdge {
  id             String   @id @default(cuid())
  threadId       String
  fromSourceId   String
  toSourceId     String
  relationType   String
  confidence     Float    @default(0.7)
  evidenceNote   String?
  createdAt      DateTime @default(now())
}
```

P0 可以先用静态 fixture 或 JSON seed 打样，P1 再落 Prisma migration。这样主线程能更快把页面范式做出来，数据层 session 可以并行设计迁移和读取 API。

## 6. 采集链路

每个知识主题用同一套采集流程:

1. Seed: 从人物 X 关键词、官方产品名、论文标题、公司名生成候选 query。
2. Source fetch: 分别抓 X、官方博客/docs、YouTube 字幕、OpenAlex / Semantic Scholar、GitHub / examples。
3. Normalize: 统一成 `KnowledgeSource`，保留 urlHash、publishedAt、sourceKind、sourceOwner、metadata。
4. Role classify: 给每条来源标 `signal`、`official_definition`、`transcript_context`、`paper_foundation`、`implementation_signal` 等角色。
5. Link: 抽取关键词、产品名、论文名、公司名、人物名，建立 `KnowledgeThreadEdge`。
6. Score: 用来源权重、时间新鲜度、主题相关度、重复度算 `relevanceScore`。
7. Review: 人工或 Mimo 复核薄弱来源、重复来源和过度归因。
8. Publish: 只有证据覆盖达标的 thread 才从 draft 进入 published。

采集脚本建议:

| 脚本 | 作用 |
|---|---|
| `scripts/knowledge/seed_thread_sources.ts` | 根据 thread seed 生成候选来源 |
| `scripts/knowledge/fetch_official_sources.ts` | 抓官方博客、docs、changelog、RSS |
| `scripts/knowledge/fetch_youtube_transcripts.ts` | 按视频 URL 或 query 抓字幕 |
| `scripts/knowledge/fetch_implementation_sources.ts` | 抓 GitHub、examples、docs snippets 等工程落地来源 |
| `scripts/knowledge/materialize_thread_edges.ts` | 抽取跨来源关联边 |
| `scripts/knowledge/review_thread_pack.ts` | 输出 Mimo 可复核包 |

财报抓取如果要做，应放到公司 / 机构页链路，例如 `scripts/company/fetch_financial_sources.ts`，不放进知识主题页 P0。

## 7. Mimo 批量生产规范

Mimo 的输入:

```json
{
  "slug": "loop-engineering",
  "title": "Loop Engineering",
  "seedKeywords": ["loop engineering", "Claude Code", "coding agent workflow"],
  "mustHaveEntities": ["Boris Cherny", "Anthropic", "Claude Code"],
  "requiredRoles": ["signal", "official_definition", "transcript_context", "paper_foundation", "implementation_signal"],
  "sourceLimits": {
    "maxPerRole": 8,
    "minTotal": 15
  }
}
```

Mimo 的输出:

```json
{
  "thread": {
    "slug": "loop-engineering",
    "title": "Loop Engineering",
    "summary": "...",
    "whyNow": "...",
    "confidence": 0.82,
    "status": "review_ready"
  },
  "sources": [
    {
      "url": "...",
      "title": "...",
      "sourceKind": "official_blog",
      "role": "official_definition",
      "evidenceQuote": "...",
      "summary": "...",
      "relevanceScore": 0.91
    }
  ],
  "edges": [
    {
      "fromUrl": "...",
      "toUrl": "...",
      "relationType": "productized_as",
      "evidenceNote": "..."
    }
  ],
  "review": {
    "missingRoles": [],
    "weakSources": [],
    "duplicateGroups": [],
    "publishReadiness": "ready"
  }
}
```

Mimo 验收规则:

1. 来源不足时只能标 `thin`，不能强行发布。
2. X 内容只作为信号，不能替代官方定义。
3. 主题页不直接生产财报类判断；公司战略和投入判断应在公司 / 机构页完成，再以 `company_strategy_context` 回链。
4. YouTube 内容必须有字幕、逐字稿或可靠转写，不接受只有视频标题的判断。
5. 每条 edge 要说明关系类型，不能只说“相关”。
6. 引文要短，页面展示以转述为主。

## 8. 并行 session 拆分

主线程保留黄金样板，其他 session 并行推进可以拆成 4 条:

| Session | 目标 | 交付物 | 边界 |
|---|---|---|---|
| S1 来源资料包 | 为 Loop Engineering 找齐官方博客、YouTube 字幕、论文、工程实现来源 | `docs/knowledge-threads/loop-engineering-source-pack.md` 和候选 JSON | 只做资料和证据，不改 schema |
| S2 数据层 | 设计并实现 KnowledgeThread / KnowledgeSource 最小模型和读取 API | Prisma migration、`lib/knowledge-threads.ts`、seed 脚本 | 不碰现有 X Search 未提交改动 |
| S3 页面模板 | 做 `/threads/[slug]` 样板 UI 和 fixture 渲染 | 页面、组件、responsive smoke | 先用 fixture，不等待 DB |
| S4 采集链路 | 梳理官方博客、YouTube 字幕、论文、工程实现抓取脚本的最小可跑版本 | `scripts/knowledge/*` dry-run 脚本和 README | 默认 dry-run，不写生产 DB |

并行策略:

1. 所有 session 用独立 worktree。
2. 每个 session 只改自己负责的文件，避免互相踩。
3. 主线程最终负责合并方向和验收，不让并行 session 自己发布。
4. 每条 session 都必须给出验证命令或无法验证的原因。

## 9. 里程碑

### P0: 黄金样板和可复制规范

完成条件:

1. `/threads/loop-engineering` 可以本地访问。
2. 页面展示真实来源和跨来源关联。
3. Mimo 输入输出 schema 固化。
4. 样板页通过 lint、build、浏览器 smoke。

### P1: 数据层入库

完成条件:

1. KnowledgeThread 相关表迁移完成。
2. Loop Engineering 从 DB 或 seed 读取，不再只靠静态页面。
3. 官方博客、YouTube 字幕、论文、工程实现至少各有一条来源可入库。

### P2: 10 个高价值主题批量生产

候选:

1. Agentic Coding
2. Computer Use
3. Context Engineering
4. Tool Use
5. Inference Scaling
6. AI Coding Eval
7. Multi-agent Research
8. Long-running Agents
9. MCP
10. Enterprise AI Agents

完成条件:

1. 每个主题都有 `review_ready` 数据包。
2. 至少 5 个主题达到 published 标准。
3. 首页或导航能暴露知识主题入口。

### P3: 监控和产品化输出

完成条件:

1. 每周自动发现新来源和弱信号。
2. Watchlist / newsletter 可以订阅 thread。
3. 人物页、机构页、主题页都能反链到 thread。
4. Compare report 可以引用 thread 证据。

## 10. 验证标准

本地验证:

```bash
pnpm lint
pnpm build
PERSON_UX_BASE_URL=http://127.0.0.1:4001 node --test scripts/test/person-directory-detail-ux.test.mjs
```

页面验证:

1. 桌面和移动端首屏不溢出。
2. 所有外链可点击。
3. 主题页没有无来源强判断。
4. 证据来源、角色和关联边能被用户看懂。
5. 空数据状态不会伪装成 ready。

发布前验证:

1. 本地 build 通过。
2. 浏览器 smoke 通过。
3. 新 migration 如有，先跑 migration plan。
4. 不从未审核的 Mimo 输出直接写生产。
5. 生产 smoke 至少覆盖 `/threads/loop-engineering` 和已有 `/topic/Agent`。

## 11. 当前决策

1. 主线程先做 `Loop Engineering` 黄金样板。
2. 新增 `/threads/[slug]`，不替换现有 `/topic/[slug]`。
3. P0 可以 fixture 先行，P1 再落数据库表。
4. Mimo 在样板后负责批量生产和复核，不负责初始产品范式。
5. 论文、官方博客、YouTube 字幕和工程实现作为一等来源进入主题页证据图谱；财报进入公司 / 机构聚合页，主题页只做可选回链。
