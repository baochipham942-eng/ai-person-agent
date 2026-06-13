import { prisma } from '@/lib/db/prisma';

export interface RelationshipGraphPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  organization: string[];
  depth: 0 | 1 | 2;
}

export interface RelationshipGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
  reviewStatus: string | null;
  confidence: number | null;
  evidenceUrl: string | null;
  evidenceNote: string | null;
  description: string | null;
}

export interface RelationshipGraphPath {
  viaPersonId: string;
  viaPersonName: string;
  targetPersonId: string;
  targetPersonName: string;
  firstRelationType: string;
  secondRelationType: string;
  confidence: number;
  evidenceCount: number;
}

export interface RelationshipGraph {
  center: RelationshipGraphPerson;
  nodes: RelationshipGraphPerson[];
  edges: RelationshipGraphEdge[];
  paths: RelationshipGraphPath[];
  stats: {
    firstHopPeople: number;
    secondHopPeople: number;
    evidenceEdges: number;
    lowConfidenceEdges: number;
  };
}

interface RelationRow {
  id: string;
  personId: string;
  relatedPersonId: string;
  relationType: string;
  description: string | null;
  reviewStatus: string | null;
  evidenceUrl: string | null;
  evidenceNote: string | null;
  confidence: number | null;
  person: PersonRow;
  relatedPerson: PersonRow;
}

interface PersonRow {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  organization: string[];
}

const REVERSE_RELATION_TYPE: Record<string, string> = {
  advisor: 'advisee',
  advisee: 'advisor',
  successor: 'predecessor',
  predecessor: 'successor',
};

const RELATION_PRIORITY: Record<string, number> = {
  cofounder: 7,
  advisor: 6,
  advisee: 6,
  collaborator: 5,
  colleague: 4,
  former_colleague: 3,
  successor: 3,
  predecessor: 3,
};
const MIN_DEFAULT_RELATION_CONFIDENCE = 0.75;

export async function fetchRelationshipGraph(
  personId: string,
  options: { firstHopLimit?: number; secondHopLimit?: number } = {}
): Promise<RelationshipGraph | null> {
  const firstHopLimit = clampInteger(options.firstHopLimit, 4, 24, 10);
  const secondHopLimit = clampInteger(options.secondHopLimit, 4, 48, 18);

  const center = await prisma.people.findUnique({
    where: { id: personId },
    select: personSelect(),
  });
  if (!center) return null;

  const firstHopRows = await prisma.personRelation.findMany({
    where: trustedRelationWhere(personId),
    select: relationSelect(),
    orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
    take: firstHopLimit * 2,
  });

  const firstHopNodes = rankedFirstHopNodes(personId, firstHopRows).slice(0, firstHopLimit);
  const firstHopIds = firstHopNodes.map(node => node.id);

  const secondHopRows = firstHopIds.length > 0
    ? await prisma.personRelation.findMany({
        where: {
          AND: [
            { reviewStatus: { in: ['trusted', 'confirmed'] } },
            {
              OR: [
                { personId: { in: firstHopIds } },
                { relatedPersonId: { in: firstHopIds } },
              ],
            },
            {
              NOT: [
                { personId },
                { relatedPersonId: personId },
              ],
            },
          ],
        },
        select: relationSelect(),
        orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
        take: secondHopLimit * 3,
      })
    : [];

  const graph = buildGraph(center, firstHopRows, secondHopRows, firstHopIds, secondHopLimit);
  return graph;
}

