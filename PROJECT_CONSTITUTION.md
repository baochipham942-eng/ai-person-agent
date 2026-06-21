# Project Constitution

> **📚 继承关系**
> 本文档继承 [全局开发宪法](../GLOBAL_CONSTITUTION.md)，此处仅记录本项目特有规则。
> 通用规则（语言偏好、pnpm、验证优先等）请参见全局宪法。
> 错题记录请参见 [全局错题本](../GLOBAL_LESSONS.md)。

## 1. Architecture & Deployment

### 1.1 Infrastructure
- **Frontend/API**: Next.js hosted on Vercel.
- **Proxy**: Aliyun Function Compute (FC) acts as a reverse proxy to Vercel (for China accessibility).
- **Database**: Neon (Serverless PostgreSQL).

### 1.2 Deployment (Aliyun FC)
- **Tool**: Serverless Devs (`s` CLI).
- **HTTPS Management**:
  - HTTPS certificates are managed **manually in the Aliyun FC Console**.
  - `s.yaml` MUST configure `protocol: HTTP` only.
  - **Critical**: Always deploy with `s deploy -y --use-remote`. This flag prevents the local HTTP-only config from overwriting the cloud's HTTPS config.
- **NextAuth**:
  - `auth.config.ts` MUST include `trustHost: true` to correctly handle `x-forwarded-proto: https` headers from the proxy.

## 2. Database (Neon Serverless)

### 2.1 Connection Strategy
- **Driver**: MUST use `@neondatabase/serverless` (WebSocket) with `@prisma/adapter-neon`.
  - **Reason**: Neon's free tier has a cold start of ~4s. Standard TCP connections often timeout. The WebSocket driver reduces cold start overhead to ~300ms and improves warm query performance by 10x.
- **Configuration**:
  - `schema.prisma`: `previewFeatures = ["driverAdapters"]`
  - Singleton pattern in `lib/db/prisma.ts` initializes the serverless pool.

## 3. Data Acquisition Strategy

### 3.1 Scraping & Anti-Scraping
- **"Hard Bones"**: Profiles that are heavily anti-scraped (e.g., tech celebrities on X) are flagged. These should be fetched via fallback methods (e.g., Grok API) rather than standard scrapers.
- **Data Fallback**:
  - For Chinese profiles with missing descriptions, use **Baidu Baike** as a secondary source (`fetch_baidu_baike.ts`).
  - Known "Hard Bones" list is maintained in scraping scripts to avoid repeated failures.

### 3.2 Data Sources Catalog

| Source | Role | Usage |
|--------|------|-------|
| **Wikidata** | **Primary Identity** | Source of truth for name, aliases, occupation, and organization relationships. |
| **Exa (Metaphor)** | **Broad Search** | Used to discover official links (blog, website) and recent content. |
| **Grok (X.AI)** | **Social Intelligence** | 1. Identifying X handles. <br> 2. Fetching posts/bios for **anti-scraping accounts** ("Hard Bones"). |
| **Twitter Syndication** | **Scraper** | Public API access for fetching bios of standard (non-blocked) X accounts. |
| **GitHub** | **Code Profile** | Fetching pinned repositories and README content for technical figures. |
| **Baidu Baike** | **Chinese Fallback**| Determining descriptions for Chinese profiles when other sources are empty. |
| **OpenAlex** | **Academic** | Fetching research papers and citation metrics. |
| **YouTube** | **Video** | Channel videos and appearances. |
| **iTunes Podcast** | **Audio** | Podcast episodes and appearances. |
| **AI Knowledge** | **Synthesis** | Fallback for generating structured career paths when explicit data is missing. |
| **Google Favicon** | **Logo** | Fetching high-res icons for official websites and organizations. |
| **Unavatar.io** | **Avatar** | Fallback for fetching user avatars based on social handles (X/Twitter). |
| **Perplexity** | **Sniper (High Precision)** | **[COST SENSITIVE]** Used ONLY for answering complex questions, filling specific gaps (e.g., "Why is he important?"), or verifying identity. **MUST obtain user confirmation before EACH usage.** |

### 3.3 Data Adaptation Rules

> **核心原则**：不同数据源返回格式各异，必须在 **入库前** 完成清洗适配转化，而非事后处理。

| 场景 | 问题 | 解决方案 |
|------|------|----------|
| **RawPoolItem 必填字段** | `urlHash` 和 `contentHash` 是必填字段，遗漏会导致插入失败 | 使用 `crypto.createHash('md5').update(value).digest('hex')` 生成 |
| **Grok 返回格式** | `getPersonXActivity` 返回 `{ summary, sources, posts }` 而非数组 | 调用方必须访问 `.posts` 属性，而非直接 `.slice()` |
| **officialLinks 格式** | 需要 `handle` 字段供抓取使用（如 `xHandle = links.find(l => l.type === 'x')?.handle`） | 创建 Person 时确保 officialLinks 包含 `handle` 字段 |
| **Inngest 本地触发** | 本地脚本无法直接发送事件到 Inngest Cloud（401 Event Key） | 必须通过生产环境 API 触发，或直接调用数据源函数绕过 Inngest |
| **Wikidata 依赖** | `refresh-person` API 强依赖 Wikidata 返回，若 Wikidata 无数据则整个流程失败 | 对于 Wikidata 信息不全的人物，需直接调用数据源函数手动填充 |

## 4. Error Book（错题本）

> 历史教训记录，避免重复踩坑。

### 4.1 数据入库失败

**问题**：`prisma.rawPoolItem.create()` 报错 "Argument `contentHash` is missing"

**原因**：Prisma schema 定义了 `contentHash String` 为必填，但脚本未提供该字段。

