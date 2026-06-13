
# AI Person Agent (AI 人物库)

这是一个基于 Next.js + Neon Postgres + Prisma 的 AI 人物数据聚合平台。
旨在通过多源数据抓取（Wikidata, Exa, Perplexity, YouTube, GitHub），构建高质量的 AI 领域人物档案。

## 🚀 快速开始

### 1. 环境准备
确保已安装 Node.js (v18+) 和 PostgreSQL 客户端。

```bash
# 安装依赖
npm install
```

### 2. 配置环境变量
复制 `env.example` 到 `.env` 并填写 API Key。

```bash
cp env.example .env
```

核心环境变量：
- `DATABASE_URL`: Neon Database connection string
- `OPENAI_API_KEY`: (可选) 用于某些 LLM 任务
- `DEEPSEEK_API_KEY`: 用于文本提取和清洗
- `PERPLEXITY_API_KEY`: 用于获取复杂结构化数据（如课程）
- `EXA_API_KEY`: 用于深度网页搜索
- `GOOGLE_API_KEY`: 用于 YouTube Data API
- `DIRECT_URL`: Prisma migrate 使用的直连数据库地址
- `PRODUCTION_BASE_URL`: 生产 launch gate 使用的网站 URL
- `NEWSLETTER_EMAIL_PROVIDER` / `RESEND_API_KEY`: 生产邮件发送配置

### 3. 本地开发
```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

## 📚 核心文档

详细的**系统架构与工作流文档**请参考：
[System Workflow Documentation](./workflow_documentation.md)

该文档包含了：
- **数据抓取流程** (Wikidata -> Exa -> Perplexity)
- **增量更新机制** (GitHub/YouTube 自动发现)
- **身份验证算法** (如何防止同名异人)
- **核心数据库字段定义**

产品力规划与执行入口：

- [产品力提升完整规划](./docs/PRODUCT_GROWTH_PLAN_2026_06.md)
- [产品力执行板](./docs/PRODUCT_EXECUTION_BOARD_2026_06.md)
- [上线门禁运行手册](./docs/OPERATIONS_LAUNCH_GATE.md)

## 🛠 常用脚本

所有的工具脚本都位于 `scripts/` 目录下：

- **数据抓取**: `npx tsx scripts/enrich/recrawl_robust.ts` (核心抓取流)
- **内容更新**: `npx tsx scripts/enrich/trigger_content_fetch.ts` (更新视频与代码库)
- **导出数据**: `npx tsx scripts/tools/export_people_csv.ts` (导出 CSV)
- **测试课程**: `npx tsx scripts/test_courses.ts` (测试课程抓取能力)
- **上线准备度**: `npm run ops:readiness`
- **Newsletter 预检**: `npm run newsletter:weekly -- --preflight --limit=5 --event-limit=8`
- **Newsletter dry-run**: `npm run newsletter:weekly -- --limit=5 --event-limit=8`
- **内容密度审计**: `npm run audit:entity-density -- --output=/tmp/ai-person-entity-density.json --remediation-output=/tmp/ai-person-entity-remediation.json`
- **关系图谱审计**: `npm run audit:relation-graph -- --output=/tmp/ai-person-relation-graph.json`
- **质量复核队列**: `npm run audit:quality-review -- --limit=20 --batch-size=10 --relation-row-limit=600 --activity-row-limit=600 --qa-row-limit=200 --summary-output=/tmp/ai-person-quality-summary.json --decision-template=/tmp/ai-person-quality-decisions.json --review-pack-output=/tmp/ai-person-quality-review-pack.json`
- **质量决策回放**: `npm run audit:quality-apply -- --file=/tmp/ai-person-quality-decisions.json --limit=20 --batch-size=10 --summary-output=/tmp/ai-person-quality-apply-summary.json`
- **影响力校准**: `npm run influence:calibrate -- --limit=24 --batch-size=8 --status=review --decision-template=/tmp/ai-person-influence-decisions.json --summary-output=/tmp/ai-person-influence-calibration-summary.json`
- **迁移计划**: `npm run ops:migration-plan -- --output=/tmp/ai-person-migration-plan.json`
- **上线证据包**: `npm run ops:launch-gate -- --base-url=http://127.0.0.1:4001 --output=/tmp/ai-person-launch-gate.json`
- **生产周期门禁**: `PRODUCTION_BASE_URL=https://people.example.com npm run ops:production-launch-gate`
- **生产上线编排**: `PRODUCTION_BASE_URL=https://people.example.com npm run ops:production-rollout -- --require-launch-gate --evidence-only-launch-gate`

运维门禁细节见 [上线门禁运行手册](./docs/OPERATIONS_LAUNCH_GATE.md)。
