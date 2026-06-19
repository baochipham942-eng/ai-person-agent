'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CompareReportLauncher } from '@/components/compare/CompareReportLauncher';
import { CompareButton } from '@/components/common/CompareButton';
import { FollowButton } from '@/components/common/FollowButton';
import {
  PersonHeader,
  CoreContribution,
  InfluenceBreakdown,
  RecentActivity,
  FeaturedWorks,
  VideoSection,
  CourseSection,
  RelatedPeople,
  RelationshipGraphExplorer,
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
  sourceUrl?: string | null;
  importance: number;
}

interface PersonRole {
  id: string;
  role: string;
  roleZh: string | null;
  startDate?: string | null;
  endDate?: string | null;
  source?: string | null;
  confidence?: number | null;
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
  currentTitle?: string | null;
  organization: string[];
}

interface Relation {
  id: string;
  relationType: string;
  description?: string | null;
  reviewStatus?: string | null;
  evidenceUrl?: string | null;
  evidenceNote?: string | null;
  confidence?: number | null;
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
  updatedAt: string;
  gender?: string | null;
  country?: string | null;
  qid: string;
  status: string;
  completeness: number;
  occupation: string[];
  organization: string[];
  influenceScore: number;
  citationCount: number;
  hIndex: number;
  githubStars: number;
  weeklyViewCount: number;
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
  initialSection?: 'topics' | null;
  highlightTopic?: string | null;
}

function SourceSummary({ person }: { person: PersonData }) {
  const [isOpen, setIsOpen] = useState(false);
  const sourceTypeTotal = Object.values(person.sourceTypeCounts || {}).reduce((sum, count) => sum + count, 0);
  const cardSources = person.cards.filter(card => card.sourceUrl).length;
  const relationSources = (person.relations || []).filter(relation => relation.evidenceUrl).length;
  const sourceCount = sourceTypeTotal + cardSources + relationSources;
  const updatedAt = formatDate(person.updatedAt);
  const sourceRows = buildSourceRows(person.sourceTypeCounts || {}, cardSources, relationSources);

  return (
    <div className="relative flex flex-wrap items-center justify-end gap-2 text-xs text-stone-500">
      <span>更新 {updatedAt}</span>
      <span className="hidden h-3 w-px bg-stone-200 sm:block" />
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className="rounded-md px-1 py-0.5 font-medium text-stone-600 hover:bg-orange-50 hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        aria-expanded={isOpen}
      >
        {sourceCount > 0 ? `${sourceCount} 条资料来源` : '资料来源整理中'}
      </button>
      <span className="hidden h-3 w-px bg-stone-200 sm:block" />
      <span className="text-orange-600">自动整理，重要事实请看来源</span>

      {isOpen && (
        <div className="absolute right-0 top-7 z-50 w-72 rounded-xl border border-stone-200 bg-white p-3 text-left shadow-lg">
          <div className="mb-2 text-xs font-medium text-stone-900">资料来源构成</div>
          <div className="space-y-1.5">
            {sourceRows.length > 0 ? sourceRows.map(row => (
              <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-stone-500">{row.label}</span>
                <span className="font-medium text-stone-900">{row.count}</span>
              </div>
            )) : (
              <div className="text-xs text-stone-500">来源仍在整理中</div>
            )}
          </div>
          <div className="mt-3 border-t border-stone-100 pt-2 text-[11px] leading-5 text-stone-400">
            自动整理只作为导航线索，关键事实以原始来源为准。
          </div>
        </div>
      )}
    </div>
  );
}

export default function PersonPageClient({ person, initialSection, highlightTopic }: PersonPageClientProps) {
  const activeInitialSection = initialSection ?? null;
  const activeHighlightTopic = activeInitialSection === 'topics' ? highlightTopic ?? null : null;

  // 记录页面访问
  useEffect(() => {
    const recordView = async () => {
      try {
        await fetch(`/api/person/${person.id}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        // 静默失败
      }
    };
    recordView();
  }, [person.id]);

  // 获取各类内容数量（从 sourceTypeCounts）
  const videoCount = person.sourceTypeCounts?.youtube || 0;
  const githubCount = person.sourceTypeCounts?.github || 0;
  const blogCount = person.sourceTypeCounts?.exa || 0;
  const xCount = person.sourceTypeCounts?.x || 0;

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

            <div className="flex min-w-0 items-center gap-2">
              <SourceSummary person={person} />
              <FollowButton
                size="sm"
                target={{
                  type: 'person',
                  id: person.id,
                  label: person.name,
                  href: `/person/${person.id}`,
                }}
              />
              <CompareReportLauncher
                initialPeople={[{
                  id: person.id,
                  name: person.name,
                  avatarUrl: person.avatarUrl,
                  currentTitle: person.currentTitle || person.organization[0] || null,
                  topics: person.topics,
                }]}
                triggerLabel="生成报告"
                triggerClassName="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-600"
              />
              <CompareButton target={{ id: person.id, name: person.name }} size="sm" />
            </div>
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

        <InfluenceBreakdown
          influenceScore={person.influenceScore}
          citationCount={person.citationCount}
          hIndex={person.hIndex}
          githubStars={person.githubStars}
          weeklyViewCount={person.weeklyViewCount}
          sourceTypeCounts={person.sourceTypeCounts || {}}
          products={person.products}
          personRoles={person.personRoles}
          cards={person.cards}
        />

        <RecentActivity personId={person.id} />

        {/* 4. 代表作品（代表成果/开源项目/核心论文/话题贡献/学习卡片/博客/X动态/播客） */}
        <FeaturedWorks
          products={person.products}
          papers={person.papers}
          topics={person.topics}
          topicRanks={person.topicRanks}
          topicDetails={person.topicDetails}
          personId={person.id}
          initialTab={activeInitialSection === 'topics' ? 'topics' : undefined}
          highlightTopic={activeInitialSection === 'topics' ? activeHighlightTopic : undefined}
          cards={person.cards}
          podcastCount={person.sourceTypeCounts?.podcast || 0}
          githubCount={githubCount}
          blogCount={blogCount}
          xCount={xCount}
        />

        {/* 5. 视频内容 */}
        <VideoSection
          personId={person.id}
          videoCount={videoCount}
        />

        {/* 6. 课程 */}
        <CourseSection
          personId={person.id}
          courseCount={person.courseCount || 0}
        />

        {/* 7. 关联人物 */}
        {person.relations && person.relations.length > 0 && (
          <RelatedPeople centerName={person.name} relations={person.relations} />
        )}

        <RelationshipGraphExplorer personId={person.id} />
      </main>
    </div>
  );
}

// 兼容旧的命名导出
export { PersonPageClient };

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return '最近';
  }
}

function buildSourceRows(
  sourceTypeCounts: Record<string, number>,
  cardSources: number,
  relationSources: number
): Array<{ label: string; count: number }> {
  const labels: Record<string, string> = {
    openalex: '论文与学术资料',
    github: 'GitHub 与开源项目',
    youtube: '视频与访谈',
    exa: '网页与媒体资料',
    podcast: '播客',
    x: '社交平台',
    career: '履历来源',
  };
  const rows = Object.entries(sourceTypeCounts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({ label: labels[type] || type, count }));

  if (cardSources > 0) rows.push({ label: '学习卡片来源', count: cardSources });
  if (relationSources > 0) rows.push({ label: '关系证据来源', count: relationSources });

  return rows.sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}
