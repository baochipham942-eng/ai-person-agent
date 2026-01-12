'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  PersonHeader,
  CoreContribution,
  FeaturedWorks,
  VideoSection,
  CourseSection,
  RelatedPeople,
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
  advisorId?: string;
  advisorName?: string;
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
  org?: string;
  year?: string | number;
  description: string;
  url?: string;
  icon?: string;
  logo?: string;        // 产品 Logo URL
  category?: string;    // 产品类别: AI Model, Platform, Tool, Framework, Service
  stats?: {
    users?: string;     // 用户数: "10M+", "1B+"
    revenue?: string;   // 营收: "$1B ARR"
    valuation?: string; // 估值
    downloads?: string; // 下载量
  };
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

interface TopicDetail {
  topic: string;
  rank: number;
  description?: string;
  quote?: { text: string; source: string; url?: string };
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
  topicDetails?: TopicDetail[] | null;
  cards: Card[];
  personRoles?: PersonRole[];
  relations?: Relation[];
  sourceTypeCounts?: Record<string, number>;
  quotes?: Quote[] | null;
  products?: Product[] | null;
  education?: Education[] | null;
  currentTitle?: string | null;
  papers?: Paper[];
  courseCount?: number;
}

interface PersonPageClientProps {
  person: PersonData;
}

// 状态徽章组件
function StatusBadge({ status, completeness }: { status: string; completeness: number }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: '待处理', color: 'bg-stone-100 text-stone-600 border border-stone-200' },
    building: { label: '构建中', color: 'bg-orange-50 text-orange-600 border border-orange-100' },
    ready: { label: '已就绪', color: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
    partial: { label: '部分完成', color: 'bg-amber-50 text-amber-600 border border-amber-100' },
    error: { label: '错误', color: 'bg-red-50 text-red-600 border border-red-100' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
      {completeness > 0 && completeness < 100 && (
        <span className="text-xs text-stone-400">{completeness}%</span>
      )}
    </div>
  );
}

export default function PersonPageClient({ person }: PersonPageClientProps) {
  const searchParams = useSearchParams();

  // 从 URL 读取 section 和 highlight 参数
  const urlSection = searchParams.get('section'); // 'topics' | 'role' | etc.
  const urlHighlight = searchParams.get('highlight'); // 具体的标签名

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
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* 顶部导航 - 玻璃拟态 */}
      <header className="glass-header border-b border-subtle sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            {/* 返回按钮 */}
            <Link
              href="/"
              className="flex items-center gap-1.5 text-stone-600 hover:text-orange-600 transition-colors"
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
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

        {/* 3. 代表作品（代表产品/开源项目/核心论文/话题贡献/学习卡片/博客/播客） */}
        <FeaturedWorks
          products={person.products}
          papers={person.papers}
          topics={person.topics}
          topicRanks={person.topicRanks}
          topicDetails={person.topicDetails}
          personId={person.id}
          initialTab={urlSection === 'topics' ? 'topics' : undefined}
          highlightTopic={urlSection === 'topics' ? urlHighlight : undefined}
          cards={person.cards}
          podcastCount={person.sourceTypeCounts?.podcast || 0}
        />

        {/* 4. 视频内容 */}
        <VideoSection
          personId={person.id}
          videoCount={videoCount}
        />

        {/* 5. 课程 */}
        <CourseSection
          personId={person.id}
          courseCount={person.courseCount || 0}
        />

        {/* 6. 关联人物 */}
        {person.relations && person.relations.length > 0 && (
          <RelatedPeople relations={person.relations} />
        )}
      </main>
    </div>
  );
}

// 兼容旧的命名导出
export { PersonPageClient };
