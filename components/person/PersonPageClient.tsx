'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  PersonHeader,
  CoreContribution,
  FeaturedWorks,
  VideoSection,
  RelatedPeople,
  ContentTabs,
} from './sections';

interface OfficialLink {
  type: string;
  url: string;
  handle?: string;
}

interface Card {
  id: string;
  type: string;
  title: string;
  content: string;
  tags: string[];
  importance: number;
}

interface PersonRole {
  id: string;
  role: string;
  roleZh: string | null;
  startDate?: string | null;
  endDate?: string | null;
  organizationName: string;
  organizationNameZh: string | null;
  organizationType: string;
}

interface RelatedPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  organization: string[];
}

interface Relation {
  id: string;
  relationType: string;
  description?: string | null;
  relatedPerson: RelatedPerson;
}

interface Quote {
  text: string;
  source: string;
  url?: string;
  year?: number;
}

interface Product {
  name: string;
  org: string;
  year: string;
  description: string;
  url?: string;
  icon?: string;
  stats?: string;
}

interface Education {
  school: string;
  degree?: string;
  field?: string;
  year?: string;
  advisor?: string;
}

interface Paper {
  id: string;
  title: string;
  text: string;
  url: string;
  publishedAt: string | null;
  metadata: {
    venue?: string;
    citedByCount?: number;
  };
}

interface PersonData {
  id: string;
  name: string;
  aliases: string[];
  description: string | null;
  whyImportant: string | null;
  avatarUrl: string | null;
  gender?: string | null;
  country?: string | null;
  qid: string;
  status: string;
  completeness: number;
  occupation: string[];
  organization: string[];
  officialLinks: OfficialLink[];
  topics: string[];
  topicRanks: Record<string, number> | null;
  cards: Card[];
  personRoles?: PersonRole[];
  relations?: Relation[];
  sourceTypeCounts?: Record<string, number>;
  quotes?: Quote[] | null;
  products?: Product[] | null;
  education?: Education[] | null;
  currentTitle?: string | null;
  papers?: Paper[];
}

interface PersonPageClientProps {
  person: PersonData;
}

// 状态徽章组件
function StatusBadge({ status, completeness }: { status: string; completeness: number }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: '待处理', color: 'bg-gray-100 text-gray-600' },
    building: { label: '构建中', color: 'bg-blue-100 text-blue-600' },
    ready: { label: '已就绪', color: 'bg-green-100 text-green-600' },
    partial: { label: '部分完成', color: 'bg-yellow-100 text-yellow-600' },
    error: { label: '错误', color: 'bg-red-100 text-red-600' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
      {completeness > 0 && completeness < 100 && (
        <span className="text-xs text-gray-400">{completeness}%</span>
      )}
    </div>
  );
}

export default function PersonPageClient({ person }: PersonPageClientProps) {
  // 记录页面访问
  useEffect(() => {
    const recordView = async () => {
      try {
        await fetch(`/api/person/${person.id}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        // 静默失败
      }
    };
    recordView();
  }, [person.id]);

  // 获取论文数据（从 sourceTypeCounts）
  const videoCount = person.sourceTypeCounts?.youtube || 0;

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            {/* 返回按钮 */}
            <Link
              href="/"
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">返回</span>
            </Link>

            {/* 状态 */}
            <StatusBadge status={person.status} completeness={person.completeness} />
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* 1. 人物头部 - 整合可折叠履历 */}
        <PersonHeader
          person={{
            name: person.name,
            aliases: person.aliases,
            avatarUrl: person.avatarUrl,
            gender: person.gender,
            country: person.country,
            occupation: person.occupation,
            organization: person.organization,
            officialLinks: person.officialLinks,
            currentTitle: person.currentTitle,
            topics: person.topics,
            education: person.education,
            personRoles: person.personRoles,
          }}
        />

        {/* 2. 为什么值得关注 + 代表语录 */}
        {person.whyImportant && (
          <CoreContribution
            content={person.whyImportant}
            quotes={person.quotes}
          />
        )}

        {/* 3. 代表作品（产品/论文/话题贡献） */}
        <FeaturedWorks
          products={person.products}
          papers={person.papers}
          topics={person.topics}
          topicRanks={person.topicRanks}
        />

        {/* 4. 视频内容 */}
        <VideoSection
          personId={person.id}
          videoCount={videoCount}
        />

        {/* 5. 关联人物 */}
        {person.relations && person.relations.length > 0 && (
          <RelatedPeople relations={person.relations} />
        )}

        {/* 6. 更多内容 - X/GitHub/播客等 */}
        <ContentTabs
          personId={person.id}
          cards={person.cards}
          sourceTypeCounts={person.sourceTypeCounts || {}}
          officialLinks={person.officialLinks}
        />
      </main>
    </div>
  );
}

// 兼容旧的命名导出
export { PersonPageClient };
