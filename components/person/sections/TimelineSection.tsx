'use client';

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

interface TimelineSectionProps {
  personRoles: PersonRole[];
  qid?: string;
}

// 分类关键词
const EDUCATION_KEYWORDS = ['university', 'college', 'school', 'academy', 'institute'];
const INVESTMENT_KEYWORDS = ['partner', 'investor', 'venture', 'capital', 'fund', 'angel', 'board member', 'advisor', 'co-chair', 'chairman'];
const INVESTMENT_ORGS = ['y combinator', 'openai foundation'];

function categorizeRole(role: PersonRole): 'career' | 'education' | 'investment' {
  const orgType = role.organizationType?.toLowerCase() || '';
  const orgName = role.organizationName?.toLowerCase() || '';
  const roleTitle = role.role?.toLowerCase() || '';

  // 教育
  if (EDUCATION_KEYWORDS.some(k => orgType.includes(k))) {
    return 'education';
  }

  // 投资
  if (INVESTMENT_KEYWORDS.some(k => roleTitle.includes(k)) ||
      INVESTMENT_ORGS.some(o => orgName.includes(o))) {
    return 'investment';
  }

  return 'career';
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

const RoleItem = ({ role }: { role: PersonRole }) => {
  const orgName = role.organizationNameZh || role.organizationName;
  const roleTitle = role.roleZh || role.role;
  const duration = calculateDuration(role.startDate, role.endDate);

  // 使用 Google Favicon API 获取机构图标
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(role.organizationName.replace(/\s+/g, '').toLowerCase())}.com&sz=32`;

  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* 机构图标 */}
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        <img
          src={faviconUrl}
          alt=""
          className="w-5 h-5"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">{roleTitle}</div>
        <div className="text-sm text-gray-600">{orgName}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {role.startDate && formatDate(role.startDate)}
          {role.startDate && ' - '}
          {role.endDate ? formatDate(role.endDate) : '至今'}
          {duration && ` · ${duration}`}
        </div>
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
    const category = categorizeRole(role);
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
                  {section.roles.map(role => (
                    <RoleItem key={role.id} role={role} />
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
