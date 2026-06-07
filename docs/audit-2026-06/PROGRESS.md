# 执行进度总账 (2026-06-07)

> 单一进度视图。✅=已完成验证 / 🔧=代码就绪待运维 / ⏸=需产品决策 / 📋=待办

## 已完成 ✅

### 清洗+聚合地基 (代码已落, tsc 0 错误, 集成测试通过)
- `lib/ai/provider.ts` 多 provider 抽象 + 降级链 + 结构化输出
- `lib/utils/dedup.ts` SimHash 模糊去重
- `lib/agents/semantic-qa.ts` gemini-flash 语义打分
- `lib/agents/clean-orchestrator.ts` 三段式 cleanItems + 审计落库
- `QAAuditLog` 表 + pipeline 接入 + cardGenerator 聚合优化
- commit `9638977`

### 批量数据修复 (已对生产 Neon 执行 + 验证)
- 机构 667→641 (删 34 冗余, OpenAI Foundation→OpenAI 等)
- 关系 297→286 (删 11 幻觉)
- 履历日期 7 条修复; 译名 4 条
- 回滚备份: `backup-2026-06-07.json`
- commit `734447c`
- ⚠️ 详情页 ISR(revalidate=3600) 1 小时内自动刷新; directory API 已显示新值

### 存量重洗验证 (样本结论性)
- 2 人样本(Karpathy/LeCun 243 条): **约 40% 存量是垃圾**
- L1 精准识别样板/导航/Cookie/占位符垃圾(旧 includes('ai') 全放行)
- L1 均分 aboutPerson 0.98 / aiRelevant 0.91 / quality 0.74
- commit `b3b6a27`

### 名册去重核对 (只读完成)
- 13 种子 → **11 真新增 + 2 同人需更新**
- Lilian Weng = 库内"李莲"(score40); Justin Johnson = 库内"贾斯汀·约翰逊"(score0)

## 代码就绪待运维 🔧
- **全量重洗 83 人**: `rewash_existing.ts` 就绪, 但顺序跑 ~200s/人 → 全量 ~4.6h。
  需异步化/并行化(或拆批 cron)。`--prune` 删 reject+重复(破坏性, 需确认)
- **机构去重剩余**: 本次只做了 21 个高确定簇; 审计 §2 共 40 簇, 剩余(Google家族/弱合并)待补

## 需产品决策 ⏸
- **名册插入**: 11 新增 + 2 更新已就绪(`roster_seeds.json`), 但审计警告"半成品入库拉低排序",
  应先定 influenceScore 口径再走完整 enrich
- **influenceScore 重算**: 86 条=0(未计算占位), 产业领袖被学术权重低估 → 需定权重
- **部署**: 清洗代码上线 + 详情页缓存策略(on-demand revalidate?)

## 待办 📋
- 卡片有序聚合的实际重生成(代码已改, 待重跑)
- career 规范化合并(审计 §6.2 currentTitle 错位: Mira Murati/苏姿丰 等)
- Router 反馈闭环
