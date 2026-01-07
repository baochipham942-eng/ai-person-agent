---
description: 架构决策记录 - Agent/Inngest/MCP/Skill 选型分析
---

# 架构决策记录

记录 ai-person-agent 项目的技术选型决策，供后续参考。

## 当前架构

```
用户 → 指挥 Agent (Claude) → 脚本/API → Inngest Job → lib/datasources/*.ts → 数据库
            │                                                │
            └─── .agent/workflows/ 提供操作指南 ────────────────┘
```

### 各层职责

| 层级 | 工具 | 职责 |
|------|------|------|
| **指挥层** | Claude Agent | 理解意图、规划任务、读取 workflow、调用工具 |
| **异步层** | Inngest | 长时间任务、并行抓取、错误重试、定时调度 |
| **数据层** | lib/datasources/ | 10 个数据源适配器，统一接口 |
| **存储层** | Neon PostgreSQL | 持久化存储，Prisma ORM |

---

## 为什么不用 MCP？

### MCP (Model Context Protocol) 是什么

Anthropic 推出的标准协议，让 Agent 能调用外部工具/服务。

### 当前项目不需要 MCP 的原因

| 维度 | 说明 |
|------|------|
| **Agent 数量** | 只有 1 个 (Claude)，无需多 Agent 共享能力 |
| **工具已足够** | IDE 内置工具满足需求（文件、终端、浏览器） |
| **复杂度增加** | 需部署 MCP Server，增加维护成本 |
| **收益不大** | 通过脚本调用已能满足需求 |

### 什么时候考虑 MCP

- ✅ 多个 Agent 需要共享同样的工具能力
- ✅ 把 Agent 能力对外提供给用户/其他应用
- ✅ 需要 10+ 种外部服务的复杂工具链
- ✅ 需要运行时动态添加/移除工具

---

## 为什么不用 Claude Skill 实现数据源？

### Claude Skill 是什么

Anthropic 的工具/能力扩展机制，让 Agent 直接调用外部函数。

### 不适合数据源抓取的原因

| 问题 | 说明 |
|------|------|
| **阻塞对话** | 数据源抓取耗时 30s-3min，Agent 会阻塞等待 |
| **无并行能力** | Skill 调用串行，无法 Promise.all |
| **无重试机制** | 失败需手动处理，Inngest 自动重试 |
| **必须在线** | Agent 会话必须保持，Inngest 后台运行 |

### Skill 适合的场景

- ✅ 快速查询："这个人的 GitHub Star 数？"
- ✅ 单点操作："把这条推文添加到内容池"
- ✅ 实时验证："检查 Wikidata QID 是否正确"

关键区别：**秒级返回** vs **分钟级抓取**

---

## Inngest 是正确选择

### 数据源抓取的特点

| 特点 | Inngest 支持 |
|------|-------------|
| 长时间运行 (30s-3min) | ✅ 后台异步 |
| 多数据源并行 | ✅ Promise.all |
| 错误自动重试 | ✅ 内置重试机制 |
| 增量更新 | ✅ lastFetchedAt 逻辑 |
| 不阻塞用户 | ✅ 触发后立即返回 |

### 当前 Inngest Job

```typescript
// lib/inngest/functions.ts
buildPersonJob: 构建人物页面，并行获取 7 个数据源
```

---

## 决策总结

| 问题 | 决策 | 原因 |
|------|------|------|
| 引入 MCP？ | ❌ 不需要 | 单 Agent、工具足够、增加复杂度 |
| 用 Skill 实现数据源？ | ❌ 不适合 | 长时间任务不适合同步调用 |
| 保持 Inngest？ | ✅ 正确选择 | 异步、并行、重试、不阻塞 |
| 工作流文档？ | ✅ 继续完善 | 指导 Agent 操作的最佳方式 |

---

## 未来可能的演进

| 阶段 | 变化 | 可能需要 |
|------|------|----------|
| 产品化 | Agent 能力对外提供 | MCP Server |
| 多 Agent | 多个 Agent 协作 | MCP 共享工具 |
| 快速查询 | Agent 直接查 DB | Skill 或 MCP |
| 实时操作 | Agent 直接调 API | Skill 或 MCP |

**当前阶段：专注 workflow + Inngest，不引入额外复杂度。**
