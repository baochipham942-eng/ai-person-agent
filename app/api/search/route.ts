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
        const searchQueryLower = searchQuery.toLowerCase();

        const userId = session?.user?.id;

        // 1. 先查本地数据库（模糊匹配 name 和 aliases）
        // 使用原生 SQL 支持别名的模糊搜索
        const localResults = await prisma.$queryRaw<Array<{
            id: string;
            name: string;
            qid: string;
            description: string | null;
            avatarUrl: string | null;
            status: string;
            updatedAt: Date;
        }>>`
            SELECT id, name, qid, description, "avatarUrl", status, "updatedAt"
            FROM "People"
            WHERE 
                LOWER(name) LIKE ${'%' + searchQueryLower + '%'}
                OR EXISTS (
                    SELECT 1 FROM unnest(aliases) AS alias 
                    WHERE LOWER(alias) LIKE ${'%' + searchQueryLower + '%'}
                )
            LIMIT 10
        `;

        // 如果本地有结果，直接返回
        if (localResults.length > 0) {
            // 创建搜索会话记录
            const searchSession = await prisma.searchSession.create({
                data: {
                    userId: userId,
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
            { error: '搜索服务暂时不可用', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
