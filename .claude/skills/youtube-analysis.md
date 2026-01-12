---
name: youtube-analysis
description: 分析人物的 YouTube 内容 - 视频、频道、播客
allowed-tools:
  - mcp__postgres__query
  - mcp__firecrawl__firecrawl_scrape
  - mcp__exa__web_search_exa
---

分析和管理人物的 YouTube 相关内容。

## 数据结构

YouTube 数据存储在 `RawPoolItem` 表：
- `source`: 'youtube' 或 'youtube_official'
- `url`: 视频链接
- `content`: JSON 包含标题、描述、时长等

## 常用查询

### 查看人物的 YouTube 内容
```sql
SELECT url, title,
       (content->>'duration')::int as duration_sec,
       (content->>'viewCount')::int as views,
       "fetchedAt"
FROM "RawPoolItem"
WHERE "personId" = '{person_id}'
  AND source LIKE 'youtube%'
ORDER BY "fetchedAt" DESC;
```

### 统计 YouTube 覆盖率
```sql
SELECT
  p.name,
  COUNT(CASE WHEN r.source = 'youtube_official' THEN 1 END) as official,
  COUNT(CASE WHEN r.source = 'youtube' THEN 1 END) as mentions
FROM "People" p
LEFT JOIN "RawPoolItem" r ON p.id = r."personId"
WHERE p.status = 'active'
GROUP BY p.id, p.name
HAVING COUNT(r.id) > 0
ORDER BY official DESC;
```

### 找出缺少 YouTube 的人物
```sql
SELECT p.id, p.name FROM "People" p
LEFT JOIN "RawPoolItem" r ON p.id = r."personId" AND r.source LIKE 'youtube%'
WHERE p.status = 'active' AND r.id IS NULL;
```

## 搜索人物的 YouTube 内容

```
mcp__exa__web_search_exa(query="{name} site:youtube.com interview OR talk OR lecture")
```

## 抓取视频信息

```
mcp__firecrawl__firecrawl_scrape(url="https://www.youtube.com/watch?v=...")
```

## 相关脚本

- `scripts/enrich/fetch_official_youtube.ts` - 获取官方频道视频
- `scripts/enrich/classify_videos.ts` - 视频分类
- `scripts/fix/01_delete_invalid_youtube.ts` - 清理无效链接
- `scripts/fix/02_fix_youtube_official.ts` - 修复官方标记
