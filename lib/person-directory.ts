import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { normalizeHighlights } from '@/lib/utils/person-json';
import {
  DIRECTORY_ORGANIZATIONS,
  DIRECTORY_TOPICS,
  getDirectoryOrganizationAliases,
  type DirectoryOrganizationMatch,
  type DirectoryResponse,
} from '@/lib/person-directory-config';

export async function fetchPersonDirectory(params: {
  page?: number;
  limit?: number;
  topic?: string | null;
  organization?: string | null;
  roleCategory?: string | null;
  search?: string | null;
  sortBy?: string | null;
}): Promise<DirectoryResponse> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(48, Math.max(1, params.limit || 12));
  const start = (page - 1) * limit;
  const topic = params.topic || null;
  const organization = params.organization || null;
  const roleCategory = params.roleCategory || null;
  const search = params.search?.trim() || null;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const organizationAliases = organization ? getDirectoryOrganizationAliases(organization) : [];
  const organizationRoleWhere: Prisma.PersonRoleWhereInput = organization
    ? {
        organization: {
          OR: [
            { name: { in: organizationAliases } },
            { nameZh: { in: organizationAliases } },
          ],
        },
      }
    : { id: '__never__' };

  const where: Prisma.PeopleWhereInput = {
    status: { in: ['ready', 'active'] },
  };

  if (topic) where.topics = { has: topic };
  if (organization) {
    where.OR = [
      { roles: { some: organizationRoleWhere } },
      ...organizationAliases.map(alias => ({
        currentTitle: { contains: alias, mode: 'insensitive' as const },
      })),
    ];
  }
  if (roleCategory) where.roleCategory = roleCategory;
  if (search) {
    const searchVariants = uniqueSearchTerms([
      search,
      search.toLowerCase(),
      search.replace(/\s+/g, ''),
      search.toLowerCase().replace(/\s+/g, ''),
    ]);
    const searchFilters: Prisma.PeopleWhereInput[] = [
      { name: { contains: search, mode: 'insensitive' } },
      { aliases: { hasSome: searchVariants } },
      { organization: { hasSome: searchVariants } },
      { topics: { hasSome: searchVariants } },
    ];
    const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [...existingAnd, { OR: searchFilters }];
  }

  let orderBy: Prisma.PeopleOrderByWithRelationInput = { influenceScore: 'desc' };
  if (params.sortBy === 'weeklyViewCount') orderBy = { weeklyViewCount: 'desc' };
  if (params.sortBy === 'citationCount') orderBy = { citationCount: 'desc' };
  if (params.sortBy === 'name') orderBy = { name: 'asc' };

  const [people, total] = await Promise.all([
    prisma.people.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        avatarUrl: true,
        organization: true,
        currentTitle: true,
        topics: true,
        highlights: true,
        roleCategory: true,
        influenceScore: true,
        roles: {
          where: organizationRoleWhere,
          select: {
            role: true,
            roleZh: true,
            startDate: true,
            endDate: true,
            source: true,
            confidence: true,
            organization: {
              select: {
                name: true,
                nameZh: true,
              },
            },
          },
        },
        _count: {
          select: {
            pageViews: {
              where: {
                viewedAt: { gte: sevenDaysAgo },
              },
            },
          },
        },
      },
      orderBy: [orderBy, { name: 'asc' }],
      skip: start,
      take: limit,
    }),
    prisma.people.count({ where }),
  ]);

  const shouldIncludeStats = page === 1 && !topic && !organization && !roleCategory && !search;

  return {
    data: people.map(person => ({
      id: person.id,
      name: person.name,
      description: person.description,
      avatarUrl: person.avatarUrl,
      organization: person.organization,
      currentTitle: person.currentTitle,
      topics: person.topics,
      roleCategory: person.roleCategory,
      influenceScore: person.influenceScore,
      weeklyViewCount: person._count.pageViews,
      organizationMatch: organization
        ? buildOrganizationMatch({
            requestedOrganization: organization,
            aliases: organizationAliases,
            currentTitle: person.currentTitle,
            profileOrganizations: person.organization,
            roles: person.roles,
          })
        : null,
      highlights: normalizeHighlights(person.highlights),
    })),
    pagination: {
      page,
      limit,
      total,
      hasMore: start + limit < total,
    },
    ...(shouldIncludeStats && {
      stats: {
        totalPeople: total,
        totalTopics: DIRECTORY_TOPICS.length,
        totalOrgs: DIRECTORY_ORGANIZATIONS.length,
      },
    }),
  };
}

