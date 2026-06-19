# 信息架构与主页改造方案：以「人」为圆心的 AI 动态情报库

> 状态：待林晨拍板 · 作者：劳拉 · 日期：2026-06-19
> 关联：实体页模板原则（公司页/主题页已跑通，见 `lib/entity-presentations/README.md`）

## 0. 一句话目标

把产品从「一个可筛选的 AI 人名册」升级成「以人为中心的 AI 动态情报首页」：
**上面是事（主题），中间是人，话题和公司是坐标轴。**

## 1. 四实体定位（统一口径，别再混）

| 实体 | 本质 | 数据形态 |
|---|---|---|
| **人物 People** | 核心原子实体、一切线索的交汇点 | 重 DB |
| **公司 Organization** | 人的组织载体 | `PersonRole`(连人) / `CompanyThreadLink`(连主题) |
| **话题 topic** | **不是实体**，是分类坐标系/导航 facet | `People.topics[]` 聚合 |
| **主题 KnowledgeThread** | 带时效的策展事件（有 `whyNow`） | 策展 DB：summary/sources/edges/status |

- **话题 = 经度（静态分类）**："Agent""对齐""RAG"。
- **主题 = 纬度上的当期热点（动态事件）**："Loop Engineering""Agentic Coding"。
- **主题 ⊂ 话题**：一个主题是某个话题的"当期热点切片"。

## 2. 关系现状与缺口

| 关系 | 现状 | 载体 |
|---|---|---|
| 人 ↔ 公司 | ✅ 强 | `PersonRole` |
| 人 ↔ 话题 | ✅ 强 | `topics[]` / `topicRanks` / `topicDetails` |
| 人 ↔ 人 | ✅ 有 | `PersonRelation` |
| 公司 ↔ 主题 | ✅ 有 | `CompanyThreadLink` |
| 话题 ↔ 主题 | ⚠️ 弱（靠 tag 隐含） | `KnowledgeThread.tags` |
| **人 ↔ 主题** | ❌ **断边（最大缺口）** | source 仅有 `owner` 字符串，未结构化连到 People |

**核心病灶**：一个「人物库」，最重的策展内容（主题）却没连回人物。主题页没有"谁提出/推动/质疑"，人物页没有"TA 卷入哪些当期热点"。补上这条边是解锁主页升级的前置卡点。

## 3. 阶段一（前置卡点）：接通「人 ↔ 主题」

镜像现有 `CompanyThreadLink` 的成熟模式（加法、只读展示、可回退）。

**3.1 Schema**（`prisma/schema.prisma`）新增 join 模型：
```prisma
model ThreadPersonLink {
  id                String   @id @default(cuid())
  threadSlug        String
  personId          String
  relationType      String   // proposer 提出者 / driver 推动者 / skeptic 质疑者 / implementer 落地者
  summary           String
  evidenceSourceIds String[] @default([])
  confidence        Float    @default(0.8)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  person            People   @relation(fields: [personId], references: [id], onDelete: Cascade)
  @@unique([threadSlug, personId, relationType])
  @@index([threadSlug]); @@index([personId])
}
```
（`People` 加反向 relation 字段；不删不改任何现有写路径。）

**3.2 回填**：写 `scripts/threads/materialize_thread_people.mjs`，把每个 thread fixture 里 source 的 `owner` 字符串解析 → 匹配 `People`（按 name/aliases，匹配不到的产出 review 清单，不硬塞）。幂等 + 事务回滚，沿用 company 脚本规范。

**3.3 双向展示**（沿用实体页原则：人前置、不埋底）：
- 主题页 `app/threads/[slug]/page.tsx`：在「循环主角」之后、「参考与来源」之前，新增**「关键人物」**区块（proposer/driver/skeptic 分组，复用 `TopPeopleSection`）。
- 人物页 `components/person/PersonPageClient.tsx`：新增**「当前卷入的主题」**区块——人物从静态档案变成动态情报对象。

## 4. 阶段二：显式化「话题 ↔ 主题」

- `KnowledgeThread.tags` → 用 `normalizeDirectoryTopic` 归一到 canonical 话题。
- 话题页 `app/topic/[slug]/page.tsx`：顶部新增**「该方向的当期主题脉络」**（1–N 条 thread 卡片），话题页从"一堆人名"升级成"脉络 + 关键人物"。

## 5. 阶段三：主页升级（`app/page.tsx` + `components/home/`）

现状：主页 = `ResearcherDirectory` 纯目录，回答"有哪些人"，没回答"为什么现在/谁值得关注、凭什么"。

改造成按读者问题分层：

| 层 | 内容 | 回答 | 依赖 |
|---|---|---|---|
| ① 当期主题流 | 2–3 个高 `priorityScore` 的 thread，`whyNow` 驱动 + 头部人物头像 | "最近在发生什么" | 阶段一 |
| ② 人物目录 | 保留现有 directory，默认排序融合 `weeklyViewCount`+近期 `ActivityEvent` | "谁值得关注" | 现有 |
| ③ 话题/公司导航条 | facet/chips 进入器 | "按方向/机构逛" | 现有 |
| ④ 最近变化 | 现有 `ActivityEvent` 活动流 | "最近有何变动" | 现有 |

