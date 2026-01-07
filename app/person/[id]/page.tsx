import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import { PersonPageClient } from '@/components/person/PersonPageClient';

interface PersonPageProps {
    params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
    const { id } = await params;

    // 只加载基本信息、卡片、职业数据
    // rawPoolItems 由客户端按需加载（懒加载）
    const person = await prisma.people.findUnique({
        where: { id },
        include: {
            cards: {
                orderBy: { importance: 'desc' },
                take: 20, // 首屏只加载前 20 张卡片
            },
            roles: {
                include: {
                    organization: true,
                },
                orderBy: { startDate: 'desc' },
            },
            // 只获取 rawPoolItems 的统计信息，用于显示 tab 数量
            _count: {
                select: {
                    rawPoolItems: true,
                }
            }
        },
    });

    if (!person) {
        notFound();
    }

    // 获取各类型的数量统计（用于 tab badge）
    const typeCounts = await prisma.rawPoolItem.groupBy({
        by: ['sourceType'],
        where: { personId: id },
        _count: true
    });

    const sourceTypeCounts: Record<string, number> = {};
    typeCounts.forEach(tc => {
        sourceTypeCounts[tc.sourceType] = tc._count;
    });

    // 序列化数据传递给客户端组件
    const personData = {
        id: person.id,
        name: person.name,
        description: person.description,
        whyImportant: person.whyImportant,
        avatarUrl: person.avatarUrl,
        gender: person.gender,
        country: person.country,
        qid: person.qid,
        status: person.status,
        completeness: person.completeness,
        occupation: person.occupation,
        organization: person.organization,
        aliases: person.aliases,
        officialLinks: (person.officialLinks as any[]) || [],
        // 不再传递 rawPoolItems，改为客户端懒加载
        rawPoolItems: [], // 空数组，客户端会按需加载
        sourceTypeCounts, // 各类型数量统计
        cards: person.cards.map(card => ({
            id: card.id,
            type: card.type,
            title: card.title,
            content: card.content,
            tags: card.tags,
            importance: card.importance,
        })),
        personRoles: person.roles.map(role => ({
            id: role.id,
            role: role.role,
            roleZh: role.roleZh,
            startDate: role.startDate?.toISOString() || undefined,
            endDate: role.endDate?.toISOString() || undefined,
            organizationName: role.organization.name,
            organizationNameZh: role.organization.nameZh,
            organizationType: role.organization.type,
        })),
    };

    return <PersonPageClient person={personData} />;
}

