# AI Person Agent (AI 人物库)

## Project Overview
A full-stack web application that aggregates, enriches, and presents comprehensive profiles of influential figures in the AI industry. Combines data from multiple sources (Wikidata, Exa.ai, GitHub, YouTube, X/Twitter) with AI-powered data cleaning to build a high-quality AI professional database.

## Tech Stack

### Frontend
- **Next.js 16.1.1** with App Router
- **React 19** + **TypeScript 5**
- **TailwindCSS 4** + **Arco Design 2.66**
- React Markdown for content rendering

### Backend
- **Next.js API Routes** (serverless)
- **NextAuth 5.0.0-beta.30** (Credentials provider)
- **Prisma ORM 5.22** with PostgreSQL
- **Neon Serverless** (WebSocket driver for fast cold starts)

### AI Integration
- **DeepSeek** - text extraction, data cleaning, JSON generation
- **Perplexity API** - complex structured data extraction
- **OpenAI** - fallback LLM
- **AI SDK 6.0.3** - unified LLM interface

### Data Sources
- Wikidata (identity, metadata)
- Exa.ai (web search, links)
- Grok/X.AI (Twitter data)
- GitHub API, YouTube Data API
- OpenAlex (academic data)

### Infrastructure
- **Vercel** - frontend/API hosting
- **Aliyun FC** - China reverse proxy
- **Inngest** - background job orchestration

## Project Structure
```
app/                    # Next.js App Router
  api/                  # API routes (admin, auth, person, search, inngest)
  (main)/               # Main layout group
  person/               # Person detail pages
lib/
  datasources/          # Multi-source integrations (wikidata, exa, grok, github, youtube)
  inngest/              # Background job workflows
  agents/               # AI agents (qa, router)
  ai/                   # DeepSeek wrapper, prompts, translators
  utils/                # Identity verification, avatar, quality scoring
  db/prisma.ts          # Singleton Prisma client (WebSocket pool)
scripts/
  enrich/               # Data enrichment pipelines (recrawl_robust, trigger_content_fetch)
  tools/                # CSV export, deduplication, cleanup
  audit/                # Data quality verification
prisma/schema.prisma    # Database models
```

## Package Manager
**Always use `bun` instead of npm/pnpm/yarn.**

## Key Commands
```bash
# Development
bun install
bun dev                     # Start dev server (port 4001)
bun dev:inngest             # Start with Inngest local dev
bun dev:all                 # Run both concurrently

# Database
bun db:generate             # Generate Prisma client
bun db:migrate              # Apply migrations
bun db:push                 # Push schema to Neon
bun db:studio               # Open Prisma Studio

# Build & Deploy
bun run build               # Production build
bun start                   # Start production (port 4001)
bun run deploy:build        # Build with asset copying for FC

# Data Scripts
bun scripts/enrich/recrawl_robust.ts         # Core person enrichment
bun scripts/enrich/trigger_content_fetch.ts  # Update GitHub/YouTube content
bun scripts/tools/export_people_csv.ts       # Export to CSV
```

## Environment Variables
```bash
DATABASE_URL=               # Neon Postgres pooler URL (with -pooler suffix)
DIRECT_URL=                 # Neon direct URL (without -pooler, for Prisma CLI)
DEEPSEEK_API_KEY=           # LLM for data cleaning
DEEPSEEK_API_URL=           # DeepSeek endpoint
EXA_API_KEY=                # Web search
GOOGLE_API_KEY=             # YouTube Data API
PERPLEXITY_API_KEY=         # Complex Q&A
INNGEST_EVENT_KEY=          # Background jobs
XAI_API_KEY=                # Grok API
XAI_BASE_URL=               # Grok endpoint
AUTH_SECRET=                # NextAuth secret
OPENAI_API_KEY=             # (Optional) fallback
```

## Key Database Models

> **MCP 查询注意**：PostgreSQL 驼峰字段需双引号，如 `"wikidataQid"`, `"roleZh"`

### User / Auth
```
User: id, username, email, emailVerifiedAt, passwordHash, nickname, displayName,
role (USER|ADMIN), status (PENDING_EMAIL|ACTIVE|SUSPENDED|DELETED), tags[],
lastLoginAt, lastSeenAt, failedLoginCount, lockedUntil, avatar, phone,
quickLoginToken, createdAt, updatedAt

EmailVerificationToken / PasswordResetToken:
id, userId, tokenHash, expiresAt, usedAt, createdAt

QuickLoginDevice:
id, userId, deviceName, tokenHash, userAgent, ipHash,
lastUsedAt, revokedAt, createdAt, updatedAt
```
> 后台权限以 `User.role=ADMIN` 且 `User.status=ACTIVE` 为准；一键登录设备可在 `/account/security` 撤销。

