# AI 人物库产品力提升完整规划

> 日期: 2026-06-12
> 目标周期: 8 周形成可验证的产品升级闭环
> 适用范围: 首页、人物详情页、话题页、机构页、订阅与动态、关系图谱、可信度表达
> 关联文档: `docs/PRODUCT_EXECUTION_BOARD_2026_06.md`、`docs/audit-2026-06/PRODUCT_AUDIT_AND_ROADMAP.md`、`docs/UPGRADE_PLAN.md`、`docs/PERSON_DETAIL_DATA_REQUIREMENTS.md`

## 1. 核心判断

当前产品已经具备“AI 人物资料库”的基本能力: 可以按影响力、话题、机构、角色浏览人物，详情页也能展示贡献、代表成果、论文、开源项目、视频、课程、关系人物和来源提示。

下一阶段的产品力提升，不应继续围绕“补更多资料”展开。更好的方向是把站点升级为“AI 圈人物情报台”: 帮用户判断谁重要、最近发生了什么、这个人为什么值得关注、他和哪些人或机构有关。

产品主线:

1. 从静态资料页走向动态情报: 论文、repo、职位、访谈、课程、融资、关系变化都成为事件。
2. 从维度筛选走向任务入口: 用户来这里是为了找方向、追机构、查关系、看新变化。
3. 从内容聚合走向可信判断: 每个结论要能回到来源、证据、置信度和更新时间。
4. 从人物孤岛走向关系网络: 人物、机构、话题、作品、课程和事件互相连接。

## 2. 当前基线

### 2.1 已有优势

现有产品已经有可复用基础，很多升级可以复用现有能力。

| 能力 | 当前位置 | 可复用价值 |
|---|---|---|
| 首页目录、搜索、话题/机构/角色过滤 | `components/home/ResearcherDirectory.tsx` | 可承载任务化首页、榜单、动态入口 |
| directory API 支持 `weeklyViewCount`、`citationCount`、`name` 排序 | `lib/person-directory.ts` | 可快速增加“最近热度”“学术影响力”等排序 |
| 话题、机构、角色配置 | `lib/person-directory-config.ts` | 可升级为话题页、机构页和策展入口 |
| 人物详情页信息架构 | `components/person/PersonPageClient.tsx` | 可重排为“贡献、最新变化、证据、下一步阅读” |
| 原始内容池 | `RawPoolItem` | 可生成动态流和人物近期事件 |
| 人物关系表 | `PersonRelation` | 可升级为关系图谱和证据化关系卡 |
| 用户画像字段 | `UserProfile` | 可承载收藏、订阅、newsletter |
| 页面访问记录 | `PageView` | 可生成站内热度和增长榜 |
| 数据质量审计日志 | `QAAuditLog` | 可作为可信度、待核提示、审核后台的基础 |

### 2.2 主要缺口

1. 首页还是“目录浏览”心智，缺少高意图入口。用户要自己理解 topic、organization、role 的用法。
2. `trending` 标签显示“影响力排序”，实际 URL 固定使用 `influenceScore`，底层已有 `weeklyViewCount` 和 `citationCount` 但没有产品化。
3. 人物详情页内容很丰富，但首屏缺少“最近变化”和“为什么现在值得关注”。
4. 关系人物以网格展示，关系边、证据、时间和关系来源没有被充分表达。
5. `UserProfile.subscribedPeople`、`topicInterests`、`newsletterFrequency` 已存在，但前台没有订阅体验。
6. 过去的产品审计已经指出冷启动白屏风险，新规划要把首屏稳定性作为产品体验的一部分。

## 3. 竞品与借鉴点

竞品研究不按“谁长得像”来分，按用户任务来分。AI 人物库真正要抢的是 4 类心智: 找人、追变化、看关系、判断可信度。

### 3.1 竞品分层矩阵

| 分层 | 产品 / 数据源 | 已验证能力 | 值得借鉴 | 不能照搬 | 对应落地点 |
|---|---|---|---|---|---|
| 学术发现 | Semantic Scholar | 搜索 2.14 亿论文、TLDR、Highly Influential Citations、Library、Research Feeds、作者提醒、Research Dashboard | 把“关注作者/主题 -> 新论文/新引用/推荐内容 -> 邮件提醒”做成持续回访链路 | 不做纯论文搜索站，AI 人物库必须补产业、开源、组织变化 | 人物动态、作者订阅、论文来源可信度、每周 digest |
| 学术数据底座 | Semantic Scholar API | 作者、论文、引用、venue、SPECTER2 embedding、推荐、数据集；页面披露 2.14 亿论文、24.9 亿引用、7900 万作者 | 用 API 和 bulk data 补 author、paper、citation、venue、推荐关系 | 不把 API 结果直接当人物身份真相，仍需官方链接和人工复核兜底 | 论文归因、作者消歧、代表论文、引用影响力 |
| 开放学术图谱 | OpenAlex | 以 works、authors、sources、institutions、topics、publishers、funders 组成开放异构图谱，支持 API 和快照 | 用标准实体 ID 减少同名人物、机构别名、topic 漂移 | OpenAlex 是底层图谱，不提供 AI 行业语义和留存体验 | author ID、institution ID、topic ID、机构归一化 |
| AI 论文社区 | Hugging Face Daily Papers | Daily / Weekly / Monthly 论文流、社区提交、每日邮件订阅，和 Models、Datasets、Spaces 同站连接 | 把论文和模型、repo、人物、机构打通，动态流要有社区热度信号 | 不做模型托管社区，不承接权重、Spaces 和完整工程协作 | 首页动态、topic 动态、论文-模型-人物连接 |
| 企业组织图谱 | The Org | 公共 org chart、company、people、trending companies、executive moves 内容 | 机构页要展示“当前团队、角色层级、关键变动”，不是人物列表筛选结果 | 公开组织图谱覆盖不稳定，不能把未知层级硬补成组织结构 | 机构页、人物流动、团队/职能分组 |
| 创投和产业信号 | Crunchbase | 私营公司情报、预测、funding activity、leadership changes、market signals、API | 把人物动态扩展到创业、融资、领导层变化和公司里程碑 | 海外商业数据库对中国高校、实验室、非公开融资覆盖有限，且授权成本高 | role_change、funding、startup、product_launch 事件 |
| 媒体策展榜单 | TIME100 AI | 用 Leaders、Innovators、Shapers、Thinkers 做年度 AI 人物策展 | 给泛用户一个低门槛入口: 榜单、角色分组、编辑判断 | 年度榜单更新慢，不能替代可追踪动态和证据链 | 角色榜单、年度/季度专题、编辑入口 |
| 企业知识搜索 | Zeta Alpha | 面向企业的 AI search、Deep Research、RAG Agents，可连接内外部数据，强调 discover / organize / analyze | 面向高意图用户时，把“搜索”升级成可解释答案、来源和筛选 | 当前阶段不做重型 B 端 enterprise search，不把私有数据权限体系提前复杂化 | 站内搜索、证据聚合、source summary |
| 国内商业信息 | 天眼查 / 企查查 / IT 桔子等 | 查公司、查老板、查关系、查风险、新增企业、风险监控、工商/投融资线索 | 中国 AI 创业者维度要补公司、股东、高管、融资、风险和新增企业信号 | 数据授权和反爬风险高，不能直接复制付费数据库内容 | 中国创业者、公司关系、融资事件候选 |
| 国内 AI 媒体 / 资讯聚合 | 机器之心 / Readhub 等 | AI 新闻、专题解读、每日早报、热门话题、排行榜、科技动态 | 用快讯和专题补“最近发生了什么”，并抽取人物、机构、话题事件 | 媒体内容非结构化、易重复、噪声高，不能直接变成事实 | article / media 事件、热点候选、人工复核队列 |
| 国内学术人物 | AMiner / AI 2000 | 学者画像、领域影响力榜单、学术关系网络，适合国内学术参考 | 借鉴领域权威榜、学者图谱、导师学生/合作者关系 | 页面抓取和榜单口径需单独核验，不把榜单当唯一影响力 | 学术影响力榜、关系证据、领域人物补全 |

### 3.2 产品力机会

