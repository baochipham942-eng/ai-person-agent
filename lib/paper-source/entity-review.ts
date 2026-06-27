import { prisma } from '@/lib/db/prisma';
import { PAPER_ENTITY_REVIEW_STATUSES } from './constants';
import type {
  PaperAuthorPersonLink,
  PaperAuthorReviewCandidate,
  PaperEntityReviewCandidate,
  PaperEntityReviewCandidateOrganization,
  PaperEntityReviewCandidatePerson,
  PaperEntityReviewItem,
  PaperSourceRecord,
} from './types';
import { cleanOpenAlexAuthorId } from './openalex';
import {
  readPaperAuthorEntries,
  readPaperOrganizationNames,
} from './metadata';
import {
  isMissingPaperEntityReviewTable,
  withNeonWakeup,
} from './storage';
import {
  asRecord,
  normalizeAuthorNameKey,
  readNumber,
  readString,
  readStringArray,
} from './utils';

export async function getPaperAuthorPeople(authorNames: string[]): Promise<{
  people: PaperAuthorPersonLink[];
  reviewCandidates: PaperAuthorReviewCandidate[];
}> {
  const normalizedAuthorNames = [...new Set(authorNames.map(name => name.trim()).filter(Boolean))];
  if (normalizedAuthorNames.length === 0) return { people: [], reviewCandidates: [] };

  const people = await withNeonWakeup(() => prisma.people.findMany({
    select: {
      id: true,
      name: true,
      aliases: true,
      avatarUrl: true,
      currentTitle: true,
      openalexId: true,
      influenceScore: true,
    },
  }));

  const candidatesByKey = new Map<string, Array<{
    person: (typeof people)[number];
    matchReason: PaperAuthorPersonLink['matchReason'];
  }>>();

  for (const person of people) {
    const nameKey = normalizeAuthorNameKey(person.name);
    if (nameKey) {
      const list = candidatesByKey.get(nameKey) || [];
      list.push({ person, matchReason: 'name_exact' });
      candidatesByKey.set(nameKey, list);
    }
    for (const alias of person.aliases) {
      const aliasKey = normalizeAuthorNameKey(alias);
      if (!aliasKey || aliasKey === nameKey) continue;
      const list = candidatesByKey.get(aliasKey) || [];
      list.push({ person, matchReason: 'alias_exact' });
      candidatesByKey.set(aliasKey, list);
    }
  }

  const linkedPeople: PaperAuthorPersonLink[] = [];
  const reviewCandidates: PaperAuthorReviewCandidate[] = [];
  const seenPeople = new Set<string>();

  for (const authorName of normalizedAuthorNames) {
    const key = normalizeAuthorNameKey(authorName);
    const matches = key ? candidatesByKey.get(key) || [] : [];
    const uniqueMatches = dedupeAuthorPersonMatches(matches);
    if (uniqueMatches.length === 1) {
      const match = uniqueMatches[0];
      if (!seenPeople.has(match.person.id)) {
        seenPeople.add(match.person.id);
        linkedPeople.push({
          id: match.person.id,
          name: match.person.name,
          href: `/person/${match.person.id}`,
          avatarUrl: match.person.avatarUrl,
          currentTitle: match.person.currentTitle,
          openalexId: match.person.openalexId,
          matchedAuthorName: authorName,
          matchReason: match.matchReason,
          confidence: match.matchReason === 'name_exact' ? 0.92 : 0.86,
        });
      }
    } else {
      reviewCandidates.push({
        name: authorName,
        reason: uniqueMatches.length > 1 ? 'ambiguous_author' : 'unmatched_author',
      });
    }
  }

  linkedPeople.sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name));
  return {
    people: linkedPeople.slice(0, 8),
    reviewCandidates: reviewCandidates.slice(0, 8),
  };
}

