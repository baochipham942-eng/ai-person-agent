# 落地方案：作品/产品实体（含模型子类型）

> 状态：待产品负责人拍板 · 作者：劳拉 · 日期：2026-06-19
> 关联：`docs/homepage-ia-redesign.md`（人↔主题边已落地）；实体页模板原则见 `lib/entity-presentations/README.md`

## 0. 一句话目标

把散落在 223/286 个人物 `products` JSON 里、被重复抄录的产品（GPT-4 抄了 12 份、ChatGPT 8 份、Claude 7 份…）提炼成**第一类实体**，成为**一次连通人/公司/主题/话题四者的枢纽节点**。

## 1. 为什么是它（最高杠杆）

- **去重收益肉眼可见**：同一产品当 JSON 复制在几十人身上、互不关联。实体化后是一份真理源。
- **一次连四边**：产品天然有 贡献者(人) / 主理方(公司) / 体现的话题 / 所属主题。比单补任何一条边都值。
- **数据已就绪**：products JSON 有 `{name, org, url, type, year, category, description}`；`scripts/enrich/clean_products.ts` 已有 `deduplicateProducts`(按小写名) + `normalizeCategory` 可复用。
- **模型是子类型不是新实体**：GPT-4/Claude/Gemini/o1=model，Cursor=app，Transformer=architecture，Meta Superintelligence Labs=lab。一个 `type` 字段区分即可，不另立 Model 实体。

## 2. Schema（加法，不动现有 People.products 写路径）

```prisma
model Product {
  id               String   @id @default(cuid())
  slug             String   @unique
  name             String
  aliases          String[] @default([])
  type             String   // model | app | tool | framework | architecture | lab | dataset | benchmark | other
  category         String?
  description      String?
  url              String?
  iconUrl          String?
  firstYear        Int?
  organizationId   String?  // 主理公司（解析 org 名匹配 Organization）
  organizationName String?  // 冗余展示，匹配不到时回退
  topics           String[] @default([])
  threadSlugs      String[] @default([])   // 关联主题（手动/策展补）
  priorityScore    Float    @default(0)    // 实体页/横切排序
  status           String   @default("active")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  contributors     ProductContributor[]
  @@index([type]); @@index([organizationId]); @@index([priorityScore])
}

model ProductContributor {
  id        String   @id @default(cuid())
  productId String
  personId  String
  role      String   @default("contributor") // creator | lead | contributor
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  person    People   @relation(fields: [personId], references: [id], onDelete: Cascade)
  @@unique([productId, personId])
  @@index([productId]); @@index([personId])
}
```
（`People` 加反向 relation；`People.products` JSON 保留不动，作为回填源 + 回退。）

## 3. 回填脚本 `scripts/enrich/materialize_products.ts`

1. 扫全部 People 的 `products` JSON。
2. **归一名**：lowercase+trim + 别名表（`GPT-4`/`GPT4`/`gpt-4` → 同一 slug；`Claude`/`Claude 3`… 的归并策略见决策点②）。复用 `deduplicateProducts`。
3. **分组合并**：同名归一 → 一条 Product，字段取最完整值（org/url/year/description 优先非空、年份取最早 firstYear）。
4. **建贡献者**：每个持有该 product 的人 → 一条 ProductContributor。role 默认 contributor；若该人是该 org 的 founder/CEO（查 roleCategory/personRoles）可标 creator（决策点③）。
5. **解析公司**：org 名匹配 Organization → organizationId；匹配不到留 organizationName。
6. **归一 type/category**：JSON 的 type/category → 上面 8 类枚举（复用 `normalizeCategory`）。
7. **review 清单**：歧义合并（同名不同 org、疑似撞名）只产清单人工确认，不硬并（沿用保守纪律）。
8. 幂等 + 事务；`--dry-run` 先出统计与 review 清单再写。

## 4. 实体页 `/product/[slug]`（沿用实体页模板原则：人前置、证据下沉）

按读者问题排：是什么 → 谁做的 → 属于哪些主题/话题 → 哪家公司 → 细节/链接。
- Hero：名称 + type 徽标（模型/工具/框架）+ 主理公司 + 首发年 + 一句话定义。
- **贡献者（人前置）**：creator/lead/contributor 分组，复用 `TopPeopleSection` 风格，点进人物页。
- **所属主题 / 话题**：threadSlugs → 主题卡（复用 `CurrentThreadsStream`）；topics → 话题 chips。
- 描述 + 官网链接。
- ReferenceTier：数据来源与口径（安静层）。

## 5. 横切链接（把"人↔主题"升级成"人↔作品↔主题"三角）

