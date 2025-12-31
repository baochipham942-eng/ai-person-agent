'use client';

import { useEffect, useState } from 'react';
import { PersonCard } from './PersonCard';

interface Person {
    id: string;
    name: string;
    avatarUrl: string | null;
    occupation: string[];
    description: string | null;
    status: string;
}

export function PersonRecommendationList() {
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchRecommendations() {
            try {
                const response = await fetch('/api/person/recommendations');
                if (!response.ok) {
                    throw new Error('Failed to fetch recommendations');
                }
                const data = await response.json();
                setPeople(data);
            } catch (err) {
                console.error(err);
                setError('无法加载推荐人物');
            } finally {
                setLoading(false);
            }
        }

        fetchRecommendations();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-gray-100 rounded-xl h-48"></div>
                ))}
            </div>
        );
    }

    if (error || people.length === 0) {
        return null; // Gracefully hide if error or empty
    }

    return (
        <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-gray-900">推荐人物</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {people.length}
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {people.map((person) => (
                    <PersonCard key={person.id} person={person} />
                ))}
            </div>
        </div>
    );
}
