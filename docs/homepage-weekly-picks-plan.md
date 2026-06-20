# 首页「本周推荐」异质卡片流落地方案

> 状态：待产品负责人拍板 · 作者：劳拉 · 日期：2026-06-19
> 关联：`docs/homepage-ia-redesign.md`（以人为圆心的 IA）、`lib/entity-presentations/README.md`（实体页模板原则）
> 前置认知：本方案**不新增数据管线**，是把首页两个现有模块合并升级 + 重做排序混合逻辑。

## 0. 一句话目标

把首页现在割裂的两个模块——「当期主题」(`CurrentThreadsStream`，3 卡网格) + 「本周推荐」(`ActivityFeed`，单卡轮播)——**合并成一个 3–10 张的异质编辑精选流**，统一叫「本周推荐」。一张卡可以是：主题 / 人物 / 新闻 / 论文 / 视频（YouTube）/ 播客，每张都带一句「为什么本周值得看」。

## 1. 现状盘点（核对过代码，别再按错误假设设计）

| 事实 | 证据 | 对方案的影响 |
|---|---|---|
| 「本周推荐」名字已被占用 | `components/home/ActivityFeed.tsx:75` `<h2>本周推荐</h2>` | 不是新建模块，是**升级/替换** `ActivityFeed` |
| 当期主题是另一个独立模块 | `components/home/CurrentThreadsStream.tsx`（3 卡网格） | 要把它**并进**统一流，不再单列 |
| 五类卡数据已全部在库 | `lib/activity.ts:9-16` `eventType` 枚举含 `paper/video/article/podcast` | 视频/论文/新闻**零新增数据**，直接能用 |
| YouTube 视频已在持久化入库 | `scripts/enrich/process_recent_youtube.ts:401`、`lib/inngest/signalJobs.ts:475`、`scripts/activity/materialize_activity_events.mjs` | 视频底座已就绪，缺的是"排序露出" |
| 每条活动已带推荐理由 + 人物归属 | `lib/activity.ts:761 buildImportanceReason`、`ActivityFeed.tsx:144`「推荐理由」 | `whyNow` 字段**不用补**，已有 |
| **视频被排序压到最底** | `lib/activity.ts:996` `eventTypeScore { video:1, podcast:2 }`，tier `known_person_event` adjustment `-6` | **核心卡点**：视频几乎浮不上来，要重做混合器 |
| 已有成熟的质量/去重/分层 | `activityQualityScore` / `buildActivitySourceProfile`(5 tier) / `buildActivityDedupeKeys` | 复用，不重写；只在其上加"类型多样性" |
| 主题数据来自策展注册表 | `lib/knowledge-thread-people.ts` `CURATED_THREADS` / `listFeaturedThreads` | 主题适配器直接复用 |

**一句话结论**：80% 的数据和逻辑已存在。真正的新增工作是 ①一个统一卡片类型 + 适配层 ②一个"类型配额"混合器（让视频/论文/主题都露脸）③卡片渲染升级。

## 2. 待拍板的核心决策（判断我给，决定你拍）

### D1 · 人物卡怎么定义？
人物本身没有"本周动态"这种天然时效信号——每条活动卡其实**已经**人物归属（头像/职位）。所以独立"人物卡"需要一个触发理由，否则就是把目录里的人随机塞进来。
- **方案 A（推荐，MVP）**：不做独立人物卡。人物存在感由"每张活动卡都挂人"承载。`人物` 作为可选策展位放到 P2。
- 方案 B：人物卡 = "本周动态最密集 / `weeklyViewCount` 飙升"的人，带一句"本周 TA 有 N 条新动态"。实现稍重。
- **我的建议**：A。先把主题/视频/论文/新闻四类异质流跑顺，人物卡作为后续增量，避免 MVP 同时调五种卡的排序。

### D2 · 排序：纯算法 vs 人工 pin + 算法补齐？
- **方案 A（推荐）**：**混合**——一个 `weekly-picks` 人工策展注册表（0–N 条 pin 槽，置顶、可控质量），剩余槽位由现有 `activityQualityScore` + 新的**类型配额**算法补齐。
- 方案 B：纯算法。可控性差，容易又出"全是同一类 / 像坏掉"。
- 方案 C：纯人工。每周维护成本高，违背"数据飞轮"。
- **我的建议**：A。延续项目"seed 驱动 + 质量可控"风格，对齐 `CURATED_THREADS` 的成熟模式。