export async function getPaperEntityReviewQueue(sourceId: string): Promise<PaperEntityReviewItem[]> {
  try {
    const rows = await withNeonWakeup(() => prisma.paperEntityReview.findMany({
      where: { sourceItemId: sourceId },
      select: {
        id: true,
        sourceItemId: true,
        entityName: true,
        entityKind: true,
        mentionType: true,
        matchReason: true,
        confidence: true,
        candidatePeople: true,
        candidateOrganizations: true,
        reviewStatus: true,
        evidenceQuote: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        confirmedPerson: {
          select: {
            id: true,
            name: true,
            currentTitle: true,
          },
        },
        confirmedOrganization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { reviewStatus: 'asc' },
        { confidence: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 40,
    }));

    return rows.map(row => ({
      id: row.id,
      sourceItemId: row.sourceItemId,
      entityName: row.entityName,
      entityKind: normalizePaperEntityKind(row.entityKind),
      mentionType: normalizePaperEntityMentionType(row.mentionType),
      matchReason: row.matchReason,
      confidence: row.confidence,
      candidatePeople: parsePaperEntityCandidatePeople(row.candidatePeople),
      candidateOrganizations: parsePaperEntityCandidateOrganizations(row.candidateOrganizations),
      reviewStatus: normalizePaperEntityReviewStatus(row.reviewStatus),
      evidenceQuote: row.evidenceQuote,
      metadata: asRecord(row.metadata),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      confirmedPerson: row.confirmedPerson ? {
        id: row.confirmedPerson.id,
        name: row.confirmedPerson.name,
        href: `/person/${row.confirmedPerson.id}`,
        currentTitle: row.confirmedPerson.currentTitle,
      } : null,
      confirmedOrganization: row.confirmedOrganization ? {
        id: row.confirmedOrganization.id,
        name: row.confirmedOrganization.name,
      } : null,
    }));
  } catch (error) {
    if (isMissingPaperEntityReviewTable(error)) return [];
    throw error;
  }
}

export async function buildPaperEntityReviewCandidates(
  source: PaperSourceRecord,
  options: {
    people?: Array<{
      id: string;
      name: string;
      aliases: string[];
      currentTitle: string | null;
      openalexId: string | null;
      influenceScore: number;
    }>;
    organizations?: Array<{
      id: string;
      name: string;
      aliases: string[];
    }>;
  } = {},
): Promise<PaperEntityReviewCandidate[]> {
  const metadata = asRecord(source.metadata);
  const people = options.people ?? await withNeonWakeup(() => prisma.people.findMany({
    select: {
      id: true,
      name: true,
      aliases: true,
      currentTitle: true,
      openalexId: true,
      influenceScore: true,
    },
  }));
  const organizations = options.organizations ?? await withNeonWakeup(() => prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      aliases: true,
    },
  }));

  const candidates: PaperEntityReviewCandidate[] = [];
  const authors = readPaperAuthorEntries(metadata);
  for (const author of authors) {
    const authorName = author.name;
    const candidatePeople = findPaperAuthorPersonCandidates(authorName, people, author.openalexId);
    const needsReview = candidatePeople.length !== 1;
    if (!needsReview) continue;
    candidates.push({
      sourceItemId: source.id,
      entityName: authorName,
      entityKind: 'person',
      mentionType: 'author',
      matchReason: candidatePeople.length > 1 ? 'ambiguous_author' : 'unmatched_author',
      confidence: candidatePeople.length > 1 ? 0.72 : 0.58,
      candidatePeople,
      candidateOrganizations: [],
      reviewStatus: 'needs_review',
      evidenceQuote: `Author: ${authorName}`,
      metadata: {
        materializedFrom: 'paper_author_entity_review',
        sourceUrl: source.url,
        openalexAuthorId: author.openalexId,
      },
    });
  }

  const organizationsFromMetadata = readPaperOrganizationNames(metadata);
  for (const organizationName of organizationsFromMetadata) {
    const candidateOrganizations = findPaperOrganizationCandidates(organizationName, organizations);
    candidates.push({
      sourceItemId: source.id,
      entityName: organizationName,
      entityKind: 'organization',
      mentionType: 'affiliation',
      matchReason: candidateOrganizations.length > 1
        ? 'ambiguous_affiliation'
        : candidateOrganizations.length === 1
          ? 'candidate_affiliation'
          : 'unmatched_affiliation',
      confidence: candidateOrganizations.length === 1 ? 0.7 : 0.6,
      candidatePeople: [],
      candidateOrganizations,
      reviewStatus: 'needs_review',
      evidenceQuote: `Affiliation: ${organizationName}`,
      metadata: {
        materializedFrom: 'paper_affiliation_entity_review',
        sourceUrl: source.url,
      },
    });
  }

  return dedupePaperEntityReviewCandidates(candidates).slice(0, 30);
}

