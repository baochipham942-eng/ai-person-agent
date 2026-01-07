---
description: 添加新人物 - 完整的人物入库流程
---

# 添加新人物

完整的人物入库流程，从创建到数据丰富。

## 人物数据模型

### 必填字段
```typescript
{
    name: string;           // 人物名称（优先中文）
    description: string;    // 简介
    occupation: string[];   // 职业数组
}
```

### 推荐字段
```typescript
{
    englishName?: string;   // 英文名（API 搜索更准确）
    wikidataId?: string;    // Wikidata QID（身份验证）
    avatarUrl?: string;     // 头像 URL
    organization?: string[];// 关联机构
    aliases?: string[];     // 别名/昵称
    officialLinks?: {       // 官方渠道
        type: 'x' | 'github' | 'youtube' | 'website' | 'blog';
        url: string;
        handle?: string;
    }[];
    orcid?: string;         // 学者 ORCID（论文抓取）
}
```

## 工作流程

### 1. 搜索确认人物存在

先确认人物的 Wikidata QID 和基本信息：
```bash
# 搜索 Wikidata
curl "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=人物名&language=en&format=json"
```

### 2. 创建人物记录

**方式 A: 通过脚本添加**
编辑 `scripts/batch_add_people.ts` 添加人物信息：
```typescript
const newPeople = [
    {
        name: "人物名",
        englishName: "English Name",
        wikidataId: "Q123456",
        description: "简介",
        occupation: ["AI researcher", "CEO"],
        organization: ["OpenAI"],
        officialLinks: [
            { type: "github", url: "https://github.com/xxx", handle: "xxx" },
            { type: "x", url: "https://x.com/xxx", handle: "xxx" }
        ]
    }
];
```
然后运行：
```bash
npx tsx scripts/batch_add_people.ts
```

**方式 B: 直接使用 Prisma**
```bash
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.people.create({
    data: {
        name: '人物名',
        wikidataId: 'Q123456',
        description: '简介',
        occupation: ['职业'],
        organization: ['组织'],
        officialLinks: [
            { type: 'github', url: 'https://github.com/xxx' }
        ]
    }
}).then(console.log).finally(() => p.\$disconnect());
"
```

### 3. 获取头像
```bash
npx tsx scripts/enrich/recrawl_avatars.ts
```

### 4. 触发内容抓取
参考 `/enrich_person` 工作流：
```bash
npx tsx scripts/enrich/trigger_content_fetch.ts [person-name]
```

### 5. 生成 AI 评分
```bash
npx tsx scripts/enrich/update_person_scores.ts
```

### 6. 部署到生产
```bash
s deploy -y --use-remote
```

### 7. 验证
访问 `https://people.llmxy.xyz` 确认人物已显示

## 数据源触发条件

| 数据源 | 触发条件 | 备注 |
|--------|----------|------|
| GitHub | `officialLinks` 含 github | 需要 handle |
| X | `officialLinks` 含 x | 需要 handle，使用 Grok API |
| YouTube | `officialLinks` 含 youtube | 需要 channelId 或名字搜索 |
| OpenAlex | 有 `orcid` 字段 | 学术论文 |
| Career | 有 `wikidataId` | 职业历程 |
| Exa | 默认启用 | 网页文章搜索 |
| Podcast | 默认启用 | 名字搜索 |

## 身份验证

添加人物后，所有抓取都会经过身份验证：

### 验证依据（按强度排序）
1. **Wikidata QID** - 最可靠
2. **官方账号** - xHandle, githubUsername 确保官方
3. **机构名匹配** - 自动标准化别名
4. **职业关键词** - 过滤无关领域

### 预防同名污染
- 提供完整的 `occupation` 和 `organization`
- 填写 `wikidataId` 进行强身份绑定
- 使用 `aliases` 覆盖常用别名

## 完整示例

```typescript
// 添加 Andrej Karpathy
{
    name: "Andrej Karpathy",
    englishName: "Andrej Karpathy",
    wikidataId: "Q21680707",
    description: "AI researcher, former Director of AI at Tesla, founding member of OpenAI, creator of popular AI courses",
    occupation: ["AI researcher", "educator", "entrepreneur"],
    organization: ["Tesla", "OpenAI"],
    aliases: ["karpathy"],
    officialLinks: [
        { type: "github", url: "https://github.com/karpathy", handle: "karpathy" },
        { type: "x", url: "https://x.com/karpathy", handle: "karpathy" },
        { type: "youtube", url: "https://youtube.com/@AndrejKarpathy", handle: "@AndrejKarpathy" },
        { type: "website", url: "https://karpathy.ai" }
    ]
}
```