### D3 · 数量与空态
- 默认 **6–8 张**，弹性区间 **3–10**。
- **不足不凑数**：某周优质卡只有 3 张就放 3 张（对齐实体页"不像坏掉"底线）。
- 全空：保留现有 `ActivityFeed` 的降级文案"本周推荐正在更新，目录仍可继续使用"。

### D4 · 视频卡要不要拉缩略图 + 时长？
视频的卖点就是信息密度 + 视觉。
- **我的建议**：拉。`lib/datasources/youtube.ts` 抓取时已有缩略图/时长字段，需**确认是否落进 `ActivityEvent.metadata` / `RawPoolItem.metadata`**（实现第一步先验证）；有则渲染缩略图 + 时长 badge，无则降级纯文字卡，不阻塞。

## 3. 卡片类型 → 数据源映射（就绪度分级）

| 卡 kind | 中文标签 | 数据源 | 就绪度 | 备注 |
|---|---|---|---|---|
| `thread` | 知识主题 | `CURATED_THREADS` / `listFeaturedThreads` | ✅ 直接 | 复用现有 ThreadCard 字段 |
| `video` | 视频 | `ActivityEvent`(eventType=video, sourceType=youtube) | ✅ 数据在库，**需提权** | 本方案重点照顾对象 |
| `paper` | 论文 | `ActivityEvent`(eventType=paper, sourceType=openalex) | ✅ 直接 | |
| `article` | 新闻/文章 | `ActivityEvent`(eventType=article, exa/company_source) | ✅ 直接 | 含官方公司源 |
| `podcast` | 播客 | `ActivityEvent`(eventType=podcast) | ✅ 直接 | 量少，配额里低权 |
| `person` | 人物 | directory / weeklyViewCount | ⚠️ P2 | 见 D1，MVP 不做 |

> github / role_change / relation_change 这三类活动**不进**本周推荐主流（信号偏内部/低密度），继续留在 `/digest` 全量流。

## 4. 统一抽象：`FeaturedCard` 联合类型 + 适配层

延续实体页"组件纯渲染、加数据不碰组件"的设计。

```ts
// lib/home/featured-cards.ts （新）
export type FeaturedCardKind = 'thread' | 'video' | 'paper' | 'article' | 'podcast' | 'person';

export interface FeaturedCardBase {
  kind: FeaturedCardKind;
  id: string;
  title: string;
  whyNow: string;          // 推荐理由，必填——没有不进流
  href: string;
  // 人物归属（thread 可空，活动类必有）
  person?: { id: string; name: string; avatarUrl: string | null; currentTitle: string | null } | null;
  topics: string[];
  occurredAt: string | null;
  pinned?: boolean;        // 来自 weekly-picks 注册表
  rankScore: number;       // 排序用
}

export interface VideoFeaturedCard extends FeaturedCardBase {
  kind: 'video';
  thumbnailUrl: string | null;   // D4：有则渲染
  durationLabel: string | null;
  sourceLabel: string;           // 'YouTube'
}
// ... 其余 kind 同理

// 适配器：把现有数据源映射成统一卡
export function threadToFeaturedCard(t: FeaturedThread): ThreadFeaturedCard
export function activityToFeaturedCard(e: ActivityEvent): FeaturedCard | null  // 按 eventType 分流，github/role/relation 返回 null
```

**关键纪律**：`whyNow` 缺失（既无 `thread.whyNow` 也无 `event.importanceReason`）→ 适配器返回 `null`，不进流。这是异质流不塌成大杂烩的护栏。

## 5. 排序：类型多样性混合器（本方案唯一的新算法）

现有 `activityQualityScore` 把视频压到底，直接复用会让"本周推荐"几乎没有视频。新增一层**配额混合**，放在 `lib/home/weekly-picks.ts`（新）：

```
1. pin 层：weekly-picks 注册表里本周 pin 的卡，按注册顺序置顶（最多 N 条，N≤一半槽位）。
2. 候选池：threads（listFeaturedThreads）+ activities（fetchActivityEvents，limit 拉宽到 ~24）
   → 各自适配成 FeaturedCard → 过滤 whyNow 为空 → 复用现有 dedupe。
3. 类型配额：保证最终流里类型多样——
   - 视频/论文做**保底配额**（如各至少 1–2 张，若候选池有），避免被高分新闻挤光；
   - 同一人物/同一类型连续不超过 2 张（打散，避免"一屏全是 X"）。
4. 组内排序：配额满足后，剩余槽位按 rankScore（复用 activityQualityScore，但 video 的 eventTypeScore 从 1 上调，
   消除"视频天然垫底"）+ recency 补齐。
5. 截断到 D3 的数量；不足不凑。
```

