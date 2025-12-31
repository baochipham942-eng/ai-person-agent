'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SearchBox } from '@/components/search/SearchBox';
import { PersonRecommendationList } from '@/components/home/PersonRecommendationList';

export default function HomePage() {
  const router = useRouter();

  const handlePersonSelected = (personId: string) => {
    router.push(`/person/${personId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📚</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI 人物库</h1>
              <p className="text-xs text-gray-500">探索 · 学习 · 成长</p>
            </div>
          </div>
          <div>
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              登录 / 注册
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            探索 <span className="text-blue-600">每一个</span> 有影响力的人
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            AI 人物库帮助你深入了解各领域的杰出人物，
            从他们的思想、作品和经历中汲取智慧。
          </p>
        </section>

        {/* Search Section */}
        <section className="mb-12">
          <SearchBox onPersonSelected={handlePersonSelected} />
        </section>

        {/* Recommendation Section */}
        <section className="mb-16">
          <PersonRecommendationList />
        </section>

        {/* Tips Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon="🔍"
            title="智能搜索"
            description="输入人物姓名，自动匹配本地库或从 Wikidata 获取候选"
          />
          <FeatureCard
            icon="📊"
            title="多源聚合"
            description="整合 Web、Twitter、YouTube、学术论文等多渠道信息"
          />
          <FeatureCard
            icon="💡"
            title="结构化学习"
            description="将海量信息提炼为卡片、学习路径，助你高效学习"
          />
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
