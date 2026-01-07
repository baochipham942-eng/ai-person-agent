'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Tag, Empty, Tooltip, Button } from '@arco-design/web-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

interface RawPoolItem {
    id: string;
    sourceType: string;
    url: string;
    title: string;
    text: string;
    publishedAt?: string;
    metadata?: Record<string, unknown>;
}

interface PersonData {
    id: string;
    name: string;
    description: string | null;
    whyImportant: string | null;
    avatarUrl: string | null;
    gender?: string | null;      // "male", "female", "other", "unknown"
    country?: string | null;     // ISO 3166-1 alpha-2, e.g. "CN", "US"
    qid: string;
    status: string;
    completeness: number;
    occupation: string[];
    organization: string[];
    aliases: string[];
    officialLinks: any[];
    rawPoolItems: RawPoolItem[];
    sourceTypeCounts?: Record<string, number>; // 各类型数量统计
    cards: {
        id: string;
        type: string;
        title: string;
        content: string;
        tags: string[];
        importance: number;
    }[];
    personRoles?: {
        id: string;
        role: string;
        roleZh: string | null;
        startDate?: string;
        endDate?: string;
        organizationName: string;
        organizationNameZh: string | null;
        organizationType: string;
    }[];
}

interface PersonPageClientProps {
    person: PersonData;
}

// Helper: 获取首选显示姓名 (中国人用中文，外国人用英文)
function getDisplayName(person: PersonData): string {
    const isChinese = person.country === 'CN' || /[\u4e00-\u9fa5]/.test(person.name);
    const sanitize = (str: string) => {
        const parts = str.trim().split(/\s+/);
        if (parts.length === 2 && parts[0] === parts[1]) {
            return parts[0];
        }
        return str;
    };

    if (isChinese) {
        // 中国人物: 返回中文名 (如果 name 是英文开头，尝试从 aliases 找中文)
        const chineseAlias = person.aliases?.find(a => /[\u4e00-\u9fa5]/.test(a));
        return sanitize(chineseAlias || person.name);
    } else {
        // 外国人物: 返回英文名 (如果 name 是中文，尝试从 aliases 找英文)
        if (/[\u4e00-\u9fa5]/.test(person.name)) {
            const englishAlias = person.aliases?.find(a => /^[A-Za-z\s\-\.]+$/.test(a));
            return sanitize(englishAlias || person.name);
        }
        return sanitize(person.name);
    }
}