| 机会 | 竞品证据 | 我们的差异化做法 | 优先级 |
|---|---|---|---|
| 从“查资料”变成“追变化” | Semantic Scholar 有 author alert、Research Feed、Research Dashboard；HF Papers 有每日论文邮件 | `ActivityEvent` 作为统一动态底座，人物/话题/机构都能订阅；邮件先从周报和 watchlist 开始 | P0 |
| 从“人物卡”变成“人物判断” | TIME100 AI 用角色分类降低理解门槛；Crunchbase 用 market signals 解释公司变化 | 首屏直接回答“为什么重要、最近变化、影响力来源、证据覆盖”，榜单按用户任务分层 | P0 |
| 从“列表筛选”变成“主题资产” | Semantic Scholar 有 topic pages；HF Papers 有 Daily/Weekly/Monthly 主题化浏览 | `/topic/[slug]` 和 `/org/[slug]` 成为可分享内容资产，动态和人物互相跳转 | P1 |
| 从“关系展示”变成“关系证据” | The Org 强组织结构；AMiner 强学术关系；天眼查强调查关系/查风险 | 人物关系只展示证据、置信度、reviewStatus 和方向，低置信默认折叠 | P1 |
| 从“热度榜”变成“可信影响力” | Semantic Scholar 区分引用、影响力引用；Crunchbase 用预测和多源信号 | 影响力分数拆成学术、开源、产业、媒体、近期，并保留权重版本和审计日志 | P1 |
| 从“内容聚合”变成“中文 AI 圈情报台” | 海外产品强学术/商业，国内产品强资讯/工商，但少有技术贡献 + 产业人物 + 关系证据一体化 | 聚焦中文用户，打通论文、开源、课程、职位、融资、媒体和关系，所有结论可回源 | P0-P2 |

### 3.3 借鉴边界

1. 不做全量论文搜索引擎。论文只是人物影响力和近期动态的证据。
2. 不做全量创投数据库。融资和工商只是中国 AI 创业者画像的一类事件。
3. 不做泛新闻站。媒体内容只进入人物、机构、话题相关事件。
4. 不做大而全组织图谱。第一阶段只做核心 AI 机构、关键团队和人物流动。
5. 不做黑箱打分榜。所有榜单都要能解释来源、权重、更新时间和人工复核状态。

### 3.4 信息来源

本节来源在 2026-06-13 重新核验，优先使用官方页面:

1. Semantic Scholar Product: https://www.semanticscholar.org/product
2. Semantic Scholar API: https://www.semanticscholar.org/product/api
3. OpenAlex Developers: https://developers.openalex.org/
4. Hugging Face Papers: https://huggingface.co/papers
5. The Org: https://theorg.com/
6. Crunchbase: https://about.crunchbase.com/
7. TIME100 AI 2025: https://time.com/collections/time100-ai-2025/
8. Zeta Alpha: https://www.zeta-alpha.com/
9. 天眼查: https://www.tianyancha.com/
10. 机器之心: https://www.jiqizhixin.com/
11. Readhub: https://readhub.cn/

## 4. 目标用户与关键任务

### 4.1 核心用户

| 用户 | 主要动机 | 最重要的产品任务 |
|---|---|---|
| AI 产品经理 / 创业者 | 判断方向、找标杆、跟踪一线团队 | 快速知道一个方向有哪些关键人、最近谁有新动作 |
| 投资人 / 分析师 | 发现新公司、新团队和人才迁移 | 跟踪机构、创业、融资、人物流动、技术声量 |
| 研究者 / 工程师 | 找论文、代码、课程和领域脉络 | 看到某个话题的关键人物、代表论文、学习路径 |
| 招聘 / BD | 找相关人才和关系路径 | 从人物到机构、从机构到团队、从团队到关系链 |
| AI 深度读者 | 了解 AI 圈格局 | 看榜单、动态、人物故事和关系网络 |

### 4.2 高价值用户任务

1. 我想知道 Agent 方向现在应该关注哪些人。
2. 我想看 OpenAI、Anthropic、DeepMind、DeepSeek 最近有哪些人员变化。
3. 我想知道某个人最近有什么新论文、新 repo、新访谈或创业动向。
4. 我想沿着一篇论文或一个话题找到背后的关键人物。
5. 我想比较两三个人的影响力来源: 学术、开源、产业、媒体、组织影响。
6. 我想订阅一批人物或话题，每周收到变化。
7. 我想判断一条人物关系是否可信，依据是什么。

## 5. 产品定位

一句话定位:

AI 人物库是面向中文用户的 AI 人物情报台，持续追踪 AI 关键人物、机构、话题、作品和关系变化。

差异化:

1. 比学术搜索更懂产业人物和中文语境。
2. 比创投数据库更懂技术贡献、论文、开源、课程和研究关系。
3. 比媒体榜单更可追踪、可检索、可回溯来源。
4. 比普通百科更新频率更高，能呈现“最近发生了什么”。

## 6. 信息架构规划

### 6.1 顶层导航

第一阶段不需要复杂导航，优先把首页组织成 5 个入口:

1. 动态: 本周 AI 人物动态。
2. 人物: 影响力、最近热度、学术、开源、产业等榜单。
3. 话题: Agent、RAG、Scaling、多模态、推理、安全等。
4. 机构: OpenAI、Anthropic、DeepMind、DeepSeek、Kimi、清华等。
5. 收藏: 已关注人物、话题、机构。

### 6.2 首页结构

建议首页首屏结构:

1. 顶部搜索: 搜人物、机构、话题、论文、项目。
2. 快速入口:
   - 本周动态
   - Agent 方向关键人物
   - OpenAI 人员与关系
   - 中国大模型创业者
3. 榜单切换:
   - 综合影响力
   - 最近热度
   - 学术影响力
   - 开源影响力
   - 产业影响力
   - 新晋上升
4. 目录结果卡片:
   - 人物
   - 当前身份
   - 影响力来源
   - 最近变化
   - 可信来源数量

### 6.3 人物详情页结构

建议从“资料堆叠”改为“判断路径”:

1. 首屏人物判断:
   - 当前身份
   - 核心贡献
   - 最近变化
   - 影响力来源
   - 来源覆盖
2. 最新动态:
   - 新论文
   - 新 repo
   - 新访谈
   - 新职位
   - 新关系
3. 代表贡献:
   - 产品 / 模型 / 项目
   - 核心论文
   - 开源项目
   - 方法论 / 学习卡片
4. 关系网络:
   - 导师学生
   - 同事
   - 联创
   - 合作者
   - 前后任
   - 证据和置信度
5. 学习路径:
   - 课程
   - 视频
   - 播客
   - 博客
6. 来源与可信度:
   - 数据来源统计
   - 待核事实
   - 最近更新时间

### 6.4 话题页

每个话题页应该回答 4 个问题:

1. 这个方向的关键人物是谁。
2. 最近这个方向发生了什么。
3. 代表论文、项目、课程是什么。
4. 哪些机构和团队在推动这个方向。

MVP 页面模块:

1. 话题简介。
2. Top 人物。
3. 最近动态。
4. 代表论文和开源项目。
5. 相关机构。
6. 相关话题。

### 6.5 机构页

每个机构页应该回答 4 个问题:

1. 这个机构有哪些 AI 关键人物。
2. 谁在当前任职，谁曾经任职。
3. 最近有哪些人员、论文、产品、融资、组织变化。
4. 与其他机构有哪些人才流动和关系。

MVP 页面模块:

1. 机构概览。
2. 当前关键人物。
3. 历史人物和 alumni。
4. 最近动态。
5. 人物关系和流动。
6. 相关话题。

## 7. 功能规划

### 7.1 P0: 动态流

目标:

让用户每天或每周回来，因为这里能看到 AI 圈关键人物的新变化。

MVP 范围:

1. 首页新增“本周动态”入口。
2. 人物详情页新增“最近变化”模块。
3. 支持按人物、话题、机构过滤动态。
4. 每条动态必须包含来源、时间、人物、事件类型、置信度。

事件类型:

