
# AI Person Agent - System Workflow Documentation
# AI 人物数据系统架构文档

本文档详细总结了当前 AI 人物库（AI Person Agent）的数据处理工作流，旨在辅助开发工程落地。

## 1. 核心工作流 (Core Workflows)

### 1.1 人物入库与数据抓取 (Person Enrichment Flow)
**脚本**: `scripts/enrich/recrawl_robust.ts`
**目标**: 从零构建一个人物的完整档案。
**流程**:

1.  **Wikidata 基础信息**:
    *   通过名字搜索 Wikidata 获取 QID。
    *   获取基础元数据：别名、职业、性别、国家、官方链接。
    *   获取初版职业经历 (Start/End Date, Role, Organization)。
2.  **Exa.ai 深度搜索**:
    *   如果 Wikidata 数据缺失，调用 Exa 搜索 "biography career history"。
    *   使用 DeepSeek 从搜索结果文本中提取结构化职业经历 (JSON)。
3.  **Perplexity 补全**:
    *   作为最后兜底，向 Perplexity 询问结构化简历数据。
4.  **数据融合与存储**:
    *   将多源数据标准化为 `PersonRole`。
    *   自动创建缺失的 `Organization` 实体。

### 1.2 内容增量更新 (Incremental Update Flow)
**脚本**: `scripts/enrich/trigger_content_fetch.ts`
**目标**: 保持人物内容（GitHub, YouTube, 博客）的实时性。
**策略**:
*   **频率控制**: 检查 `lastFetchedAt` 字段，默认每 **7天** 更新一次。
*   **GitHub**:
    *   通过 `officialLinks` 找到 GitHub 账号。
    *   获取最近更新的 Top 10 public repositories。
    *   存入 `RawPoolItem` (Source: `github`)。
*   **YouTube**:
    *   解析 channel name / handle / username 获取 Channel ID (3种解析策略)。
    *   获取最新的 10 个视频。
    *   存入 `RawPoolItem` (Source: `youtube`)。

### 1.3 质量控制与清洗 (Quality Control)
**组件**: `lib/utils/identity-verifier.ts`
**目标**: 防止同名异人（Name Collision）污染数据。
**机制**:
*   **打分系统**: 基础分 0.5。
    *   `+0.4`: QID 匹配（最强信号）。
    *   `+0.15`: 机构名匹配 (OpenAI, Google 等)。
    *   `+0.1`: 职业关键词匹配 (Scientist, Engineer)。
    *   `+0.05`: AI 领域关键词匹配 (LLM, Transformer)。
    *   `-0.3`: 负面信号 (Actor, Sports, History, Gaming)。
*   **过滤逻辑**: 置信度 < 0.5 或包含拒绝原因的内容会被丢弃。

## 2. 关键 API与服务 (APIs Used)

| 服务 | 用途 | 关键参数/模型 |
| :--- | :--- | :--- |
| **DeepSeek** | 数据清洗、非结构化文本转 JSON、内容摘要 | `deepseek-chat` |
| **Exa.ai** | 高质量网页搜索（排除 SEO 垃圾站） | `neural` search, `numResults: 5` |
| **Perplexity** | 复杂问题问答、简历补全 | `sonar` model |
| **Wikidata** | 实体消歧、基础元数据 | `wbsearchentities`, SPARQL query |
| **Google YouTube** | 频道解析、视频获取 | `youtube/v3/search`, `channels`, `playlistItems` |
| **GitHub API** | 代码仓库获取 | REST API `/users/{username}/repos` |
| **Twitter/Grok** | (实验性) 推文获取与分析 | Grok API (Beta) |

## 3. 数据库核心字段 (Key Data Schema)

基于 `Prisma` Schema 的核心模型设计。

### People (人物核心表)
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | String (CUID) | 唯一主键 |
| `name` | String | 显示名 (e.g., "Sam Altman") |
| `qid` | String | Wikidata ID (e.g., "Q7407093")，唯一标识 |
| `aiContributionScore` | Float | AI 贡献分 (0-10)，用于排序 |
| `occupation` | String[] | 职业标签 (Researcher, Engineer) |
| `organization` | String[] | 关联机构名 (OpenAI, YC) |
| `officialLinks` | Json | 社交链接 `{type: 'github', url: '...'}` |
| `lastFetchedAt` | Json | 增量更新游标 `{github: '2026-01-01...'}` |
| `status` | String | `pending` / `ready` / `error` |

### PersonRole (职业经历/时间轴)
| 字段 | 来源 | 说明 |
| :--- | :--- | :--- |
| `role` | String | 英文职位 (e.g., "CEO") |
| `roleZh` | String | 中文职位 (AI 翻译) |
| `organizationId` | Relation | 关联 `Organization` 表 |
| `startDate` | DateTime | 开始时间 |
| `endDate` | DateTime | 结束时间 (空代表至今) |

### RawPoolItem (原始内容池)
| 字段 | 说明 |
| :--- | :--- |
| `sourceType` | `github`, `youtube`, `twitter`, `blog` |
| `urlHash` | URL 的 MD5，用于去重 |
| `text` | 全文内容或摘要 |
| `metadata` | JSON 存储特定源的元数据 (stars, views, duration) |

## 4. 关键指标 (KPIs)

1.  **Completeness (完整度)**: 0-100%
    *   计算逻辑：是否有头像(10) + 有简介(20) + 有职业经历(30) + 有关联内容(40)。
2.  **AI Contribution Score (贡献分)**: 0-10.0
    *   用于列表页默认排序。
    *   目前基于规则 + AI 评分生成。
3.  **Data Freshness (新鲜度)**:
    *   `lastFetchedAt` 距离当前的时间差。所有活跃人物应 < 7 天。

## 5. 建议补充/优化点 (Future Improvements)

1.  **Twitter/X 稳定抓取**: 目前依赖 Grok 或不稳定方案，建议接入官方 Enterprise API 或稳定第三方服务。
2.  **自动去重合并 (Merge/Dedupe)**: 多个源可能抓取到同一条新闻或论文，目前仅通过 URL Hash 去重，建议增加语义去重。
3.  **中文翻译一致性**: 目前 Role/Organization 的中文翻译分散在入库时，建议引入专门的翻译字典表维护统一译名。
