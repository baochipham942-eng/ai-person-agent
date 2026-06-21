# 公司 / 机构详情页升级计划

日期: 2026-06-18
范围: `/org/[slug]`、`lib/entity-pages.ts`、`components/entity/EntityPageBlocks.tsx`
目标: 把现有机构目录页升级为公司级证据页，同时保留当前人物、履历、动态聚合能力。

## 1. 结论

公司 / 机构页应该承接财报、IR、earnings call、SEC、融资、合作新闻这类公司级材料。它回答的是“这家公司为什么投入 AI、投入到哪里、谁在推动、哪些产品或技术线程被公司战略支持”。

技术主题页不把财报当作 readiness 条件。主题页只在需要解释公司背景时回链公司页生成的 `company_strategy_context` 摘要。

本轮不建议直接改代码做页面 prototype。当前数据层仍然以人物为中心:

- `RawPoolItem.personId` 必填，适合人物来源池，不适合直接承载财报、IR、SEC filing。
- `ActivityEvent.personId` 必填，适合人物动态，不适合作为公司级事件主表。
- `Organization` 只有基础组织信息和 `PersonRole` 履历关系，没有官网、IR、产品、财务证据或策略摘要字段。
- `/org/[slug]` 已经用 `unstable_cache` 和首屏限制优化过，贸然复用人物来源查询会把页面拉重，也容易产生证据归属错误。

更合理的 P0 是先新增公司证据读取层和 UI 区块，但用 fixture 或新表驱动，不改现有人物数据层语义。

## 2. 现状结构

### `/org/[slug]`

当前页面是机构情报入口，首屏结构:

1. Header: 标题、说明、相关人物 / 当前履历 / 历史履历 / 近期动态。
2. 主栏: 关键人物、当前关键人物、历史人物与 Alumni、最近动态、代表论文与项目。
3. 侧栏: 内容覆盖、相关话题、匹配口径和机构别名。

当前页面价值偏“人和动态聚合”，不解释公司战略、产品路线、官方证据和资本投入。

### `lib/entity-pages.ts`

`fetchOrganizationPageData(organization)` 当前读取:

1. `fetchPersonDirectory` 获取机构相关人物。
2. `fetchActivityEvents` 获取人物来源池或持久活动事件。
3. `prisma.personRole.findMany` 获取当前 / 历史履历。
4. `fetchEntityWorksForPeople` 只按首屏人物 ID 查论文和 GitHub 项目。
5. `relatedTopics` 来自人物的技术标签统计。

这个路径对现有页面是对的，但它没有公司级 source、strategy summary、official product surface。

### `EntityPageBlocks.tsx`

当前组件以通用 entity block 为主:

1. `EntityHeader`
2. `TopPeopleSection`
3. `OrganizationRoleSection`
4. `ActivitySection`
5. `WorksSection`
6. `FacetCloud`
7. `CoveragePanel`

这些组件可以继续复用，但公司级证据需要新增独立区块，避免把财报、IR、产品发布混进“代表论文与项目”。

## 3. 新信息架构

### 首屏: 公司 AI 概览

目的: 让用户 10 秒内知道这家公司和 AI 的关系。

字段:

- 公司定位: 一句话说明公司业务和 AI 相关位置。
- AI 战略摘要: 来自官方博客、IR、earnings call、SEC 或高可信合作新闻的综合判断。
- 核心 AI 产品 / 平台: 例如 Claude、ChatGPT、Gemini、Grok、Copilot、Meta AI、Databricks Mosaic、Perplexity 等。
- 更新时间和证据覆盖状态。

页面呈现:

- Header 保持机构页身份，但标题从 `${organization} AI 关键人物` 调整为 `${organization} AI 证据页` 或 `${organization} AI intelligence`。
- Stats 从纯人物计数扩成 `关键人物`、`公司证据`、`关联产品`、`技术线程`。

### 公司级证据地图

目的: 把不同公司材料按角色归类，避免来源混用。

证据角色:

| role | 来源 | 页面用途 |
|---|---|---|
| `official_strategy` | 官方博客、公司 newsroom、CEO letter | 公司对 AI 的正式说法 |
| `product_release` | 产品发布、docs、changelog | 已产品化能力 |
| `financial_signal` | earnings call、10-K / 10-Q、IR deck | 资本投入、业务优先级、收入或成本压力 |
| `partnership_signal` | 云厂商、芯片、模型、企业客户合作新闻 | 生态位置和商业化路径 |
| `hiring_team_signal` | 履历、招聘、关键人物变动 | 团队扩张或方向变化 |
| `technical_thread_link` | `/threads/[slug]` | 公司战略和技术线程的回链 |

