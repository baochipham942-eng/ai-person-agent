# Knowledge Source dry-run scripts

这些脚本是知识主题页采集链路的 P0 骨架，只输出 JSON，不写 `KnowledgeSource`、不触发生产任务、不使用秘密 key。主线程后面可以把 dry-run JSON 送进 review，再由数据层 session 决定怎么 upsert 到 `KnowledgeSource` / `KnowledgeThreadSource`。

S4 新增 fetch 脚本只覆盖 `official_definition`、`transcript_context`、`paper_foundation`、`implementation_signal`。完整 topic pack readiness 仍然检查 `signal`，但 signal 来自 S1/X 资料包，不在这轮实现新的 X 抓取脚本。财报、IR 和 earnings call 更适合公司/机构聚合页，不进入 `scripts/knowledge` 的主题页验证口径。

## 统一输出

每个 fetch 脚本输出同一层包:

```json
{
  "schemaVersion": "knowledge-source-dry-run/v1",
  "mode": "dry-run",
  "script": "fetch_official_sources",
  "generatedAt": "2026-06-18T00:00:00.000Z",
  "inputs": {},
  "stats": { "sources": 1 },
  "sources": [
    {
      "sourceKind": "official_blog",
      "sourceOwner": "anthropic.com",
      "title": "Claude Code",
      "url": "https://www.anthropic.com/news/claude-code",
      "urlHash": "sha256...",
      "text": "clean text...",
      "publishedAt": null,
      "fetchedAt": "2026-06-18T00:00:00.000Z",
      "metadata": {
        "role": "official_definition",
        "dryRun": true
      }
    }
  ],
  "accessIssues": [],
  "notes": []
}
```

`sources[]` 对齐计划里的 `KnowledgeSource` 字段，并额外带 `metadata.role`，方便主线程接到 `KnowledgeThreadSource.role`。`urlHash` 现在用标准化 URL 的 sha256，真正入库前如果数据层决定沿用现有 md5 规则，可以在 upsert 层替换。

## 官方博客 / docs / changelog

脚本:

```bash
node scripts/knowledge/fetch_official_sources.mjs \
  --url=https://www.anthropic.com/news/claude-code \
  --rss=https://www.anthropic.com/news/rss \
  --sitemap=https://docs.anthropic.com/sitemap.xml \
  --limit=10
```

输入:

- `--url=`: 直接抓一个官方页面。
- `--rss=`: 抓 RSS/Atom item，再跟进 item URL 抽正文。
- `--sitemap=`: 抓 sitemap 的 `loc`，按 `--limit` 跟进页面。
- `--input=`: txt 每行一个 URL，或 JSON 数组 / `{ "urls": [] }`。
- `--max-chars=`: 每条 source 的正文截断长度，默认 12000。

输出角色默认是 `official_definition`。不需要 API key。阻塞点通常是页面反爬、JS-only 内容或 docs 站禁止抓取；最省钱替代路径是先喂 RSS/sitemap/静态 docs URL，必要时人工下载 HTML 后从本地 URL 清单重跑。

## YouTube 字幕

脚本:

```bash
node scripts/knowledge/fetch_youtube_transcripts.mjs \
  --url=https://www.youtube.com/watch?v=VIDEO_ID \
  --caption-dir=exports/youtube-captions/subtitles/local \
  --limit=5
```

默认只 dry-run:

- 解析视频 ID。
- 读取本地 caption 目录里的 `.vtt/.srt/.json3` 候选。
- 给出可复用的现有命令: `node scripts/enrich/fetch_youtube_captions_with_ytdlp.mjs --ids-file=... --execute`。
- 加 `--probe` 时会尝试拉 YouTube 页面里的 caption track metadata，但不下载字幕、不调用 YouTube Data API。

不需要 `GOOGLE_API_KEY`。如果要做频道搜索或视频发现，才需要 YouTube Data API key；当前 P0 只做“已知视频 URL 的字幕候选”。YouTube 反爬或登录限制时，最省钱路径是沿用现有 `yt-dlp` 脚本，必要时人工提供 cookies 或本地字幕文件。

## 论文

脚本:

```bash
node scripts/knowledge/fetch_paper_sources.mjs \
  --query="tool use agents coding evaluation" \
  --limit=5
```

