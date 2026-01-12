# 人物详情页优化 - 下一步任务

## 已完成的修改

### 1. 代表作品（FeaturedWorks）
- [x] 整合开源项目到产品/项目 tab，会动态加载 GitHub 仓库
- [x] 核心论文默认展示 2 篇，其他收起，点击"查看更多"展开
- [x] 话题贡献卡片重新设计，横向滚动，包含排名徽章、描述、统计、金句（带链接）、"进入学习路径"入口
- [x] 传递 personId 用于动态加载开源项目

### 2. ContentTabs 优化
- [x] 移除了 X/Twitter、YouTube、论文、文章、GitHub tab（重复或质量不高）
- [x] 只保留学习卡片和播客 tab
- [x] 学习卡片默认展示 4 个（约2行），其他收起

### 3. YouTube 视频
- [x] 已有话题标签展示（通过 metadata.tags）

### 4. DeepWiki 集成
- [x] 创建了 `scripts/enrich/enrich_github_deepwiki.ts` 脚本（待实际测试）

### 5. 数据库 Schema 更新
- [x] 新增 Course 模型用于课程数据

---

## 下一步任务

### 高优先级

#### 1. 运行数据库迁移
```bash
npx prisma db push
```
Schema 新增了 Course 模型，需要同步到数据库。

#### 2. 创建课程抓取脚本
参考设计稿，人物页需要展示相关课程。需要创建脚本从以下来源抓取课程：
- Coursera
- YouTube 官方频道的课程播放列表
- Stanford/MIT 公开课
- fast.ai

文件位置建议：`scripts/enrich/enrich_courses.ts`

数据结构参考 `prisma/schema.prisma` 中的 Course 模型。

#### 3. 创建课程展示组件
在人物详情页添加课程展示区块：
- 文件：`components/person/sections/CourseSection.tsx`
- 功能：展示人物相关的公开课程，按平台分类
- 样式：参考 VideoSection 的卡片样式

#### 4. DeepWiki 集成实际测试
- 测试 `scripts/enrich/enrich_github_deepwiki.ts` 脚本
- 确认 DeepWiki API 或网页抓取是否可用
- 如果 DeepWiki 不可用，考虑使用 DeepSeek 生成仓库摘要

### 中优先级

#### 5. 话题详情数据丰富
当前 topicDetails 数据可能不够丰富，需要运行：
```bash
npx tsx scripts/enrich/enrich_topic_quotes.ts
```
确保每个话题都有金句和描述。

#### 6. YouTube 视频话题标签
视频的 metadata.tags 字段需要数据，运行：
```bash
npx tsx scripts/enrich/classify_videos.ts
```

#### 7. 产品数据补充
当前 products 字段数据较少，可能需要：
- 手动补充重要人物的代表产品
- 或创建脚本从 Perplexity 抓取

### 低优先级

#### 8. 学习卡片质量提升
当前卡片数据可能需要质量审核和补充。

#### 9. 播客内容抓取
ContentTabs 保留了播客 tab，需要确保有数据：
```bash
npx tsx scripts/enrich/refresh_podcast_content.ts
```

---

## 文件变更清单

已修改的文件：
- `components/person/PersonPageClient.tsx` - 传递 personId
- `components/person/sections/FeaturedWorks.tsx` - 整合开源项目、改进论文和话题展示
- `components/person/sections/ContentTabs.tsx` - 精简 tab、学习卡片折叠
- `prisma/schema.prisma` - 新增 Course 模型

新增的文件：
- `scripts/enrich/enrich_github_deepwiki.ts` - DeepWiki 集成脚本
- `docs/NEXT_STEPS.md` - 本文档

---

## 参考设计稿

设计稿位置：`/Users/linchen/Downloads/researcher-detail-ilya-v2 (1).html`

设计稿中尚未实现的功能：
1. 课程展示区块
2. 更丰富的产品数据（如 GPT 系列、AlexNet、SSI 等）
3. 履历时间线在 Hero 区域的可折叠展示（已有，但样式可进一步优化）
