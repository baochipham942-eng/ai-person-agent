'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { PersonCard } from './PersonCard';

interface Person {
    id: string;
    name: string;
    avatarUrl: string | null;
    occupation: string[];
    description: string | null;
    whyImportant: string | null;
    status: string;
}

interface PaginationInfo {
    total: number;
    hasMore: boolean;
}

export function PersonRecommendationList() {
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, hasMore: true });

    // Ref for intersection observer sentinel
    const sentinelRef = useRef<HTMLDivElement>(null);

    async function fetchPeople(pageNum: number, isLoadMore = false) {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        try {
            const response = await fetch(`/api/person/recommendations?page=${pageNum}&limit=10`);
            if (!response.ok) {
                throw new Error('Failed to fetch recommendations');
            }
            const result = await response.json();

            if (isLoadMore) {
                setPeople(prev => [...prev, ...result.data]);
            } else {
                setPeople(result.data);
            }

            setPagination({
                total: result.pagination.total,
                hasMore: result.pagination.hasMore
            });
        } catch (err) {
            console.error(err);
            setError('无法加载推荐人物');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }

    useEffect(() => {
        fetchPeople(1);
    }, []);

    // Handle load more
    const handleLoadMore = useCallback(() => {
        if (!loadingMore && pagination.hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchPeople(nextPage, true);
        }
    }, [loadingMore, pagination.hasMore, page]);

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && pagination.hasMore && !loadingMore && !loading) {
                    handleLoadMore();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [handleLoadMore, pagination.hasMore, loadingMore, loading]);

    if (loading) {
        return (
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-bold text-gray-900">推荐人物</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-gray-100 rounded-xl h-48"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || (people.length === 0 && !loading)) {
        return null;
    }

    return (
        <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-gray-900">推荐人物</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    共 {pagination.total} 人
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {people.map((person) => (
                    <PersonCard key={person.id} person={person} />
                ))}
            </div>

            {/* Sentinel for infinite scroll */}
            {pagination.hasMore && (
                <div ref={sentinelRef} className="mt-8 h-16 flex items-center justify-center">
                    {loadingMore && (
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    )}
                </div>
            )}
        </div>
    );
}
