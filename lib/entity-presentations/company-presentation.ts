import type { CompanyPageIntelligence } from '@/lib/entity-pages';

// 公司页「策展叙事层」的 seed。结构性数据（人物 / 证据 / 来源）来自 DB；
// 这里只放需要人工（或 LLM）策展的内容：产品线文案、学习入口、官方链接等。
// 新增一家公司 = 复制 _TEMPLATE.ts 填空并在下方 COMPANY_PRESENTATIONS 注册，无需改组件。

export interface CompanyProductPresentation {
  name: string;
  summary: string;
  url?: string;
}

export interface CompanyBetPresentation {
  title: string;
  body: string;
}

export interface CompanyLearningResource {
  title: string;
  label: string;
  summary: string;
  url: string;
}

export interface CompanyOfficialLink {
  title: string;
  summary: string;
  url: string;
}

export interface CompanyPresentation {
  /** 公司页 hero 一句话定位。 */
  heroDescription: string;
  /** 「布局」区块主标题。 */
  headline: string;
  /** 战略叙事段落。 */
  strategy: string;
  /** 核心产品线。 */
  products: CompanyProductPresentation[];
  /** 「为什么值得跟踪」——当前不渲染，保留供未来使用。 */
  bets: CompanyBetPresentation[];
  /** 官方好文 / 学习入口（整页价值密度最高的区块）。 */
  learningResources: CompanyLearningResource[];
  /** 官方站点入口。 */
  officialLinks: CompanyOfficialLink[];
  /** 关键人物排序时优先加权的旗舰产品关键词（小写匹配 title/description）。 */
  flagshipKeywords: string[];
  /** 公司 logo：本地 public 路径，或已在 next.config images 允许的远程域名。DB 没有 logo 时用它。 */
  logoUrl?: string;
  /** 官网 URL：DB 没有 homepage 时用它（hero「官网」chip）。 */
  homepageUrl?: string;
}

export function companyKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

