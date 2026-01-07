---
description: 审计数据污染 - 使用 AI 检测错误关联的内容
---

# 审计数据污染

使用 DeepSeek AI 检测并清理与人物错误关联的 GitHub/YouTube 内容。

## 适用场景
- 发现某人的内容列表包含不相关的项目
- 批量检查所有人物的数据质量
- 清理因同名错误匹配的内容

## 工作流程

### 1. 运行审计（干跑模式）
```bash
cd /Users/linchen/Downloads/ai/ai-person-agent
npx tsx scripts/audit/audit_pollution_deepseek.ts
```

观察输出中的 `[DELETE CANDIDATE]` 标记，这些是高置信度的污染数据。

### 2. 确认污染项
- 置信度 > 0.8 的项目可以直接删除
- 置信度 0.5-0.8 的项目需要人工确认

### 3. 执行清理
```bash
npx tsx scripts/tools/cleanup_pollution.ts
```

### 4. 验证结果
重新运行审计脚本，确认污染项已清除。

## 核心判断逻辑
AI 会根据以下规则判断污染：
- 如果人物是 AI 研究员，游戏视频或随机 vlog 是污染
- 如果人物是 CEO，学生作业仓库是污染
- 不确定时，保守认为相关

## 依赖
- `DEEPSEEK_API_KEY` 环境变量
- 数据库连接