### Invitation / Audit
```
InvitationCode: id, code, type, maxUsages, usedCount, expiresAt,
channel, note, createdById, createdAt

InvitationCodeUse: id, invitationCodeId, userId, usedAt

UserAuditLog: id, actorUserId, targetUserId, action, metadata (JSON), createdAt

AuthRateLimitEvent: id, key, action, createdAt
```
> 管理员对用户、邀请码、维护任务和定时规则的操作应写入 `UserAuditLog`。

### MaintenanceJob / MaintenanceSchedule
```
MaintenanceJob:
id, kind, status, dryRun, triggerSource, requestedById, sourceJobId, retryCount,
targetPersonIds[], options (JSON), command, progressTotal, progressDone,
errorMessage, startedAt, completedAt,
cancelRequestedAt, canceledById, cancelReason,
createdAt, updatedAt

MaintenanceJobLog:
id, jobId, level, message, metadata (JSON), createdAt

MaintenanceSchedule:
id, name, enabled, kind, dryRun, targetPersonIds[], options (JSON),
intervalHours, nextRunAt, lastRunAt, lastJobId, runCount,
createdById, createdAt, updatedAt
```
> 内容维护菜单支持新人物构建、单人物/多人物/全站刷新、dry-run、execute、媒体渠道筛选、重试、取消和 Inngest 定时扫描。

### People
```
id, qid (唯一), name, aliases[], description, whyImportant, aiContributionScore,
avatarUrl, gender, country, occupation[], organization[],
officialLinks (JSON), sourceWhitelist[], status, completeness,
topics[], topicRanks (JSON), topicDetails (JSON), highlights (JSON), roleCategory,
influenceScore, quotes (JSON), currentTitle, products (JSON), education (JSON),
citationCount, hIndex, openalexId, githubStars,
viewCount, weeklyViewCount, lastFetchedAt (JSON),
createdAt, updatedAt
```

### PersonRole
```
id, personId, organizationId,
role (职位名), roleZh (中文职位),
startDate, endDate, source, confidence,
advisorId (导师关联), createdAt
```
⚠️ **没有 title 字段，用 role**

### PersonRelation
```
id, personId, relatedPersonId,
relationType (advisor|advisee|cofounder|colleague|former_colleague|collaborator|successor),
description, source, confidence,
reviewStatus (trusted|confirmed|needs_review), evidenceUrl, evidenceNote,
createdAt
```
⚠️ **reviewStatus 控制详情页关联人物展示**：needs_review 用弱化标签。新关系写入须经 `lib/agents/relation-validation.ts` 校验闸

### Organization
```
id, name, nameZh, type,
wikidataQid (不是 qid!), description
```
⚠️ **字段是 wikidataQid，查询时写 `"wikidataQid"`**

### Card
```
id, personId, type, title, content, tags[], sourceUrl, importance,
generationId, isActive, archivedAt, createdAt, updatedAt
```

### RawPoolItem
```
id, personId, sourceType, url, urlHash, contentHash,
title, text, publishedAt, metadata (JSON),
fetchStatus, errorCode, fetchedAt, processed
```

### KnowledgeThread / KnowledgeSource
```
KnowledgeThread:
id, slug (唯一), title, summary, whyNow, status,
priorityScore, confidence, category, tags[], aliases[],
refreshCadenceDays, lastReviewedAt, createdAt, updatedAt

KnowledgeSource:
id, sourceKind, sourceOwner, title, url, urlHash (唯一),
text, publishedAt, fetchedAt, metadata (JSON)

KnowledgeThreadSource:
id, threadId, sourceId, rawPoolItemId, role,
relevanceScore, sourceWeight, evidenceQuote, summary,
metadata (JSON), createdAt

KnowledgeThreadEdge:
id, threadId, fromSourceId, toSourceId, relationType,
confidence, evidenceNote, createdAt
```
> 知识线程页使用 `KnowledgeThread*` 承载官方博客、字幕、论文、GitHub/examples 等非人物中心来源。财报/IR/earnings call 属于公司页证据，不计入技术主题页 required roles。

