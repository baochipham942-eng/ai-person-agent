# 富集 / 入库 / 身份消歧管线

> 适用范围：人物入库、数据富集、身份消歧、论文/作品回填。
> 本文固化 **消歧硬规则 + 成本/写闸 + .env 坑**——这些是项目反复栽的红线（张冠李戴、付费 API、auto-mode 拦截）。
> 最近大改：`cd9b8cba`（履历治理）、`40e513b5`/`47296a54`（主题人物入库+富集）、`91cc75cf`（论文实体）、`e1492a37`（作品回填）。

---

## 1. 管线总览（免费 base / 付费 enrich 分离）

| 脚本 | 阶段 | 成本 | 数据源 |
|---|---|---|---|
| `scripts/enrich/add_thread_people.ts` | base 建档 | **免费** | Wikidata（无命中建 `TEMP-*` qid）+ 头像 |
| `scripts/enrich/enrich_thread_people.ts` | 富集 | **付费** | Tavily（bio）+ DeepSeek（description/topics/role）+ unavatar（头像） |
| `scripts/enrich/recrawl_robust.ts` | 人物补全 | 付费 | Wikidata + Exa + Grok |
| `scripts/enrich/enrich_openalex.ts` | 学术引用 | 免费 | OpenAlex |
| `scripts/enrich/fetch_openalex_papers.ts` | 论文抓取 | 免费 | OpenAlex（优先 `person.openalexId`） |
| `scripts/enrich/materialize_products.ts` | 作品回填 | — | products JSON → Product 表 |

**原则**：base 入库零付费（Wikidata），需要联网搜索且 Exa 额度耗尽时优先 `lib/tavily-search.ts`，不依赖 Exa。

---

## 2. 身份消歧硬规则（强记，防张冠李戴）

身份字段写入是**与内容写不对称的高风险动作**——错 ID 会把 A 的论文/履历挂到 B 头上。

| 规则 | 值 | 为什么 |
|---|---|---|
| **name-only 匹配引用下限** | `NAME_ONLY_MIN_CITATIONS = 1000` | 唯一精确名无机构信号时，高影响力本人会匹配到近零引用同名小号（唐杰 cit=3、季逸超 cit=0 被挡回 review） |
| **机构路径引用下限** | `AFFILIATION_MIN_CITATIONS = 100` | 机构对上但引用近零 = OpenAlex 碎片/重复 profile，写进去等于错 ID |
| **中文机构 CN→EN 映射** | `ORG_CN_EN`（斯坦福→stanford…） | person.organization 中文 vs OpenAlex 英文机构匹配全失效 |
| **身份批量写先 dry-run** | 必须 | 上游脏别名会带偏（贾扬清存了错别名 "Jia Deng"=Princeton 邓嘉 → 0.88 机构匹配，把邓嘉身份写到贾扬清头上）。脚本拦不住上游别名错 |

- `enrich_openalex.ts` 的 `isLikelyMatch` 有 `cited_by_count>1000 无条件认领`（L158），对常见名学者张冠李戴——**不能直接跑它批量补 ID**，且它不存 ORCID。用 `backfill_openalex_identity.ts`（消歧与 `fetch_openalex_papers` 完全一致）。
- 中文名标记（hasNonAscii）绝大多数是正确音译（伊恩·古德费洛→Ian Goodfellow），只是提示核对不是错。
- Chinese-only 名（唐杰/朱军/何凯明）OpenAlex 搜不到要补英文别名或人工填 ID。

---

## 3. 成本与写闸（付费提醒 + auto-mode 拦截）

- **Tavily 付费**：按名单 `status=pending` 精确锁定控成本（12 人约 ¥1-2 量级）。涉及付费 API 调用必须先提醒产品负责人成本。
- **auto-mode classifier 写闸**：生产库批量写（INSERT/UPDATE/DELETE，尤其删除/覆盖）会被拦。**需产品负责人对具体写动作明确「执行」放行**，或他用 `!` 自跑——光对方案点头不够，要对写动作点头。
- `mcp__postgres__query` 是**只读**的，写操作必须走 Prisma 脚本。

---

## 4. .env / 凭证坑（高复用）

| 坑 | 处置 |
|---|---|
| `TAVILY_API_KEYS` 在 `.env.local`，`import 'dotenv/config'` 只读 `.env` | 显式 `loadEnv({path:'.env.local'})`，否则 searchTavily 静默返 0 |
| 有效 OpenAI key（embedding 用） | 在 **mental-health-agent 的 `.env.local`**（`sk-proj-` 原生 key）。`~/.zshrc` 的 sk-2769 中转站 key 已失效，别用 |
| embedding provider | `SEARCH_EMBEDDING_PROVIDER=openai` + 复制有效 key 进 person-agent `.env.local`；Clash TUN 直连 api.openai.com，embed 不用设 proxy |
| Gemini/Google key | 无 embedding 权限（YouTube 用的），embed 走不通 |

---

## 5. Wikidata / Neon 坑

- **add_thread_people 的 searchHint 别堆关键词**：Wikidata `wbsearchentities` 是 label 前缀匹配，长串（"Jurgen Schmidhuber IDSIA Godel Machine LSTM…"）命中空 → 全走 TEMP qid。要真 QID 用简短人名。TEMP qid 不影响渲染（按 name 匹配）。
- 无 Wikidata 命中建 `TEMP-{name}` qid **仍建档**（正常退路，非报错）。按 name/aliases/qid 幂等，重跑跳过已存在。
- **Neon ECONNRESET / WebSocket TLS 断**：冷启动波动 → 先 `prisma.people.count()` 唤醒 DB 再重跑。富集脚本按 `status=pending` 锁定，重跑只补未完成的人，安全幂等。
- 批量写 ~400 条中途 ECONNRESET，**单条 prisma 操作没包 try/catch 会整 run 挂掉** → upsert + try/catch 跳过坏记录继续。

---

## 6. 审计脚本（只读，全 dry-run + 备份）

| 脚本 | 用途 |
|---|---|
| `scripts/threads/audit_thread_people.ts` | 主题人物匹配 matched/unmatched |
| `scripts/audit/diagnose_company_pages.ts` | 公司页四类显示 bug 取证 |
| `scripts/audit/diagnose_org_roster_quality.ts` | 花名册在职/离职误标扫描 |
| `scripts/fix/fix_stale_individual_roles.ts` | 个体履历修复（dry-run + --execute + 删前备份 data/audit/，幂等） |

**补 endDate vs 删的判据**：职位真实但该结束 → 补 endDate；此人从未担任（张冠李戴）→ 删（带备份可恢复）。

---

## 7. 关键文件索引

| 文件 | 职责 |
|---|---|
| `scripts/enrich/add_thread_people.ts` | THREAD_PEOPLE 数组（base 入库） |
| `scripts/enrich/enrich_thread_people.ts` | TARGET_NAMES（付费富集） |
| `scripts/enrich/fetch_openalex_papers.ts` | 论文抓取（优先 openalexId） |
| `scripts/enrich/backfill_openalex_identity.ts` | 身份回填（消歧硬规则） |
| `lib/tavily-search.ts` | Tavily 搜索（Exa 兜底） |
| `lib/utils/identity-verifier.ts` | 多信号身份打分 |