function dedupeAuthorPersonMatches<T extends { person: { id: string; influenceScore: number }; matchReason: PaperAuthorPersonLink['matchReason'] }>(matches: T[]): T[] {
  const byPerson = new Map<string, T>();
  for (const match of matches) {
    const existing = byPerson.get(match.person.id);
    if (!existing) {
      byPerson.set(match.person.id, match);
      continue;
    }
    if (existing.matchReason !== 'name_exact' && match.matchReason === 'name_exact') {
      byPerson.set(match.person.id, match);
    }
  }
  return [...byPerson.values()].sort((left, right) => {
    if (left.matchReason !== right.matchReason) return left.matchReason === 'name_exact' ? -1 : 1;
    return right.person.influenceScore - left.person.influenceScore;
  });
}

function findPaperAuthorPersonCandidates(
  authorName: string,
  people: Array<{
    id: string;
    name: string;
    aliases: string[];
    currentTitle: string | null;
    openalexId: string | null;
    influenceScore: number;
  }>,
  openalexAuthorId: string | null = null,
): PaperEntityReviewCandidatePerson[] {
  const authorKey = normalizeAuthorNameKey(authorName);
  const cleanAuthorId = cleanOpenAlexAuthorId(openalexAuthorId);
  if (!authorKey && !cleanAuthorId) return [];
  const matches: PaperEntityReviewCandidatePerson[] = [];
  for (const person of people) {
    if (cleanAuthorId && cleanOpenAlexAuthorId(person.openalexId) === cleanAuthorId) {
      matches.push({
        id: person.id,
        name: person.name,
        href: `/person/${person.id}`,
        currentTitle: person.currentTitle,
        openalexId: person.openalexId,
        matchedName: authorName || person.name,
        matchReason: 'openalex_exact',
        confidence: 0.96,
      });
      continue;
    }
    const nameKey = normalizeAuthorNameKey(person.name);
    if (nameKey === authorKey) {
      matches.push({
        id: person.id,
        name: person.name,
        href: `/person/${person.id}`,
        currentTitle: person.currentTitle,
        openalexId: person.openalexId,
        matchedName: person.name,
        matchReason: 'name_exact',
        confidence: 0.92,
      });
      continue;
    }
    const matchedAlias = person.aliases.find(alias => normalizeAuthorNameKey(alias) === authorKey);
    if (matchedAlias) {
      matches.push({
        id: person.id,
        name: person.name,
        href: `/person/${person.id}`,
        currentTitle: person.currentTitle,
        openalexId: person.openalexId,
        matchedName: matchedAlias,
        matchReason: 'alias_exact',
        confidence: 0.86,
      });
    }
  }
  return dedupePaperEntityPersonCandidates(matches)
    .sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name))
    .slice(0, 5);
}

function dedupePaperEntityPersonCandidates(candidates: PaperEntityReviewCandidatePerson[]): PaperEntityReviewCandidatePerson[] {
  const byId = new Map<string, PaperEntityReviewCandidatePerson>();
  for (const candidate of candidates) {
    const existing = byId.get(candidate.id);
    if (!existing || candidate.confidence > existing.confidence) byId.set(candidate.id, candidate);
  }
  return [...byId.values()];
}