### ActivityEvent
```
id, personId, sourceItemId,
eventType, sourceType, title, summary, url,
occurredAt, detectedAt, topics[], organizations[],
confidence, evidenceNote, reviewStatus, metadata (JSON),
createdAt, updatedAt
```
> 动态流持久化事件。默认发布侧只展示可信状态和足够置信度的事件。

### Course
```
id, personId, title, titleZh, platform, url, urlHash,
type, level, category, description, thumbnailUrl,
duration, language, enrollments, rating, reviewCount,
prerequisite, learningOrder, topics[], source, verified, confidence,
publishedAt, lastUpdatedAt, createdAt, updatedAt
```

### QAAuditLog
```
id, personId, url, urlHash, sourceType,
stage (L0规则|L1语义|L2去重), verdict (keep|reject|review|duplicate),
aboutPerson, aiRelevant, quality (L1 语义评分, 0-1), reason, createdAt
```
> 三段式清洗(lib/agents/clean-orchestrator.ts)的决策审计日志, 用于回溯/度量/数据飞轮

### NewsletterDeliveryLog
```
id, userId, email, frequency, deliveryType, subject,
status, provider, providerMessageId, attempts, payload (JSON),
errorMessage, createdAt, lastAttemptAt, sentAt
```

### CompareReport / CompareReportEvent
```
CompareReport: id, title, topic, peopleIds[], status, visibility,
summary, reportJson (JSON), sourceSnapshot (JSON), errorMessage,
createdById, createdAt, updatedAt, completedAt

CompareReportEvent: id, reportId, step, status, title, message,
metadata (JSON), createdAt
```

### InfluenceScoreAuditLog
```
id, personId, scoreVersion, previousScore, computedScore, appliedScore,
dimensions (JSON), signals (JSON), weights (JSON),
status, reason, reviewer, createdAt
```

## Core Workflows

### Person Enrichment (`scripts/enrich/recrawl_robust.ts`)
1. Search Wikidata for identity (QID, aliases)
2. Fetch career history with dates
3. Find official links via Exa.ai
4. Extract X/Twitter via Grok
5. Merge sources, create PersonRole/Organization records

### Content Updates (`scripts/enrich/trigger_content_fetch.ts`)
- 7-day cycle per source
- GitHub: Top 10 recent repos
- YouTube: Latest 10 videos
- Blog: RSS/web via Exa

### Identity Verification (`lib/utils/identity-verifier.ts`)
- Multi-signal scoring (0-1.0)
- +0.4 QID match, +0.15 org match, +0.1 keywords
- Threshold < 0.5 = rejected

## Deployment Notes
- **Vercel**: Frontend/API hosting
- **Aliyun FC**: Use `s deploy -y --use-remote` (preserves HTTPS)
- **Neon WebSocket**: 4s → 300ms cold start optimization
- **NextAuth**: Requires `trustHost: true` for proxy

## Neon Database Connection

### 连接配置
- **DATABASE_URL**: pooler 连接，带 `-pooler` 后缀，应用运行时使用
- **DIRECT_URL**: 直连，无 `-pooler`，Prisma CLI (`db push`, `migrate`) 使用

### 常见问题

**问题**: `prisma db push` 报错 `Can't reach database server`
**原因**: Neon 免费版闲置后会暂停，直连可能超时
**解决**:
1. 先运行任意脚本唤醒数据库: `npx tsx -e "import {prisma} from './lib/db/prisma'; prisma.people.count().then(console.log)"`
2. 再运行 `npx prisma db push`
3. 如仍失败，用 raw SQL 添加字段: `prisma.$executeRawUnsafe('ALTER TABLE "People" ADD COLUMN IF NOT EXISTS "fieldName" TEXT')`

**问题**: 脚本中途 `PrismaClientKnownRequestError` 连接断开
**原因**: 网络波动或 Neon 连接池回收
**解决**: 脚本已使用 WebSocket 连接池，通常会自动重连。如持续失败，等待几秒重试。

### 新增人物入库流程
```bash
# 1. 编辑 scripts/enrich/add_priority_ai_people.ts 添加人物数据
# 2. 运行入库
npx tsx scripts/enrich/add_priority_ai_people.ts

# 3. 数据补全
npx tsx scripts/enrich/recrawl_robust.ts           # 职业历史
npx tsx scripts/enrich/enrich_openalex.ts          # 学术引用
npx tsx scripts/enrich/enrich_topics_highlights.ts # 话题标签
npx tsx scripts/fix_missing_avatars.ts             # 头像
```

