import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import { PersonPageClient } from '@/components/person/PersonPageClient';

interface PersonPageProps {
    params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
    const { id } = await params;

    const person = await prisma.people.findUnique({
        where: { id },
        include: {
            rawPoolItems: {
                take: 100,
                orderBy: { fetchedAt: 'desc' },
            },
            cards: {
                orderBy: { importance: 'desc' },
            },
            roles: {
                include: {
                    organization: true,
                },
                orderBy: { startDate: 'desc' },
            },
        },
    });

    if (!person) {
        notFound();
    }

    // 序列化数据传递给客户端组件
    const personData = {
        id: person.id,
        name: person.name,
        description: person.description,
        avatarUrl: person.avatarUrl,
        qid: person.qid,
        status: person.status,
        completeness: person.completeness,
        occupation: person.occupation,
        organization: person.organization,
        aliases: person.aliases,
        officialLinks: (person.officialLinks as any[]) || [],
        rawPoolItems: person.rawPoolItems.map(item => ({
            id: item.id,
            sourceType: item.sourceType,
            url: item.url,
            title: item.title,
            text: item.text,
            publishedAt: item.publishedAt?.toISOString() || undefined,
            metadata: item.metadata as Record<string, unknown> | undefined,
        })),
        cards: person.cards.map(card => ({
            id: card.id,
            type: card.type,
            title: card.title,
            content: card.content,
            tags: card.tags,
            importance: card.importance,
        })),
        // 新增：结构化职业数据
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