| 类型 | 来源 | 说明 |
|---|---|---|
| paper | `RawPoolItem.sourceType = openalex` | 新论文或高影响论文 |
| github | `RawPoolItem.sourceType = github` | 新项目、stars 明显变化、重要 repo |
| video | `RawPoolItem.sourceType = youtube` | 新访谈、演讲、课程视频 |
| article | `RawPoolItem.sourceType = exa` | 官方博客、媒体报道、技术文章 |
| podcast | `RawPoolItem.sourceType = podcast` | 新播客 |
| role_change | `PersonRole` | 新职位、离职、创业、加入机构 |
| relation_change | `PersonRelation` | 新增关系或关系被确认 |

建议新增模型:

```prisma
model ActivityEvent {
  id            String   @id @default(cuid())
  personId      String
  sourceItemId  String?
  eventType     String
  title         String
  summary       String?
  url           String?
  occurredAt    DateTime?
  detectedAt    DateTime @default(now())
  topics        String[]
  organizations String[]
  confidence    Float    @default(0.8)
  evidenceNote  String?
  reviewStatus  String   @default("auto")

  @@index([personId])
  @@index([eventType])
  @@index([occurredAt])
  @@index([detectedAt])
}
```

第一版已经固化 `ActivityEvent` 契约、迁移和 dry-run 回填脚本。线上表未迁移或未回填时，前台仍会自动退回 `RawPoolItem` 聚合动态，避免动态流因为迁移节奏中断。

验收标准:

1. 首页可以看到最近 7 天或 30 天的动态。
2. 任意动态能点回人物页或来源。
3. 每条动态都有来源 URL 或明确来源说明。
4. 无来源的自动生成摘要不能进入默认动态流。

### 7.2 P0: 首页榜单与排序增强

目标:

让用户不用理解数据库字段，也能按意图找人。

现有基础:

`fetchPersonDirectory` 已支持 `weeklyViewCount`、`citationCount`、`name` 排序，前端 `buildDirectoryApiUrl` 固定写死 `sortBy=influenceScore`。

MVP 范围:

1. 增加榜单切换:
   - 综合影响力: `influenceScore`
   - 最近热度: `weeklyViewCount`
   - 学术影响力: `citationCount`
   - 开源影响力: `githubStars`
2. URL 保留 sort 参数。
3. 卡片展示对应排序依据，如“近 7 天浏览 12 次”“引用 25000+”“GitHub 120k stars”。
4. 默认保留综合影响力，不破坏当前入口。

需要补的后端能力:

1. `fetchPersonDirectory` 增加 `githubStars` sort。
2. API 和 `buildDirectoryApiUrl` 透传 sortBy。
3. 排序标签和卡片指标联动。

验收标准:

1. 切换排序后 URL 可分享。
2. 排序结果和卡片指标一致。
3. 移动端排序控件不折行、不挤压。

### 7.3 P0: 人物详情首屏重排

目标:

用户进入人物页 5 秒内能判断: 这个人是谁、为什么重要、最近发生了什么、资料是否可信。

MVP 范围:

1. `PersonHeader` 下方增加“快速判断”区域:
   - 核心贡献 1 到 2 条
   - 最新变化 1 到 3 条
   - 影响力来源标签
   - 来源覆盖提示
2. `CoreContribution` 保留，但不承担全部首屏解释压力。
3. `SourceSummary` 从右上角弱提示升级为可点击来源摘要。

验收标准:

1. 首屏不需要滚动就能看到核心贡献和更新时间。
2. 最新变化缺数据时显示“暂无近期变化”，不编造。
3. 来源提示可解释，不只显示数量。

### 7.4 P1: 话题页和机构页

目标:

把现在的 topic/org 过滤升级为可分享、可 SEO、可订阅的页面。

建议路由:

1. `/topic/[slug]`
2. `/org/[slug]`

MVP 范围:

1. 复用现有 `DIRECTORY_TOPIC_GROUPS` 和 `DIRECTORY_ORGANIZATION_GROUPS`。
2. 每页包含 Top 人物、最近动态、相关内容、相关人物关系。
3. 首页 topic/org 点击从 query filter 逐步迁移到专属页。
4. 过滤列表仍保留，避免一次改动过大。

验收标准:

1. 每个核心话题和机构都有稳定 URL。
2. 页面可从人物卡、人物详情、动态、搜索结果互相跳转。
3. 页面首屏有明确主题，不只是列表结果。

### 7.5 P1: 关系图谱

目标:

把“关联人物”从装饰模块升级为探索入口。

MVP 范围:

1. 先做一跳关系图，不做全局大图。
2. 关系边显示类型、证据、置信度、是否待核。
3. 支持按关系类型过滤: 导师、学生、联创、同事、合作者。
4. `needs_review` 默认折叠，用户可展开。

实现建议:

第一版不需要复杂图形库，可以用“中心人物 + 分组关系卡”完成。关系准确性稳定后，再考虑可视化网络图。

验收标准:

1. 每条关系都能看到证据或待核状态。
2. 待核关系不会和 confirmed 关系混在一起。
3. 点击关联人物后能保留来源上下文，如 `?fromRelation=advisor`。

### 7.6 P1: 订阅与收藏

目标:

让产品从一次查询变成持续使用。

现有基础:

`UserProfile` 已有 `peopleInterests`、`topicInterests`、`savedCards`、`subscribedPeople`、`newsletterFrequency`、`newsletterEmail`。

MVP 范围:

1. 人物页增加关注按钮。
2. 话题页增加关注按钮。
3. 登录用户可查看“我的关注”。
4. 未登录用户先用 localStorage 做轻量 watchlist。
5. 每周 digest 先有公开页面和个人动态流。
6. 邮件订阅先补频率设置、邮箱设置、退订 token、投递日志契约、dry-run 生成脚本、Resend 发送适配和投递监控；真实发送必须显式配置环境开关。

验收标准:

1. 用户能关注和取消关注人物。
2. 关注列表能看到最新动态。
3. 关注数据不会影响公开页面性能。
4. 邮件订阅关闭和开启都有明确状态，未登录状态不会写入服务端。
5. 周报脚本默认 dry-run，不会误发真实邮件。
6. `--send` 必须在 provider、API key、发件地址和 `NEWSLETTER_SEND_ENABLED=true` 同时满足时才真实发送。

### 7.7 P1: 影响力分数透明化

目标:

降低“为什么他排在这里”的疑问。

MVP 范围:

1. 卡片和详情页展示影响力构成:
   - 学术: citationCount、hIndex、关键论文
   - 开源: githubStars、代表 repo
   - 产业: 当前/历史机构、代表产品
   - 媒体: 视频、播客、文章
   - 近期: weeklyViewCount、最近事件
2. 提供“综合影响力”和“最近上升”两套榜单。
3. 对分数口径写简短说明。

验收标准:

1. 每个榜单都有可解释口径。
2. 用户能理解不同榜单结果为什么不同。
3. 不把未证实的媒体热度算入高置信影响力。
4. 影响力分数有明确权重版本，可生成审计日志，并能在后台筛出高差异候选。

### 7.8 P2: 人物比较

目标:

服务研究、投资、招聘等更深场景。

MVP 范围:

1. 支持选择 2 到 3 个人比较。
2. 比较维度:
   - 当前身份
   - 代表贡献
   - 话题排名
   - 论文和引用
   - 开源项目
   - 代表产品
   - 关系网络
   - 最新动态
3. 从人物卡和详情页加入比较。

验收标准:

1. 对比页能用 URL 分享。
2. 空数据明确显示，不补假信息。
3. 比较结果要帮助用户看差异，避免变成字段堆叠。

## 8. 数据与系统规划

### 8.1 数据分层

建议把数据按产品用途分为 5 层:

| 层级 | 说明 | 现有基础 | 目标 |
|---|---|---|---|
| Identity | 人物身份、别名、头像、官方链接 | `People`、Wikidata、officialLinks | 稳定、可消歧 |
| Profile | 履历、教育、机构、角色 | `PersonRole`、Organization | 准确表达当前/历史身份 |
| Evidence | 论文、repo、视频、文章、播客、课程 | `RawPoolItem`、`Course`、`Card` | 可追溯、可更新 |
| Graph | 人物关系、机构关系、话题关系 | `PersonRelation`、topics | 证据化关系网络 |
| Signal | 动态、热度、订阅、榜单 | `PageView`、`UserProfile`、未来 `ActivityEvent` | 形成回访理由 |