const COMPANY_PRESENTATIONS: Record<string, CompanyPresentation> = {
  anthropic: {
    heroDescription:
      'Anthropic 的公司页先看 Claude、Claude API、Claude Code 和安全研究怎样组成 AI 产品线，再看它和 Loop Engineering、Agentic Coding 等主题的关系。',
    headline: '四条产品线：Claude、开发者平台、Claude Code、企业与云平台；安全研究是贯穿其中的底座。',
    strategy:
      'Anthropic 的 AI 布局可以按四条产品线看：Claude 是面向用户和企业的模型产品，Claude API / Console 是开发者平台，Claude Code 把模型带进真实软件工程循环，企业版与云平台负责规模化分发。安全研究不单独成线，而是决定这些产品能否被组织长期采用的底座。',
    products: [
      {
        name: 'Claude',
        summary: '个人、团队和企业直接使用的模型产品入口，承接 Claude 系列模型能力和日常协作场景。',
        url: 'https://www.anthropic.com/claude',
      },
      {
        name: 'Claude API / Console',
        summary: '开发者把 Claude 接入应用、内部工具和业务流程的入口，是 Anthropic 平台化收入和生态扩展的基础。',
        url: 'https://docs.anthropic.com/',
      },
      {
        name: 'Claude Code',
        summary: '面向真实代码库的 agentic coding CLI，也是 Loop Engineering 在 Anthropic 产品线里最关键的公司样本。',
        url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
      },
      {
        name: 'Claude 企业版与云平台',
        summary: '通过 Claude Enterprise、AWS Bedrock 和 Google Vertex 把模型带进企业采购和云生态，是 API 之外的规模化分发渠道。',
        url: 'https://www.anthropic.com/enterprise',
      },
    ],
    bets: [
      {
        title: '模型能力产品化',
        body: 'Claude 系列模型不只是底层能力，正在通过 Claude、API 和企业入口变成可购买、可集成、可管理的产品。',
      },
      {
        title: '开发者工作流',
        body: 'Claude Code 把模型能力带进终端、仓库、hooks、MCP 和 GitHub Action，是观察 Loop Engineering 的核心窗口。',
      },
      {
        title: '企业与平台',
        body: 'API、Console、合作伙伴和企业场景决定 Anthropic 能否把模型能力扩成稳定业务，而不是停留在单点应用。',
      },
      {
        title: '安全作为产品约束',
        body: '安全研究不是外围品牌叙事，它会影响模型发布节奏、企业采用和开发者平台的可用边界。',
      },
    ],
    learningResources: [
      {
        title: 'Claude Code: Best practices for agentic coding',
        label: 'Claude Code',
        summary: '最值得先读的官方工程文章，讲上下文、计划、验证、工具和迭代，直接解释 Claude Code 为什么适合作为 Loop Engineering 样本。',
        url: 'https://www.anthropic.com/engineering/claude-code-best-practices',
      },
      {
        title: 'Building effective agents',
        label: 'Agent 设计',
        summary: 'Anthropic 对 agent 架构的基础文章，强调简单、可组合、可验证的模式，比单纯追复杂框架更有学习价值。',
        url: 'https://www.anthropic.com/engineering/building-effective-agents',
      },
      {
        title: 'How we built our multi-agent research system',
        label: '多智能体',
        summary: '解释多 agent 并行研究、协调和评估方式，适合用来理解 Anthropic 如何把 agent 能力做成真实系统。',
        url: 'https://www.anthropic.com/engineering/multi-agent-research-system',
      },
      {
        title: 'Writing effective tools for agents',
        label: '工具设计',
        summary: '把工具当成 agent 产品体验的一部分来设计，和 Claude Code 的 hooks、MCP、SDK 有直接关系。',
        url: 'https://www.anthropic.com/engineering/writing-tools-for-agents',
      },
      {
        title: 'Effective context engineering for agents',
        label: '上下文工程',
        summary: '讨论如何给 agent 提供刚好足够的上下文，是理解 Claude Code、长任务和团队工作流的关键材料。',
        url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents',
      },
      {
        title: 'Model Context Protocol',
        label: 'MCP',
        summary: '官方介绍 MCP 为什么要把模型和外部工具、数据源连接起来，是理解 Anthropic 平台生态的入口。',
        url: 'https://www.anthropic.com/news/model-context-protocol',
      },
    ],
    officialLinks: [
      {
        title: 'Anthropic Engineering',
        summary: '工程博客，适合看 agent、Claude Code、工具和上下文工程。',
        url: 'https://www.anthropic.com/engineering',
      },
      {
        title: 'Claude Code docs',
        summary: 'Claude Code 产品文档，适合确认功能边界和落地入口。',
        url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
      },
      {
        title: 'Anthropic Docs',
        summary: 'API、模型、工具和平台能力的官方文档入口。',
        url: 'https://docs.anthropic.com/',
      },
      {
        title: 'Anthropic Research',
        summary: '研究发布和安全方向，用来理解公司长期技术边界。',
        url: 'https://www.anthropic.com/research',
      },
    ],
    flagshipKeywords: ['claude code', 'mcp', 'agentic'],
  },

  openai: {
    heroDescription:
      'OpenAI 的公司页先看 ChatGPT、API 平台、Codex 和企业云分发怎样组成 AI 产品线，再看它和 Agentic Coding、Loop Engineering 等主题的关系。',
    headline: '四条产品线：ChatGPT、API 平台、Codex、企业版与 Azure 云分发；前沿模型研究是贯穿其中的底座。',
    strategy:
      'OpenAI 的 AI 布局可以按四条产品线看：ChatGPT 是面向用户和企业的应用入口，API / Platform 是开发者平台（含 Agents SDK、Realtime），Codex 把模型带进真实软件工程的 agentic coding，企业版与 Azure 云分发负责规模化进入企业采购。GPT / o 系列前沿模型研究不单独成线，而是这些产品的能力底座。',
    products: [
      {
        name: 'ChatGPT',
        summary: '个人、团队和企业的应用入口（含 Business / Enterprise），也是 Codex 等能力进入终端用户的最大触点。',
        url: 'https://chatgpt.com',
      },
      {
        name: 'OpenAI API / Platform',
        summary: '开发者把模型接入应用的平台，含 Agents SDK、Realtime 和 Assistants，是 OpenAI 平台化收入和生态扩展的基础。',
        url: 'https://platform.openai.com',
      },
      {
        name: 'Codex',
        summary: 'OpenAI 的 agentic coding agent（云端 + CLI + 已嵌入 ChatGPT），支持 /goal 跑到可验证条件，是观察 Agentic Coding 和 Loop Engineering 的核心样本。',
        url: 'https://openai.com/codex/',
      },
      {
        name: '企业版与 Azure 云分发',
        summary: '通过 ChatGPT Enterprise 和微软 Azure OpenAI Service 把模型带进企业采购和云生态，是 API 之外的规模化分发渠道。',
        url: 'https://openai.com/enterprise/',
      },
    ],
    bets: [],
    learningResources: [
      {
        title: 'OpenAI Cookbook',
        label: 'Cookbook',
        summary: '最实用的官方示例集，从 API 基础到 Agents SDK、Codex 的 how-to，最适合先从这里上手。',
        url: 'https://developers.openai.com/cookbook',
      },
      {
        title: 'OpenAI API Platform 文档',
        label: 'API 平台',
        summary: 'API、模型、工具和 Agents SDK 的官方文档入口，确认平台能力边界从这里开始。',
        url: 'https://developers.openai.com/api/docs',
      },
      {
        title: 'Prompt engineering guide',
        label: 'Prompt 工程',
        summary: '官方 prompt 工程指南，讲清楚怎么把意图、上下文和约束交给模型，是用好 API 的基础。',
        url: 'https://platform.openai.com/docs/guides/prompt-engineering',
      },
      {
        title: 'How OpenAI Uses Codex to Change How We Build',
        label: 'Agentic Coding',
        summary: 'OpenAI 开发体验负责人讲他们内部怎么用 Codex 改变工程协作，是理解 agentic coding 真实落地的窗口。',
        url: 'https://www.youtube.com/watch?v=NjaX4qt-O1Y',
      },
      {
        title: 'OpenAI 模型文档',
        label: '模型',
        summary: 'GPT / o 系列模型能力、定价和选择的官方文档，理解产品底座从模型清单开始。',
        url: 'https://platform.openai.com/docs/models',
      },
    ],
    officialLinks: [
      {
        title: 'OpenAI Developers',
        summary: '开发者门户，API、Codex、Cookbook 的统一入口。',
        url: 'https://developers.openai.com',
      },
      {
        title: 'API Platform',
        summary: '模型、工具和平台能力的官方文档。',
        url: 'https://developers.openai.com/api/docs',
      },
      {
        title: 'OpenAI Cookbook',
        summary: '官方示例和构建指南，适合直接抄落地写法。',
        url: 'https://developers.openai.com/cookbook',
      },
      {
        title: 'OpenAI Research',
        summary: '研究发布和模型方向，用来理解公司长期技术边界。',
        url: 'https://openai.com/research',
      },
    ],
    flagshipKeywords: ['codex', 'agents sdk', 'agentic'],
    logoUrl: '/logos/openai.png',
    homepageUrl: 'https://openai.com',
  },

  xai: {
    heroDescription:
      'xAI 的公司页先看 Grok 助手、Grok API 开发者平台、Grok Build 编码 agent 和 Imagine / Voice 多模态生成怎样组成 AI 产品线，再看它和 Agentic Coding、Context Engineering 等主题的关系。',
    headline: '四条产品线：Grok 助手、Grok API 开发者平台、Grok Build 编码 agent、Imagine / Voice 多模态生成；Grok 前沿模型研究是贯穿其中的底座。',
    strategy:
      'xAI 的 AI 布局可以按四条产品线看：Grok 是面向用户的真理寻求型助手（web / iOS / Android，含多 agent、实时搜索和语音），Grok API / Console 是开发者平台（兼容 OpenAI 与 Anthropic SDK，并通过 Azure、Oracle、Google Cloud、Amazon Bedrock 多云分发），Grok Build 把模型带进真实软件工程的 agentic coding（终端 CLI + 并行 subagent + Agent Dashboard），Imagine / Voice 则把图像、视频和语音能力做成独立的多模态 API。Grok 4.3 等前沿模型研究不单独成线，而是这些产品的能力底座。',
    products: [
      {
        name: 'Grok',
        summary: 'xAI 面向用户的真理寻求型 AI 助手（web / iOS / Android），覆盖对话、实时搜索、多 agent 推理、语音和图像视频生成，是模型能力进入终端用户的最大触点。',
        url: 'https://x.ai/grok',
      },
      {
        name: 'Grok API / Console',
        summary: '开发者把 Grok 模型接入应用的平台，兼容 OpenAI 与 Anthropic SDK，并通过 Azure、Oracle、Google Cloud、Amazon Bedrock 做多云分发，是 xAI 平台化收入和生态扩展的基础。',
        url: 'https://x.ai/api',
      },
      {
        name: 'Grok Build',
        summary: 'xAI 自研的终端 agentic coding CLI（由 grok-build-0.1 驱动），带 plan 模式、并行 subagent、MCP / ACP 兼容和 Agent Dashboard，是观察 xAI 进入 Agentic Coding 的核心样本。',
        url: 'https://x.ai/cli',
      },
      {
        name: 'Imagine / Voice 多模态 API',
        summary: 'Grok Imagine（文/图生图与视频）和 Voice（实时语音、TTS、STT）把多模态生成做成独立的 API 产品线，是 xAI 在文本之外扩展模型能力商业化的方向。',
        url: 'https://x.ai/api/imagine',
      },
    ],
    bets: [
      {
        title: '前沿模型与多云分发',
        body: 'Grok 4.3（1M 上下文）通过 Console API 和 Azure / Oracle / Google Cloud / Amazon Bedrock 进入企业云采购，决定 xAI 能否把模型能力扩成稳定业务。',
      },
      {
        title: 'Agentic Coding',
        body: 'Grok Build 把模型带进终端、subagent、MCP / ACP 和 Agent Dashboard，是观察 xAI 在 Agentic Coding 和 Loop Engineering 上落地的关键窗口。',
      },
      {
        title: '多模态产品化',
        body: 'Imagine 和 Voice 把图像、视频、语音能力从助手内置功能拆成独立 API，说明 xAI 在文本之外寻找新的产品和收入面。',
      },
    ],
    learningResources: [
      {
        title: 'xAI API 文档',
        label: '开发者平台',
        summary: 'Grok 模型、工具、SDK 兼容性和接入流程的官方文档入口，确认平台能力边界从这里开始。',
        url: 'https://docs.x.ai/',
      },
      {
        title: 'xAI Models 文档',
        label: '模型',
        summary: 'Grok 4.3、grok-build-0.1 等模型的能力、上下文窗口和定价官方清单，理解产品底座从模型开始。',
        url: 'https://docs.x.ai/developers/models',
      },
      {
        title: 'Introducing Grok Build',
        label: 'Agentic Coding',
        summary: 'Grok Build CLI 的官方发布，讲 plan 模式、并行 subagent、MCP / ACP 兼容，是理解 xAI agentic coding 设计的第一手材料。',
        url: 'https://x.ai/news/grok-build-cli',
      },
      {
        title: 'Agent Dashboard in Grok Build',
        label: 'Agent 工作台',
        summary: '官方解释如何从单次会话推进到多会话、多 agent 工作台管理，适合观察 xAI 的 agent 编排思路。',
        url: 'https://x.ai/news/agent-dashboard',
      },
      {
        title: 'Grok User Guide',
        label: 'Grok 助手',
        summary: 'Grok 助手的官方使用指南，理解面向用户的搜索、推理、语音和多模态功能边界。',
        url: 'https://docs.x.ai/grok/user-guide',
      },
    ],
    officialLinks: [
      {
        title: 'xAI',
        summary: '公司官网和产品入口。',
        url: 'https://x.ai',
      },
      {
        title: 'xAI Docs',
        summary: 'Grok API、模型、工具和平台能力的官方文档入口。',
        url: 'https://docs.x.ai',
      },
      {
        title: 'xAI Console',
        summary: '创建 API key、管理用量和接入 Grok 模型的开发者控制台。',
        url: 'https://console.x.ai',
      },
      {
        title: 'xAI News',
        summary: '官方新闻和产品发布，用来跟踪 Grok 模型与产品节奏。',
        url: 'https://x.ai/news',
      },
    ],
    flagshipKeywords: ['grok', 'grok build', 'grok api', 'agentic coding'],
    homepageUrl: 'https://x.ai',
  },
  'alibaba-damo-academy': {
    heroDescription:
      '阿里巴巴 / 通义千问 Qwen 的公司页先看 Qwen 模型家族、Qwen-Robot 具身套件、阿里云 Model Studio（百炼）和 Qwen Studio 应用怎样组成 AI 产品线，再看它和 Agentic Coding、Context Engineering 等主题的关系。',
    headline: '四条产品线：Qwen 模型家族、Qwen-Robot 具身套件、阿里云 Model Studio（百炼）、Qwen Studio 应用；前沿模型研究是贯穿其中的底座。',
    strategy:
      '阿里的 AI 布局可以按四条产品线看：Qwen 模型家族（Qwen3.x 系列，含开源权重与旗舰闭源）是面向开发者和企业的能力核心，Qwen-Robot 具身套件把模型从文本推向操作、导航和物理世界理解，阿里云 Model Studio（百炼）以模型即服务的方式把 Qwen 接入企业采购和云生态，Qwen Studio 应用则是能力进入终端用户的最大触点。前沿模型研究不单独成线，而是这些产品的能力底座，也是阿里坚持开源权重、靠生态规模拉动云分发的战略支点。',
    products: [
      {
        name: 'Qwen 模型家族',
        summary: '阿里通义实验室的核心模型产品线，覆盖 Qwen3.x 语言、视觉、编码和多模态模型，多数以开源权重发布并已衍生出庞大社区生态，是阿里 AI 能力和云分发的基础。',
        url: 'https://qwen.ai',
      },
      {
        name: 'Qwen-Robot 具身套件',
        summary: '2026 年 6 月发布的具身智能模型套件，含 RobotManip（视觉-语言-动作操作）、RobotNav（视觉-语言-导航）和 RobotWorld（视频世界模型），把 Qwen 能力推向机器人和物理世界，已在阿里云企业客户试点。',
        url: 'https://qwen.ai/blog?id=qwen-robotworld',
      },
      {
        name: '阿里云 Model Studio（百炼）',
        summary: '一站式模型即服务平台，统一提供 Qwen 全系列和第三方模型的官方 API 与 OpenAI 兼容接口，是 Qwen 进入企业采购和云生态的规模化分发渠道。',
        url: 'https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio',
      },
      {
        name: 'Qwen Studio 应用',
        summary: '面向终端用户的官方对话应用（前身 Qwen Chat），提供 Web 和移动端入口，是 Qwen 模型能力直达个人和团队用户的最大触点。',
        url: 'https://chat.qwen.ai',
      },
    ],
    bets: [
      {
        title: '开源权重与生态规模',
        body: 'Qwen 长期以开源权重发布，靠庞大的衍生模型和下载量构筑生态壁垒，再用阿里云 Model Studio 把生态势能转化为商业分发。',
      },
      {
        title: '具身智能',
        body: 'Qwen-Robot 套件把模型从文本扩展到操作、导航和世界模型，是阿里押注物理 AI、进入机器人和自动驾驶场景的关键样本。',
      },
      {
        title: '模型即服务',
        body: 'Model Studio（百炼）决定阿里能否把 Qwen 能力扩成稳定的云业务，而不是停留在模型发布本身。',
      },
      {
        title: '研究作为能力底座',
        body: '前沿模型研究不单独成线，但它决定 Qwen 家族的能力上限和发布节奏，是其他三条产品线的共同底座。',
      },
    ],
    learningResources: [
      {
        title: 'Entering the Physical AI Era: Introducing the Qwen-Robot Suite',
        label: '具身智能',
        summary: '最值得先读的官方文章，讲清 Qwen-Robot 三个模型如何把操作、导航和世界模型连成具身智能底座，直接解释阿里为什么进入物理 AI。',
        url: 'https://www.alibabacloud.com/blog/entering-the-physical-ai-era-introducing-the-qwen-robot-suite_603261',
      },
      {
        title: 'Qwen API platform',
        label: 'API 平台',
        summary: 'Qwen 官方 API 平台入口，确认模型清单、接口能力和接入方式从这里开始，是用好 Qwen 的基础。',
        url: 'https://qwen.ai/apiplatform',
      },
      {
        title: 'What is Model Studio',
        label: '模型即服务',
        summary: '阿里云 Model Studio（百炼）的官方文档，讲清楚 Qwen 全系列如何以 OpenAI 兼容的 MaaS 方式接入企业应用。',
        url: 'https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio',
      },
      {
        title: 'Set Up Qwen Code for Terminal AI Coding with Qwen3-Coder',
        label: 'Agentic Coding',
        summary: '官方讲如何用 Qwen3-Coder 在终端做 agentic coding，是理解 Qwen 编码能力如何落到真实开发循环的窗口。',
        url: 'https://www.alibabacloud.com/help/en/model-studio/qwen-code',
      },
    ],
    officialLinks: [
      {
        title: 'Qwen',
        summary: 'Qwen 团队官方门户，模型、Chat 应用和 API 平台的统一入口。',
        url: 'https://qwen.ai',
      },
      {
        title: 'Alibaba Cloud Model Studio',
        summary: '阿里云 Model Studio（百炼）官方文档，确认平台能力边界和接入方式。',
        url: 'https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio',
      },
      {
        title: 'Alibaba Cloud',
        summary: '阿里云官网入口。',
        url: 'https://www.alibabacloud.com',
      },
    ],
    flagshipKeywords: ['qwen', 'qwen-robot', 'model studio', 'embodied'],
    homepageUrl: 'https://qwen.ai',
  },
  apple: {
    heroDescription:
      'Apple 的公司页先看 Apple Intelligence、Apple 基础模型、Foundation Models 开发者框架和 Private Cloud Compute 怎样组成 AI 产品线，再看它和端侧 AI、隐私推理等主题的关系。',
    headline: '四条产品线：Apple Intelligence、Apple 基础模型、Foundation Models 框架、Private Cloud Compute；端侧优先与隐私保护是贯穿其中的底座。',
    strategy:
      'Apple 的 AI 布局可以按四条产品线看：Apple Intelligence 是面向用户、内置在系统里的个人智能，Apple 基础模型是支撑它的端侧加服务端模型，Foundation Models 框架把这套模型用 Swift API 开放给第三方开发者，Private Cloud Compute 则是兜住更大模型推理的隐私基础设施。和模型公司不同，Apple 不卖独立聊天产品，而是把 AI 嵌进设备与系统体验；端侧优先与隐私保护不单独成线，而是决定这些产品形态的底座。',
    products: [
      {
        name: 'Apple Intelligence',
        summary: '内置在 iPhone、iPad、Mac 等系统里的个人智能，覆盖 Siri、写作工具、视觉智能、Image Playground 等场景，是 Apple AI 能力直接触达终端用户的主入口。',
        url: 'https://www.apple.com/apple-intelligence/',
      },
      {
        name: 'Apple 基础模型（端侧 + 服务端）',
        summary: '支撑 Apple Intelligence 的自研模型族，分端侧小模型和跑在 Private Cloud Compute 上的服务端模型，是整套 AI 体验的能力底座。',
        url: 'https://machinelearning.apple.com/research/apple-foundation-models-tech-report-2025',
      },
      {
        name: 'Foundation Models 框架',
        summary: '面向开发者的 Swift API，让第三方 App 用几行代码直接调用端侧基础模型，支持图像输入、工具调用和结构化输出，是 Apple 把 AI 能力平台化、开放给生态的关键一步。',
        url: 'https://developer.apple.com/documentation/foundationmodels',
      },
      {
        name: 'Private Cloud Compute',
        summary: '用自研芯片和加固系统在云端做推理，保证连 Apple 自己都无法访问用户数据，是端侧模型撑不住的大模型请求的隐私推理基础设施。',
        url: 'https://security.apple.com/blog/private-cloud-compute/',
      },
    ],
    bets: [
      {
        title: '系统内置的个人智能',
        body: 'Apple 不做独立聊天产品，而是把 AI 嵌进 Siri、写作、照片和系统体验，靠分发体量和个人上下文取胜。',
      },
      {
        title: '端侧优先',
        body: '能在设备上跑的就不上云，端侧模型保证快、离线可用、默认隐私，是 Apple AI 形态区别于云模型公司的根本。',
      },
      {
        title: '开发者平台化',
        body: 'Foundation Models 框架把端侧模型用 Swift API 开放给第三方，让 Apple 的 AI 能力从自家功能扩成生态平台。',
      },
      {
        title: '隐私作为产品约束',
        body: 'Private Cloud Compute 把"云端推理也不碰用户数据"做成可验证的基础设施，隐私不是营销话术而是产品形态的硬约束。',
      },
    ],
    learningResources: [
      {
        title: 'Apple Intelligence Foundation Language Models Tech Report 2025',
        label: '基础模型',
        summary: '最值得先读的官方材料，详解端侧与服务端基础模型的架构、训练和评测，是理解 Apple AI 能力底座的入口。',
        url: 'https://machinelearning.apple.com/research/apple-foundation-models-tech-report-2025',
      },
      {
        title: 'Introducing Apple’s On-Device and Server Foundation Models',
        label: '端侧 + 服务端',
        summary: 'Apple 机器学习研究博客对端侧加服务端双模型路线的系统介绍，解释它为什么把模型拆成两层。',
        url: 'https://machinelearning.apple.com/research/introducing-apple-foundation-models',
      },
      {
        title: 'Meet the Foundation Models framework',
        label: '开发者框架',
        summary: 'WWDC 官方讲解如何用 Swift 几行代码调用端侧模型、做引导生成和工具调用，是开发者上手的第一课。',
        url: 'https://developer.apple.com/videos/play/wwdc2025/286/',
      },
      {
        title: 'Foundation Models framework 文档',
        label: 'API 文档',
        summary: '确认框架能力边界的官方文档入口，含可用性、提示设计、结构化输出和图像输入。',
        url: 'https://developer.apple.com/documentation/foundationmodels',
      },
      {
        title: 'Private Cloud Compute: A new frontier for AI privacy',
        label: '隐私推理',
        summary: 'Apple 安全团队对云端隐私推理设计的官方说明，讲清可验证、不可访问用户数据的工程边界。',
        url: 'https://security.apple.com/blog/private-cloud-compute/',
      },
    ],
    officialLinks: [
      {
        title: 'Apple Intelligence',
        summary: 'Apple Intelligence 产品页，看面向用户的 AI 功能全貌。',
        url: 'https://www.apple.com/apple-intelligence/',
      },
      {
        title: 'Apple Developer: Apple Intelligence',
        summary: '开发者门户，Foundation Models 框架、App Intents、Image Playground 的统一入口。',
        url: 'https://developer.apple.com/apple-intelligence/',
      },
      {
        title: 'Apple Machine Learning Research',
        summary: '官方机器学习研究博客，基础模型、隐私推理等技术方向的高密度材料。',
        url: 'https://machinelearning.apple.com/',
      },
    ],
    flagshipKeywords: ['apple intelligence', 'foundation models', 'private cloud compute', 'on-device'],
    homepageUrl: 'https://www.apple.com',
  },
  cloudflare: {
    heroDescription:
      'Cloudflare 的公司页先看 Workers AI、AI Gateway、Agents SDK 和 AI Search / Vectorize 怎样组成 AI 产品线，理解它如何把 AI 推理、调用治理和 agent 运行时放进全球边缘网络。',
    headline: '四条产品线：Workers AI 边缘推理、AI Gateway 调用治理、Agents SDK agent 运行时、AI Search + Vectorize 检索层；全球边缘网络是贯穿其中的底座。',
    strategy:
      'Cloudflare 不做通用大模型，而是把 AI 应用上线后真正需要的基础设施做成产品线，全部跑在它的全球边缘网络上：Workers AI 提供 serverless 边缘推理，开发者无需管 GPU 就能跑 50+ 开源模型；AI Gateway 是统一的模型调用网关，负责跨厂商的可观测、缓存、限流和成本控制（含实时 spend limits）；Agents SDK 把 Durable Objects 的持久状态和 Workers 的全球分发包装成 agent 运行时，让有状态 agent 一次部署、全网扩展；AI Search（前身 AutoRAG）配合 Vectorize 向量库，把检索增强（RAG）做成开箱即用的检索原语。它的护城河不在模型本身，而在流量、网关、状态和检索这一整套部署层。',
    products: [
      {
        name: 'Workers AI',
        summary: 'Serverless 边缘推理平台，在 Cloudflare 全球网络上按量运行 50+ 开源模型，无需自管 GPU，是它把 AI 能力直接嵌进边缘的核心入口。',
        url: 'https://developers.cloudflare.com/workers-ai/',
      },
      {
        name: 'AI Gateway',
        summary: '统一的模型调用网关，跨 OpenAI / Anthropic / Google / Workers AI 等厂商做可观测、缓存、限流、重试、模型回退和成本控制（含实时 spend limits），是卡住企业 AI 调用入口的治理层。',
        url: 'https://developers.cloudflare.com/ai-gateway/',
      },
      {
        name: 'Agents SDK',
        summary: '基于 Durable Objects 持久状态和 Workers 全球分发的 agent 运行时，提供持久身份、SQL 存储、任务调度、durable execution 和工具集成，一次部署即可全网扩展有状态 agent，是观察 Agentic 基础设施的核心样本。',
        url: 'https://developers.cloudflare.com/agents/',
      },
      {
        name: 'AI Search + Vectorize',
        summary: 'AI Search（前身 AutoRAG）把检索增强做成开箱即用原语，自动索引数据并支持语义 + 关键词混合检索；底层的 Vectorize 是全球分布式向量库，二者组成 Cloudflare 的 RAG 检索层。',
        url: 'https://developers.cloudflare.com/ai-search/',
      },
    ],
    bets: [
      {
        title: 'AI 应用的部署基础设施',
        body: 'Cloudflare 的优势不在模型，而在 AI 应用上线后需要的推理、网关、状态、检索和成本控制——这些都跑在它现成的全球边缘网络上。',
      },
      {
        title: 'Agent 运行时',
        body: 'Agents SDK 正把 Durable Objects 的持久状态做成任何 agent 框架都能搭建的底层运行时，是判断 Cloudflare 能否成为 agent 基础设施层的关键。',
      },
    ],
    learningResources: [
      {
        title: 'Workers AI docs',
        label: '边缘推理',
        summary: '先读这份：理解 Cloudflare 如何把 serverless 推理和开源模型放进全球边缘网络，是它 AI 产品线的能力底座。',
        url: 'https://developers.cloudflare.com/workers-ai/',
      },
      {
        title: 'AI Gateway docs',
        label: 'AI 网关',
        summary: '理解 Cloudflare 如何用一层网关把跨厂商的模型调用做成可观测、可缓存、可控成本的基础设施。',
        url: 'https://developers.cloudflare.com/ai-gateway/',
      },
      {
        title: 'Agents SDK docs',
        label: 'Agent 运行时',
        summary: '官方 Agents 文档，讲清 agent harness、durable execution 和运行时如何搭在 Durable Objects 上，是理解 Cloudflare agent 能力边界的入口。',
        url: 'https://developers.cloudflare.com/agents/',
      },
      {
        title: 'Bringing more agent harnesses and frameworks to Cloudflare, starting with Flue',
        label: 'Agent 基础设施',
        summary: '解释 Agents SDK 如何从自用 harness 变成任何 agent 框架都能搭建的底层运行时（framework → harness → runtime 三层架构），是看 Cloudflare agent 战略的关键长文。',
        url: 'https://blog.cloudflare.com/agents-platform-flue-sdk/',
      },
      {
        title: 'Agents that remember: introducing Agent Memory',
        label: 'Agent 记忆',
        summary: '官方介绍 Agent Memory 托管服务如何给 agent 加持久记忆，适合和 Agent Memory、Context Engineering 等主题交叉。',
        url: 'https://blog.cloudflare.com/introducing-agent-memory/',
      },
      {
        title: 'Your AI bill is out of control. Cloudflare can fix it now',
        label: '成本治理',
        summary: 'AI Gateway 实时 spend limits 的官方长文，是理解 Cloudflare 把 AI 调用成本控制做成产品能力的近期信号。',
        url: 'https://blog.cloudflare.com/ai-gateway-spend-limits/',
      },
    ],
    officialLinks: [
      {
        title: 'Cloudflare Developers',
        summary: 'Workers AI、AI Gateway、Agents、Vectorize、AI Search 等全部 AI 产品的开发者文档入口。',
        url: 'https://developers.cloudflare.com/',
      },
      {
        title: 'Cloudflare Blog',
        summary: '官方博客，适合追 Agents、AI Gateway 和 AI 基础设施的产品发布与工程长文。',
        url: 'https://blog.cloudflare.com/',
      },
      {
        title: 'Cloudflare',
        summary: '公司官网入口。',
        url: 'https://www.cloudflare.com',
      },
    ],
    flagshipKeywords: ['workers ai', 'ai gateway', 'agents sdk', 'vectorize', 'ai search'],
    homepageUrl: 'https://www.cloudflare.com',
  },
  deepseek: {
    heroDescription:
      'DeepSeek 的公司页先看 DeepSeek-V 系列通用模型、推理（深度思考）模型、DeepSeek 应用和开放平台 / API 怎样组成 AI 产品线，再看它和 Agentic Coding、Context Engineering 等主题的关系。',
    headline: '四条产品线：DeepSeek-V 系列通用模型、推理（深度思考）模型、DeepSeek 应用、开放平台与 API；开源高性价比模型是贯穿其中的底座。',
    strategy:
      'DeepSeek 的 AI 布局可以按四条产品线看：DeepSeek-V 系列（当前旗舰 DeepSeek-V4，含 V4-Pro / V4-Flash，承接 V3、V3.2 一脉）是面向通用任务的核心模型；推理模型把深度思考与工具调用整合进同一套模型（源自 DeepSeek-R1，现已并入 V4 的 thinking 模式）；DeepSeek 应用（App 与网页版 chat）是模型直接触达个人用户的入口；开放平台与 API（platform.deepseek.com）则把模型以高性价比、OpenAI / Anthropic 兼容接口分发给开发者。以开源权重加低价 API 撬动规模化采用，是它区别于闭源大厂的底层打法。',
    products: [
      {
        name: 'DeepSeek-V 系列通用模型',
        summary: '面向通用任务的核心模型线，当前旗舰为 DeepSeek-V4（含 V4-Pro / V4-Flash），承接 V3、V3.2 一脉，主打高性价比、长上下文与开源权重，是整个产品矩阵的能力底座。',
        url: 'https://api-docs.deepseek.com/quick_start/pricing',
      },
      {
        name: '推理（深度思考）模型',
        summary: '面向复杂推理与智能体任务的模型线，源自 DeepSeek-R1，现已把深度思考与工具调用整合进 V4 的 thinking 模式（API 名 deepseek-reasoner），是观察 Agentic Coding 与推理能力的核心样本。',
        url: 'https://api-docs.deepseek.com/news/news251201',
      },
      {
        name: 'DeepSeek 应用',
        summary: 'DeepSeek App 与网页版 chat（chat.deepseek.com），是模型能力直接触达个人和团队用户的最大入口，也是品牌破圈的主要触点。',
        url: 'https://chat.deepseek.com',
      },
      {
        name: 'DeepSeek 开放平台 / API',
        summary: '开发者把 DeepSeek 模型接入应用和业务流程的平台，提供 OpenAI / Anthropic 兼容接口、上下文缓存和低价 token，是 DeepSeek 平台化收入和生态扩展的基础。',
        url: 'https://platform.deepseek.com',
      },
    ],
    bets: [
      {
        title: '开源高性价比模型',
        body: 'DeepSeek 以开源权重加低价 API 撬动规模化采用，用极致性价比和性能对标闭源前沿模型，是它最核心的差异化打法。',
      },
      {
        title: '推理与智能体能力',
        body: '从 R1 到 V4 thinking 模式，DeepSeek 把深度推理和工具调用整合进同一套模型，指向更强的 agentic workflow 落地能力。',
      },
      {
        title: '应用与平台双入口',
        body: 'App / 网页 chat 抓个人用户，开放平台 / API 抓开发者生态，两条入口共同决定模型能力能否扩成稳定业务。',
      },
    ],
    learningResources: [
      {
        title: 'DeepSeek API 文档与定价',
        label: 'API 平台',
        summary: '最值得先读的官方材料，讲清当前模型清单（V4-Pro / V4-Flash）、长上下文、OpenAI / Anthropic 兼容接口和上下文缓存定价，是用好 DeepSeek 的起点。',
        url: 'https://api-docs.deepseek.com/quick_start/pricing',
      },
      {
        title: 'DeepSeek-V3.2 Release',
        label: '模型发布',
        summary: '官方发布说明，讲 V3.2 如何把深度思考直接整合进工具调用、支持 thinking / non-thinking 双模式，是理解 DeepSeek 推理与智能体方向的关键材料。',
        url: 'https://api-docs.deepseek.com/news/news251201',
      },
      {
        title: 'DeepSeek API Change Log',
        label: '版本变更',
        summary: '官方更新日志，按时间记录 V3.1、V3.2、V4 等模型迭代和接口变更，适合跟踪 DeepSeek 真实发布节奏。',
        url: 'https://api-docs.deepseek.com/updates',
      },
      {
        title: 'DeepSeek 开源仓库',
        label: '开源',
        summary: 'DeepSeek 在 GitHub 上的官方组织，集中放模型权重、技术报告和工程项目，是理解其开源底座的直接入口。',
        url: 'https://github.com/deepseek-ai',
      },
    ],
    officialLinks: [
      {
        title: 'DeepSeek',
        summary: '公司官网和产品入口。',
        url: 'https://www.deepseek.com',
      },
      {
        title: 'DeepSeek Platform',
        summary: '开放平台与 API 控制台，注册 key、查模型和定价从这里开始。',
        url: 'https://platform.deepseek.com',
      },
      {
        title: 'DeepSeek API Docs',
        summary: '模型、接口和能力边界的官方文档入口。',
        url: 'https://api-docs.deepseek.com',
      },
      {
        title: 'DeepSeek Chat',
        summary: '网页版聊天入口，直接体验最新模型。',
        url: 'https://chat.deepseek.com',
      },
    ],
    flagshipKeywords: ['deepseek-v4', 'deepseek-r1', 'reasoner', 'agentic'],
    homepageUrl: 'https://www.deepseek.com',
  },
  google: {
    heroDescription:
      'Google 的公司页先看 Gemini 模型家族、Gemini 应用与 Spark、Gemini Enterprise Agent Platform（原 Vertex AI）和 Google AI Studio / Gemini API 怎样组成 AI 产品线，再看它和 Agentic Coding、Context Engineering 等主题的关系。',
    headline: '四条产品线：Gemini 模型家族、Gemini 应用与 Spark、Gemini Enterprise Agent Platform（企业 AI）、Google AI Studio 与 Gemini API（开发者入口）；DeepMind 的前沿研究是贯穿其中的底座。',
    strategy:
      'Google 的 AI 布局横跨自有模型、消费级应用、企业平台和开发者入口，是少有的全栈玩家。Gemini 模型家族（当前以 Gemini 3.5 Flash 与 3.5 Pro 为旗舰）由 DeepMind 研发，是所有产品的能力底座；Gemini 应用与 Spark 是面向用户的入口，Spark 把模型推向能长程自主执行任务的 agentic 助手，并嵌进 Gmail、Docs 等 Workspace 场景；Gemini Enterprise Agent Platform（2026 年由 Vertex AI 演进而来）把模型、Agent Studio、ADK 和 Agent Engine 打包成企业级 agent 平台；Google AI Studio 与 Gemini API 则是开发者最快接入 Gemini、Gemma、Imagen、Veo 的入口。DeepMind 的前沿研究不单独成线，而是决定这套全栈布局能力上限的底座。',
    products: [
      {
        name: 'Gemini 模型家族',
        summary: 'Google / DeepMind 的旗舰多模态模型家族，当前以 Gemini 3.5 Flash 与 Gemini 3.5 Pro 为核心，覆盖编码、agentic 和多模态能力，是 Google 全栈 AI 产品的能力底座。',
        url: 'https://deepmind.google/models/gemini/',
      },
      {
        name: 'Gemini 应用与 Spark',
        summary: '面向个人和团队的应用入口。Gemini 应用承接对话与多模态能力，Spark 是构建在 Gemini 3.5 上的常驻 agentic 助手，能长程自主执行任务并嵌入 Gmail、Docs 等 Workspace 场景。',
        url: 'https://gemini.google/',
      },
      {
        name: 'Gemini Enterprise Agent Platform',
        summary: '2026 年由 Vertex AI 演进而来的企业 AI 平台，整合 200+ 基础模型、Agent Studio 可视化构建、ADK 代码框架、Agent Engine 托管运行时和企业治理，是 Google 面向企业规模化分发 AI 与 agent 的主入口。',
        url: 'https://cloud.google.com/products/gemini-enterprise-agent-platform',
      },
      {
        name: 'Google AI Studio 与 Gemini API',
        summary: '开发者最快接入 Gemini 的入口。AI Studio 用于快速试模型、调 prompt、生成代码，Gemini API 把 Gemini、Gemma、Imagen、Veo 接进应用，是 Google AI 平台化和开发者生态的基础。',
        url: 'https://ai.google.dev/',
      },
    ],
    bets: [
      {
        title: '全栈 AI',
        body: 'Google 同时握有自有模型（Gemini）、消费应用（Gemini / Spark）、企业平台（Gemini Enterprise Agent Platform）和开发者入口（AI Studio / Gemini API），是少有的从研究到分发全链路自有的玩家。',
      },
      {
        title: 'Agentic 转向',
        body: 'Spark、Antigravity、ADK 2.0 和 A2A 协议说明 Google 正从对话助手转向能长程自主执行、多 agent 协作的 agentic 系统。',
      },
      {
        title: '企业分发',
        body: 'Gemini Enterprise Agent Platform 把模型、构建工具和治理打包进企业采购和 Google Cloud 生态，是 API 之外的规模化分发渠道。',
      },
      {
        title: 'DeepMind 研究底座',
        body: 'Gemini、Omni 世界模型、AlphaFold 等出自 DeepMind，前沿研究决定整套全栈产品的能力上限。',
      },
    ],
    learningResources: [
      {
        title: 'Gemini API 文档',
        label: 'Gemini API',
        summary: '最值得先读的开发者文档，讲清模型清单、能力边界和接入方式，是用好 Gemini、Gemma、Imagen、Veo 的起点。',
        url: 'https://ai.google.dev/gemini-api/docs',
      },
      {
        title: 'Build apps in Google AI Studio',
        label: 'AI Studio',
        summary: '官方讲解如何在 AI Studio 里从 prompt 到可部署应用，是理解 Google 开发者体验的直接材料。',
        url: 'https://ai.google.dev/gemini-api/docs/aistudio-build-mode',
      },
      {
        title: 'Agent Development Kit (ADK) 文档',
        label: 'Agent SDK',
        summary: 'Google 开源、model-agnostic 的代码优先 agent 框架，用代码定义 agent、工具和多 agent 层级，是理解 Google agent 栈的核心入口。',
        url: 'https://google.github.io/adk-docs/',
      },
      {
        title: 'Agent2Agent (A2A) Protocol',
        label: 'A2A 协议',
        summary: '由 150+ 组织背书的 agent 间互操作协议，让一个 agent 把子任务委派给另一个，是理解 Google 多 agent 协作架构的关键。',
        url: 'https://a2a-protocol.org/',
      },
      {
        title: 'Google DeepMind — Gemini',
        label: 'DeepMind 研究',
        summary: 'DeepMind 官方的 Gemini 模型页，理解模型家族的能力演进和研究底座从这里开始。',
        url: 'https://deepmind.google/models/gemini/',
      },
      {
        title: 'Vertex AI / Gemini Enterprise 文档',
        label: '企业平台',
        summary: '企业 AI 平台的官方文档，确认 Agent Studio、ADK、Agent Engine 和治理能力边界从这里开始。',
        url: 'https://cloud.google.com/vertex-ai/docs',
      },
    ],
    officialLinks: [
      {
        title: 'Google AI for Developers',
        summary: '开发者门户，AI Studio、Gemini API、Gemma 的统一入口。',
        url: 'https://ai.google.dev/',
      },
      {
        title: 'Google DeepMind',
        summary: 'Gemini 模型与前沿研究的官方入口，用来理解能力底座和长期技术边界。',
        url: 'https://deepmind.google/',
      },
      {
        title: 'Gemini Enterprise Agent Platform',
        summary: '企业 AI 与 agent 平台（原 Vertex AI），面向企业采购和 Google Cloud 生态。',
        url: 'https://cloud.google.com/products/gemini-enterprise-agent-platform',
      },
      {
        title: 'Gemini',
        summary: '面向个人和团队的 Gemini 应用与 Spark 入口。',
        url: 'https://gemini.google/',
      },
    ],
    flagshipKeywords: ['gemini', 'vertex ai', 'adk', 'gemini api', 'agentic'],
    homepageUrl: 'https://ai.google.dev',
  },
  'hugging-face': {
    heroDescription:
      'Hugging Face 的公司页先看 Hub 平台、开源库、Inference 推理和 LeRobot 机器人栈怎样组成这家开源 AI 基础设施公司的产品线，再看它和 Agentic Coding、AI Evals 等主题的关系。',
    headline: '四条产品线：Hub 平台、开源库、Inference 推理、LeRobot 机器人栈；开源社区生态是贯穿其中的底座。',
    strategy:
      'Hugging Face 的定位是「机器学习之家」——做开源 AI 的中立基础设施，而不是发布自家闭源大模型。它的产品线可以按四条看：Hub 是托管 200 多万模型、50 多万数据集和 100 多万 Spaces 应用的协作平台，是整个生态的中心；Transformers / Diffusers / Datasets / Accelerate 等开源库是开发者训练和使用模型的事实标准工具链；Inference（Providers 统一 API + Endpoints 托管部署）把模型变成可直接调用的服务并接入企业付费；LeRobot 则把这套开源打法复制到机器人和具身智能。Team / Enterprise 订阅与 PRO 是覆盖在 Hub 和 Inference 之上的商业化层。',
    products: [
      {
        name: 'Hugging Face Hub',
        summary: '托管 200 多万模型、50 多万数据集和 100 多万 Spaces 应用的协作平台，是 Hugging Face 全部产品的中心和开源 AI 社区的事实仓库。',
        url: 'https://huggingface.co/models',
      },
      {
        name: '开源库（Transformers / Diffusers / Datasets / Accelerate）',
        summary: 'Transformers、Diffusers、Datasets、Accelerate、TRL、PEFT、smolagents 等开源库构成训练和使用模型的事实标准工具链，是 Hugging Face 影响力和 Hub 流量的根基。',
        url: 'https://github.com/huggingface/transformers',
      },
      {
        name: 'Inference（Providers / Endpoints）',
        summary: 'Inference Providers 用一个 HF token、OpenAI 兼容 API 路由到 Cerebras、Groq、Together、fal 等服务商的开放模型；Inference Endpoints 提供按小时计费的专属 GPU 托管部署，是平台直接的商业化收入入口。',
        url: 'https://huggingface.co/docs/inference-providers',
      },
      {
        name: 'LeRobot',
        summary: 'Hugging Face 自家的开源机器人与具身智能栈，用 PyTorch 提供模型（ACT、Diffusion、Pi0、SmolVLA 等）、标准化 LeRobotDataset 数据集和真实硬件接口，把开源打法复制到物理 AI。',
        url: 'https://github.com/huggingface/lerobot',
      },
    ],
    bets: [
      {
        title: '开源即护城河',
        body: 'Hugging Face 不押自家闭源大模型，而是把开源库和 Hub 做成事实标准，再用 Inference 和 Enterprise 把社区流量转成收入。',
      },
      {
        title: '推理商业化',
        body: 'Inference Providers 的统一 API 和 Endpoints 的托管部署，是平台从「免费托管」走向可持续付费业务的关键一跳。',
      },
      {
        title: '具身智能',
        body: 'LeRobot 把开源模型、数据集和真实硬件接口打包，试图在机器人领域复制 Transformers 在 NLP 领域的地位。',
      },
    ],
    learningResources: [
      {
        title: 'LLM Course',
        label: 'LLM 课程',
        summary: '官方系统课，用 Transformers 等 HF 生态库讲清大模型从原理到落地，是上手整个工具链最值得先读的入口。',
        url: 'https://huggingface.co/learn/llm-course',
      },
      {
        title: 'Agents Course',
        label: 'Agent 课程',
        summary: '官方 agent 课，教用 smolagents 等库构建并部署 AI agent，适合理解 HF 在 Agentic Coding 方向的工具栈。',
        url: 'https://huggingface.co/learn/agents-course',
      },
      {
        title: 'Open-Source AI Cookbook',
        label: 'Cookbook',
        summary: '由 AI builder 写给 AI builder 的开源 notebook 合集，RAG、微调、推理等真实场景的高密度落地范例。',
        url: 'https://huggingface.co/learn/cookbook',
      },
      {
        title: 'Transformers 文档',
        label: '核心库文档',
        summary: 'Transformers 库官方文档，确认模型加载、训练、推理和 pipeline 能力边界从这里开始。',
        url: 'https://huggingface.co/docs/transformers',
      },
      {
        title: 'Robotics Course',
        label: '机器人课程',
        summary: '官方机器人课，教用 LeRobot 构建机器人，是理解 HF 具身智能产品线的入口。',
        url: 'https://huggingface.co/learn/robotics-course',
      },
      {
        title: 'Hugging Face Blog',
        label: '官方博客',
        summary: '模型发布、库更新和工程实践的官方博客，跟踪生态动向和新能力的主入口。',
        url: 'https://huggingface.co/blog',
      },
    ],
    officialLinks: [
      {
        title: 'Hugging Face',
        summary: '平台和社区主入口，模型、数据集、Spaces 的统一门户。',
        url: 'https://huggingface.co',
      },
      {
        title: 'Hugging Face Docs',
        summary: 'Hub、Transformers、Inference 等全部产品文档的官方入口。',
        url: 'https://huggingface.co/docs',
      },
      {
        title: 'Hugging Face Learn',
        summary: '官方课程矩阵（LLM / Agents / 机器人 / 扩散 / 音频等）的统一入口。',
        url: 'https://huggingface.co/learn',
      },
      {
        title: 'Hugging Face on GitHub',
        summary: 'Transformers、Diffusers、LeRobot 等开源库的代码仓库。',
        url: 'https://github.com/huggingface',
      },
    ],
    flagshipKeywords: ['hugging face hub', 'transformers', 'lerobot', 'inference'],
    homepageUrl: 'https://huggingface.co',
  },
  minimax: {
    heroDescription:
      'MiniMax（稀宇科技）的公司页先看 M 系列模型、海螺（Hailuo）视频、语音与音乐生成、MiniMax Agent 与开放平台怎样组成多模态产品线，再看它和 Agentic Coding、Context Engineering 等主题的关系。',
    headline: '四条产品线：M 系列文本与编码模型、海螺 Hailuo 视频生成、语音与音乐生成、MiniMax Agent 与开放平台；自研多模态基础模型是贯穿其中的底座。',
    strategy:
      'MiniMax 的 AI 布局可以按四条产品线看：M 系列（M3 等）是面向编码、超长上下文和原生多模态的核心模型；海螺 Hailuo 把模型能力做成视频生成产品；语音与音乐生成覆盖音频模态；MiniMax Agent 与开放平台则负责把这些能力分发给终端用户和开发者。公司一贯的打法是自研多模态基础模型，再横向铺到文本、视频、语音、音乐多个产品，靠 minimax.io / 开放平台 API 同时做应用和平台两端收入。',
    products: [
      {
        name: 'M 系列模型（M3）',
        summary: 'MiniMax 的核心文本与编码模型线。M3（2026/6/1 发布）主打前沿编码、100 万 token 上下文和原生多模态，是观察 MiniMax 进入 Agentic Coding 与长上下文的主入口，也以开放权重形式发布。',
        url: 'https://www.minimax.io/blog/minimax-m3',
      },
      {
        name: '海螺 Hailuo 视频生成',
        summary: 'MiniMax 面向创作者的视频生成产品线，最新为 Hailuo 2.3，强调物理动作、微表情和多种美术风格，已铺到 Hailuo 网站、移动 App 和开放平台 API。',
        url: 'https://hailuoai.video',
      },
      {
        name: '语音与音乐生成（MiniMax Audio）',
        summary: 'MiniMax 的音频模态产品，含 Speech 系列文本转语音（多语种、300+ 音色与声音克隆）和 Music 系列歌曲生成，是模型能力在语音、音乐方向的落地入口。',
        url: 'https://www.minimax.io/audio',
      },
      {
        name: 'MiniMax Agent 与开放平台',
        summary: 'MiniMax Agent（升级后名为 Mavis）是完成长链路复杂任务的通用智能体应用；开放平台 / API 则把 M 系列、海螺、语音音乐能力统一暴露给开发者，是应用与平台两端的分发渠道。',
        url: 'https://agent.minimax.io',
      },
    ],
    bets: [
      {
        title: '长上下文与编码',
        body: 'M3 把前沿编码能力和 100 万 token 上下文（MSA 稀疏注意力）放在一起，适合后续和 Context Engineering / Agentic Coding 对照。',
      },
      {
        title: '原生多模态产品矩阵',
        body: 'MiniMax 把同一套多模态基础模型横向铺成文本、视频（海螺）、语音、音乐多条产品线，是观察一家模型公司如何做全模态分发的样本。',
      },
      {
        title: '通用智能体',
        body: 'MiniMax Agent 把模型能力包装成能跑长链路任务的通用智能体应用，指向 agent 产品化而非单点聊天。',
      },
    ],
    learningResources: [
      {
        title: 'MiniMax M3: Frontier Coding, 1M Context, Native Multimodality',
        label: '模型发布',
        summary: '最值得先读的官方材料，讲清 M3 的编码、超长上下文、原生多模态和开放权重定位，以及 MSA 稀疏注意力架构。',
        url: 'https://www.minimax.io/blog/minimax-m3',
      },
      {
        title: 'MiniMax API 开放平台文档',
        label: 'API 平台',
        summary: '官方开放平台文档，覆盖 M 系列文本模型、语音 T2A、视频、音乐和文件管理 API，支持 Anthropic / OpenAI SDK 兼容，是确认平台能力边界的入口。',
        url: 'https://platform.minimax.io/docs/api-reference/api-overview',
      },
      {
        title: 'MiniMax Hailuo 2.3 发布说明',
        label: '视频生成',
        summary: '官方解读海螺 2.3 在物理动作、微表情和美术风格上的提升，以及它如何铺到网站、App 和开放平台 API。',
        url: 'https://www.minimax.io/news/minimax-hailuo-23',
      },
      {
        title: 'MiniMax Agent 发布说明',
        label: '智能体',
        summary: '理解 MiniMax 如何把模型能力做成能跑长链路、多步规划复杂任务的通用智能体产品。',
        url: 'https://www.minimax.io/news/minimax-agent',
      },
    ],
    officialLinks: [
      {
        title: 'MiniMax',
        summary: '公司官网和产品总入口。',
        url: 'https://www.minimax.io',
      },
      {
        title: 'MiniMax 开放平台',
        summary: '开发者 API、模型清单和文档入口。',
        url: 'https://platform.minimax.io',
      },
      {
        title: '海螺 Hailuo AI',
        summary: '视频与图像生成产品入口。',
        url: 'https://hailuoai.video',
      },
    ],
    flagshipKeywords: ['minimax m3', 'hailuo', '海螺', 'agent', 'long context', 'multimodal'],
    homepageUrl: 'https://www.minimax.io',
  },
  'mistral-ai': {
    heroDescription:
      'Mistral AI 的公司页先看 Mistral 模型家族、Le Chat、La Plateforme 和编码栈怎样组成 AI 产品线，再理解它作为欧洲主权 AI 厂商如何兼顾开放权重与企业落地。',
    headline: '四条产品线：Mistral 模型家族、Le Chat、La Plateforme、编码栈；开放权重与欧洲主权定位是贯穿其中的底色。',
    strategy:
      'Mistral AI 是来自法国的基础模型公司，它的布局可以按四条产品线看：Mistral 模型家族（Large / Medium / Small 等）是底层能力来源，Le Chat 是面向个人、团队和企业的助手应用，La Plateforme 是开发者调用模型的 API 平台，编码栈（Codestral / Devstral / Mistral Code）把模型带进真实工程循环。开放权重发布和欧洲数据主权（GDPR、自有数据中心、可私有化部署）不单独成线，而是它区别于美国大厂、赢得企业采购的核心叙事。',
    products: [
      {
        name: 'Mistral 模型家族',
        summary: '从旗舰 Mistral Large 到企业性价比的 Mistral Medium、轻量开源的 Mistral Small 与端侧 Ministral，是公司全部产品的能力来源；多数权重以开放许可发布，是 Mistral「开放权重」叙事的核心。',
        url: 'https://docs.mistral.ai/getting-started/models/models_overview/',
      },
      {
        name: 'Le Chat',
        summary: '面向个人、团队和企业的助手应用（Pro / Team / Enterprise 分层），承接模型能力和日常协作；企业版主打企业搜索、安全数据连接器、无代码 Agent 构建与可私有化部署，是 Mistral 触达终端用户和企业采购的入口。',
        url: 'https://mistral.ai/news/le-chat-enterprise/',
      },
      {
        name: 'La Plateforme',
        summary: '开发者把 Mistral 模型接入应用的 API 平台，提供免费试用层、商用层、微调与零保留数据隔离，并支持在 Azure / AWS / GCP 或自有租户部署，是 Mistral 平台化收入和生态扩展的基础（console.mistral.ai 登录）。',
        url: 'https://mistral.ai/news/la-plateforme/',
      },
      {
        name: '编码栈（Codestral / Devstral / Mistral Code）',
        summary: '面向真实代码库的编码产品线：Codestral 做补全与 FIM，Devstral 做多文件重构、测试生成等 agentic coding，统一通过 Mistral Code 的 JetBrains / VS Code 插件交付，是 Mistral 在 Agentic Coding 主题里的公司样本。',
        url: 'https://mistral.ai/news/codestral-25-08/',
      },
    ],
    bets: [
      {
        title: '开放权重模型',
        body: 'Mistral 多数模型以开放许可发布，开发者可自托管和微调，这是它区别于闭源大厂、聚拢社区和企业的核心差异点。',
      },
      {
        title: '欧洲主权 AI',
        body: 'GDPR 合规、欧洲自有数据中心和可私有化 / 混合部署，让 Le Chat 与 La Plateforme 成为受监管行业和欧洲企业采购的主权替代方案。',
      },
      {
        title: '开发者工作流',
        body: '编码栈（Codestral / Devstral / Mistral Code）把模型能力带进补全、重构和 agentic coding，是观察 Mistral 工程化落地的窗口。',
      },
      {
        title: '平台与企业',
        body: 'La Plateforme、Le Chat Enterprise 和云市场分发决定 Mistral 能否把模型能力扩成稳定业务，而不是停留在模型发布本身。',
      },
    ],
    learningResources: [
      {
        title: 'Models overview（docs）',
        label: '模型家族',
        summary: '官方模型总览文档，按通用 / 编码 / 多模态 / 音频分类列出当前在用模型和弃用时间线，最值得先读来建立 Mistral 产品全貌。',
        url: 'https://docs.mistral.ai/getting-started/models/models_overview/',
      },
      {
        title: 'Introducing Le Chat Enterprise',
        label: 'Le Chat',
        summary: '官方发布博客，讲 Le Chat 如何从消费助手扩到企业搜索、Agent 构建、自定义模型和混合部署，是理解 Mistral 企业打法的入口。',
        url: 'https://mistral.ai/news/le-chat-enterprise/',
      },
      {
        title: 'La Plateforme',
        label: '开发者平台',
        summary: '官方介绍 La Plateforme 的免费层、数据隔离、微调和多云部署，是理解 Mistral 平台化和 API 生态的关键材料。',
        url: 'https://mistral.ai/news/la-plateforme/',
      },
      {
        title: 'Codestral 25.08 与企业编码栈',
        label: '编码栈',
        summary: '解释 Codestral、Devstral 和 Mistral Code 如何组成完整编码栈，适合用来理解 Mistral 在 agentic coding 上的产品化思路。',
        url: 'https://mistral.ai/news/codestral-25-08/',
      },
      {
        title: 'Mistral Documentation',
        label: '开发者文档',
        summary: 'API、模型、微调和 Agents 能力的官方文档入口，落地调用时用来确认能力边界。',
        url: 'https://docs.mistral.ai/',
      },
    ],
    officialLinks: [
      {
        title: 'Mistral AI',
        summary: '公司官网入口，可看产品、模型和最新发布。',
        url: 'https://mistral.ai',
      },
      {
        title: 'Mistral Docs',
        summary: '模型、API、微调和平台能力的官方文档入口。',
        url: 'https://docs.mistral.ai/',
      },
      {
        title: 'Le Chat',
        summary: 'Le Chat 助手应用入口，个人和团队可直接使用。',
        url: 'https://chat.mistral.ai',
      },
    ],
    flagshipKeywords: ['mistral', 'le chat', 'codestral', 'devstral'],
    homepageUrl: 'https://mistral.ai',
  },
  nvidia: {
    heroDescription:
      'NVIDIA 的公司页先看数据中心 AI 计算（DGX / Blackwell + CUDA）、企业推理软件栈（NIM / AI Enterprise）、Omniverse 物理 AI 仿真，以及本地与消费端 RTX，再看它和 Agentic Coding、物理 AI 等主题的关系。',
    headline:
      '四条产品线：数据中心 AI 计算、企业推理软件栈、Omniverse 物理 AI、本地与消费端 RTX；CUDA 与前沿模型研究是贯穿其中的底座。',
    strategy:
      'NVIDIA 是全球 AI 算力的事实基础设施，它的布局可以按四条产品线看：DGX / Blackwell 数据中心系统负责大模型训练和推理的算力底座，NIM 微服务与 AI Enterprise 把这套算力包装成企业可部署的推理软件栈，Omniverse 把模型能力延伸到仿真、数字孪生和机器人等物理 AI 场景，RTX 则覆盖工作站、消费端和本地 AI（如 DGX Spark 桌面超算）。CUDA 生态和模型研究不单独成线，而是让上述硬件被开发者和企业长期采用的护城河。',
    products: [
      {
        name: '数据中心 AI 计算（DGX / Blackwell + CUDA）',
        summary:
          'NVIDIA 的算力底座：DGX 系统与 Blackwell（GB200 / GB300）架构面向万亿参数模型的训练和推理，配合 CUDA 加速计算平台，是当前全球 AI 大模型训练最核心的基础设施。',
        url: 'https://www.nvidia.com/en-us/data-center/dgx-platform/',
      },
      {
        name: 'NIM 微服务 / NVIDIA AI Enterprise',
        summary:
          '企业推理软件栈：NIM 把优化好的推理微服务打包成标准 API 容器，AI Enterprise 提供生产级安全、稳定性和支持，让企业把模型从试点推到生产，是 NVIDIA 在硬件之上的软件变现层。',
        url: 'https://www.nvidia.com/en-us/ai-data-science/products/nim-microservices/',
      },
      {
        name: 'Omniverse（物理 AI / 仿真 / 数字孪生）',
        summary:
          '基于 OpenUSD 的加速库与微服务平台，用于工业数字孪生、机器人仿真和自动驾驶开发，配合 Cosmos 世界模型和 Isaac 机器人框架，把 NVIDIA 算力延伸到物理 AI 场景。',
        url: 'https://www.nvidia.com/en-us/omniverse/',
      },
      {
        name: 'RTX（工作站 / 消费端 / 本地 AI）',
        summary:
          'RTX GPU 覆盖游戏、创作和工作站，并把 AI 推理带到本地设备；DGX Spark 等桌面级超算让开发者在本机运行大模型，是 NVIDIA 维持开发者入口和本地算力的产品线。',
        url: 'https://www.nvidia.com/en-us/ai/',
      },
    ],
    bets: [
      {
        title: '算力即基础设施',
        body: 'DGX / Blackwell 和 CUDA 让 NVIDIA 成为 AI 大模型训练和推理的事实底座，硬件供给和生态锁定是其最深的护城河。',
      },
      {
        title: '从硬件到软件栈',
        body: 'NIM 微服务和 AI Enterprise 把算力包装成企业可部署的推理软件，是 NVIDIA 从卖芯片走向卖平台和软件订阅的关键一跃。',
      },
      {
        title: '物理 AI',
        body: 'Omniverse、Cosmos 和 Isaac 把模型能力推向仿真、数字孪生和机器人，押注 AI 从数字世界进入物理世界的下一个周期。',
      },
      {
        title: '本地与边缘算力',
        body: 'RTX 和 DGX Spark 把 AI 推理带到工作站和本地设备，既守住开发者入口，也为边缘和隐私敏感场景保留分发渠道。',
      },
    ],
    learningResources: [
      {
        title: 'NVIDIA NIM for Developers',
        label: '推理微服务',
        summary: '最值得先读的开发者入口，讲清楚如何用 NIM 容器把优化好的模型推理服务部署到云、数据中心或本地。',
        url: 'https://developer.nvidia.com/nim',
      },
      {
        title: 'NVIDIA NIM 文档',
        label: '部署文档',
        summary: '加速基础模型部署的微服务文档，确认 NIM 能力边界和落地写法从这里开始。',
        url: 'https://docs.nvidia.com/nim/index.html',
      },
      {
        title: 'CUDA Zone',
        label: 'CUDA',
        summary: 'NVIDIA 加速计算平台的开发者门户，理解整个 AI 软件栈为什么绑定 NVIDIA GPU 的底层入口。',
        url: 'https://developer.nvidia.com/cuda-zone',
      },
      {
        title: 'Into the Omniverse: Physical AI Open Models and Frameworks',
        label: '物理 AI',
        summary: 'NVIDIA 官方博客，讲 Cosmos 世界模型、Isaac 机器人框架和 Omniverse 如何一起推进物理 AI。',
        url: 'https://blogs.nvidia.com/blog/physical-ai-open-models-robot-autonomous-systems-omniverse/',
      },
      {
        title: 'NVIDIA Blackwell Architecture',
        label: '数据中心架构',
        summary: '理解 GB200 / GB300 和 AI 工厂算力底座的官方架构页，看懂 NVIDIA 数据中心产品线的技术根基。',
        url: 'https://www.nvidia.com/en-us/data-center/technologies/blackwell-architecture/',
      },
    ],
    officialLinks: [
      {
        title: 'NVIDIA AI Platform',
        summary: 'NVIDIA AI 平台总入口，覆盖 NeMo、NIM、AI Enterprise 和 AI 智能体能力。',
        url: 'https://www.nvidia.com/en-us/ai/',
      },
      {
        title: 'NVIDIA Developer',
        summary: '开发者门户，CUDA、NIM、Omniverse 和各类 SDK 的统一入口。',
        url: 'https://developer.nvidia.com',
      },
      {
        title: 'NVIDIA Data Center',
        summary: 'DGX / Blackwell 数据中心平台官方页，确认算力产品线边界。',
        url: 'https://www.nvidia.com/en-us/data-center/',
      },
      {
        title: 'NVIDIA',
        summary: '公司官网入口。',
        url: 'https://www.nvidia.com',
      },
    ],
    flagshipKeywords: ['cuda', 'nim', 'dgx', 'blackwell', 'omniverse', 'rtx'],
    homepageUrl: 'https://www.nvidia.com',
  },
  meta: {
    heroDescription:
      'Meta 的公司页先看 Llama 开源模型家族、Meta AI 助手、Meta Superintelligence Labs 与 FAIR 研究、PyTorch 与 AI 基础设施怎样组成 AI 产品线，再看它和开源模型、端侧与可穿戴 AI 等主题的关系。',
    headline:
      '四条产品线：Llama 开源模型家族、Meta AI 助手、Meta Superintelligence Labs 与 FAIR 研究、PyTorch 与 AI 基础设施；前沿模型研究是贯穿其中的底座。',
    strategy:
      'Meta 的 AI 布局可以按四条产品线看：Llama 是公开权重的开源模型家族，靠免费可商用授权撬动全球开发者生态，是 Meta AI 战略区别于闭源大厂的核心打法；Meta AI 助手把模型能力嵌进 WhatsApp、Instagram、Facebook、Messenger、独立 App 和 Ray-Ban 智能眼镜，依托数十亿用户的分发体量直达终端；Meta Superintelligence Labs 与 FAIR 负责前沿模型与基础研究，决定整套产品的能力上限；PyTorch 与 AI 基础设施则是 Meta 自家训练和推理的底座，也通过开源成为整个行业的事实标准框架。开源模型加平台级分发，是 Meta 把 AI 能力同时铺向开发者和消费者的战略支点。',
    products: [
      {
        name: 'Llama 开源模型家族',
        summary:
          'Meta 公开权重、可商用授权的开源大模型家族（含 Llama 4 多模态系列），并通过 Llama API 让开发者直接托管调用，是 Meta AI 战略的能力底座，也是全球开源模型生态的事实参照。',
        url: 'https://www.llama.com/',
      },
      {
        name: 'Meta AI 助手',
        summary:
          '面向用户的 AI 助手，嵌入 WhatsApp、Instagram、Facebook、Messenger、独立 App、meta.ai 网页和 Ray-Ban Meta 智能眼镜，依托 Meta 旗下应用的数十亿用户体量，是模型能力直达终端用户的最大触点。',
        url: 'https://www.meta.ai/',
      },
      {
        name: 'Meta Superintelligence Labs 与 FAIR 研究',
        summary:
          'Meta 的前沿模型与基础研究组织，Meta Superintelligence Labs 聚焦下一代模型与智能体，FAIR（基础 AI 研究）承接长期开放研究与论文发布，共同决定 Llama 家族和助手产品的能力上限。',
        url: 'https://ai.meta.com/research/',
      },
      {
        name: 'PyTorch 与 AI 基础设施',
        summary:
          'PyTorch 是 Meta 创建、现由 PyTorch Foundation 托管的开源深度学习框架，已成为全行业训练和推理的事实标准；配合 Meta 自研的训练与推理基础设施，构成 Llama 和 Meta AI 的工程底座。',
        url: 'https://ai.meta.com/tools/pytorch/',
      },
    ],
    bets: [
      {
        title: '开源模型即护城河',
        body: 'Meta 用公开权重、可商用的 Llama 撬动全球开发者生态，靠开源把行业标准拉到自己一侧，再用平台分发把势能转成产品。',
      },
      {
        title: '平台级分发',
        body: 'Meta AI 助手嵌进 WhatsApp、Instagram、Facebook、Messenger 和 Ray-Ban 眼镜，数十亿用户的分发体量是 Meta 区别于纯模型公司的根本优势。',
      },
      {
        title: '可穿戴与端侧 AI',
        body: 'Ray-Ban Meta 智能眼镜把 AI 助手带到第一人称视角，是 Meta 押注下一代 AI 交互入口、跳过手机屏幕的关键样本。',
      },
      {
        title: '前沿研究底座',
        body: 'Meta Superintelligence Labs 与 FAIR 的前沿模型和基础研究不单独成线，但决定 Llama 家族和助手产品的能力上限。',
      },
    ],
    learningResources: [
      {
        title: 'AI at Meta Blog',
        label: '官方博客',
        summary: 'Meta AI 官方博客，模型发布、研究成果和工程实践的高密度入口，跟踪 Llama 与 Meta AI 动向从这里开始。',
        url: 'https://ai.meta.com/blog/',
      },
      {
        title: 'The Llama 4 herd: natively multimodal AI innovation',
        label: 'Llama 模型',
        summary: 'Llama 4 系列（Scout / Maverick 等）的官方发布长文，讲清原生多模态架构和长上下文能力，是理解 Llama 家族当前形态的第一手材料。',
        url: 'https://ai.meta.com/blog/llama-4-multimodal-intelligence/',
      },
      {
        title: 'Everything we announced at our first-ever LlamaCon',
        label: '开发者大会',
        summary: 'Meta 首届 LlamaCon 的官方汇总，讲 Llama API、开源生态和开发者工具方向，是理解 Meta 开源平台战略的关键材料。',
        url: 'https://ai.meta.com/blog/llamacon-llama-news/',
      },
      {
        title: 'Meta AI Research',
        label: 'FAIR 研究',
        summary: 'Meta 的 AI 研究门户（含 FAIR 与 Meta Superintelligence Labs 方向），理解前沿模型与基础研究的能力底座从这里开始。',
        url: 'https://ai.meta.com/research/',
      },
      {
        title: 'PyTorch',
        label: 'AI 基础设施',
        summary: 'Meta 创建的开源深度学习框架官方页，理解 Meta 与全行业训练推理底座从这里开始。',
        url: 'https://ai.meta.com/tools/pytorch/',
      },
      {
        title: 'Llama API 文档',
        label: '开发者平台',
        summary: 'Meta 托管的 Llama API 官方文档，含 chat completion、图像理解和工具调用，是开发者把 Llama 接入应用的入口。',
        url: 'https://llama.developer.meta.com/',
      },
    ],
    officialLinks: [
      {
        title: 'AI at Meta',
        summary: 'Meta AI 官方门户，模型、产品和研究的统一入口。',
        url: 'https://ai.meta.com/',
      },
      {
        title: 'Llama',
        summary: 'Llama 开源模型家族与 Llama API 的官方入口。',
        url: 'https://www.llama.com/',
      },
      {
        title: 'Meta AI',
        summary: '面向用户的 Meta AI 助手网页入口。',
        url: 'https://www.meta.ai/',
      },
      {
        title: 'Meta Newsroom',
        summary: 'Meta 官方新闻，用来跟踪 AI 产品与公司战略发布节奏。',
        url: 'https://about.fb.com/news/',
      },
    ],
    flagshipKeywords: ['llama', 'meta ai', 'pytorch', 'fair', 'superintelligence'],
    homepageUrl: 'https://ai.meta.com',
  },
  microsoft: {
    heroDescription:
      'Microsoft 的公司页先看 Copilot 家族、Microsoft Foundry 企业 AI 平台、自研 MAI 模型和 GitHub Copilot 怎样组成 AI 产品线，再看它和 Agentic Coding、企业 AI 分发等主题的关系。',
    headline:
      '四条产品线：Copilot 家族、Microsoft Foundry 企业 AI 平台、自研 MAI 模型、GitHub Copilot；既分发 OpenAI 等外部模型，又自研模型并存是贯穿其中的底座。',
    strategy:
      'Microsoft 的 AI 布局可以按四条产品线看：Copilot 家族是面向用户和企业的应用入口（Microsoft 365 Copilot 嵌进 Word / Excel / Teams，消费版 Copilot 面向个人），Microsoft Foundry（2026 年初由 Azure AI Foundry 更名）是把 1,900+ 模型、Agent 编排和企业治理打包的开发者与企业平台，自研 MAI 模型是 2025 年底成立的 Superintelligence 团队的产物（MAI-1、MAI-Thinking、MAI-Code、MAI-Voice / Transcribe / Image），GitHub Copilot 则把模型带进真实软件工程的 agentic coding。Microsoft 不只押单一来源：它既通过 Foundry 和 Copilot 大规模分发 OpenAI、Anthropic 等外部模型，又用 MAI 自研模型逐步替换部分底层调用——分发外部前沿模型与自研模型并存，是它区别于纯模型公司的战略底座。',
    products: [
      {
        name: 'Copilot 家族',
        summary:
          '面向用户和企业的应用入口：Microsoft 365 Copilot 把 AI 嵌进 Word、Excel、PowerPoint、Teams（Agent Mode 已成默认），消费版 Copilot 面向个人，另有 Security Copilot、Copilot Studio 等专项变体，是 Microsoft AI 能力触达终端用户的最大触点。',
        url: 'https://www.microsoft.com/microsoft-copilot',
      },
      {
        name: 'Microsoft Foundry',
        summary:
          '2026 年初由 Azure AI Foundry 更名的统一企业 AI 平台，提供 1,900+ 模型（OpenAI / Anthropic / Mistral / xAI / DeepSeek / 自研 MAI 等）、Agent 编排、工具目录、评估与企业治理，是 Microsoft 把模型和 agent 规模化分发进企业采购和 Azure 生态的主入口。',
        url: 'https://azure.microsoft.com/products/ai-foundry',
      },
      {
        name: '自研 MAI 模型',
        summary:
          'Microsoft AI 在 2025 年底成立 Superintelligence 团队后自研的模型族，含 MAI-1、推理模型 MAI-Thinking、编码模型 MAI-Code（已用于 GitHub / VS Code）和语音视觉的 MAI-Voice / MAI-Transcribe / MAI-Image，在 Microsoft Foundry 上提供，是它从依赖 OpenAI 走向自有模型能力的关键样本。',
        url: 'https://microsoft.ai/',
      },
      {
        name: 'GitHub Copilot',
        summary:
          '面向真实代码库的 AI 编程助手，覆盖编辑器、终端、GitHub 和 Chat，从结对补全演进到 agentic coding，是观察 Microsoft 在 Agentic Coding 落地的核心样本，也是 MAI-Code 等自研模型逐步接入的前沿场景。',
        url: 'https://github.com/features/copilot',
      },
    ],
    bets: [
      {
        title: '分发外部模型与自研并存',
        body: 'Microsoft 既通过 Foundry 和 Copilot 大规模分发 OpenAI、Anthropic 等前沿模型，又自研 MAI 模型逐步替换部分底层调用，对冲对单一模型供应商的依赖。',
      },
      {
        title: '企业 AI 分发',
        body: 'Microsoft Foundry 把模型、Agent 构建工具和治理打包进企业采购和 Azure 生态，是 Microsoft 把 AI 能力扩成稳定企业业务的规模化渠道。',
      },
      {
        title: 'Agentic Coding',
        body: 'GitHub Copilot 从结对补全转向 agent 模式，并开始接入自研 MAI-Code 模型，是观察 Microsoft 在 agentic coding 上落地的关键窗口。',
      },
      {
        title: '自研模型能力',
        body: '2025 年底成立的 Superintelligence 团队和 MAI 模型族，决定 Microsoft 能否在前沿模型上建立不依赖外部供应商的自有能力底座。',
      },
    ],
    learningResources: [
      {
        title: 'Microsoft Foundry 文档',
        label: '企业 AI 平台',
        summary: '最值得先读的官方文档，讲清 Foundry 如何统一模型、Agent 编排、工具目录和企业治理，是理解 Microsoft 企业 AI 平台能力边界的起点。',
        url: 'https://learn.microsoft.com/azure/ai-foundry/',
      },
      {
        title: 'Microsoft AI 官方博客',
        label: '自研模型',
        summary: 'Microsoft AI（Mustafa Suleyman 团队）官方发布渠道，MAI-1、MAI-Thinking、MAI-Code、MAI-Voice 等自研模型的第一手发布材料都在这里。',
        url: 'https://microsoft.ai/news/',
      },
      {
        title: 'GitHub Copilot 文档',
        label: 'Agentic Coding',
        summary: 'GitHub Copilot 官方文档，确认补全、Chat、agent 模式和 CLI 的能力边界，是理解 Microsoft agentic coding 落地写法的入口。',
        url: 'https://docs.github.com/copilot',
      },
      {
        title: 'Microsoft 365 Copilot 文档',
        label: '生产力 Copilot',
        summary: '官方文档，讲清 Copilot 如何嵌进 Word、Excel、Teams 等场景和 Agent Mode 的工作方式，是理解 Copilot 家族落地的材料。',
        url: 'https://learn.microsoft.com/microsoft-365-copilot/',
      },
      {
        title: 'Azure AI Foundry Blog',
        label: '平台工程',
        summary: 'Foundry 团队的官方博客，模型上新（含 MAI 模型入驻 Foundry）、Agent 能力和平台更新的高密度长文都在这里。',
        url: 'https://techcommunity.microsoft.com/category/azure-ai-foundry/blog/azure-ai-foundry-blog',
      },
      {
        title: 'Microsoft Build 2026',
        label: '产品发布',
        summary: 'Microsoft 年度开发者大会官方页，集中发布 MAI 新模型、Copilot 和 Foundry 的产品节奏，适合跟踪 Microsoft AI 战略的最新信号。',
        url: 'https://news.microsoft.com/build-2026/',
      },
    ],
    officialLinks: [
      {
        title: 'Microsoft Copilot',
        summary: 'Copilot 家族产品页，看面向用户和企业的 AI 应用全貌。',
        url: 'https://www.microsoft.com/microsoft-copilot',
      },
      {
        title: 'Microsoft Foundry',
        summary: '企业 AI 与 agent 平台（原 Azure AI Foundry），面向企业采购和 Azure 生态。',
        url: 'https://azure.microsoft.com/products/ai-foundry',
      },
      {
        title: 'Microsoft AI',
        summary: 'Microsoft AI 团队官方门户，自研 MAI 模型和研究方向的入口。',
        url: 'https://microsoft.ai/',
      },
      {
        title: 'GitHub Copilot',
        summary: 'GitHub Copilot 产品页，AI 编程助手的功能和定价入口。',
        url: 'https://github.com/features/copilot',
      },
    ],
    flagshipKeywords: ['copilot', 'microsoft foundry', 'mai', 'github copilot'],
    homepageUrl: 'https://www.microsoft.com',
  },
  cohere: {
    heroDescription:
      'Cohere 的公司页先看 Command 模型家族、Embed / Rerank 检索栈、North 企业 agent 平台和企业私有化部署怎样组成 AI 产品线，再看它和 RAG、企业 Agent 等主题的关系。',
    headline: '四条产品线：Command 模型家族、Embed / Rerank 检索栈、North 企业 agent 平台、企业级私有化部署；专注企业、可私有部署的安全 AI 是贯穿其中的底座。',
    strategy:
      'Cohere 是少数从一开始就只做企业 AI 的模型公司——不追消费级聊天产品，而是把模型、检索和 agent 平台都按企业采购、合规和数据主权的要求来设计。它的 AI 布局可以按四条产品线看：Command 模型家族（旗舰 Command A+，2026 年 5 月以 Apache 2.0 开源发布，主打 agentic、多语言和带引用的可控生成）是能力核心；Embed 和 Rerank 组成检索栈，专门把企业内部文档喂进 RAG 和 agent 工作流，提升检索准确率；North 是面向企业员工的 agent 平台，由 Command、Embed、Rerank 等驱动，把安全 agent、企业搜索和生成式 AI 装进一个工作台；私有化部署不单独成线，而是贯穿全部产品的底座——模型可以跑在客户自己的 VPC 或本地，连权重都能下载，这正是它区别于闭源大厂、主打“主权 AI”的战略支点。',
    products: [
      {
        name: 'Command 模型家族',
        summary:
          'Cohere 面向企业的旗舰生成模型线，当前旗舰 Command A+ 于 2026 年 5 月以 Apache 2.0 开源发布，主打 agentic、多模态、多语言和原生引用生成，可私有或在云上 VPC 内部署，是整个产品矩阵的能力底座。',
        url: 'https://cohere.com/command',
      },
      {
        name: 'Embed / Rerank 检索栈',
        summary:
          'Cohere 的企业检索两件套：Embed（当前 Embed 4，多模态、100+ 语言）把文本和图像转成可语义检索的向量；Rerank 在 RAG 和 agent 流程里只放行最相关的文档，降低 token 与延迟、提升准确率，是企业搜索和 RAG 的核心组件。',
        url: 'https://cohere.com/rerank',
      },
      {
        name: 'North 企业 agent 平台',
        summary:
          '面向企业员工的安全 AI 工作台，由 Command、Compass、Embed、Rerank 驱动，把可定制 agent、企业搜索和生成式 AI 装进一处，让答案锚定在企业内部数据上，是 Cohere 模型能力直达企业一线的应用入口。',
        url: 'https://cohere.com/north',
      },
      {
        name: '企业级私有化部署',
        summary:
          'Cohere 把“模型留在客户自己的环境里”做成可交付能力：支持私有部署、跑在 hyperscaler 的 VPC 内、提供可下载权重和 Model Vault，面向金融、医疗、政府等受监管和主权 AI 场景，是它区别于闭源大厂的核心卖点。',
        url: 'https://docs.cohere.com/docs/deployment-options',
      },
    ],
    bets: [
      {
        title: '只做企业 AI',
        body: 'Cohere 不做消费级聊天产品，模型、检索和 agent 平台全部按企业采购、合规和数据主权设计，靠垂直专注换取受监管行业的信任。',
      },
      {
        title: '检索是护城河',
        body: 'Embed 和 Rerank 把“让企业内部数据被准确检索”做成独立产品，RAG 和 agent 质量取决于检索质量，这是 Cohere 区别于纯模型公司的关键能力。',
      },
      {
        title: '私有化与主权 AI',
        body: '可私有部署、可下载权重、可跑在客户 VPC 内，Command A+ 以 Apache 2.0 开源，直指组织要直接掌控基础设施和模型行为的主权 AI 场景。',
      },
      {
        title: 'North 把模型变成工作台',
        body: 'North 把 Command、Embed、Rerank 包装成企业员工日常可用的 agent 平台，决定 Cohere 能否把模型能力扩成贴近业务的稳定收入，而不是停留在 API。',
      },
    ],
    learningResources: [
      {
        title: 'Cohere Documentation',
        label: '开发者文档',
        summary: '最值得先读的官方文档，覆盖 Command、Embed、Rerank、工具调用和部署选项，确认平台能力边界从这里开始。',
        url: 'https://docs.cohere.com/',
      },
      {
        title: 'Introducing Command A+',
        label: '旗舰模型',
        summary: 'Command A+ 的官方发布博客，讲清这款 Apache 2.0 开源、可在 2 张 H100 上跑的企业级 agentic 模型的能力与定位，是理解 Cohere 模型底座的第一手材料。',
        url: 'https://cohere.com/blog/command-a-plus',
      },
      {
        title: 'Rerank: Boost Enterprise Search and Retrieval',
        label: '检索栈',
        summary: 'Rerank 官方产品页，讲清它如何在 RAG 和 agent 流程里只放行最相关文档、降低 token 与延迟，是理解 Cohere 检索能力的入口。',
        url: 'https://cohere.com/rerank',
      },
      {
        title: 'Cohere Blog',
        label: '官方博客',
        summary: '模型发布、企业落地和工程实践的官方博客，跟踪 Command、North、Embed 等产品节奏的主入口。',
        url: 'https://cohere.com/blog',
      },
      {
        title: 'Cohere Labs',
        label: '研究',
        summary: 'Cohere 的研究部门，含多语言（Aya 家族）、AI 评测、开放科学社区和论文，理解公司长期技术底座从这里开始。',
        url: 'https://cohere.com/research',
      },
    ],
    officialLinks: [
      {
        title: 'Cohere',
        summary: '公司官网和产品入口。',
        url: 'https://cohere.com',
      },
      {
        title: 'Cohere Docs',
        summary: 'Command、Embed、Rerank、工具调用和部署选项的官方文档入口。',
        url: 'https://docs.cohere.com/',
      },
      {
        title: 'Cohere Labs',
        summary: '研究发布与开放科学社区，用来理解公司长期技术边界。',
        url: 'https://cohere.com/research',
      },
    ],
    flagshipKeywords: ['command', 'rerank', 'embed', 'north', 'rag'],
    homepageUrl: 'https://cohere.com',
  },
  perplexity: {
    heroDescription:
      'Perplexity 的公司页先看答案引擎（AI 搜索 + Deep Research）、Comet AI 浏览器、企业版与 Spaces、Sonar / Search API 开发者平台怎样组成 AI 产品线，再看它和实时检索、Agentic 浏览等主题的关系。',
    headline: '四条产品线：答案引擎（AI 搜索 + Deep Research）、Comet AI 浏览器、企业版与 Spaces、Sonar / Search API 开发者平台；带引用的实时检索是贯穿其中的底座。',
    strategy:
      'Perplexity 的定位是「答案引擎」——不返回一堆蓝色链接，而是直接给出带来源引用的答案，并把这套实时检索能力延伸成四条产品线。答案引擎是面向用户的核心入口，AI 搜索和 Deep Research 覆盖从快速问答到长篇研究报告；Comet AI 浏览器把答案引擎装进浏览器，让 AI 助手能跨标签页阅读、总结和自动执行任务；企业版与 Spaces 把检索能力带进组织——Internal Knowledge Search 让团队同时搜公网和内部文件，Spaces 是可定制的协作研究空间；Sonar / Search API 则把同一套带引用的实时检索做成开发者可调用的接口。它不自研前沿大模型，而是聚合 GPT、Claude、Gemini、Grok 等模型并叠加自有检索与排序，护城河在检索质量、引用可信度和分发入口，而非模型本身。',
    products: [
      {
        name: '答案引擎（AI 搜索 + Deep Research）',
        summary: 'Perplexity 的核心产品：输入问题直接返回带来源引用的答案，而非链接列表。覆盖快速问答、可选多模型推理，以及 Deep Research 自动跑多轮检索生成长篇研究报告，是公司能力直接触达个人和团队用户的主入口。',
        url: 'https://www.perplexity.ai',
      },
      {
        name: 'Comet AI 浏览器',
        summary: 'Perplexity 自研的 AI 浏览器，把答案引擎和一个常驻 AI 助手装进浏览器本身，能跨标签页阅读、总结网页、整理邮件并自动执行多步任务。已在 Mac / Windows / iOS / Android 免费开放，是 Perplexity 从搜索框走向 Agentic 浏览入口的关键样本。',
        url: 'https://www.perplexity.ai/comet',
      },
      {
        name: '企业版与 Spaces',
        summary: '面向组织的产品线。Internal Knowledge Search 让 Enterprise / Pro 用户同时检索公网与内部文件并带行内引用；Spaces 是可定制 AI 模型与指令的协作研究空间，配合管理控制台、审计日志和默认不用于训练的隐私保护，是 Perplexity 进入企业采购的规模化分发渠道。',
        url: 'https://www.perplexity.ai/enterprise',
      },
      {
        name: 'Sonar / Search API 开发者平台',
        summary: '面向开发者的检索 API。Sonar 提供搜索增强、带行内引用的问答模型（OpenAI 兼容接口），Search API 返回原始排序的实时网页结果，另有 Agent / Embeddings API，是开发者把 Perplexity 的实时检索接进自有应用、也是其平台化收入的基础。',
        url: 'https://docs.perplexity.ai/',
      },
    ],
    bets: [
      {
        title: '答案而非链接',
        body: 'Perplexity 押注「答案引擎」范式：用户要的是带可信来源的直接答案，而不是十条蓝链。引用质量和检索相关性是它区别于传统搜索的根本。',
      },
      {
        title: '模型聚合 + 自有检索',
        body: '它不自研前沿大模型，而是聚合 GPT、Claude、Gemini、Grok 等并叠加自有检索与排序层，护城河在检索、引用和分发入口，而非模型本身。',
      },
      {
        title: 'Agentic 浏览入口',
        body: 'Comet 把答案引擎装进浏览器并加入能自动执行任务的助手，是 Perplexity 从问答框争夺浏览器这一更大入口、走向 Agentic 工作流的关键一步。',
      },
      {
        title: '检索能力平台化',
        body: 'Sonar / Search API 把同一套带引用的实时检索做成开发者可调用的接口，决定 Perplexity 能否把消费级体验扩成稳定的平台业务。',
      },
    ],
    learningResources: [
      {
        title: 'Sonar API 文档总览',
        label: 'API 平台',
        summary: '最值得先读的开发者文档，讲清 Sonar、Search、Agent、Embeddings 四类 API 的能力、OpenAI 兼容接口和接入方式，是用好 Perplexity 检索能力的起点。',
        url: 'https://docs.perplexity.ai/',
      },
      {
        title: 'Sonar API 定价指南',
        label: '定价',
        summary: '官方定价页，讲清 Sonar / Sonar Pro 按 token 与按请求的计费阶梯、上下文档位与引用费用变化，是评估 API 成本的依据。',
        url: 'https://docs.perplexity.ai/guides/pricing',
      },
      {
        title: 'Introducing Comet: Browse at the speed of thought',
        label: 'Comet 浏览器',
        summary: 'Comet 的官方发布博客，讲清把答案引擎和常驻助手装进浏览器的产品理念，是理解 Perplexity Agentic 浏览方向的第一手材料。',
        url: 'https://www.perplexity.ai/hub/blog/introducing-comet',
      },
      {
        title: 'Introducing Internal Knowledge Search and Spaces',
        label: '企业与协作',
        summary: '官方博客，讲清 Internal Knowledge Search 如何让团队同时搜公网与内部文件、Spaces 如何做可定制协作研究空间，是理解 Perplexity 企业打法的入口。',
        url: 'https://www.perplexity.ai/hub/blog/introducing-internal-knowledge-search-and-spaces',
      },
      {
        title: 'Perplexity Hub（官方博客）',
        label: '官方博客',
        summary: '产品发布、功能更新和研究方法的官方博客主入口，跟踪答案引擎、Comet 和企业能力演进从这里开始。',
        url: 'https://www.perplexity.ai/hub/blog',
      },
    ],
    officialLinks: [
      {
        title: 'Perplexity',
        summary: '答案引擎主入口，直接体验 AI 搜索与 Deep Research。',
        url: 'https://www.perplexity.ai',
      },
      {
        title: 'Sonar API Docs',
        summary: 'Sonar、Search、Agent、Embeddings 等开发者 API 的官方文档入口。',
        url: 'https://docs.perplexity.ai/',
      },
      {
        title: 'Perplexity Comet',
        summary: 'Comet AI 浏览器的官方产品页与下载入口。',
        url: 'https://www.perplexity.ai/comet',
      },
      {
        title: 'Perplexity Enterprise',
        summary: '企业版入口，含 Internal Knowledge Search、Spaces 与组织治理能力。',
        url: 'https://www.perplexity.ai/enterprise',
      },
    ],
    flagshipKeywords: ['perplexity', 'comet', 'sonar', 'answer engine'],
    homepageUrl: 'https://www.perplexity.ai',
  },
  anysphere: {
    heroDescription:
      'Anysphere（Cursor 母公司）的公司页先看 Cursor 编辑器/agent、Composer 自研编码模型、Bugbot 代码审查和企业版怎样组成 AI 产品线，再看它和 Agentic Coding、Loop Engineering 等主题的关系。',
    headline: '四条产品线：Cursor agent 工作台、Composer 自研编码模型、Bugbot 代码审查、Cursor 企业版；前沿编码模型研究是贯穿其中的底座。',
    strategy:
      'Anysphere（对外即 Cursor）把自己定位成「面向编程未来的应用研究实验室」，AI 布局可以按四条产品线看：Cursor 是面向开发者的 agent-first 工作台（编辑器 + 后台/并行 agent + Cursor SDK），Composer 是它自研、自训的编码模型（不再只租用第三方前沿模型，而是自己掌握 agent loop 的能力底座），Bugbot 把同一套模型能力延伸到 PR 自动代码审查，Cursor 企业版（含组织管理、SSO/SCIM、Privacy Mode、SOC 2）负责把产品规模化带进企业采购。它和 Agentic Coding 主题强相关——Cursor 是这条主题里最具代表性的「IDE 起家、再自研模型」的公司样本：从套壳 IDE 走向自有模型 + 自有 agent 闭环。',
    products: [
      {
        name: 'Cursor',
        summary: 'Anysphere 的旗舰产品，AI 编程 agent 与软件开发环境。从 AI 代码编辑器进化为 agent-first 工作台，支持后台 agent、并行 agent 执行、PR Review 和 Cursor SDK，是模型能力进入开发者日常工作流的最大触点。',
        url: 'https://cursor.com',
      },
      {
        name: 'Composer',
        summary: 'Cursor/Anysphere 自研、自训的编码 agent 模型（当前为 Composer 2.5），专为长链路 agentic 编码任务优化，驱动 Cursor 的 agent loop。自有模型让 Anysphere 摆脱对第三方前沿模型的单一依赖，是它能力底座的关键一步。',
        url: 'https://cursor.com/blog/composer-2-5',
      },
      {
        name: 'Bugbot',
        summary: '面向 Pull Request 的 AI 自动代码审查 agent。改用 Composer 2.5 驱动后审查更快、更省、查出的 bug 更多，把 Cursor 的模型能力从「写代码」延伸到「审代码」，覆盖软件工程 Loop 的验证环节。',
        url: 'https://cursor.com/bugbot',
      },
      {
        name: 'Cursor 企业版',
        summary: '面向组织的规模化分发渠道，提供组织/团队管理、SAML SSO 与 SCIM、Privacy Mode 零数据保留、仓库/模型/MCP 白名单和 SOC 2 合规，是把 Cursor 从个人开发者带进企业采购和大型 monorepo 的入口。',
        url: 'https://cursor.com/enterprise',
      },
    ],
    bets: [
      {
        title: '从套壳到自有模型',
        body: 'Composer 是 Anysphere 最关键的一步——一家 IDE 起家的公司自己训练编码模型，掌握 agent loop 的能力底座，而不是长期租用第三方前沿模型。',
      },
      {
        title: 'Agentic Coding 闭环',
        body: 'Cursor 的后台/并行 agent、Cursor SDK 和 Bugbot 把「写—跑—审」串成一个 agent 闭环，是观察 Agentic Coding 与 Loop Engineering 真实落地的核心窗口。',
      },
      {
        title: '企业规模化',
        body: '组织管理、SSO/SCIM、Privacy Mode 和 SOC 2 决定 Cursor 能否把个人开发者的高增长扩成稳定的企业业务，而不是停留在单点工具。',
      },
    ],
    learningResources: [
      {
        title: 'Introducing Composer 2.5',
        label: 'Composer',
        summary: '官方发布文，讲清 Composer 2.5 怎样针对长链路 agentic 编码做强化训练和工程优化，是理解 Anysphere 为什么要自研编码模型的最佳入口。',
        url: 'https://cursor.com/blog/composer-2-5',
      },
      {
        title: 'Meet the new Cursor',
        label: 'Agent 工作台',
        summary: 'Cursor 3 的发布文，把编辑器重新定位成「围绕 agent 构建软件的统一工作台」，是理解 agent-first 形态转变的关键材料。',
        url: 'https://cursor.com/blog/meet-the-new-cursor',
      },
      {
        title: 'Build programmatic agents with the Cursor SDK',
        label: 'Cursor SDK',
        summary: '介绍 Cursor SDK 如何把 Cursor 的 agent 能力开放成可编程接口，适合理解 Anysphere 怎样把工作台延伸成平台。',
        url: 'https://cursor.com/blog/cursor-sdk',
      },
      {
        title: 'Cursor Blog',
        label: '工程实践',
        summary: '官方博客，Composer、Bugbot、cloud agents 等产品与工程更新的第一来源，跟踪 Cursor 的 agentic 工程经验从这里开始。',
        url: 'https://cursor.com/blog',
      },
      {
        title: 'Cursor Docs',
        label: '官方文档',
        summary: 'Agent、Rules、MCP、Skills 与 CLI 的官方文档入口，确认产品功能边界和落地写法从这里开始。',
        url: 'https://cursor.com/docs',
      },
    ],
    officialLinks: [
      {
        title: 'Cursor',
        summary: '产品官网，Cursor 编辑器、agent 与下载入口。',
        url: 'https://cursor.com',
      },
      {
        title: 'Cursor Blog',
        summary: '官方博客，Composer、Bugbot、cloud agents 等产品与工程更新的第一来源。',
        url: 'https://cursor.com/blog',
      },
      {
        title: 'Cursor Docs',
        summary: 'Agent、Rules、MCP、Skills、CLI 与 SDK 的官方文档。',
        url: 'https://cursor.com/docs',
      },
      {
        title: 'Anysphere',
        summary: '母公司站点，自我定位为「面向编程未来的应用研究实验室」，适合理解公司视角与招聘方向。',
        url: 'https://anysphere.inc',
      },
    ],
    flagshipKeywords: ['cursor', 'composer', 'bugbot', 'agentic'],
    homepageUrl: 'https://cursor.com',
  },
  'thinking-machines-lab': {
    heroDescription:
      'Thinking Machines Lab（前 OpenAI CTO Mira Murati 创立）的公司页先看 Tinker 微调 API 和 Connectionism 研究博客这两条真实主线，再看它「让 AI 更可理解、可定制、人机协作」的使命怎样落进产品。这是一家年轻公司，产品线刻意保持克制。',
    headline: '两条主线：Tinker 开放模型微调 API、Connectionism 研究博客；可定制、人机协作的前沿模型研究是贯穿其中的底座。',
    strategy:
      'Thinking Machines Lab 由前 OpenAI CTO Mira Murati 于 2025 年创立，团队来自 ChatGPT、Character.ai、Mistral、PyTorch 等项目，使命是让 AI 系统更可理解、可定制、更普遍有用。它信奉「科学共享」，研究与产品共同设计，并强调人机协作而非完全自主的系统。作为一家年轻公司，它目前只对外推出一条产品线 Tinker——把分布式 LoRA 微调封装成 API，让研究者掌控数据和算法、把基础设施交给平台；同时通过 Connectionism 博客高频公开技术成果。前沿模型研究不单独成线，而是这两者共同的能力底座。',
    products: [
      {
        name: 'Tinker',
        summary: '公司首个、也是目前唯一的对外产品：一个用 LoRA 高效微调开源大模型的 API，自动处理多 GPU 调度、资源分配和故障恢复，开发者只需掌控数据与算法。支持 Qwen、DeepSeek、GPT-OSS、Kimi 等开源模型，已被普林斯顿、斯坦福、伯克利和 Redwood Research 等团队用于研究。',
        url: 'https://thinkingmachines.ai/tinker/',
      },
      {
        name: 'Connectionism 研究博客',
        summary: '官方研究博客，秉持「科学共享」高频发布技术长文、论文和代码，主题横跨内核数值、训练方法、推理可复现性到人机协作，是这家以研究驱动的公司对外输出能力的主要窗口。',
        url: 'https://thinkingmachines.ai/blog/',
      },
    ],
    bets: [
      {
        title: '可定制的开放模型微调',
        body: 'Tinker 把分布式 LoRA 微调做成 API，让研究者和开发者在不管基础设施的前提下完全掌控数据与算法，是公司「让 AI 可定制」使命的第一个落地产品。',
      },
      {
        title: '科学共享的研究文化',
        body: 'Connectionism 博客高频公开技术成果与代码，既服务公众也反哺自身研究文化，是判断这家年轻公司技术方向的关键窗口。',
      },
      {
        title: '人机协作而非完全自主',
        body: '公司明确押注协作式 AI 系统而非全自主 agent，相关方向（如 Interaction Models）体现在研究博客中，是它区别于其他前沿实验室的定位。',
      },
    ],
    learningResources: [
      {
        title: 'Announcing Tinker',
        label: 'Tinker 发布',
        summary: '最值得先读的官方公告，讲清 Tinker 为什么把分布式 LoRA 微调做成 API、面向谁、解决什么问题，是理解这家公司首个产品的起点。',
        url: 'https://thinkingmachines.ai/news/announcing-tinker/',
      },
      {
        title: 'Tinker 官方文档',
        label: 'Tinker 文档',
        summary: 'Tinker API 的官方文档，含 forward_backward / optim_step / sample 等核心原语、支持的模型清单和接入流程，确认产品能力边界从这里开始。',
        url: 'https://tinker-docs.thinkingmachines.ai/',
      },
      {
        title: 'Tinker Cookbook',
        label: '微调范例',
        summary: 'GitHub 上的官方 cookbook，提供 SFT、RL 等真实微调范例和 renderer、超参工具等可复用模块，是上手 Tinker 最直接的高密度材料。',
        url: 'https://github.com/thinking-machines-lab/tinker-cookbook',
      },
      {
        title: 'Defeating Nondeterminism in LLM Inference',
        label: '推理可复现性',
        summary: 'Connectionism 首篇博客（Horace He 等），讲清 LLM 推理的随机性如何源自 GPU kernel 编排、又如何做到确定性输出，对企业可靠性和强化学习都有价值。',
        url: 'https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/',
      },
      {
        title: 'LoRA Without Regret',
        label: '微调方法',
        summary: 'John Schulman 等的研究长文，分析 LoRA 微调何时能逼近全参数微调，是理解 Tinker 为什么押注 LoRA 的方法论背景。',
        url: 'https://thinkingmachines.ai/blog/lora-without-regret/',
      },
    ],
    officialLinks: [
      {
        title: 'Thinking Machines Lab',
        summary: '公司官网入口，看使命、原则和团队。',
        url: 'https://thinkingmachines.ai/',
      },
      {
        title: 'Tinker',
        summary: '公司首个产品 Tinker 的官方页面。',
        url: 'https://thinkingmachines.ai/tinker/',
      },
      {
        title: 'Connectionism',
        summary: '官方研究博客，跟踪技术长文、论文和代码。',
        url: 'https://thinkingmachines.ai/blog/',
      },
      {
        title: 'Tinker Docs',
        summary: 'Tinker API 的官方开发者文档入口。',
        url: 'https://tinker-docs.thinkingmachines.ai/',
      },
    ],
    flagshipKeywords: ['tinker', 'connectionism', 'lora', 'fine-tuning'],
    homepageUrl: 'https://thinkingmachines.ai',
  },
  amazon: {
    heroDescription:
      'Amazon（含 AWS）的公司页先看 Amazon Bedrock 模型平台、Amazon Nova 自研模型家族、Amazon Q 企业与开发者助手和 AWS Trainium 自研 AI 芯片怎样组成 AI 产品线，再看它和 Agentic AI、AI 基础设施等主题的关系。',
    headline: '四条产品线：Amazon Bedrock 模型平台、Amazon Nova 自研模型、Amazon Q 助手、AWS Trainium 自研芯片；遍布全球的云基础设施是贯穿其中的底座。',
    strategy:
      'Amazon 的 AI 布局不靠单一聊天产品，而是把企业上线 AI 真正需要的整条链路做成 AWS 上的产品线：Amazon Bedrock 是托管式模型平台，用一套 API 接入 Anthropic、OpenAI、Meta 等几十家厂商和 Amazon 自家模型，并通过 AgentCore 提供生产级 agent 运行时；Amazon Nova 是 Amazon 自研的多模态模型家族（Micro / Lite / Pro / Premier，加图像 Canvas、视频 Reel 和浏览器自动化 Nova Act），主打高性价比；Amazon Q 是面向企业的生成式助手，分 Q Business（连企业数据答问、出报告）和 Q Developer（云控制台与 AWS 体验里的开发与运维助手）；AWS Trainium / Inferentia 是自研训练与推理芯片，用更低的单位算力成本撑起前三条产品线，也对外租给 Anthropic 等大客户。Amazon 的护城河不在某个明星模型，而在「模型平台 + 自研模型 + 企业助手 + 自研算力」这套全栈基础设施。',
    products: [
      {
        name: 'Amazon Bedrock',
        summary: 'AWS 的托管式生成式 AI 平台，用一套统一 API 接入 Anthropic、OpenAI、Meta、Mistral 和 Amazon 自家 Nova 等几十个基础模型，并通过 AgentCore 提供生产级 agent 运行时、Guardrails 安全护栏和知识库检索，是 Amazon AI 战略的中枢和企业接入大模型的主入口。',
        url: 'https://aws.amazon.com/bedrock/',
      },
      {
        name: 'Amazon Nova',
        summary: 'Amazon 自研的多模态模型家族，文本模型分 Micro / Lite / Pro / Premier，外加图像生成 Canvas、视频生成 Reel，以及面向浏览器 UI 自动化的 Nova Act，主打比同级模型显著更低的价格，是 Amazon 在 Bedrock 之上掌握自有模型能力的底座。',
        url: 'https://aws.amazon.com/nova/',
      },
      {
        name: 'Amazon Q',
        summary: '面向企业的生成式 AI 助手，分 Q Business（连接 40+ 企业系统答问、出报告、办任务）和 Q Developer（在 AWS 控制台与 AWS 体验里做开发、排障与运维）。注：Q Developer 的 IDE 插件已宣布 2027 年 4 月停止支持，编码场景正由 Amazon 的 agentic IDE Kiro 承接，控制台与企业侧助手仍持续。',
        url: 'https://aws.amazon.com/q/',
      },
      {
        name: 'AWS Trainium / Inferentia 自研芯片',
        summary: 'Amazon 自研的 AI 加速芯片，Trainium 面向模型训练、Inferentia 面向推理服务，以远低于同级 GPU 的单位成本提供算力，既支撑 Bedrock 与 Nova，也对外被 Anthropic 等大客户采用，是 Amazon 区别于纯软件 AI 公司的硬件底座。',
        url: 'https://aws.amazon.com/ai/machine-learning/trainium/',
      },
    ],
    bets: [
      {
        title: 'AI 应用的部署基础设施',
        body: 'Amazon 的优势不在明星模型，而在企业把 AI 推上生产时需要的模型接入、agent 运行时、安全护栏和算力——这些都跑在 AWS 现成的全球云基础设施上。',
      },
      {
        title: '模型中立的平台',
        body: 'Bedrock 同时托管 Anthropic、OpenAI、Meta 与自家 Nova，Amazon 押注「不绑定单一模型」的平台位，让企业按场景在多模型间自由选择和切换。',
      },
      {
        title: 'Agentic AI',
        body: 'Bedrock AgentCore 加 Nova Act 把生产级 agent 的部署、浏览器自动化、会话隔离和可观测做成托管能力，是观察 Amazon 进入 Agentic AI 的核心样本。',
      },
      {
        title: '自研算力降本',
        body: 'Trainium / Inferentia 用自研芯片压低训练与推理成本，既给 Bedrock 和 Nova 让出价格空间，也成为 Anthropic 等大客户长期采购 AWS 算力的支点。',
      },
    ],
    learningResources: [
      {
        title: 'Amazon Bedrock 文档',
        label: '模型平台',
        summary: '最值得先读的官方文档，讲清如何用统一 API 接入多家基础模型、配置 AgentCore、知识库和 Guardrails，是理解 Amazon AI 平台能力边界的起点。',
        url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html',
      },
      {
        title: 'Introducing Amazon Nova foundation models',
        label: '自研模型',
        summary: 'AWS 官方发布博客，讲清 Nova 家族的分层（Micro / Lite / Pro / Premier）、多模态能力和价格定位，是理解 Amazon 为什么自研模型的第一手材料。',
        url: 'https://aws.amazon.com/blogs/aws/introducing-amazon-nova-frontier-intelligence-and-industry-leading-price-performance/',
      },
      {
        title: 'Amazon Bedrock AgentCore 文档',
        label: 'Agent 运行时',
        summary: '官方文档，讲清如何用任意框架和模型在 AgentCore 上构建、部署并运维生产级 agent（含 Browser、Memory、Identity 等模块），是理解 Amazon agentic 基础设施的入口。',
        url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html',
      },
      {
        title: 'Amazon Nova Act 文档',
        label: '浏览器 Agent',
        summary: '官方文档，讲清 Nova Act 如何构建可靠的浏览器 UI 自动化 agent，并与 AgentCore Browser 配合，是理解 Amazon 在 computer-use 方向落地的材料。',
        url: 'https://docs.aws.amazon.com/nova-act/latest/userguide/what-is-nova-act.html',
      },
      {
        title: 'AWS Trainium',
        label: '自研芯片',
        summary: 'Trainium 训练芯片的官方产品页，讲清性能、性价比和被 Anthropic 等客户采用的情况，是理解 Amazon AI 硬件底座的入口。',
        url: 'https://aws.amazon.com/ai/machine-learning/trainium/',
      },
      {
        title: 'AWS Machine Learning Blog',
        label: '官方博客',
        summary: 'AWS 人工智能与机器学习官方博客，跟踪 Bedrock、Nova、AgentCore 等产品发布与工程实践的主入口。',
        url: 'https://aws.amazon.com/blogs/machine-learning/',
      },
    ],
    officialLinks: [
      {
        title: 'AWS AI',
        summary: 'AWS 人工智能总入口，Bedrock、SageMaker、Q、AgentCore 等产品的统一门户。',
        url: 'https://aws.amazon.com/ai/',
      },
      {
        title: 'Amazon Bedrock',
        summary: '模型平台官方产品页，确认接入模型、AgentCore 与定价从这里开始。',
        url: 'https://aws.amazon.com/bedrock/',
      },
      {
        title: 'Amazon Nova',
        summary: 'Amazon 自研模型家族官方页，看模型分层、多模态能力和价格。',
        url: 'https://aws.amazon.com/nova/',
      },
      {
        title: 'Amazon Q',
        summary: '面向企业的 AI 助手官方页（Q Business / Q Developer）。',
        url: 'https://aws.amazon.com/q/',
      },
    ],
    flagshipKeywords: ['bedrock', 'amazon nova', 'amazon q', 'agentcore', 'trainium'],
    homepageUrl: 'https://aws.amazon.com/ai/',
  },
  'moonshot-ai': {
    heroDescription:
      '月之暗面 Moonshot AI（Kimi）的公司页先看 Kimi K2 模型家族、Kimi 助手应用、Kimi 开放平台 / API 和 Kimi Code 怎样组成 AI 产品线，再看它和 Agentic Coding、Context Engineering 等主题的关系。',
    headline:
      '四条产品线：Kimi K2 模型家族、Kimi 助手应用、Kimi 开放平台 / API、Kimi Code；开源权重的 agentic 模型是贯穿其中的底座。',
    strategy:
      '月之暗面的 AI 布局可以按四条产品线看：Kimi K2 系列（万亿参数 MoE，每 token 激活约 320 亿，多以开源权重发布）是面向开发者和企业的能力核心，主打长上下文、原生多模态和 agentic 能力；Kimi 助手应用（Web / App / 桌面端）是模型直接触达个人和团队用户的最大触点，覆盖长文档处理、深度研究和实时联网；Kimi 开放平台 / API 以 OpenAI / Anthropic 兼容接口把模型分发给开发者，是平台化收入和生态扩展的基础；Kimi Code 把 K2 的编码能力带进终端、IDE 和 CLI 的真实软件工程循环。以开源权重加高性价比 API 撬动规模化采用，是它区别于闭源大厂的底层打法。',
    products: [
      {
        name: 'Kimi K2 模型家族',
        summary:
          '月之暗面的核心模型产品线，万亿参数 MoE 架构、每 token 激活约 320 亿参数，主打 256K 长上下文、原生多模态和 agentic 能力，多以开源权重发布（含 K2 Thinking、K2.5、K2.6 及面向编码的 K2.7 Code），是整个产品矩阵的能力底座。',
        url: 'https://moonshotai.github.io/Kimi-K2/',
      },
      {
        name: 'Kimi 助手应用',
        summary:
          '面向个人和团队的官方对话应用，提供 Web、移动 App 和 macOS / Windows 桌面端入口，覆盖长文档分析、深度研究、实时联网和多模态输入，是 Kimi 模型能力直达终端用户的最大触点。',
        url: 'https://www.kimi.com',
      },
      {
        name: 'Kimi 开放平台 / API',
        summary:
          '开发者把 Kimi 模型接入应用和业务流程的平台，提供 OpenAI / Anthropic 兼容接口、256K 上下文和工具调用（Function Calling），是月之暗面平台化收入和生态扩展的基础。',
        url: 'https://platform.kimi.com',
      },
      {
        name: 'Kimi Code',
        summary:
          '由 K2 编码模型驱动的 agentic coding 工具，覆盖终端、IDE 和 CLI，支持写代码、调试重构、代码库分析、shell 自动化和并行 subagent，并可接入 Claude Code / Cline / Roo Code 等客户端，是观察月之暗面进入 Agentic Coding 的核心样本。',
        url: 'https://www.kimi.com/code',
      },
    ],
    bets: [
      {
        title: '开源权重的 agentic 模型',
        body: 'Kimi K2 系列以万亿参数 MoE 加开源权重撬动规模化采用，把长上下文、多模态和 agentic 能力做成可下载、可自部署的底座，是它最核心的差异化打法。',
      },
      {
        title: 'Agentic Coding',
        body: 'Kimi Code 和 K2.7 Code 把模型带进终端、IDE、CLI 和并行 subagent，并兼容 Claude Code / Cline 等客户端，是观察月之暗面在 Agentic Coding 上落地的关键窗口。',
      },
      {
        title: '应用与平台双入口',
        body: 'Kimi 助手应用抓个人和团队用户，开放平台 / API 抓开发者生态，两条入口共同决定模型能力能否扩成稳定业务。',
      },
    ],
    learningResources: [
      {
        title: 'Kimi K2: Open Agentic Intelligence',
        label: '模型技术页',
        summary: '最值得先读的官方材料，讲清 K2 的 MoE 架构、训练方法和 agentic 设计理念，是理解月之暗面能力底座的入口。',
        url: 'https://moonshotai.github.io/Kimi-K2/',
      },
      {
        title: 'Kimi API 开放平台文档',
        label: 'API 平台',
        summary: '官方开发者文档，讲清模型清单（K2.5 / K2.6 / K2.7 Code）、256K 上下文、工具调用和接入方式，是用好 Kimi API 的起点。',
        url: 'https://platform.kimi.com/docs',
      },
      {
        title: 'Use Kimi K2.7 Code in Claude Code / Cline / Roo Code',
        label: 'Agentic Coding',
        summary: '官方讲如何把 K2.7 Code 接入主流 agentic coding 客户端，是理解 Kimi 编码能力如何落到真实开发循环的窗口。',
        url: 'https://platform.kimi.com/docs/guide/agent-support',
      },
      {
        title: 'Kimi Code Docs',
        label: 'Kimi Code',
        summary: 'Kimi Code 官方文档，讲清这套 agentic coding 工具在终端、IDE 和 CLI 的能力边界与安装方式。',
        url: 'https://www.kimi.com/code/docs/en/',
      },
      {
        title: 'MoonshotAI on GitHub',
        label: '开源',
        summary: '月之暗面在 GitHub 上的官方组织，集中放 K2 系列模型权重、技术报告和工程项目，是理解其开源底座的直接入口。',
        url: 'https://github.com/MoonshotAI',
      },
      {
        title: 'Kimi K2.5 on Hugging Face',
        label: '开源权重',
        summary: 'K2.5 的官方权重与模型卡，确认开源协议、参数规模和多模态能力从这里开始。',
        url: 'https://huggingface.co/moonshotai/Kimi-K2.5',
      },
    ],
    officialLinks: [
      {
        title: 'Moonshot AI',
        summary: '公司官网和产品入口。',
        url: 'https://www.moonshot.ai',
      },
      {
        title: 'Kimi',
        summary: '面向个人和团队的 Kimi 助手应用入口（Web / App / 桌面端）。',
        url: 'https://www.kimi.com',
      },
      {
        title: 'Kimi 开放平台',
        summary: '开放平台与 API 控制台，注册 key、查模型和定价从这里开始（platform.moonshot.cn 已重定向至此）。',
        url: 'https://platform.kimi.com',
      },
      {
        title: 'MoonshotAI on GitHub',
        summary: 'K2 系列模型权重、技术报告和开源项目的代码仓库。',
        url: 'https://github.com/MoonshotAI',
      },
    ],
    flagshipKeywords: ['月之暗面', 'kimi', 'kimi k2', 'kimi code', 'agentic'],
    homepageUrl: 'https://www.moonshot.ai',
  },
  baidu: {
    heroDescription:
      '百度的公司页先看文心 ERNIE 模型家族、文心一言应用、百度智能云千帆平台和 Apollo 自动驾驶 / 萝卜快跑怎样组成 AI 产品线，再看它和 Agentic Coding、具身与物理 AI 等主题的关系。',
    headline:
      '四条产品线：文心 ERNIE 模型家族、文心一言应用、百度智能云千帆平台、Apollo 自动驾驶 / 萝卜快跑；全模态前沿模型研究是贯穿其中的底座。',
    strategy:
      '百度是少有的从自研模型一路打到物理世界落地的全栈玩家，AI 布局可以按四条产品线看：文心 ERNIE 模型家族（当前以原生全模态的 ERNIE 5.x 为旗舰，并开源了 ERNIE-Image 等模型）是所有产品的能力底座；文心一言是模型能力直达个人和团队用户的应用入口；百度智能云千帆是面向企业的一站式大模型与 Agent 开发平台，以模型即服务（MaaS）方式接入 ERNIE 全系列和 DeepSeek、Kimi 等第三方模型，也是文心快码 Comate 这类开发者工具的归属生态；Apollo 自动驾驶与萝卜快跑（Robotaxi）则把 AI 能力推向物理世界，是百度押注自动驾驶规模化商业落地的关键样本。全模态前沿模型研究不单独成线，而是决定这套全栈布局能力上限的底座。',
    products: [
      {
        name: '文心 ERNIE 模型家族',
        summary:
          '百度自研的核心模型产品线，当前以原生全模态、万亿级参数的 ERNIE 5.x 为旗舰，覆盖语言、多模态、推理与文生图（已开源 ERNIE-Image）能力，是百度全栈 AI 产品的能力底座。',
        url: 'https://yiyan.baidu.com',
      },
      {
        name: '文心一言（ERNIE Bot）',
        summary:
          '面向个人和团队的对话应用入口（Web 与移动端），承接文心模型的对话、多模态和创作能力，是 ERNIE 能力直接触达终端用户的最大触点。',
        url: 'https://yiyan.baidu.com',
      },
      {
        name: '百度智能云千帆平台',
        summary:
          '以 Agent 为核心的企业级一站式大模型开发与应用平台，用 MaaS 方式提供 ERNIE 全系列和 DeepSeek、Kimi 等第三方模型，整合模型服务、Agent 引擎、工具与 MCP，也是文心快码 Comate 等开发者工具的归属生态，是百度面向企业规模化分发 AI 的主入口。',
        url: 'https://cloud.baidu.com/product/wenxinworkshop',
      },
      {
        name: 'Apollo 自动驾驶 / 萝卜快跑',
        summary:
          'Apollo 是百度的智能驾驶系统与汽车智能化平台，萝卜快跑（Robotaxi）是其面向终端用户的自动驾驶出行服务，已在多城运营、累计订单超千万单，是百度把 AI 推向物理世界、押注自动驾驶规模化商业落地的关键样本。',
        url: 'https://apollo.auto',
      },
    ],
    bets: [
      {
        title: '全栈 AI',
        body: '百度同时握有自研模型（文心 ERNIE）、消费应用（文心一言）、企业平台（千帆）和物理世界落地（Apollo / 萝卜快跑），是少有的从研究到分发、再到物理世界全链路自有的玩家。',
      },
      {
        title: '模型即服务与 Agent 平台',
        body: '千帆把 ERNIE 全系列和第三方模型以 MaaS 方式打包成企业级 Agent 开发平台，决定百度能否把模型能力扩成稳定的云业务，而不是停留在模型发布本身。',
      },
      {
        title: '物理 AI 与自动驾驶',
        body: 'Apollo 和萝卜快跑把 AI 从软件推向出行场景，是百度押注 L4 自动驾驶规模化商业化、寻找模型之外第二增长曲线的关键样本。',
      },
      {
        title: '研究作为能力底座',
        body: '原生全模态的文心 ERNIE 前沿研究不单独成线，但它决定模型家族的能力上限和发布节奏，是其他三条产品线的共同底座。',
      },
    ],
    learningResources: [
      {
        title: '千帆大模型平台文档',
        label: 'MaaS 平台',
        summary:
          '最值得先读的官方文档，讲清 ERNIE 全系列模型服务、Agent 引擎、工具与 MCP 的能力边界和接入方式，是用好百度智能云大模型能力的起点。',
        url: 'https://cloud.baidu.com/doc/qianfan/index.html',
      },
      {
        title: '千帆 ModelBuilder API 文档',
        label: 'API 接口',
        summary:
          'ERNIE 系列模型推理、对话、向量与多模态接口的官方 API 文档，确认模型清单、参数和接入方式从这里开始。',
        url: 'https://cloud.baidu.com/doc/qianfan-api/index.html',
      },
      {
        title: '文心快码 Comate 产品页',
        label: 'Agentic Coding',
        summary:
          '官方介绍文心快码如何用 Multi-Agent 架构（Zulu / Plan / Architect）做端到端编码，是理解百度 ERNIE 能力如何落到真实开发循环的窗口。',
        url: 'https://cloud.baidu.com/product/comate-public.html',
      },
      {
        title: 'ERNIE 开源仓库',
        label: '开源模型',
        summary:
          '百度文心大模型团队在 GitHub 上的官方组织，集中放 ERNIE 系列模型权重、技术报告和工程项目，是理解其模型底座和开源路线的直接入口。',
        url: 'https://github.com/PaddlePaddle/ERNIE',
      },
      {
        title: 'Apollo 智能驾驶解决方案',
        label: '自动驾驶',
        summary:
          'Apollo 官方页，介绍智能驾驶系统、智能座舱和高精地图等汽车智能化产品，是理解百度物理 AI 产品线的入口。',
        url: 'https://apollo.auto',
      },
    ],
    officialLinks: [
      {
        title: '百度智能云',
        summary: '千帆大模型平台、Comate 等企业级 AI 产品的官方门户。',
        url: 'https://cloud.baidu.com',
      },
      {
        title: '千帆大模型平台',
        summary: 'ERNIE 全系列模型服务与 Agent 开发平台的官方产品页。',
        url: 'https://cloud.baidu.com/product/wenxinworkshop',
      },
      {
        title: '文心一言',
        summary: '面向个人和团队的文心 ERNIE 对话应用入口。',
        url: 'https://yiyan.baidu.com',
      },
      {
        title: 'Apollo',
        summary: '百度自动驾驶与汽车智能化的官方入口，含萝卜快跑 Robotaxi。',
        url: 'https://apollo.auto',
      },
    ],
    flagshipKeywords: ['文心', 'ernie', '百度', 'qianfan', '千帆', 'apollo', 'comate'],
    homepageUrl: 'https://cloud.baidu.com',
  },
  'zhipu-ai': {
    heroDescription:
      '智谱 AI（Z.ai）的公司页先看 GLM 模型家族、智谱开放平台（bigmodel.cn / z.ai）、GLM Coding Plan 与 CodeGeeX、智谱清言与 AutoGLM 怎样组成 AI 产品线，再看它和 Agentic Coding、开源权重模型等主题的关系。',
    headline:
      '四条产品线：GLM 模型家族、智谱开放平台（MaaS）、GLM Coding Plan 与 CodeGeeX、智谱清言与 AutoGLM；坚持开源权重的前沿模型研究是贯穿其中的底座。',
    strategy:
      '智谱 AI 是清华系出身、2026 年初在港交所上市的中国大模型公司（国际品牌 Z.ai），布局可以按四条产品线看：GLM 模型家族（当前以 GLM-5 系列为旗舰，承接 GLM-4.x 一脉，多数以开源权重发布）是面向开发者和企业的能力核心；智谱开放平台（国内 bigmodel.cn、国际 z.ai）以模型即服务的方式提供 OpenAI / Anthropic 兼容接口，把 GLM 分发给开发者和企业；GLM Coding Plan 与 CodeGeeX 把模型带进真实软件工程的 agentic coding，用包月订阅和对 Claude Code、Cline 等主流编码工具的兼容撬动开发者规模；智谱清言（chatglm.cn）是面向个人用户的对话应用，AutoGLM 则把模型推向能自主操作手机和电脑界面、长程执行任务的智能体。坚持开源权重、用低价和兼容性拉动采用，是它区别于闭源大厂的底层打法。',
    products: [
      {
        name: 'GLM 模型家族',
        summary:
          '智谱的核心模型产品线，覆盖语言、视觉（GLM-V）、推理和编码能力，当前以 GLM-5 系列为旗舰，承接 GLM-4.x 一脉，多数以开源权重（含 MIT 许可）发布并已衍生出庞大社区生态，是整个产品矩阵的能力底座。',
        url: 'https://z.ai/blog',
      },
      {
        name: '智谱开放平台（bigmodel.cn / z.ai）',
        summary:
          '一站式模型即服务（MaaS）平台，国内为 bigmodel.cn、国际为 z.ai，提供 GLM 全系列的官方 API 与 OpenAI / Anthropic 兼容接口，是 GLM 进入开发者和企业采购的规模化分发渠道。',
        url: 'https://www.bigmodel.cn',
      },
      {
        name: 'GLM Coding Plan 与 CodeGeeX',
        summary:
          '面向真实软件工程的 agentic coding 产品线：GLM Coding Plan 用包月订阅提供 GLM 编码模型的高额度访问，开箱兼容 Claude Code、Cline、OpenCode 等主流编码工具；CodeGeeX 是智谱自研的代码助手，二者共同把 GLM 带进开发循环，是观察 Agentic Coding 的核心样本。',
        url: 'https://z.ai/subscribe',
      },
      {
        name: '智谱清言与 AutoGLM',
        summary:
          '面向终端用户和智能体场景的入口：智谱清言（chatglm.cn）是承接 GLM 对话与多模态能力的消费级应用；AutoGLM 是能自主操作手机、电脑界面并长程执行任务的智能体（含 AutoGLM-Thinking、Rumination），把模型能力从对话推向自动化操作。',
        url: 'https://chatglm.cn',
      },
    ],
    bets: [
      {
        title: '开源权重与生态规模',
        body: 'GLM 长期以开源权重发布，靠庞大的衍生模型和下载量构筑生态壁垒，再用开放平台和包月订阅把生态势能转化为商业分发。',
      },
      {
        title: 'Agentic Coding',
        body: 'GLM Coding Plan 用低价订阅加对 Claude Code 等工具的兼容，把开源编码模型直接送进开发者的真实工程循环，是智谱抢占 AI Coding 赛道的关键打法。',
      },
      {
        title: '自主智能体',
        body: 'AutoGLM 把模型从对话推向能操作手机和电脑界面、长程执行任务的智能体，是智谱押注 agent 落地、走向自动化操作的样本。',
      },
      {
        title: '研究作为能力底座',
        body: '坚持开源权重的前沿模型研究不单独成线，但它决定 GLM 家族的能力上限和发布节奏，是其他三条产品线的共同底座。',
      },
    ],
    learningResources: [
      {
        title: '智谱开放平台文档（bigmodel.cn）',
        label: 'MaaS 平台',
        summary: '最值得先读的官方材料，讲清 GLM 全系列模型清单、API 接口、OpenAI / Anthropic 兼容方式和定价，是用好智谱模型的起点。',
        url: 'https://docs.bigmodel.cn',
      },
      {
        title: 'Z.ai API 文档',
        label: '国际开发者平台',
        summary: 'Z.ai 面向国际开发者的 API 文档，含 OpenAI 兼容与 Anthropic 兼容端点，确认接入方式从这里开始。',
        url: 'https://docs.z.ai',
      },
      {
        title: 'Z.ai Blog（GLM 模型发布）',
        label: '模型发布',
        summary: '智谱国际站的官方博客，集中发布 GLM-5 系列等模型的能力、基准和发布说明，是跟踪真实发布节奏的主入口。',
        url: 'https://z.ai/blog',
      },
      {
        title: 'zai-org on GitHub（开源权重与技术报告）',
        label: '开源',
        summary: '智谱在 GitHub 上的官方组织（前身 THUDM），集中放 GLM 模型权重、技术报告和 Open-AutoGLM 等工程项目，是理解其开源底座的直接入口。',
        url: 'https://github.com/zai-org',
      },
      {
        title: 'GLM Coding Plan 介绍',
        label: 'Agentic Coding',
        summary: '官方讲 GLM Coding Plan 如何用包月订阅提供编码模型访问、并兼容 Claude Code 等工具，是理解智谱编码能力如何落到真实开发循环的窗口。',
        url: 'https://z.ai/subscribe',
      },
      {
        title: 'CodeGeeX 官网',
        label: '代码助手',
        summary: '智谱自研代码助手 CodeGeeX 的官方入口，理解其在 IDE 内的补全、对话和 agent 能力边界从这里开始。',
        url: 'https://codegeex.cn',
      },
    ],
    officialLinks: [
      {
        title: '智谱 AI（z.ai）',
        summary: '公司国际官网与产品入口（国际品牌 Z.ai）。',
        url: 'https://z.ai',
      },
      {
        title: '智谱开放平台（bigmodel.cn）',
        summary: '国内模型即服务平台与开发者控制台，注册 key、查模型和定价从这里开始。',
        url: 'https://www.bigmodel.cn',
      },
      {
        title: '智谱清言（chatglm.cn）',
        summary: '面向个人和团队的对话应用入口，直接体验最新 GLM 模型。',
        url: 'https://chatglm.cn',
      },
      {
        title: 'zai-org on GitHub',
        summary: 'GLM 模型权重、技术报告和 Open-AutoGLM 等开源项目的代码仓库。',
        url: 'https://github.com/zai-org',
      },
    ],
    flagshipKeywords: ['glm', '智谱', 'zhipu', 'autoglm', 'codegeex', 'agentic'],
    homepageUrl: 'https://z.ai',
  },
  tencent: {
    heroDescription:
      '腾讯的公司页先看混元 Hunyuan 模型家族、腾讯元宝助手、腾讯云企业 AI 平台（知识引擎 / 智能体 / TI）和混元在微信 / QQ / 腾讯文档里的嵌入怎样组成 AI 产品线，再看它和 Agentic Coding、多模态生成等主题的关系。',
    headline:
      '四条产品线：混元 Hunyuan 模型家族、腾讯元宝助手、腾讯云企业 AI 平台、混元嵌入腾讯生态；全链路自研多模态模型是贯穿其中的底座。',
    strategy:
      '腾讯的 AI 布局可以按四条产品线看：混元 Hunyuan 是全链路自研、覆盖文本 / 图像 / 视频 / 3D 的多模态模型家族，多数模态以开源权重发布；腾讯元宝是面向用户的 AI 助手，用「混元 + DeepSeek」双模聚合做对话、深度思考和多模态创作；腾讯云企业 AI 平台（大模型知识引擎 LKE、智能体开发平台 ADP、TI 机器学习平台）把混元和第三方模型以 RAG、工作流、Multi-agent 的方式接入企业采购；而混元嵌入微信、QQ、腾讯文档等自有场景，则是腾讯区别于纯模型公司、靠超级 App 流量直达数亿用户的最大分发优势。全链路自研模型不单独成线，而是这四条产品线的共同能力底座。',
    products: [
      {
        name: '混元 Hunyuan 模型家族',
        summary:
          '腾讯全链路自研的通用与多模态大模型家族，覆盖文本、图像（HY Image，已开源）、视频、3D（HY 3D、混元 3D 世界模型）等模态，多数以开源权重发布并衍生出庞大社区生态，是腾讯全部 AI 产品的能力底座。',
        url: 'https://cloud.tencent.com/product/hunyuan',
      },
      {
        name: '腾讯元宝 Yuanbao',
        summary:
          '腾讯面向个人和团队的 AI 助手应用（App / 网页版），用「混元 + DeepSeek」双模聚合提供对话、深度思考、联网搜索、图像理解与生成，是混元能力直达终端用户的最大触点。',
        url: 'https://yuanbao.tencent.com',
      },
      {
        name: '腾讯云企业 AI 平台（知识引擎 / 智能体 / TI）',
        summary:
          '把混元和第三方模型带进企业采购的规模化分发渠道：大模型知识引擎 LKE 做企业知识问答与 RAG，智能体开发平台 ADP 提供 LLM+RAG / Workflow / Multi-agent 的低代码 agent 构建，TI 平台覆盖模型训练到部署的全流程。',
        url: 'https://cloud.tencent.com/product/lke',
      },
      {
        name: '混元嵌入腾讯生态（微信 / QQ / 腾讯文档）',
        summary:
          '把混元和元宝能力嵌进腾讯自有超级 App：元宝已作为联系人进入微信对话框、可解析公众号文章与文档，腾讯文档 AI 助手混用混元与 DeepSeek 做写作 / 阅读 / 数据助手，是腾讯靠场景流量直达数亿用户、区别于纯模型公司的分发优势。',
        url: 'https://docs.qq.com',
      },
    ],
    bets: [
      {
        title: '全链路自研多模态',
        body: '混元从文本扩展到图像、视频、3D 乃至 3D 世界模型，全链路自研并多模态开源，决定腾讯 AI 产品矩阵的能力上限和发布节奏。',
      },
      {
        title: '双模助手入口',
        body: '腾讯元宝用「混元 + DeepSeek」双模聚合抓个人用户，靠模型灵活选择和深度思考能力争夺 AI 助手入口。',
      },
      {
        title: '企业平台分发',
        body: '知识引擎 LKE、智能体平台 ADP 和 TI 平台决定腾讯能否把模型能力扩成稳定的云业务，而不是停留在模型发布本身。',
      },
      {
        title: '超级 App 场景流量',
        body: '混元嵌进微信、QQ、腾讯文档，让腾讯能用现成的社交与办公场景直达数亿用户，是它区别于纯模型公司的根本优势。',
      },
    ],
    learningResources: [
      {
        title: '腾讯混元大模型产品文档',
        label: '混元模型',
        summary:
          '最值得先读的官方材料，讲清混元文本 / 图像 / 视频 / 3D 各模型清单、上下文长度、能力边界和接入方式，是理解腾讯 AI 能力底座的起点。',
        url: 'https://cloud.tencent.com/document/product/1729',
      },
      {
        title: '腾讯云大模型知识引擎 LKE 文档',
        label: '知识引擎',
        summary:
          '官方讲解如何基于混元和企业私有数据搭建知识问答、RAG 与工作流应用，是理解腾讯企业级 AI 落地的关键文档。',
        url: 'https://cloud.tencent.com/document/product/1759',
      },
      {
        title: 'Tencent Hunyuan on GitHub',
        label: '开源',
        summary:
          '腾讯混元在 GitHub 上的官方组织，集中放图像、视频、3D 等开源模型权重、技术报告和示例代码，是理解混元开源底座的直接入口。',
        url: 'https://github.com/Tencent-Hunyuan',
      },
      {
        title: '腾讯混元 AI 创作工作室',
        label: '多模态创作',
        summary:
          '官方多模态创作平台，集中体验混元图像、视频、3D 生成能力，是理解混元多模态产品形态的直观入口。',
        url: 'https://aistudio.tencent.com',
      },
    ],
    officialLinks: [
      {
        title: '腾讯混元大模型',
        summary: '腾讯云上的混元大模型产品页，看模型家族、能力和接入方式的全貌。',
        url: 'https://cloud.tencent.com/product/hunyuan',
      },
      {
        title: '腾讯元宝',
        summary: '面向个人和团队的腾讯元宝 AI 助手入口，直接体验混元 + DeepSeek 双模能力。',
        url: 'https://yuanbao.tencent.com',
      },
      {
        title: 'Tencent Hy Research',
        summary: '混元研究门户，用来理解混元模型的研究方向和能力演进。',
        url: 'https://hunyuan.tencent.com',
      },
      {
        title: '腾讯云 AI 与大模型',
        summary: '腾讯云 AI 产品总入口，知识引擎 LKE、智能体平台 ADP、TI 平台的统一门户。',
        url: 'https://cloud.tencent.com/solution/ai',
      },
    ],
    flagshipKeywords: ['混元', 'hunyuan', '腾讯', '元宝', 'yuanbao'],
    homepageUrl: 'https://cloud.tencent.com/product/hunyuan',
  },
  bytedance: {
    heroDescription:
      '字节跳动 ByteDance 的公司页先看豆包大模型与豆包助手、火山引擎（企业 MaaS）、扣子 Coze 和即梦 Jimeng 怎样组成 AI 产品线，再看它和 Agentic Coding、多模态生成等主题的关系。',
    headline:
      '四条产品线：豆包大模型与豆包助手、火山引擎（企业 MaaS）、扣子 Coze、即梦 Jimeng；Seed 团队的前沿模型研究是贯穿其中的底座。',
    strategy:
      '字节跳动的 AI 布局可以按四条产品线看：豆包大模型（Doubao-Seed 家族）是能力核心，配上豆包 App 这个面向消费者的 AI 助手入口；火山引擎是它的企业云，通过火山方舟（Ark）把豆包大模型以 MaaS 方式分发给企业客户，是商业化主战场；扣子 Coze 把模型能力封装成低代码的 agent / bot 与 AI 办公平台，降低应用搭建门槛；即梦 Jimeng 则承接图像与视频生成（含 Seedance 视频模型），是多模态能力的消费级出口。Seed 团队的前沿模型研究不单独成线，而是支撑这四条产品线的能力底座，也是火山引擎对外提供 MaaS 的来源。',
    products: [
      {
        name: '豆包大模型与豆包助手',
        summary:
          '豆包大模型（当前为 Doubao-Seed 家族，含 Pro / Lite / Mini 与 Code 模型）是字节自研的核心模型线；豆包 App 是面向个人用户的 AI 智能助手，二者是字节 AI 能力直达企业和终端用户的最大触点。',
        url: 'https://www.doubao.com/',
      },
      {
        name: '火山引擎（企业 MaaS）',
        summary:
          '字节跳动的企业云平台，以火山方舟（Ark）一站式大模型服务把豆包大模型及多模态模型按 API 分发给企业客户，是字节 AI 规模化商业化和进入企业采购的主入口。',
        url: 'https://www.volcengine.com/',
      },
      {
        name: '扣子 Coze',
        summary:
          '低代码的 AI agent / bot 搭建与 AI 办公平台，让用户无需深度编码就能把模型能力组装成对话机器人、工作流和办公助手，是字节把模型能力平台化、降低应用门槛的关键一环。',
        url: 'https://www.coze.cn/',
      },
      {
        name: '即梦 Jimeng',
        summary:
          '面向创作者的一站式 AI 视觉创作平台，覆盖文生图、图像编辑、视频生成（含 Seedance 视频模型）和数字人，是字节多模态生成能力的消费级出口。',
        url: 'https://jimeng.jianying.com/',
      },
    ],
    bets: [
      {
        title: '企业 MaaS 商业化',
        body: '火山引擎用火山方舟把豆包大模型以低价、易落地的 MaaS 方式推向企业，豆包日均 token 调用量两年增长千倍，是字节能否把模型能力扩成稳定云业务的关键。',
      },
      {
        title: '消费级应用矩阵',
        body: '豆包助手抓个人对话场景、即梦抓视觉创作、扣子抓低代码搭建，字节用自家庞大流量盘把模型能力直接铺到终端用户。',
      },
      {
        title: '多模态生成',
        body: '即梦与 Seedance / Seedream 系列把图像、视频生成做成独立产品线，是字节在文本之外扩展模型能力和商业面的方向。',
      },
      {
        title: 'Seed 研究底座',
        body: 'Seed 团队的语言、语音、视觉、世界模型研究不单独成线，但决定豆包家族的能力上限和发布节奏，也是火山引擎 MaaS 的能力来源。',
      },
    ],
    learningResources: [
      {
        title: '火山引擎大模型服务文档',
        label: 'MaaS 平台',
        summary:
          '最值得先读的官方材料，讲清火山方舟、豆包大模型清单、接入方式和定价，是理解字节如何把模型以 MaaS 方式分发给企业的起点。',
        url: 'https://www.volcengine.com/docs/82379',
      },
      {
        title: 'ByteDance Seed 官网',
        label: 'Seed 研究',
        summary: 'Seed 团队官网，集中呈现 LLM、语音、视觉、世界模型和 AI Infra 的研究方向，是理解字节模型能力底座的入口。',
        url: 'https://seed.bytedance.com/',
      },
      {
        title: 'ByteDance Seed 研究博客',
        label: '研究博客',
        summary: 'Seed 团队的官方博客，按时间发布模型、技术报告和研究进展（如 Seedance 等），适合跟踪字节真实的研究与发布节奏。',
        url: 'https://seed.bytedance.com/en/blog',
      },
      {
        title: 'ByteDance-Seed GitHub',
        label: '开源仓库',
        summary: 'Seed 团队在 GitHub 上的官方组织，集中放开源模型、代码和技术报告，是理解其研究落地的直接入口。',
        url: 'https://github.com/ByteDance-Seed',
      },
      {
        title: '扣子 Coze 开发者文档',
        label: 'Agent 平台',
        summary: '扣子官方文档，讲清如何用低代码方式搭建 bot、工作流和插件，是理解字节 agent / 应用搭建工具栈的入口。',
        url: 'https://www.coze.cn/docs',
      },
    ],
    officialLinks: [
      {
        title: '火山引擎',
        summary: '字节跳动企业云与 MaaS 平台官网，火山方舟、豆包大模型 API 的统一入口。',
        url: 'https://www.volcengine.com/',
      },
      {
        title: '豆包',
        summary: '面向个人用户的豆包 AI 智能助手入口。',
        url: 'https://www.doubao.com/',
      },
      {
        title: 'ByteDance Seed',
        summary: 'Seed 团队官网，前沿模型研究和技术报告的官方入口。',
        url: 'https://seed.bytedance.com/',
      },
      {
        title: '扣子 Coze',
        summary: '低代码 AI agent / bot 搭建与 AI 办公平台官网。',
        url: 'https://www.coze.cn/',
      },
      {
        title: '即梦 Jimeng',
        summary: '一站式 AI 视觉创作平台（文生图、视频生成、数字人）官网。',
        url: 'https://jimeng.jianying.com/',
      },
    ],
    flagshipKeywords: ['豆包', 'doubao', '字节', '火山引擎', 'volcengine', 'coze', '即梦', 'seed'],
    homepageUrl: 'https://www.volcengine.com/',
  },
};

