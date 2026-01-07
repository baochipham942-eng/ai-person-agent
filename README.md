
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
复制 `.env.example` 到 `.env` 并填写 API Key。

```bash
cp .env.example .env
```

核心环境变量：
- `DATABASE_URL`: Neon Database connection string
- `OPENAI_API_KEY`: (可选) 用于某些 LLM 任务
- `DEEPSEEK_API_KEY`: 用于文本提取和清洗
- `PERPLEXITY_API_KEY`: 用于获取复杂结构化数据（如课程）
- `EXA_API_KEY`: 用于深度网页搜索
- `GOOGLE_API_KEY`: 用于 YouTube Data API

### 3.本开发
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

## 🛠 常用脚本

所有的工具脚本都位于 `scripts/` 目录下：

- **数据抓取**: `npx tsx scripts/enrich/recrawl_robust.ts` (核心抓取流)
- **内容更新**: `npx tsx scripts/enrich/trigger_content_fetch.ts` (更新视频与代码库)
- **导出数据**: `npx tsx scripts/tools/export_people_csv.ts` (导出 CSV)
- **测试课程**: `npx tsx scripts/test_courses.ts` (测试课程抓取能力)