### 8.2 动态生成规则

动态事件不要靠 LLM 自由生成，先从结构化规则开始:

1. `publishedAt` 或 `fetchedAt` 在近 30 天的 `RawPoolItem` 可以进入候选。
2. `sourceType` 决定事件类型。
3. 标题、URL、sourceType、metadata 是必填。
4. 低置信来源进入审核态，不进入默认流。
5. 同 URL、同标题相似度高、同人同日同类型事件要去重。
6. 人物身份变化必须来自官方源、Wikidata、可信媒体或人工确认。

### 8.3 API 规划

| API | 用途 | 阶段 |
|---|---|---|
| `GET /api/activity` | 全站动态流 | P0 |
| `GET /api/person/[id]/activity` | 人物详情最近变化 | P0 |
| `GET /api/topic/[slug]` | 话题页数据 | P1 |
| `GET /api/org/[slug]` | 机构页数据 | P1 |
| `POST /api/user/follow` | 关注人物、话题、机构 | P1 |
| `GET /api/user/watchlist` | 我的关注 | P1 |
| `GET /api/user/newsletter` | 读取邮件订阅设置 | P1 |
| `POST /api/user/newsletter` | 保存邮件订阅频率和邮箱 | P1 |
| `GET /api/newsletter/unsubscribe` | 退订邮件订阅 | P1 |
| `GET /api/person/[id]/relationship-graph` | 人物二跳关系图谱 | P1 |
| `GET /graph` | 全局关系图谱页面 | P1 |
| `GET /admin/newsletter` | Newsletter 投递监控页面 | P1 |
| `GET /api/admin/newsletter/deliveries` | Newsletter 投递状态、失败率和 provider 分布 | P1 |
| `GET /admin/operations` | 上线准备度检查页面 | P1 |
| `GET /api/admin/operations/readiness` | 生产迁移、回填、发送和校准 readiness | P1 |
| `GET /api/admin/influence/calibration` | 影响力校准候选与权重版本 | P1 |
| `POST /api/admin/influence/calibration` | 写入影响力评分审计和可选应用分数 | P1 |
| `GET /admin/quality` | 数据质量复核队列页面 | P1 |
| `GET /api/admin/quality/review` | 高访问人物资料、关系、动态和 QA 待复核队列 | P1 |
| `GET /api/compare?people=a,b,c` | 人物对比 | P2 |

### 8.4 性能与缓存

1. 首页不能依赖冷数据库实时返回首屏。
2. 目录页保留 SSR，但需要超时和静态兜底。
3. 动态流可以按小时生成 snapshot。
4. 话题页和机构页适合 ISR。
5. 人物详情页现有 `revalidate = 3600` 合理，最近动态可客户端增量加载。

建议策略:

| 页面 | 缓存策略 | 降级策略 |
|---|---|---|
| 首页目录 | SSR + API cache + snapshot fallback | 展示最近一次 snapshot，不显示 0 人空态 |
| 动态流 | 每小时生成 snapshot | 失败时展示上次更新时间 |
| 人物详情 | ISR 1 小时 | 详情静态内容先出，动态模块懒加载 |
| 话题页 / 机构页 | ISR 1 到 6 小时 | 关键列表用静态 snapshot |

### 8.5 后台任务

当前新增两类 signal 任务，并注册到 `/api/inngest`:

1. `signal-materialize-activity-events`: 每小时扫描近期 `RawPoolItem`，在 `ActivityEvent` 表存在时 upsert 为结构化动态；表未迁移时跳过，前台继续用 RawPoolItem fallback。
2. `signal-prepare-weekly-newsletter-digest`: 每周生成订阅用户的 weekly digest dry-run 投递日志；当前不调用真实邮件供应商。

本地 standalone 验证 `/api/inngest` 时需要设置 `INNGEST_DEV=1`。生产环境需要配置 `INNGEST_SIGNING_KEY`。

### 8.6 关系图谱生成规则

第一版关系图谱不新增存储表，直接基于 `PersonRelation` 生成:

1. 默认只读取 `trusted` / `confirmed` 关系，`needs_review` 不进入默认图谱。
2. 人物页图谱支持一跳和二跳路径；全局图谱支持按话题、机构和关系类型筛选。
3. 人物页关系方向按当前人物视角转换，例如反向 `advisor` 展示为 `advisee`。
4. 节点和路径按置信度、关系类型权重、影响力和证据覆盖排序。
5. 每条边保留 `evidenceUrl`、`evidenceNote`、`description` 和 `confidence`，用于前台解释。

## 9. 里程碑

### Phase 0: 产品地基与体验修复，1 周

目标:

把当前产品从“可看”推进到“稳定可信”。

任务:

1. 首页排序参数产品化: 综合、最近热度、学术、开源。
2. 首屏静态兜底: 避免冷启动展示 0 人。
3. 人物详情 SourceSummary 可点击，增加来源说明。
4. 人物卡增加排序依据。
5. 移动端 tab 和 pill 不折行。

验收:

1. `npm run build` 通过。
2. 首页冷启动不出现“0 位研究者”的误导空态。
3. 排序 URL 可分享。
4. 移动端 375px 宽度无文字挤压。

### Phase 1: 动态流 MVP，2 周

目标:

让用户看到“最近发生了什么”。

任务:

1. 定义 ActivityEvent 聚合逻辑。
2. 新增 `/api/activity`。
3. 首页增加“本周动态”模块。
4. 人物详情增加“最近变化”模块。
5. 动态按人物、话题、机构可过滤。
6. 所有动态显示来源和时间。

验收:

1. 至少覆盖 paper、github、video、article 四类事件。
2. 默认动态流无无来源内容。
3. 人物详情页能展示该人物最近 5 条动态。
4. 动态点击路径闭环: 动态到人物、来源、话题。

### Phase 2: 话题页和机构页，2 周

目标:

把 topic/org 从筛选器升级为内容资产。

任务:

1. 新增 `/topic/[slug]` 和 `/org/[slug]`。
2. 话题页展示 Top 人物、最新动态、代表论文/项目、课程。
3. 机构页展示当前人物、历史人物、最新动态、人才流动。
4. 人物详情和首页链接迁移到专属页。
5. 首页保留筛选体验。

验收:

1. 10 个核心话题、10 个核心机构可访问。
2. 每页有稳定标题、简介和核心列表。
3. 页面可被分享，不依赖客户端状态。

### Phase 3: 关系图谱与可信关系，2 周

目标:

让关系模块成为探索入口，同时控制幻觉风险。

任务:

1. `RelatedPeople` 改为分组关系视图。
2. 每条关系展示证据、状态、说明。
3. 新增关系类型过滤。
4. 对 `needs_review` 关系保持折叠。
5. 选择 20 个高访问人物做人关系抽样复核。

验收:

1. 关系卡能解释“为什么有关”。
2. 待核关系不会默认混入可信关系。
3. 高访问人物关系错误率可量化。

### Phase 4: 收藏、订阅与周报，2 周

目标:

形成留存闭环。

任务:

1. 人物页、话题页、机构页增加关注。
2. 新增“我的关注”页面。
3. 根据关注生成个人动态流。
4. 生成每周 digest 页面。
5. 我的关注页提供邮件订阅设置。
6. 新增周报邮件 dry-run 生成脚本和投递日志模型。
7. 邮件发送供应商作为后置任务，不纳入第一版强依赖。

验收:

1. 已登录用户关注状态可持久化。
2. 未登录用户有本地 watchlist。
3. 我的关注页能按时间展示动态。
4. 未登录用户保存订阅被 401 拦截。
5. 周报 dry-run 能生成投递样本，且默认不写真实投递。

## 10. 指标体系

### 10.1 北极星指标

每周有效回访用户数。

定义:

用户在 7 天内至少完成一个高意图动作: 点击来源、关注人物/话题/机构、进入动态详情、进入关系人物、保存卡片、比较人物。

### 10.2 阶段指标

