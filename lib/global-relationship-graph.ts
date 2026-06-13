import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { normalizePublicAvatarUrl } from '@/lib/public-avatar';
import {
  getDirectoryOrganizationAliases,
  getDirectoryTopicAliases,
  normalizeDirectoryTopic,
  normalizeDirectoryTopics,
} from '@/lib/person-directory-config';

export interface GlobalRelationshipGraphNode {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  organization: string[];
  topics: string[];
  influenceScore: number;
  weeklyViewCount: number;
  isSeed: boolean;
}

export interface GlobalRelationshipGraphEdge {
  id: string;
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  relationType: string;
  reviewStatus: string | null;
  confidence: number | null;
  evidenceUrl: string | null;
  evidenceNote: string | null;
  description: string | null;
}

export interface GlobalRelationshipGraphFacet {
  label: string;
  count: number;
  href: string;
}

export interface GlobalRelationshipGraphHub {
  personId: string;
  name: string;
  isSeed: boolean;
  degree: number;
  evidenceEdges: number;
  averageConfidence: number | null;
  relationTypes: string[];
  organization: string | null;
  topic: string | null;
}

export interface GlobalRelationshipGraphPath {
  id: string;
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  relationType: string;
  confidence: number | null;
  hasEvidence: boolean;
}

export interface GlobalRelationshipGraph {
  status: 'ready' | 'degraded';
  message: string | null;
  nodes: GlobalRelationshipGraphNode[];
  edges: GlobalRelationshipGraphEdge[];
  seedPeople: GlobalRelationshipGraphNode[];
  linkedPeople: GlobalRelationshipGraphNode[];
  topics: GlobalRelationshipGraphFacet[];
  organizations: GlobalRelationshipGraphFacet[];
  relationTypes: GlobalRelationshipGraphFacet[];
  hubs: GlobalRelationshipGraphHub[];
  recommendedPaths: GlobalRelationshipGraphPath[];
  stats: {
    seedPeople: number;
    linkedPeople: number;
    trustedEdges: number;
    evidenceEdges: number;
    averageConfidence: number | null;
  };
}

export interface FetchGlobalRelationshipGraphParams {
  topic?: string | null;
  organization?: string | null;
  relationType?: string | null;
  seedLimit?: number;
  edgeLimit?: number;
}

type GraphPersonRow = {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  organization: string[];
  topics: string[];
  influenceScore: number;
  weeklyViewCount: number;
};

type GraphRelationRow = {
  id: string;
  personId: string;
  relatedPersonId: string;
  relationType: string;
  reviewStatus: string | null;
  confidence: number | null;
  evidenceUrl: string | null;
  evidenceNote: string | null;
  description: string | null;
  person: GraphPersonRow;
  relatedPerson: GraphPersonRow;
};

const TRUSTED_STATUSES = ['trusted', 'confirmed'];
const DEFAULT_RELATION_TYPES = ['cofounder', 'advisor', 'advisee', 'collaborator', 'colleague', 'former_colleague'];
const MIN_DEFAULT_RELATION_CONFIDENCE = 0.75;
const GRAPH_FETCH_TIMEOUT_MS = 8000;

export async function fetchGlobalRelationshipGraph(
  params: FetchGlobalRelationshipGraphParams = {}
): Promise<GlobalRelationshipGraph> {
  const seedLimit = clampInteger(params.seedLimit, 6, 40, 18);
  const edgeLimit = clampInteger(params.edgeLimit, 12, 120, 60);
  const relationType = normalizeRelationType(params.relationType);
  const peopleWhere = buildPeopleWhere(params);

  try {
    return await withTimeout((async () => {
      const seedPeople = await prisma.people.findMany({
        where: peopleWhere,
        select: graphPersonSelect(),
        orderBy: [
          { weeklyViewCount: 'desc' },
          { influenceScore: 'desc' },
          { name: 'asc' },
        ],
        take: seedLimit,
      });
      const seedIds = seedPeople.map(person => person.id);

      const relationRows = seedIds.length > 0
        ? await prisma.personRelation.findMany({
            where: {
              reviewStatus: { in: TRUSTED_STATUSES },
              confidence: { gte: MIN_DEFAULT_RELATION_CONFIDENCE },
              ...(relationType && { relationType }),
              OR: [
                { personId: { in: seedIds } },
                { relatedPersonId: { in: seedIds } },
              ],
            },
            select: graphRelationSelect(),
            orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
            take: edgeLimit,
          })
        : [];

      return buildGraph(seedPeople, relationRows);
    })(), GRAPH_FETCH_TIMEOUT_MS);
  } catch (error) {
    console.error('Failed to fetch global relationship graph:', error);
    return createGraphFallback('关系数据暂时不可用，请稍后再试。');
  }
}