// Helper: 国家 ISO code -> 国旗 emoji
function getCountryFlag(countryCode: string | null | undefined): string {
    if (!countryCode) return '';
    const code = countryCode.toUpperCase();
    // 转换为国旗 emoji (ISO 3166-1 alpha-2 -> Regional Indicator Symbols)
    const codePoints = [...code].map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

// Helper: 性别中文显示
function getGenderLabel(gender: string | null | undefined): string {
    if (!gender) return '';
    switch (gender.toLowerCase()) {
        case 'male': return '男';
        case 'female': return '女';
        case 'other': return '其他';
        default: return '';
    }
}

export function PersonPageClient({ person }: PersonPageClientProps) {
    const [avatarError, setAvatarError] = useState(false);
    const [activeTab, setActiveTab] = useState('timeline');

    // 计算显示姓名
    const displayName = getDisplayName(person);

    // 懒加载状态
    const [loadedItems, setLoadedItems] = useState<Record<string, RawPoolItem[]>>({});
    const [loadingTab, setLoadingTab] = useState<string | null>(null);

    // 懒加载 rawPoolItems
    const loadItemsForType = useCallback(async (type: string) => {
        if (loadedItems[type] || loadingTab === type) return;

        setLoadingTab(type);
        try {
            const res = await fetch(`/api/person/${person.id}/items?type=${type}&limit=50`);
            if (res.ok) {
                const data = await res.json();
                setLoadedItems(prev => ({ ...prev, [type]: data.data }));
            }
        } catch (e) {
            console.error('Failed to load items:', e);
        } finally {
            setLoadingTab(null);
        }
    }, [person.id, loadedItems, loadingTab]);

    // 当切换到需要 rawPoolItems 的 tab 时加载数据
    useEffect(() => {
        const tabsNeedingItems = ['x', 'youtube', 'podcast', 'github', 'article', 'paper'];
        if (tabsNeedingItems.includes(activeTab) && !loadedItems[activeTab]) {
            loadItemsForType(activeTab);
        }
    }, [activeTab, loadedItems, loadItemsForType]);

    // 处理 Wikidata 图片 URL（添加代理或降级处理）
    const getAvatarUrl = () => {
        if (!person.avatarUrl || avatarError) return null;
        // Wikidata 图片有时需要通过代理访问
        return person.avatarUrl;
    };

    const avatarUrl = getAvatarUrl();

    // 按类型分组卡片
    const cardsByType = person.cards?.reduce((acc, card) => {
        if (!acc[card.type]) acc[card.type] = [];
        acc[card.type].push(card);
        return acc;
    }, {} as Record<string, typeof person.cards>) || {};

    // 按来源分组原始内容 (合并初始数据和懒加载数据)
    const allItems = [...(person.rawPoolItems || []), ...Object.values(loadedItems).flat()];
    const itemsBySource = allItems.reduce((acc, item) => {
        if (!acc[item.sourceType]) acc[item.sourceType] = [];
        // 避免重复
        if (!acc[item.sourceType].some(i => i.id === item.id)) {
            acc[item.sourceType].push(item);
        }
        return acc;
    }, {} as Record<string, RawPoolItem[]>);

    // 使用 sourceTypeCounts 作为 tab badge（如果没有加载数据的话）
    const getTabCount = (type: string) => {
        if (itemsBySource[type]?.length) return itemsBySource[type].length;
        return person.sourceTypeCounts?.[type] || 0;
    };

    // Deduplicate cards by title or content hash
    const uniqueCards = person.cards?.reduce((acc, card) => {
        const key = card.title + (card.content?.slice(0, 20) || '');
        if (!acc.some(c => (c.title + (c.content?.slice(0, 20) || '')) === key)) {
            acc.push(card);
        }
        return acc;
    }, [] as typeof person.cards) || [];

    // Re-group cards by type based on uniqueCards
    const uniqueCardsByType = uniqueCards.reduce((acc, card) => {
        if (!acc[card.type]) acc[card.type] = [];
        acc[card.type].push(card);
        return acc;
    }, {} as Record<string, typeof person.cards>) || {};

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <span>←</span> <span>返回</span>
                    </Link>
                    <StatusBadge status={person.status} completeness={person.completeness} />
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-6">
                {/* 人物卡片 - 简洁版 */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <div className="flex items-start gap-5">
                        {/* 头像 */}
                        <div className="shrink-0">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={person.name}
                                    className="w-24 h-24 rounded-full object-cover bg-gray-100 ring-4 ring-white shadow-lg"
                                    onError={() => setAvatarError(true)}
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-white shadow-lg">
                                    {person.name[0]}
                                </div>
                            )}
                        </div>

                        {/* 基本信息 */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-gray-900 truncate flex items-center gap-2">
                                    {displayName}
                                    {/* 性别和国家标签 */}
                                    {(person.gender || person.country) && (
                                        <span className="text-base font-normal text-gray-400 flex items-center gap-1">
                                            {person.country && <span title={person.country}>{getCountryFlag(person.country)}</span>}
                                            {person.gender && <span className="text-sm">{getGenderLabel(person.gender)}</span>}
                                        </span>
                                    )}
                                </h1>
                                <a
                                    href={`https://www.wikidata.org/wiki/${person.qid}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-gray-400 hover:text-blue-500"
                                >
                                    {person.qid}
                                </a>
                            </div>

                            {person.description && (
                                <p className="text-gray-600 text-sm mb-2 line-clamp-2">{person.description}</p>
                            )}

                            {/* Why Important - 为什么重要 */}
                            {person.whyImportant && (
                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                                    <p className="text-sm text-amber-800"><span className="font-medium">✨ AI贡献：</span>{person.whyImportant}</p>
                                </div>
                            )}

                            {/* 标签行 */}
                            <div className="flex flex-wrap gap-1.5">
                                {person.occupation.map((occ, i) => (
                                    <Tag key={`occ-${i}`} size="small" color="arcoblue">{occ}</Tag>
                                ))}
                                {person.organization.map((org, i) => (
                                    <Tag key={`org-${i}`} size="small" color="gray">{org}</Tag>
                                ))}
                            </div>
                        </div>

                        {/* 右侧快捷链接 -> 官方认证矩阵 */}
                        <div className="shrink-0">
                            <VerifiedMatrix links={person.officialLinks} />
                        </div>
                    </div>
                </div>

                {/* 分类内容区 - Tabs */}
                {/* 分类内容区 - Tabs */}
                {/* 分类内容区 - Tabs */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Custom Tabs Header */}
                    <div className="flex border-b border-gray-100 overflow-x-auto hide-scrollbar">
                        {/* Timeline Tab */}
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === 'timeline'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span>⏳</span>
                            <span>时光轴</span>
                        </button>


                        <button
                            onClick={() => setActiveTab('cards')}
                            className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === 'cards'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span>💡</span>
                            <span>学习卡片 ({uniqueCards.length})</span>
                        </button>

                        {/* X/Twitter */}
                        {getTabCount('x') > 0 && (
                            <button
                                onClick={() => setActiveTab('x')}
                                className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === 'x'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <XIcon />
                                <span>X/Twitter</span>
                                <span className="text-sm opacity-80">({getTabCount('x')})</span>
                                {loadingTab === 'x' && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>}
                            </button>
                        )}

                        {/* YouTube */}
                        {getTabCount('youtube') > 0 && (
                            <button
                                onClick={() => setActiveTab('youtube')}
                                className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === 'youtube'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <YoutubeIcon className="w-5 h-5" />
                                <span>YouTube 视频</span>
                                <span className="text-sm opacity-80">({getTabCount('youtube')})</span>
                                {loadingTab === 'youtube' && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>}
                            </button>
                        )}

                        {/* Podcast */}
                        {getTabCount('podcast') > 0 && (
                            <button
                                onClick={() => setActiveTab('podcast')}
                                className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === 'podcast'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <MicrophoneIcon className="w-5 h-5" />
                                <span>播客</span>
                                <span className="text-sm opacity-80">({getTabCount('podcast')})</span>
                                {loadingTab === 'podcast' && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>}
                            </button>
                        )}

                        {/* GitHub Projects Tab */}
                        {(getTabCount('github') > 0 || person.officialLinks.some(l => l.type === 'github')) && (
                            <button
                                onClick={() => setActiveTab('github')}
                                className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === 'github'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <GithubIcon className="w-5 h-5" />
                                <span>开源项目</span>
                                {getTabCount('github') > 0 && (
                                    <span className="text-sm opacity-80">({getTabCount('github')})</span>
                                )}
                                {loadingTab === 'github' && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>}
                            </button>
                        )}

                        {/* Remaining Sources (OpenAlex, Exa, etc.) */}
                        {Object.keys(itemsBySource)
                            .filter(s => !['x', 'youtube', 'podcast', 'github', 'career', 'biography'].includes(s.toLowerCase()))
                            .map(source => (
                                <button
                                    key={source}
                                    onClick={() => setActiveTab(source)}
                                    className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === source
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {getSourceIconComponent(source)}
                                    <span>{getSourceName(source)}</span>
                                    <span className="text-sm opacity-80">({itemsBySource[source].length})</span>
                                </button>
                            ))}
                    </div>

                    {/* Tab Content */}
                    <div>
                        {/* Timeline Tab Content (Now Career Only) */}
                        {activeTab === 'timeline' && (
                            <TimelineView personRoles={person.personRoles || []} qid={person.qid} />
                        )}

                        {/* 学习卡片 Tab */}
                        {activeTab === 'cards' && (
                            <div className="p-6">
                                {uniqueCards.length > 0 ? (
                                    <div className="space-y-6">
                                        {Object.entries(uniqueCardsByType).map(([type, cards]) => (
                                            <div key={type}>
                                                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                                                    <span>{getCardIcon(type)}</span>
                                                    <span>{getCardTypeName(type)}</span>
                                                    <span className="text-gray-400">({cards.length})</span>
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {cards.map((card) => (
                                                        <CardItem key={card.id} card={card} />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Empty description={
                                        person.status === 'building'
                                            ? '正在生成学习卡片...'
                                            : '暂无学习卡片'
                                    } />
                                )}
                            </div>
                        )}

                        {/* GitHub Projects Tab */}
                        {activeTab === 'github' && (() => {
                            const githubItems = itemsBySource['github'] || [];
                            const githubLink = person.officialLinks.find(l => l.type === 'github');

                            if (githubItems.length > 0) {
                                return (
                                    <div className="p-6">
                                        <GithubRepoList items={githubItems} />
                                    </div>
                                );
                            }

                            return githubLink ? (
                                <div className="p-6">
                                    <div className="text-center py-12 text-gray-400">
                                        <p>正在后台同步开源项目...</p>
                                        <p className="text-sm mt-2">请稍后刷新 (或检查后台任务)</p>
                                    </div>
                                </div>
                            ) : null;
                        })()}

                        {/* Rest Sources Content - Exclude github since it has dedicated GithubRepoList */}
                        {Object.keys(itemsBySource)
                            .filter(source => source !== 'github') // GitHub has dedicated tab, don't render again
                            .map(source => (
                                activeTab === source && (
                                    <div key={source} className="p-6">
                                        {/* X Profile Header - 展示用户简介 */}
                                        {source === 'x' && (() => {
                                            const xLink = person.officialLinks.find(l =>
                                                l.platform === 'twitter' ||
                                                l.type === 'twitter' ||
                                                l.type === 'x' ||
                                                (l.url && (l.url.includes('twitter.com') || l.url.includes('x.com')))
                                            );
                                            if (xLink && (xLink.bio || xLink.displayName)) {
                                                const username = xLink.url?.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/)?.[1];
                                                return (
                                                    <div className="mb-6 p-4 bg-gradient-to-r from-slate-900 to-blue-900 rounded-xl text-white">
                                                        <div className="flex items-start gap-4">
                                                            {/* X Logo */}
                                                            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-xl font-bold shrink-0">
                                                                𝕏
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                {/* Display Name & Handle */}
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-bold text-lg truncate">
                                                                        {xLink.displayName || person.name}
                                                                    </span>
                                                                    {username && (
                                                                        <span className="text-blue-300 text-sm">@{username}</span>
                                                                    )}
                                                                </div>
                                                                {/* Bio */}
                                                                {xLink.bio && (
                                                                    <p className="text-gray-200 text-sm leading-relaxed mb-2">
                                                                        {xLink.bio}
                                                                    </p>
                                                                )}
                                                                {/* Stats & Link */}
                                                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                                                    {xLink.followers && (
                                                                        <span>{xLink.followers.toLocaleString()} 关注者</span>
                                                                    )}
                                                                    <a
                                                                        href={xLink.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-300 hover:text-blue-200 hover:underline"
                                                                    >
                                                                        查看主页 →
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                        <SourceList source={source} items={itemsBySource[source]} />
                                    </div>
                                )
                            ))}
                    </div>
                </div>
            </main >
        </div >
    );
}

// 卡片项组件
function CardItem({ card }: { card: PersonData['cards'][0] }) {
    return (
        <div className={`p-4 rounded-lg border-l-4 ${getCardBorderColor(card.type)} bg-gray-50 hover:bg-gray-100 transition-colors`}>
            <h4 className="font-medium text-gray-900 mb-2">{card.title}</h4>
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{card.content}</p>
            {card.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {card.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs text-gray-400">#{tag}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

// 资料列表组件 - 按类型展示 (Infinite Scroll)
function SourceList({ source, items }: { source: string; items: PersonData['rawPoolItems'] }) {
    const [displayCount, setDisplayCount] = useState(10);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setDisplayCount(prev => Math.min(prev + 10, items.length));
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [items.length]);

    const displayItems = items.slice(0, displayCount);
    const hasMore = displayCount < items.length;

    return (
        <div className="space-y-3">
            {source === 'openalex' ? (
                // 学术论文展示
                <div className="grid grid-cols-1 gap-3">
                    {displayItems.map((item) => (
                        <PaperItem key={item.id} item={item} />
                    ))}
                </div>
            ) : source === 'podcast' ? (
                // 播客展示
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayItems.map((item) => (
                        <PodcastItem key={item.id} item={item} />
                    ))}
                </div>
            ) : source === 'youtube' ? (
                // YouTube 视频展示
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayItems.map((item) => (
                        <VideoItem key={item.id} item={item} />
                    ))}
                </div>
            ) : source === 'x' ? (
                // X/Twitter 展示 - 过滤掉无效内容后展示
                <div className="space-y-3">
                    {displayItems
                        .filter(item => {
                            // 过滤掉文本过短的推文（可能是只有图片/视频的内容，Grok 无法获取）
                            const text = item.text || item.title || '';
                            return text.length >= 15 && !text.trim().match(/^https?:\/\/\S+$/);
                        })
                        .map((item) => (
                            <XPostItem key={item.id} item={item} />
                        ))}
                </div>
            ) : (
                // EXA 网页内容展示
                <div className="grid grid-cols-1 gap-3">
                    {displayItems.map((item) => (
                        <ArticleItem key={item.id} item={item} />
                    ))}
                </div>
            )}

            {hasMore && (
                <div ref={observerTarget} className="h-16 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
}

// 文章项组件 (EXA)
function ArticleItem({ item }: { item: PersonData['rawPoolItems'][0] }) {
    const metadata = item.metadata as { isOfficial?: boolean } | null;
    return (
        <div className="p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-2 mb-2">
                <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-gray-900 hover:text-blue-600 line-clamp-2 flex-1"
                >
                    {item.title}
                </a>
                <OfficialBadge isOfficial={metadata?.isOfficial} />
            </div>
            <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{item.text?.slice(0, 300)}</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                <span>🔗 {new URL(item.url).hostname}</span>
            </div>
        </div>
    );
}

// 论文项组件 (OpenAlex)
function PaperItem({ item }: { item: PersonData['rawPoolItems'][0] }) {
    const metadata = item.metadata as { citationCount?: number; venue?: string; authors?: string[]; isOfficial?: boolean } | null;
    return (
        <div className="p-4 bg-gradient-to-r from-green-50 to-white border border-green-100 rounded-xl">
            <div className="flex items-start justify-between gap-2 mb-2">
                <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-gray-900 hover:text-green-600 line-clamp-2 flex-1"
                >
                    📄 {item.title}
                </a>
                <OfficialBadge isOfficial={metadata?.isOfficial} />
            </div>
            {item.text && (
                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-2">{item.text}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                {metadata?.venue && <span className="bg-green-100 px-2 py-0.5 rounded">{metadata.venue}</span>}
                {metadata?.citationCount != null && metadata.citationCount > 0 && (
                    <span>📚 被引用 {metadata.citationCount} 次</span>
                )}
            </div>
        </div>
    );
}

// Video Item Component (YouTube)
function VideoItem({ item }: { item: PersonData['rawPoolItems'][0] }) {
    const metadata = item.metadata as { thumbnailUrl?: string; isOfficial?: boolean } | null;

    // Fallback logic for thumbnail
    const getThumbnail = () => {
        if (metadata?.thumbnailUrl) return metadata.thumbnailUrl;
        try {
            // Robust Regex for YouTube Video ID
            const match = item.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
            const videoId = match ? match[1] : null;

            if (videoId) {
                return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            }
        } catch (e) {
            // ignore
        }
        return null;
    };

    const thumbUrl = getThumbnail();

    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all"
        >
            {thumbUrl ? (
                <div className="aspect-video bg-gray-100 relative">
                    <img src={thumbUrl} alt={item.title} className="w-full h-full object-cover" />
                    {metadata?.isOfficial && (
                        <span className="absolute top-2 right-2 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded shadow">官方</span>
                    )}
                </div>
            ) : (
                <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                    <span className="text-3xl">▶️</span>
                </div>
            )}
            <div className="p-3">
                <h4 className="font-medium text-gray-900 line-clamp-2 text-sm">{item.title}</h4>
            </div>
        </a>
    );
}

// X 推文项组件
function XPostItem({ item }: { item: PersonData['rawPoolItems'][0] }) {
    const metadata = item.metadata as { author?: string; postId?: string; isOfficial?: boolean } | null;

    // Get display text - prefer text, fallback to title
    const displayText = item.text || item.title || '';

    // Check if it's a URL-only post (no actual content)
    const isUrlOnly = displayText.trim().match(/^https?:\/\/\S+$/);

    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100 rounded-xl hover:shadow-md hover:border-blue-200 transition-all"
        >
            <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">𝕏</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {metadata?.author && (
                            <span className="text-sm font-medium text-blue-600">@{metadata.author}</span>
                        )}
                        {metadata?.isOfficial && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">官方</span>
                        )}
                    </div>
                    <div className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap break-words">
                        {isUrlOnly ? (
                            <span className="text-gray-500">🔗 分享了一个链接</span>
                        ) : (
                            displayText.slice(0, 500) + (displayText.length > 500 ? '...' : '')
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span>点击查看原帖</span>
                        <span>→</span>
                    </div>
                </div>
            </div>
        </a>
    );
}


function StatusBadge({ status, completeness }: { status: string; completeness: number }) {
    const config: Record<string, { color: string; text: string; icon: string }> = {
        pending: { color: 'orange', text: '等待收集', icon: '⏳' },
        building: { color: 'blue', text: '收集中', icon: '🔄' },
        ready: { color: 'green', text: '已就绪', icon: '✓' },
        partial: { color: 'gold', text: '部分完成', icon: '⚠' },
        error: { color: 'red', text: '收集失败', icon: '✗' },
    };

    const cfg = config[status] || config.pending;

    return (
        <div className="flex items-center gap-1.5 text-sm">
            <span>{cfg.icon}</span>
            <Tag size="small" color={cfg.color as any}>
                {cfg.text} {completeness > 0 && `${completeness}%`}
            </Tag>
        </div>
    );
}

// 官方标识组件
function OfficialBadge({ isOfficial }: { isOfficial?: boolean }) {
    if (isOfficial === undefined) return null;

    if (isOfficial) {
        return (
            <span className="shrink-0 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span>✓</span> 官方
            </span>
        );
    }
    return (
        <span className="shrink-0 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
            引用
        </span>
    );
}

function LinkIcon({ type }: { type: string }) {
    if (type === 'github') return <GithubIcon />;
    if (type === 'youtube') return <YoutubeIcon />;
    if (type === 'x') return <XIcon />;
    if (type === 'website' || type === 'blog') return <WebsiteIcon />;
    if (type === 'linkedin') return <LinkedinIcon />;
    return <span>🔗</span>;
}

function getSourceColor(sourceType: string): string {
    const colors: Record<string, string> = {
        exa: 'purple',
        x: 'blue',
        youtube: 'red',
        openalex: 'green',
        wikidata: 'orange',
        podcast: 'indigo',
    };
    return colors[sourceType] || 'gray';
}

function getSourceIcon(sourceType: string): string {
    const icons: Record<string, string> = {
        exa: '🌐',
        x: '𝕏',
        youtube: '▶️',
        openalex: '📚',
        wikidata: '📖',
        podcast: '🎙️',
    };
    return icons[sourceType] || '📄';
}



function getSourceName(sourceType: string): string {
    const names: Record<string, string> = {
        exa: '网页文章',
        x: 'X/Twitter',
        youtube: 'YouTube 视频',
        openalex: '学术论文',
        biography: '生平经历',
        wikidata: 'Wikidata',
        podcast: '播客',
    };
    return names[sourceType] || sourceType.toUpperCase();
}

function getCardIcon(type: string): string {
    const icons: Record<string, string> = {
        insight: '💡',
        quote: '💬',
        story: '📖',
        method: '🔧',
        fact: '📊',
    };
    return icons[type] || '📄';
}

function getCardBorderColor(type: string): string {
    const colors: Record<string, string> = {
        insight: 'border-blue-400',
        quote: 'border-purple-400',
        story: 'border-orange-400',
        method: 'border-green-400',
        fact: 'border-cyan-400',
    };
    return colors[type] || 'border-gray-300';
}

function getCardTypeName(type: string): string {
    const names: Record<string, string> = {
        insight: '核心洞见',
        quote: '金句',
        story: '故事',
        method: '方法论',
        fact: '事实',
    };
    return names[type] || type;
}

// GitHub 仓库列表组件
function GithubRepoList({ items }: { items: PersonData['rawPoolItems'] }) {
    if (!items || items.length === 0) {
        return <Empty description="暂无公开项目" />;
    }

    // Sort by stars (assuming metadata.stars is available, otherwise default sort)
    // Adjust logic to extract stars from metadata
    const sortedItems = [...items].sort((a, b) => {
        const starsA = (a.metadata as any)?.stars || 0;
        const starsB = (b.metadata as any)?.stars || 0;
        return starsB - starsA;
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedItems.map((repo) => {
                const metadata = repo.metadata as any || {};
                return (
                    <a
                        key={repo.id}
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all group"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-gray-900 group-hover:text-blue-600 truncate pr-2 flex-1">
                                {repo.title}
                            </h4>
                            {metadata.language && (
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200 whitespace-nowrap ml-2">
                                    {metadata.language}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3 h-10">
                            {repo.text || '暂无描述'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            {metadata.stars !== undefined && (
                                <span className="flex items-center gap-1">
                                    ⭐ {metadata.stars > 1000 ? `${(metadata.stars / 1000).toFixed(1)}k` : metadata.stars}
                                </span>
                            )}
                            {metadata.forks !== undefined && (
                                <span className="flex items-center gap-1">
                                    🍴 {metadata.forks > 1000 ? `${(metadata.forks / 1000).toFixed(1)}k` : metadata.forks}
                                </span>
                            )}
                            {repo.publishedAt && (
                                <span>
                                    📅 {new Date(repo.publishedAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </a>
                );
            })}
        </div>
    );
}

// 播客项组件 (iTunes)
function PodcastItem({ item }: { item: PersonData['rawPoolItems'][0] }) {
    const metadata = item.metadata as { thumbnailUrl?: string; categories?: string[]; isOfficial?: boolean } | null;
    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-4 bg-white border border-indigo-100 rounded-xl hover:shadow-md transition-all group"
        >
            {metadata?.thumbnailUrl && (
                <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <img src={metadata.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 line-clamp-2 group-hover:text-indigo-600">{item.title}</h4>
                    <OfficialBadge isOfficial={metadata?.isOfficial} />
                </div>
                <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                    <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">iTunes 播客</span>
                    <span>👤 {item.text}</span>
                </div>
                {metadata?.categories && metadata.categories.length > 0 && (
                    <div className="flex gap-1 mt-2 overflow-hidden">
                        {metadata.categories.slice(0, 2).map(cat => (
                            <span key={cat} className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded-md border border-gray-100 whitespace-nowrap">
                                {cat}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </a>
    );
}

function getSourceIconComponent(sourceType: string) {
    const icons: Record<string, any> = {
        exa: <WebsiteIcon className="w-5 h-5" />,
        x: <XIcon className="w-5 h-5" />,
        youtube: <YoutubeIcon className="w-5 h-5" />,
        openalex: <BookIcon className="w-5 h-5" />,
        wikidata: <BookIcon className="w-5 h-5" />,
        podcast: <MicrophoneIcon className="w-5 h-5" />,
    };
    return icons[sourceType] || <span className="w-5 h-5 flex items-center justify-center">📄</span>;
}

function GithubIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 16 16" width="1.2em" height="1.2em" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
    );
}

function YoutubeIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="#FF0000" className={className} xmlns="http://www.w3.org/2000/svg">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    );
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

function MicrophoneIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
    );
}

function WebsiteIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" className={className} stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeWidth="2" />
        </svg>
    );
}

function BookIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" className={className} stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeWidth="2" strokeLinecap="round" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function LinkedinIcon({ className }: { className?: string }) {
    return <span className={className}>💼</span>;
}

// 官方认证矩阵组件 - Hover 展示模式
function VerifiedMatrix({ links }: { links: any[] }) {
    const [showAll, setShowAll] = useState(false);

    // Filter out hidden types (scholar, company) as requested
    const visibleLinks = links.filter(link =>
        link.type !== 'scholar' && link.type !== 'company'
    );

    if (visibleLinks.length === 0) return null;

    // 优先展示的类型和顺序
    const priority = ['website', 'twitter', 'github', 'youtube', 'linkedin'];
    const sortedLinks = [...visibleLinks].sort((a, b) => {
        const ia = priority.indexOf(a.type || '');
        const ib = priority.indexOf(b.type || '');
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    // 默认显示 blog/website，其他 hover 展示
    const primaryLink = sortedLinks.find(l => l.type === 'website' || l.type === 'blog');
    const otherLinks = sortedLinks.filter(l => l.type !== 'website' && l.type !== 'blog');

    const renderLinkItem = (link: any, i: number) => (
        <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all
                ${getLinkStyle(link.type)}
            `}
        >
            <span className="text-lg flex items-center justify-center">
                <LinkIcon type={link.type} />
            </span>
            <span className="text-xs font-medium">
                {getLinkLabel(link)}
            </span>
            <span className="text-[#10B981] ml-0.5">✓</span>
        </a>
    );

    return (
        <div
            className="relative flex flex-col items-end gap-2"
            onMouseEnter={() => setShowAll(true)}
            onMouseLeave={() => setShowAll(false)}
        >
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">OFFICIAL CHANNELS</span>
            <div className="flex flex-wrap justify-end gap-2 max-w-[300px]">
                {/* 默认只显示 blog/website */}
                {primaryLink && renderLinkItem(primaryLink, 0)}
                {/* 没有 blog 时显示第一个链接 */}
                {!primaryLink && sortedLinks[0] && renderLinkItem(sortedLinks[0], 0)}
                {/* 提示还有更多 */}
                {otherLinks.length > 0 && !showAll && (
                    <span className="text-xs text-gray-400 px-2 py-1">+{otherLinks.length} more</span>
                )}
            </div>
            {/* Hover 时展示所有链接 */}
            {showAll && otherLinks.length > 0 && (
                <div className="absolute top-full right-0 mt-2 bg-white shadow-xl rounded-xl p-3 z-20 border border-gray-100 min-w-[200px]">
                    <div className="flex flex-wrap gap-2">
                        {otherLinks.map((link, i) => renderLinkItem(link, i + 1))}
                    </div>
                </div>
            )}
        </div>
    );
}