| 阶段 | 关键指标 | 目标 |
|---|---|---|
| Phase 0 | 首屏误导空态次数 | 降为 0 |
| Phase 0 | 排序切换点击率 | 首页访问的 10% 以上 |
| Phase 1 | 动态点击率 | 动态曝光的 8% 以上 |
| Phase 1 | 动态来源点击率 | 动态点击的 20% 以上 |
| Phase 2 | 话题页 / 机构页进入率 | 首页访问的 15% 以上 |
| Phase 3 | 关系模块点击率 | 人物详情访问的 8% 以上 |
| Phase 4 | 关注转化率 | 登录用户详情页访问的 5% 以上 |

### 10.3 质量指标

1. 默认动态流来源覆盖率: 100%。
2. confirmed 关系证据覆盖率: 95% 以上。
3. 高访问人物资料更新时间: 30 天内。
4. 低置信关系默认曝光率: 0%。
5. 首页首屏可用时间: 2 秒内有可信内容或 snapshot。
6. 高访问人物抽样脚本可量化关系证据缺口和动态来源缺口。
7. 高访问人物质量复核队列可按严重程度和问题类型筛选。

## 11. 实施切片

### Slice 1: 排序产品化

涉及文件:

1. `lib/person-directory-config.ts`
2. `lib/person-directory.ts`
3. `components/home/ResearcherDirectory.tsx`
4. `components/home/ResearcherCard.tsx`
5. `app/api/person/directory/route.ts`
6. `app/page.tsx`

主要改动:

1. `DirectoryFilters` 增加 `sortBy`。
2. `buildDirectoryApiUrl` 不再固定 `influenceScore`。
3. 新增排序控件。
4. 卡片展示当前排序对应的解释指标。

验证:

1. `npm run build`
2. 浏览器验证首页切换排序。
3. 验证 URL 参数刷新后保持一致。

### Slice 2: 首页稳定兜底

涉及文件:

1. `app/page.tsx`
2. `components/home/ResearcherDirectory.tsx`
3. `lib/person-directory.ts`
4. 可选新增 `scripts/generate-directory-snapshot.ts`

主要改动:

1. `fetchPersonDirectory` 增加超时保护。
2. 首页初始数据失败时使用 snapshot。
3. 头部人数不再展示误导性的 0。

验证:

1. 模拟 DB 超时，首页仍有内容或明确加载态。
2. build 通过。
3. 移动端和桌面首屏无布局跳动。

### Slice 3: 动态 API

涉及文件:

1. `app/api/activity/route.ts`
2. `app/api/person/[id]/activity/route.ts`
3. `lib/activity.ts`
4. `prisma/schema.prisma`，若决定固化 `ActivityEvent`

主要改动:

1. 从 `RawPoolItem` 聚合候选动态。
2. 去重、排序、来源过滤。
3. 支持 topic/org/person 过滤。

验证:

1. API 返回结构稳定。
2. 默认结果均有 URL 或 evidenceNote。
3. 近 30 天无数据时展示空态。

### Slice 4: 动态 UI

涉及文件:

1. `components/home/ActivityFeed.tsx`
2. `components/person/sections/RecentActivity.tsx`
3. `components/person/PersonPageClient.tsx`

主要改动:

1. 首页展示本周动态。
2. 人物页展示最近变化。
3. 动态卡包含类型、时间、来源、人物、话题。

验证:

1. 桌面和移动端截图检查。
2. 动态点击路径可用。
3. 空态不生成假内容。

### Slice 5: 话题页 / 机构页 MVP

涉及文件:

1. `app/topic/[slug]/page.tsx`
2. `app/org/[slug]/page.tsx`
3. `lib/entity-pages.ts`
4. `components/entity/EntityPageBlocks.tsx`
5. `scripts/audit/entity_density_audit.mjs`

主要改动:

1. 复用 directory 查询和 activity 查询。
2. 生成 Top 人物和最近动态。
3. 首页和人物页链接到专属页。
4. 新增 topic/org 内容密度审计，量化核心入口的人物数、动态数、代表作品数和来源构成。

验证:

1. 核心 topic/org 页面 build 通过。
2. 每页有非空标题和列表。
3. URL 可分享。
4. `audit:entity-density` 能输出核心 topic/org 的达标和缺口。

### Slice 6: 关系可信表达

涉及文件:

1. `components/person/sections/RelatedPeople.tsx`
2. `app/person/[id]/page.tsx`
3. `components/person/sections/RelationshipGraphExplorer.tsx`
4. `app/api/person/[id]/relationship-graph/route.ts`
5. `lib/relation-graph.ts`
6. `scripts/audit/sample_signal_quality.mjs`
7. `app/graph/page.tsx`
8. `lib/global-relationship-graph.ts`
9. `scripts/audit/relation_graph_audit.mjs`

主要改动:

1. 关系按类型分组。
2. 展示 evidenceNote、evidenceUrl、reviewStatus。
3. 待核关系折叠并弱化。
4. 人物页新增二跳关系探索，展示一跳/二跳节点、可探索路径、证据边和低置信提示。
5. 新增 `/graph` 全局关系图谱，支持按话题、机构、关系类型筛选，并展示核心人物、延展人物、关系边和图谱质量。
6. 新增关系/动态质量抽样脚本，量化高访问人物的关系证据覆盖和动态来源覆盖。
7. 默认关系曝光增加 `confidence >= 0.75` 门槛，低置信 trusted/confirmed 关系进入折叠复核区。
8. 新增关系图谱审计脚本，量化默认证据覆盖、低置信默认曝光和待核关系 backlog。
9. 全局图谱侧栏展示关键连接点和可追踪关系，帮助用户顺着高置信证据路径继续查人。
10. 图谱数据查询增加超时和 degraded 空态，数据库连接短暂异常时页面保持可访问。

验证:

1. `needs_review` 默认不展开。
2. 有证据 URL 的关系可点击。
3. 无证据关系不被标成可信。
4. 二跳 API 返回稳定 graph 结构。
5. `audit:signal-quality` 能输出抽样覆盖率。
6. `/graph` 可分享，并且默认排除待核关系。
7. `audit:relation-graph` 输出 `lowConfidenceDefaultExposure=0`，默认关系证据覆盖达到 95% 以上。
8. `/graph`、topic 图谱、topic 页和 org 页在本地生产服务均返回 200。

### Slice 7: 收藏与订阅

涉及文件:

1. `app/api/user/follow/route.ts`
2. `app/watchlist/page.tsx`
3. `components/common/FollowButton.tsx`
4. `components/watchlist/WatchlistClient.tsx`
5. `app/api/user/watchlist/route.ts`
6. `app/api/watchlist/summary/route.ts`
7. `lib/watchlist.ts`
8. `lib/user-profile.ts`
9. `app/api/user/newsletter/route.ts`
10. `app/api/newsletter/unsubscribe/route.ts`
11. `components/newsletter/NewsletterSettings.tsx`
12. `lib/newsletter.ts`
13. `scripts/newsletter/build_weekly_digest_email.mjs`
14. `prisma/schema.prisma`
15. `lib/inngest/signalJobs.ts`
16. `lib/inngest/functions.ts`
17. `lib/newsletter-delivery.ts`
18. `lib/newsletter-monitoring.ts`
19. `app/admin/newsletter/page.tsx`
20. `app/api/admin/newsletter/deliveries/route.ts`
21. `prisma/migrations/20260613112000_newsletter_delivery_provider/migration.sql`

主要改动:

1. 关注人物、话题、机构。
2. 我的关注页展示个人动态。
3. 未登录用户 localStorage watchlist。
4. 订阅设置、退订和投递日志契约。
5. 周报邮件 dry-run 生成，`--send` 显式触发真实发送。
6. Resend provider 适配、发送重试、provider messageId、attempts 和失败原因记录。
7. Inngest 注册动态物化和周报任务；默认 dry-run，只有显式环境开关开启才发送。
8. Newsletter 投递监控页展示 sent、failed、dry_run、provider 分布和失败率。

验证:

1. 登录和未登录路径都可用。
2. 取消关注立即生效。
3. 关注状态刷新后保持。
4. 未登录订阅 API 安全返回关闭态或 401。
5. 周报脚本默认 dry-run，无真实邮件副作用。
6. `/api/inngest` dev mode 返回已注册函数数量。
7. 无迁移或旧表结构时，调度任务和监控页不会因缺 provider 字段崩溃。

