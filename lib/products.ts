import { prisma } from '@/lib/db/prisma';
import { workTypeLabel } from '@/lib/work-taxonomy';

/**
 * 作品/成果实体（内部表名 Product）的运行时数据层。
 * 实体页 /work/[slug] 与人物页「代表作品」横切共用。只读。
 */

export interface WorkContributor {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  roleCategory: string | null;
  role: string; // creator | contributor
}

export interface WorkPage {
  id: string;
  slug: string;
  name: string;
  type: string;
  typeLabel: string;
  category: string | null;
  description: string | null;
  url: string | null;
  iconUrl: string | null;
  firstYear: number | null;
  organizationId: string | null;
  organizationName: string | null;
  topics: string[];
  threadSlugs: string[];
  contributors: WorkContributor[];
}

const ROLE_ORDER: Record<string, number> = { creator: 0, lead: 1, contributor: 2 };

export async function fetchWorkPage(slug: string): Promise<WorkPage | null> {
  const product = await prisma.product.findUnique({
    where: { slug: slug.trim().toLowerCase() },
    include: {
      contributors: {
        include: {
          person: { select: { id: true, name: true, avatarUrl: true, currentTitle: true, roleCategory: true } },
        },
      },
    },
  });
  if (!product) return null;

  const contributors: WorkContributor[] = product.contributors
    .map(c => ({
      id: c.person.id,
      name: c.person.name,
      avatarUrl: c.person.avatarUrl,
      currentTitle: c.person.currentTitle,
      roleCategory: c.person.roleCategory,
      role: c.role,
    }))
    .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    type: product.type,
    typeLabel: workTypeLabel(product.type),
    category: product.category,
    description: product.description,
    url: product.url,
    iconUrl: product.iconUrl,
    firstYear: product.firstYear,
    organizationId: product.organizationId,
    organizationName: product.organizationName,
    topics: product.topics,
    threadSlugs: product.threadSlugs,
    contributors,
  };
}

export interface PersonWorkLink {
  slug: string;
  name: string;
  type: string;
  typeLabel: string;
  organizationName: string | null;
  role: string;
}

/** 某人参与的作品（人物页「代表作品」用，已是去重/收敛后的实体）。 */
export async function listWorksForPerson(personId: string, limit = 12): Promise<PersonWorkLink[]> {
  const links = await prisma.productContributor.findMany({
    where: { personId },
    include: {
      product: {
        select: { slug: true, name: true, type: true, organizationName: true, priorityScore: true },
      },
    },
    orderBy: { product: { priorityScore: 'desc' } },
    take: limit,
  });
  return links.map(l => ({
    slug: l.product.slug,
    name: l.product.name,
    type: l.product.type,
    typeLabel: workTypeLabel(l.product.type),
    organizationName: l.product.organizationName,
    role: l.role,
  }));
}

export async function listStaticWorkSlugs(limit = 50): Promise<string[]> {
  const rows = await prisma.product.findMany({
    select: { slug: true },
    orderBy: { priorityScore: 'desc' },
    take: limit,
  });
  return rows.map(r => r.slug);
}
