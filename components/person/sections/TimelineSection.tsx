'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getTimelineRoleCategory } from '@/lib/person-role-kind';

interface PersonRole {
  id: string;
  role: string;
  roleZh: string | null;
  startDate?: string | null;
  endDate?: string | null;
  organizationName: string;
  organizationNameZh: string | null;
  organizationType: string;
  advisorId?: string | null;
  advisorName?: string | null;
}

interface TimelineSectionProps {
  personRoles: PersonRole[];
  qid?: string;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  } catch {
    return dateStr;
  }
}

function formatYear(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年`;
  } catch {
    return dateStr;
  }
}

// 判断是否为实习经历
const INTERN_KEYWORDS = ['实习', 'intern', 'internship'];

function isInternRole(roleTitle: string): boolean {
  const lower = roleTitle?.toLowerCase() || '';
  return INTERN_KEYWORDS.some(k => lower.includes(k));
}

function calculateDuration(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return '';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const months = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years > 0 && remainingMonths > 0) {
    return `${years}年${remainingMonths}个月`;
  } else if (years > 0) {
    return `${years}年`;
  } else if (remainingMonths > 0) {
    return `${remainingMonths}个月`;
  }
  return '';
}

const RoleItem = ({ role, isFirst }: { role: PersonRole; isFirst: boolean }) => {
  const [iconFailed, setIconFailed] = useState(false);
  const orgName = role.organizationNameZh || role.organizationName;
  const roleTitle = role.roleZh || role.role;
  const isIntern = isInternRole(roleTitle);
  const fallbackInitial = (orgName || role.organizationName || '?').trim().charAt(0).toUpperCase();

  // 实习经历没有结束时间时，只显示年份；其他经历显示"至今"
  const hasNoEndDate = !role.endDate;
  // 只有第一行才计算持续时间（涉及"至今"）
  const duration = (isIntern && hasNoEndDate) ? '' : (isFirst ? calculateDuration(role.startDate, role.endDate) : (role.endDate ? calculateDuration(role.startDate, role.endDate) : ''));

  // 使用 Google Favicon API 获取机构图标
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(role.organizationName.replace(/\s+/g, '').toLowerCase())}.com&sz=32`;

  // 格式化时间显示
  const renderTimeRange = () => {
    if (!role.startDate) return null;

    // 实习经历没有结束时间：只显示开始年份
    if (isIntern && hasNoEndDate) {
      return <>{formatYear(role.startDate)} (实习)</>;
    }

    // 非第一行且没有结束日期：不显示"至今"，只显示开始时间或不显示时间
    if (!isFirst && hasNoEndDate) {
      // 数据不完整，只显示开始年份
      return <>{formatYear(role.startDate)}</>;
    }

    // 正常显示时间范围
    return (
      <>
        {formatDate(role.startDate)}
        {' - '}
        {role.endDate ? formatDate(role.endDate) : '至今'}
        {duration && ` · ${duration}`}
      </>
    );
  };

  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* 机构图标 */}
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {iconFailed ? (
          <span className="text-xs font-semibold text-gray-500">{fallbackInitial}</span>
        ) : (
          <Image
            src={faviconUrl}
            alt=""
            width={20}
            height={20}
            unoptimized
            className="w-5 h-5"
            onError={() => setIconFailed(true)}
          />
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">{roleTitle}</div>
        <div className="text-sm text-gray-600">{orgName}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {renderTimeRange()}
        </div>
        {/* 导师链接 */}
        {role.advisorId && role.advisorName && (
          <Link
            href={`/person/${role.advisorId}`}
            className="inline-flex items-center gap-1 mt-1.5 text-xs text-purple-600 hover:text-purple-700 hover:underline"
          >
            <span>👨‍🏫</span>
            <span>师从 {role.advisorName}</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export function TimelineSection({ personRoles, qid }: TimelineSectionProps) {
  if (!personRoles || personRoles.length === 0) {
    return (
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-blue-600">⏳</span>
          履历
        </h2>
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📄</div>
          <div>暂无履历信息</div>
          {qid && (
            <a
              href={`https://www.wikidata.org/wiki/${qid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              在 Wikidata 查看
            </a>
          )}
        </div>
      </section>
    );
  }

  // 分类角色
  const categorized = personRoles.reduce((acc, role) => {
    const category = getTimelineRoleCategory(role);
    if (!acc[category]) acc[category] = [];
    acc[category].push(role);
    return acc;
  }, {} as Record<string, PersonRole[]>);

  // 按开始时间排序（最新的在前）
  Object.values(categorized).forEach(roles => {
    roles.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });
  });

  const sections = [
    { key: 'career', title: '职业经历', icon: '💼', roles: categorized.career || [] },
    { key: 'investment', title: '投资经历', icon: '💰', roles: categorized.investment || [] },
    { key: 'affiliation', title: '顾问/董事/项目', icon: '🤝', roles: categorized.affiliation || [] },
    { key: 'education', title: '教育背景', icon: '🎓', roles: categorized.education || [] },
  ];

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-blue-600">⏳</span>
        履历
      </h2>

      <div className="space-y-6">
        {sections.map(section => {
          if (section.roles.length === 0) return null;

          return (
            <div key={section.key}>
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </h3>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {section.roles.map((role, index) => (
                    <RoleItem key={role.id} role={role} isFirst={index === 0} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
