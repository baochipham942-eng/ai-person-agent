---
name: db-query
description: 查询数据库中的人物、组织、角色等信息
allowed-tools:
  - mcp__postgres__query
---

使用 postgres MCP 查询 AI Person Agent 数据库。

## 常用表

- `People` - 人物主表 (id, name, nameCn, bio, qid, status, qualityScore)
- `PersonRole` - 职业经历 (personId, organizationId, role, startDate, endDate)
- `Organization` - 组织/公司 (id, name, type, qid)
- `Card` - 内容卡片 (personId, type, title, content)
- `RawPoolItem` - 原始内容 (personId, source, url, content)

## 示例查询

```sql
-- 统计人物数量
SELECT COUNT(*) FROM "People";

-- 按状态统计
SELECT status, COUNT(*) FROM "People" GROUP BY status;

-- 查找特定人物
SELECT id, name, "nameCn", status FROM "People" WHERE name ILIKE '%karpathy%';

-- 查看职业经历
SELECT p.name, o.name as org, pr.role, pr."startDate", pr."endDate"
FROM "PersonRole" pr
JOIN "People" p ON pr."personId" = p.id
JOIN "Organization" o ON pr."organizationId" = o.id
WHERE p.name ILIKE '%karpathy%';
```