默认走 OpenAlex 免费 API，无 key；也支持 `--url=` / `--doi=` 直接规范化候选论文。输出角色是 `paper_foundation`，`metadata` 会保留 DOI、OpenAlex ID、venue、citation count、authors。阻塞点是论文全文通常不一定开放，P0 先用 abstract 和 landing page；后续再补 arXiv、Semantic Scholar 或 publisher PDF。

## 工程落地来源

脚本:

```bash
node scripts/knowledge/fetch_implementation_sources.mjs \
  --repo=anthropics/anthropic-cookbook \
  --docs-url=https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview \
  --limit=5
```

S1 的 Loop Engineering 候选包可以直接作为 implementation dry-run 输入，脚本会只读取 `role=implementation_signal` 的条目，自动跳过 signal、official、paper 和 company strategy appendix:

```bash
node scripts/knowledge/fetch_implementation_sources.mjs \
  --input=/Users/linchen/.codex/worktrees/eeaf/ai-person-agent/docs/knowledge-threads/loop-engineering-sources.candidates.json \
  --limit=8
```

输入:

- `--repo=OWNER/REPO`: 抓 GitHub repo metadata 和 README。
- `--github-search=`: 用 GitHub public search 找候选 repo，不带 token，适合少量 dry-run。
- `--docs-url=`: 抓官方 docs / SDK docs 页面，抽正文和 code snippets。
- `--example-url=`: 抓 examples / cookbook / demo 页面，抽正文和 code snippets。
- `--url=`: 自动判断 GitHub repo 或 docs/example 页面。
- `--input=`: txt URL/repo 列表，或 JSON 数组。

输出角色是 `implementation_signal`。GitHub public API 不需要 key，但匿名 rate limit 低；P0 最省钱路径是优先提供明确 repo URL、cookbook URL、examples URL。遇到 rate limit 时，不要使用个人 token 做自动化消耗，先收窄候选清单或人工下载 README/docs HTML 后再 dry-run。

这类来源只证明“工程上如何落地 / 社区或官方 examples 如何采用”，不能替代官方定义，也不能把 demo repo 的说法升级成产品事实。

## 未来公司/机构页 pipeline

财报 / IR / earnings transcript 后续应该放到公司或机构聚合页，例如 `scripts/company/fetch_company_financial_sources.mjs`。那条 pipeline 可以抓公司 IR、SEC submissions、earnings materials 和公开 transcript 候选，角色类似 `financial_signal`，服务于公司战略、投入方向和机构动态，不计入知识主题页 P0 验证。

## Review pack

脚本:

```bash
node scripts/knowledge/review_thread_pack.mjs \
  --input=exports/knowledge/official.json \
  --input=exports/knowledge/youtube.json \
  --required-role=signal \
  --required-role=official_definition \
  --required-role=transcript_context \
  --required-role=paper_foundation \
  --required-role=implementation_signal
```

检查内容:

- JSON 是否能 parse。
- `sources[]` 是否存在必要字段。
- source role 覆盖是否达标。
- 是否有重复 URL / `urlHash`。
- 是否有空正文、过短正文或无法抓取记录。

## 接入 KnowledgeSource

主线程接入时先不要直接写 DB。建议流程:

1. 每类脚本输出到 `exports/knowledge/<thread>/<kind>.json`。
2. `review_thread_pack.mjs` 合并检查角色覆盖和重复 URL。
3. 主线程或 Mimo 补 `KnowledgeThreadSource.summary`、`evidenceQuote`、`relevanceScore`。
4. 数据层再做一个单独的 `materialize` 脚本，把 `sources[]` upsert 到 `KnowledgeSource`，用 `urlHash` 去重。
5. `metadata.role` 写进 `KnowledgeThreadSource.role`，不要只留在 `KnowledgeSource.metadata`。

P0 的成功标准是能稳定产出 review-ready JSON；Prisma migration、入库、边关系抽取放到后续 S2/S3 合并阶段。

## Materialize pack

脚本:

```bash
node scripts/knowledge/materialize_thread_pack.mjs \
  --input=docs/knowledge-threads/loop-engineering-sources.candidates.json
```

默认只做 dry-run，输出会写入的 `KnowledgeThread`、`KnowledgeSource`、`KnowledgeThreadSource`、`KnowledgeThreadEdge` 数量，并检查必备角色、重复 URL hash、缺字段和 dangling edge。

真正写入时必须显式加 `--execute`。如果 `DATABASE_URL` 不是本机数据库，脚本会拒绝写入；确认是 dev 数据库后才允许加 `--allow-remote-dev`。这个脚本不用于生产库发布。