function buildGraph(
  center: PersonRow,
  firstHopRows: RelationRow[],
  secondHopRows: RelationRow[],
  firstHopIds: string[],
  secondHopLimit: number
): RelationshipGraph {
  const nodes = new Map<string, RelationshipGraphPerson>();
  const edges = new Map<string, RelationshipGraphEdge>();
  const firstHopSet = new Set(firstHopIds);

  addNode(nodes, center, 0);

  for (const row of firstHopRows) {
    const other = otherPerson(row, center.id);
    if (!other || !firstHopSet.has(other.id)) continue;
    addNode(nodes, other, 1);
    addEdge(edges, orientEdge(row, center.id, other.id));
  }

  const secondHopCandidates = new Map<string, { person: PersonRow; score: number }>();
  const usableSecondRows: RelationRow[] = [];

  for (const row of secondHopRows) {
    const firstHopId = firstHopIds.find(id => row.personId === id || row.relatedPersonId === id);
    if (!firstHopId) continue;
    const secondPerson = otherPerson(row, firstHopId);
    if (!secondPerson || secondPerson.id === center.id || firstHopSet.has(secondPerson.id)) continue;
    usableSecondRows.push(row);

    const score = relationScore(row);
    const existing = secondHopCandidates.get(secondPerson.id);
    if (!existing || score > existing.score) {
      secondHopCandidates.set(secondPerson.id, { person: secondPerson, score });
    }
  }

  const secondHopIds = [...secondHopCandidates.entries()]
    .sort(([, left], [, right]) => right.score - left.score || left.person.name.localeCompare(right.person.name))
    .slice(0, secondHopLimit)
    .map(([id]) => id);
  const secondHopSet = new Set(secondHopIds);

  for (const id of secondHopIds) {
    const candidate = secondHopCandidates.get(id);
    if (candidate) addNode(nodes, candidate.person, 2);
  }

  for (const row of usableSecondRows) {
    const firstHopId = firstHopIds.find(id => row.personId === id || row.relatedPersonId === id);
    if (!firstHopId) continue;
    const secondPerson = otherPerson(row, firstHopId);
    if (!secondPerson || !secondHopSet.has(secondPerson.id)) continue;
    addEdge(edges, orientEdge(row, firstHopId, secondPerson.id));
  }

  const allEdges = [...edges.values()];
  return {
    center: toGraphPerson(center, 0),
    nodes: [...nodes.values()],
    edges: allEdges,
    paths: buildPaths(center.id, firstHopIds, allEdges, nodes),
    stats: {
      firstHopPeople: firstHopIds.length,
      secondHopPeople: secondHopIds.length,
      evidenceEdges: allEdges.filter(edge => hasEvidence(edge)).length,
      lowConfidenceEdges: allEdges.filter(edge => typeof edge.confidence === 'number' && edge.confidence < 0.75).length,
    },
  };
}

function rankedFirstHopNodes(centerId: string, rows: RelationRow[]): PersonRow[] {
  const people = new Map<string, { person: PersonRow; score: number }>();
  for (const row of rows) {
    const person = otherPerson(row, centerId);
    if (!person) continue;
    const score = relationScore(row);
    const existing = people.get(person.id);
    if (!existing || score > existing.score) {
      people.set(person.id, { person, score });
    }
  }

  return [...people.values()]
    .sort((left, right) => right.score - left.score || left.person.name.localeCompare(right.person.name))
    .map(item => item.person);
}

function buildPaths(
  centerId: string,
  firstHopIds: string[],
  edges: RelationshipGraphEdge[],
  nodes: Map<string, RelationshipGraphPerson>
): RelationshipGraphPath[] {
  const firstEdges = edges.filter(edge => edge.sourceId === centerId && firstHopIds.includes(edge.targetId));
  const paths: RelationshipGraphPath[] = [];

  for (const firstEdge of firstEdges) {
    const secondEdges = edges.filter(edge => edge.sourceId === firstEdge.targetId && nodes.get(edge.targetId)?.depth === 2);
    const viaPerson = nodes.get(firstEdge.targetId);
    if (!viaPerson) continue;

    for (const secondEdge of secondEdges) {
      const targetPerson = nodes.get(secondEdge.targetId);
      if (!targetPerson) continue;
      paths.push({
        viaPersonId: viaPerson.id,
        viaPersonName: viaPerson.name,
        targetPersonId: targetPerson.id,
        targetPersonName: targetPerson.name,
        firstRelationType: firstEdge.relationType,
        secondRelationType: secondEdge.relationType,
        confidence: Math.min(firstEdge.confidence ?? 0.8, secondEdge.confidence ?? 0.8),
        evidenceCount: [firstEdge, secondEdge].filter(hasEvidence).length,
      });
    }
  }

  return paths
    .sort((left, right) => right.confidence - left.confidence || right.evidenceCount - left.evidenceCount)
    .slice(0, 12);
}

