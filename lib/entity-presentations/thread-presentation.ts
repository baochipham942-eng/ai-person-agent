import type { KnowledgeSourceRole } from '@/lib/knowledge-thread-fixtures/loop-engineering';

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

export function getThreadPresentationSeed(slug: string): ThreadPresentation | null {
  return THREAD_PRESENTATIONS[slug] ?? null;
}
