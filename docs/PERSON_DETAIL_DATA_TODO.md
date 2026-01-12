# 人物详情页数据层功能 - 待执行清单

## 实现状态总览

| 功能 | 代码 | 数据库 | 数据补全 |
|------|------|--------|----------|
| 视频标签 | ✅ | ✅ | ⏳ 待执行 |
| 话题卡片金句 | ✅ | ✅ | ⏳ 待执行 |
| 内容人物内链 | ✅ | - | ⏳ 待执行 |
| 履历导师链接 | ✅ | ✅ | ⏳ 待执行 |

---

## 一、已完成的工作

### 1. 数据库迁移 ✅

已通过 raw SQL 添加以下字段：

```sql
-- People 表新增
ALTER TABLE "People" ADD COLUMN IF NOT EXISTS "topicDetails" JSONB;

-- PersonRole 表新增
ALTER TABLE "PersonRole" ADD COLUMN IF NOT EXISTS "advisorId" TEXT;
CREATE INDEX IF NOT EXISTS "PersonRole_advisorId_idx" ON "PersonRole"("advisorId");
ALTER TABLE "PersonRole" ADD CONSTRAINT "PersonRole_advisorId_fkey"
  FOREIGN KEY ("advisorId") REFERENCES "People"("id") ON DELETE SET NULL;
```

### 2. 新建文件 ✅

- `components/common/LinkedText.tsx` - 人物内链渲染组件
- `scripts/enrich/enrich_mentioned_people.ts` - 人物内链标记脚本
- `scripts/enrich/enrich_topic_quotes.ts` - 话题金句关联脚本

### 3. 修改文件 ✅

- `prisma/schema.prisma` - 添加 topicDetails、advisorId 字段
- `scripts/enrich/enrich_topics_highlights.ts` - 导出 AI_TOPICS
- `scripts/enrich/classify_videos.ts` - 添加 tags 提取逻辑
- `scripts/enrich/fetch_related_people.ts` - 添加 --link-advisors 功能
- `components/person/sections/VideoSection.tsx` - 渲染视频标签
- `components/person/sections/FeaturedWorks.tsx` - 渲染话题金句
- `components/person/sections/CoreContribution.tsx` - 使用 LinkedText
- `components/person/sections/TimelineSection.tsx` - 渲染导师链接
- `components/person/PersonPageClient.tsx` - 添加接口和数据传递
- `app/person/[id]/page.tsx` - 扩展查询包含 advisor

---

## 二、待执行的数据补全脚本

### 1. 视频标签补全 (819 个视频)

为 YouTube 视频添加 AI 话题标签，标签来自 `AI_TOPICS` 列表。

```bash
npx tsx scripts/enrich/classify_videos.ts --use-ai
```

**选项说明**：
- `--use-ai` - 使用 DeepSeek AI 提取标签
- `--force-tags` - 强制更新已有标签的视频
- `--limit=N` - 限制处理数量（测试用）

**预期效果**：视频卡片下方显示话题标签，点击跳转首页筛选

---

### 2. 人物内链标记 (143 个有 whyImportant 的人物)

识别 whyImportant、description、quotes.text 中提到的人名，替换为 `[[名称|personId]]` 格式。

```bash
npx tsx scripts/enrich/enrich_mentioned_people.ts
```

**选项说明**：
- `--dry-run` - 模拟运行，不实际更新数据
- `--limit=N` - 限制处理数量

**预期效果**：文本中的人名可点击跳转到对应人物页面

**已验证**：Yoshua Bengio 的 whyImportant 已成功标记 Geoffrey Hinton 链接

---

### 3. 导师关联 (954 条履历记录)

从 Wikidata 获取 P185 (doctoral advisor) 关系，关联到教育类型的 PersonRole 记录。

```bash
npx tsx scripts/enrich/fetch_related_people.ts --link-advisors
```

**选项说明**：
- `--link-advisors` - 启用导师关联功能
- `--limit=N` - 限制处理数量

**预期效果**：履历中显示"师从 XXX"并可点击跳转

**注意**：需要稳定网络连接，之前因网络波动中断

---

### 4. 话题金句关联 (需先有 quotes 数据)

将 quotes 中的语录关联到对应话题，保存到 topicDetails 字段。

```bash
npx tsx scripts/enrich/enrich_topic_quotes.ts --use-ai
```

**选项说明**：
- `--use-ai` - 使用 AI 语义匹配（否则使用关键词匹配）
- `--limit=N` - 限制处理数量

**前置条件**：当前数据库 quotes 字段为空（0 个人物有语录），需要先补充语录数据

**预期效果**：话题卡片内嵌金句引用块

---

## 三、数据依赖说明

```
视频标签 ───────────────────────────> 独立，可直接执行
人物内链 ───────────────────────────> 独立，可直接执行
导师关联 ───────────────────────────> 依赖 Wikidata API，需稳定网络
话题金句 ──> 需要 quotes 数据 ──────> 需先运行语录补全脚本
```

---

## 四、执行建议

### 推荐执行顺序

1. **视频标签** - 数据量大但独立，可后台运行
2. **人物内链** - 已验证可用，直接执行
3. **导师关联** - 选择网络稳定时段执行
4. **话题金句** - 等有 quotes 数据后执行

### 网络不稳定时的备选方案

如果 Neon 数据库连接不稳定，可以：
1. 添加 `--limit=10` 分批执行
2. 等待几秒后重试
3. 检查 Neon 控制台确认实例状态

---

## 五、验证方法

### 检查数据补全进度

```bash
npx tsx -e "
import { prisma } from './lib/db/prisma';

async function check() {
  // 视频标签
  const videosWithTags = await prisma.rawPoolItem.count({
    where: { sourceType: 'youtube', metadata: { path: ['tags'], not: { equals: null } } }
  });
  console.log('有标签的视频:', videosWithTags, '/ 819');

  // 人物内链
  const withMarks = await prisma.people.count({
    where: { whyImportant: { contains: '[[' } }
  });
  console.log('已标记内链:', withMarks, '/ 143');

  // 导师关联
  const rolesWithAdvisor = await prisma.personRole.count({
    where: { advisorId: { not: null } }
  });
  console.log('已关联导师:', rolesWithAdvisor, '/ 954');

  // 话题金句
  const withTopicDetails = await prisma.people.count({
    where: { topicDetails: { not: { equals: null } } }
  });
  console.log('有话题详情:', withTopicDetails);

  await prisma.\$disconnect();
}
check();
"
```

### 前端验证

1. 访问人物详情页，检查：
   - whyImportant 中的人名是否可点击
   - 履历是否显示导师链接
   - 话题卡片是否有金句
   - 视频是否有话题标签

---

## 六、相关文件索引

### 脚本文件
- `scripts/enrich/classify_videos.ts` - 视频分类和标签
- `scripts/enrich/enrich_mentioned_people.ts` - 人物内链标记
- `scripts/enrich/fetch_related_people.ts` - 导师关联
- `scripts/enrich/enrich_topic_quotes.ts` - 话题金句关联

### 组件文件
- `components/common/LinkedText.tsx` - 内链渲染
- `components/person/sections/VideoSection.tsx` - 视频标签渲染
- `components/person/sections/FeaturedWorks.tsx` - 话题金句渲染
- `components/person/sections/TimelineSection.tsx` - 导师链接渲染
- `components/person/sections/CoreContribution.tsx` - 内链使用

### 数据库
- `prisma/schema.prisma` - 字段定义
