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
};

export function getCompanyPresentationSeed(name: string): CompanyPresentation | null {
  const key = companyKey(name);
  const aliasKey = COMPANY_PRESENTATION_ALIASES[key];
  return COMPANY_PRESENTATIONS[key] ?? (aliasKey ? COMPANY_PRESENTATIONS[aliasKey] : null) ?? null;
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
