# 知识主题待补充清单（Topic Backlog）

更新：2026-06-19 · 维护：实体页策展层（见 `lib/entity-presentations/README.md`）

这是知识主题页（`/threads/[slug]`）的**候选主题清单**，按"今年（2026）真实在讨论 + 离现有主题集群的远近"排序。
每条都已做过 web 核实（grounded），但**锚定人物/公司、来源 URL 仍需建页时逐条复核**。

> 内容纪律（被产品负责人抓过）：建页前先核概念真伪，别套壳；论文/谱系类来源要说清"为什么和这个主题相关"；新增来源 `status` 诚实标注，不冒充 `verified`。详见 README。

## 已落地 / 在队

| Slug | 状态 | 备注 |
|------|------|------|
| `loop-engineering` | ✅ 已建 | 概念已 grounded 重写（Boris 三阶段 + /goal /loop）|
| `agentic-coding` | ✅ 已建（presentation + source pack）| 比 Loop Eng 更宽的产品/实践品类 |
| `ai-evals` | ✅ 已建（presentation + source pack，16 源/5 角色/7 边，status=source_pack_review）| 第二个完整建页样板；LLM-as-judge → Agent-as-judge → EvalGen 谱系 |
| `context-engineering` | 🟡 已在 `batch-thread-seeds.md` 选中，未建 | 方法层，2026 最火之一 |
| `mcp` | 🟡 已在 batch 选中，未建 | 协议/生态层 |
| `generative-ui` | ✅ 已建（hand-built source pack 16 源/5 角色/8 边 + 策展 presentation seed，status=source_pack_review）| **产出/交互层**，补现有集群空白：AI 产出从文本变成可运行界面/软件。两极=Claude Artifacts + Vercel v0/AI SDK 生成式 UI；malleable software 谱系（Geoffrey Litt → CHI 2025）。区别于 agentic-coding（AI 当开发者进真实仓库）|

---

## 新增候选（本次扩充）

### Tier 1 — 方法 / 工作流层（离现有集群最近，优先）

#### `ai-evals` — AI 评测与 Agent-as-a-Judge ✅ 已建
- **边界**：怎么衡量 LLM / agent 的质量、安全和是否"真的做完了"。包含 LLM-as-judge、agent-as-judge、离线 eval set、在线 trace 评估。**不是**单纯跑 benchmark 刷榜。
- **Why now（2026）**：「evals 是新的单元测试」成为共识；Agent-as-a-Judge 论文兴起；评测平台井喷（Galileo、LangSmith、Arize、Langfuse）。和 Loop Engineering 的"可验证停止条件"直接咬合。
- **锚定**：Hamel Husain、Shreya Shankar（evals 实践）；公司 LangChain/LangSmith、Arize、Galileo、Langfuse、OpenAI(evals)。
- **首批来源**：官方=各 eval 平台 docs + OpenAI/Anthropic eval 指南；论文=Agent-as-a-Judge、LLM-as-judge 偏置研究；工程落地=LangSmith/Langfuse SDK；信号=实践者"评测驱动"文章。

#### `multi-agent-orchestration` — 多智能体编排 / Agent 团队
- **边界**：多个 agent 协作完成一件事（supervisor/worker、swarm、并行+调度+共享状态）。**不是**单 agent 内层循环（那是 agentic loop）。
- **Why now**：Loop Engineering 谱系第五阶就是它；Steve Yegge 的 Gas Town、Anthropic 多智能体研究系统、OpenAI Agents SDK/Swarm、LangGraph、CrewAI、AutoGen 同期发力。
- **锚定**：Steve Yegge（Gas Town）、Anthropic 多智能体研究团队；公司 Anthropic、OpenAI、LangChain、Microsoft(AutoGen)、CrewAI。
- **首批来源**：官方=Anthropic「multi-agent research system」+ Agents SDK docs；论文=多智能体协作/评估；工程=LangGraph/AutoGen 示例；信号=Gas Town 等实战复盘。