export function getCompanyPresentationSeed(name: string): CompanyPresentation | null {
  const key = companyKey(name);
  const aliasKey = COMPANY_PRESENTATION_ALIASES[key];
  return COMPANY_PRESENTATIONS[key] ?? (aliasKey ? COMPANY_PRESENTATIONS[aliasKey] : null) ?? null;
}

/** 把任意公司名解析成其策展页的「规范 key」（含 alias）；没有策展页返回 null。 */
export function resolveCompanyPresentationKey(name: string): string | null {
  const key = companyKey(name);
  if (COMPANY_PRESENTATIONS[key]) return key;
  const aliasKey = COMPANY_PRESENTATION_ALIASES[key];
  if (aliasKey && COMPANY_PRESENTATIONS[aliasKey]) return aliasKey;
  return null;
}

/** 已注册策展页的全部规范 key（公司目录上架白名单）。 */
export const COMPANY_PRESENTATION_KEYS = Object.keys(COMPANY_PRESENTATIONS);

/** 按 key 取策展页（不走名称/alias 解析）。 */
export function getCompanyPresentationByKey(key: string): CompanyPresentation | null {
  return COMPANY_PRESENTATIONS[key] ?? null;
}

const COMPANY_PRESENTATION_ALIASES: Record<string, string> = {
  '阿里巴巴': 'alibaba-damo-academy',
  '阿里云': 'alibaba-damo-academy',
  '通义千问': 'alibaba-damo-academy',
  '苹果公司': 'apple',
  '谷歌': 'google',
  '深度求索': 'deepseek',
  '杭州深度求索人工智能基础技术研究有限公司（深度求索-/-deepseek）': 'deepseek',
  '英伟达': 'nvidia',
  '稀宇科技': 'minimax',
  // Meta 家族
  'meta-ai': 'meta',
  'facebook': 'meta',
  'facebook-ai-research-(fair)': 'meta',
  'meta-superintelligence-labs': 'meta',
  // Microsoft
  '微软': 'microsoft',
  '微软研究院': 'microsoft',
  '微软人工智能': 'microsoft',
  'microsoft-research': 'microsoft',
  'microsoft-ai': 'microsoft',
  'microsoft-research-asia': 'microsoft',
  // Anysphere / Cursor
  'anysphere-(cursor)': 'anysphere',
  'cursor': 'anysphere',
  // Thinking Machines Lab
  'thinking-machines': 'thinking-machines-lab',
  '思维机器实验室': 'thinking-machines-lab',
  // Amazon
  '亚马逊': 'amazon',
  'amazon-web-services-(aws)': 'amazon',
  'amazon-agi-team': 'amazon',
  // 月之暗面 / Kimi
  '月之暗面': 'moonshot-ai',
  '月之暗面（moonshot-ai）': 'moonshot-ai',
  '月之暗面-kimi': 'moonshot-ai',
  'kimi': 'moonshot-ai',
  // 百度
  '百度': 'baidu',
  '百度集团': 'baidu',
  '百度商务搜索部': 'baidu',
  'baidu-research-(ai-group)': 'baidu',
  // 智谱
  '智谱ai': 'zhipu-ai',
  '智谱': 'zhipu-ai',
  // 腾讯
  '腾讯': 'tencent',
  'tencent-cloud-ai': 'tencent',
  '腾讯ai-lab': 'tencent',
  // 字节跳动
  '字节跳动': 'bytedance',
  '字节': 'bytedance',
  '豆包': 'bytedance',
};

/**
 * 解析公司页策展内容：优先用 seed，没有 seed 时从 DB intelligence 退化出一份
 * 最小可用的 presentation（无学习入口 / bets / 旗舰词），保证任意公司都能渲染。
 */
export function resolveCompanyPresentation(
  name: string,
  intelligence: CompanyPageIntelligence
): CompanyPresentation {
  const seed = getCompanyPresentationSeed(intelligence.displayName || name);
  if (seed) return seed;

  const displayName = intelligence.displayName || name;
  return {
    heroDescription: intelligence.positioning || `查看 ${displayName} 的 AI 产品线、相关技术主题、公司来源和关键人物。`,
    headline: intelligence.positioning || '',
    strategy: intelligence.aiStrategySummary || intelligence.positioning || '',
    products: intelligence.products.map(product => ({
      name: product.name,
      summary: product.summary,
      url: product.url,
    })),
    bets: [],
    learningResources: [],
    officialLinks: intelligence.homepageUrl
      ? [{ title: `${displayName} 官网`, summary: '公司官方入口。', url: intelligence.homepageUrl }]
      : [],
    flagshipKeywords: [],
  };
}