- **人物页**：`FeaturedWorks` 的"代表成果" tab 现在渲染惰性 JSON → 改成链接到 `/product/[slug]`（活节点）。
- **公司页**：新增「旗舰作品」区块（该公司主理的 products，按 priorityScore）。
- **主题页**：新增「这个主题催生的作品」（按 threadSlugs 反查）。
- **主页（可选）**：作品 facet / 热门作品流，二期再说。

## 6. 待产品负责人拍板的决策点

1. **模型是否并入 Product**：建议 ✅ 并入（type=model），不另立实体。
2. **归并粒度**：`GPT-4`/`GPT4` 必并；`GPT-3`/`GPT-4`/`o1` 是否并成"GPT/OpenAI 模型系列"还是各自独立？建议**各自独立**（它们是不同产品），只并大小写/连字符变体，其余进 review 清单人工定。
3. **贡献者 role**：能否从现有数据推断 creator/lead？JSON 无 role。建议默认全 contributor，仅当该人是该 org 的 founder/CEO 时标 creator；更细留后续策展。
4. **先做哪个**：✅ 产品负责人拍板**先 Course 热身再上 Product**。Course 热身已实现（2026-06-19）：`lib/courses.ts` + `/courses` 聚合页（按方向/难度/类型筛选，课程卡链讲师）+ 话题页「想系统学 X?」课程横切 + SiteHeader 加「AI 课程」导航。tsc 0 error，dev 渲染正确。Course 是 1:N（每课属一个讲师），课程链外部平台故不建内部详情页。**Product 实体待启动（本方案主体）。**
5. **生产库写入**：回填是 prod Neon 写操作（加 Product/ProductContributor 表 + 数据）。按惯例我写好 migration+脚本+`--dry-run`，执行那一步你授权再跑。

## 6.5 落地结果（2026-06-19，一期完成）

**关键修正（产品负责人两轮拍板）**：GPT-4/Claude 3 是模型不是"产品"——
- 实体用户可见一律「作品/成果」，按 `type` 区分 模型/产品/工具/框架/架构/实验室/基准；模型永不标"产品"。
- **模型收敛到系列**：GPT-1..5→「GPT」、Claude 各版本→「Claude」、o1/o3→「o 系列」等，避免版本噪音（Altman 页面不再被 GPT-1..5 刷屏）。
- **CEO/founder（roleCategory=founder）不进作品贡献者主区**，关系走公司边（回填跳过 180 次）。

**落地文件**：
- `prisma/schema.prisma`：`Product` + `ProductContributor`（表名内部沿用 Product）。
- `lib/work-taxonomy.ts`：归类单一真理源（系列折叠规则 + slug + type + 中文标签），回填与运行时共用。
- `lib/products.ts`：`fetchWorkPage` / `listWorksForPerson`。
- `scripts/enrich/materialize_products.ts`：回填（默认 dry-run，`--execute` 写；幂等 upsert；year 字符串区间已强制转 int）。
- `app/work/[slug]/page.tsx` + `components/work/WorkPageView.tsx`：实体页（贡献者人前置、类型徽标、话题 chips、参考层）。
- 人物页 `FeaturedWorks` 代表成果卡 → 链到 `/work/[slug]`（`workSlugs` 经 PersonPageClient + 服务端 `listWorksForPerson` 注入）。

**回填结果**：617 原始条目 → 497 作品（模型系列 9），**已写入 496/497**（缺 1 = "Apple…Strategy" 的 year 字符串 bug，代码已修，待一次授权 top-up `--execute` 补齐）。
**验证**：`/work/gpt`=「GPT（模型）」200、`/work/chatgpt`=「ChatGPT（产品）」、`/work/claude-code`=「Claude Code（工具）」Boris 核心作者、Boris 人物页代表成果链到 /work/claude-code；tsc（Product 相关）0 error。

**二期（待启动）**：公司页「旗舰作品」+ 主题页「催生的作品」横切；review 清单（10 个同名不同 org）人工校正；模型系列若需 benchmark/谱系再升级为独立实体。

## 7. 验收

- migration 加法、不动 People.products 写路径；`--dry-run` 先出去重统计 + review 清单。
- `/product/claude-code`(或样板)：贡献者可点进人物页、关联主题/公司正确；tsc 0 error。
- 人物页"代表成果"变为可点击实体链接，无回归。
- 全程加法 + 只读展示 + 可回退。

## 8. 工程量与风险（诚实）

比"人↔主题边"大一档：新 2 张表 + N:N join + 跨 286 人回填去重 + 新路由 + 3 处横切。
风险点：① 产品去重的撞名/同名不同物（靠 review 清单兜）；② 归一名表需要人工校一轮；③ 回填是 prod 写。
建议分两步交付：**一期**=schema+回填+实体页+人物页链接（核心闭环）；**二期**=公司页/主题页横切 + 主页 facet。
