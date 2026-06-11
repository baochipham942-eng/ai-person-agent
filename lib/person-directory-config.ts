export type DirectoryViewMode = 'trending' | 'topic' | 'organization' | 'role';

export interface DirectoryHighlight {
  icon: string;
  text: string;
}

export interface DirectoryPerson {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  organization: string[];
  organizationMatch?: DirectoryOrganizationMatch | null;
  currentTitle: string | null;
  topics: string[];
  highlights: DirectoryHighlight[] | null;
  roleCategory: string | null;
  influenceScore: number;
  weeklyViewCount: number;
}

export interface DirectoryOrganizationMatch {
  organization: string;
  role: string | null;
  status: 'current' | 'past' | 'role' | 'profile';
  isCurrent: boolean;
  startYear: string | null;
  endYear: string | null;
  confidence: number | null;
  source: 'role' | 'profile';
}

export interface DirectoryStats {
  totalPeople: number;
  totalTopics: number;
  totalOrgs: number;
}

export interface DirectoryResponse {
  data: DirectoryPerson[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  stats?: DirectoryStats;
}

export interface DirectoryFilters {
  view: DirectoryViewMode;
  topic: string | null;
  organization: string | null;
  role: string | null;
  search: string;
}

export const DIRECTORY_TOPICS = [
  '大语言模型', 'Transformer', 'RAG', 'Agent', '多模态', '推理',
  'Scaling', '强化学习', 'RLHF', 'Memory', 'Eval', 'MoE',
  '代码生成', 'NLP', '计算机视觉', '语音', '机器人', '自动驾驶',
  '对齐', '安全', '合规', '医疗AI', '教育', '金融AI',
  '开源', '产品', '基础设施', '芯片', 'AGI', '个性化'
];

export interface DirectoryOrganizationGroup {
  key: string;
  label: string;
  organizations: string[];
}

export const DIRECTORY_ORGANIZATION_GROUPS: DirectoryOrganizationGroup[] = [
  {
    key: 'frontier-labs',
    label: '前沿模型实验室',
    organizations: [
      'OpenAI', 'Anthropic', 'DeepMind', 'xAI', 'Mistral', 'Cohere',
      'Perplexity', 'Hugging Face'
    ],
  },
  {
    key: 'china-model-labs',
    label: '中国模型公司',
    organizations: [
      'DeepSeek', 'Kimi', '智谱AI', '百川智能', 'MiniMax',
      '阿里巴巴', '腾讯', '字节跳动', '百度'
    ],
  },
  {
    key: 'big-tech-platforms',
    label: '大厂与平台',
    organizations: ['Google', 'Microsoft', 'Meta', 'Apple'],
  },
  {
    key: 'universities',
    label: '高校与研究机构',
    organizations: ['Stanford', 'MIT', 'Berkeley', 'CMU', '清华大学', '北京大学'],
  },
  {
    key: 'hardware-robotics',
    label: '硬件与机器人',
    organizations: ['Nvidia', 'Tesla'],
  },
];

export const DIRECTORY_ORGANIZATIONS = DIRECTORY_ORGANIZATION_GROUPS.flatMap(group => group.organizations);

export const DIRECTORY_ORGANIZATION_ALIASES: Record<string, string[]> = {
  OpenAI: ['OpenAI', 'OpenAI基金会', 'OpenAI Foundation', '开放人工智能基金会'],
  Google: ['Google', '谷歌', '谷歌DeepMind', '谷歌大脑', 'Google Brain', 'Google DeepMind', 'Google Cloud'],
  DeepMind: ['DeepMind', 'Google DeepMind', '谷歌DeepMind'],
  Anthropic: ['Anthropic'],
  Microsoft: ['Microsoft', '微软', '微软研究院', '微软AI', 'Microsoft Research'],
  Meta: ['Meta', 'Facebook', 'Meta AI', 'FAIR', 'FAIR蒙特利尔', '脸书', 'Meta超级智能实验室'],
  Apple: ['Apple', '苹果'],
  Amazon: ['Amazon', 'AWS', '亚马逊'],
  Tesla: ['Tesla', '特斯拉', '特斯拉公司', 'Tesla, Inc.'],
  Nvidia: ['Nvidia', 'NVIDIA', '英伟达'],
  'Hugging Face': ['Hugging Face', 'HuggingFace'],
  Cohere: ['Cohere'],
  Mistral: ['Mistral', 'Mistral AI'],
  xAI: ['xAI', 'X.AI'],
  Perplexity: ['Perplexity', 'Perplexity AI'],
  Stanford: ['Stanford', '斯坦福大学', 'Stanford University'],
  MIT: ['MIT', '麻省理工学院', 'Massachusetts Institute of Technology', '思维机器实验室'],
  Berkeley: ['Berkeley', 'UC Berkeley', '加州大学伯克利分校'],
  CMU: ['CMU', '卡内基梅隆大学', 'Carnegie Mellon University'],
  清华大学: ['清华大学', 'Tsinghua', 'Tsinghua University', '清华大学 NLP', '清华大学、智谱AI', '清华大学、生数科技'],
  北京大学: ['北京大学', 'PKU', '北大', '北京大学、智源研究院'],
  DeepSeek: ['DeepSeek', '幻方量化', '深度求索'],
  Kimi: ['Kimi', '月之暗面', 'Moonshot', 'Moonshot AI', '月之暗面 Kimi', '月之暗面（Moonshot AI）'],
  智谱AI: ['智谱AI', 'Zhipu', 'Zhipu AI', '智谱', 'GLM', '清华大学、智谱AI'],
  百川智能: ['百川智能', 'Baichuan'],
  MiniMax: ['MiniMax', 'Minimax'],
  阿里巴巴: ['阿里巴巴', '阿里达摩院', '达摩院', 'Alibaba', '通义'],
  腾讯: ['腾讯', 'Tencent', '腾讯AI Lab'],
  字节跳动: ['字节跳动', 'ByteDance', '豆包'],
  百度: ['百度', 'Baidu', '文心'],
  小米: ['小米', 'Xiaomi'],
  阶跃星辰: ['阶跃星辰', 'Stepfun', 'Stepfun 阶跃星辰'],
  零一万物: ['零一万物', '创新工场、零一万物'],
  澜舟科技: ['澜舟科技', '创新工场、澜舟科技'],
  商汤科技: ['商汤科技'],
  第四范式: ['第四范式'],
  Stripe: ['Stripe'],
  'Scale AI': ['Scale AI'],
  'Stability AI': ['Stability AI'],
  'Character.ai': ['Character.ai'],
  'Inflection AI': ['Inflection AI'],
};

export function getDirectoryOrganizationAliases(organization: string): string[] {
  return DIRECTORY_ORGANIZATION_ALIASES[organization] || [organization];
}

export const DIRECTORY_ROLES = [
  { key: 'founder', label: '创始人/CEO' },
  { key: 'researcher', label: '研究科学家' },
  { key: 'engineer', label: '工程师' },
  { key: 'professor', label: '教授' },
  { key: 'evangelist', label: '布道者' }
] as const;

export const DIRECTORY_VIEW_MODES: { key: DirectoryViewMode; icon: string; label: string }[] = [
  { key: 'trending', icon: '🔥', label: '影响力排序' },
  { key: 'topic', icon: '📚', label: '按话题' },
  { key: 'organization', icon: '🏢', label: '按机构' },
  { key: 'role', icon: '👤', label: '按角色' }
];

export function getInitialDirectoryFilters(params: {
  view?: string | string[] | null;
  topic?: string | string[] | null;
  organization?: string | string[] | null;
  role?: string | string[] | null;
  search?: string | string[] | null;
}): DirectoryFilters {
  const viewParam = firstParam(params.view);
  const topic = firstParam(params.topic);
  const organization = firstParam(params.organization);
  const role = firstParam(params.role);
  const search = firstParam(params.search) || '';

  let view: DirectoryViewMode = 'trending';
  if (viewParam && ['trending', 'topic', 'organization', 'role'].includes(viewParam)) {
    view = viewParam as DirectoryViewMode;
  } else if (topic) {
    view = 'topic';
  } else if (organization) {
    view = 'organization';
  } else if (role) {
    view = 'role';
  }

  return {
    view,
    topic: topic || null,
    organization: organization || null,
    role: role || null,
    search,
  };
}

export function buildDirectoryApiUrl(params: {
  page: number;
  topic?: string | null;
  organization?: string | null;
  roleCategory?: string | null;
  search?: string;
}): string {
  const searchParams = new URLSearchParams({
    page: params.page.toString(),
    limit: '12',
    sortBy: 'influenceScore',
  });

  if (params.topic) searchParams.set('topic', params.topic);
  if (params.organization) searchParams.set('organization', params.organization);
  if (params.roleCategory) searchParams.set('roleCategory', params.roleCategory);
  if (params.search) searchParams.set('search', params.search);

  return `/api/person/directory?${searchParams}`;
}

function firstParam(value?: string | string[] | null): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}
