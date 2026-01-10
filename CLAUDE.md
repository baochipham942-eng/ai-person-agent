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
DATABASE_URL=               # Neon Postgres connection string
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

## Documentation
- `PROJECT_CONSTITUTION.md` - Architecture, deployment, error book
- `workflow_documentation.md` - Data flows, APIs, KPIs
- `README.md` - Setup guide (Chinese)
