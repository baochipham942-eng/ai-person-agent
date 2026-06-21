# 实体页模板规范（Entity Pages）

> 适用范围：公司页 `/org/[slug]`、知识主题页 `/threads/[slug]`、人物页 `/person/[id]`、作品页 `/work/[slug]`、课程聚合 `/courses`。
> 本文是**模板原则 + 两层契约**，防止页面退回「按数据 schema 平铺、内部黑话当主内容」。
> 最近大改：`b5f169d8`（人物页 IA 重排）、`08b7e5d8`（公司页真实产品线）、`4d8fbc1e`（公司目录页）、`e1492a37`（作品实体）、`50f4f07b`（课程实体）。

---

## 1. 模板原则（下次别退回老样子）

病根：早期版本**按数据团队工作流（采集→证据→就绪度）平铺**，把内部「证据可信度」心智当主内容，把人和观点埋底。一个「人物库」，公司页却把人放到第 6-8 屏。

1. **按读者问题排，不按数据 schema 排**：做什么 → 该读什么 → 谁在做 → 凭什么信。
2. **学习入口 = 价值密度最高，是主角**：橙色容器 + 「最值得读」眼标 + 加重标题 + featured 整幅 banner，不收紧成列表/埋底。
3. **证据/就绪度/状态是内部心智，降到底部安静「参考与来源」层（`ReferenceTier`）**，不进 hero、不当主内容。空时 `return null`，全空不渲染「参考与来源」头。
4. **人前置**：「关键人物」紧跟学习区；同一个人不许跨 section 重复（去重 `excludeIds`，按精确 cap 排除，别用全量数组否则排序靠后的人两边消失）。
5. **UI 不留英文行话**：Alumni→「已离职/前成员」。stat 不放无意义内部计数（「相关主题 1」像坏掉）。文案默认走 i18n。
6. **公司页人物排序 = 公司相关性，不是全局 influenceScore**：现任 + 创始团队 + 旗舰产品贡献者优先（否则学术影响力盖过 Boris 这种 Claude Code 创建者）。`rankPeopleForCompany` in `app/org/[slug]/page.tsx`。
7. **产品线要诚实**：research/safety 是底座不是「产品线」，别混进核心产品线。
8. **内容要对得上真实概念，不能套壳**：概念本身必须 grounded 在真实来源，web 核实后再写文案（详见 KNOWLEDGE_THREADS.md §7 反假源纪律）。

---

## 2. 两层契约：结构数据 vs 策展叙事

**组件是纯渲染。** 所有页面都拆成两层，加内容 = 改数据/seed，不碰组件。

| 层 | 来源 | 例 |
|---|---|---|
| **结构数据** | DB / fixture | 人物、来源、证据、履历、博客（CompanySource/PersonRole/KnowledgeThread*/CompanyThreadLink） |
| **策展叙事** | seed（`lib/entity-presentations/`） | 产品线文案、学习入口、循环讲解、判断点、旗舰词——硬编码的策展内容抽到 seed 层 |

`lib/entity-presentations/`：
- `company-presentation.ts`：`CompanyPresentation` 类型 + `COMPANY_PRESENTATIONS` 注册表（24 家）+ `resolveCompanyPresentation(name, intelligence)`（有 seed 用 seed，无 seed 从 DB intelligence 退化）。可选 `logoUrl`/`homepageUrl`（page 用 `intelligence.x ?? presentation.x` 回退）。
- `thread-presentation.ts`：`ThreadPresentation` 类型 + `THREAD_PRESENTATIONS` 注册表 + `getThreadPresentationSeed(slug)`。
- `README.md`：copy-fill-register 工作流 + 内容纪律。

**复制做新公司/主题 = 往 registry 加一条 seed**（threads 另需补候选包 fixture），不碰组件。

---

## 3. 公司页（`/org/[slug]`）专属契约

公司页 = **结构数据（DB: CompanySource/PersonRole）+ 策展叙事（seed: COMPANY_PRESENTATIONS）** 两层。