## 6. 决策记录（林晨 2026-06-19 拍板）

1. **人↔主题关系类型粒度**：proposer / driver / skeptic / implementer 四类。
2. **匹配不到的 owner**：✅ **只产 review 清单**（不自动建占位 People，保守、不污染人物库）。
3. **主页首屏权重**：当期主题流 3 条、不折叠。
4. **节奏**：✅ **一次性出完整三阶段实现**（阶段一为前置，但本轮一并交付 1+2+3）。

## 8. 实施结果（2026-06-19 完成，分支 feat/people-thread-edge-homepage）

架构决策：主题页是 fixture 驱动，故人↔主题用 **fixture/策展驱动 + 渲染时只读查 People** 实现，
不提前建无人渲染的 `ThreadPersonLink` DB 表（降级为「主题整体迁 DB 后」的 scale 路径）。

落地文件：
- `lib/knowledge-thread-people.ts`（新）：`CURATED_THREADS` 策展注册表 + `resolveThreadPeople`（主题页只读查 People，matched/unmatched）+ `getThreadsForPerson`（人物页反查）+ `listFeaturedThreads`/`listThreadsForTopic`（主页/话题页）。新增/补主题 = 加一条数据，不碰组件。
- 主题页：`components/knowledge/ThreadPageBlocks.tsx` 新增「关键人物」区块（人前置，循环之后、材料之前）+ 导航项；`app/threads/[slug]/page.tsx` 解析并传入。
- 人物页：`components/person/PersonPageClient.tsx` 新增「当前卷入的主题」区块；`app/person/[id]/page.tsx` 注入 `involvedThreads`。
- 主页：`components/home/CurrentThreadsStream.tsx`（新）+ `ResearcherDirectory` 顶部渲染 + `app/page.tsx` 传 `listFeaturedThreads(3)`。
- 话题页：`app/topic/[slug]/page.tsx` 左栏顶部「该方向的当期主题脉络」（复用 CurrentThreadsStream）。
- `scripts/threads/audit_thread_people.ts`（新）：只读审计，产 unmatched review 清单。

验证证据：
- `tsc --noEmit` 全仓 0 error。
- audit（只读，283 人库）：loop-engineering 3 人中 **Boris Cherny 已匹配**；**Addy Osmani / Geoffrey Huntley 不在库 → review 清单**（按决策不自动建占位）。
- 反查：Boris(`cmjxmgs83…`) → Loop Engineering（提出者）。
- dev(4101) 实跑三面均正确渲染：主题页「关键人物/谁在定义这个主题/Boris Cherny/提出者」、主页「当期主题 + 三条 thread」、Boris 人物页「当前卷入的主题/Loop Engineering」。

待办推进（2026-06-19 完成）：
1. ✅ Addy Osmani、Geoffrey Huntley、Phil Schmid 已入库（`scripts/enrich/add_thread_people.ts`，Wikidata 免费路径，无付费 API；无 Wikidata 命中走 TEMP qid，status=pending）。loop-engineering 现渲染 3/3 人。
2. ✅ agentic-coding 补 Boris Cherny（推动者）；context-engineering 补 Phil Schmid（提出者）+ Andrej Karpathy（推动者）。审计 6/6 全匹配、0 待确认。
3. ✅ 已富集这 3 人（`scripts/enrich/enrich_thread_people.ts`，聚焦只打这 3 人控成本）：头像 unavatar 免费下载、bio 上下文用 **Tavily**（Exa 本月额度用完）、description/currentTitle/topics/highlights/roleCategory 用 DeepSeek 合成，status 置 `ready`（目录可见）、completeness=60。坑：Tavily key 在 `.env.local`，`dotenv/config` 默认只读 `.env`，须显式 `loadEnv({path:'.env.local'})` 否则 searchTavily 静默返回 0 条。
   - 结果：Addy Osmani=Engineering Leader @ Google Chrome；Geoffrey Huntley=Independent Software Engineer（Ralph loop）；Phil Schmid=Staff Engineer DevEx/DevRel @ Google DeepMind。主题页带头像+职位渲染正确。
   - 仍可选（付费）：recrawl_robust(Exa,额度恢复后)/enrich_openalex(学术指标,这3人非学者意义不大)/calculate_influence(影响力分)。

## 7. 验收

- 阶段一：`/threads/loop-engineering` 出「关键人物」且人名可点进人物页；人物页出「当前卷入的主题」；tsc 零错误、无悬挂引用、现有渲染 marker 零回归。
- 阶段三：主页首屏第一眼即有动态主题，而非静态人名册；directory 行为不回归。
- 全程沿用"加法 + 只读 + 可回退"，不动现有写路径（对齐 company link 的对抗审查教训）。