function addNode(nodes: Map<string, RelationshipGraphPerson>, person: PersonRow, depth: 0 | 1 | 2) {
  const existing = nodes.get(person.id);
  if (existing && existing.depth <= depth) return;
  nodes.set(person.id, toGraphPerson(person, depth));
}

function addEdge(edges: Map<string, RelationshipGraphEdge>, edge: RelationshipGraphEdge) {
  const key = `${edge.sourceId}:${edge.targetId}:${edge.relationType}`;
  const existing = edges.get(key);
  if (!existing || relationEdgeScore(edge) > relationEdgeScore(existing)) {
    edges.set(key, edge);
  }
}

function orientEdge(row: RelationRow, sourceId: string, targetId: string): RelationshipGraphEdge {
  const relationType = row.personId === sourceId && row.relatedPersonId === targetId
    ? row.relationType
    : REVERSE_RELATION_TYPE[row.relationType] || row.relationType;

  return {
    id: `${row.id}:${sourceId}:${targetId}`,
    sourceId,
    targetId,
    relationType,
    reviewStatus: row.reviewStatus,
    confidence: row.confidence,
    evidenceUrl: row.evidenceUrl,
    evidenceNote: row.evidenceNote,
    description: row.description,
  };
}

function otherPerson(row: RelationRow, personId: string): PersonRow | null {
  if (row.personId === personId) return row.relatedPerson;
  if (row.relatedPersonId === personId) return row.person;
  return null;
}

function relationScore(row: RelationRow): number {
  return (row.confidence ?? 0.8) * 10
    + (RELATION_PRIORITY[row.relationType] || 1)
    + (row.evidenceUrl ? 1 : 0)
    + (row.evidenceNote ? 0.5 : 0);
}

function relationEdgeScore(edge: RelationshipGraphEdge): number {
  return (edge.confidence ?? 0.8) * 10
    + (RELATION_PRIORITY[edge.relationType] || 1)
    + (edge.evidenceUrl ? 1 : 0)
    + (edge.evidenceNote ? 0.5 : 0);
}

function hasEvidence(edge: Pick<RelationshipGraphEdge, 'evidenceUrl' | 'evidenceNote' | 'description'>): boolean {
  return Boolean(edge.evidenceUrl || edge.evidenceNote || edge.description);
}

function toGraphPerson(person: PersonRow, depth: 0 | 1 | 2): RelationshipGraphPerson {
  return {
    id: person.id,
    name: person.name,
    avatarUrl: person.avatarUrl,
    currentTitle: person.currentTitle,
    organization: person.organization,
    depth,
  };
}

function trustedRelationWhere(personId: string) {
  return {
    OR: [
      { personId },
      { relatedPersonId: personId },
    ],
    reviewStatus: { in: ['trusted', 'confirmed'] },
    confidence: { gte: MIN_DEFAULT_RELATION_CONFIDENCE },
  };
}

function relationSelect() {
  return {
    id: true,
    personId: true,
    relatedPersonId: true,
    relationType: true,
    description: true,
    reviewStatus: true,
    evidenceUrl: true,
    evidenceNote: true,
    confidence: true,
    person: {
      select: personSelect(),
    },
    relatedPerson: {
      select: personSelect(),
    },
  } as const;
}

function personSelect() {
  return {
    id: true,
    name: true,
    avatarUrl: true,
    currentTitle: true,
    organization: true,
  } as const;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
