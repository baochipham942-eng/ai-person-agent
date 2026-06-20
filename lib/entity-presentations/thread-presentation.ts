import type { KnowledgeSourceRole } from '@/lib/knowledge-thread-fixtures/loop-engineering';
import generatedThreadPresentations from '@/data/knowledge-threads/thread-presentations.generated.json';

// 知识主题页「策展叙事层」的 seed。来源 / 边 / 状态来自 fixture 或 DB（KnowledgeThread*）；
// 这里只放需要人工（或 LLM）策展的内容：一句话定义、循环讲解、判断点、角色说明等。
// 新增一个主题 = 复制 _TEMPLATE.ts 填空并在下方 THREAD_PRESENTATIONS 注册，无需改组件。

export interface ThreadPresentation {
  title: string;
  subtitle: string;
  valueProp: string;
  problem: string;
  whyRead: string;
  roleInsights: Partial<
    Record<
      KnowledgeSourceRole,
      {
        title: string;
        body: string;
        takeaway: string;
      }
    >
  >;
  loopSteps: Array<{
    title: string;
    body: string;
  }>;
  readerCanJudge: string[];
}

const THREAD_PRESENTATIONS: Record<string, ThreadPresentation> = {
  'agent-memory': {
    title: 'Agent Memory',
    subtitle: '智能体记忆',
    valueProp:
      'Agent Memory 是让智能体在多轮推理、工具调用和跨会话交互中持续写入、组织、遗忘与召回信息的系统层——和「把上下文窗口堆大」或「接一条基础 RAG」不是一回事。MemGPT 把它类比成操作系统的分级内存，靠智能体自己在主上下文和外部存储间换页；Stanford 的 Generative Agents 用「记忆流 + 反思 + 按时近性/重要性/相关性检索」让智能体积累经验。',
    problem:
      '智能体要长期可用、能个性化、跨会话不「失忆」，记忆就不再是附加功能，而是核心架构层。今天工业界已分化出几条清晰路线：mem0 的「提取-巩固-检索」记忆层、Zep/Graphiti 的时序知识图谱、Letta 的 memory blocks 与归档记忆、以及 Claude Code 把记忆落到 CLAUDE.md 文件这样的轻量做法。',
    whyRead:
      '这页用真实一手源（MemGPT、Generative Agents、Mem0、Zep 论文 + Letta/mem0 实现）拉出这条线，帮你分清「记忆 vs 长上下文 vs RAG」，以及在自建/用 mem0/用 Letta/用框架内置之间做选型判断。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'Letta（MemGPT 后继）、mem0、Zep 等把「有状态智能体」做成可用产品，记忆成为 2025 年智能体基础设施的主战场之一。',
        takeaway: '信号说明方向，结论要回到记忆架构的真实差异。',
      },
      official_definition: {
        title: '架构定义',
        body: 'MemGPT 定义「LLM 即 OS、虚拟上下文管理、主上下文 vs 外部存储分层」；Generative Agents 定义「记忆流 + 反思 + 三因子检索」。',
        takeaway: '先看它用的是哪条记忆架构，而不是停在「能记住」。',
      },
      transcript_context: {
        title: '访谈语境',
        body: '创始人访谈补足各家记忆层为什么这样设计、解决哪类失忆场景，但具体引文需回源核对。',
        takeaway: '访谈补动机，不替代对架构的判断。',
      },
      paper_foundation: {
        title: '论文根基',
        body: 'MemGPT（2310.08560）操作系统式分层、Generative Agents（2304.03442）记忆流、Mem0（2504.19413）+ Zep（2501.13956）的生产级长期记忆与知识图谱路线。',
        takeaway: '看清它属于哪条谱系，别把「长上下文」当记忆。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'Letta、mem0 开源框架与 Claude Code 文件式记忆，是把记忆架构落到可复用实现的入口。',
        takeaway: '能持久化、可召回、可遗忘，才算真落地。',
      },
    },
    loopSteps: [
      { title: '分层存储', body: '区分工作上下文（当前任务）和外部存储（归档记忆），像 OS 内存分级。' },
      { title: '写入与巩固', body: '把对话事实、用户偏好、中间状态提取、巩固成结构化记忆，而非原样堆进 prompt。' },
      { title: '反思与组织', body: '周期性地把零散记忆归纳成更高层的洞察（Generative Agents 的 reflection）。' },
      { title: '检索召回', body: '按时近性/重要性/相关性或知识图谱关系，把相关记忆调回当前上下文。' },
      { title: '遗忘与更新', body: '淘汰过期/低价值记忆，更新变化的事实，避免记忆膨胀和陈旧。' },
    ],
    readerCanJudge: [
      '它讲的记忆是真有写入/组织/召回/遗忘的系统层，还是只是把上下文窗口做大或接了一条基础 RAG。',
      '它用的是哪条架构——操作系统式分层、记忆流、知识图谱，还是文件式轻量记忆，各自取舍清不清楚。',
      '记忆能不能跨会话持久、能不能个性化、会不会随时间膨胀失控。',
    ],
  },
  'agent-skills': {
    title: 'Agent Skills',
    subtitle: '智能体技能',
    valueProp:
      'Agent Skills 是 Anthropic 2025 年 10 月提出、12 月开源为开放标准的形式：把执行某类任务所需的指令、流程、脚本和资源，组织成一个含 SKILL.md（YAML 元数据 + Markdown 指令）的文件夹，智能体按需动态发现并加载。核心设计是「渐进披露」——平时每个 skill 只占几十 token 的摘要，仅当任务相关时才加载完整内容。',
    problem:
      '智能体越来越聪明，却不懂「你这家公司怎么做事」。把领域流程塞进超长提示词，导致难复用、难维护、团队无法协作。Agent Skills 把程序性知识从「一次性长提示词」变成可版本化、可审计、可跨工具共享的模块——同一份 SKILL.md 已被 Claude Code、OpenAI Codex、Cursor、VS Code 等 30+ 工具读取，是继 MCP 之后 Anthropic 第二次用开放标准定义智能体生态的一层基础设施。',
    whyRead:
      '这页用 Anthropic 官方工程博客、官方 GitHub 仓库、agentskills.io 标准站和作者（Barry Zhang & Mahesh Murag）演讲，把 Agent Skills 钉在一手来源上，并讲清它和 MCP 的关系——别把这个跨厂商开放标准误当成 Claude Code 的局部配置。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: '2025 年底 Agent Skills 开源后，Microsoft、OpenAI、Cursor、GitHub 等迅速采纳同一套 SKILL.md，跨厂商采纳本身是最强信号。',
        takeaway: '它已是开放标准，不是单一产品的功能。',
      },
      official_definition: {
        title: '官方定义',
        body: 'Anthropic 官方定义 Agent Skills 为「可复用的专长封装」，核心是 SKILL.md + 渐进披露 + 可组合。',
        takeaway: '看它讲不讲清 SKILL.md 结构和渐进披露，而非只说「给 agent 加能力」。',
      },
      transcript_context: {
        title: '访谈语境',
        body: '作者 Barry Zhang & Mahesh Murag 在 AI Engineer 的演讲《Don’t Build Agents, Build Skills Instead》讲设计动机与「agent 自己写 skill」的愿景。',
        takeaway: '一手作者讲法补动机；注意别把它张冠李戴给其他人。',
      },
      paper_foundation: {
        title: '相邻范式',
        body: 'Agent Skills 是工程产品概念，没有单一论文起源；真正要对比的是 MCP（capabilities 层）与 function calling，理解 Skills 处在 procedures 层。',
        takeaway: 'MCP 给「能力和接口」，Skills 给「怎么用好这些能力的专长」，互补非竞争。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'anthropics/skills 官方仓库（SKILL.md 模板 + spec + 示例）与 agentskills.io 标准站，是落地与跨工具复用的入口。',
        takeaway: '看它有没有真实 SKILL.md 规范和多工具支持。',
      },
    },
    loopSteps: [
      { title: '写 SKILL.md', body: '用 YAML 元数据 + Markdown 指令把一类任务的流程、脚本、资源封装成一个文件夹。' },
      { title: '渐进披露', body: '平时只暴露几十 token 的摘要，节省上下文。' },
      { title: '按需加载', body: '任务相关时智能体才发现并加载完整 skill 内容。' },
      { title: '组合与复用', body: '多个 skill 可组合；同一份 SKILL.md 跨 Claude Code/Codex/Cursor 等工具复用。' },
      { title: '版本化协作', body: '把团队的「怎么做事」沉淀成可审计、可版本控制的资产。' },
    ],
    readerCanJudge: [
      '它把 Agent Skills 讲成跨厂商开放标准（SKILL.md + 渐进披露），还是矮化成某个工具的本地配置。',
      '它讲不讲清 Skills（procedures）和 MCP（capabilities）的互补关系。',
      '引用的作者/来源是真实一手（Barry Zhang & Mahesh Murag、官方仓库、agentskills.io），还是张冠李戴。',
    ],
  },
  'agent-security': {
    title: 'Agent Security',
    subtitle: '智能体安全',
    valueProp:
      'Agent Security 研究的是：当 LLM 被赋予工具、能读写外部数据、能自主多步行动后，如何防止它被恶意内容劫持去做未授权操作。两大核心风险是提示注入（OWASP LLM01，尤其把恶意指令藏进网页/邮件/文档的间接注入）和过度代理（OWASP LLM06，工具、权限、自主性给得过多）。',
    problem:
      '自主智能体把「读外部数据」和「执行真实动作」接到同一个上下文里，攻击者无需碰代码漏洞，只要在智能体会读到的网页、邮件、文档里埋一句指令，就可能让它外泄数据或越权操作。当前领域的核心心智模型是 Simon Willison 的「致命三要素（Lethal Trifecta）」——访问私有数据 + 接触不可信内容 + 具备对外通信能力，三者同时具备即可被注入利用；以及 Meta 的「二选一原则（Rule of Two）」——无人监督的智能体最多满足其二，三者全要就必须人工确认。',
    whyRead:
      '这页用 OWASP 2025 官方标准、Greshake 等人的间接注入奠基论文、Simon Willison 的致命三要素、Meta 的二选一原则，以及 Anthropic 的浏览器注入防御与沙箱隔离工程实践，帮你把「智能体安全」从口号拆成可决策的设计约束。',
    roleInsights: {
      signal: {
        title: '领域心智模型',
        body: 'Simon Willison 的致命三要素 + Meta 的二选一原则，是 2025–2026 定义整个智能体安全威胁模型与缓解原则的核心概念。',
        takeaway: '没有这两个概念的「安全」讨论，多半停在泛泛护栏。',
      },
      official_definition: {
        title: '官方标准',
        body: 'OWASP Top 10 for LLM Applications 2025 给出 LLM01 提示注入、LLM06 过度代理的权威分类。',
        takeaway: '工具权限、操作预算这些都归在「过度代理」下，不是并列的大概念。',
      },
      transcript_context: {
        title: '平台实践',
        body: 'Anthropic 关于浏览器/computer-use 注入防御的官方做法（分类器 + 人工确认 + RL 鲁棒性训练）。',
        takeaway: '一线平台做法补足「工程上怎么防」。',
      },
      paper_foundation: {
        title: '论文根基',
        body: 'Greshake 等《Not What You’ve Signed Up For》（2302.12173）是间接提示注入的开山论文，提出「数据即指令」的攻击面与分类。',
        takeaway: '提示注入在 LLM 层至今未被根治，是架构裁剪的前提。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'Anthropic「如何隔离 Claude」（环境隔离/进程沙箱/egress 控制/凭证不落 agent），正对应切断致命三要素的「外泄腿」。',
        takeaway: '架构级裁剪比事后检测可靠。',
      },
    },
    loopSteps: [
      { title: '识别三要素', body: '判断这个智能体是否同时具备：访问私有数据、接触不可信内容、对外通信能力。' },
      { title: '架构裁剪', body: '按二选一原则，在设计阶段就切断攻击链的一条腿（如 egress 网络隔离）。' },
      { title: '权限最小化', body: '按 OWASP 过度代理，收紧工具、权限、自主性，凭证用代理不让 agent 见到。' },
      { title: '人在回路', body: '三要素无法避免时，对高风险操作强制人工确认。' },
      { title: '注入防御与评估', body: '叠加注入分类器、护栏，并用安全评估持续回归。' },
    ],
    readerCanJudge: [
      '它有没有讲到致命三要素和二选一原则，还是只堆「多层次防御」这类空话。',
      '它的防御是架构级裁剪（切断攻击链一条腿），还是只靠事后检测兜底。',
      '它引用的论文/来源是真实可核（OWASP、Greshake 2302.12173、Willison），还是凭空捏的 arXiv 编号。',
    ],
  },
  'computer-use': {
    title: 'Computer Use',
    subtitle: '计算机操作',
    valueProp:
      'Computer Use 指 AI 智能体不依赖专用 API，而是像人一样「看屏幕、动鼠标键盘」来操作软件：模型接收屏幕截图，理解按钮、输入框和文本，再输出点击坐标、键入和滚动等动作，循环完成多步任务。核心技术难点是视觉 grounding——把「订一张机票」这样的语义意图，准确落到屏幕上某个像素位置的控件。',
    problem:
      '2024 年 10 月 Anthropic 首次把 Computer Use 作为公测能力开放，随后 OpenAI（Operator/CUA，2025-01）、Google（Gemini 2.5 Computer Use，2025-10）相继跟进。但它仍处早期：Anthropic 首发时直言这套能力「still experimental, cumbersome and error-prone」——桌面基准 OSWorld 上人类完成率超 72%，而 2024 年最强模型仅 12–15%。这条能力差距快速收窄的曲线，正是现在值得追踪的原因。',
    whyRead:
      '这页用 Anthropic/OpenAI/Google 三家官方发布、OSWorld 与 WebArena/VisualWebArena 基准、SeeAct 的视觉 grounding 论文，把 computer use 从产品宣称拉回可测能力，帮你判断当前 GUI 智能体的能力边界与适用场景。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'Anthropic（2024-10）、OpenAI（2025-01）、Google（2025-10）三大厂同时下场，让通用 GUI 智能体从论文走向产品。',
        takeaway: '信号说趋势成立，但能力边界要看基准数字。',
      },
      official_definition: {
        title: '官方定义',
        body: 'Anthropic 官方把 computer use 定义为「截图感知 + 鼠标键盘控制的自主桌面交互」；OpenAI CUA、Google Gemini Computer Use 是同一范式的不同实现。',
        takeaway: '它强调视觉理解 + 直接界面操作，区别于纯 API 工具调用。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'Anthropic 团队公开讲过 computer use 的设计权衡（截图频率、坐标精度、错误恢复）。',
        takeaway: '补设计动机，注意别夸大某个人是「唯一创造者」。',
      },
      paper_foundation: {
        title: '论文与基准',
        body: 'OSWorld（2404.07972）跨 OS 桌面基准、WebArena（2307.13854）/VisualWebArena（2401.13649）Web 基准、SeeAct（2401.01614）证明视觉 grounding 是瓶颈。',
        takeaway: '基准数字才是「为什么现在还不可靠」的硬证据。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'browser-use 等开源项目（基于 Playwright）把 computer use 落到可复用实现。',
        takeaway: '看它有没有真实可跑的实现与基准，而不是只有 demo。',
      },
    },
    loopSteps: [
      { title: '截图感知', body: '智能体接收当前屏幕截图，理解界面上的控件、文本和布局。' },
      { title: '视觉 grounding', body: '把语义意图（点哪个按钮、填哪个框）落到屏幕上具体的像素坐标——这是核心难点。' },
      { title: '模拟动作', body: '输出点击、键入、滚动等动作，像人一样操作软件。' },
      { title: '观察反馈', body: '再次截图，判断动作是否生效、是否需要纠错。' },
      { title: '多步迭代', body: '循环往复直到任务完成；长任务的错误恢复与稳定性仍是瓶颈。' },
    ],
    readerCanJudge: [
      '它讲的 computer use 是真的「截图 + 模拟鼠标键盘操作 GUI」，还是混进了纯 API 工具调用。',
      '它有没有点出视觉 grounding 这个核心难点，以及 OSWorld 这类基准上的真实差距。',
      '引用的论文/产品是否准确——发布年份、arXiv 编号、产品是否仍在运营（如 Operator 已并入 ChatGPT Agent）。',
    ],
  },
  'loop-engineering': {
    title: 'Loop Engineering',
    subtitle: '循环工程',
    valueProp:
      'Loop Engineering 不是教 AI 写代码，而是让你不再当那个一遍遍敲 prompt 的人——你设计一个按计划自动驱动 agent、自己验证、自己停下的系统，模型变成被这个系统调用的子程序。',
    problem:
      'Boris Cherny（Claude Code 作者）把它讲成三个阶段：手敲代码靠补全 → 同时手动 prompt 五到十个 Claude 会话 → 现在干脆不 prompt 了，写 loop 让 loop 去 prompt Claude（“我的工作是写 loop”）。关键要分清：agent 每一轮“推理→调用工具→观察→再推理”是内层 agent 循环；Loop Engineering 高它一层，是你设计的那个外层系统——定时触发、派活、独立验证、写回记忆，跑到可验证条件才停。',
    whyRead:
      '这页用 Boris 的公开讲法、Addy Osmani 的定义、Claude Code 的 /goal 与 /loop 原语和 Ralph loop，把概念钉在真实来源上，帮你分清“真·loop 工程”和被套上循环话术的通用 agent。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'Boris、Steinberger、Addy Osmani 等实践者把关注点从“写好一个 prompt”推向“设计一个自动 prompt 的系统”。',
        takeaway: '信号提示方向在转，结论要回到官方原语和定义。',
      },
      official_definition: {
        title: '官方原语',
        body: '看这个产品到底有没有 /goal（跑到可验证条件才停）、/loop（按 cron 定时重复）、hooks、worktree、子代理验证这些让循环自己跑、自己停的原语。',
        takeaway: '没有这些原语，所谓“循环”只是一个 agent 在交互式跑。',
      },
      transcript_context: {
        title: '访谈语境',
        body: '长访谈解释 Boris 为什么不再手动 prompt：工作上移了一个抽象层，从写代码变成写“写代码的东西”，而工程师反而更重要。',
        takeaway: '访谈补动机，不替代对原语和停止条件的判断。',
      },
      paper_foundation: {
        title: '论文与谱系',
        body: 'ReAct 的内层 while 循环（2022）、AutoGPT 的自主目标（2023）、Ralph loop 的“每轮清空上下文”（2025）、/goal 产品化（2026）是同一个词的不同阶段。',
        takeaway: '看清你说的“loop”在谱系哪一阶，别把内层循环当成 Loop Engineering。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'SDK、Hooks、MCP、子代理、Skills、worktree 和 GitHub Action 是搭外层循环的积木；Skills 是会复用的资产，循环只是管道。',
        takeaway: '能无人值守按计划跑、还能自己验证和停下，才算真落地。',
      },
    },
    loopSteps: [
      { title: '定时触发', body: '一个排程自动化（/loop，底层是 cron）自己发现要做的活，而不是你坐在那儿敲 prompt。' },
      { title: '派活给子代理', body: '为每件值得做的事开一个隔离 worktree，派子代理起草改动，互不踩文件。' },
      { title: '独立验证', body: '另一个子代理（或 /goal 背后的小模型）对照测试和验收标准检查草稿——写的人不给自己打分。' },
      { title: '落地与记忆', body: '连接器开 PR、更新工单；状态写回磁盘上的记忆文件，下一轮接着上一轮。' },
      { title: '到条件才停', body: '跑到可验证条件成立才算完，同时用最大迭代数和预算上限兜底，防止循环不停烧钱。' },
    ],
    readerCanJudge: [
      '这个产品到底有没有 /goal、/loop、cron、worktree、子代理验证这些让循环自己跑自己停的原语，还是只有一个 agent 在交互式跑。',
      '它说的“loop”是 agent 每轮的内层推理循环，还是你设计的、替代人来 prompt 的外层系统——两者差一个抽象层。',
      '有没有可验证的停止条件和迭代/预算上限——没有的话，自动循环就是个不停烧钱的机器。',
    ],
  },
  mcp: {
    title: 'Model Context Protocol (MCP)',
    subtitle: '模型上下文协议',
    valueProp:
      'MCP 不是又一个工具调用 demo，而是 Anthropic 于 2024 年 11 月开源的开放标准——用 host/client/server 三方架构和 JSON-RPC 2.0，把 AI 应用接入外部工具、数据源和 prompt 的方式统一成一个协议，相当于给 AI 应用装上 USB-C 接口，把 N×M 的定制集成收敛成一个标准。',
    problem:
      '没有协议时，每接一个数据源或工具都要为每个客户端各写一套 function-calling glue，集成数随客户端×服务呈 N×M 爆炸。MCP 把它压成 N+M：服务方实现一个 server、客户端实现一个 client，谁都能复用。2025 年 OpenAI、Google DeepMind 相继采用，年底协议治理移交 Linux Foundation，已从单厂方案变成事实行业标准。',
    whyRead:
      '这页把概念钉在一手来源上：Anthropic 的起源公告、modelcontextprotocol.io 的官方架构文档（host/client/server、JSON-RPC、stdio/Streamable HTTP transport、tools/resources/prompts 原语）、官方 SDK 与 server 生态、以及 2025 全年的采用与治理演进——帮你分清“真懂 MCP”和“只会说一句统一协议”。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'MCP 在 2025 年从 Anthropic 内部方案变成 OpenAI、Google 都采用的跨厂标准，并移交 Linux Foundation 治理。',
        takeaway: '信号说明它已是事实标准，但定义要回到官方架构文档。',
      },
      official_definition: {
        title: '官方定义',
        body: '官方材料界定 MCP 是 host/client/server 三方 + JSON-RPC 2.0 数据层 + stdio/Streamable HTTP 两种 transport，核心原语是 tools / resources / prompts。',
        takeaway: '只说“client-server 统一协议”不够——能讲清三方、JSON-RPC、transport 和原语才算真懂。',
      },
      transcript_context: {
        title: '访谈语境',
        body: '创造者与早期采用方的公开讲述补足 MCP 为什么诞生、解决的 N×M 集成痛点，但具体条目仍需回源核对。',
        takeaway: '访谈补动机，不替代对协议原语的判断。',
      },
      paper_foundation: {
        title: '思想动机',
        body: 'function calling / tool-use 接口标准化是 MCP 的直接动机源；Toolformer 这类“模型自学用工具”只是松散的背景动机，不是 MCP 的思想根基。',
        takeaway: 'MCP 是运行时集成协议，不是训练方法，别把工具学习论文当成它的根基。',
      },
      implementation_signal: {
        title: '工程落地',
        body: '官方 TypeScript / Python SDK、reference server 集合（Drive/Slack/GitHub/Postgres 等）和 Claude Code 等客户端的原生支持，证明协议已可生产落地。',
        takeaway: '看它有没有真实 server 生态和多客户端支持，而不是只有一份 spec。',
      },
    },
    loopSteps: [
      { title: 'Host 发起', body: 'AI 应用（host，如 Claude Code、IDE）内嵌一个或多个 MCP client，决定要接哪些能力。' },
      { title: 'Client 连 Server', body: '每个 client 通过 stdio 或 Streamable HTTP，用 JSON-RPC 2.0 连上一个 MCP server。' },
      { title: 'Server 暴露原语', body: 'server 把后端的 tools（可调用动作）、resources（可读数据）、prompts（模板）按协议暴露出来。' },
      { title: '模型调用', body: '模型发现并调用这些原语，server 执行后把结果按协议回传，进入模型上下文。' },
      { title: '复用与组合', body: '同一个 server 任何兼容客户端都能用，多个 server 可组合，集成从 N×M 收敛成 N+M。' },
    ],
    readerCanJudge: [
      '它讲的 MCP 是 host/client/server 三方 + JSON-RPC + transport + tools/resources/prompts 原语，还是只会说一句“统一的工具调用协议”。',
      '它是不是把 MCP 和普通 function calling 混为一谈——MCP 的价值在跨客户端可复用的标准，不在单次工具调用本身。',
      '有没有真实的 server 生态和多客户端采用，还是只停留在一份 spec。',
    ],
  },
  'multi-agent-orchestration': {
    title: 'Multi-Agent Orchestration',
    subtitle: '多智能体编排',
    valueProp:
      '多智能体编排研究的是：当单个 agent 的能力被任务复杂度突破时，如何协调多个 agent 协作。核心不是“多就是好”，而是一组明确的工程模式之争——Anthropic 的 orchestrator-worker（主控并行调度专职 subagent）、OpenAI Agents SDK 的 handoffs（控制权显式移交）与 manager（子 agent 当工具调）、LangGraph 的 supervisor/network/hierarchical 拓扑，以及 Cognition 提出的“写操作保持单线程、用 context engineering 而非多 agent 兜底”的审慎反命题。',
    problem:
      '把多个 LLM agent 拼在一起容易，让它们可靠协作很难：任务怎么拆、控制权怎么交、状态和上下文怎么共享、何时根本不该上多 agent。一个 grounded 的判断必须呈现 2025 年最著名的“agent 架构之争”——Anthropic 的并行 orchestrator-worker 与 Cognition 的单线程审慎派针锋相对——而不是只罗列一堆框架。',
    whyRead:
      '这页把散落在 Anthropic 工程博客、OpenAI/LangGraph/AutoGen/CrewAI 框架文档、Cognition 反方檄文和综述论文里的编排模式，收拢成“该不该上多 agent、上哪种拓扑、状态怎么共享”的可判断决策框架，并逐条核对了来源真伪（修掉了张冠李戴的论文编号和失效文档）。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: '2025 年多 agent 编排成为框架与实验室的主战场，但同时出现“别盲目上多 agent”的强力反方，方向之争本身就是最重要的信号。',
        takeaway: '信号提示这是热点，但结论要落到具体编排模式和它们的取舍。',
      },
      official_definition: {
        title: '官方定义',
        body: 'Anthropic 把多 agent 系统定义为“多个在循环里自主用工具的 agent 协作”，核心模式是 orchestrator-worker；OpenAI Agents SDK 给出 handoffs 与 manager 两种范式。',
        takeaway: '看它能不能说清具体编排拓扑，而不是停在“多个 agent 一起干活”。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'Cognition 的《Don’t Build Multi-Agents》等一手论述解释了为什么有人主张写操作单线程、靠 context engineering 而非多 agent。',
        takeaway: '反方观点补足张力，是判断“该不该上多 agent”的关键一极。',
      },
      paper_foundation: {
        title: '论文根基',
        body: 'LLM 多智能体综述（Guo et al.）与协作机制综述梳理了协作/编排机制的研究谱系——注意核对论文编号与标题是否对得上，本主题修正过张冠李戴。',
        takeaway: '综述给全景，但具体引用必须回源核对编号。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'LangGraph、AutoGen（已演进到 v0.4 / Microsoft Agent Framework）、CrewAI、OpenAI Agents SDK 是落地编排的主流积木；OpenAI Swarm 已废弃，被 Agents SDK 取代。',
        takeaway: '看它用的框架是否是现状（Swarm 已过时），以及拓扑选择有没有理由。',
      },
    },
    loopSteps: [
      { title: '判断要不要多 agent', body: '先问单 agent 加 context engineering 是否够——Cognition 的反命题提醒：多 agent 不是默认答案。' },
      { title: '选编排拓扑', body: 'supervisor（主管-工人）、network（去中心网状）、hierarchical（分层主管）、handoff（控制权交接）各有适用场景。' },
      { title: '拆任务派活', body: 'orchestrator 把任务拆给专职 subagent，或让子 agent 作为工具被主控调用。' },
      { title: '共享状态与上下文', body: '决定 agent 之间怎么传状态、记忆和中间结果，避免上下文错配导致互相迷路。' },
      { title: '聚合与验证', body: '把多 agent 的产出收拢、去重、验证，再交付——并发越多越要防结果发散。' },
    ],
    readerCanJudge: [
      '它讲的是真·多 agent 协作（多个 agent 各自在循环里用工具），还是把单 agent 的内层推理循环说成了多 agent。',
      '它有没有呈现 orchestrator-worker 与单线程审慎派的对立，还是只罗列了一堆框架。',
      '它用的框架是不是现状——OpenAI Swarm 已废弃，被 Agents SDK 取代。',
    ],
  },
  'reasoning-models': {
    title: 'Reasoning Models',
    subtitle: '推理模型',
    valueProp:
      '推理模型是经强化学习后训练、在推理阶段投入额外算力（测试时计算）先“想”再答的一类模型——通过显式思维链、过程监督和自我验证，在数学/代码/科学等需多步逻辑的任务上系统性超越同规模通用 LLM。代表作 OpenAI o 系列、DeepSeek-R1。',
    problem:
      '难点在分清真·推理模型和只是被加了 CoT 话术的普通 LLM：看它是否真做了 RL 后训练、是否在推理时花算力换准确率、过程监督有没有落地——而不是看它会不会一步步“装作在思考”。这关系到产品团队怎么评估下一代 AI 的能力边界与性能/成本权衡。',
    whyRead:
      '这页把概念锚在一手来源上：OpenAI o1 的发布与 system card、DeepSeek-R1 论文（纯 RL 激发推理）、《Let’s Verify Step by Step》（过程监督奠基）、测试时计算 scaling 论文，并修掉了源包里张冠李戴的论文编号和失效 URL，帮你把“推理模型”从流行词拉回可验证的范式判断。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'OpenAI o 系列发布与 DeepSeek-R1 开源（2025.01 引爆）把“推理时计算”从研究推向产品与开发者社区，2025–2026 o3/o4、开源推理模型持续刷新边界。',
        takeaway: '信号说明范式已成立，但定义要回到训练方式和测试时计算的事实。',
      },
      official_definition: {
        title: '官方定义',
        body: 'OpenAI 官方把 o 系列定义为“经大规模 RL 训练、用思维链推理、回答前花更多时间思考”的模型——三个支柱是 RL 后训练、测试时计算、显式 CoT。',
        takeaway: '会 CoT 不等于推理模型；要看它是否真做了 RL 后训练并在推理时花算力。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'Noam Brown 等人的公开访谈解释了为什么“推理时搜索/思考”能换来准确率，把扑克 AI 的思想带进 LLM。',
        takeaway: '访谈补范式动机，不替代对训练与评测事实的核对。',
      },
      paper_foundation: {
        title: '论文根基',
        body: '《Let’s Verify Step by Step》证明步骤级过程监督优于结果监督；测试时计算 scaling 论文证明推理时投算力可比扩参数更有效；DeepSeek-R1 证明纯 RL 可激发推理。',
        takeaway: '这三条是范式的硬根基——过程监督、测试时计算、RL 激发，缺一不算真懂。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'DeepSeek-R1 开源权重与蒸馏模型、各家推理 API 让范式可被复用与验证；MATH 等 benchmark 提供能力边界的度量。',
        takeaway: '看它有没有可复现的实现与可验证的评测，而不是只有一句“会推理”。',
      },
    },
    loopSteps: [
      { title: 'RL 后训练', body: '在预训练之上用大规模强化学习，让模型学会用思维链推理（DeepSeek-R1 甚至用纯 RL 的 R1-Zero 激发）。' },
      { title: '过程监督', body: '用步骤级奖励（PRM）而非只看最终答案，训练模型把每一步推对——《Let’s Verify Step by Step》奠基。' },
      { title: '测试时计算', body: '推理阶段投入更多算力“先想再答”，用思考长度换准确率，而不是靠扩大参数。' },
      { title: '自我验证', body: '模型在思维链里自检、回溯、纠错，逼近可验证的正确答案。' },
      { title: '边界评测', body: '在数学/代码/科学 benchmark 上度量能力边界，权衡准确率与推理成本。' },
    ],
    readerCanJudge: [
      '它是不是真·推理模型——做了 RL 后训练、推理时花算力换准确率、过程监督落地，还是只是被加了 CoT 话术的普通 LLM。',
      '它讲的过程监督、测试时计算、RL 激发这三个支柱有没有真实论文支撑，还是泛泛而谈。',
      '它的能力主张有没有可复现实现和 benchmark 支撑，还是只停在发布稿口径。',
    ],
  },
  'agentic-coding': {
    title: 'Agentic Coding',
    subtitle: '智能体写代码',
    valueProp: '从代码补全走向能理解仓库、调用工具、修改文件并接受验证的开发流程。',
    problem:
      '这个主题关心 AI 写代码能力怎样从补全片段，进入真实仓库、真实 issue、真实工具和真实验证。',
    whyRead:
      '这个主题把模型能力、官方产品、评测论文和工程入口放在同一张证据图里，避免只看单个产品发布。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: '人物和实践者材料只负责提示这个方向正在被真实开发者采用。',
        takeaway: '先判断信号来自真实使用还是产品宣传。',
      },
      official_definition: {
        title: '官方定义',
        body: '官方材料负责确认产品到底进入了哪些开发动作。',
        takeaway: '看它是否覆盖上下文、工具、修改和验证。',
      },
      transcript_context: {
        title: '访谈语境',
        body: '长访谈和视频帮助理解开发者为什么改变工作方式。',
        takeaway: '用来补动机，不用来替代产品边界。',
      },
      paper_foundation: {
        title: '论文根基',
        body: '论文和 benchmark 说明真实仓库任务为什么比 demo 更接近价值判断。',
        takeaway: '看能力边界和评测方式。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'CLI、SDK、自动化和集成入口决定它能不能进入团队流程。',
        takeaway: '看它是否可被重复使用和验证。',
      },
    },
    loopSteps: [
      { title: '理解任务', body: '读取仓库、issue、上下文和约束。' },
      { title: '调用工具', body: '让模型通过工具进入文件、终端、搜索和外部服务。' },
      { title: '修改代码', body: '在真实工程里生成、编辑和组织变更。' },
      { title: '接受验证', body: '用测试、benchmark、review 和用户反馈判断结果。' },
      { title: '沉淀流程', body: '把能复用的动作变成团队工作流。' },
    ],
    readerCanJudge: [
      '产品是否真的覆盖真实开发任务，而不是只展示 demo。',
      '论文评测和产品实现是否对得上。',
      '团队能否把它接进现有研发流程。',
    ],
  },
  'context-engineering': {
    title: 'Context Engineering',
    subtitle: '上下文工程',
    valueProp:
      'Context Engineering 不是把 prompt 写长，而是设计 agent 每一步能看到什么：指令、记忆、检索结果、工具说明、运行状态和验证反馈都要被当成运行时资源管理。',
    problem:
      '单次问答里，上下文常常只是一个提示词；长任务和 agent 工作流里，上下文会变成系统的燃料和负担。信息放错、放多、放旧，都会让 agent 迷路；信息切得准、更新得及时，agent 才能在多轮任务里保持目标、使用工具并接受验证。',
    whyRead:
      '这页用 Anthropic 的官方上下文工程文章、Claude Code memory、MCP、RAG、MemGPT 和 Lost in the Middle 等来源，把“上下文工程”从流行词拉回可验证的系统设计问题。',
    roleInsights: {
      signal: {
        title: '实践者词汇',
        body: '社区开始用 Context Engineering 描述一种比 prompt tips 更宽的工作：把信息供给、记忆、检索和工具边界一起设计。',
        takeaway: '信号说明词在形成，但定义要回到官方材料和研究根基。',
      },
      official_definition: {
        title: '官方边界',
        body: 'Anthropic 的 agent 与 context engineering 材料把上下文放进模型、工具、工作流和状态共同组成的系统里。',
        takeaway: '官方材料负责界定它不是单纯提示词优化。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'Every 的 Claude Code / Codex 访谈可补足团队真实使用 agent 时如何处理上下文、交接和工作流，但强引文仍要逐条回源。',
        takeaway: '访谈只补实践语境，不替代定义。',
      },
      paper_foundation: {
        title: '论文根基',
        body: 'Lost in the Middle 说明长上下文有位置偏差，RAG 解释外部知识如何进入上下文，MemGPT 解释显式记忆管理为什么必要。',
        takeaway: '更长上下文不等于更好上下文，工程重点是选、排、存、更新。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'Claude Code memory、slash commands 和 MCP 把上下文变成可配置的运行时机制，而不是藏在一次 prompt 里。',
        takeaway: '能被写成文件、协议、工具和检查点，才算进入工程层。',
      },
    },
    loopSteps: [
      { title: '定义任务视野', body: '先判断 agent 当前这一步需要目标、约束、历史、外部事实、工具说明还是验证反馈。' },
      { title: '组织信息来源', body: '把系统指令、memory、RAG、工具返回、用户偏好和状态文件分层，不让它们挤成一坨长 prompt。' },
      { title: '控制上下文预算', body: '用检索、摘要、压缩、优先级和淘汰规则处理窗口限制，避免旧信息和噪声占位。' },
      { title: '让工具生成新上下文', body: '工具调用、文件读取、测试结果和外部查询会把新事实带回来，下一轮要把它们放到正确位置。' },
      { title: '用验证回路更新记忆', body: '把失败模式、完成条件和用户纠正写回可复用记忆，下一次任务从更准的上下文开始。' },
    ],
    readerCanJudge: [
      '一个 agent 产品说自己有长上下文时，它到底有没有处理位置偏差、噪声和旧信息，而不是只把窗口做大。',
      '它的 memory、retrieval、tools 和 instructions 是可管理的运行时机制，还是一次性塞进 prompt 的文本块。',
      '系统有没有把验证结果和用户纠正写回可复用上下文，让下一轮任务真的变准。',
    ],
  },
  'ai-evals': {
    title: 'AI Evals',
    subtitle: 'AI 评测',
    valueProp:
      'AI Evals 是把“模型 / agent 的输出好不好、安不安全、有没有真的做完”变成可测量、可回归的工程实践——而不是靠人肉抽查或刷榜单。',
    problem:
      'AI 产品大量上线后，瓶颈从“能不能做”转向“怎么知道它真的做对了”。Evals 被当成 AI 时代的单元测试：LLM-as-a-judge 让没有标注也能给输出打分，agent-as-a-judge 把评测从单轮答案推进到多步 agent 轨迹。但关键一环常被跳过——judge 本身也要被校准、对齐人类偏好（“谁来验证判官”），否则只是把判断外包给另一个没被验证的模型。和 Loop Engineering 直接咬合：/goal 背后“独立模型判定是否完成”就是把 eval 内嵌进循环的一种形态。',
    whyRead:
      '这页用 LLM-as-a-judge、Agent-as-a-judge、G-Eval、EvalGen 论文，OpenAI / Langfuse / LangSmith 的官方评测定义，和 promptfoo、Arize Phoenix 等落地工具，把“评测驱动开发”钉在真实来源上，帮你分清真有 eval 回归的团队和只会 demo 的。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'Hamel Husain、Cameron Wolfe 等实践者把关注点从“模型够不够强”推向“你有没有一套能快速迭代的评测系统”。',
        takeaway: '信号提示方向，结论要回到方法论文和评测定义。',
      },
      official_definition: {
        title: '官方定义',
        body: 'OpenAI、Langfuse、LangSmith 定义 dataset / evaluator / experiment 这套评测词汇，以及 LLM-as-a-judge 怎么打分。',
        takeaway: '先看产品到底把“一次评测”定义成了什么。',
      },
      transcript_context: {
        title: '访谈语境',
        body: '深讲视频和走读指南补足动机：为什么单轮指标评不了自主的多步 agent。',
        takeaway: '补直觉，不替代论文方法和判官校准。',
      },
      paper_foundation: {
        title: '论文与谱系',
        body: 'LLM-as-a-judge（MT-Bench）→ G-Eval 打分表 → Agent-as-a-judge → “谁来验证判官”（EvalGen），是同一条评测方法的演进。',
        takeaway: '看清 judge 的能力边界和偏置，别把它当真理。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'OpenAI Evals、promptfoo、Arize Phoenix、Langfuse 把评测做成可注册、可自动化、连线上 trace 的流水线。',
        takeaway: '能离线回归 + 线上持续评 + judge 可校准，才算真落地。',
      },
    },
    loopSteps: [
      { title: '定义成功标准', body: '先把“什么算对、什么算安全”写成可判定的准则，而不是模糊的“看起来不错”。' },
      { title: '攒评测集', body: '收集真实输入和典型失败样本，建一个能回归的 eval set，而不是上线后才发现问题。' },
      { title: '自动打分', body: '用 LLM-as-a-judge / agent-as-a-judge 对输出或多步轨迹批量打分，无标注也能跑起来。' },
      { title: '校准判官', body: '拿人工标注对齐 judge——“谁来验证判官”，judge 没校准的评测不算数。' },
      { title: '回归与监控', body: '把评测接进 CI 和线上 trace，每次改动都回归、线上持续监控，发现漂移再回到第 1 步。' },
    ],
    readerCanJudge: [
      '这个产品 / 团队是真有 eval set 和回归，还是只靠 demo 和人肉抽查。',
      '它的 judge（LLM / agent-as-judge）有没有被人工校准过，还是把判断外包给一个没被验证的模型。',
      '评测覆盖的是单轮输出，还是能评多步 agent 的完整轨迹和工具调用。',
    ],
  },
  rag: {
    title: 'Retrieval-Augmented Generation (RAG)',
    subtitle: '检索增强生成',
    valueProp:
      'RAG 让大模型「开卷答题」——回答前先用检索器从外部知识库取回相关段落、作为上下文喂给模型，把幻觉换成可溯源的事实。它最早由 Lewis et al.（2005.11401, 2020）系统提出，定义为「结合参数化记忆与非参数化记忆的语言生成」，核心工程链是召回（BM25/dense/hybrid）→ 重排（rerank）→ 切块（chunking）→ 引用 grounding → 评估。',
    problem:
      '把外部知识接进 LLM 不是「塞进 prompt」那么简单：召回不准、chunk 切坏、重排缺位、没有引用与评估，都会让答案漂移或幻觉。2024–2025 的「长上下文是否取代 RAG」之争后，业界共识是 RAG 没死而是进化——在生产检索负载上比堆长上下文更省更快，仍是给模型接私有/实时数据的主路径。要分清它和「上下文工程」（运行时窗口里塞什么）、「深度研究」（多跳自主调研）是不同的层。',
    whyRead:
      '这页用 RAG 原论文、DPR/ColBERT 召回奠基、RAG 综述与 RAGAS 评估、Anthropic Contextual Retrieval、LlamaIndex/DSPy/LangChain/Cohere 工程入口，把 RAG 钉在一手来源上，帮你分清真有「召回→重排→切块→引用→评估」完整链路的做法，和只会接一条基础 retriever 的 demo。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'Anthropic Contextual Retrieval 把上下文化 chunk + BM25 + rerank 叠加，top-20 失败率降 67%；「长上下文 vs RAG」之争与「RAG 已死/未死」讨论标记了这条线的边界在被重新划定。',
        takeaway: '信号说方向，结论要回到召回/重排/评估的真实做法。',
      },
      official_definition: {
        title: '官方定义',
        body: 'NVIDIA 给出最广引用的工业界定义（可引用来源 + 降幻觉）；RAG 综述（2312.10997）划分 Naive/Advanced/Modular RAG；LlamaIndex 文档定义 RAG 五步。',
        takeaway: '看它讲的是完整检索链路，还是停在「接个向量库」。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'RAG 命名者 Patrick Lewis（MLST）讲 RAG 起源与评估挑战；Jerry Liu（Latent Space）讲为何 RAG 是生产 AI 核心、「text 是通用接口」。',
        takeaway: '访谈补动机，不替代对工程链路的判断。',
      },
      paper_foundation: {
        title: '论文根基',
        body: 'RAG 原论文（2005.11401）参数化+非参数化记忆结合；DPR（2004.04906）dense 召回；ColBERT（2004.12832）late interaction；RAGAS（2309.15217）无参考评估。',
        takeaway: '看清它的召回/重排/评估属于哪条谱系，别把「接 retriever」当 RAG 全部。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'ColBERT / DSPy（Stanford）、LangChain 编排、Cohere Rerank 端点是把召回、声明式管线、重排落到可复用实现的入口。',
        takeaway: '有召回器 + 重排 + 可优化管线，才算真落地。',
      },
    },
    loopSteps: [
      { title: '召回', body: '用 BM25（稀疏）、dense 向量或 hybrid 检索，从知识库取回候选段落——召回不准，后面全白搭。' },
      { title: '重排', body: '用 reranker（如 Cohere Rerank、ColBERT late interaction）把 top-N 候选收敛到真正相关的 top-K。' },
      { title: '切块', body: 'chunking 策略决定证据粒度；上下文化 chunk（Contextual Retrieval）能显著降低召回失败率。' },
      { title: '引用 grounding', body: '把检索到的段落作为上下文喂给模型，并让答案绑定可溯源的引用，而不是凭参数记忆作答。' },
      { title: '评估回归', body: '用 RAGAS 等做 faithfulness / context relevance 评估，把「检索准不准、答得实不实」变成可回归指标。' },
    ],
    readerCanJudge: [
      '它讲的是完整检索链路（召回→重排→切块→引用→评估），还是只接了一条基础 retriever。',
      '它有没有处理 chunking 与重排——这两环常被跳过，却是召回质量的关键。',
      '它有没有 RAG 评估（faithfulness/上下文相关性），还是只靠「看起来答对了」。',
    ],
  },
  'deep-research': {
    title: 'Deep Research',
    subtitle: '深度研究',
    valueProp:
      'Deep Research 是一类「调研型 agent」：给一个复杂问题，AI 自己规划、反复联网搜读、交叉验证，最后产出一份带引用的长报告——把数小时的桌面调研压成几分钟。OpenAI 官方定义是「用 reasoning 综合海量在线信息、替你完成多步研究任务的 agent」。',
    problem:
      'Google 2024.12 首发、OpenAI 2025.02 跟进后，Deep Research 在一年内从「会写报告的助手」演进为「能边查边推理、自主决定查多深」的自治 agent。它是把「推理模型 + agentic 搜索」两条线收口的第一个杀手级产品形态，也是检验 agent 长程自治能力的标尺（BrowseComp）。要和「多智能体编排」（多 agent 协作）、「智能体写代码」（写码 agent）分清——它是单一调研任务的深度。',
    whyRead:
      '这页用 OpenAI/Google 官方发布与系统卡、Anthropic 多 agent 调研工程博客、ReAct/Self-Ask/Search-o1 奠基论文、BrowseComp 基准，以及 gpt-researcher/open_deep_research 等开源实现，把 Deep Research 钉在一手来源上，帮你分清真有「规划→搜→读→验证→综合」自治循环的产品，和只会拼几条搜索结果的。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'Google 把 Deep Research 从写报告助手升级为整夜自治尽调（Deep Research Max 单任务 100+ 来源），巨头同台竞速本身是最强信号。',
        takeaway: '信号说趋势，结论要回到自治循环的真实做法。',
      },
      official_definition: {
        title: '官方定义',
        body: 'OpenAI 定义为「用 reasoning 综合在线信息完成多步研究的 agent」；Google 强调 agentic 规划把复杂查询拆成研究计划；Anthropic 公开 orchestrator-worker 调研架构。',
        takeaway: '看它讲不讲清规划+自主浏览+综合，而非只说「会搜资料」。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'Perplexity CEO Aravind Srinivas 讲「answer engine 而非 search engine」的产品哲学，是 Deep Research 的愿景源头。',
        takeaway: '访谈补动机，不替代对自治循环的判断。',
      },
      paper_foundation: {
        title: '论文根基',
        body: 'ReAct（2210.03629）推理-行动交错、Self-Ask（2210.03350）子问题自拆、Search-o1（2501.05366）agentic 搜索嵌入推理链、BrowseComp 浏览基准。',
        takeaway: '看清它的自治循环属于哪条谱系，别把单次搜索当 Deep Research。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'gpt-researcher（planner→executors→publisher）、LangChain open_deep_research、Jina DeepSearch 是把自治调研循环落到可复用实现的入口。',
        takeaway: '能多跳搜读、带引用产报告，才算真落地。',
      },
    },
    loopSteps: [
      { title: '规划', body: 'agent 把复杂问题拆成研究计划/子问题（self-ask），而不是一次搜索就答。' },
      { title: '迭代搜索', body: '按计划反复联网检索，边查边决定下一步查什么（ReAct 式推理-行动交错）。' },
      { title: '阅读与抽取', body: '打开网页、读全文、抽取证据，而不是只看搜索摘要。' },
      { title: '交叉验证', body: '对照多个来源核实，发现冲突就再查，逼近可靠结论。' },
      { title: '综合带引用报告', body: '把证据综合成结构化长报告，每条结论绑定可溯源引用。' },
    ],
    readerCanJudge: [
      '它是真·多跳自治调研（规划→搜→读→验证→综合），还是一次搜索拼几条结果。',
      '它会不会边查边推理、自主决定查多深，还是固定步数的模板。',
      '产出有没有可溯源引用和交叉验证，还是无源的长文。',
    ],
  },
  'model-training': {
    title: 'Model Training',
    subtitle: '模型训练',
    valueProp:
      '模型训练讲的是一个基础模型怎么从零被预训练出来、再被 SFT/RLHF/RLVR 调教成有用助手的全链路：预训练（自监督下一词预测，规模由 scaling laws 支配）→ 后训练/对齐（SFT → RLHF → DPO → RLVR/GRPO）。InstructGPT 证明 1.3B 经 RLHF 的模型输出比 175B 的 GPT-3 更受偏好。',
    problem:
      '当 Ilya Sutskever 在 NeurIPS 2024 宣告「我们所知的预训练将终结」（数据是 AI 的化石燃料、已达峰值），行业重心从「堆预训练数据」转向「后训练/RL/推理时算力」，「怎么训」成了模型能力差异的主战场。要和「推理模型」分清——那条讲推理时算力这个结果，这条讲训练侧成因（GRPO 怎么训出 R1、scaling law 怎么定预训练规模）。',
    whyRead:
      '这页用 Scaling Laws/Chinchilla/InstructGPT/DPO/GRPO/PPO 奠基论文、DeepSeek-V3/R1 与 Llama 3 技术报告、Tülu 3 开源后训练配方、Schulman/Karpathy 的讲解，以及 nanoGPT/TRL/open-instruct 训练栈，把全链路训练钉在一手来源上。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'Ilya「预训练见顶」宣告 + Tülu 3 开源后训练四阶段配方，标记重心从预训练转向后训练/RL。',
        takeaway: '信号说方向在转，结论要回到训练方法的真实差异。',
      },
      official_definition: {
        title: '官方定义',
        body: 'DeepSeek-V3（671B MoE 全链路）、DeepSeek-R1（纯 RL 涌现推理）、InstructGPT 官方博客、Llama 3 报告披露真实预训练+后训练流程。',
        takeaway: '看它讲的是哪一段训练，别把「微调」当全链路。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'PPO/RLHF 创造者 John Schulman 亲述后训练；Karpathy 用 Base→SFT→RLHF 三阶段框架权威科普。',
        takeaway: '访谈补直觉，不替代对论文方法的核对。',
      },
      paper_foundation: {
        title: '论文根基',
        body: 'Scaling Laws（2001.08361）/ Chinchilla（2203.15556）定预训练规模；InstructGPT（2203.02155）RLHF 奠基；DPO（2305.18290）化简；GRPO（2402.03300）省显存 RL；PPO（1707.06347）底层引擎。',
        takeaway: '看清预训练 scaling 与后训练 RL 这两条主线的真实谱系。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'nanoGPT（预训练最小范本）、TRL（SFT/DPO/GRPO 一站式）、open-instruct（Tülu 3 全开源后训练）是把训练落到可跑代码的入口。',
        takeaway: '能跑通预训练循环和后训练栈，才算真落地。',
      },
    },
    loopSteps: [
      { title: '预训练', body: '在海量文本上自监督下一词预测，规模由 scaling laws / Chinchilla 决定模型与数据的等比配比。' },
      { title: 'SFT 监督微调', body: '用人工示范数据让基础模型学会「听话」做任务，是后训练第一步。' },
      { title: 'RLHF / 偏好对齐', body: '用人类偏好训奖励模型 + PPO 优化（InstructGPT），或 DPO 直接优化偏好免奖励模型。' },
      { title: 'RLVR / GRPO', body: '用可验证奖励做 RL（GRPO），DeepSeek-R1 证明纯 RL 即可涌现推理能力。' },
      { title: '评估与迭代', body: '在 benchmark 上度量能力与对齐，回到配方某一环继续调。' },
    ],
    readerCanJudge: [
      '它讲的是全链路（预训练 scaling + 后训练 RL），还是只说了「微调」一段。',
      '它的后训练用的是 RLHF/DPO/GRPO 哪条路线，取舍清不清楚。',
      '能力主张有没有真实技术报告和可复现训练栈支撑，还是只有发布稿口径。',
    ],
  },
  'self-evolving-agents': {
    title: 'Self-Evolving Agents',
    subtitle: '自进化智能体',
    valueProp:
      '自进化 agent 系统让 AI 在跑任务的过程中自己反思、攒技能、改代码，越用越强——而不是出厂即定型。改进发生在权重之外：语言反思修正行为（Reflexion）、积累可复用技能库（Voyager）、乃至自动改写自己的提示、工具与代码（Darwin Gödel Machine）。',
    problem:
      '现有 agent 多依赖人工配置、部署后保持静态，限制了对动态环境的适应。2025 年 Darwin Gödel Machine 让 agent 自我改写代码、SWE-bench 从 20% 升到 50%，首次工程证明「开放式递归自我改进」对编码 agent 可实现。要和「循环工程」分清——那是人设计自动循环跑任务，这条是 agent 改自己；也和「模型训练」的训练侧 self-reward 分清——这条是运行时、权重之外的自我改进。',
    whyRead:
      '这页用 Reflexion / Voyager / STaR / Self-Refine 奠基论文、Darwin Gödel Machine 与 ADAS、两篇自进化 agent 综述、Jeff Clune 讲座，以及官方开源实现，把这个高度前沿、最容易出假源的主题钉在逐条核对过的一手来源上。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'MIT Tech Review 把「AI 自我改进」列为 2025 定义性方向；Sakana 的 Darwin Gödel Machine 给出 SWE-bench 20%→50% 的自我改进硬证据。',
        takeaway: '信号说方向，结论要回到自我改进发生在哪一层（反思/技能/改码）。',
      },
      official_definition: {
        title: '官方定义',
        body: 'Darwin Gödel Machine 定义「维护变体谱系、经验证改进的自改代码 agent」；ADAS 定义「meta agent 编程出更强 agent」；两篇综述给出统一的反馈闭环框架。',
        takeaway: '看它的自我改进是有验证闭环，还是只喊「会进化」。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'Jeff Clune（DGM/ADAS/AI Scientist 作者）讲开放式算法三支柱；Jim Fan（Voyager 团队）讲终身学习 agent 如何自我改进。',
        takeaway: '一手作者讲动机，不替代对验证机制的判断。',
      },
      paper_foundation: {
        title: '论文根基',
        body: 'Reflexion（2303.11366）语言反思、Voyager（2305.16291）技能积累、STaR（2203.14465）自举推理、Self-Refine（2303.17651）自我精炼、Gödel Machine（Schmidhuber）理论谱系。',
        takeaway: '看清它属于反思/技能/改码哪条谱系，别把一次 self-refine 当递归自我改进。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'noahshinn/reflexion、MineDojo/Voyager、jennyzzt/dgm 官方开源，是把自我改进机制落到可运行实现的入口。',
        takeaway: '有可跑的自反思/技能库/自改码实现，才算真落地。',
      },
    },
    loopSteps: [
      { title: '执行与观察', body: 'agent 跑任务，从环境反馈/测试结果里拿到「这次做得怎样」的信号。' },
      { title: '自我反思', body: '用语言把失败原因写进 episodic memory（Reflexion），不更新权重就改进下一轮决策。' },
      { title: '技能积累', body: '把验证成功的行为固化成可复用 skill（Voyager 的代码 skill library），越攒越强。' },
      { title: '自改提示/工具/代码', body: '更激进的形态（DGM）让 agent 改写自己的提示、工具乃至代码，经验证才保留。' },
      { title: '验证留存', body: '所有自我改进都要经验证（测试/基准）才纳入，避免越改越坏——这是和空话的分界线。' },
    ],
    readerCanJudge: [
      '它的自我改进发生在哪一层——语言反思、技能积累，还是真的自改代码，验证闭环清不清楚。',
      '是 agent 改自己（自进化），还是人设计的自动循环（loop-engineering），两者差一层。',
      '引用的论文/仓库是真实可核（Reflexion 2303.11366、Voyager 2305.16291、DGM 2505.22954），还是凭空捏的 arXiv。',
    ],
  },
  'world-models': {
    title: 'World Models',
    subtitle: '世界模型',
    valueProp:
      '世界模型让 AI 在脑内建一个可预测、可交互的「世界」——不是续写文字，而是模拟「做这个动作世界会怎样」。技术起点是 Ha & Schmidhuber 2018：用无监督方式学环境的压缩时空表征，智能体甚至能完全在自己「做的梦」里训练策略再迁移回真实环境。',
    problem:
      '2024–2026 世界模型成为产业主线，且分成三派路线之争：一派把视频生成推到「世界模拟器」（Sora）；一派认为纯自回归 LLM 缺物理/因果/空间理解、必须另起炉灶走 JEPA（LeCun，2026 离 Meta 创 AMI Labs 押注于此）；第三派是李飞飞的空间智能/3D 世界生成（World Labs）。这页帮你分清这三条路线，而不是把「会生成视频」就当世界模型。',
    whyRead:
      '这页用 Ha & Schmidhuber 奠基论文、Genie / DreamerV3 / I-JEPA / V-JEPA 2 论文、Sora 世界模拟器技报与 Genie 3 / World Labs 官方、LeCun/Hassabis/李飞飞的一手论述，把世界模型从流行词拉回三条可验证的技术路线。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: '「Is Sora a World Simulator?」综述质询视频生成是否真模拟物理；Genie 3 第三方评测点出自回归架构的记忆一致性挑战——边界正在被重新划定。',
        takeaway: '信号说热度，结论要回到"有没有可预测的内部表征"。',
      },
      official_definition: {
        title: '官方定义',
        body: 'LeCun 的 JEPA 蓝图（嵌入空间预测非重建像素）、OpenAI「视频生成即世界模拟器」、Genie 3 实时交互世界、World Labs 空间智能——四种官方定义代表不同路线。',
        takeaway: '看它走的是生成式像素、非生成式 JEPA，还是 3D 空间智能。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'LeCun 反自回归 LLM、押注世界模型；Hassabis 称世界模型 + 自动化实验是 AGI 两大关键；李飞飞亲笔讲空间智能是下一前沿。',
        takeaway: '三位领军人的路线分歧本身是判断世界模型的关键。',
      },
      paper_foundation: {
        title: '论文根基',
        body: 'World Models（1803.10122）压缩时空表征 + 梦中训练、Genie（2402.15391）潜动作可玩、DreamerV3（2301.04104）通用 RL、I-JEPA（2301.08243）/ V-JEPA 2（2506.09985）非生成式预测。',
        takeaway: '看清它属于生成式还是 JEPA 谱系，别把视频生成等同世界模型。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'World Labs 的 Marble（首个商用世界模型，生成持久可下载 3D 环境）、facebookresearch/ijepa、hardmaru 的 World Models 实验代码是可上手的入口。',
        takeaway: '能生成可交互/可预测的环境，才算从论文走进产品。',
      },
    },
    loopSteps: [
      { title: '感知压缩', body: '把高维观测（像素/视频）压成低维的世界内部表征（VAE/编码器），抓住动态本质。' },
      { title: '预测动态', body: '在表征空间预测「下一步世界会怎样」——生成式重建像素，或 JEPA 式只在嵌入空间预测。' },
      { title: '想象/模拟', body: '用世界模型在脑内「做梦」推演不同动作的后果，而不必真在环境里试错。' },
      { title: '规划与决策', body: '基于想象的推演做规划（Dreamer 在梦里训策略、V-JEPA 2 零样本机械臂规划）。' },
      { title: '交互生成', body: '更进一步生成可导航、可交互、记忆一致的世界（Genie 3、World Labs Marble）。' },
    ],
    readerCanJudge: [
      '它建的是有可预测内部表征的世界模型，还是只会生成好看视频。',
      '它走的是生成式像素路线（Sora/Genie）、非生成式 JEPA，还是 3D 空间智能——三条路线取舍清不清楚。',
      '引用的论文是真实可核（World Models 1803.10122、Genie 2402.15391、I-JEPA 2301.08243），还是套壳。',
    ],
  },
  'embodied-ai': {
    title: 'Embodied AI / VLA',
    subtitle: '具身智能',
    valueProp:
      '具身智能 / VLA（视觉-语言-动作）把大模型搬进机器人身体：一个网络同时看图、听自然语言指令、直接输出机器人动作，端到端打通「感知—理解—执行」。代表作 RT-2、π0（Physical Intelligence）、Open X-Embodiment。',
    problem:
      '正如 LLM 成为语言的基础模型，「通用机器人策略将成为物理智能的机器人基础模型」——一个策略控制多种机器人、用少量数据特化到新任务。三大推动力：大规模跨本体机器人数据（Open X-Embodiment）、预训练 VLM 迁移网络知识到机器人（RT-2 涌现零样本泛化）、开源生态成熟（Octo/OpenVLA/LeRobot/openpi）。要和「智能驾驶」分清——那是自动驾驶这个具体领域，这条是通用机器人操作。',
    whyRead:
      '这页用 RT-1/RT-2/Open X-Embodiment/Octo/OpenVLA/π0/π0.5 论文、DeepMind 与 Physical Intelligence 官方博客、Levine/Finn 演讲，以及 LeRobot/openpi 开源栈，把具身智能钉在一手来源上，帮你判断当前机器人基础模型的真实能力边界。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'Physical Intelligence 开源 π0 被类比为「开源 LLM 加速作用」；HF LeRobot 把「democratize 机器人 AI」做成战略叙事——开源生态成熟本身是信号。',
        takeaway: '信号说趋势，能力边界要看真实任务与数据规模。',
      },
      official_definition: {
        title: '官方定义',
        body: 'DeepMind RT-2 官方把 VLA 定义为「把动作当文本 token 生成」；Physical Intelligence π0 官方提出「机器人基础模型」愿景；Gemini Robotics 是大厂入场。',
        takeaway: '看它讲的是真 VLA（看图听话出动作），还是纯仿真 demo。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'Sergey Levine（TWIML）亲述 π0 架构与数据哲学；Chelsea Finn（ICLR 2025）讲机器人基础模型的预训练 + 后训练配方。',
        takeaway: '一手作者讲方法，补足论文的设计动机。',
      },
      paper_foundation: {
        title: '论文根基',
        body: 'RT-1（2212.06817）实时离散动作、RT-2（2307.15818）VLM 知识迁移、Open X-Embodiment（2310.08864）跨本体数据、Octo/OpenVLA 开源、π0/π0.5 灵巧操作与开放世界泛化。',
        takeaway: '看清它属于哪条 VLA 谱系，以及训练数据规模与本体覆盖。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'huggingface/lerobot（机器人界的 Transformers）、Physical-Intelligence/openpi（π0 官方权重，1-20 小时数据即可调新任务）是可上手的入口。',
        takeaway: '有开源权重 + 真机工具链，才算从论文走进可复现。',
      },
    },
    loopSteps: [
      { title: '看（Vision）', body: '模型接收摄像头图像，理解场景、物体与机器人状态。' },
      { title: '听（Language）', body: '接收自然语言指令（「把杯子放进抽屉」），理解任务意图。' },
      { title: '出动作（Action）', body: '一个网络直接输出机器人动作 token / 连续控制（flow matching），端到端不分模块。' },
      { title: '跨本体迁移', body: '在 Open X-Embodiment 这类跨机器人大数据上预训练，一个策略控制多种机器人。' },
      { title: '少样本特化', body: '用少量新任务演示数据微调（openpi 1-20 小时）就特化到新任务/新环境。' },
    ],
    readerCanJudge: [
      '它是真 VLA（一个网络看图+听话+出动作），还是感知/规划/控制还在分模块手写。',
      '它的训练数据是跨本体大规模（Open X-Embodiment 级），还是单机单任务。',
      '引用的论文是真实可核（RT-2 2307.15818、π0 2410.24164、OpenVLA 2406.09246），还是套壳。',
    ],
  },
  'harness-engineering': {
    title: 'Harness Engineering',
    subtitle: '智能体脚手架',
    valueProp:
      '模型外面那层运行框架——工具暴露、上下文管线、agent 主循环、权限沙箱、子代理派发——决定了同一个模型实际能干多强的活。Anthropic 把 Claude Agent SDK 称为「general-purpose agent harness」，并指出即便前沿模型跨多个上下文窗口运行，没有精心设计的 harness 也会表现不佳。',
    problem:
      'Harness 管的不是「模型说什么」，而是「模型说的话能碰到什么、怎么碰」。2026 年这一层被独立命名为一门工程学科。它和相邻概念差一层：loop-engineering 是人设计的自动循环（外层自动化），context-engineering 是窗口里放什么（信息策略），agentic-coding 是写码这个能力——而 harness 是承载它们的运行时框架本身。',
    whyRead:
      '这页用 Anthropic「Building effective agents / Harness design」工程博客、Claude/OpenAI Agents SDK 官方文档、SWE-agent 的 ACI 论文与 ReAct，以及 smolagents/SWE-agent 开源实现，把 harness 钉在一手来源上。诚实说明：harness 没有同名经典论文，paper 层用 ACI/ReAct 这两篇真论文作奠基代替。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'O’Reilly Radar 把 harness 与 scaffolding 严格区分并命名为工程学科；awesome-harness-engineering 列表聚合 tools/patterns/evals/permissions，证明已成独立领域。',
        takeaway: '它已是一层独立工程对象，不是某个产品的内部细节。',
      },
      official_definition: {
        title: '官方定义',
        body: 'Anthropic「Building effective agents」提出 ACI、「Harness design」讲长跑 agent 脚手架；Claude/OpenAI Agents SDK 把 agent loop/tools/handoffs/guardrails 框架化。',
        takeaway: '看它讲的是 loop+tools+context+权限这一整层，还是只说「接了几个工具」。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'Boris Cherny（Pragmatic Engineer / Every）讲 Claude Code 的 agent loop、并行 agent、保持 context 精简、确定性 review——harness 设计取舍的一手。',
        takeaway: '一手访谈补「为什么这样设计 harness」。',
      },
      paper_foundation: {
        title: '论文根基（诚实代替）',
        body: 'Harness 无同名奠基论文，用最贴近的两篇真论文：SWE-agent 的 ACI（2405.15793，实证「接口设计决定 agent 强弱」）与 ReAct（2210.03629，agent 主循环理论原型）。',
        takeaway: '工程概念用工程一手源 + ACI/ReAct 奠基，不硬凑同名论文。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'Claude Agent SDK、openai/openai-agents-python、huggingface/smolagents、SWE-agent 是可嵌入/可读的 harness 实现，覆盖 loop、工具 schema、沙箱、子代理派发。',
        takeaway: '有可跑的 agent loop + 工具/沙箱实现，才算落地。',
      },
    },
    loopSteps: [
      { title: '工具暴露', body: '设计 agent 能调的工具与 schema（fewer tools beat more、渐进式披露），这是 harness 的动作空间。' },
      { title: '上下文管线', body: '管理往窗口放什么、何时压缩/重置（compaction、initializer agent），让长跑 agent 不迷路。' },
      { title: '主循环控制', body: '驱动 think→act→observe 循环（ReAct 原型），决定何时继续、何时停。' },
      { title: '权限与沙箱', body: '用 guardrails、沙箱执行、egress 控制，约束 agent 动作的安全边界。' },
      { title: '子代理派发', body: 'orchestrator 把任务派给子代理（handoffs），并回收聚合结果。' },
    ],
    readerCanJudge: [
      '它讲的是整层 harness（loop+工具+上下文+权限+子代理），还是只接了几个工具。',
      '它和 loop-engineering/context-engineering 分得清吗——harness 是承载它们的运行时框架。',
      '它的工具/沙箱/主循环有没有真实可跑实现，还是只有概念图。',
    ],
  },
  'autonomous-driving': {
    title: 'Autonomous Driving',
    subtitle: '智能驾驶',
    valueProp:
      '智能驾驶（AI 视角）让汽车用一个端到端神经网络「看像素、出方向盘」，把开车从写规则变成从海量驾驶数据里学出来的事。Tesla FSD v12 把约 30 万行 C++ 控制代码换成神经网络（「photons in, controls out」），是 Karpathy「Software 2.0」在驾驶领域最彻底的落地。',
    problem:
      '方法论核心有三：①端到端学习——传感器输入直接出控制，取代「感知→预测→规划→控制」手写 pipeline；②生成式世界模型——GAIA-1/2 学驾驶场景动态做仿真与预测；③VLA / 大模型驱动——让驾驶决策可解释、可自然语言交互（Waymo EMMA、DriveVLM）。要和「具身智能」分清——那是通用机器人 VLA，这条聚焦自动驾驶这个具体领域。',
    whyRead:
      '这页用 UniAD（CVPR 2023 best paper）、GAIA-1/2 驾驶世界模型、端到端 AD 权威综述、DriveVLM，Wayve/Waymo/comma.ai 官方，以及 Karpathy/Kendall/Ashok 的一手论述，把智能驾驶从整车宣传拉回端到端这条 AI 主线。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'Tesla FSD v12 端到端转向、Waymo EMMA 用 Gemini 驱动；同时 Karpathy 公开警告「自动驾驶未解决」——热度与审慎并存。',
        takeaway: '信号说范式成立，落地程度要看基准与真实里程。',
      },
      official_definition: {
        title: '官方定义',
        body: 'Wayve AV2.0 定义「用单一端到端神经网络替代手写 AV 栈」；Waymo 阐述大规模 ML/VLM/生成式方法；comma.ai openpilot 是开源落地。',
        takeaway: '看它走的是端到端学习，还是模块化 pipeline 套个 AI 壳。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'Alex Kendall（Wayve）讲端到端学习如何催生 AD 2.0；Ashok Elluswamy（Tesla）讲 Occupancy Networks；Karpathy 的 Software 2.0 是思想源头。',
        takeaway: '一手论述补端到端范式的动机与取舍。',
      },
      paper_foundation: {
        title: '论文根基',
        body: 'UniAD（2212.10156）规划导向统一端到端、GAIA-1/2（2309.17080/2503.20523）驾驶世界模型、端到端综述（2306.16927，270+ 论文）、DriveVLM（2402.12289）VLA 驾驶。',
        takeaway: '看清它属于端到端/世界模型/VLA 哪条线，及在 nuScenes 等基准上的表现。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'CARLA（开源仿真器）、nuScenes（多模态数据集/基准）、OpenDriveLab/UniAD（端到端代码）是训练与验证端到端驾驶的基础设施。',
        takeaway: '有可复现代码 + 标准基准，才算从论文走向工程。',
      },
    },
    loopSteps: [
      { title: '传感器输入', body: '摄像头像素、激光雷达等原始多模态输入进入统一模型，而非分模块预处理。' },
      { title: '端到端表征', body: '一个网络学场景表征（栅格化或矢量化），取代手写感知/预测/规划串联。' },
      { title: '世界模型预测', body: '生成式世界模型（GAIA）推演场景未来动态，做仿真与长尾覆盖。' },
      { title: '规划与控制', body: '规划导向地直接输出轨迹/控制（UniAD），或用 VLM 慢思考 + 快系统双栈（DriveVLM）。' },
      { title: '数据闭环', body: '从海量真实驾驶数据持续学习（Software 2.0），仿真（CARLA）+ 真车里程迭代。' },
    ],
    readerCanJudge: [
      '它是真端到端（传感器直接出控制），还是模块化 pipeline 加了个神经网络模块。',
      '它走的是端到端/驾驶世界模型/VLA 哪条线，在 nuScenes 等基准上有没有硬数字。',
      '引用的论文是真实可核（UniAD 2212.10156、GAIA-1 2309.17080、DriveVLM 2402.12289），还是套壳。',
    ],
  },
  'generative-ui': {
    title: 'Generative UI / AI Artifacts',
    subtitle: '生成式界面 / AI 工件',
    valueProp:
      'Generative UI 不是让 AI 多吐点文字，而是让模型的产出从「一段文本」变成「一个能跑、能分享的软件」——界面本身被实时生成（Vercel v0 / AI SDK），产出被钉成可持久、能调 API 和 MCP 的微应用（Claude Artifacts），连不写代码的人都能描述一句话就造出一个工具。',
    problem:
      '到 2026，瓶颈从「模型会不会写代码」挪到「用户最后到底拿到什么」。两条要分清：一条是 Generative UI——agent 直接生成界面、把 React 组件而不是纯文本流回来，"agent 就是前端"；另一条是 Artifacts——把聊天产出固化成可分享、能在里面跑 AI 的一次性软件。它和 Agentic Coding 是兄弟但不同：后者是 AI 当开发者钻进真实仓库改代码、接受验证；这一条的产出直接面向终端用户，常常由非程序员驱动。',
    whyRead:
      '这页用 Anthropic 的 build/claude-powered artifacts、Vercel v0 与 AI SDK 生成式 UI、Geoffrey Litt 的 malleable software、CHI 2025 与几篇 2026 arXiv 论文，把「AI 产出变成可运行界面」从流行词拉回可验证的产品与研究问题，帮你分清真有运行态软件的产品和只会贴一张静态截图的。',
    roleInsights: {
      signal: {
        title: '一线信号',
        body: 'InfoWorld「agent 就是前端」、Geoffrey Litt 的 malleable software 把关注点从「写个好 prompt」推向「让用户用自然语言不断重塑软件本身」。',
        takeaway: '信号说方向在变，结论要回到官方产品定义和研究根基。',
      },
      official_definition: {
        title: '官方定义',
        body: '看产品到底把产出做成了什么：Claude Artifacts 能不能持久化、分享、在里面直接调 API/MCP（按用户账号计费）；v0 / AI SDK 是不是真把模型输出当成可流式的 React 组件，而不是纯文本。',
        takeaway: '能产出运行态、可分享的软件，才算进入这条线，而不是又一个聊天框。',
      },
      transcript_context: {
        title: '访谈语境',
        body: 'Boris Cherny 讲 Artifacts 的真实用法（代码可视化、系统图、动画预览、团队共享仪表盘），补足团队为什么把产出做成可运行工件。',
        takeaway: '访谈补动机，引文须回原始视频逐字稿核对，不用二手转述替代。',
      },
      paper_foundation: {
        title: '论文根基',
        body: 'CHI 2025 把 prompt 驱动的可塑界面形式化，「LLMs are Effective UI Generators」证明能力真实，AlignUI / 渐进式生成讲怎么让生成的界面可控、少出错。',
        takeaway: '论文回答「能不能、可不可靠」，别把产品发布当能力证明。',
      },
      implementation_signal: {
        title: '工程落地',
        body: 'vercel/ai 的 streamUI、RSC 生成式 UI 参考实现、Thesys C1 第二家独立厂商，说明生成式 UI 是可实现、跨厂商的工具栈，不是单家功能。',
        takeaway: '有 SDK、参考实现和多家厂商，这条线才不只是 demo。',
      },
    },
    loopSteps: [
      { title: '描述意图', body: '用户用自然语言说要什么——一个仪表盘、一个抽认卡生成器、一张图表，而不是先去搭脚手架写代码。' },
      { title: '模型生成界面', body: '模型把产出当成可运行的东西：流式回 React 组件（生成式 UI），或固化成一个 Artifact，而不是只回一段文本。' },
      { title: '渲染成可运行软件', body: '产出在侧栏 / 页面里直接跑起来，可交互、可预览，必要时在里面调 API 或 MCP，变成真正的微应用。' },
      { title: '分享与复用', body: 'Artifact 可持久化、可分享，别人用自己的账号鉴权和计费，无需管理 API key——一次性工具也值得造和传。' },
      { title: '对话式重塑', body: '用户继续用自然语言改它——调样式、加功能、换数据，软件被「说着话」捏成自己要的样子（malleable software）。' },
    ],
    readerCanJudge: [
      '这个产品的产出到底能不能跑、能不能分享，还是只生成一张静态截图或一段代码文本。',
      '它说的是 Generative UI（运行时生成界面）还是 Artifacts（固化成可分享微应用）——两者都属这条线但解决的环节不同。',
      '生成的界面有没有可控性和可靠性兜底（结构化组件、减少语法错误），还是一锤子黑箱、改一点就崩。',
    ],
  },
};

const GENERATED_THREAD_PRESENTATIONS = generatedThreadPresentations as unknown as Record<string, ThreadPresentation>;

export function getThreadPresentationSeed(slug: string): ThreadPresentation | null {
  return THREAD_PRESENTATIONS[slug] ?? GENERATED_THREAD_PRESENTATIONS[slug] ?? null;
}
