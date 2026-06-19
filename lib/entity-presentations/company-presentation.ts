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
      'xAI 的公司页先看 Grok 模型、Grok Build、Composer 和生产力插件怎样组成产品线，再看它和 Agentic Coding、Context Engineering 等主题的关系。',
    headline: '四条产品线：Grok 模型、开发者代理平台、内容创作工具、办公场景插件；官方发布节奏是当前最主要的证据来源。',
    strategy:
      'xAI 当前对外展示的 AI 布局可以按四条线看：Grok 模型负责底层能力和云平台分发，Grok Build / Agent Dashboard 把模型带进多会话代理管理，Composer 面向内容生成与编辑，Grok for PowerPoint 则把能力嵌入办公软件。这个样稿只把官方新闻和产品发布当作策展线索，不把 dry-run 候选误写成已入库公司证据。',
    products: [
      {
        name: 'Grok 模型系列',
        summary: 'xAI 的核心模型产品线。Grok 4.3 进入 Amazon Bedrock，说明它正在走企业云分发路径。',
        url: 'https://x.ai/news/grok-amazon-bedrock',
      },
      {
        name: 'Grok Build / Agent Dashboard',
        summary: '面向开发者和代理工作流的产品入口，用来管理多个编码会话，是观察 xAI 进入 agentic coding 的关键样本。',
        url: 'https://x.ai/news/agent-dashboard',
      },
      {
        name: 'Composer',
        summary: '面向内容生成和编辑的产品线，用来观察 xAI 如何把模型能力包装成可直接使用的创作工具。',
        url: 'https://x.ai/news/composer-2-5',
      },
      {
        name: 'Grok for PowerPoint',
        summary: '把 Grok 嵌入 Microsoft PowerPoint 的插件形态，代表模型能力进入办公软件的分发尝试。',
        url: 'https://x.ai/news/introducing-powerpoint-addin',
      },
    ],
    bets: [
      {
        title: '代理工作流',
        body: 'Grok Build 和 Agent Dashboard 指向一个更像工作台的方向：让用户管理多个 AI 编码会话，而不是只和单个聊天入口交互。',
      },
      {
        title: '平台分发',
        body: 'Amazon Bedrock 和 PowerPoint 插件说明 xAI 正在通过云平台和办公软件扩大 Grok 的使用入口。',
      },
    ],
    learningResources: [
      {
        title: 'Grok 4.3 now available in Amazon Bedrock',
        label: '云分发',
        summary: '先读这条：它说明 Grok 模型进入 AWS 企业云入口，是判断 xAI 商业化分发路径的直接官方材料。',
        url: 'https://x.ai/news/grok-amazon-bedrock',
      },
      {
        title: 'Grok Build Agent Dashboard',
        label: 'Agentic Coding',
        summary: '观察 xAI 如何把编码代理从单次会话推进到多会话管理和工作台形态。',
        url: 'https://x.ai/news/agent-dashboard',
      },
      {
        title: 'Introducing PowerPoint Add-in',
        label: '办公插件',
        summary: '模型能力进入现有办公工具的入口，适合看产品分发和使用场景。',
        url: 'https://x.ai/news/introducing-powerpoint-addin',
      },
      {
        title: 'Composer 2.5',
        label: '创作工具',
        summary: '内容生成与编辑产品线的官方发布，帮助区分 xAI 的模型、代理和内容工具。',
        url: 'https://x.ai/news/composer-2-5',
      },
    ],
    officialLinks: [
      {
        title: 'xAI',
        summary: '公司官网和产品入口。',
        url: 'https://x.ai',
      },
      {
        title: 'xAI News',
        summary: '官方新闻和产品发布，当前 xAI 公司页样稿的主要来源。',
        url: 'https://x.ai/news',
      },
    ],
    flagshipKeywords: ['grok', 'agent dashboard', 'grok build', 'composer'],
    homepageUrl: 'https://x.ai',
  },
  'alibaba-damo-academy': {
    heroDescription:
      'Alibaba DAMO Academy / Qwen 的公司页先看 Qwen 模型、具身智能和 agent 导航等官方发布怎样组成技术线索，再看它和 Agentic Coding、Context Engineering 的关系。',
    headline: '四条线索：Qwen 模型、机器人操作、机器人导航、具身世界模型；当前证据以 Qwen 官方博客为主。',
    strategy:
      '这组 P0 来源显示阿里系 AI 布局正在把 Qwen 从通用模型扩展到具身智能和智能体任务：Qwen3.7 指向 agent 前沿模型，Qwen-RobotManip / RobotNav / RobotWorld 则把模型能力推向操作、导航和物理世界理解。',
    products: [
      {
        name: 'Qwen3.7',
        summary: '面向智能体能力的 Qwen 模型发布，是观察阿里模型线如何进入 agent 工作流的入口。',
        url: 'https://qwen.ai/blog?id=qwen3.7',
      },
      {
        name: 'Qwen-RobotManip',
        summary: '机器人操作基础模型方向，强调通过对齐解锁规模化操作能力。',
        url: 'https://qwen.ai/blog?id=qwen-robotmanip',
      },
      {
        name: 'Qwen-RobotNav',
        summary: '面向智能体导航系统的模型线索，用来观察模型如何进入导航和空间任务。',
        url: 'https://qwen.ai/blog?id=qwen-robotnav',
      },
      {
        name: 'Qwen-RobotWorld',
        summary: '具身智能体世界模型线索，适合和 Agent Memory、Context Engineering 等主题后续交叉。',
        url: 'https://qwen.ai/blog?id=qwen-robotworld',
      },
    ],
    bets: [
      {
        title: '具身智能',
        body: '连续的机器人操作、导航和世界模型发布说明 Qwen 正在被包装成具身智能底座，而不只是文本模型。',
      },
      {
        title: 'Agent 模型能力',
        body: 'Qwen3.7 的定位让它可以进入 agentic workflow 的能力对比，但还需要后续 source pack 证明真实采用。',
      },
    ],
    learningResources: [
      {
        title: 'Qwen-RobotManip',
        label: '机器人操作',
        summary: '先读这篇，理解 Qwen 如何把模型对齐和机器人操作任务连接起来。',
        url: 'https://qwen.ai/blog?id=qwen-robotmanip',
      },
      {
        title: 'Qwen-RobotNav',
        label: '机器人导航',
        summary: '用于观察智能体导航系统里的模型能力和任务边界。',
        url: 'https://qwen.ai/blog?id=qwen-robotnav',
      },
      {
        title: 'Qwen3.7',
        label: 'Agent 模型',
        summary: '用来判断 Qwen 在智能体能力上的官方叙事和产品节奏。',
        url: 'https://qwen.ai/blog?id=qwen3.7',
      },
    ],
    officialLinks: [
      {
        title: 'Alibaba Cloud',
        summary: '阿里云官网入口。',
        url: 'https://www.alibabacloud.com',
      },
    ],
    flagshipKeywords: ['qwen', 'robot', 'agent'],
    homepageUrl: 'https://www.alibabacloud.com',
  },
  apple: {
    heroDescription:
      '苹果公司页先看 Apple Foundation Models、隐私保护机器学习和 Apple ML Research 的官方材料，再判断它在端侧 AI 与模型能力上的布局。',
    headline: '三条线索：Apple Foundation Models、隐私保护机器学习、研究社区参与；当前源包偏研究和团队信号。',
    strategy:
      'Apple 的 P0 来源不像模型公司那样给出完整产品矩阵，更多是从 Apple Foundation Models、PPML 研讨会和 ICASSP 研究参与来观察它如何把模型能力放进隐私保护、端侧体验和开发者生态。',
    products: [
      {
        name: 'Apple Foundation Models',
        summary: 'Apple 官方机器学习研究发布，适合作为理解其基础模型能力和端侧 AI 路线的入口。',
        url: 'https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models',
      },
      {
        name: 'Privacy-Preserving Machine Learning',
        summary: '隐私保护机器学习方向更像技术底座，不是独立产品，但能解释 Apple AI 布局的约束条件。',
        url: 'https://machinelearning.apple.com/updates/ppml-2026',
      },
    ],
    bets: [
      {
        title: '端侧与隐私约束',
        body: 'Apple 的 AI 叙事绕不开端侧体验和隐私保护，机器学习研究材料比营销页面更能说明长期边界。',
      },
      {
        title: '基础模型能力',
        body: 'Apple Foundation Models 是当前最值得跟踪的官方入口，但还需要更多产品落地源才能把公司页做厚。',
      },
    ],
    learningResources: [
      {
        title: 'Introducing third generation of Apple Foundation Models',
        label: '基础模型',
        summary: '当前最直接的 Apple 模型能力官方材料。',
        url: 'https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models',
      },
      {
        title: 'Apple Privacy-Preserving Machine Learning Workshop 2026',
        label: '隐私机器学习',
        summary: '理解 Apple 为什么会把隐私保护作为 AI 技术路线的一部分。',
        url: 'https://machinelearning.apple.com/updates/ppml-2026',
      },
      {
        title: 'Apple at ICASSP 2026',
        label: '研究社区',
        summary: '研究参与信号，适合看 Apple ML 团队关注的技术方向。',
        url: 'https://machinelearning.apple.com/updates/apple-at-icassp-2026',
      },
    ],
    officialLinks: [
      {
        title: 'Apple',
        summary: '公司官网入口。',
        url: 'https://www.apple.com',
      },
    ],
    flagshipKeywords: ['foundation models', 'privacy', 'machine learning'],
    homepageUrl: 'https://www.apple.com',
  },
  cloudflare: {
    heroDescription:
      'Cloudflare 的公司页先看 AI Gateway、AI 基础设施团队和安全测试工具，理解它如何把 AI 能力放进边缘网络、安全和成本控制。',
    headline: '三条线索：AI Gateway 成本控制、Ensemble AI 团队、漏洞发现 harness；AI 基础设施和安全是主轴。',
    strategy:
      'Cloudflare 的 P0 来源显示它不是在做通用模型，而是在把 AI 放进网络和开发者基础设施：AI Gateway 控制模型调用成本，Ensemble AI 强化团队能力，漏洞发现 harness 则把 AI 安全和上下文绕过问题产品化。',
    products: [
      {
        name: 'AI Gateway spend limits',
        summary: '面向 AI 调用成本和网关治理的产品能力，适合观察 Cloudflare 如何卡住企业 AI 基础设施入口。',
        url: 'https://blog.cloudflare.com/ai-gateway-spend-limits',
      },
      {
        name: 'Vulnerability harness',
        summary: '多阶段漏洞发现工具，能和 Agent Security、Context Engineering 后续主题交叉。',
        url: 'https://blog.cloudflare.com/build-your-own-vulnerability-harness',
      },
    ],
    bets: [
      {
        title: 'AI 基础设施',
        body: 'Cloudflare 的优势不在模型本身，而在流量、网关、权限、成本和安全这些 AI 应用上线后的基础设施层。',
      },
      {
        title: '安全与上下文攻击',
        body: '漏洞发现 harness 把 adversarial review、context bypass 这些问题拉到工程实现层，值得进入 Agent Security 候选主题。',
      },
    ],
    learningResources: [
      {
        title: 'AI Gateway spend limits',
        label: 'AI 网关',
        summary: '理解 Cloudflare 如何把 AI 调用成本和治理做成基础设施能力。',
        url: 'https://blog.cloudflare.com/ai-gateway-spend-limits',
      },
      {
        title: 'Build your own vulnerability harness',
        label: '安全测试',
        summary: '用于观察 Cloudflare 如何处理对抗性审查和上下文绕过。',
        url: 'https://blog.cloudflare.com/build-your-own-vulnerability-harness',
      },
      {
        title: 'Ensemble AI talent joins Cloudflare',
        label: '团队信号',
        summary: '团队扩张信号，说明 Cloudflare 在 AI 基础设施方向继续加码。',
        url: 'https://blog.cloudflare.com/ensemble-ai-talent-joins-cloudflare',
      },
    ],
    officialLinks: [
      {
        title: 'Cloudflare',
        summary: '公司官网入口。',
        url: 'https://www.cloudflare.com',
      },
    ],
    flagshipKeywords: ['ai gateway', 'security', 'harness'],
    homepageUrl: 'https://www.cloudflare.com',
  },
  deepseek: {
    heroDescription:
      'DeepSeek 的公司页先用当前源包里的 Visual Primitive Thinking 官方仓库做技术入口，再等待更多模型、产品和团队来源把页面补厚。',
    headline: '当前只有一条强技术线索：视觉基元思维；公司页先保持保守，不把薄源扩写成完整产品矩阵。',
    strategy:
      'DeepSeek 的 P0 公司源包目前很薄，只有 Visual Primitive Thinking 相关材料可以作为可追溯技术线索。因此这页先把它当作研究和多模态空间推理方向，不硬写完整产品布局。',
    products: [
      {
        name: 'Visual Primitive Thinking',
        summary: 'DeepSeek 团队围绕多模态空间推理提出的研究线索，当前更适合当技术主题入口，而不是商业产品。',
        url: 'https://github.com/deepseek-ai/Thinking-with-Visual-Primitives',
      },
    ],
    bets: [
      {
        title: '多模态空间推理',
        body: '视觉基元思维材料指向多模态模型的空间指代表达能力，是当前唯一可稳妥落地的公司页线索。',
      },
      {
        title: '保守补源',
        body: 'DeepSeek 页面需要后续补模型发布、官方文档和开发者入口，不能靠二手融资或传闻把公司页写厚。',
      },
    ],
    learningResources: [
      {
        title: 'Thinking with Visual Primitives',
        label: '多模态研究',
        summary: '当前 DeepSeek P0 源包里唯一可直接用于公司页的技术材料。',
        url: 'https://github.com/deepseek-ai/Thinking-with-Visual-Primitives',
      },
    ],
    officialLinks: [
      {
        title: 'DeepSeek',
        summary: '公司官网入口。',
        url: 'https://www.deepseek.com',
      },
    ],
    flagshipKeywords: ['deepseek', 'visual primitives', 'multimodal'],
    homepageUrl: 'https://www.deepseek.com',
  },
  google: {
    heroDescription:
      'Google 的公司页先看 Colab CLI、ADK 和 Google Pay / Wallet MCP server，理解它如何把 AI agent 能力推向开发者工具和集成工作流。',
    headline: '三条产品线索：Colab CLI、ADK、Google Pay / Wallet MCP server；重点是开发者工作流和 agent 集成。',
    strategy:
      '这组来源显示 Google 正在把 AI agent 能力放进开发者日常工具：Colab CLI 进入终端，ADK 扩到 Kotlin / Android，Google Pay & Wallet MCP server 则把协议化工具接入带到支付集成场景。',
    products: [
      {
        name: 'Google Colab CLI',
        summary: '把 Colab 工作流带进命令行，是 Google AI 开发者体验的一个新入口。',
        url: 'https://developers.googleblog.com/introducing-the-google-colab-cli',
      },
      {
        name: 'Agent Development Kit for Kotlin / Android',
        summary: '把 ADK 带到 Android 和 Kotlin 生态，说明 agent 开发工具链正在跨平台扩展。',
        url: 'https://developers.googleblog.com/adk-kotlin-android-building-ai-agents',
      },
      {
        name: 'Google Pay & Wallet MCP server',
        summary: '用 MCP server 加速支付和钱包集成，是协议层进入业务 API 的一个样本。',
        url: 'https://developers.googleblog.com/supercharge-your-integration-workflow-with-the-google-pay-wallet-developer-mcp-server',
      },
    ],
    bets: [
      {
        title: '开发者工具链',
        body: 'Colab CLI 和 ADK 说明 Google 在把模型能力包装成开发者可复用的工具和 SDK。',
      },
      {
        title: '协议化集成',
        body: 'Google Pay & Wallet MCP server 可以作为 MCP 从协议走向真实业务 API 的公司样本。',
      },
    ],
    learningResources: [
      {
        title: 'Introducing the Google Colab CLI',
        label: '开发者工具',
        summary: '观察 Google 如何把 AI 开发体验带进命令行。',
        url: 'https://developers.googleblog.com/introducing-the-google-colab-cli',
      },
      {
        title: 'ADK Kotlin and Android 0.1.0',
        label: 'Agent SDK',
        summary: '理解 Google 的 agent 开发工具链如何扩到 Android 和 Kotlin。',
        url: 'https://developers.googleblog.com/adk-kotlin-android-building-ai-agents',
      },
      {
        title: 'Google Pay & Wallet Developer MCP server',
        label: 'MCP',
        summary: '一个业务 API 通过 MCP server 暴露给开发者工作流的直接样本。',
        url: 'https://developers.googleblog.com/supercharge-your-integration-workflow-with-the-google-pay-wallet-developer-mcp-server',
      },
    ],
    officialLinks: [
      {
        title: 'Google',
        summary: '公司官网入口。',
        url: 'https://www.google.com',
      },
    ],
    flagshipKeywords: ['colab', 'adk', 'mcp'],
    homepageUrl: 'https://www.google.com',
  },
  'hugging-face': {
    heroDescription:
      'Hugging Face 的公司页先看 Hub 生态、机器人 SDK、评测工具和多模态研究材料，理解它如何作为开源 AI 基础设施连接模型、数据和应用。',
    headline: '三条线索：Hub 到机器人硬件、模型评测循环、多模态运动预测；Hugging Face 的价值在生态和开源协作。',
    strategy:
      'Hugging Face 的 P0 来源不是单一产品发布，而是三个生态样本：Strands Robots SDK 把 Hub 连接到硬件，olmo-eval 支撑模型开发循环，MolmoMotion 展示多模态研究社区如何借平台发布和传播。',
    products: [
      {
        name: 'Hugging Face Hub',
        summary: '模型、数据集和应用共享的核心平台；当前源包里的机器人和评测材料都围绕 Hub 生态展开。',
      },
      {
        name: 'Strands Robots SDK',
        summary: '从 Hugging Face Hub 到物理机器人硬件的 SDK 样本。',
        url: 'https://huggingface.co/blog/amazon/strands-lerobot-hub-to-hardware',
      },
      {
        name: 'olmo-eval',
        summary: '面向模型开发循环的评测工作台，适合和 AI Evals 主题交叉。',
        url: 'https://huggingface.co/blog/allenai/olmo-eval',
      },
    ],
    bets: [
      {
        title: '开源模型生态',
        body: 'Hugging Face 的公司价值更多在生态分发、协作和工具链，而不是单个闭源模型发布。',
      },
      {
        title: '评测与具身智能',
        body: 'olmo-eval 和 Strands Robots SDK 说明平台正在向评测循环和机器人应用延伸。',
      },
    ],
    learningResources: [
      {
        title: 'Strands Robots SDK',
        label: '机器人 SDK',
        summary: '观察 Hugging Face Hub 如何连接到物理机器人和硬件工作流。',
        url: 'https://huggingface.co/blog/amazon/strands-lerobot-hub-to-hardware',
      },
      {
        title: 'olmo-eval',
        label: 'AI Evals',
        summary: '面向模型开发循环的评测工作台，适合进入 AI Evals 证据图谱。',
        url: 'https://huggingface.co/blog/allenai/olmo-eval',
      },
      {
        title: 'MolmoMotion',
        label: '多模态研究',
        summary: '语言引导 3D 运动预测模型，展示平台上的研究发布和传播形态。',
        url: 'https://huggingface.co/blog/allenai/molmomotion',
      },
    ],
    officialLinks: [
      {
        title: 'Hugging Face',
        summary: '平台和社区入口。',
        url: 'https://huggingface.co',
      },
    ],
    flagshipKeywords: ['hugging face hub', 'eval', 'robots'],
    homepageUrl: 'https://huggingface.co',
  },
  minimax: {
    heroDescription:
      'MiniMax 的公司页先看 MiniMax M3 这一条官方模型材料，理解它在编码、长上下文和原生多模态上的产品叙事。',
    headline: '当前核心线索是 MiniMax M3：前沿编码、100 万 token 上下文、原生多模态。',
    strategy:
      'MiniMax 的 P0 源包只有一条强来源，所以页面先保持收敛：MiniMax M3 同时覆盖编码、超长上下文和多模态，是后续连接 Agentic Coding、Context Engineering 的主要入口。',
    products: [
      {
        name: 'MiniMax M3',
        summary: '官方发布强调前沿编码、100 万 token 上下文和原生多模态，是当前最稳的公司页核心材料。',
        url: 'https://www.minimax.io/blog/minimax-m3',
      },
    ],
    bets: [
      {
        title: '长上下文与编码',
        body: 'MiniMax M3 把编码能力和 100 万 token 上下文放在一起，适合后续和 Context Engineering / Agentic Coding 对照。',
      },
      {
        title: '原生多模态',
        body: '多模态能力是 MiniMax M3 的另一条叙事线，但还需要更多应用源来证明产品落地。',
      },
    ],
    learningResources: [
      {
        title: 'MiniMax M3',
        label: '模型发布',
        summary: '当前 MiniMax 公司页最值得先读的官方材料。',
        url: 'https://www.minimax.io/blog/minimax-m3',
      },
    ],
    officialLinks: [
      {
        title: 'MiniMax',
        summary: '公司官网入口。',
        url: 'https://www.minimax.io',
      },
    ],
    flagshipKeywords: ['minimax m3', 'coding', 'long context', 'multimodal'],
    homepageUrl: 'https://www.minimax.io',
  },
  'mistral-ai': {
    heroDescription:
      'Mistral AI 的公司页先看 Search Toolkit、AI Now Summit 和工业 AI 科学投入，理解它在开发者工具、行业生态和应用落地上的布局。',
    headline: '三条线索：Search Toolkit、AI Now Summit、工业 AI；Mistral 正在把模型公司叙事扩到工具和行业场景。',
    strategy:
      'Mistral AI 的 P0 来源显示它不只讲模型发布：Search Toolkit 是开发者能力，AI Now Summit 是生态和行业交流，加倍投入科学以赢得工业 AI 则说明它正在强调行业落地。',
    products: [
      {
        name: 'Search Toolkit',
        summary: '面向搜索和检索能力的工具发布，是观察 Mistral 开发者平台的入口。',
        url: 'https://mistral.ai/news/search-toolkit',
      },
    ],
    bets: [
      {
        title: '开发者工具',
        body: 'Search Toolkit 说明 Mistral 在把模型能力包装成可集成工具，而不是只发布模型权重。',
      },
      {
        title: '工业 AI',
        body: '工业 AI 和科学投入材料说明 Mistral 正在把公司叙事推向行业应用。',
      },
    ],
    learningResources: [
      {
        title: 'Search Toolkit',
        label: '开发者工具',
        summary: '理解 Mistral 如何把搜索能力做成工具入口。',
        url: 'https://mistral.ai/news/search-toolkit',
      },
      {
        title: 'Science to win industrial AI',
        label: '工业 AI',
        summary: '看 Mistral 如何解释科学投入和工业 AI 的关系。',
        url: 'https://mistral.ai/news/science-to-win-industrial-ai',
      },
      {
        title: 'AI Now Summit 2026',
        label: '生态信号',
        summary: '行业生态和合作信号，适合作为公司页背景材料。',
        url: 'https://mistral.ai/news/ai-now-summit-2026',
      },
    ],
    officialLinks: [
      {
        title: 'Mistral AI',
        summary: '公司官网入口。',
        url: 'https://mistral.ai',
      },
    ],
    flagshipKeywords: ['mistral', 'search toolkit', 'industrial ai'],
    homepageUrl: 'https://mistral.ai',
  },
  nvidia: {
    heroDescription:
      'NVIDIA 的公司页先看 RTX、AI 工厂、物理 AI 和主权 AI 这些官方来源，理解它如何把 GPU 公司优势包装成 AI 基础设施和产业落地。',
    headline: '四条线索：RTX 生态、AI 工厂蓝图、物理 AI、主权 AI；NVIDIA 的公司页重点是基础设施和产业化。',
    strategy:
      'NVIDIA 的 P0 来源显示它在用硬件生态、工厂运营蓝图、LG AI 工厂合作和英国主权 AI 材料，把“算力公司”叙事推进到 AI 工厂、物理 AI 和国家级基础设施。',
    products: [
      {
        name: 'RTX Spark',
        summary: 'RTX 生态在 PC 房和游戏场景里的发布信号，用来观察 NVIDIA 如何维持本地算力和开发者入口。',
        url: 'https://blogs.nvidia.com/blog/krafton-nc-t1-korea-gaming-pc-bang-rtx-spark',
      },
      {
        name: 'Factory operations AI blueprint',
        summary: '面向工厂运营的自主智能管理智能体蓝图，是 NVIDIA AI 工厂叙事的直接材料。',
        url: 'https://blogs.nvidia.com/blog/factory-operations-fox-blueprint-ai-brain',
      },
    ],
    bets: [
      {
        title: 'AI 工厂',
        body: '工厂运营蓝图和 LG 合作说明 NVIDIA 正在把 GPU、仿真和智能体打包成产业基础设施。',
      },
      {
        title: '主权 AI',
        body: '英国主权 AI 材料显示 NVIDIA 正在把算力和平台能力放进国家级 AI 战略。',
      },
    ],
    learningResources: [
      {
        title: 'Factory operations blueprint',
        label: 'AI 工厂',
        summary: '替代 Mimo 第一稿里过泛的 NVIDIA AI Blog 链接，直接锚定具体官方来源。',
        url: 'https://blogs.nvidia.com/blog/factory-operations-fox-blueprint-ai-brain',
      },
      {
        title: 'NVIDIA and LG Group AI factory',
        label: '物理 AI',
        summary: '观察 NVIDIA 如何把 AI 工厂、物理 AI 和自动驾驶放进合作叙事。',
        url: 'https://blogs.nvidia.com/blog/nvidia-and-lg-group-ai-factory',
      },
      {
        title: 'UK sovereign AI advancements',
        label: '主权 AI',
        summary: '国家级 AI 基础设施和主权 AI 路线的官方材料。',
        url: 'https://blogs.nvidia.com/blog/uk-sovereign-ai-advancements',
      },
    ],
    officialLinks: [
      {
        title: 'NVIDIA',
        summary: '公司官网入口。',
        url: 'https://www.nvidia.com',
      },
    ],
    flagshipKeywords: ['nvidia', 'ai factory', 'rtx', 'sovereign ai'],
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
