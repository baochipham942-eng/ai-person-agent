---
name: github-analysis
description: 分析人物的 GitHub 项目、代码贡献、开源作品
allowed-tools:
  - mcp__github__get_file_contents
  - mcp__github__search_code
  - mcp__github__search_repositories
  - mcp__github__list_commits
  - mcp__postgres__query
  - mcp__firecrawl__firecrawl_scrape
---

分析和管理人物的 GitHub 相关数据。

## 数据结构

GitHub 数据存储在 `RawPoolItem` 表：
- `source`: 'github'
- `url`: 仓库链接
- `content`: JSON 包含 stars, forks, description, readme 等

## 常用查询

### 查看人物的 GitHub 项目
```sql
SELECT url, title,
       (content->>'stars')::int as stars,
       (content->>'forks')::int as forks,
       content->>'language' as language
FROM "RawPoolItem"
WHERE "personId" = '{person_id}' AND source = 'github'
ORDER BY (content->>'stars')::int DESC;
```

### 统计 GitHub Stars
```sql
SELECT p.name, p."githubStars",
       COUNT(r.id) as repo_count
FROM "People" p
LEFT JOIN "RawPoolItem" r ON p.id = r."personId" AND r.source = 'github'
WHERE p.status = 'active' AND p."githubStars" > 0
GROUP BY p.id
ORDER BY p."githubStars" DESC
LIMIT 20;
```

### 找出缺少 GitHub 的人物
```sql
SELECT p.id, p.name, p."officialLinks"
FROM "People" p
WHERE p.status = 'active'
  AND p."officialLinks"::text LIKE '%github%'
  AND p."githubStars" = 0;
```

## 搜索 GitHub

### 搜索用户仓库
```
mcp__github__search_repositories(query="user:{username} stars:>100")
```

### 搜索代码
```
mcp__github__search_code(q="transformer attention repo:{owner}/{repo}")
```

### 获取仓库 README
```
mcp__github__get_file_contents(owner="{owner}", repo="{repo}", path="README.md")
```

## 从官方链接提取 GitHub

```sql
SELECT name,
       jsonb_path_query_array("officialLinks"::jsonb, '$[*] ? (@.platform == "github")') as github_links
FROM "People"
WHERE "officialLinks"::text LIKE '%github%';
```

## 相关脚本

- `scripts/enrich/enrich_github_deepwiki.ts` - 深度分析 GitHub 项目
- `scripts/fix/05_refetch_github_readme.ts` - 重新获取 README
- `scripts/enrich/trigger_content_fetch.ts` - 更新 GitHub 内容
