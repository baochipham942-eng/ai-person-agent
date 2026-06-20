# 实体页策展层（entity-presentations）

公司页（`/org/[slug]`）和知识主题页（`/threads/[slug]`）分两层：

| 层 | 内容 | 来源 |
|----|------|------|
| **结构数据** | 人物、履历、动态、作品、公司证据、主题来源/边/状态 | DB（`People` / `CompanySource` / `KnowledgeThread*` …），自动驱动 |
| **策展叙事**（本目录） | 产品线文案、学习入口、循环讲解、判断点、角色说明、旗舰词 | 人工 / LLM 策展的 seed |

组件（`EntityPageBlocks.tsx` / `ThreadPageBlocks.tsx`）是**纯渲染**，不再内嵌任何公司/主题专属文案。
**新增一家公司或一个主题 = 在对应 registry 加一条 seed，无需改组件。** 没有 seed 时页面用 DB 数据退化出最小可用版本（公司）或通用版本（主题）。

---

## 新增一家公司

编辑 `company-presentation.ts`，在 `COMPANY_PRESENTATIONS` 里加一条（key = 公司名小写、空格转连字符）：

```ts
'openai': {
  heroDescription: '一句话定位，进 hero。',
  headline: '「布局」区块主标题（产品线一句话概括）。',
  strategy: '战略叙事段落：这家公司的 AI 布局怎么分线、各线干什么。',
  products: [
    { name: '产品名', summary: '这条产品线是什么、为什么关键。', url: 'https://...' },
    // 3–4 条
  ],
  bets: [],                         // 可留空（当前不渲染）
  learningResources: [             // 整页价值密度最高的区块，认真挑官方好文
    { title: '文章标题', label: '小标签', summary: '为什么值得读。', url: 'https://...' },
    // 第 1 条是 featured「先读这篇」，其余进网格
  ],
  officialLinks: [                  // 官方站点快速入口（chip 行）
    { title: '入口名', summary: '简述。', url: 'https://...' },
  ],
  flagshipKeywords: ['旗舰产品名小写'],  // 关键人物排序加权：贡献旗舰产品的人会前置
},
```

- hero stats（关键人物 / 核心产品 / 官方好文 / 来源材料）自动从数据 + seed 推导，不用手填。
- 不写 seed 也能开页：走 DB intelligence，只是没有学习入口、bets、旗舰排序。

## 新增一个知识主题

两步：

1. **来源数据**：在 `lib/knowledge-thread-fixtures/`（或 DB `KnowledgeThread*`）补这个主题的 sources / edges / status。
2. **策展叙事**：编辑 `thread-presentation.ts`，在 `THREAD_PRESENTATIONS` 加一条（key = thread slug）：

```ts
'context-engineering': {
  title: 'Context Engineering',
  subtitle: '上下文工程',
  valueProp: '一句话定义（进 hero，带橙色强调条）。',
  problem: '这个主题到底在讲什么、要分清哪两个容易混的概念。',
  whyRead: '这页用哪些真实来源把概念钉住、帮读者分清真伪。',
  roleInsights: {                   // 按角色给「关键材料」每组配一行相关性说明
    signal: { title: '一线信号', body: '…', takeaway: '…' },
    official_definition: { title: '官方原语', body: '…', takeaway: '…' },
    // transcript_context / paper_foundation / implementation_signal 可选
  },
  loopSteps: [                       // 「核心概念」居中主角：4–5 步，编号圆徽渲染
    { title: '步骤名', body: '这一步干什么。' },
  ],
  readerCanJudge: ['读者能用它判断的 2–3 件事。'],
},
```

- 不写 seed 也能开页：`getThreadPresentation` 会从 thread 的 summary/whyNow 退化出通用版本（但 loopSteps/判断点是泛化的，质量不如策展）。

---

## ⚠️ 内容纪律（被产品负责人抓过的坑）

- **概念要 grounded 在真实来源，不能套壳。** 写主题前先 web 调研核概念真伪（Loop Engineering 一度被写成通用 ReAct 内层循环，完全跑偏）。
- 关键材料里每条来源要对得上它所在的角色组；论文/谱系类来源要在 caption 里说清"为什么和这个主题相关"。
- 新增来源的 `status` 诚实标注（`usable` / `needs_capture`），不冒充 `verified`；URL 没把握的在 `evidenceNote` 标"发布前复核"。