页面呈现:

- `CompanyEvidenceSection`: 按 role 分组展示 6-12 条来源。
- 每条来源展示标题、来源类型、日期、短摘要、证据强度。
- 财报和 IR 默认只出现在这里，不进入技术主题页 readiness。

### 人物与团队

目的: 继承现有机构页强项。

保留:

- 关键人物
- 当前关键人物
- 历史人物与 Alumni
- 人物变化 / role change

调整:

- 人物模块放在公司概览和公司级证据之后。
- `OrganizationRoleSection` 可以继续复用。
- 未来增加“团队变化”小时间线，聚合 `career` 和 `PersonRole` 变化。

### 关联技术线程

目的: 把公司证据和知识线程连接起来。

字段:

- `threadSlug`
- `threadTitle`
- `relationType`: `invests_in`、`productizes`、`researches`、`platform_for`
- `evidenceSourceId`
- `summary`

示例:

- Anthropic -> Loop Engineering: `productizes`
- OpenAI -> Agentic Coding: `productizes`
- NVIDIA -> Inference Scaling: `platform_for`
- Microsoft -> Enterprise AI Agents: `invests_in`

页面呈现:

- `RelatedThreadsSection`
- 链到 `/threads/[slug]`
- 主题页只回链公司页摘要，不直接吸收财报原文作为主题页达标证据。

### 相关 topic 和人物反链

目的: 保持现有站内探索路径。

保留:

- 相关 topic 侧栏
- 关键人物卡片
- 完整人物目录入口

新增:

- “被哪些 topic / thread 引用”反链，等 `/threads` 数据层落地后补。

## 4. P0 最小实现切片

P0 只做可验证、低风险、不会重塑现有人物数据层的一小段。

### P0.1 新增公司页 view model

新增 `CompanyPageIntelligence` 类型，先放在 `lib/entity-pages.ts` 或后续拆到 `lib/company-pages.ts`:

```ts
export interface CompanyEvidenceItem {
  id: string;
  role: 'official_strategy' | 'product_release' | 'financial_signal' | 'partnership_signal' | 'hiring_team_signal';
  sourceType: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: string | null;
  sourceLabel: string;
  confidence: number;
}

export interface CompanyProductItem {
  name: string;
  summary: string;
  url?: string;
}

export interface CompanyThreadLink {
  slug: string;
  title: string;
  relationType: 'invests_in' | 'productizes' | 'researches' | 'platform_for';
  summary: string;
}

export interface CompanyPageIntelligence {
  positioning: string | null;
  aiStrategySummary: string | null;
  products: CompanyProductItem[];
  evidence: CompanyEvidenceItem[];
  relatedThreads: CompanyThreadLink[];
  coverage: {
    evidenceCount: number;
    hasOfficialStrategy: boolean;
    hasFinancialSignal: boolean;
    hasProductRelease: boolean;
  };
}
```

P0 可以先返回空 intelligence，让 UI 有真实空态，不伪装成已完成。

### P0.2 新增 UI 区块

在 `components/entity/EntityPageBlocks.tsx` 增加三个纯展示组件:

- `CompanyOverviewSection`
- `CompanyEvidenceSection`
- `RelatedThreadsSection`

它们只消费 view model，不直接查 DB。

空态原则:

- 没有公司级证据时，明确显示“公司级证据尚未入库”。
- 不用人物动态顶替公司证据。
- 不把 coverage 标成 ready。

### P0.3 在 `/org/[slug]` 挂载但保持低风险

页面顺序建议:

1. `EntityHeader`
2. `CompanyOverviewSection`
3. `CompanyEvidenceSection`
4. `RelatedThreadsSection`
5. `TopPeopleSection`
6. `OrganizationRoleSection`
7. `ActivitySection`
8. `WorksSection`
9. 侧栏保留 coverage、related topics、matching notes

如果 P0 没有真实公司 evidence 数据，代码可以只展示空态 prototype。上线前要确认产品上能接受“公司证据尚未入库”的状态。

### P0.4 fixture 可选项

如果要让 prototype 更像真实页面，建议只在本地或 test fixture 使用静态数据:

- `fixtures/company-pages/anthropic.json`
- `fixtures/company-pages/openai.json`

fixture 不进入生产默认路径，除非显式 `NODE_ENV !== 'production'` 或 storybook / test route 使用。

## 5. P1 数据层方案

P1 再落 Prisma migration，避免把公司材料硬塞 `RawPoolItem`。

建议新增:

```prisma
model CompanySource {
  id             String   @id @default(cuid())
  organizationId String
  sourceKind     String
  role           String
  title          String
  url            String
  urlHash        String   @unique
  text           String
  summary        String?
  publishedAt    DateTime?
  fetchedAt      DateTime @default(now())
  confidence     Float    @default(0.8)
  metadata       Json?
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([role])
  @@index([sourceKind])
  @@index([publishedAt])
}

model CompanyProduct {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  summary        String
  url            String?
  metadata       Json?
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
}

model CompanyThreadLink {
  id             String   @id @default(cuid())
  organizationId String
  threadSlug     String
  relationType   String
  summary        String
  evidenceSourceId String?
  confidence     Float    @default(0.8)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([threadSlug])
}
```

说明:

- `CompanySource` 是公司页材料主表，承接官方博客、产品发布、docs/changelog、IR、earnings call、SEC、融资和合作新闻。
- `RawPoolItem` 继续服务人物页，不改变 `personId` 约束。
- `CompanyThreadLink` 暂时用 `threadSlug` 字符串，等 `KnowledgeThread` 表落地后再加 relation。

## 6. 采集链路

脚本建议放在 `scripts/company/`，和知识主题采集分开:

| 脚本 | 作用 |
|---|---|
| `seed_company_sources.ts` | 按公司别名生成官网、IR、docs、changelog、newsroom 查询 |
| `fetch_company_official_sources.ts` | 抓官方博客、newsroom、docs、changelog |
| `fetch_company_financial_sources.mjs` | 抓 IR、earnings transcript、SEC filing 摘要 |
| `classify_company_sources.ts` | 标 role、sourceKind、confidence |
| `materialize_company_thread_links.ts` | 生成公司到 `/threads` 的回链 |

写入策略:

- 默认 dry-run 输出 JSON。
- 人工复核后再写 staging / dev DB。
- 不写生产 DB。
- 财报类来源只进入 `CompanySource.role = financial_signal`。

### P1 dry-run contract update

本轮 P1 先不落 Prisma migration，先用 `docs/company/company-source-contract.schema.json` 固化 `CompanySource` / `CompanyStrategyContext` 的 JSON contract。

原因:

1. 当前目标是验证公司证据候选、来源角色、去重和 thread readiness 边界，不需要持久写入。
2. 真实 `CompanySource.organizationId` 需要先决定 organization canonical ID 和回填策略，直接 migration 会把候选材料误推成已入库事实。
3. 公司页 P0 view model 已经能消费 evidence / relatedThreads，P1 dry-run 只需要输出可映射的 preview，再由后续 staging materialize 接入。

新增 review gate:

```bash
node scripts/company/review_company_sources.mjs --input=docs/company/anthropic-evidence-seed.json --strict
```

它检查五类 P1 source role 覆盖、canonical URL 去重、财务/IR 只留公司页、`company_strategy_context.sourceIds` 必填，以及不向技术 thread readiness 导出来源。

## 7. 页面验收口径

P0 验收:

1. `/org/[slug]` 仍能展示原有人物、履历、动态、作品。
2. 公司级证据区块有明确空态，不伪装成 ready。
3. 没有财报内容进入 `/topic` 或 `/threads` readiness。
4. 不增加生产 DB 写入。
5. `pnpm lint`、`pnpm build` 通过。

P1 验收:

1. 至少 2 个公司有公司级 evidence 数据包，例如 Anthropic 和 OpenAI。
2. 每家公司至少覆盖 `official_strategy`、`product_release`、`financial_signal` 三类中的两类。
3. 每条强判断都能回到 `CompanySource`。
4. 关联技术线程只引用公司页摘要和 source id，不复制财报全文进主题页。

## 8. 本轮建议

这轮只交付计划文档，不改 UI 代码。

原因:

1. 当前 worktree 有 xAI / X Search 相关脏改，任务边界明确要求不碰。
2. 公司证据缺少一等数据模型，直接做页面会把 placeholder 当成产品事实。
3. `/org/[slug]` 刚经历性能优化，P0 应先固化 view model 和空态，再接真实数据。
4. 财报、IR、earnings call 的语境已经确认属于公司页，应该先把数据边界写清楚。

下一步可执行切片:

1. 新增 `CompanyPageIntelligence` 类型和 `buildEmptyCompanyIntelligence`。
2. 新增三个展示组件，但只展示空态和 fixture。
3. 在 `/org/[slug]` 挂载 company sections。
4. 跑 `pnpm lint`、`pnpm build`。
5. 再开 P1 做 `CompanySource` 数据层和 dry-run 采集脚本。
