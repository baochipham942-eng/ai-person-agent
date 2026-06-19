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
  mcp: {
    title: 'Model Context Protocol',
    subtitle: '模型上下文协议',
    valueProp:
      'MCP 不是又一个工具调用 demo，而是把 AI 应用、外部工具、数据源和资源放进统一 client-server 协议里，让 agent 能用一套可复用方式接入不同系统。',
    problem:
      'Agent 产品一旦进入真实工作流，就不能只靠每家自己写一套 function calling glue。工具权限、资源发现、prompt、数据连接和 SDK 都需要稳定边界，否则每接一个服务都要重新造集成层，也很难复用和审计。',
    whyRead:
      '这页先用官方 MCP 文档、协议仓库、TypeScript / Python SDK 和 Claude Code MCP 文档建立技术边界，再用 Toolformer 解释“模型用工具”为什么需要被工程化。当前 source pack 仍缺一线采用信号和 transcript 语境，所以只算初版，不算 ready。',
    roleInsights: {
      signal: {
        title: '生态信号',
        body: 'MCP 的价值要看有没有被真实客户端、服务器、SDK 和开发者工作流采用，单看协议发布不够。',
        takeaway: '这一角色当前还薄，需要补社区采用、产品接入和实践复盘。',
      },
      official_definition: {
        title: '协议定义',
        body: '官方文档和 spec 负责定义 client、server、tools、resources、prompts 等基本对象，以及协议如何标准化上下文供给。',
        takeaway: '先看协议对象和安全边界，再看某个客户端怎么用。',
      },
      transcript_context: {
        title: '设计语境',
        body: '访谈、演讲或长解释能补 MCP 为什么这样设计、想解决哪类集成碎片化问题。',
        takeaway: '当前缺可引用 transcript，不能用二手描述替代。',
      },
      paper_foundation: {
        title: '工具使用根基',
        body: 'Toolformer 这类论文说明模型为什么需要外部工具，以及何时调用、怎么传参、怎么整合结果这些问题为何重要。',
        takeaway: '论文解释需求，协议和 SDK 解释落地。',
      },
      implementation_signal: {
        title: 'SDK 与实现',
        body: 'TypeScript SDK、Python SDK 和 Claude Code MCP 文档说明 MCP 已经进入可实现、可集成的工程层。',
        takeaway: '有 SDK 和产品接入，MCP 才不只是规范文本。',
      },
    },
    loopSteps: [
      { title: '先读协议对象', body: '从官方 intro 和 spec 里分清 client、server、tools、resources、prompts 分别承担什么。' },
      { title: '看 SDK 怎么实现', body: '用 TypeScript / Python SDK 理解服务端暴露能力、客户端发现和调用能力的实际写法。' },
      { title: '看产品怎么接入', body: 'Claude Code MCP 文档能说明协议如何进入真实开发者工作流，而不只停在示例。' },
      { title: '回到工具使用问题', body: 'Toolformer 提供工具使用的研究背景，但不能替代 MCP 的协议定义。' },
      { title: '补采用和语境', body: '进入 ready 前还要补一线采用信号和 transcript context，确认它为什么被采用、在哪里有边界。' },
    ],
    readerCanJudge: [
      'MCP 解决的是工具和上下文接入的标准化问题，还是只是某个产品的插件机制。',
      '一个 MCP 集成有没有清楚的权限、资源、工具和客户端边界。',
      '当前 source pack 是否补齐 signal 和 transcript context；没补齐前只能当 thin 初版看。',
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
};

const GENERATED_THREAD_PRESENTATIONS = generatedThreadPresentations as unknown as Record<string, ThreadPresentation>;

export function getThreadPresentationSeed(slug: string): ThreadPresentation | null {
  return THREAD_PRESENTATIONS[slug] ?? GENERATED_THREAD_PRESENTATIONS[slug] ?? null;
}
