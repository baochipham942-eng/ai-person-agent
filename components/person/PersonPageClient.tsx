'use client';

import { useState } from 'react';
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
                            className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none ${activeTab === 'cards'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            💡 学习卡片 ({person.cards?.length || 0})
                        </button>

                        {Object.keys(itemsBySource)
                            .sort((a, b) => {
                                const order = ['x', 'youtube', 'podcast', 'openalex', 'exa'];
                                return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
                            })
                            .map(source => (
                                <button
                                    key={source}
                                    onClick={() => setActiveTab(source)}
                                    className={`px-6 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none flex items-center gap-2 ${activeTab === source
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <span>{getSourceIcon(source)}</span>
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

// 资料列表组件 - 按类型展示
function SourceList({ source, items }: { source: string; items: PersonData['rawPoolItems'] }) {
    const [showAll, setShowAll] = useState(false);
    const displayItems = showAll ? items : items.slice(0, 8);

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

            {items.length > 8 && !showAll && (
                <div className="text-center pt-2">
                    <Button type="text" size="small" onClick={() => setShowAll(true)}>
                        展开全部 ({items.length} 条)
                    </Button>
                </div>
            )}
        </div>
    );
}

// 文章项组件 (EXA)
function ArticleItem({ item }: { item: PersonData['rawPoolItems'][0] }) {
    return (
        <div className="p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all">
            <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-900 hover:text-blue-600 line-clamp-2 mb-2 block"
            >
                {item.title}
            </a>
            <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{item.text?.slice(0, 300)}</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                <span>🔗 {new URL(item.url).hostname}</span>
            </div>
        </div>
    );
}

// 论文项组件 (OpenAlex)
function PaperItem({ item }: { item: PersonData['rawPoolItems'][0] }) {
    const metadata = item.metadata as { citationCount?: number; venue?: string; authors?: string[] } | null;
    return (
        <div className="p-4 bg-gradient-to-r from-green-50 to-white border border-green-100 rounded-xl">
            <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-900 hover:text-green-600 line-clamp-2 mb-2 block"
            >
                📄 {item.title}
            </a>
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
    const metadata = item.metadata as { thumbnailUrl?: string } | null;
    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all"
        >
            {metadata?.thumbnailUrl && (
                <div className="aspect-video bg-gray-100">
                    <img src={metadata.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
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
    const metadata = item.metadata as { author?: string; postId?: string } | null;

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
                    {metadata?.author && (
                        <span className="text-sm font-medium text-blue-600">@{metadata.author}</span>
                    )}
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

function LinkIcon({ type }: { type: string }) {
    const icons: Record<string, string> = {
        x: '𝕏',
        youtube: '▶️',
        website: '🌐',
        linkedin: '💼',
        github: '🐙',
        blog: '📝',
    };
    return <span>{icons[type] || '🔗'}</span>;
}

function getSourceColor(sourceType: string): string {
    const colors: Record<string, string> = {
        exa: 'purple',
        x: 'blue',
        youtube: 'red',
        openalex: 'green',
        wikidata: 'orange',
        podcast: 'magenta',
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

// 播客项组件 (iTunes)
function PodcastItem({ item }: { item: PersonData['rawPoolItems'][0] }) {
    const metadata = item.metadata as { thumbnailUrl?: string; categories?: string[] } | null;
    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-4 bg-white border border-pink-100 rounded-xl hover:shadow-md transition-all group"
        >
            {metadata?.thumbnailUrl && (
                <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <img src={metadata.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 line-clamp-2 group-hover:text-pink-600 mb-1">{item.title}</h4>
                <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                    <span className="bg-pink-50 text-pink-600 px-2 py-0.5 rounded">Podcast</span>
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
