'use client';

import { useState } from 'react';

interface OfficialLink {
  type: string;
  url: string;
  handle?: string;
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

interface Education {
  school: string;
  degree?: string;
  field?: string;
  year?: string;
  advisor?: string;
}

interface PersonHeaderProps {
  person: {
    name: string;
    aliases: string[];
    avatarUrl: string | null;
    gender?: string | null;
    country?: string | null;
    occupation: string[];
    organization: string[];
    officialLinks: OfficialLink[];
    currentTitle?: string | null;
    topics?: string[];
    education?: Education[] | null;
    personRoles?: PersonRole[];
  };
}

// 国旗 emoji 映射
function getCountryFlag(countryCode: string | null | undefined): string {
  if (!countryCode) return '';
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return '';
  const offset = 127397;
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + offset));
}

// 话题颜色映射
const TOPIC_COLORS: Record<string, string> = {
  'RAG': 'bg-purple-500/15 text-purple-700',
  'Agent': 'bg-blue-500/15 text-blue-700',
  '推理': 'bg-green-500/15 text-green-700',
  '多模态': 'bg-orange-500/15 text-orange-700',
  '对齐': 'bg-red-500/15 text-red-700',
  'Scaling': 'bg-cyan-500/15 text-cyan-700',
  '大语言模型': 'bg-indigo-500/15 text-indigo-700',
  'Transformer': 'bg-pink-500/15 text-pink-700',
  '开源': 'bg-emerald-500/15 text-emerald-700',
  'AGI': 'bg-rose-500/15 text-rose-700',
  '强化学习': 'bg-amber-500/15 text-amber-700',
};

function getTopicColor(topic: string): string {
  return TOPIC_COLORS[topic] || 'bg-gray-500/15 text-gray-700';
}

// 链接图标组件
const LinkIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'x':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'github':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'scholar':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" />
        </svg>
      );
    case 'website':
    case 'blog':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'wikipedia':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801-.3-.86l-.381-.048c-.166-.018-.25-.071-.25-.159v-.449l.054-.045c1.595.006 3.307 0 3.307 0l.114.038v.457c0 .094-.078.154-.234.179-.659.088-1.029.233-1.498 1.165l-2.426 4.755.543 1.07 2.948 5.785s.223-.045.322-.045c.232-.001.451.015.615.222.087.112.108.271.032.404-.077.135-.211.217-.386.22-.693.014-1.417.018-2.125.016l-.056-.044v-.437c0-.082.059-.137.176-.162l.336-.045c.401-.023.544-.17.392-.6-.295-.836-1.549-3.229-1.549-3.229l-1.654 3.281c-.111.222-.162.326-.162.434 0 .161.076.242.228.282l.375.061c.153.028.229.089.229.184v.435l-.064.045c-1.469-.005-2.937-.003-4.406.001l-.052-.044v-.455c0-.109.081-.167.243-.185l.378-.046c.577-.064.943-.239 1.189-.628.249-.384 1.519-2.939 2.127-4.108" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
  }
};

// 格式化日期为年份
function formatYear(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).getFullYear().toString();
  } catch {
    return '';
  }
}

export function PersonHeader({ person }: PersonHeaderProps) {
  const [avatarError, setAvatarError] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  // 获取头像 URL
  const getAvatarUrl = () => {
    if (!person.avatarUrl || avatarError) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=3b82f6&color=fff&size=200`;
    }
    if (person.avatarUrl.startsWith('/avatars/')) {
      return person.avatarUrl;
    }
    return person.avatarUrl;
  };

  // 链接排序优先级
  const linkPriority: Record<string, number> = {
    website: 1, blog: 2, x: 3, github: 4, youtube: 5, linkedin: 6, scholar: 7, wikipedia: 8
  };
  const sortedLinks = [...(person.officialLinks || [])].sort(
    (a, b) => (linkPriority[a.type] || 99) - (linkPriority[b.type] || 99)
  );

  // 生成当前职位文本
  const currentTitle = person.currentTitle || (
    person.occupation[0] && person.organization[0]
      ? `${person.occupation[0]} @ ${person.organization[0]}`
      : person.occupation[0] || ''
  );

  // 获取教育背景摘要
  const educationSummary = person.education?.[0];

  // 履历数据（按时间倒序，取最近5条）
  const timelineRoles = (person.personRoles || [])
    .sort((a, b) => {
      const aDate = a.endDate || a.startDate || '9999';
      const bDate = b.endDate || b.startDate || '9999';
      return bDate.localeCompare(aDate);
    })
    .slice(0, 5);

  return (
    <section className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex gap-5">
          {/* 头像 */}
          <div className="flex-shrink-0">
            <img
              src={getAvatarUrl()}
              alt={person.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 ring-gray-100"
              onError={() => setAvatarError(true)}
            />
          </div>

          {/* 基本信息 */}
          <div className="flex-1 min-w-0">
            {/* 名字 + 国家 */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {person.name}
              </h1>
              {person.country && (
                <span className="text-lg">{getCountryFlag(person.country)}</span>
              )}
            </div>

            {/* 别名 */}
            {person.aliases.length > 0 && (
              <p className="text-sm text-gray-400 mt-0.5">
                {person.aliases.slice(0, 2).join(' / ')}
              </p>
            )}

            {/* 当前职位 */}
            {currentTitle && (
              <p className="text-sm text-gray-600 mt-1.5">{currentTitle}</p>
            )}

            {/* 话题标签 */}
            {person.topics && person.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {person.topics.slice(0, 4).map((topic, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 text-xs font-medium rounded-md ${getTopicColor(topic)}`}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}

            {/* 快速信息 */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
              {educationSummary && (
                <span className="flex items-center gap-1">
                  <span>🎓</span>
                  <span>{educationSummary.degree} @ {educationSummary.school}</span>
                </span>
              )}
              {person.organization[0] && !currentTitle && (
                <span className="flex items-center gap-1">
                  <span>🏢</span>
                  <span>{person.organization[0]}</span>
                </span>
              )}
            </div>

            {/* 官方链接 */}
            {sortedLinks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {sortedLinks.slice(0, 6).map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 text-xs rounded-md transition-colors"
                  >
                    <LinkIcon type={link.type} />
                    <span className="capitalize">{link.type === 'x' ? 'X' : link.type}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 可折叠履历 */}
        {timelineRoles.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setTimelineExpanded(!timelineExpanded)}
              className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-600 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span>📋</span>
                <span>个人履历</span>
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${timelineExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {timelineExpanded && (
              <div className="mt-2 pl-3 border-l-2 border-gray-100 space-y-2">
                {timelineRoles.map((role, idx) => {
                  const isCurrent = !role.endDate;
                  const startYear = formatYear(role.startDate);
                  const endYear = role.endDate ? formatYear(role.endDate) : 'now';
                  const dateRange = startYear ? `${startYear} - ${endYear}` : '';

                  return (
                    <div
                      key={role.id}
                      className={`relative pl-4 py-1.5 ${idx === 0 ? '' : ''}`}
                    >
                      <div
                        className={`absolute -left-[5px] top-2.5 w-2 h-2 rounded-full ${
                          isCurrent ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm ${isCurrent ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                            {role.roleZh || role.role} @ {role.organizationNameZh || role.organizationName}
                          </span>
                        </div>
                        {dateRange && (
                          <span className="text-xs text-gray-400 whitespace-nowrap">{dateRange}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