**修复**：
```typescript
import crypto from 'crypto';
const hashContent = (text: string) => crypto.createHash('md5').update(text || '').digest('hex');

await prisma.rawPoolItem.create({
    data: {
        // ...
        urlHash: hashContent(item.url),
        contentHash: hashContent(item.text || ''),
    }
});
```

---

### 4.2 Grok API 返回结构误判

**问题**：`xResults.slice is not a function` 或 `xResults.length` 为 `undefined`

**原因**：`getPersonXActivity()` 返回的是对象 `{ summary, sources, posts }` 而非数组。

**修复**：
```typescript
const result = await getPersonXActivity(xHandle, personName);
// 正确: 访问 .posts 属性
for (const post of result.posts || []) { ... }

// 错误: 直接迭代 result
for (const post of result) { ... }  // ❌
```

---

### 4.3 officialLinks 缺失 handle

**问题**：从 `officialLinks` 中提取 `xHandle` 或 `githubHandle` 时返回 `undefined`

**原因**：创建 Person 时只存了 `url` 和 `type`，未存 `handle` 字段。

**修复**：创建时确保格式正确：
```typescript
officialLinks: [
    { type: 'github', url: 'https://github.com/bcherny', handle: 'bcherny' },  // ✓ handle
    { type: 'x', url: 'https://x.com/bcherny', handle: 'bcherny' },            // ✓ handle
]
```

---

### 4.4 Inngest 本地无法触发

**问题**：本地脚本调用 `inngest.send()` 报 401 Event key not found

**原因**：本地环境没有 Inngest Event Key，无法直接发送事件到 Inngest Cloud。

**修复**：
1. 通过生产环境 API 触发（如 `curl -X POST https://production.url/api/admin/refresh-person`）
2. 或直接调用数据源函数绕过 Inngest：`await searchPersonContent(...)` + `prisma.rawPoolItem.create(...)`

---

### 4.5 Neon 数据库连接问题

**问题**：`prisma db push` 报错 `Can't reach database server at xxx:5432`

**原因**：
1. Neon 免费版闲置后会暂停数据库，直连容易超时
2. `prisma db push` 使用 `DIRECT_URL` 直连，不走 WebSocket

**修复**：
1. 确保 `.env` 配置了 `DIRECT_URL`（去掉 `-pooler` 后缀）
2. 先唤醒数据库再执行 CLI：
```bash
# 唤醒数据库
npx tsx -e "import {prisma} from './lib/db/prisma'; prisma.people.count().then(console.log)"
# 再执行迁移
npx prisma db push
```
3. 如持续失败，用 raw SQL 添加字段：
```typescript
await prisma.$executeRawUnsafe(`ALTER TABLE "People" ADD COLUMN IF NOT EXISTS "fieldName" TEXT`);
```

---

### 4.6 Schema 与数据库不同步

**问题**：脚本报错 `The column 'People.xxx' does not exist in the current database`

**原因**：`prisma/schema.prisma` 新增了字段，但未同步到数据库。

**修复**：
1. 运行 `npx prisma db push` 同步
2. 如连接失败，用 raw SQL：`ALTER TABLE "People" ADD COLUMN IF NOT EXISTS "xxx" TEXT`
3. 同步后运行 `npx prisma generate` 重新生成 Prisma Client

---

### 4.7 新增人物无 Wikidata QID

**问题**：新增人物时搜索 Wikidata 无结果，导致入库失败

**原因**：技术人员（如 Jerry Tworek）可能没有 Wikidata 条目。

**修复**：生成临时 QID 格式：`TEMP-{name}-{timestamp}`
```typescript
const finalQid = qid || `TEMP-${person.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now().toString(36)}`;
```
注意：临时 QID 后续可通过 `recrawl_robust.ts` 更新为真实 QID。


### 4.8 内容采集额度 vs 限流误判（supadata / Exa / OpenAlex）

**问题**：抓取脚本把「限流」误判成「额度耗尽」，要么疯狂重试烧额度，要么过早放弃。
**修复**（散在 commit `c0f322b6`/`f9c4b2d9`/`a5fe7709`/`4461c3d0`/`ee5b9573`）：
- **supadata**：区分 `429 限流`（重试）与 `402/403 额度耗尽/永久错误`（立即跳过不重试）。403=单视频永久错误（年龄限制/禁止）立即跳过。全局频率闸 `<10 req/s`。瞬时错误统一重试。202 异步任务要轮询。无字幕视频永久标记，防重复扣额度。
- **Exa 额度耗尽**：博客全文改用 **Jina Reader** 重抓；联网搜索改用 **Tavily**（`lib/tavily-search.ts`）。
- **OpenAlex**：按 UTC 午夜重置 budget；优先 `person.openalexId` 抓论文（免同名消歧）。

### 4.9 搜索 embedding 凭证

**问题**：`scripts/search/embed_content_chunks.ts` 报 401/PERMISSION_DENIED，向量生不出来。
**根因**：`~/.zshrc` 的 `sk-2769` 中转站 key 已失效；Gemini/Google key 无 embedding 权限。
**修复**：有效 OpenAI key（`sk-proj-` 原生）在 **mental-health-agent 的 `.env.local`**。复制进 person-agent `.env.local` + `SEARCH_EMBEDDING_PROVIDER=openai`；Clash TUN 直连 api.openai.com，embed 不用设 proxy。`search:materialize`（免费 FTS）与 `search:embed`（付费向量）是独立两步。

### 4.10 生产库批量写被 auto-mode 拦

**问题**：INSERT/UPDATE/DELETE（尤其删除/覆盖）被 auto-mode classifier 拦。
**修复**：需对**具体写动作**明确放行（光对方案点头不够），或用 `!` 自跑。身份批量写必须先 dry-run 过目。详见 `docs/architecture/ENRICHMENT_AND_IDENTITY.md`。
