import { prisma } from '@/lib/db/prisma';
import { fetchActivityEvents, type ActivityEvent } from '@/lib/activity';
import { normalizeDirectoryTopics } from '@/lib/person-directory-config';
import { normalizeProducts, normalizeTopicRanks } from '@/lib/utils/person-json';
import { generateCompareReport, type CompareReport } from '@/lib/compare-report';

export interface ComparePerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  description: string | null;
  currentTitle: string | null;
  organization: string[];
  topics: string[];
  topicRanks: Record<string, number> | null;
  influenceScore: number;
  citationCount: number;
  hIndex: number;
  githubStars: number;
  products: Array<{
    name: string;
    org?: string;
    year?: string | number;
    url?: string;
    description: string;
  }>;
  sourceCounts: Record<string, number>;
  relationCount: number;
  relations: CompareRelation[];
  latestEvents: ActivityEvent[];
}

export interface CompareRelation {
  personId: string;
  personName: string;
  relationType: string;
  confidence: number | null;
  evidenceUrl: string | null;
  hasEvidence: boolean;
}

export async function fetchComparePeople(ids: string[]): Promise<ComparePerson[]> {
  const uniqueIds = [...new Set(ids.map(id => id.trim()).filter(Boolean))].slice(0, 3);
  if (uniqueIds.length === 0) return [];

  const [people, sourceCounts, relationRows, eventGroups] = await Promise.all([
    prisma.people.findMany({
      where: {
        id: { in: uniqueIds },
        status: { in: ['ready', 'active'] },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        description: true,
        currentTitle: true,
        organization: true,
        topics: true,
        topicRanks: true,
        influenceScore: true,
        citationCount: true,
        hIndex: true,
        githubStars: true,
        products: true,
      },
    }),
    prisma.rawPoolItem.groupBy({
      by: ['personId', 'sourceType'],
      where: {
        personId: { in: uniqueIds },
        fetchStatus: 'success',
      },
      _count: true,
    }),
    prisma.personRelation.findMany({
      where: {
        OR: [
          { personId: { in: uniqueIds } },
          { relatedPersonId: { in: uniqueIds } },
        ],
        reviewStatus: { not: 'needs_review' },
      },
      select: {
        personId: true,
        relatedPersonId: true,
        relationType: true,
        confidence: true,
        evidenceUrl: true,
        evidenceNote: true,
        description: true,
        person: {
          select: {
            id: true,
            name: true,
          },
        },
        relatedPerson: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 60,
    }),
    Promise.all(uniqueIds.map(personId => fetchActivityEvents({ personId, limit: 3, days: 365 }))),
  ]);

  const sourceCountMap = new Map<string, Record<string, number>>();
  for (const row of sourceCounts) {
    const personCounts = sourceCountMap.get(row.personId) || {};
    personCounts[row.sourceType] = row._count;
    sourceCountMap.set(row.personId, personCounts);
  }

  const relationMap = buildRelationMap(uniqueIds, relationRows);
  const peopleById = new Map(people.map(person => [person.id, person]));

  return uniqueIds
    .map((id, index) => {
      const person = peopleById.get(id);
      if (!person) return null;

      return {
        id: person.id,
        name: person.name,
        avatarUrl: person.avatarUrl,
        description: person.description,
        currentTitle: person.currentTitle,
        organization: person.organization,
        topics: normalizeDirectoryTopics(person.topics),
        topicRanks: normalizeTopicRanks(person.topicRanks),
        influenceScore: person.influenceScore,
        citationCount: person.citationCount,
        hIndex: person.hIndex,
        githubStars: person.githubStars,
        products: (normalizeProducts(person.products) || []).slice(0, 3),
        sourceCounts: sourceCountMap.get(person.id) || {},
        relationCount: relationMap.get(person.id)?.length || 0,
        relations: relationMap.get(person.id)?.slice(0, 4) || [],
        latestEvents: eventGroups[index] || [],
      } satisfies ComparePerson;
    })
    .filter((person): person is ComparePerson => Boolean(person));
}

export async function fetchCompareReport(ids: string[]): Promise<CompareReport> {
  const people = await fetchComparePeople(ids);
  return generateCompareReport(people);
}

function buildRelationMap(
  personIds: string[],
  relationRows: Array<{
    personId: string;
    relatedPersonId: string;
    relationType: string;
    confidence: number | null;
    evidenceUrl: string | null;
    evidenceNote: string | null;
    description: string | null;
    person: { id: string; name: string };
    relatedPerson: { id: string; name: string };
  }>
): Map<string, CompareRelation[]> {
  const personIdSet = new Set(personIds);
  const reverseType: Record<string, string> = {
    advisor: 'advisee',
    advisee: 'advisor',
    successor: 'predecessor',
    predecessor: 'successor',
  };
  const relationMap = new Map<string, CompareRelation[]>();

  for (const row of relationRows) {
    if (personIdSet.has(row.personId)) {
      addRelation(relationMap, row.personId, {
        personId: row.relatedPerson.id,
        personName: row.relatedPerson.name,
        relationType: row.relationType,
        confidence: row.confidence,
        evidenceUrl: row.evidenceUrl,
        hasEvidence: Boolean(row.evidenceUrl || row.evidenceNote || row.description),
      });
    }

    if (personIdSet.has(row.relatedPersonId)) {
      addRelation(relationMap, row.relatedPersonId, {
        personId: row.person.id,
        personName: row.person.name,
        relationType: reverseType[row.relationType] || row.relationType,
        confidence: row.confidence,
        evidenceUrl: row.evidenceUrl,
        hasEvidence: Boolean(row.evidenceUrl || row.evidenceNote || row.description),
      });
    }
  }

  return relationMap;
}

function addRelation(map: Map<string, CompareRelation[]>, personId: string, relation: CompareRelation) {
  const items = map.get(personId) || [];
  if (!items.some(item => item.personId === relation.personId && item.relationType === relation.relationType)) {
    items.push(relation);
    items.sort((left, right) => (right.confidence || 0) - (left.confidence || 0) || left.personName.localeCompare(right.personName));
  }
  map.set(personId, items);
}
