import { Suspense } from 'react';
import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import { PersonPageClient } from '@/components/person/PersonPageClient';

// ISR 缓存：1小时后重新验证
export const revalidate = 3600;

// 预生成热门人物页面（构建时静态生成）
export async function generateStaticParams() {
    // 获取访问量最高的 100 个已发布人物
    const hotPeople = await prisma.people.findMany({
        where: { status: 'ready' },
        orderBy: { viewCount: 'desc' },
        take: 100,
        select: { id: true }
    });
    return hotPeople.map(p => ({ id: p.id }));
}

interface PersonPageProps {
    params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
    const { id } = await params;

    // 合并所有查询为单个 Promise.all，减少数据库往返
    const [person, typeCounts, courseCount, papers] = await Promise.all([
        // 主查询：基本信息、卡片、职业数据、关联人物
        prisma.people.findUnique({
            where: { id },
            include: {
                cards: {
                    orderBy: { importance: 'desc' },
                    take: 10, // 首屏裁剪：从 20 减到 10
                },
                roles: {
                    include: {
                        organization: true,
                        advisor: {
                            select: { id: true, name: true }
                        }
                    },
                    orderBy: { startDate: 'desc' },
                },
                // 关联人物关系（正向：当前人物作为主体）- 限制数量
                relations: {
                    take: 10, // 首屏裁剪：限制 10 条
                    include: {
                        relatedPerson: {
                            select: {
                                id: true,
                                name: true,
                                avatarUrl: true,
                                organization: true,
                            }
                        }
                    }
                },
                // 关联人物关系（反向：当前人物作为关联对象）- 限制数量
                relatedTo: {
                    take: 10, // 首屏裁剪：限制 10 条
                    include: {
                        person: {
                            select: {
                                id: true,
                                name: true,
                                avatarUrl: true,
                                organization: true,
                            }
                        }
                    }
                },
                // 只获取 rawPoolItems 的统计信息，用于显示 tab 数量
                _count: {
                    select: {
                        rawPoolItems: true,
                        courses: true, // 合并 courseCount 到这里
                    }
                }
            },
        }),
        // 各类型数量统计（用于 tab badge）
        prisma.rawPoolItem.groupBy({
            by: ['sourceType'],
            where: { personId: id },
            _count: true
        }),
        // 课程数量（备用，如果 _count 不支持）
        prisma.course.count({ where: { personId: id } }),
        // 论文数据（前10篇）
        prisma.rawPoolItem.findMany({
            where: {
                personId: id,
                sourceType: 'openalex',
            },
            orderBy: { fetchedAt: 'desc' },
            take: 10,
        }),
    ]);

    if (!person) {
        notFound();
    }

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
        // 话题和排名
        topics: person.topics || [],
        topicRanks: (person.topicRanks as Record<string, number>) || null,
        topicDetails: (person.topicDetails as any[]) || null,
        // 新增字段
        quotes: (person.quotes as any[]) || null,
        products: (person.products as any[]) || null,
        education: (person.education as any[]) || null,
        currentTitle: person.currentTitle || null,
        courseCount, // 课程数量
        // 论文数据
        papers: papers.map(p => ({
            id: p.id,
            title: p.title,
            text: p.text,
            url: p.url,
            publishedAt: p.publishedAt?.toISOString() || null,
            metadata: (p.metadata as any) || {},
        })),
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
            advisorId: role.advisorId || undefined,
            advisorName: role.advisor?.name || undefined,
        })),
        // 关联人物 - 合并正向和反向关系
        // 数据模型语义: { personId: A, relatedPersonId: B, type: X } 表示 B 是 A 的 X
        // 例如: { personId: Ilya, relatedPersonId: Hinton, type: advisor } = Hinton 是 Ilya 的导师
        relations: [
            // 正向关系：当前人物的 relations 表
            // { personId: 当前人物, relatedPersonId: B, type: X } = B 是当前人物的 X
            // 从当前人物视角：B 就是我的 X，不需要转换
            ...person.relations.map(rel => ({
                id: rel.id,
                relationType: rel.relationType, // B 是我的 relationType，直接使用
                description: rel.description,
                relatedPerson: {
                    id: rel.relatedPerson.id,
                    name: rel.relatedPerson.name,
                    avatarUrl: rel.relatedPerson.avatarUrl,
                    organization: rel.relatedPerson.organization,
                }
            })),
            // 反向关系：其他人物指向当前人物的关系
            // { personId: A, relatedPersonId: 当前人物, type: X } = 当前人物是 A 的 X
            // 从当前人物视角：A 是我的反向关系（如果我是 A 的导师，那 A 是我的学生）
            ...person.relatedTo.map(rel => {
                const reverseType: Record<string, string> = {
                    advisor: 'advisee',       // 我是他导师 → 他是我学生
                    advisee: 'advisor',       // 我是他学生 → 他是我导师
                    successor: 'predecessor', // 我是他继任者 → 他是我前任
                    predecessor: 'successor', // 我是他前任 → 他是我继任者
                };
                return {
                    id: rel.id + '-reverse',
                    relationType: reverseType[rel.relationType] || rel.relationType,
                    description: rel.description,
                    relatedPerson: {
                        id: rel.person.id,
                        name: rel.person.name,
                        avatarUrl: rel.person.avatarUrl,
                        organization: rel.person.organization,
                    }
                };
            }),
        ],
    };

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full animate-spin border-3 border-transparent border-t-orange-500"></div></div>}>
            <PersonPageClient person={personData} />
        </Suspense>
    );
}