> 为什么不直接改 `activityQualityScore` 里 video 的分？因为那个分同时服务 `/digest` 全量流和人物页活动流，全局调权会影响别处。**多样性配额只作用于首页本周推荐**，是局部叠加，可回退。

## 6. 策展注册表（`weekly-picks`）

```ts
// lib/home/weekly-picks.ts （新）—— 对齐 CURATED_THREADS 模式
export interface WeeklyPickSeed {
  kind: FeaturedCardKind;
  ref: string;          // thread slug / activityEvent id / person id / 外部 url
  whyNowOverride?: string;  // 可覆盖默认推荐理由，手写质量优于 generated
  weekOf?: string;          // 'YYYY-MM-DD'，标记归属周；不填=长期 pin
}
export const WEEKLY_PICKS: WeeklyPickSeed[] = [ /* 每周人工/半自动加几条 */ ];
```

加一条本周精选 = 往数组加一行，**不碰组件**。后续可上：①admin 后台填 pin（B 方案）②算法自动提名 + 人工确认（数据飞轮）。

## 7. 卡片渲染规格

统一渲染器 `components/home/WeeklyPicksStream.tsx`（替换 `CurrentThreadsStream` + `ActivityFeed`），按 kind 分发到子卡组件。各卡公共结构：`[类型标签 chip] + 标题 + whyNow(推荐理由) + 人物 chip(头像+职位) + topics`。差异：

- **video**：左/上缩略图 + 时长 badge + ▶ 图标 + "YouTube"；点击新窗口开原视频（外链，不建详情页）。
- **thread**：标签"知识主题"，点进 `/threads/[slug]`（站内），底部"关键人物"。
- **paper**：标签"论文" + 来源 OpenAlex，外链。
- **article**：标签按来源（"官方公司源"/"Web"）。
- **podcast**：标签"播客"。

视觉权重对齐实体页原则：推荐理由是"为什么值得看"的钩子，要显眼；类型标签用现有橙色点 chip 风格保持一致。

## 8. 与 `/digest`（本周动态 tab）的分工（写死，别重叠）

| | 首页「本周推荐」 | `/digest` 本周动态 |
|---|---|---|
| 定位 | 编辑精选钩子 | 全量动态时间线 |
| 数量 | 3–10 精排 | 全量分页 |
| 排序 | pin + 类型配额混合 | 时间/全量 |
| 卡类型 | thread/video/paper/article/podcast | 全部（含 github/role/relation） |
| 目的 | 勾住、点进去 | 完整可回溯 |

首页是 highlights，digest 是 full feed。**首页绝不做成 digest 的缩略版。**

## 9. 分阶段实施

### 阶段一（MVP，本轮交付）
1. **验证视频元数据**：查 `ActivityEvent.metadata` / `RawPoolItem.metadata` 是否含 thumbnail/duration（决定 D4 渲染降级与否）。
2. 新增 `lib/home/featured-cards.ts`：`FeaturedCard` 类型 + `threadToFeaturedCard` / `activityToFeaturedCard` 适配器（`whyNow` 空则 null）。
3. 新增 `lib/home/weekly-picks.ts`：`WEEKLY_PICKS` 注册表（先填 3–5 条样板）+ 多样性配额混合器。
4. 新增 `components/home/WeeklyPicksStream.tsx`：统一渲染器 + 各 kind 子卡（video 卡按 D4 处理）。
5. `app/page.tsx` + `ResearcherDirectory`：用 `WeeklyPicksStream` 替换 `CurrentThreadsStream` + `ActivityFeed`，拉宽 activity 候选池 limit。
6. 四类卡（thread/video/paper/article）跑通；podcast 顺带带上。

### 阶段二（增量，按需）
- D1 方案 B：人物 spotlight 卡。
- weekly-picks admin 后台填 pin（替代手改数组）。
- 算法自动提名候选 → 人工确认（数据飞轮闭环）。
- A/B：本周推荐露出后首屏点击率 vs 旧双模块。

## 10. 验收标准

- 首屏第一眼是**异质精选流**，且**至少出现 1 张视频卡和 1 张主题卡**（证明配额生效，不再被排序压死）。
- 每张卡都有非空推荐理由；无 `whyNow` 的候选不出现。
- 数量在 3–10，空态/不足态文案正确，不凑数。
- `/digest` 行为不回归；现有人物目录、活动 API 不回归。
- `bunx tsc --noEmit` 零错误；dev(4101) `curl /` HTTP 200 + grep 到 video/thread 渲染标记。
- 全程"加法 + 局部叠加 + 可回退"：多样性配额只作用于首页，不改全局 `activityQualityScore`、不动 `/digest` 与人物页活动流、不动写路径。

