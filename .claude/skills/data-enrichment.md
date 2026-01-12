---
name: data-enrichment
description: 数据补全工作流 - 职业历史、学术指标、社交链接
allowed-tools:
  - mcp__postgres__query
  - mcp__exa__web_search_exa
  - mcp__firecrawl__firecrawl_scrape
---

指导如何补全人物数据的各个维度。

## 数据补全优先级

1. **基础信息** - 姓名、头像、简介
2. **职业历史** - PersonRole 记录
3. **官方链接** - Twitter, GitHub, LinkedIn
4. **学术指标** - 引用数、h-index
5. **话题标签** - topics, highlights

## 常用查询

### 找出缺失数据的人物
```sql
-- 缺少职业历史
SELECT p.id, p.name FROM "People" p
LEFT JOIN "PersonRole" pr ON p.id = pr."personId"
WHERE pr.id IS NULL AND p.status = 'active';

-- 缺少头像
SELECT id, name FROM "People"
WHERE "avatarUrl" IS NULL AND status = 'active';

-- 缺少话题标签
SELECT id, name FROM "People"
WHERE topics = '{}' AND status = 'active';

-- 缺少学术指标 (研究员类型)
SELECT id, name FROM "People"
WHERE "roleCategory" = 'researcher' AND "citationCount" = 0;
```

### 查看人物完整度
```sql
SELECT name, status, completeness,
       array_length(topics, 1) as topic_count,
       "citationCount", "hIndex"
FROM "People"
WHERE name ILIKE '%{name}%';
```

## 补全脚本

| 数据维度 | 脚本 |
|---------|------|
| 职业历史 | `scripts/enrich/recrawl_robust.ts` |
| 职业日期 | `scripts/enrich/enrich_career_dates.ts` |
| 学术指标 | `scripts/enrich/enrich_openalex.ts` |
| 话题标签 | `scripts/enrich/enrich_topics_highlights.ts` |
| 人物关系 | `scripts/enrich/enrich_relations_ai.ts` |
| 时间线 | `scripts/enrich/enrich_timeline.ts` |
| 头像 | `scripts/fix_missing_avatars.ts` |

## 运行方式

```bash
# 单个脚本
npx tsx scripts/enrich/recrawl_robust.ts

# 完整补全流程
npx tsx scripts/enrich/recrawl_robust.ts
npx tsx scripts/enrich/enrich_openalex.ts
npx tsx scripts/enrich/enrich_topics_highlights.ts
```
