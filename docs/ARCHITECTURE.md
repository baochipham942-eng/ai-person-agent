# 架构文档索引（ARCHITECTURE）

> AI 人物库的 as-built 架构与契约总入口。**durable 参考**（与 dated 计划分离，后者在 `docs/archive/`）。
> 改对应系统前先读它的契约文档；新坑增量写进对应文档或 `PROJECT_CONSTITUTION.md §4 错题本`。

## 核心契约文档（`docs/architecture/`）

| 文档 | 覆盖 | 何时读 |
|---|---|---|
| [KNOWLEDGE_THREADS.md](architecture/KNOWLEDGE_THREADS.md) | 知识主题系统：**候选 JSON↔DB 分叉**、三层注册、生成器流水线、status 生命周期、反假源纪律 | 改 `/threads`、加主题、改来源/人物 |
| [ENTITY_PAGES.md](architecture/ENTITY_PAGES.md) | 实体页模板：8 条设计原则、结构数据 vs 策展叙事两层、公司页人物三路径 | 改任何实体页（org/threads/person/work/courses） |
| [DATA_MODEL.md](architecture/DATA_MODEL.md) | 5 实体 + 6 关系边 + 分类法硬规则（模型收敛系列、作品类型、topic≠thread） | 加实体/关系、回填、理解数据流 |
| [ENRICHMENT_AND_IDENTITY.md](architecture/ENRICHMENT_AND_IDENTITY.md) | 富集/入库/身份消歧：消歧硬规则、成本/写闸、.env 凭证坑 | 人物入库、富集、身份字段写入 |

## 既有基础文档（根目录）

| 文档 | 覆盖 |
|---|---|
| `CLAUDE.md` | L3 项目配置 + DB 字段清单 + MCP 优先级 + 错题本/SOP |
| `PROJECT_CONSTITUTION.md` | 基础设施/部署/数据采集策略 + §4 错题本（Grok/Inngest/Neon/采集额度/embedding 凭证） |
| `DATA_QUALITY_ISSUES.md` | 数据质量问题清单 |
| `workflow_documentation.md` | 数据流/API/KPI |
| `CHANGELOG.md` | 版本变更 |

## 文档纪律

- **durable 契约**（架构/不变量/SOP）→ `docs/architecture/` 或既有基础文档，**增量更新不丢历史**。
- **dated 计划**（_2026_MM 命名、point-in-time 方案/执行板）→ `docs/archive/`，不混进 durable 参考。
- **新坑**：能泛化成规则的进对应契约文档；纯运维坑进 `PROJECT_CONSTITUTION.md §4 错题本`。
- 规则必须泛化：从具体 case 提炼通用原则，不只记「X 场景别做 Y」。