## MCP Tools 优先级

当执行以下任务时，**必须优先使用 MCP tools** 而非编写脚本：

| 任务类型 | MCP Tool | 回退方案 |
|---------|----------|---------|
| 数据库**只读**查询 | `mcp__postgres__query` | Prisma 脚本 |
| Web 搜索 | `mcp__exa__web_search_exa` | lib/datasources/exa.ts |
| 代码搜索 | `mcp__exa__get_code_context_exa` | Grep |
| 网页抓取 | `mcp__firecrawl__firecrawl_scrape` | WebFetch |
| 网站地图 | `mcp__firecrawl__firecrawl_map` | 手动探索 |
| GitHub PR/Issue | `mcp__github__*` | gh CLI |
| 文件操作 | `mcp__filesystem__*` | Read/Write |
| 浏览器自动化 | `agent-browser` (CLI) | `mcp__playwright__*` |
| 文档查询 | `mcp__context7__query-docs` | WebFetch |
| 快速搜索 | `mcp__duckduckgo__search` | WebSearch |

### 何时使用 MCP vs 脚本

**使用 MCP**：
- 一次性**只读**查询、快速验证
- 交互式数据探索（SELECT 查询）
- 查看 GitHub PR/Issue
- 抓取网页内容

**使用脚本**：
- **任何数据库写操作**（INSERT/UPDATE/DELETE）⚠️
- 批量数据处理（100+ 条记录）
- 需要复杂业务逻辑
- 需要事务或错误重试
- 生产环境定时任务

> ⚠️ **重要**: `mcp__postgres__query` 是**只读**的！
> 执行 UPDATE/INSERT/DELETE 会报错：`cannot execute UPDATE in a read-only transaction`
> 所有写操作必须通过 Prisma 脚本执行。

## 脚本执行最佳实践

### 避免 "Prompt is too long" 错误

长时间运行的脚本可能产生大量输出，导致 Claude Code 上下文超限。解决方法：

**1. 使用 `--quiet` 模式**
```bash
npx tsx scripts/enrich/xxx.ts --quiet
```
脚本应支持静默模式，只输出进度摘要和最终统计。

**2. 过滤 Prisma debug 日志**
```bash
npx tsx scripts/xxx.ts 2>&1 | grep -v "^prisma:"
```

**3. 输出重定向到文件**
```bash
npx tsx scripts/xxx.ts > /tmp/output.log 2>&1
tail -50 /tmp/output.log  # 只查看最后部分
```

**4. 分批处理**
```bash
npx tsx scripts/xxx.ts --limit=50  # 每次只处理50条
```

**5. 脚本编写规范**
```typescript
const quiet = args.includes('--quiet');
const log = (msg: string) => { if (!quiet) console.log(msg); };

// 静默模式下每 N 条输出一次进度
if (quiet && i % 20 === 0) console.log(`进度: ${i}/${total}`);

// 最终统计始终输出
console.log(`📊 完成: 处理 ${total} 条，成功 ${success} 条`);
```

## Browser Automation (agent-browser)

浏览器自动化**首选** `agent-browser` CLI，使用 Ref 工作流：

```bash
# 核心流程
agent-browser open <url>              # 打开页面
agent-browser snapshot -i             # 获取交互元素 [ref=e1, e2...]
agent-browser click @e1               # 用 ref 点击（不用 CSS 选择器）
agent-browser fill @e2 "text"         # 填充输入框
agent-browser screenshot /tmp/x.png   # 截图
agent-browser close                   # 关闭

# 常用命令
agent-browser snapshot --json         # JSON 输出，便于解析
agent-browser wait 2000               # 等待毫秒
agent-browser wait --load networkidle # 等待网络空闲
agent-browser get text @e1            # 获取元素文本
agent-browser --session s1 open url   # 命名会话（支持并行）
```

详细文档: `.claude/skills/agent-browser/SKILL.md`

## Documentation
- `PROJECT_CONSTITUTION.md` - Architecture, deployment, error book
- `workflow_documentation.md` - Data flows, APIs, KPIs
- `README.md` - Setup guide (Chinese)
