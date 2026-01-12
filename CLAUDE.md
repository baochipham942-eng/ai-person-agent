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
- **People** - profiles with QID (Wikidata ID), bio, scores, status
- **PersonRole** - career history with organizations and dates
- **Organization** - companies, universities, linked to Wikidata
- **Card** - content cards (achievements, news, research)
- **RawPoolItem** - raw content from GitHub, YouTube, blogs

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
| 数据库查询/统计 | `mcp__postgres__query` | Prisma 脚本 |
| Web 搜索 | `mcp__exa__web_search_exa` | lib/datasources/exa.ts |
| 代码搜索 | `mcp__exa__get_code_context_exa` | Grep |
| 网页抓取 | `mcp__firecrawl__firecrawl_scrape` | WebFetch |
| 网站地图 | `mcp__firecrawl__firecrawl_map` | 手动探索 |
| GitHub PR/Issue | `mcp__github__*` | gh CLI |
| 文件操作 | `mcp__filesystem__*` | Read/Write |
| 浏览器自动化 | `mcp__playwright__*` | puppeteer |
| 文档查询 | `mcp__context7__query-docs` | WebFetch |
| 快速搜索 | `mcp__duckduckgo__search` | WebSearch |

### 何时使用 MCP vs 脚本

**使用 MCP**：
- 一次性查询、快速验证
- 交互式数据探索
- 简单的 CRUD 操作
- 查看 GitHub PR/Issue
- 抓取网页内容

**使用脚本**：
- 批量数据处理（100+ 条记录）
- 需要复杂业务逻辑
- 需要事务或错误重试
- 生产环境定时任务

## Documentation
- `PROJECT_CONSTITUTION.md` - Architecture, deployment, error book
- `workflow_documentation.md` - Data flows, APIs, KPIs
- `README.md` - Setup guide (Chinese)