export function buildGlobalGraphHref(params: {
  topic?: string | null;
  organization?: string | null;
  relationType?: string | null;
}): string {
  const search = new URLSearchParams();
  if (params.topic) search.set('topic', params.topic);
  if (params.organization) search.set('organization', params.organization);
  if (params.relationType) search.set('relationType', params.relationType);
  const query = search.toString();
  return query ? `/graph?${query}` : '/graph';
}

export function supportedGlobalGraphRelationTypes(): string[] {
  return DEFAULT_RELATION_TYPES;
}

function buildGraph(seedPeople: GraphPersonRow[], relationRows: GraphRelationRow[]): GlobalRelationshipGraph {
  const seedIds = new Set(seedPeople.map(person => person.id));
  const nodes = new Map<string, GlobalRelationshipGraphNode>();
  const edges = new Map<string, GlobalRelationshipGraphEdge>();

  for (const person of seedPeople) {
    nodes.set(person.id, toGraphNode(person, true));
  }

  for (const row of relationRows) {
    nodes.set(row.person.id, mergeNode(nodes.get(row.person.id), row.person, seedIds.has(row.person.id)));
    nodes.set(row.relatedPerson.id, mergeNode(nodes.get(row.relatedPerson.id), row.relatedPerson, seedIds.has(row.relatedPerson.id)));
    const edge = toGraphEdge(row);
    edges.set(`${edge.sourceId}:${edge.targetId}:${edge.relationType}`, edge);
  }

  const allNodes = [...nodes.values()]
    .sort((left, right) => Number(right.isSeed) - Number(left.isSeed) || right.influenceScore - left.influenceScore || left.name.localeCompare(right.name));
  const allEdges = [...edges.values()]
    .sort((left, right) => (right.confidence || 0) - (left.confidence || 0) || left.sourceName.localeCompare(right.sourceName));
  const confidenceValues = allEdges
    .map(edge => edge.confidence)
    .filter((value): value is number => typeof value === 'number');

  return {
    status: 'ready',
    message: null,
    nodes: allNodes,
    edges: allEdges,
    seedPeople: allNodes.filter(node => node.isSeed),
    linkedPeople: allNodes.filter(node => !node.isSeed),
    topics: buildTopicFacets(allNodes),
    organizations: buildOrganizationFacets(allNodes),
    relationTypes: buildRelationTypeFacets(allEdges),
    hubs: buildGraphHubs(allNodes, allEdges),
    recommendedPaths: buildRecommendedPaths(allEdges),
    stats: {
      seedPeople: allNodes.filter(node => node.isSeed).length,
      linkedPeople: allNodes.filter(node => !node.isSeed).length,
      trustedEdges: allEdges.length,
      evidenceEdges: allEdges.filter(hasEvidence).length,
      averageConfidence: confidenceValues.length > 0
        ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2))
        : null,
    },
  };
}

function createGraphFallback(message: string): GlobalRelationshipGraph {
  return {
    status: 'degraded',
    message,
    nodes: [],
    edges: [],
    seedPeople: [],
    linkedPeople: [],
    topics: [],
    organizations: [],
    relationTypes: [],
    hubs: [],
    recommendedPaths: [],
    stats: {
      seedPeople: 0,
      linkedPeople: 0,
      trustedEdges: 0,
      evidenceEdges: 0,
      averageConfidence: null,
    },
  };
}

function buildPeopleWhere(params: FetchGlobalRelationshipGraphParams): Prisma.PeopleWhereInput {
  const filters: Prisma.PeopleWhereInput[] = [{ status: { in: ['ready', 'active'] } }];

  if (params.topic) {
    filters.push({ topics: { hasSome: getDirectoryTopicAliases(params.topic) } });
  }

  if (params.organization) {
    const aliases = getDirectoryOrganizationAliases(params.organization);
    filters.push({
      OR: [
        { organization: { hasSome: aliases } },
        { currentTitle: { contains: params.organization, mode: 'insensitive' } },
        {
          roles: {
            some: {
              organization: {
                OR: [
                  { name: { in: aliases } },
                  { nameZh: { in: aliases } },
                ],
              },
            },
          },
        },
      ],
    });
  }

  return { AND: filters };
}

function buildTopicFacets(nodes: GlobalRelationshipGraphNode[]): GlobalRelationshipGraphFacet[] {
  return topFacets(
    nodes.flatMap(node => node.topics.slice(0, 5)),
    label => buildGlobalGraphHref({ topic: label }),
    normalizeDirectoryTopic
  );
}

function buildOrganizationFacets(nodes: GlobalRelationshipGraphNode[]): GlobalRelationshipGraphFacet[] {
  return topFacets(
    nodes.flatMap(node => node.organization.slice(0, 4)),
    label => buildGlobalGraphHref({ organization: label })
  );
}

function buildRelationTypeFacets(edges: GlobalRelationshipGraphEdge[]): GlobalRelationshipGraphFacet[] {
  return topFacets(
    edges.map(edge => edge.relationType),
    label => buildGlobalGraphHref({ relationType: label })
  );
}

