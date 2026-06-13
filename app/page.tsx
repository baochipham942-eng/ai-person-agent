import { Suspense } from 'react';
import { ResearcherDirectory } from '@/components/home/ResearcherDirectory';
import {
  DIRECTORY_ORGANIZATIONS,
  DIRECTORY_TOPICS,
  getInitialDirectoryFilters,
  type DirectoryPerson,
  type DirectoryResponse,
} from '@/lib/person-directory-config';
import { fetchPersonDirectory } from '@/lib/person-directory';

const INITIAL_DIRECTORY_TIMEOUT_MS = 2500;
const FALLBACK_DIRECTORY_PEOPLE: DirectoryPerson[] = [
  {
    id: 'cmjtsvcil00003esttihbrsjm',
    name: 'Yann LeCun',
    description: '深度学习和卷积神经网络奠基人之一，Meta 首席 AI 科学家。',
    avatarUrl: null,
    organization: ['Meta', '纽约大学', '贝尔实验室'],
    currentTitle: 'VP & Chief AI Scientist @ Meta',
    topics: ['计算机视觉', '自监督学习', '开源'],
    highlights: [
      { icon: '📄', text: '开创并推广卷积神经网络，为现代计算机视觉奠定基础。' },
      { icon: '🔥', text: '长期推动自监督学习和开源模型生态。' },
    ],
    roleCategory: 'professor',
    influenceScore: 80.81,
    weeklyViewCount: 13,
    citationCount: 239843,
    githubStars: 49,
  },
  {
    id: 'cmjsme4n800009u972zrrxrei',
    name: 'Andrej Karpathy',
    description: 'OpenAI 早期成员、特斯拉前 AI 总监，Eureka Labs 创始人。',
    avatarUrl: null,
    organization: ['OpenAI', '特斯拉'],
    currentTitle: 'Founder @ Eureka Labs',
    topics: ['大语言模型', '具身智能/机器人', 'Transformer', '教育'],
    highlights: [
      { icon: '📄', text: '参与 GPT 系列和现代深度学习教育内容建设。' },
      { icon: '💻', text: '主导特斯拉自动驾驶视觉感知栈。' },
    ],
    roleCategory: 'researcher',
    influenceScore: 80.69,
    weeklyViewCount: 27,
    citationCount: 57567,
    githubStars: 311279,
  },
  {
    id: 'cmjtsw84q00023esto9f6h0w6',
    name: 'Demis Hassabis',
    description: 'Google DeepMind 联合创始人兼 CEO，AlphaGo 与 AlphaFold 关键推动者。',
    avatarUrl: null,
    organization: ['Google DeepMind', '伦敦大学学院'],
    currentTitle: 'Co-founder & CEO @ Google DeepMind',
    topics: ['强化学习', 'AGI', '开源', 'AI 产品化'],
    highlights: [
      { icon: '🏆', text: '领导 AlphaGo 和 AlphaFold 等标志性 AI 系统。' },
      { icon: '🔥', text: '把前沿研究持续推向科学和产业应用。' },
    ],
    roleCategory: 'researcher',
    influenceScore: 80.07,
    weeklyViewCount: 4,
    citationCount: 169211,
    githubStars: 0,
  },
  {
    id: 'cmjtsx87a00043estei08y4na',
    name: 'Ilya Sutskever',
    description: 'OpenAI 联合创始人，Safe Superintelligence 联合创始人兼首席科学家。',
    avatarUrl: null,
    organization: ['OpenAI', 'Google Brain', 'Safe Superintelligence'],
    currentTitle: 'Co-founder & Chief Scientist @ Safe Superintelligence Inc.',
    topics: ['大语言模型', 'Transformer', 'AGI', '对齐'],
    highlights: [
      { icon: '📄', text: 'Transformer 和 GPT 系列背后的关键研究者之一。' },
      { icon: '🛡️', text: '长期关注 AI 对齐和超级智能安全。' },
    ],
    roleCategory: 'researcher',
    influenceScore: 78.06,
    weeklyViewCount: 5,
    citationCount: 235641,
    githubStars: 0,
  },
  {
    id: 'cmjtsvqew00013est5j2tsqcx',
    name: 'Yoshua Bengio',
    description: '深度学习奠基人之一，Mila 科学总监，图灵奖得主。',
    avatarUrl: null,
    organization: ['Mila', '蒙特利尔大学'],
    currentTitle: 'Scientific Director @ Mila, Professor @ Universite de Montreal',
    topics: ['自监督学习', '对齐', 'AI 安全'],
    highlights: [
      { icon: '🏆', text: '与 Hinton、LeCun 共同获得 2018 年图灵奖。' },
      { icon: '📄', text: '系统推动深度学习理论和 AI 安全研究。' },
    ],
    roleCategory: 'professor',
    influenceScore: 76.48,
    weeklyViewCount: 0,
    citationCount: 479505,
    githubStars: 51,
  },
  {
    id: 'cmjtswmqg00033est2ofuqdw0',
    name: 'Dario Amodei',
    description: 'Anthropic 联合创始人兼 CEO，Claude 和 Constitutional AI 推动者。',
    avatarUrl: null,
    organization: ['Anthropic', 'OpenAI'],
    currentTitle: 'CEO @ Anthropic',
    topics: ['大语言模型', '对齐', 'AI 安全'],
    highlights: [
      { icon: '🛡️', text: '推动 Constitutional AI 和安全对齐产品路线。' },
      { icon: '🔥', text: '领导 Claude 系列成为 GPT 系列的重要竞争者。' },
    ],
    roleCategory: 'founder',
    influenceScore: 73.81,
    weeklyViewCount: 6,
    citationCount: 33311,
    githubStars: 3,
  },
];

