---
description: 增量更新数据 - 只获取上次抓取后的新内容
---

# 增量更新数据

系统内置的增量更新机制，避免重复抓取相同内容。

## 数据源列表 (共 10 个)

| 数据源 | 适配器 | 刷新间隔 | 支持增量 | 用途 |
|--------|--------|----------|----------|------|
| **x** | grokAdapter | 24h | ✅ 去重 | X/Twitter 内容 |
| **exa** | exaAdapter | 24h | ✅ since | 网页文章搜索 |
| **youtube** | youtubeAdapter | 24h | ✅ since | 视频和频道 |
| **github** | githubAdapter | 24h | ✅ since | 仓库和项目 |
| **openalex** | openalexAdapter | 7天 | ✅ since | 学术论文 |
| **podcast** | podcastAdapter | 7天 | ❌ 全量 | 小宇宙/iTunes 播客 |
| **career** | careerAdapter | 7天 | ❌ 全量 | Wikidata 职业历程 |
| **perplexity** | perplexityAdapter | 按需 | ❌ 全量 | AI 搜索增强 |
| **baike** | baikeAdapter | 按需 | ❌ 全量 | 百度百科 |
| **ai_knowledge** | aiKnowledgeAdapter | 按需 | ❌ 全量 | AI 知识库回退 |

## 身份验证（防止抓错人）

每次抓取都会经过身份验证过滤，确保内容属于目标人物：

### 验证模块
- `lib/utils/identity.ts` - 主验证逻辑
- `lib/utils/identity-verifier.ts` - 增强验证器

### 验证策略（按优先级）
1. **Wikidata QID 匹配** - 最强信号
2. **英文名完全匹配** - 如 "Yann LeCun"
3. **英文名拆分匹配** - 姓 + 名都出现
4. **中文名匹配** - 支持姓名颠倒
5. **别名匹配** - aliases 字段
6. **机构名匹配** - 支持别名标准化 (OpenAI ↔ open ai)
7. **职业关键词匹配** - occupation 字段
8. **AI 关键词兜底** - 确保 AI 相关性

### 负面信号检测
自动过滤明显不相关的内容类型：
- 娱乐：演员、歌手、MV
- 体育：运动员、足球、篮球
- 历史：皇帝、古代、朝代
- 游戏：vlog、gameplay
- 喜剧：脱口秀、comedian
- 影视：电视剧、trailer

## 输入字段格式

### FetchParams (抓取参数)
```typescript
interface FetchParams {
    personId: string;
    personName: string;
    englishName?: string;
    qid?: string;           // Wikidata QID
    officialLinks?: {       // 官方渠道
        type: 'x' | 'github' | 'youtube' | 'website' | 'blog';
        url: string;
        handle?: string;
    }[];
    aliases?: string[];
    orcid?: string;         // 学者 ORCID
    forceRefresh?: boolean; // 强制全量刷新
}
```

### PersonContext (人物上下文)
```typescript
interface PersonContext {
    name: string;
    englishName?: string;
    aliases?: string[];
    organizations?: string[];
    occupations?: string[];
    qid?: string;
}
```

## 输出字段格式

### NormalizedItem (标准化条目)
```typescript
interface NormalizedItem {
    sourceType: SourceType;
    url: string;
    urlHash: string;       // MD5 去重
    contentHash: string;
    title: string;
    text: string;
    publishedAt?: Date;
    metadata: {
        isOfficial: boolean;  // 是否官方渠道
        author?: string;
        // 各数据源特有字段...
    };
}
```

## 使用方式

### 自动增量更新
系统自动处理，无需手动干预。触发抓取时：
1. 检查 `lastFetchedAt[source]` 时间戳
2. 如超过刷新间隔，发起抓取
3. 传入 `since` 参数只获取新内容
4. 身份验证过滤无关内容
5. 更新时间戳

### 强制全量刷新
```bash
# API
curl -X POST https://people.llmxy.xyz/api/person/[id]/fetch \
  -d '{"forceRefresh": true}'

# 脚本
npx tsx scripts/enrich/trigger_content_fetch.ts [name] --force
```

## 数据库字段

```prisma
model People {
  lastFetchedAt Json?  // { "github": "2024-01-01T00:00:00Z", ... }
}

model RawPoolItem {
  sourceType  String
  urlHash     String @unique
  contentHash String
  fetchedAt   DateTime
}
```
