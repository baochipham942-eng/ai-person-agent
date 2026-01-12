---
name: relations-network
description: 人物关系网络 - 导师、同事、合作者分析
allowed-tools:
  - mcp__postgres__query
  - mcp__exa__web_search_exa
---

分析和管理人物之间的关系网络。

## 数据结构

人物关系存储在 `PersonRelation` 表：
- `personId`: 主人物
- `relatedPersonId`: 关联人物
- `relationType`: 关系类型
- `description`: 关系描述
- `startYear`, `endYear`: 时间范围

## 关系类型

- `advisor` - 导师/博导
- `student` - 学生
- `cofounder` - 联合创始人
- `colleague` - 同事
- `collaborator` - 合作者
- `manager` - 上级
- `report` - 下属

## 常用查询

### 查看人物的关系网络
```sql
SELECT
  pr."relationType",
  rp.name as related_person,
  pr.description,
  pr."startYear", pr."endYear"
FROM "PersonRelation" pr
JOIN "People" rp ON pr."relatedPersonId" = rp.id
WHERE pr."personId" = '{person_id}'
ORDER BY pr."startYear" DESC NULLS LAST;
```

### 找出某人的学生
```sql
SELECT s.name, pr.description, pr."startYear"
FROM "PersonRelation" pr
JOIN "People" s ON pr."personId" = s.id
WHERE pr."relatedPersonId" = '{advisor_id}'
  AND pr."relationType" = 'advisor';
```

### 找出缺少关系的重要人物
```sql
SELECT p.id, p.name, p."influenceScore"
FROM "People" p
LEFT JOIN "PersonRelation" pr ON p.id = pr."personId"
WHERE p.status = 'active'
  AND p."influenceScore" > 50
  AND pr.id IS NULL;
```

### 统计关系分布
```sql
SELECT "relationType", COUNT(*)
FROM "PersonRelation"
GROUP BY "relationType"
ORDER BY COUNT(*) DESC;
```

## 搜索关系信息

```
mcp__exa__web_search_exa(query="{person1} {person2} advisor OR student OR cofounder")
mcp__exa__web_search_exa(query="{name} PhD advisor Stanford")
```

## 相关脚本

- `scripts/enrich/enrich_relations_ai.ts` - AI 提取关系
- `scripts/enrich/enrich_relations_perplexity.ts` - Perplexity 补充
- `scripts/enrich/fetch_related_people.ts` - 获取相关人物
- `scripts/fix/09_fix_relation_direction.ts` - 修复关系方向
