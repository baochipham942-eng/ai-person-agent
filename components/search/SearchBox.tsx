'use client';

import { useState, useCallback } from 'react';
import { Input, Button, List, Avatar, Tag, Message, Spin, Empty } from '@arco-design/web-react';
import { IconSearch, IconPlus } from '@arco-design/web-react/icon';

interface SearchResult {
    id?: string;
    qid: string;
    name?: string;
    label?: string;
    description: string;
    avatarUrl?: string;
    status?: string;
    aliases?: string[];
}

interface SearchResponse {
    sessionId: string;
    hit: boolean;
    source: 'local' | 'wikidata';
    results?: SearchResult[];
    candidates?: SearchResult[];
}

interface SearchBoxProps {
    onPersonSelected?: (personId: string) => void;
}

export function SearchBox({ onPersonSelected }: SearchBoxProps) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
    const [confirmingQid, setConfirmingQid] = useState<string | null>(null);

    const handleSearch = useCallback(async () => {
        const effectiveQuery = query.trim() || 'sam altman';

        setLoading(true);
        setSearchResponse(null);

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: effectiveQuery }),
            });

            if (!response.ok) {
                throw new Error('搜索失败');
            }

            const data = await response.json();
            setSearchResponse(data);

            if (data.hit && data.results?.length === 1) {
                // 如果只有一个本地结果，直接跳转
                onPersonSelected?.(data.results[0].id);
            }
        } catch (error) {
            Message.error('搜索失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    }, [query, onPersonSelected]);

    const handleConfirmPerson = useCallback(async (qid: string) => {
        if (!searchResponse?.sessionId) return;

        setConfirmingQid(qid);

        try {
            const response = await fetch('/api/person', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: searchResponse.sessionId,
                    qid,
                }),
            });

            if (!response.ok) {
                throw new Error('创建失败');
            }

            const data = await response.json();
            Message.success(data.isNew ? '人物已添加！' : '已找到现有记录');
            onPersonSelected?.(data.personId);
        } catch (error) {
            Message.error('创建失败，请稍后重试');
        } finally {
            setConfirmingQid(null);
        }
    }, [searchResponse, onPersonSelected]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const renderResults = () => {
        if (!searchResponse) return null;

        const items = searchResponse.hit
            ? searchResponse.results || []
            : searchResponse.candidates || [];

        if (items.length === 0) {
            return <Empty description="未找到相关人物" />;
        }

        return (
            <div className="mt-4">
                {!searchResponse.hit && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                        <IconSearch className="mr-2" />
                        本地未收录，以下是 Wikidata 搜索结果，点击添加：
                    </div>
                )}

                <List
                    dataSource={items}
                    render={(item: SearchResult) => (
                        <List.Item
                            key={item.qid}
                            className="hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                            onClick={() => {
                                if (searchResponse.hit && item.id) {
                                    onPersonSelected?.(item.id);
                                }
                            }}
                            actions={
                                !searchResponse.hit
                                    ? [
                                        <Button
                                            key="add"
                                            type="primary"
                                            size="small"
                                            icon={<IconPlus />}
                                            loading={confirmingQid === item.qid}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleConfirmPerson(item.qid);
                                            }}
                                        >
                                            添加
                                        </Button>,
                                    ]
                                    : undefined
                            }
                        >
                            <List.Item.Meta
                                avatar={
                                    <Avatar size={48} className="bg-blue-100 text-blue-600">
                                        {item.avatarUrl ? (
                                            <img src={item.avatarUrl} alt={item.name || item.label} />
                                        ) : (
                                            (item.name || item.label || '?')[0]
                                        )}
                                    </Avatar>
                                }
                                title={
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{item.name || item.label}</span>
                                        {item.status && (
                                            <Tag size="small" color={item.status === 'ready' ? 'green' : 'orange'}>
                                                {item.status === 'ready' ? '已收录' : '收集中'}
                                            </Tag>
                                        )}
                                    </div>
                                }
                                description={
                                    <div className="text-gray-500 text-sm">
                                        {item.description || '暂无描述'}
                                        {item.aliases && item.aliases.length > 0 && (
                                            <div className="mt-1 text-xs text-gray-400">
                                                别名：{item.aliases.slice(0, 3).join('、')}
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            </div>
        );
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="flex gap-2">
                <Input
                    size="large"
                    placeholder="sam altman"
                    value={query}
                    onChange={setQuery}
                    onKeyDown={handleKeyDown}
                    prefix={<IconSearch />}
                    className="flex-1"
                    allowClear
                />
                <Button
                    type="primary"
                    size="large"
                    onClick={handleSearch}
                    loading={loading}
                >
                    搜索
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Spin size={32} tip="搜索中..." />
                </div>
            ) : (
                renderResults()
            )}
        </div>
    );
}