function LoadingFallback() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center"
      style={{ background: 'var(--background)' }}
      aria-live="polite"
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
        style={{ background: 'var(--gradient-primary)' }}
      >
        <span className="text-white text-sm font-semibold">AI</span>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-stone-900">AI 人物库</div>
        <div className="text-xs text-stone-500">正在加载研究者</div>
      </div>
      <div
        className="w-8 h-8 rounded-full animate-spin"
        style={{ border: '3px solid transparent', borderTopColor: '#f97316', borderRightColor: '#ec4899' }}
      />
    </div>
  );
}

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const initialFilters = getInitialDirectoryFilters({
    view: resolvedSearchParams?.view,
    topic: resolvedSearchParams?.topic,
    organization: resolvedSearchParams?.organization,
    role: resolvedSearchParams?.role,
    search: resolvedSearchParams?.search,
    sortBy: resolvedSearchParams?.sortBy,
  });

  const directoryParams = {
    page: 1,
    limit: 12,
    topic: initialFilters.topic,
    organization: initialFilters.organization,
    roleCategory: initialFilters.role,
    search: initialFilters.search,
    sortBy: initialFilters.sortBy,
  };
  const initialData = await fetchInitialDirectory(directoryParams);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResearcherDirectory initialData={initialData} initialFilters={initialFilters} />
    </Suspense>
  );
}

async function fetchInitialDirectory(params: Parameters<typeof fetchPersonDirectory>[0]): Promise<DirectoryResponse> {
  const fallback = createDirectoryFallback();
  const directoryPromise = fetchPersonDirectory(params).catch(error => {
    console.error('Failed to fetch initial directory:', error);
    return fallback;
  });
  const timeoutPromise = new Promise<DirectoryResponse>(resolve => {
    setTimeout(() => resolve(fallback), INITIAL_DIRECTORY_TIMEOUT_MS);
  });

  return Promise.race([directoryPromise, timeoutPromise]);
}

function createDirectoryFallback(): DirectoryResponse {
  return {
    data: FALLBACK_DIRECTORY_PEOPLE,
    pagination: {
      page: 1,
      limit: 12,
      total: FALLBACK_DIRECTORY_PEOPLE.length,
      hasMore: false,
    },
    stats: {
      totalPeople: null,
      totalTopics: DIRECTORY_TOPICS.length,
      totalOrgs: DIRECTORY_ORGANIZATIONS.length,
    },
    isFallback: true,
  };
}