function getLinkStyle(type: string) {
    switch (type || '') {
        case 'twitter': return 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-500';
        case 'github': return 'bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-400 hover:bg-gray-100';
        case 'youtube': return 'bg-red-50 border-red-100 text-red-700 hover:border-red-300 hover:bg-red-100';
        case 'website': return 'bg-blue-50 border-blue-100 text-blue-700 hover:border-blue-300 hover:bg-blue-100';
        default: return 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-300';
    }
}

function getLinkLabel(link: any) {
    const linkType = link.type;
    if (!linkType) return link.title || 'Link';

    if (linkType === 'website') return 'Website';
    if (linkType === 'scholar') return 'Scholar';
    if (linkType === 'twitter') return link.handle || 'Twitter';
    // 截断过长的 handle
    if (link.handle) return link.handle.length > 12 ? link.handle.slice(0, 10) + '...' : link.handle;
    return linkType.charAt(0).toUpperCase() + linkType.slice(1);
}

// 时光轴视图组件 - LinkedIn 风格 (分区展示)
function TimelineView({ personRoles, qid }: { personRoles: NonNullable<PersonData['personRoles']>; qid: string }) {
    if (!personRoles || personRoles.length === 0) return (
        <Empty description="暂无生涯数据" icon={<div className="text-4xl">🎓</div>} />
    );

    // 投资类关键词 (role 名称)
    const investmentKeywords = ['partner', 'investor', 'venture', 'capital', 'fund', 'angel', 'board member', 'advisor', 'co-chair', 'chairman'];
    // 投资机构名称 (某些人对这些机构是投资人而非工作经历，如 Elon Musk 对 OpenAI)
    const investmentOrganizations = ['openai foundation', 'y combinator'];
    // 教育类关键词
    const educationKeywords = ['university', 'college', 'school', 'academy', 'institute'];

    // 分类逻辑
    const categorizeRole = (role: typeof personRoles[0]) => {
        const orgName = (role.organizationName || '').toLowerCase();
        const orgType = (role.organizationType || '').toLowerCase();
        const roleName = (role.role || '').toLowerCase();

        // 1. 教育
        if (educationKeywords.some(k => orgType.includes(k) || orgName.includes(k))) {
            return 'education';
        }
        // 2. 投资 (根据 role 名称、组织名称、或特定投资机构)
        if (investmentKeywords.some(k => roleName.includes(k)) ||
            orgName.includes('capital') || orgName.includes('ventures') || orgName.includes('fund') ||
            investmentOrganizations.some(org => orgName.includes(org))) {
            return 'investment';
        }
        // 3. 默认为职业/创业
        return 'career';
    };

    const careerRoles = personRoles.filter(r => categorizeRole(r) === 'career').sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
    });

    const investmentRoles = personRoles.filter(r => categorizeRole(r) === 'investment').sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
    });

    const educationRoles = personRoles.filter(r => categorizeRole(r) === 'education').sort((a, b) => {
        const dateA = a.endDate ? (a.endDate === 'present' ? Date.now() : new Date(a.endDate).getTime()) : 0;
        const dateB = b.endDate ? (b.endDate === 'present' ? Date.now() : new Date(b.endDate).getTime()) : 0;
        return dateB - dateA;
    });

    return (
        <div className="p-4 md:p-6 space-y-8">
            {/* 职业经历 Section */}
            {careerRoles.length > 0 && (
                <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>💼</span> 职业经历
                    </h3>
                    <div className="space-y-4">
                        {careerRoles.map(role => (
                            <LinkedInRoleItem key={role.id} role={role} type="work" />
                        ))}
                    </div>
                </section>
            )}

            {/* 投资经历 Section */}
            {investmentRoles.length > 0 && (
                <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>💰</span> 投资经历
                    </h3>
                    <div className="space-y-4">
                        {investmentRoles.map(role => (
                            <LinkedInRoleItem key={role.id} role={role} type="work" />
                        ))}
                    </div>
                </section>
            )}

            {/* 教育经历 Section */}
            {educationRoles.length > 0 && (
                <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>🎓</span> 教育经历
                    </h3>
                    <div className="space-y-4">
                        {educationRoles.map(role => (
                            <LinkedInRoleItem key={role.id} role={role} type="education" />
                        ))}
                    </div>
                </section>
            )}

            {careerRoles.length === 0 && investmentRoles.length === 0 && educationRoles.length === 0 && (
                <Empty description="暂无详细经历数据" />
            )}
        </div>
    );
}

