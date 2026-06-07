# AI Person Agent 升级改造方案

> 生成时间: 2026-06-07
> 项目现状: Next.js 16.2.6 / React 19 / Prisma 5.22 / 36.5k 行 TS / 144 人物
> 数据源 adapter 架构本身干净，问题集中在 LLM 抽象层、脚本治理、数据质量

---

## 总览(按价值/优先级排序)

| # | 改造项 | 优先级 | 工作量 | 阻塞 |
|---|--------|--------|--------|------|
| 1 | LLM Provider 统一抽象层(接入 gemini/grok 新 key) | P0 | 1-2d | ✅ **已完成 (2026-06-07)** |
| 2 | 数据抓取 pipeline 升级(Grok 模型 + 多 provider) | P0 | 1d | 依赖 #1 (就绪) |
| 3 | scripts/ 目录治理(159 个 → 归档+保留可复用) | P0 | 0.5d | 无 |
| 4 | 数据质量债清理(DATA_QUALITY_ISSUES 10 项) | P1 | 1-2d | 依赖 #1/#2 |
| 5 | Prisma 6→7 升级 + JSON 字段规范化评估 | P1 | 1d | 无 (实测已是 5.22, 最新 7.8) |
| 6 | 依赖大版本升级后的回归验证 | P1 | 0.5d | 无 |

### ✅ #1 完成记录 (2026-06-07)
- 新建 `lib/ai/provider.ts`: 多 provider(deepseek/gemini/grok) 统一入口 + 降级链 + 结构化输出(json_object + zod + 修复重试)
- `lib/ai/deepseek.ts` 改为兼容层, 委托 provider; 11 处 `chatStructuredCompletion` 调用点零改动获得 deepseek→gemini 降级
- **关键踩坑**: `@ai-sdk/openai` v3 默认走 /responses API, 中转站只支持 /chat/completions → 必须 `createOpenAI(...).chat(model)`; `compatibility` 选项 v3 已移除(类型报错), `.chat()` 单独即可
- 实测验证: deepseek/gemini/grok 文本+结构化全通; 强制 deepseek 失败自动降级 gemini ✅; lib/ai tsc 0 错误
- 默认降级链 `['deepseek','gemini']`; 清洗场景建议 `chain:['gemini']`(flash 便宜), 抓取场景 `['grok']`

### ✅ 中转站验证结果 (2026-06-07)
`https://jiuuij.de5.net/v1`(new-api, OpenAI 兼容)。两 key 实测可用,已写入 `.env`:
- **GEMINI_API_KEY** → `gemini-3-flash-preview`(快) / `gemini-3-pro-preview`(复杂提取) / `gemini-3.1-flash-lite-preview`
- **GROK_RELAY_API_KEY** → `grok-4.3-medium`(默认) / low / high / `grok-4.20-multi-agent-*`
- **Grok 搜索**: ✅ `search_parameters` 透传生效(prompt token 暴增=搜索结果注入 + `[[n]](url)` 引用),但 ⚠️ 不返回结构化 `citations`,URL handle 可能转录错(实测 `karthy` 拼错)。**入库前必须校验 handle 匹配人物已知 X handle**

---

## #1 LLM Provider 统一抽象层 (P0,新 key 主接入点)