#### `agent-skills` — Skills / 可复用 agent 能力
- **边界**：把项目知识、约定、工具用法沉淀成可被任意 loop 复用的命名"skill"。**不是**一次性 prompt。
- **Why now**：「Skills are the asset, loops are the plumbing」是 2026 循环讨论里最持久的洞见；Claude Code Skills、Codex skills 同时产品化。和 Loop Eng / Agentic Coding 强相关。
- **锚定**：Peter Steinberger、Boris Cherny；公司 Anthropic、OpenAI。
- **首批来源**：官方=Claude Code / Codex skills docs；信号=Steinberger"做过两次就沉淀成 skill"；工程=SKILL.md 实例与插件打包。

### Tier 2 — 能力 / 基础设施层

#### `agent-memory` — Agent 记忆系统
- **边界**：让 agent 跨会话记住状态（工作记忆 / 长期记忆 / 外部状态文件），对抗上下文窗口遗忘。**不是**单纯 RAG 检索或加大 context window。
- **Why now**：2026「Tools / Memory / Evals / Guardrails」被列为生产 agent 四件套；MemGPT/Letta、mem0 等记忆层走热。
- **锚定**：Charles Packer（MemGPT/Letta）；公司 Letta、mem0、LangChain。
- **首批来源**：官方=Letta/mem0 docs；论文=MemGPT、长期记忆/检索；工程=记忆层 SDK；信号=「磁盘状态文件是长跑 agent 的脊梁」。

#### `reasoning-models` — 推理模型 / 测试时计算
- **边界**：靠推理时算力（思维链、搜索、RL 后训练）而非纯参数堆叠提升能力。o 系列、R 系列。**不是**泛泛"更大的模型"。
- **Why now**：2026 共识「从原始规模扩张转向 reasoning 导向的后训练 + inference-time 技术」；DeepSeek R1、OpenAI o 系列持续发酵。
- **锚定**：Noam Brown（测试时计算）、DeepSeek 团队；公司 OpenAI、DeepSeek、Google DeepMind。
- **首批来源**：论文=test-time compute、过程奖励/RL 后训练、R1；官方=o 系列/推理模型发布；信号=推理 vs 规模之争。

#### `mcp` — Model Context Protocol（已在队，归入此层）
见 `batch-thread-seeds.md`。协议/生态层，官方 spec + SDK + 参考实现充足。

### Tier 3 — 前沿 / 安全

#### `agent-security` — AI Agent 安全与护栏
- **边界**：自主 agent 在生产里的安全：prompt injection、工具滥用、沙箱、权限、预算/迭代上限、护栏。
- **Why now**：agent 越自主，"不会停的循环 + 能碰生产系统"风险越尖锐（Loop Eng 也点了这条）；guardrails / 沙箱成 2026 四件套之一。
- **锚定**：Simon Willison（prompt injection 长期布道者）；公司 Lakera、NVIDIA(NeMo Guardrails)、各 agent 平台安全团队。
- **首批来源**：信号=Simon Willison prompt injection 系列；官方=各家 guardrails/sandbox docs；论文=注入攻击/防御评测；工程=权限/预算闸门实现。

#### `computer-use` — Computer Use / 浏览器 agent
- **边界**：让 agent 直接操作 GUI / 浏览器完成任务（点击、填表、读屏）。**不是**纯 API 工具调用。
- **Why now**：Anthropic computer use、OpenAI Operator、browser-use 等把"agent 用电脑"推到产品；多模态 + agent 编排交叉点。
- **锚定**：Anthropic、OpenAI 相关团队；公司 Anthropic、OpenAI、browser-use。
- **首批来源**：官方=computer use / Operator docs；论文=GUI agent / 屏幕理解；工程=browser-use 等开源；信号=实测能力边界复盘。

---

## 建页优先级建议

1. **Context Engineering**（已选）→ 2. **AI Evals** → 3. **Multi-Agent Orchestration** → 4. **Agent Skills**
   （这四个和 Loop Engineering / Agentic Coding 同属"方法+工作流"集群，复用现有 5 角色 source pack 套路最顺，也最能交叉引用、把人物挂上去。）
5. MCP / Agent Memory / Reasoning Models（基础设施层）→ 6. Agent Security / Computer Use（前沿安全）。

每个主题建页 = 补一份 fixture/source pack（≥15 来源、五角色齐、≥6 条互证边）+ 在 `THREAD_PRESENTATIONS` 加一条 presentation seed（见 README）。