### Slice 8: 人物比较与周报页

涉及文件:

1. `app/compare/page.tsx`
2. `app/digest/page.tsx`
3. `components/common/CompareButton.tsx`
4. `lib/compare.ts`
5. `lib/weekly-digest.ts`

主要改动:

1. 人物卡和人物详情页可加入对比。
2. 对比页支持 URL 分享，展示身份、影响力来源、话题、代表贡献、资料覆盖和最近变化。
3. 新增公开“本周动态”页面，聚合近 7 天动态、人物、话题、机构和来源构成。
4. 首页、关注页和对比页提供周报入口。

验证:

1. 对比页 2 到 3 人可分享。
2. 周报页有稳定 URL 和模块化空态。
3. build、deploy build 和浏览器核心路径通过。

### Slice 9: 影响力权重版本与校准

涉及文件:

1. `lib/influence-scoring.ts`
2. `lib/influence-scoring-config.json`
3. `lib/influence-calibration.ts`
4. `app/admin/influence/page.tsx`
5. `app/api/admin/influence/calibration/route.ts`
6. `scripts/influence/calibrate_scores.mjs`
7. `prisma/schema.prisma`
8. `prisma/migrations/20260613102000_influence_score_audit/migration.sql`

主要改动:

1. 将影响力解释从组件内硬编码抽出为带版本号的共享权重配置。
2. 详情页和人物卡 tooltip 使用同一套权重版本，版本预估统一为 0 到 100 分刻度。
3. 新增 `InfluenceScoreAuditLog`，记录上一版分数、版本预估、维度、信号、权重、审计状态和可选应用分数。
4. 新增 `/admin/influence` 后台校准页，按存量分和版本预估差异筛出候选。
5. 新增 `influence:calibrate` dry-run 脚本，默认只输出候选；`--execute` 写审计，`--apply-score` 才更新 `People.influenceScore`。
6. `influence:calibrate` 支持导出人工决策模板和回放决策文件，默认回放仍是 dry-run。

验证:

1. 详情页影响力解释显示权重版本、证据置信、存量分和版本预估。
2. 后台页能展示权重、候选、差异状态和最近审计。
3. API GET 可返回 calibration snapshot。
4. 脚本默认 dry-run，无真实分数修改。
5. 人工决策文件能回放 `reviewed`、`ignored`、`applied`，并保持写审计和改分两级确认。

### Slice 10: 上线准备度与生产观察

涉及文件:

1. `lib/operations-readiness.ts`
2. `app/admin/operations/page.tsx`
3. `app/api/admin/operations/readiness/route.ts`
4. `scripts/ops/readiness.mjs`
5. `package.json`

主要改动:

1. 增加只读 readiness 检查，覆盖 `ActivityEvent`、`NewsletterDeliveryLog`、`InfluenceScoreAuditLog` 三张表。
2. 检查 Newsletter provider 字段是否已迁移，避免旧表结构下调度任务或监控页崩溃。
3. 检查 Newsletter 真实发送所需环境变量，只返回是否存在，不暴露密钥值。
4. 展示 ActivityEvent 回填数量、近 30 天动态、Newsletter sent/failed/dry_run、影响力校准审计数量。
5. 提供 `ops:readiness` CLI，部署机不启动网站也能做同一套只读检查。

验证:

1. API 可返回 overallStatus、schema、newsletterEnv 和 checks。
2. 当前未迁移/未配置的环境能显示 blocked/pending，不会误报 ready。
3. 后台页桌面和移动端无横向溢出。
4. CLI 输出 JSON，可作为生产迁移后的验收证据。

### Slice 11: 质量复核队列与人工治理

涉及文件:

1. `lib/quality-review.ts`
2. `app/admin/quality/page.tsx`
3. `app/api/admin/quality/review/route.ts`
4. `scripts/audit/quality_review_queue.mjs`
5. `scripts/audit/apply_quality_review_decisions.mjs`
6. `package.json`

主要改动:

1. 复用现有 `People`、`Card`、`PersonRelation`、`RawPoolItem` 和 `QAAuditLog`，不新增迁移。
2. 将高访问人物按资料缺口、资料过久未更新、可信关系缺证据、低置信可信关系、待复核关系、近期动态缺来源、近期动态薄、清洗待复核和卡片来源缺口入队。
3. 后台页展示阻断/高优先级数量、关系证据覆盖、动态来源覆盖、卡片来源覆盖、问题分布和人物级处理队列。
4. API 支持 `severity`、`issueType`、`days`、`staleDays` 过滤。
5. CLI `audit:quality-review` 可在不启动网站时输出同一类复核队列，支持 table / JSON，并能导出人工决策模板和 review pack。
6. `audit:quality-apply` 默认 dry-run，只在显式 `--execute` 时写回 `QAAuditLog` verdict、`PersonRelation` 证据/状态或 `Card.sourceUrl`。

验证:

1. `audit:quality-review` 可输出样本、覆盖率、问题分布和人物队列。
2. `audit:quality-review --decision-template=<path> --review-pack-output=<path>` 可生成可编辑的人工决策文件和人物级复核包。
3. `audit:quality-apply --file=<path>` 默认只输出 dry-run diff，不修改业务数据。
4. `/api/admin/quality/review` 返回结构稳定。
5. `/admin/quality` 桌面和移动端无横向溢出。

### Slice 12: 核心路径响应式回归

涉及文件:

1. `scripts/qa/responsive_smoke.mjs`
2. `package.json`

主要改动:

1. 新增 `qa:responsive` CLI，基于系统 Chrome DevTools Protocol 跑桌面和移动视口 smoke，不新增 Playwright 依赖。
2. 默认覆盖 `/`、`/digest`、`/graph`、`/admin/quality`、`/admin/operations` 五条核心路径。
3. 每条路径检查关键文字、`h1`、横向溢出、元素越界和 console error。
4. 默认输出 JSON 和表格摘要，并保存截图到 `/tmp/ai-person-responsive-smoke`；支持自定义 `--base-url`、`--pages`、`--viewports` 和 `--screenshot-dir`。

验证:

1. `qa:responsive --base-url=<local-or-prod-url>` 能在桌面和移动视口跑完整核心路径。
2. 移动端 `390x844` 无横向溢出。
3. 关键页面缺文字、console error 或横向溢出时脚本返回非 0。

### Slice 13: 上线证据包与 Launch Gate

涉及文件:

1. `scripts/ops/launch_gate.mjs`
2. `package.json`

主要改动:

1. 新增 `ops:launch-gate` CLI，串联 `ops:readiness`、`audit:quality-review` 和 `qa:responsive`。
2. 输出单份 JSON 证据包，包含 readiness 状态、质量复核摘要、响应式 smoke 结果和截图目录。
3. 默认将非 ready readiness 视为不通过；本地或迁移前排查可用 `--allow-blocked-readiness` 保留真实 blocked 状态但不让命令失败。
4. 支持 `--base-url` 跑本地或生产 URL，支持 `--output` 保存证据文件，支持 `--skip-responsive` 在无浏览器环境只跑数据侧 gate。

验证:

1. `ops:launch-gate --base-url=<url> --output=<path>` 能生成可归档 JSON 证据包。
2. 迁移未完成时证据包必须显示 blocked/pending，不误报 ready。
3. 质量复核有 critical 或响应式 smoke 失败时 gate 返回非 0。

### Slice 14: 生产周期门禁封装

涉及文件:

1. `scripts/ops/production_launch_gate.mjs`
2. `docs/OPERATIONS_LAUNCH_GATE.md`
3. `env.example`
4. `README.md`
5. `package.json`

主要改动:

1. 新增 `ops:production-launch-gate`，从 `PRODUCTION_BASE_URL`、`LAUNCH_GATE_OUTPUT_DIR`、`LAUNCH_GATE_QUALITY_LIMIT` 和 `LAUNCH_GATE_TIMEOUT_MS` 读取生产巡检配置。
2. 默认拒绝 localhost，避免把本地 smoke 误当成生产 URL 证据；本地验收必须显式传 `--allow-local`。
3. 自动生成带时间戳的 JSON 证据文件和截图目录，便于 cron、CI 或人工发布前归档。
4. 支持 `--evidence-only` 在迁移前保留 blocked 状态但让命令返回 0；严格发布前不用该参数。
5. 补齐 README、env 示例和上线门禁运行手册，把迁移、邮件发送和周期门禁的生产变量放到同一套口径。

验证:

1. 未传生产 URL 时命令必须失败，并提示设置 `PRODUCTION_BASE_URL`。
2. localhost URL 在未显式 `--allow-local` 时必须失败。
3. `--allow-local --evidence-only --skip-responsive` 能生成生产门禁同格式证据包。
4. readiness blocked 且未传 `--evidence-only` 时命令必须返回非 0。

### Slice 15: 生产上线编排与写入护栏

涉及文件:

1. `scripts/ops/production_rollout.mjs`
2. `docs/OPERATIONS_LAUNCH_GATE.md`
3. `env.example`
4. `README.md`
5. `package.json`

主要改动:

1. 新增 `ops:production-rollout`，把迁移状态、readiness、ActivityEvent 回填、newsletter 草稿/记录/发送、影响力校准和 launch gate 串成一份上线证据。
2. 默认只做 dry-run 和只读检查；迁移、回填、newsletter 记录、影响力审计等写入动作必须传 `--confirm-production`。
3. 真实发 newsletter 需要额外 `--confirm-newsletter-send`；批量应用影响力分数需要额外 `--confirm-score-apply`。
4. 输出 `production-rollout-<timestamp>.json`，对子命令 stdout/stderr 做预览和敏感信息遮蔽，便于归档和排障。
5. 报告顶层新增 `assessment`，结构化列出 pending migrations、blockers 和 nextActions，避免从长 stdout 里人工找下一步。
6. 数据库连接失败会提升为 `database-connectivity` blocker，阻止继续误判为普通 readiness 问题。
7. 关键必需步骤失败后会快停，并把后续依赖步骤标成 `skipped`，避免继续跑注定失败的回填、发信、校准和 launch gate。
8. 运行手册补齐从 dry-run、迁移、回填、newsletter 观察、影响力审计到严格 launch gate 的推荐顺序。

验证:

1. 默认 dry-run 不写库、不发信、不改分数，并输出完整步骤报告。
2. 任何写入参数缺少 `--confirm-production` 必须失败。
3. `--send-newsletter` 缺少 `--confirm-newsletter-send` 必须失败。
4. `--apply-influence-score` 缺少 `--confirm-score-apply` 必须失败。
5. `--require-launch-gate` 能把生产 launch gate 结果纳入 rollout 证据。
6. rollout dry-run 能解析 Prisma pending migrations，并生成 blockers / nextActions。
7. 数据库不可达时 rollout 必须返回非 0，并在 `assessment.blockers` 标出 `database-connectivity`。
8. 数据库不可达时 rollout 必须快停，后续 Activity、newsletter、influence 和 launch gate 步骤应为 `skipped`。

### Slice 16: 迁移 SQL 计划与安全判定

涉及文件:

1. `scripts/ops/migration_plan.mjs`
2. `scripts/ops/production_rollout.mjs`
3. `docs/OPERATIONS_LAUNCH_GATE.md`
4. `README.md`
5. `package.json`

主要改动:

1. 新增 `ops:migration-plan`，读取 Prisma migration status，定位 pending migrations 并逐条解析 `migration.sql`。
2. 将 SQL 归类为 create table、create index、add foreign key、add column 等操作，并识别 drop、truncate、delete、update、alter drop、unknown SQL。
3. 生成 `safeToApply`、operation breakdown、pending migration 列表和下一步动作，支持 `--output` 归档。
4. `ops:production-rollout` 在迁移 deploy 前先跑 migration plan；计划不安全时会快停，不继续执行迁移。
5. 运维手册明确迁移前先看计划，只有 `safeToApply=true` 才继续 `--execute-migrations`。

验证:

1. 当前 4 个 pending migrations 能被识别出来。
2. 当前迁移 SQL 只包含非破坏性 DDL，`safeToApply=true`。
3. migration plan 已进入 production rollout 的证据链。
4. migration plan 不安全时不能继续执行 migration deploy。

## 12. 当前实现态

截至 2026-06-13，本规划已经落地第一版产品闭环:

1. 首页从静态目录升级为目录 + 近期动态 + 排序工作台，支持综合影响力、最近热度、学术影响力、开源影响力。
2. 人物详情页新增最近变化、影响力解释、关注、加入对比，并把来源覆盖做成可展开的可信度说明。
3. 话题页和机构页已具备可分享 URL，能展示 Top 人物、近期动态、代表作品和相关入口。
4. 关系模块已从简单网格升级为一跳网络视图 + 二跳关系探索 + 全局关系图谱页 + 证据优先表达，展示关系类型、证据、置信度和待核状态。
5. 关注体系已支持未登录 localStorage 和登录后写入 `UserProfile`，我的关注页能生成个人动态流。
6. 邮件订阅已具备设置 API、关注页入口、HMAC 退订 token、退订接口、投递日志模型和 weekly digest dry-run 脚本。
7. 人物对比页和本周动态页已上线为第一版高意图入口，对比页已包含关系网络摘要。
8. `ActivityEvent` 持久化契约、迁移文件和 dry-run 回填脚本已具备；前台会优先读持久化事件，表未迁移或未回填时自动退回 RawPoolItem。
9. Inngest 已注册每小时动态物化任务和每周 newsletter dry-run 任务；本地 dev mode 下 `/api/inngest` 可返回 5 个函数。
10. 高访问人物质量抽样脚本已具备，小样本可输出关系证据覆盖、低置信可信关系、近期动态来源覆盖和来源构成。
11. `/graph` 全局关系图谱已具备，支持按话题、机构和关系类型筛选，并从首页导航进入。
12. 影响力评分已有服务端权重版本、共享解释模块、审计日志模型、后台校准页、dry-run 校准脚本、人工决策模板和决策回放 dry-run。
13. Newsletter 已具备 Resend 发送适配、显式发送开关、失败重试、provider messageId、attempts、失败原因和投递监控页。
14. 上线准备度页和 `ops:readiness` CLI 已具备，可只读检查迁移、回填、发送环境和校准观察状态。
15. 质量复核队列已具备后台页、API、`audit:quality-review` CLI、决策模板与 review pack 导出，以及 `audit:quality-apply` dry-run/apply 脚本，可按严重程度和问题类型抽查并回写高访问人物的关系证据、卡片来源和 QA review backlog 结论。
16. 核心路径响应式回归已具备 `qa:responsive` CLI，可用系统 Chrome 在桌面和移动视口检查关键文字、横向溢出、console error 并保存截图。
17. 上线证据包已具备 `ops:launch-gate` CLI，可把 readiness、质量复核和响应式 smoke 串成单份 JSON 证据。
18. 生产周期门禁已具备 `ops:production-launch-gate` 封装，可用生产 URL 生成带时间戳的证据文件和截图目录，并默认拒绝本地 URL 误用。
19. 生产上线编排已具备 `ops:production-rollout`，可把迁移、回填、newsletter、影响力校准和 launch gate 串成默认 dry-run 的证据报告，写入动作均有显式确认护栏。
20. 迁移 SQL 计划已具备 `ops:migration-plan`，可在生产 deploy 前解析 pending migrations、识别破坏性 SQL，并把 `safeToApply` 接入 rollout 证据链。
21. 动态卡已具备“看点”说明，服务端统一派生 `importanceReason`，持久化事件优先使用 `evidenceNote`，fallback 事件按来源类型生成保守解释。
22. 话题和机构内容密度审计已具备 `audit:entity-density`，可检查核心 topic/org 的人物数、动态数、代表作品数、source mix 和薄入口缺口。
23. 内容密度审计已生成 `remediationQueue`，可把 thin topic/org 转成补人物、补动态、补代表论文或项目的优先队列和 search brief。
24. 话题页和机构页已展示内容覆盖状态，header 统计使用覆盖总量，侧栏提示达标或补强中的人物、动态、作品缺口。
25. 关系图谱默认曝光已增加置信度门槛，`audit:relation-graph` 可检查高访问人物的默认证据覆盖、低置信默认曝光、低置信排除量和待核关系 backlog。
26. 全局关系图谱已增加关键连接点、可追踪关系和 degraded 空态，慢查询或短暂连接异常不会直接打出 500。
27. 话题页和机构页已改为动态渲染，生产构建不再对核心 topic/org 做构建期数据库预渲染。

