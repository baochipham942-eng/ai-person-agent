import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { searchWikidata } from '@/lib/datasources/wikidata';
import { auth } from '@/auth';

/**
 * POST /api/search
 * 搜索人物（先查本地库，未命中则查 Wikidata）
 */
export async function POST(request: NextRequest) {
    try {
        // Safely get session - may fail if AUTH_SECRET is missing or other auth issues
        let session = null;
        try {
            session = await auth();
        } catch (authError) {
            console.warn('Auth check failed (guest access):', authError);
            // Continue without session for guest users
        }

        const body = await request.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { error: '请输入搜索关键词' },
                { status: 400 }
            );
        }

        const searchQuery = name.trim();

        const userId = session?.user?.id;

        // 1. 先查本地数据库（模糊匹配 name 和 aliases）
        const localResults = await prisma.people.findMany({
            where: {
                OR: [
                    { name: { contains: searchQuery, mode: 'insensitive' } },
                    { aliases: { has: searchQuery } },
                ],
            },
            select: {
                id: true,
                name: true,
                qid: true,
                description: true,
                avatarUrl: true,
                status: true,
                updatedAt: true,
            },
            take: 10,
        });

        // 如果本地有结果，直接返回
        if (localResults.length > 0) {
            // 创建搜索会话记录
            const searchSession = await prisma.searchSession.create({
                data: {
                    userId: userId, // Pass undefined/null explicitly handled by Prisma
                    query: searchQuery,
                    localHits: localResults.map(p => p.id),
                    status: 'confirmed',
                },
            });

            return NextResponse.json({
                sessionId: searchSession.id,
                hit: true,
                source: 'local',
                results: localResults.map(p => ({
                    id: p.id,
                    qid: p.qid,
                    name: p.name,
                    description: p.description,
                    avatarUrl: p.avatarUrl,
                    status: p.status,
                    lastUpdated: p.updatedAt.toISOString(),
                })),
            });
        }

        // 2. 本地未命中，查询 Wikidata
        const wikidataResults = await searchWikidata(searchQuery, 10).catch(wdError => {
            console.error('Wikidata search failed:', wdError);
            return [];
        });

        // 创建搜索会话记录
        const searchSession = await prisma.searchSession.create({
            data: {
                userId: userId,
                query: searchQuery,
                localHits: [],
                wikidataCandidates: wikidataResults as any,
                status: 'pending',
            },
        });

        return NextResponse.json({
            sessionId: searchSession.id,
            hit: false,
            source: 'wikidata',
            candidates: wikidataResults.map(w => ({
                qid: w.id,
                label: w.label,
                description: w.description,
                aliases: w.aliases || [],
            })),
        });
    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json(
            { error: '搜索服务暂时不可用', details: error instanceof Error ? error.message : String(error) }, // Return details for debugging
            { status: 500 }
        );
    }
}