// LinkedIn 风格单项组件
function LinkedInRoleItem({ role, type }: { role: NonNullable<PersonData['personRoles']>[0]; type: 'work' | 'education' }) {
    const [logoError, setLogoError] = useState(false);

    const orgName = role.organizationNameZh || role.organizationName;
    const roleTitle = role.roleZh || role.role;

    // Get initials for fallback (max 2 chars)
    const getInitials = () => {
        const name = role.organizationName || '';
        const words = name.split(/\s+/).filter(w => w.length > 0);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Infer domain from organization name
    const getDomain = () => {
        const name = (role.organizationName || '').toLowerCase().trim();
        // Known domain mappings
        const domainMap: Record<string, string> = {
            // Companies
            'openai': 'openai.com',
            'y combinator': 'ycombinator.com',
            'loopt': 'loopt.com',
            'reddit': 'reddit.com',
            'tools for humanity': 'worldcoin.org',
            'hydrazine capital': 'hydrazinecapital.com',
            'google': 'google.com',
            'microsoft': 'microsoft.com',
            'meta': 'meta.com',
            'facebook': 'facebook.com',
            'amazon': 'amazon.com',
            'apple': 'apple.com',
            'tesla': 'tesla.com',
            'spacex': 'spacex.com',
            'nvidia': 'nvidia.com',
            'anthropic': 'anthropic.com',
            'deepmind': 'deepmind.com',
            'bytedance': 'bytedance.com',
            'tencent': 'tencent.com',
            'alibaba': 'alibaba.com',
            'baidu': 'baidu.com',
            // Universities
            'stanford university': 'stanford.edu',
            'stanford': 'stanford.edu',
            'mit': 'mit.edu',
            'massachusetts institute of technology': 'mit.edu',
            'harvard university': 'harvard.edu',
            'harvard': 'harvard.edu',
            'berkeley': 'berkeley.edu',
            'uc berkeley': 'berkeley.edu',
            'princeton': 'princeton.edu',
            'caltech': 'caltech.edu',
            'carnegie mellon': 'cmu.edu',
            'cmu': 'cmu.edu',
            'columbia': 'columbia.edu',
            'yale': 'yale.edu',
            'cornell': 'cornell.edu',
            'oxford': 'ox.ac.uk',
            'cambridge': 'cam.ac.uk',
            'tsinghua': 'tsinghua.edu.cn',
            'peking university': 'pku.edu.cn',
            'fudan': 'fudan.edu.cn',
            'zhejiang university': 'zju.edu.cn',
        };

        for (const [key, domain] of Object.entries(domainMap)) {
            if (name === key || name.includes(key)) {
                return domain;
            }
        }

        return null;
    };

    const domain = getDomain();
    // Use Google Favicon API (no CORS issues)
    const logoUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;

    // Date & Duration Calculation
    const start = role.startDate ? new Date(role.startDate) : null;
    let end = role.endDate ? (role.endDate === 'present' ? new Date() : new Date(role.endDate)) : null;
    if (role.endDate === 'Present') end = new Date();

    const startStr = start ? start.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' }) : '';
    const endStr = role.endDate === 'present' || !role.endDate ? '至今' : (end ? end.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' }) : '');

    let durationStr = '';
    if (start && end) {
        let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (months < 0) months = 0;

        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;

        const yStr = years > 0 ? `${years} 年` : '';
        const mStr = remainingMonths > 0 ? `${remainingMonths} 个月` : '';
        if (yStr || mStr) durationStr = ` · ${yStr} ${mStr}`;
    }

    return (
        <div className="flex gap-4 group">
            {/* Organization Logo */}
            <div className="shrink-0 pt-1">
                <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center border border-gray-200 overflow-hidden">
                    {logoUrl && !logoError ? (
                        <img
                            src={logoUrl}
                            alt={orgName}
                            className="w-10 h-10 object-contain"
                            onError={() => setLogoError(true)}
                        />
                    ) : (
                        <span className="text-lg font-bold text-gray-500">{getInitials()}</span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 pb-4 border-b border-gray-100 group-last:border-0">
                <h4 className="font-bold text-gray-900 text-base leading-snug">
                    {roleTitle}
                </h4>
                <div className="text-sm text-gray-700 mt-0.5">
                    {orgName}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                    <span>
                        {startStr && endStr ? `${startStr} - ${endStr}` : (startStr || endStr)}
                    </span>
                    <span className="text-gray-400">{durationStr}</span>
                </div>
            </div>
        </div>
    );
}

function renderTimelineCard(item: any, metadata: any) {
    const sourceType = item.sourceType;

    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block -ml-2 p-2 rounded transition-colors hover:bg-gray-50"
        >
            <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-sm text-gray-900 leading-snug hover:text-blue-600 transition-colors">
                    {item.title}
                </h4>

                {metadata.isOfficial && (
                    <span className="shrink-0 text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100">
                        OFFICIAL
                    </span>
                )}
            </div>

            {/* Content Logic: Hide generic technical words */}
            {item.text &&
                !item.text.startsWith('http') &&
                !item.text.startsWith('//') &&
                item.text.toLowerCase() !== 'career' &&
                item.text.toLowerCase() !== 'education' &&
                item.text.toLowerCase() !== 'career_position' &&
                item.text.toLowerCase() !== 'award' && (
                    <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">
                        {item.text}
                    </p>
                )}

            {/* 特定元数据展示 */}
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                {sourceType === 'github' && metadata.stars && (
                    <span className="flex items-center gap-1">⭐ {metadata.stars}</span>
                )}
                {sourceType === 'openalex' && metadata.citationCount > 0 && (
                    <span className="flex items-center gap-1">📚 {metadata.citationCount}</span>
                )}
            </div>
        </a>
    );
}
