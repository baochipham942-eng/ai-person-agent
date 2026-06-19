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
};

export function getCompanyPresentationSeed(name: string): CompanyPresentation | null {
  return COMPANY_PRESENTATIONS[companyKey(name)] ?? null;
}

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
