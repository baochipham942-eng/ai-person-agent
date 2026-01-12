---
name: data-quality
description: 数据质量检查、问题诊断、修复指导
allowed-tools:
  - mcp__postgres__query
---

用于诊断和修复数据质量问题。

## 质量检查查询

### 整体统计
```sql
SELECT status, COUNT(*) FROM "People" GROUP BY status;
SELECT "roleCategory", COUNT(*) FROM "People" GROUP BY "roleCategory";
```

### 数据完整度分布
```sql
SELECT
  CASE
    WHEN completeness >= 80 THEN 'high (80+)'
    WHEN completeness >= 50 THEN 'medium (50-79)'
    ELSE 'low (<50)'
  END as level,
  COUNT(*)
FROM "People" WHERE status = 'active'
GROUP BY level;
```

### 问题数据检测

```sql
-- 重复的 Wikidata QID
SELECT qid, COUNT(*), array_agg(name)
FROM "People"
GROUP BY qid HAVING COUNT(*) > 1;

-- 无效的官方链接 (空数组)
SELECT id, name FROM "People"
WHERE "officialLinks"::text = '[]' AND status = 'active';

-- 职业历史缺少日期
SELECT p.name, pr.role, o.name as org
FROM "PersonRole" pr
JOIN "People" p ON pr."personId" = p.id
JOIN "Organization" o ON pr."organizationId" = o.id
WHERE pr."startDate" IS NULL;

-- 组织重复检测
SELECT name, COUNT(*), array_agg(id)
FROM "Organization"
GROUP BY name HAVING COUNT(*) > 1;
```

## 常见问题修复

### 1. 合并重复组织
参考: `scripts/fix/04_dedupe_organizations.ts`

### 2. 修复职业日期
参考: `scripts/fix/06_fix_internship_dates.ts`

### 3. 删除低质量数据
```sql
-- 删除无效的 YouTube 链接
DELETE FROM "RawPoolItem"
WHERE source = 'youtube' AND url NOT LIKE '%youtube.com%';
```

## 修复脚本目录

`scripts/fix/` 包含编号的修复脚本：
- `01_delete_invalid_youtube.ts`
- `02_fix_youtube_official.ts`
- `03_add_karpathy_openai.ts`
- `04_dedupe_organizations.ts`
- `05_refetch_github_readme.ts`
- `06_fix_internship_dates.ts`
- `07_enrich_vague_roles.ts`
- `08_delete_lowvalue_roles.ts`
- `09_fix_relation_direction.ts`