### 现状问题
- `lib/ai/deepseek.ts` 硬编码 `deepseek('deepseek-chat')`,无 provider 路由
- CLAUDE.md 声称有 OpenAI fallback,**代码里不存在**
- `chatStructuredCompletion()` 用「请输出 JSON」+ 正则手剥 markdown(脆弱),项目已装 `ai@6` + `zod@4` 却没用 `generateObject`
- ~25 处文件直接依赖 `chatCompletion/chatStructuredCompletion`(lib/ai/*, lib/datasources/ai_knowledge.ts, baike.ts, 各 enrich 脚本)

### 改造方案
新建 `lib/ai/provider.ts` 作为统一入口:

```typescript
// lib/ai/provider.ts
import { createOpenAI } from '@ai-sdk/openai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateText, generateObject } from 'ai';

type ProviderName = 'deepseek' | 'gemini' | 'grok';

// 所有 provider 走 OpenAI 兼容协议(中转站统一)
const providers = {
  deepseek: createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: process.env.DEEPSEEK_API_URL }),
  gemini: createOpenAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: process.env.RELAY_BASE_URL }),
  grok:   createOpenAI({ apiKey: process.env.GROK_API_KEY,   baseURL: process.env.RELAY_BASE_URL }),
};

const MODEL_MAP = {
  deepseek: 'deepseek-chat',
  gemini: 'gemini-2.5-flash',   // 待中转站确认实际模型名
  grok: 'grok-3',                // 待确认
};

// 带降级链的文本生成: 主 provider 失败自动 fallback
export async function generate(prompt, { primary = 'deepseek', fallback = 'gemini', schema? }) { ... }
```

关键设计:
- **降级链**: 主 provider 报错/超时 → 自动切 fallback,记录降级日志
- **结构化输出**: 有 schema 走 `generateObject`(zod 校验),废弃正则剥 JSON
- **保留 `chatCompletion` 签名**做 thin wrapper,25 处调用点零改动平滑迁移
- gemini 走 OpenAI chat 接口(用户已确认中转站只支持此协议)

### 迁移步骤
1. 新建 `provider.ts`,`deepseek.ts` 改为 re-export(向后兼容)
2. 把 `chatStructuredCompletion` 内部实现换成 `generateObject`
3. 逐个数据源 adapter 切到带 schema 的调用

### 阻塞项 ⚠️
**需要中转站 base URL**。已知项目内 `XAI_BASE_URL=https://k2api.aivue.cn`,但用户新给的两个 key 在该站报 `Invalid Token`,确认不属于此站。须用户提供新 key 对应的中转站地址,才能:
- 验证 key 可用性 + 列出可用模型(`GET /v1/models`)
- 确定 `MODEL_MAP` 实际模型名

---

## #2 数据抓取 pipeline 升级 (P0)

### 现状问题
- `lib/datasources/grok.ts`: 硬编码老模型 `grok-2-1212`,手写 fetch + 正则解析推文
- `XAI_BASE_URL` 不带 `/v1` 却拼 `/chat/completions`,换中转站易踩坑
- Grok 调用点: `grok.adapter.ts` / `grok.ts` / `lib/utils/identity.ts` / `lib/skills/x-search.ts` / `scripts/enrich/refresh_x_content.ts`

### 改造方案
- Grok 模型升到 `grok-3`(或中转站可用的最新版),模型名进 `MODEL_MAP`
- 抓取层统一走 #1 的 provider 抽象,删除 grok.ts 里的手写 fetch
- 推文解析改用 `generateObject` + zod schema(替代 `parseXPostsFromContent` 正则)
- base URL 统一用 `RELAY_BASE_URL`,规范带 `/v1`

### 新 key 用途(用户已确认: 接入数据抓取 pipeline)
- **grok key** → X/Twitter 推文抓取(`x` adapter)
- **gemini key** → 网页内容提取/数据清洗/补全(可作 deepseek 的抓取侧 fallback,或专门跑 vision/长文提取)

---

## #3 scripts/ 目录治理 (P0,立竿见影)

### 现状
159 个脚本,根目录散落一次性脚本:
- `fix_*`: 22 个(fix_altman_timeline, fix_dingjie, fix_specific...)
- `debug_*`: 1 个 / `analyze_*`: 3 / `search_*`: 4 / `test_*`: 3
- 已有规范目录: `enrich/` `tools/` `audit/`(这些保留)

### 改造方案
1. 新建 `scripts/archive/` 把根目录一次性脚本(fix_*/debug_*/特定人名脚本)移入
2. 保留并文档化可复用 pipeline:
   - `enrich/recrawl_robust.ts`(核心补全)
   - `enrich/trigger_content_fetch.ts`(内容更新)
   - `tools/export_people_csv.ts` / `tools/dedupe_*`
   - `audit/audit_data_quality.ts`(质量扫描)
3. 在 `scripts/README.md` 列清「常用脚本」入口
4. 重复脚本合并: `recrawl_robust/recrawl_v4/recrawl_final/recrawl_multi/recrawl_career_history` 5 个 recrawl 变体需收敛成 1 个带参数版本

---

## #4 数据质量债清理 (P1)

`DATA_QUALITY_ISSUES.md`(2026-01 扫描)10 项,先跑 `audit/audit_data_quality.ts` 核对现状是否已修,未修的:

- **P0**: Karpathy 无效 YouTube URL(undefined)、isOfficial 误标、缺 2016 OpenAI 履历
- **P1**: 组织重复(Google 4 / OpenAI 3 / Facebook 3,需去重脚本合并外键)、50+ Role 缺 startDate
- **P2**: YouTube 84% 粗暴归类 analysis(分类算法优化)、官方频道内容缺失、实习日期精度

依赖 #1/#2 的新 provider 做重新抓取/分类。

---

## #5 Prisma 6 升级 + Schema 评估 (P1)

- Prisma 5.22 → 6.x(已 GA),注意 breaking changes(需查 migration guide)
- People 表 7 个字段塞 JSON(officialLinks/topicRanks/highlights/quotes/products/education/lastFetchedAt):
  - 查询无法索引、无类型校验
  - 评估: highlights/quotes/products 是否拆成关联表(参考已有 Card/PersonRole 模式)
  - lastFetchedAt(JSON 存各源时间戳)可保留,但加 zod 运行时校验

---

## #6 依赖回归验证 (P1)

最近 commit `5300301` 刚升级依赖大版本 + inngest v4 迁移,需验证:
- `bun run build` 能否通过
- Inngest v4 的 `createFunction` API 是否有 breaking(pipeline.ts 用法)
- Next 16.2.6 / React 19 运行时无报错

---

## 建议执行顺序

```
第一波(可立即做,无阻塞):
  #3 scripts 治理 → #6 build 验证 → #5 Prisma 评估(只评估不改)

第二波(拿到中转站 base URL 后):
  #1 LLM 抽象层 → #2 抓取 pipeline 升级 → 跑通新 key

第三波(provider 就绪后):
  #4 数据质量重新抓取/清理
```

## 当前唯一阻塞
**中转站 base URL** — 用户提供后即可解锁 #1/#2/#4。