function buildGraphHubs(
  nodes: GlobalRelationshipGraphNode[],
  edges: GlobalRelationshipGraphEdge[]
): GlobalRelationshipGraphHub[] {
  const nodesById = new Map(nodes.map(node => [node.id, node]));
  const edgeGroups = new Map<string, GlobalRelationshipGraphEdge[]>();
  for (const edge of edges) {
    addEdge(edgeGroups, edge.sourceId, edge);
    addEdge(edgeGroups, edge.targetId, edge);
  }

  return [...edgeGroups.entries()]
    .map(([personId, personEdges]) => {
      const node = nodesById.get(personId);
      const confidenceValues = personEdges
        .map(edge => edge.confidence)
        .filter((value): value is number => typeof value === 'number');
      return {
        personId,
        name: node?.name || '未知人物',
        isSeed: Boolean(node?.isSeed),
        degree: personEdges.length,
        evidenceEdges: personEdges.filter(hasEvidence).length,
        averageConfidence: confidenceValues.length > 0
          ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2))
          : null,
        relationTypes: [...new Set(personEdges.map(edge => edge.relationType))].slice(0, 4),
        organization: node?.organization[0] || null,
        topic: node?.topics[0] || null,
      };
    })
    .filter(hub => hub.degree >= 2)
    .sort((left, right) => right.degree - left.degree || Number(right.isSeed) - Number(left.isSeed) || right.evidenceEdges - left.evidenceEdges || left.name.localeCompare(right.name))
    .slice(0, 8);
}

function buildRecommendedPaths(edges: GlobalRelationshipGraphEdge[]): GlobalRelationshipGraphPath[] {
  return edges
    .filter(hasEvidence)
    .sort((left, right) => (right.confidence || 0) - (left.confidence || 0) || left.sourceName.localeCompare(right.sourceName))
    .slice(0, 8)
    .map(edge => ({
      id: edge.id,
      sourceId: edge.sourceId,
      sourceName: edge.sourceName,
      targetId: edge.targetId,
      targetName: edge.targetName,
      relationType: edge.relationType,
      confidence: edge.confidence,
      hasEvidence: hasEvidence(edge),
    }));
}

function addEdge(
  groups: Map<string, GlobalRelationshipGraphEdge[]>,
  personId: string,
  edge: GlobalRelationshipGraphEdge
) {
  const edges = groups.get(personId) || [];
  edges.push(edge);
  groups.set(personId, edges);
}

function topFacets(
  values: string[],
  hrefFor: (label: string) => string,
  normalizeValue: (value: string) => string = value => value
): GlobalRelationshipGraphFacet[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = normalizeValue(value.trim());
    if (!label) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, href: hrefFor(label) }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 12);
}

function toGraphNode(person: GraphPersonRow, isSeed: boolean): GlobalRelationshipGraphNode {
  return {
    id: person.id,
    name: person.name,
    avatarUrl: normalizePublicAvatarUrl(person.avatarUrl),
    currentTitle: person.currentTitle,
    organization: person.organization,
    topics: normalizeDirectoryTopics(person.topics),
    influenceScore: person.influenceScore,
    weeklyViewCount: person.weeklyViewCount,
    isSeed,
  };
}

function mergeNode(
  existing: GlobalRelationshipGraphNode | undefined,
  person: GraphPersonRow,
  isSeed: boolean
): GlobalRelationshipGraphNode {
  if (!existing) return toGraphNode(person, isSeed);
  return {
    ...existing,
    isSeed: existing.isSeed || isSeed,
  };
}

function toGraphEdge(row: GraphRelationRow): GlobalRelationshipGraphEdge {
  return {
    id: row.id,
    sourceId: row.personId,
    sourceName: row.person.name,
    targetId: row.relatedPersonId,
    targetName: row.relatedPerson.name,
    relationType: row.relationType,
    reviewStatus: row.reviewStatus,
    confidence: row.confidence,
    evidenceUrl: row.evidenceUrl,
    evidenceNote: row.evidenceNote,
    description: row.description,
  };
}

function hasEvidence(edge: Pick<GlobalRelationshipGraphEdge, 'evidenceUrl' | 'evidenceNote' | 'description'>): boolean {
  return Boolean(edge.evidenceUrl || edge.evidenceNote || edge.description);
}

function normalizeRelationType(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function graphPersonSelect() {
  return {
    id: true,
    name: true,
    avatarUrl: true,
    currentTitle: true,
    organization: true,
    topics: true,
    influenceScore: true,
    weeklyViewCount: true,
  } as const;
}

function graphRelationSelect() {
  return {
    id: true,
    personId: true,
    relatedPersonId: true,
    relationType: true,
    reviewStatus: true,
    confidence: true,
    evidenceUrl: true,
    evidenceNote: true,
    description: true,
    person: { select: graphPersonSelect() },
    relatedPerson: { select: graphPersonSelect() },
  } as const;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`Graph query timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