2026-06-13 生产闭环补充:

1. Newsletter 生产配置和小流量真实发送已完成，readiness 回读 `newsletter.sent=1`；`NEWSLETTER_SEND_ENABLED=false` 作为发送观察后的安全关闭，不阻塞 ready。
2. `ActivityEvent` 生产迁移和首次回填已完成，readiness 回读 `activity.total=555`、`recent30d=555`。
3. 生产 readiness 已从 blocked/pending 收敛为 ready；严格 `ops:production-launch-gate` 返回 `gateStatus=ready`、`responsive=18/18`、quality `0 critical / 0 high`。
4. 高访问人物 high80 质量决策已执行 84 条，回读 `queuedPeople=0`、`criticalPeople=0`、`highPeople=0`、`qaReviewRows=0`。
5. 话题和机构内容密度已复查到 `Ready: 20/20 (100%)`，核心 10 个 topic + 10 个 org 当前无补强队列。
6. 人物 PK 报告 MVP 已在生产 `/compare?people=...` 和报告详情页展示完整 13 工具链，生产 UX 测试 15/15 通过。

仍然后置:

1. 三跳以上探索、力导向图谱、跨机构/话题聚合洞察，以及图谱点击路径的行为数据回收。
2. 影响力分数批量应用到 `People.influenceScore`，需另行确认权重口径和写分授权；当前完成的是审计写入，不默认改主分。
3. Newsletter 下一次真实发送仍需显式确认并临时打开发送开关。
4. medium 级质量复核队列可继续做长期治理，但不阻塞当前 MVP 上线 ready。

### 12.1 下一阶段执行优先级

当前产品已经具备第一版功能闭环，生产可信、内容密度和上线门禁也已经补齐首轮证据。下一阶段不应继续横向堆页面，优先级要切到“质量持续治理、行为数据回收、订阅运营和报告质量提升”。

日常推进以 `docs/PRODUCT_EXECUTION_BOARD_2026_06.md` 为准，那里维护任务编号、状态、依赖、执行命令和验收证据。

| 优先级 | 任务 | 当前状态 | 下一步证据 |
|---|---|---|---|
| P0 | 生产迁移与 ActivityEvent 首次回填 | Completed | 后续按增量事件继续物化，周期性回读 `activity.total` 和来源覆盖 |
| P0 | Newsletter 生产小流量试发 | Completed | 下一次真实发送前重新跑 preflight，发送后回读 sent / failed / unsubscribe |
| P0 | 高访问人物质量复核首批应用 | Completed | medium 队列继续分批治理；high / critical 继续作为 launch gate 阻断项 |
| P1 | 首页和详情页动态质量增强 | Completed | 继续观察动态点击率、来源点击率和空态比例 |
| P1 | 话题 / 机构页内容密度补强 | Completed | 新增核心 topic / org 或提高门槛时重新跑 `audit:entity-density` |
| P1 | 影响力校准人工流程 | Completed for audit | 是否应用分数另开权重口径确认和写分授权 |
| P2 | 图谱可视化增强 | Completed for trusted default graph | 下一步才做三跳、力导向图、路径展开行为数据 |
| P1 | 人物 PK 报告 MVP | Completed | 下一步提升报告模板质量、样本覆盖和真实使用转化 |

### 12.2 近期验收清单

两周内最重要的验收不是“又做了几个页面”，而是证明当前产品能稳定支撑真实用户打开、订阅和回访。

1. 生产环境严格 `ops:production-launch-gate` 返回 ready。已完成。
2. 首页、人物页、`/digest`、`/graph`、`/watchlist`、`/admin/operations` 在桌面和移动端都通过 smoke。已完成，当前生产门禁 responsive 为 18/18。
3. 默认动态流来源覆盖率为 100%，无来源事件只进入复核队列。已完成，质量门禁 source coverage ready。
4. 至少 20 个高访问人物完成关系和动态质量抽样，critical 问题清零。已完成 high80 复查，critical/high 均为 0。
5. Newsletter 完成 1 次真实小流量发送，sent / failed / unsubscribe 都有可回读证据。已完成，readiness 回读 `newsletter.sent=1`。
6. 影响力校准先完成 dry-run 和审计写入，不批量改线上分数。已完成，readiness 回读 `influence.audits=24`，`appliedScore=null`。

## 13. 风险与取舍

### 13.1 数据幻觉风险

动态和关系是高信任场景。LLM 可以做摘要，但不能成为事实来源。事实必须来自结构化源、官方源或已审核来源。

控制策略:

1. 动态默认只展示有 URL 的事件。
2. 关系默认只展示非 `needs_review`。
3. LLM 只写 summary，不决定事实成立。
4. 关键人物关系要抽样复核。

### 13.2 竞品能力过宽风险

Semantic Scholar、Crunchbase、The Org 都是成熟平台，不能一次性照搬。AI 人物库的切口应保持清楚: 人物、关系、动态、可信来源。

暂不做:

1. 全量论文搜索引擎。
2. 全量创投数据库。
3. 大而全组织图谱。
4. 泛 AI 新闻站。

### 13.3 订阅冷启动风险

订阅功能如果没有足够动态，会显得空。当前先提供设置、退订和 dry-run，真实发送前要检查关注对象的内容密度；空关注或关注对象无新动态时，可以降级为全站本周动态摘要，避免发空邮件。

### 13.4 复杂图谱风险

图谱可视化容易好看但不实用。第一版优先关系解释和路径探索，图形效果后置。

## 14. 执行顺序建议

最稳的推进顺序:

1. 排序产品化和首页兜底。
2. 动态 API 和首页动态流。
3. 人物详情最近变化。
4. 话题页和机构页 MVP。
5. 关系可信表达。
6. 收藏、订阅、个人动态。
7. 人物比较和周报。

原因:

1. 排序和首页兜底改动小，能快速提升体验。
2. 动态流会直接改变产品心智，是最重要的新价值。
3. 话题页和机构页依赖动态能力，后做更自然。
4. 订阅依赖动态内容密度，放在公开动态流之后。

## 15. 两周 MVP 版本

两周内建议只追一个目标: 让用户打开首页就知道 AI 圈关键人物最近发生了什么。

第 1 周:

1. 排序切换: 综合、最近热度、学术、开源。
2. 首页冷启动兜底。
3. `GET /api/activity` 聚合 RawPoolItem 近 30 天内容。
4. 首页本周动态模块。
5. 动态卡来源和时间显示。

第 2 周:

1. 人物详情最近变化模块。
2. 动态按人物、话题、机构过滤。
3. 10 个核心话题入口链接到动态筛选。
4. 5 个核心机构入口链接到动态筛选。
5. 把高访问人物动态质量抽样扩大到 20 人，并通过质量复核队列沉淀人工复核结论。

两周验收:

1. 首页首屏有目录和动态两个明确入口。
2. 动态流至少覆盖 50 条有来源事件。
3. 10 个核心人物详情页能看到最近变化或明确空态。
4. 排序切换和动态筛选都能通过 URL 分享。
5. build 通过，桌面和移动端核心路径可截图验收。

## 16. 未来 8 周成果形态

8 周后理想状态:

1. 首页呈现为 AI 人物情报台，目录能力退到更自然的位置。
2. 用户可以按“最近热度、学术、开源、产业、话题、机构”找人。
3. 人物详情页能讲清楚核心贡献、最新变化、代表内容、关系和来源。
4. 话题页和机构页有稳定 URL，可以分享和被搜索。
5. 关系模块能展示证据和待核状态。
6. 用户可以关注人物或话题，形成个人动态流。
7. 数据质量不只是后台治理，也能体现在前台可信度表达上。
