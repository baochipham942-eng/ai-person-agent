---
description: 项目开发规范和宪法 - 每次开始工作前必读
---

# 项目宪法 (Project Constitution)

在开始任何开发工作前，**必须**阅读并遵守以下规则：

## 1. 阅读全局宪法
首先阅读 `../GLOBAL_CONSTITUTION.md`，了解通用开发规范：
- 语言偏好（中文）
- 包管理器（pnpm）
- 验证优先原则
- 错题本机制

## 2. 阅读项目宪法
然后阅读 `PROJECT_CONSTITUTION.md`，了解本项目特有规则：
- 架构：Next.js on Vercel + 阿里云 FC 反向代理
- 数据库：Neon Serverless PostgreSQL (WebSocket 驱动)
- 数据源策略：Wikidata、Exa、Grok、GitHub 等
- 部署：`s deploy -y --use-remote`

## 3. 核心禁令
- ❌ 禁止使用 `npm`，必须使用 `pnpm`
- ❌ 禁止未验证就通知用户"已完成"
- ❌ 禁止在硬骨头账号上用普通爬虫（用 Grok API）

## 4. 脚本目录结构

创建或查找脚本时，遵循以下分类：

```
scripts/
├── audit/       # 审计和检查脚本 (audit_*, check_*, inspect_*, verify_*)
├── tools/       # 工具脚本 (cleanup_*, compress_*, export_*, deduplicate_*)
├── enrich/      # 数据抓取和更新 (fetch_*, recrawl_*, update_*, trigger_*)
└── [根目录]     # 核心业务逻辑 (batch_add_*, search_*, manual_fetch.ts)
```

## 5. 犯错时
如果发现自己犯了重复的错误，立即记录到 `../GLOBAL_LESSONS.md` 错题本中。
