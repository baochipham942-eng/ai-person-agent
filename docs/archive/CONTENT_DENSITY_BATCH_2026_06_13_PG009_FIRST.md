# PG-009 内容密度补强第一批候选包

范围: 只处理 `nextBatchExecutionList` 的 5 个对象: 开发者工具/AI Coding、DeepSeek、Hugging Face、Kimi、Perplexity。

执行约束:

1. 先整理候选和证据包，不直接写数据库。
2. 不跑自动大抓取；需要补资料时，只做少量人工搜索 brief。
3. 审计只跑小样本: `source-row-limit <= 40`，`batch-size <= 5`。
4. people、activity、works 分开执行，一次只交付一个 small batch。
5. 禁止把泛新闻当代表作品；新增人物、动态、作品都要能回到具体人物或机构。

只读入口:

```bash
npm run audit:entity-density -- \
  --top=8 \
  --batch-size=5 \
  --sample-limit=1 \
  --source-row-limit=40 \
  --output=/tmp/ai-person-entity-density-pg009-first-batch.json \
  --remediation-output=/tmp/ai-person-entity-remediation-pg009-first-batch.json
```

脚本输出入口:

1. `/tmp/ai-person-entity-remediation-pg009-first-batch.json`
2. `nextBatchExecutionList`: 第一批 5 个对象的执行顺序。
3. `candidatePackages.groups.people`: 人物补强 small batch。
4. `candidatePackages.groups.activity`: 动态补强 small batch。
5. `candidatePackages.groups.works`: 作品补强 small batch。

## 最小补强目标

| 顺序 | 对象 | 类型 | 当前缺口 | 最小目标 |
| --- | --- | --- | --- | --- |
| 1 | 开发者工具/AI Coding | topic | people 2/10, activity 1/10, works 1/5 | 补 8 人、9 条动态、4 个作品 |
| 2 | DeepSeek | org | people 2/5, activity 0/5, works 0/5 | 补 3 人、5 条动态、5 个作品 |
| 3 | Hugging Face | org | people 3/5, activity 0/5, works 0/5 | 补 2 人、5 条动态、5 个作品 |
| 4 | Kimi | org | people 1/5, works 0/5 | 补 4 人、5 个作品；动态暂不进第一批 |
| 5 | Perplexity | org | people 4/5, activity 1/5, works 1/5 | 补 1 人、4 条动态、4 个作品 |

## Small Batch 1: People

目标: 先把 5 个入口的人物覆盖补到最低可展示密度。候选只进待审核包，不直接入库。

| 对象 | 需要补 | 已有种子 | 候选方向 |
| --- | ---: | --- | --- |
| 开发者工具/AI Coding | 8 | Michael Truell, Thariq Shihipar | AI coding IDE、agentic coding、代码生成工具的创始人、核心工程负责人、开源维护者 |
| DeepSeek | 3 | 梁文锋、罗福莉 | 创始团队、模型论文作者、公开工程/研究负责人、重要 alumni |
| Hugging Face | 2 | Clément Delangue, Julien Chaumond, Thomas Wolf | Transformers、Datasets、Hub、TRL 等核心项目负责人或长期维护者 |
| Kimi | 4 | 杨植麟 | 月之暗面联合创始人、Kimi 相关模型/工程负责人、公开论文作者 |
| Perplexity | 1 | Denis Yarats, Andy Konwinski, Aravind Srinivas, Johnny Ho | 创始团队、搜索/答案引擎核心工程或研究负责人 |

验收:

1. 每个候选人物都说明属于该 topic/org 的理由。
2. 每个人至少有一个可靠来源 URL，优先官方页、论文页、GitHub、机构介绍。
3. 不用“媒体文章里提到过”作为唯一归属证据。

## Small Batch 2: Activity

目标: 补近 365 天可展示动态。Kimi 当前 activity 已达 40，不进入本批 activity。

| 对象 | 需要补 | 优先来源 |
| --- | ---: | --- |
| 开发者工具/AI Coding | 9 | GitHub release / repo、论文、产品博客、工程访谈、课程或 demo |
| DeepSeek | 5 | 官方论文、模型发布、GitHub、研究博客、公开访谈 |
| Hugging Face | 5 | 官方博客、GitHub、paper/project release、社区项目更新 |
| Perplexity | 4 | 官方博客、产品/研究发布、GitHub、创始团队访谈 |

验收:

1. 每条动态都有 title、url、sourceType、人物归属。
2. 动态要能解释为什么属于该入口。
3. 二手媒体内容只作为候选线索，进入默认流前要回源。

## Small Batch 3: Works

目标: 补代表论文或项目，优先能落到具体人物。

| 对象 | 需要补 | 优先来源 |
| --- | ---: | --- |
| 开发者工具/AI Coding | 4 | GitHub repo、论文、官方项目页 |
| DeepSeek | 5 | OpenAlex 论文、GitHub repo、官方模型/论文页 |
| Hugging Face | 5 | Transformers、Datasets、Hub、TRL、evaluate 等代表项目或论文 |
| Kimi | 5 | Moonshot/Kimi 相关模型、论文、技术报告、官方项目页 |
| Perplexity | 4 | GitHub repo、论文、官方技术/产品项目页 |

验收:

1. 作品能关联到具体人物或机构。
2. 作品 URL 可访问，有清晰标题。
3. 不把融资新闻、泛新闻报道当代表作品。

## 执行顺序

1. 先跑只读入口刷新 `/tmp` JSON。
2. 从 `candidatePackages.groups.people` 开始整理候选人包。
3. people 包完成后再做 activity。
4. works 包最后做，因为作品最好复用已确认人物归属。
5. 每个 small batch 结束后复跑同一条审计命令，看 targetDelta 是否收敛。