## 11. 风险与回退

| 风险 | 对策 |
|---|---|
| 视频元数据无缩略图 | D4 降级纯文字卡，不阻塞 MVP |
| 候选池视频太少，配额凑不满 | 配额是"有则保底"，没有就跳过，不硬塞低质视频 |
| 合并后首屏信息过载 | 数量上限 10 + 类型打散 + 默认 6–8 |
| 改排序影响别处 | 多样性配额是首页局部新层，全局分不动；回退=恢复两个旧组件 |
| 异质卡视觉割裂 | 公共卡结构统一，仅 video 加缩略图差异 |

## 12. 实施结果（2026-06-19 完成，分支 feat/people-thread-edge-homepage，未提交）

四个决策按产品负责人拍板落地：D1 做人物卡（本周 pin Boris + Tibo）、D2 pin+配额混合、D3 默认 8/弹性 3–10、D4 视频拉缩略图。

**新增文件**：
- `lib/home/featured-cards.ts`：`FeaturedCard` 统一类型 + `threadToFeaturedCard`/`activityToFeaturedCard`/`buildPersonCard` 适配器。`whyNow` 空则返回 null（不进流的护栏）；视频缩略图由 YouTube url 推导（`img.youtube.com/vi/<id>/hqdefault.jpg`，零 DB 改动）；本层重算 `rankScore`，video 不再垫底。
- `lib/home/weekly-picks.ts`：`WEEKLY_PICKS` 策展注册表 + `resolveWeeklyPicks` + 类型配额混合器（必保 video/paper/article/thread 各 1，主题压到 ≤2，避免文章淹没；`spreadByKind` 防 3 连同类）。
- `app/api/weekly-picks/route.ts`：筛选 reactive 的 API（s-maxage=300）。
- `components/home/WeeklyPicksStream.tsx`：统一渲染器，按 kind 分发（人物纵向头像卡 / 视频缩略图+▶ / 其余横向）。

**改动文件**：
- `lib/activity.ts`：`FetchActivityParams` 加可选 `eventTypes` 过滤（持久化 where 子句 + 最终结果过滤，加法、向后兼容）；非 article 桶跳过 companySource 查询省往返。
- `app/page.tsx` + `components/home/ResearcherDirectory.tsx`：用 `WeeklyPicksStream` 替换 `CurrentThreadsStream` + `ActivityFeed`（两个旧组件保留未删，便于回退；`CurrentThreadsStream` 仍被 `/topic/[slug]` 使用，未动）。

**与原方案的偏差（已确认/有理由）**：
1. **Tibo 用 inline 策展卡，未入生产库**：`prisma/schema.prisma` 正被另一会话改动（mid-migration），避开向在途 schema 写新人物的风险。Tibo（Thibault Sottiaux，Codex 负责人，GitHub `tibo-openai`）头像已存 `public/avatars/tibo-sottiaux.jpg`，卡片链到其 GitHub（外链）。**待办：schema 稳定后走 `add_priority_ai_people` 免费流程正式入库，再把 seed 从 inline 改成 ref，卡片即变站内人物页。** `WeeklyPickSeed` 已同时支持 `ref`（库内）和 `inline`（未入库）两种。
2. **视频单独成桶**：实测合桶会被 `fetchActivityEvents` 内部质量排序（video 权重最低）挤掉，故 video 独立 1 桶、paper+podcast 合桶、article 单独桶，共 3 次 DB 调用。

**验证证据**：
- `bunx tsc --noEmit` 全仓 0 error。
- `/api/weekly-picks` 连续 3 次稳定返回 8 卡：person 2 + thread 2 + **video 2** + article 1 + paper 1（配额生效，视频稳定露出）。
- dev(4101) 截图实跑：Boris（站内人物卡）+ Tibo（带真实头像）+ Loop Engineering/Agentic Coding（主题）+ 2 张带 YouTube 缩略图和 ▶ 的视频卡，渲染一致、console 0 error。
- **性能说明**：dev 下该模块 API ~4–8s（Neon 冷启动 + dev 抖动），**与被替换的旧 `/api/activity` 同一量级**（实测旧端点 3.9–6.6s），非本次引入的新性能问题；prod 有 `s-maxage=300` 缓存 + pooler 预热，且 SSR 7s 超时不阻塞目录首屏（picks 走 SWR 渐进填充）。
