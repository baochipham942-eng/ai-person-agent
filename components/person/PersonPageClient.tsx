'use client';

import { useState, useEffect, useRef } from 'react';
import { Tag, Empty, Tooltip, Button } from '@arco-design/web-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

interface PersonData {
    id: string;
    name: string;
    description: string | null;
    avatarUrl: string | null;
    qid: string;
    status: string;
    completeness: number;
    occupation: string[];
    organization: string[];
    aliases: string[];
    officialLinks: any[];
    rawPoolItems: {
        id: string;
        sourceType: string;
        url: string;
        title: string;
        text: string;
        metadata?: Record<string, unknown>;
    }[];
    cards: {
        id: string;
        type: string;
        title: string;
        content: string;
        tags: string[];
        importance: number;
    }[];
}

interface PersonPageClientProps {
    person: PersonData;
}

export function PersonPageClient({ person }: PersonPageClientProps) {
    const [avatarError, setAvatarError] = useState(false);
    const [activeTab, setActiveTab] = useState('cards');

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

    // 按来源分组原始内容
    const itemsBySource = person.rawPoolItems?.reduce((acc, item) => {
        if (!acc[item.sourceType]) acc[item.sourceType] = [];
        acc[item.sourceType].push(item);
        return acc;
    }, {} as Record<string, typeof person.rawPoolItems>) || {};

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
                                    {person.name}
                                    {person.aliases && person.aliases.length > 0 && (
                                        <span className="text-lg font-normal text-gray-500">
                                            {person.aliases[0]}
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
                                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{person.description}</p>
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

                        {/* 右侧快捷链接 */}
                        <div className="shrink-0 flex gap-2">
                            {person.officialLinks.slice(0, 4).map((link: any, i: number) => (
                                <Tooltip
                                    key={i}
                                    content={
                                        link.type === 'website'
                                            ? 'Blog'
                                            : (link.handle || link.type)
                                    }
                                >
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-lg"
                                    >
                                        <LinkIcon type={link.type} />
                                    </a>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 分类内容区 - Tabs */}
                {/* 分类内容区 - Tabs */}
                {/* 分类内容区 - Tabs */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Custom Tabs Header */}
                    <div className="flex border-b border-gray-100 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('cards')}
                            className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === 'cards'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span>💡</span>
                            <span>学习卡片 ({person.cards?.length || 0})</span>
                        </button>

                        {/* X/Twitter */}
                        {itemsBySource['x']?.length > 0 && (
                            <button
                                onClick={() => setActiveTab('x')}
                                className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === 'x'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <XIcon />
                                <span>X/Twitter</span>
                                <span className="text-sm opacity-80">({itemsBySource['x'].length})</span>
                            </button>
                        )}

                        {/* YouTube */}
                        {itemsBySource['youtube']?.length > 0 && (
                            <button
                                onClick={() => setActiveTab('youtube')}
                                className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === 'youtube'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <YoutubeIcon className="w-5 h-5" />
                                <span>YouTube 视频</span>
                                <span className="text-sm opacity-80">({itemsBySource['youtube'].length})</span>
                            </button>
                        )}

                        {/* Podcast */}
                        {itemsBySource['podcast']?.length > 0 && (
                            <button
                                onClick={() => setActiveTab('podcast')}
                                className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === 'podcast'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <MicrophoneIcon className="w-5 h-5" />
                                <span>播客</span>
                                <span className="text-sm opacity-80">({itemsBySource['podcast'].length})</span>
                            </button>
                        )}

                        {/* GitHub Projects Tab - Render AFTER Podcast */}
                        {person.officialLinks.some(l => l.type === 'github') && (
                            <button
                                onClick={() => setActiveTab('github')}
                                className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === 'github'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <GithubIcon className="w-5 h-5" />
                                <span>开源项目</span>
                            </button>
                        )}

                        {/* Remaining Sources (OpenAlex, Exa, etc.) */}
                        {Object.keys(itemsBySource)
                            .filter(s => !['x', 'youtube', 'podcast'].includes(s))
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
                        {/* 学习卡片 Tab */}
                        {activeTab === 'cards' && (
                            <div className="p-6">
                                {person.cards?.length > 0 ? (
                                    <div className="space-y-6">
                                        {Object.entries(cardsByType).map(([type, cards]) => (
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
                            const githubLink = person.officialLinks.find(l => l.type === 'github');
                            return githubLink ? (
                                <div className="p-6">
                                    <GithubRepoList username={githubLink.handle} />
                                </div>
                            ) : null;
                        })()}

                        {/* 各类资料源 Tab 内容 */}
                        {Object.keys(itemsBySource).map(source => (
                            activeTab === source && (
                                <div key={source} className="p-6">
                                    <SourceList source={source} items={itemsBySource[source]} />
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </main>
        </div>
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
                // X/Twitter 展示 - 每条推文独立展示
                <div className="space-y-3">
                    {displayItems.map((item) => (
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

// 视频项组件 (YouTube)
function VideoItem({ item }: { item: PersonData['rawPoolItems'][0] }) {
    const metadata = item.metadata as { thumbnailUrl?: string; isOfficial?: boolean } | null;
    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all"
        >
            {metadata?.thumbnailUrl && (
                <div className="aspect-video bg-gray-100 relative">
                    <img src={metadata.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                    {metadata?.isOfficial && (
                        <span className="absolute top-2 right-2 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded shadow">官方</span>
                    )}
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
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                        {item.text || item.title}
                    </p>
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
function GithubRepoList({ username }: { username: string }) {
    const [repos, setRepos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/github/repos?username=${username}`)
            .then(res => {
                if (!res.ok) throw new Error('API Error');
                return res.json();
            })
            .then(data => {
                setRepos(data.repos || []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('无法加载开源项目');
                setLoading(false);
            });
    }, [username]);

    if (loading) {
        return (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p>正在从 GitHub 获取开源项目...</p>
            </div>
        );
    }

    if (error) {
        return <Empty description={error} />;
    }

    if (repos.length === 0) {
        return <Empty description="该用户暂无公开项目" />;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repos.map((repo) => (
                <a
                    key={repo.id}
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all group"
                >
                    <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900 group-hover:text-blue-600 truncate pr-2">
                            {repo.name}
                        </h4>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200 whitespace-nowrap">
                            {repo.language || 'Code'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3 h-10">
                        {repo.description || '暂无描述'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            ⭐ {repo.stargazers_count > 1000 ? `${(repo.stargazers_count / 1000).toFixed(1)}k` : repo.stargazers_count}
                        </span>
                        <span className="flex items-center gap-1">
                            🍴 {repo.forks_count > 1000 ? `${(repo.forks_count / 1000).toFixed(1)}k` : repo.forks_count}
                        </span>
                        <span>
                            📅 {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                    </div>
                </a>
            ))}
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