function findPaperOrganizationCandidates(
  organizationName: string,
  organizations: Array<{
    id: string;
    name: string;
    aliases: string[];
  }>,
): PaperEntityReviewCandidateOrganization[] {
  const organizationKey = normalizeEntityNameKey(organizationName);
  if (!organizationKey) return [];
  const matches: PaperEntityReviewCandidateOrganization[] = [];
  for (const organization of organizations) {
    if (normalizeEntityNameKey(organization.name) === organizationKey) {
      matches.push({
        id: organization.id,
        name: organization.name,
        aliases: organization.aliases,
        matchReason: 'name_exact',
        confidence: 0.9,
      });
      continue;
    }
    if (organization.aliases.some(alias => normalizeEntityNameKey(alias) === organizationKey)) {
      matches.push({
        id: organization.id,
        name: organization.name,
        aliases: organization.aliases,
        matchReason: 'alias_exact',
        confidence: 0.82,
      });
    }
  }
  return matches.sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name)).slice(0, 5);
}

function dedupePaperEntityReviewCandidates(candidates: PaperEntityReviewCandidate[]): PaperEntityReviewCandidate[] {
  const byKey = new Map<string, PaperEntityReviewCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.sourceItemId}:${candidate.entityKind}:${candidate.mentionType}:${normalizeEntityNameKey(candidate.entityName)}`;
    const existing = byKey.get(key);
    if (!existing || candidate.confidence > existing.confidence) byKey.set(key, candidate);
  }
  return [...byKey.values()].sort((left, right) => {
    const byKind = left.entityKind.localeCompare(right.entityKind);
    if (byKind !== 0) return byKind;
    return right.confidence - left.confidence || left.entityName.localeCompare(right.entityName);
  });
}

export function parsePaperEntityCandidatePeople(value: unknown): PaperEntityReviewCandidatePerson[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const record = asRecord(item);
    const id = readString(record.id);
    const name = readString(record.name);
    if (!id || !name) return null;
    return {
      id,
      name,
      href: readString(record.href) || `/person/${id}`,
      currentTitle: readString(record.currentTitle),
      openalexId: readString(record.openalexId),
      matchedName: readString(record.matchedName) || name,
      matchReason: normalizePaperEntityPersonMatchReason(record.matchReason),
      confidence: readNumber(record.confidence) ?? 0.7,
    };
  }).filter((item): item is PaperEntityReviewCandidatePerson => Boolean(item));
}

function normalizePaperEntityPersonMatchReason(value: unknown): PaperEntityReviewCandidatePerson['matchReason'] {
  if (value === 'openalex_exact' || value === 'alias_exact') return value;
  return 'name_exact';
}

export function parsePaperEntityCandidateOrganizations(value: unknown): PaperEntityReviewCandidateOrganization[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const record = asRecord(item);
    const id = readString(record.id);
    const name = readString(record.name);
    if (!id || !name) return null;
    return {
      id,
      name,
      aliases: readStringArray(record.aliases),
      matchReason: record.matchReason === 'alias_exact' ? 'alias_exact' as const : 'name_exact' as const,
      confidence: readNumber(record.confidence) ?? 0.7,
    };
  }).filter((item): item is PaperEntityReviewCandidateOrganization => Boolean(item));
}

export function normalizePaperEntityKind(value: string): PaperEntityReviewCandidate['entityKind'] {
  return value === 'organization' ? 'organization' : 'person';
}

export function normalizePaperEntityMentionType(value: string): PaperEntityReviewCandidate['mentionType'] {
  if (value === 'affiliation' || value === 'text_mention') return value;
  return 'author';
}

export function normalizePaperEntityReviewStatus(value: string): typeof PAPER_ENTITY_REVIEW_STATUSES[number] {
  if (PAPER_ENTITY_REVIEW_STATUSES.includes(value as typeof PAPER_ENTITY_REVIEW_STATUSES[number])) {
    return value as typeof PAPER_ENTITY_REVIEW_STATUSES[number];
  }
  return 'needs_review';
}

function normalizeEntityNameKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