function uniqueSearchTerms(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function buildOrganizationMatch(params: {
  requestedOrganization: string;
  aliases: string[];
  currentTitle: string | null;
  profileOrganizations: string[];
  roles: Array<{
    role: string;
    roleZh: string | null;
    startDate: Date | null;
    endDate: Date | null;
    source: string | null;
    confidence: number | null;
    organization: {
      name: string;
      nameZh: string | null;
    };
  }>;
}): DirectoryOrganizationMatch {
  const aliasSet = new Set(params.aliases.map(normalizeOrgName));
  const titleHasFormerTenure = titleMentionsFormerTenure(params.currentTitle, params.aliases);
  const currentTitleMatchesOrganization = params.currentTitle
    ? !titleHasFormerTenure && params.aliases.some(alias => normalizeOrgName(params.currentTitle).includes(normalizeOrgName(alias)))
    : false;
  const currentTitleConflictsWithOrganization = currentTitleHasDifferentAtOrganization(params.currentTitle, params.aliases);
  const matchingRole = [...params.roles]
    .filter(role => aliasSet.has(normalizeOrgName(role.organization.name)) || aliasSet.has(normalizeOrgName(role.organization.nameZh)))
    .sort((a, b) => {
      const currentDelta = Number(!b.endDate) - Number(!a.endDate);
      if (currentDelta !== 0) return currentDelta;
      return (b.confidence ?? 0) - (a.confidence ?? 0);
    })[0];

  if (matchingRole) {
    const status = matchingRole.endDate
      ? 'past'
      : titleHasFormerTenure || currentTitleConflictsWithOrganization
        ? 'past'
        : currentTitleMatchesOrganization
        ? 'current'
        : 'role';

    return {
      organization: matchingRole.organization.nameZh || matchingRole.organization.name || params.requestedOrganization,
      role: matchingRole.roleZh || matchingRole.role,
      status,
      isCurrent: status === 'current',
      startYear: yearOf(matchingRole.startDate),
      endYear: yearOf(matchingRole.endDate),
      confidence: matchingRole.confidence,
      source: 'role',
    };
  }

  if (currentTitleMatchesOrganization) {
    return {
      organization: params.requestedOrganization,
      role: null,
      status: 'current',
      isCurrent: true,
      startYear: null,
      endYear: null,
      confidence: null,
      source: 'profile',
    };
  }

  const profileMatch = params.profileOrganizations.find(org => aliasSet.has(normalizeOrgName(org)));
  return {
    organization: profileMatch || params.requestedOrganization,
    role: null,
    status: 'profile',
    isCurrent: false,
    startYear: null,
    endYear: null,
    confidence: null,
    source: 'profile',
  };
}

function normalizeOrgName(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function yearOf(value: Date | null): string | null {
  return value ? String(value.getUTCFullYear()) : null;
}

function titleMentionsFormerTenure(title: string | null, aliases: string[]): boolean {
  if (!title) return false;
  const normalizedTitle = normalizeOrgName(title);
  const formerPattern = /\b(former|formerly|previously|prev)\b|曾任|前任|前\s*/i;
  if (!formerPattern.test(title)) return false;
  return aliases.some(alias => normalizedTitle.includes(normalizeOrgName(alias)));
}

function currentTitleHasDifferentAtOrganization(title: string | null, aliases: string[]): boolean {
  if (!title || !title.includes('@')) return false;
  const titleOrg = normalizeOrgName(title.split('@').pop());
  if (!titleOrg) return false;
  return !aliases.some(alias => {
    const normalizedAlias = normalizeOrgName(alias);
    return titleOrg.includes(normalizedAlias) || normalizedAlias.includes(titleOrg);
  });
}
