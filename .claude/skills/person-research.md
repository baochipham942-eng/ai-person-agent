---
name: person-research
description: 研究 AI 领域人物信息，查找职业、成就、社交账号
allowed-tools:
  - mcp__exa__web_search_exa
  - mcp__firecrawl__firecrawl_scrape
  - mcp__firecrawl__firecrawl_search
  - mcp__duckduckgo__search
  - mcp__postgres__query
---

用于研究 AI 领域人物的综合信息。

## 研究流程

### 1. 先查数据库是否已存在
```sql
SELECT id, name, "nameCn", status, qid, "officialLinks"
FROM "People"
WHERE name ILIKE '%{name}%' OR aliases @> ARRAY['{name}'];
```

### 2. 搜索基本信息
```
mcp__exa__web_search_exa(query="{name} AI researcher biography")
mcp__duckduckgo__search(query="{name} machine learning")
```

### 3. 查找官方链接
- Twitter/X: `"{name}" site:twitter.com OR site:x.com`
- LinkedIn: `"{name}" site:linkedin.com`
- GitHub: `"{name}" site:github.com`
- Google Scholar: `"{name}" site:scholar.google.com`

### 4. 抓取详细信息
```
mcp__firecrawl__firecrawl_scrape(url="https://...")
```

## 关键数据点

收集以下信息：
- 姓名 (英文 + 中文)
- 当前职位和组织
- 职业经历 (公司、职位、时间)
- 教育背景
- 研究方向/话题
- 代表作品 (论文、项目、产品)
- 社交媒体链接
- Wikidata QID (如有)

## 常见人物类型

- `researcher` - 研究员、科学家
- `founder` - 创始人、CEO
- `engineer` - 工程师、技术负责人
- `professor` - 教授、学者
- `evangelist` - 布道师、KOL

## 相关脚本

- `scripts/enrich/add_priority_ai_people.ts` - 添加新人物
- `scripts/enrich/recrawl_robust.ts` - 补全职业历史
