# 数据质量问题扫描报告

**扫描时间**: 2026-01-11
**扫描范围**: 全库数据质量检查

---

## 数据概览

| 指标 | 数量 |
|------|------|
| 总人物数 | 144 |
| PersonRole记录 | 954 |
| 有startDate的Role | 680 (71.3%) |
| YouTube视频 | 820 |
| GitHub内容 | 440 |
| 组织数 | 708 |

---

## 问题列表

### P0 - 高优先级 (直接影响用户体验)

#### 1. Andrej Karpathy履历问题

**问题描述**:
- 缺少2016-2017年首次加入OpenAI的记录（Research Scientist/Founding Member）
- 现有职位描述不够精确：`Employee @ OpenAI Foundation` 应为更具体的职位

**当前数据**:
```
1. 2024至今: 创始人 @ Eureka Labs
2. 2023-02 - 2024-02: Employee @ OpenAI Foundation
3. 2017-06 - 2022-07: Employee @ Tesla, Inc.
```

**应该补充**:
```
- 2016-01 - 2017-06: Research Scientist / Founding Member @ OpenAI (缺失!)
- 2023-02 记录应更新职位为: Research Scientist 或 Returning Researcher
```

**修复方案**: 从Wikidata或手动补充2016年OpenAI记录

---

#### 2. YouTube视频URL异常

**问题描述**: 存在1个URL为`undefined`的视频记录

**受影响数据**:
```
Andrej Karpathy: "Andrej Karpathy" => https://www.youtube.com/watch?v=undefined
Published: 2013-09-07
```

**修复方案**: 删除此无效记录或查找正确的video ID

---

#### 3. YouTube视频isOfficial标记问题

**问题描述**:
- Karpathy的视频`Deep Dive into LLMs like ChatGPT`标记为`isOfficial=false`，但author为`Andrej Karpathy`
- 该视频明确来自其本人频道，应标记为`isOfficial=true`

**修复方案**: 重新运行视频分类脚本，或手动修正isOfficial标记

---

#### 4. YouTube视频分类精度问题

**问题描述**:
- 大量视频被标记为`analysis`(692个，占84%)，分类过于笼统
- 应区分：本人演讲(self_talk) vs 访谈(interview) vs 第三方分析(analysis)

**分类统计**:
```
analysis: 692 (84%)
self_talk: 66 (8%)
interview: 62 (8%)
```

**修复方案**: 优化classify_videos.ts的分类逻辑，提高self_talk识别率

---

### P1 - 中优先级 (数据完整性)

#### 5. PersonRole缺少startDate

**问题描述**: 50+条PersonRole记录缺少startDate

**示例**:
```
- 阿希什·瓦斯瓦尼: Student @ University of Southern California
- 阿希什·瓦斯瓦尼: Employee @ Google
- 布莱恩·卡坦扎罗: Student @ UC Berkeley
- 杰夫·迪恩: Student @ University of Washington
- 李莲: Student @ Peking University
```

**修复方案**: 运行`recrawl_robust.ts`补充Wikidata中的日期信息

---

#### 6. Organization重复记录

**问题描述**: 存在大量同名但不同ID的组织记录

**严重重复**:
```
- Google: 4个重复 (QIDs: null, ai-gen-google, Q95, baike-Google)
- UC Berkeley: 3个重复
- Facebook: 3个重复 (QIDs: ai-gen-facebook, null, Q355)
- OpenAI: 3个重复 (QIDs: null, ai-gen-openai, baike-OpenAI)
- Anthropic: 3个重复
- Twitter: 3个重复
```

**中度重复** (2个):
- Apple Inc., Cohere, Alphabet Inc., Google Brain, Coursera, Character.ai 等 20+ 组织

**修复方案**: 创建组织去重脚本，合并重复记录并更新PersonRole的外键

---

#### 7. GitHub内容为空或过短

**问题描述**: 35个GitHub记录内容为空或少于10字符

**示例**:
```
- Arthur Mensch: online_sinkhorn, deep-fmri
- Guillaume Lample: fastBPE
- Oriol Vinyals: rnnlm_python, iceberk_windows
- Percy Liang: edtrace, seq2seq-utils, argcomb
```

**修复方案**: 重新抓取这些仓库的README内容

---

### P2 - 低优先级 (数据增强)

#### 8. YouTube视频缺少本人频道内容

**问题描述**: 多数人物的YouTube数据只有被采访或被分析的视频，缺少本人频道原创内容

**统计**: 大多数人物的`official_count`为0

```
刘知远: 33个视频, 0个official
Yoshua Bengio: 25个视频, 0个official
李飞飞: 25个视频, 0个official
Sam Altman: 21个视频, 0个official
Geoffrey Hinton: 19个视频, 0个official
```

**修复方案**:
1. 查找并记录人物的official YouTube频道
2. 直接从官方频道抓取内容

---

#### 9. 职位描述不够精确

**问题描述**: 多条职位描述过于笼统（如"Employee"）

**示例**:
```
- Karpathy: "Employee @ OpenAI Foundation" 应为具体职位
- 多人: "Employee @ Google/Tesla" 等
```

**修复方案**:
1. 从Wikidata获取更精确的position held (P39)信息
2. 手动补充重要人物的职位描述

---

#### 10. 实习经历日期精度问题

**问题描述**: 实习记录的startDate和endDate相同，无法体现实际时长

**示例** (Karpathy):
```
- 实习生 @ Google DeepMind: 2015-01-01 - 2015-01-01
- 实习生 @ Google Research: 2013-01-01 - 2013-01-01
- 实习生 @ Google Brain: 2011-01-01 - 2011-01-01
```

**修复方案**: 对于endDate=startDate的实习记录，设置endDate为null或增加3-6个月

---

## 优先修复顺序

1. **立即修复** (P0):
   - [ ] 删除Karpathy的无效YouTube URL记录
   - [ ] 修正`Deep Dive into LLMs`视频的isOfficial标记
   - [ ] 补充Karpathy 2016年OpenAI记录

2. **本周内** (P1):
   - [ ] 创建Organization去重脚本
   - [ ] 重新抓取GitHub空内容

3. **迭代优化** (P2):
   - [ ] 优化YouTube分类算法
   - [ ] 补充官方YouTube频道数据
   - [ ] 修正实习日期精度

---

## 修复脚本建议

### 1. 删除无效YouTube记录
```typescript
// scripts/fix/delete_invalid_youtube.ts
await prisma.rawPoolItem.deleteMany({
  where: {
    sourceType: 'youtube',
    url: { contains: 'undefined' }
  }
});
```

### 2. 组织去重脚本框架
```typescript
// scripts/fix/dedupe_organizations.ts
// 1. 找出重复组织
// 2. 选择保留QID最规范的记录
// 3. 更新PersonRole外键
// 4. 删除重复记录
```

### 3. 修正isOfficial标记
```typescript
// scripts/fix/fix_youtube_official.ts
// 根据author字段与人物名匹配度重新标记isOfficial
```

---

## 下一步行动

此报告供下一个Agent使用，建议按优先级顺序创建修复脚本。
