# 人物详情页数据层优化需求

> 本文档总结了前端已完成的 UI 优化，以及需要数据层支持才能实现的功能。

---

## 一、已完成的前端优化（无需数据改动）

### 1. 标签点击跳转（解决数据孤岛）

| 组件 | 功能 | 跳转 URL |
|------|------|----------|
| `PersonHeader` | 话题标签可点击 | `/?view=topic&topic=xxx` |
| `PersonHeader` | 机构名称可点击（快速信息 + 履历） | `/?view=organization&organization=xxx` |
| `FeaturedWorks` | 话题卡片可点击 | `/?view=topic&topic=xxx` |
| `ResearcherDirectory` | 支持 URL 参数初始化筛选 | 读取 `view`, `topic`, `organization`, `role` |

### 2. UI 样式优化

| 组件 | 优化内容 |
|------|----------|
| `PersonHeader` | 添加渐变背景 `linear-gradient(135deg, rgba(249,115,22,0.06), ...)` |
| `RelatedPeople` | 改为网格布局（2-5列自适应），居中卡片，显示关系标签 |

---

## 二、需要数据层支持的功能

### 1. 视频标签展示与跳转

**需求**：视频卡片下方显示话题标签（如 "Deep Learning", "AGI"），点击跳转到首页筛选。

**数据改动**：
```typescript
// RawPoolItem.metadata 增加 tags 字段
interface VideoMetadata {
  videoId?: string;
  thumbnailUrl?: string;
  videoCategory?: string;
  viewCount?: number;
  duration?: string;
  tags?: string[];  // 新增：话题标签数组
}
```

**数据来源建议**：
- 从视频标题/描述中提取关键词
- 使用 LLM 分类到预定义话题列表
- 在 `scripts/enrich/` 中添加视频标签补全脚本

**前端已预留**：`VideoSection.tsx` 中可直接渲染 `metadata.tags`

---

### 2. 话题卡片金句引用

**需求**：FeaturedWorks 话题卡片内嵌金句引用块。

**数据改动**：
```typescript
// 方案 A：People 表增加话题详情字段
interface TopicDetail {
  topic: string;
  rank: number;
  description?: string;
  paperCount?: number;
  citations?: number;
  quote?: {  // 新增：关联金句
    text: string;
    source: string;
    url?: string;
  };
}

// People.topicDetails: TopicDetail[]
```

**数据来源建议**：
- 从现有 `quotes` 字段中匹配话题关键词
- 在 enrichment 流程中关联

---

### 3. 内容人物内链（whyImportant）

**需求**：`whyImportant` 字段中提到的人名可点击跳转到对应人物详情页。

**数据改动**：
```typescript
// 方案 A：使用标记语法
// whyImportant: "作为 [[Geoffrey Hinton|person_id_xxx]] 的学生..."

// 方案 B：增加独立字段
interface People {
  whyImportant: string;
  mentionedPeople?: {  // 新增
    name: string;
    personId: string;
    position: [number, number];  // 在文本中的位置
  }[];
}
```

**数据来源建议**：
- 使用 LLM 识别 `whyImportant` 中的人名
- 匹配数据库中已有人物
- 在 enrichment 流程中处理

---

### 4. 履历中导师链接

**需求**：履历显示 "师从 Geoffrey Hinton" 并可点击跳转。

**数据改动**：
```prisma
// prisma/schema.prisma
model PersonRole {
  id              String   @id @default(cuid())
  role            String
  roleZh          String?
  startDate       DateTime?
  endDate         DateTime?
  organizationId  String
  organization    Organization @relation(...)

  // 新增
  advisorId       String?
  advisor         People?  @relation("Advisor", fields: [advisorId], references: [id])
}
```

**数据来源建议**：
- 从 Wikidata 获取 "doctoral advisor" (P184) 关系
- 从教育经历描述中提取
- 关联已有的 `PersonRelation` 表

---

## 三、实现优先级建议

| 优先级 | 功能 | 复杂度 | 影响 |
|--------|------|--------|------|
| P0 | 视频标签 | 中 | 提升视频模块价值 |
| P1 | 内容人物内链 | 高 | 加强人物关联网络 |
| P2 | 话题卡片金句 | 低 | 丰富话题展示 |
| P3 | 履历导师链接 | 中 | 完善师承关系 |

---

## 四、相关文件

### 前端组件
- `components/person/sections/PersonHeader.tsx` - 人物头部
- `components/person/sections/FeaturedWorks.tsx` - 代表作品
- `components/person/sections/VideoSection.tsx` - 视频区域
- `components/person/sections/RelatedPeople.tsx` - 关联人物
- `components/person/sections/CoreContribution.tsx` - 为什么值得关注
- `components/home/ResearcherDirectory.tsx` - 首页人物列表

### 数据脚本
- `scripts/enrich/recrawl_robust.ts` - 人物数据补全
- `scripts/enrich/trigger_content_fetch.ts` - 内容抓取

### 数据模型
- `prisma/schema.prisma` - 数据库模型

---

## 五、设计稿参考

设计稿路径：`/Users/linchen/Downloads/researcher-detail-ilya-v2 (1).html`

关键设计元素：
1. `.video-tag` - 视频标签样式
2. `.topic-quote-mini` - 话题金句块
3. `.person-link` - 内容人物链接样式
4. `.related-card` - 关联人物网格卡片
