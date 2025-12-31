import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getWikidataEntityWithTranslation } from '@/lib/datasources/wikidata';
import { downloadAndStoreAvatar } from '@/lib/storage/avatarStorage';
import { auth } from '@/auth';
import { inngest } from '@/lib/inngest/client';

/**
 * POST /api/person
 * 确认选择并创建人物记录
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: '请先登录' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { sessionId, qid } = body;

        if (!sessionId || !qid) {
            return NextResponse.json(
                { error: '缺少必要参数' },
                { status: 400 }
            );
        }

        // 1. 验证搜索会话
        const searchSession = await prisma.searchSession.findUnique({
            where: { id: sessionId },
        });

        if (!searchSession) {
            return NextResponse.json(
                { error: '搜索会话不存在' },
                { status: 404 }
            );
        }

        // 2. 检查人物是否已存在
        const existingPerson = await prisma.people.findUnique({
            where: { qid },
        });

        if (existingPerson) {
            // 更新搜索会话
            await prisma.searchSession.update({
                where: { id: sessionId },
                data: {
                    status: 'confirmed',
                    confirmedPersonId: existingPerson.id,
                    resolvedAt: new Date(),
                },
            });

            return NextResponse.json({
                personId: existingPerson.id,
                status: existingPerson.status,
                isNew: false,
                message: '人物已存在',
            });
        }

        // 3. 从 Wikidata 获取实体详情（英文 + 翻译为简体中文）
        console.log(`[Person API] Fetching Wikidata entity: ${qid}`);
        const wikidataEntity = await getWikidataEntityWithTranslation(qid);

        if (!wikidataEntity) {
            return NextResponse.json(
                { error: '无法获取 Wikidata 实体信息' },
                { status: 404 }
            );
        }

        console.log(`[Person API] Got entity: ${wikidataEntity.label}`);

        // 4. 下载并存储头像到本地
        let localAvatarUrl: string | null = null;
        if (wikidataEntity.imageUrl) {
            console.log(`[Person API] Downloading avatar from: ${wikidataEntity.imageUrl}`);
            // 临时使用 qid 作为 personId（还没创建记录）
            localAvatarUrl = await downloadAndStoreAvatar(wikidataEntity.imageUrl, qid);
            console.log(`[Person API] Avatar saved to: ${localAvatarUrl}`);
        }

        // 5. 创建人物记录
        const newPerson = await prisma.people.create({
            data: {
                qid: wikidataEntity.qid,
                name: wikidataEntity.label,           // 已翻译为简体中文
                aliases: wikidataEntity.aliases,
                description: wikidataEntity.description, // 已翻译
                avatarUrl: localAvatarUrl,            // 本地路径
                occupation: wikidataEntity.occupation || [],  // 已翻译
                organization: wikidataEntity.organization || [], // 已翻译
                officialLinks: wikidataEntity.officialLinks,
                sourceWhitelist: extractWhitelistDomains(wikidataEntity.officialLinks),
                status: 'pending', // 等待后台任务抓取数据
                completeness: 0,
            },
        });

        console.log(`[Person API] Created person: ${newPerson.id} - ${newPerson.name}`);

        // 6. 更新搜索会话
        await prisma.searchSession.update({
            where: { id: sessionId },
            data: {
                status: 'confirmed',
                confirmedPersonId: newPerson.id,
                resolvedAt: new Date(),
            },
        });

        // 7. 触发后台任务抓取数据
        console.log(`[Person API] Triggering Inngest job for person: ${newPerson.id}`);
        try {
            await inngest.send({
                name: 'person/created',
                data: {
                    personId: newPerson.id,
                    personName: newPerson.name,
                    englishName: wikidataEntity.englishLabel,
                    qid: newPerson.qid,
                    orcid: wikidataEntity.orcid,  // 用于 OpenAlex 精准匹配
                    officialLinks: wikidataEntity.officialLinks,
                    aliases: newPerson.aliases,
                },
            });
            console.log(`[Person API] Inngest job triggered successfully`);
        } catch (inngestError) {
            console.error(`[Person API] Inngest trigger failed:`, inngestError);
            // 不阻塞返回，但记录错误
        }

        return NextResponse.json({
            personId: newPerson.id,
            status: 'pending',
            isNew: true,
            message: '人物已创建，正在收集数据...',
        });
    } catch (error) {
        console.error('Create person API error:', error);
        return NextResponse.json(
            { error: '创建失败，请稍后重试' },
            { status: 500 }
        );
    }
}

/**
 * 从官方链接提取白名单域名
 */
function extractWhitelistDomains(
    links: { type: string; url: string }[]
): string[] {
    const domains: string[] = [];

    for (const link of links) {
        try {
            const url = new URL(link.url);
            domains.push(url.hostname);
        } catch {
            // 忽略无效 URL
        }
    }

    return [...new Set(domains)];
}
