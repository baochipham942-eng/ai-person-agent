---
description: 丰富人物数据 - 从多个来源获取完整信息
---

# 丰富人物数据

为指定人物从多个数据源获取完整信息。

## 数据源列表 (共 10 个)

| 数据源 | 用途 | 触发条件 |
|--------|------|----------|
| **x** (Grok) | X/Twitter 推文 | 有 xHandle |
| **exa** | 网页文章 | 默认启用 |
| **youtube** | 视频 | 有 youtubeChannelId 或搜索 |
| **github** | 仓库 | 有 githubUsername |
| **openalex** | 论文 | 有 ORCID |
| **podcast** | 播客 | 名字搜索 |
| **career** | 职业历程 | 有 Wikidata QID |
| **perplexity** | AI 搜索增强 | 手动触发 |
| **baike** | 百度百科 | 有中文名 |
| **ai_knowledge** | AI 知识库 | 其他源失败时回退 |

## 工作流程

### 1. 检查当前数据状态
```bash
npx tsx scripts/audit/check_db.ts
```

### 2. 触发内容抓取

**方式 A: 通过 API 触发（推荐）**
```bash
curl -X POST https://people.llmxy.xyz/api/person/[person-id]/fetch \
  -H "Content-Type: application/json" \
  -d '{"dimensions": ["github", "youtube", "x", "exa"]}'
```

**方式 B: 通过脚本触发**
```bash
npx tsx scripts/enrich/trigger_content_fetch.ts [person-name]
```

**方式 C: 强制全量刷新**
```bash
npx tsx scripts/enrich/trigger_content_fetch.ts [person-name] --force
```

### 3. 丰富职业历程
```bash
npx tsx scripts/enrich/enrich_career_dates.ts
```

### 4. 更新完整度分数
```bash
npx tsx scripts/enrich/update_completeness.ts
```

### 5. 验证结果
访问人物页面确认数据已更新：
`https://people.llmxy.xyz/person/[person-id]`

## 身份验证

抓取时会自动进行身份验证，过滤无关内容：

### 验证信号
- ✅ **正面信号增加置信度**
  - Wikidata QID 匹配 (+0.4)
  - 机构名匹配 (+0.15)
  - 职业关键词 (+0.1)
  - AI 相关词 (+0.05)

- ❌ **负面信号降低置信度**
  - 娱乐内容 (-0.3)
  - 体育内容 (-0.3)
  - 游戏/Vlog (-0.3)

### 机构名标准化
自动识别机构别名：
- OpenAI ↔ open ai, openai inc
- Google ↔ google ai, deepmind, google brain
- Meta ↔ facebook, fair

## 输入参数

```typescript
interface FetchParams {
    personId: string;
    personName: string;
    englishName?: string;      // 英文名（API 搜索更准确）
    qid?: string;              // Wikidata QID
    orcid?: string;            // 学者 ORCID
    officialLinks?: {
        type: 'x' | 'github' | 'youtube' | 'website' | 'blog';
        url: string;
        handle?: string;       // 如 @elonmusk, karpathy
    }[];
    aliases?: string[];        // 别名/昵称
    forceRefresh?: boolean;    // 忽略增量逻辑
}
```

## 输出结果

```typescript
interface JobResult {
    personId: string;
    itemsCollected: number;    // 收集的条目数
    cardsGenerated: number;    // 生成的学习卡片数
    successCount: number;      // 成功的数据源数
    errorCount: number;        // 失败的数据源数
}
```

## 注意事项
- ⚠️ X 内容必须使用 Grok API（不能直接爬取）
- ⚠️ 抓取完成后需要重新部署才能在生产环境看到
- ⚠️ 默认遵循增量更新逻辑，24h/7天内不会重复抓取