### 三条人物展示路径（查公司人必须三条都查）
1. **TopPeople**：`fetchPersonDirectory(limit:48, sortBy:influenceScore)` 取池，再按公司相关性重排 top9。池 limit 必须够大（曾 12 太小，中等影响力现任进不了池）。
2. **花名册**：PersonRole 现任/离职（current cap 64，alumni cap 24）。
3. **others 兜底**：org 归属可能**只在 `People.organization[]` 数组、没有 PersonRole** → directory `where.OR` 必须加 `{organization:{hasSome:aliases}}` 分支，否则这些人彻底消失。array-only 无履历的人转 OrganizationRolePerson 进「相关成员（履历待补全）」组。

### 证据 vs 学习区（两类，别混）
- **5 类公司证据 role**（证据区）：`official_strategy / product_release / financial / partnership / hiring`。
- **官方博客**（学习区）：`CompanySource role=blog` 或 `sourceKind official_blog_article/_rss_article` → `officialArticles` 字段（take 150）→ CompanyLearningSection「更多官方文章」。**blog 不属于 5 类证据 role**，早期被 `isCompanyEvidenceRole()` 过滤丢弃过（OpenAI 57 条博客全没进页面）。

### 在职/离职判定（高精度，防误标）
- active role（无 endDate 且 currentTitle 非「前任」/「@他司」）判 `status='current'`。
- **`isStaleAffiliationRole`**：仅当「泛化 Member 履历」且「currentTitle 明确写 @ 别公司」才降到「前成员」。真实职称（CEO/教授/研究员）即使并任他处也保留现任。
- **`currentTitle` 的「@公司」不能单独当离职信号** demote——会误伤①并任学者（李飞飞 Stanford+World Labs）②母子公司（Pichai @Alphabet=Google）③currentTitle 写错的人。必须叠加「role 是泛化 Member」高精度闸。
- 公司页「某人不该在这」先查 `DIRECTORY_ORGANIZATION_ALIASES` 有没有跨公司污染（如 MIT alias 混进 TML 中文名），再怀疑个体数据。

---

## 4. 实体清单与各自页面

| 实体 | 路由 | 数据 | 策展 seed |
|---|---|---|---|
| 人物 | `/person/[id]` | People + PersonRole | — |
| 公司 | `/org/[slug]` | CompanySource/PersonRole/CompanyThreadLink | COMPANY_PRESENTATIONS（24 家） |
| 知识主题 | `/threads/[slug]` | KnowledgeThread*（详情）/ 候选 JSON（列表） | THREAD_PRESENTATIONS |
| 作品/成果 | `/work/[slug]` | Product + ProductContributor | lib/work-taxonomy.ts |
| 课程 | `/courses` | Course | —（外链不建详情页） |

实体关系与分类法详见 `DATA_MODEL.md`。

---

## 5. 反例（这些都被产品负责人抓过）

- ❌ 公司页把人放到第 6-8 屏 / 证据可信度当主内容
- ❌ 知识主题页按数据 schema 平铺、把「就绪度」放 hero
- ❌ 公司页人物按全局 influenceScore 排（学术大牛盖过产品创建者）
- ❌ research/safety 当「产品线」混进核心产品线
- ❌ UI 露 Alumni / 内部计数 stat / 英文行话
- ❌ 概念套壳（Loop Engineering 写成通用 ReAct 内层循环）
- ❌ 空模块照常渲染占位框（应 `return null`）

---

## 6. 关键文件索引

| 文件 | 职责 |
|---|---|
| `app/org/[slug]/page.tsx` | 公司页：排序/stat/ReferenceTier 守卫/cache key |
| `lib/entity-pages.ts` | officialArticles / 池/cap / isStaleAffiliationRole |
| `lib/person-directory.ts` | directory 查询（org 数组分支 + isCurrent 判定） |
| `lib/entity-presentations/company-presentation.ts` | COMPANY_PRESENTATIONS + resolve |
| `lib/entity-presentations/thread-presentation.ts` | THREAD_PRESENTATIONS |
| `components/entity/EntityPageBlocks.tsx` | 公司页区块（学习区/花名册/ReferenceTier，纯渲染） |
| `lib/work-taxonomy.ts` | 作品归类单一真理源 |
| `lib/products.ts` | 作品页读模型 |
| `lib/courses.ts` | 课程聚合 |
