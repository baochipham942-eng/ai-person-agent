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
