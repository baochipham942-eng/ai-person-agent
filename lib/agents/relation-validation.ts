const RELATION_TYPES = ['advisor', 'advisee', 'cofounder', 'colleague', 'collaborator', 'successor'] as const;
const SYMMETRIC_RELATION_TYPES = new Set(['cofounder', 'colleague', 'collaborator']);
const TRUSTED_SOURCES = new Set(['wikidata']);
const EXTERNAL_SOURCES = new Set(['exa', 'perplexity']);

export type RelationType = typeof RELATION_TYPES[number];

type PersonRow = {
  id: string;
  name: string;
};

type RoleRow = {
  personId: string;
  organizationId: string;
  role: string;
  startDate: Date | null;
  endDate: Date | null;
  organization: {
    name: string;
    nameZh: string | null;
  };
};

export interface RelationValidationInput {
  personId: string;
  relatedPersonId: string;
  relationType: string;
  source: string;
  confidence: number;
  description?: string | null;
  evidenceTexts?: string[];
  evidenceUrls?: string[];
}

export interface RelationValidationResult {
  ok: boolean;
  relationType?: RelationType;
  reasons: string[];
  evidence: string[];
}

export type RelationReviewStatus = 'trusted' | 'confirmed' | 'needs_review';

export function relationReviewFields(
  input: Pick<RelationValidationInput, 'source' | 'evidenceUrls'>,
  validation: RelationValidationResult
): {
  reviewStatus: RelationReviewStatus;
  evidenceUrl?: string;
  evidenceNote?: string;
} {
  const reviewStatus: RelationReviewStatus = input.source === 'wikidata'
    ? 'trusted'
    : validation.ok
      ? 'confirmed'
      : 'needs_review';

  return {
    reviewStatus,
    evidenceUrl: input.evidenceUrls?.find(Boolean),
    evidenceNote: validation.evidence.length > 0
      ? validation.evidence.join('; ')
      : validation.reasons.join('; '),
  };
}

type SharedRoleEvidence = {
  organizationName: string;
  personRole: RoleRow;
  relatedRole: RoleRow;
};

export async function validateRelationCandidate(
  db: any,
  input: RelationValidationInput
): Promise<RelationValidationResult> {
  const relationType = normalizeRelationType(input.relationType);
  const reasons: string[] = [];
  const evidence: string[] = [];

  if (!relationType) {
    return reject(`unsupported relation type: ${input.relationType}`);
  }

  if (input.personId === input.relatedPersonId) {
    return reject('self relation is not allowed');
  }

  if (input.confidence < 0.75 && !TRUSTED_SOURCES.has(input.source)) {
    reasons.push(`confidence below 0.75: ${input.confidence}`);
  }

  const [person, relatedPerson] = await Promise.all([
    db.people.findUnique({ where: { id: input.personId }, select: { id: true, name: true } }),
    db.people.findUnique({ where: { id: input.relatedPersonId }, select: { id: true, name: true } }),
  ]);

  if (!person || !relatedPerson) {
    return reject('person or related person does not exist');
  }

  const duplicate = await findDuplicateRelation(db, input.personId, input.relatedPersonId, relationType);
  if (duplicate) {
    return reject('relation already exists');
  }

  if (TRUSTED_SOURCES.has(input.source)) {
    return accept(relationType, ['trusted structured source']);
  }

  const sharedRoles = await getSharedRoleEvidence(db, input.personId, input.relatedPersonId);
  const deterministicEvidence = validateByRoleEvidence(relationType, sharedRoles);
  if (deterministicEvidence.length > 0) {
    return accept(relationType, deterministicEvidence);
  }

  const externalEvidence = validateByExternalEvidence(input, person.name, relatedPerson.name, relationType);
  if (externalEvidence.length > 0) {
    return accept(relationType, externalEvidence);
  }

  reasons.push('no deterministic role overlap or source-backed evidence');
  return { ok: false, relationType, reasons, evidence };

  function accept(type: RelationType, acceptedEvidence: string[]): RelationValidationResult {
    return { ok: true, relationType: type, reasons: [], evidence: acceptedEvidence };
  }

  function reject(reason: string): RelationValidationResult {
    return { ok: false, relationType: relationType || undefined, reasons: [reason], evidence: [] };
  }
}

export function normalizeRelationType(value: string): RelationType | null {
  return RELATION_TYPES.includes(value as RelationType) ? value as RelationType : null;
}

async function findDuplicateRelation(
  db: any,
  personId: string,
  relatedPersonId: string,
  relationType: RelationType
): Promise<boolean> {
  const exact = {
    personId,
    relatedPersonId,
    relationType,
  };

  const reverse = {
    personId: relatedPersonId,
    relatedPersonId: personId,
    relationType,
  };

  const existing = await db.personRelation.findFirst({
    where: {
      OR: SYMMETRIC_RELATION_TYPES.has(relationType) ? [exact, reverse] : [exact],
    },
  });

  return Boolean(existing);
}

async function getSharedRoleEvidence(
  db: any,
  personId: string,
  relatedPersonId: string
): Promise<SharedRoleEvidence[]> {
  const roles: RoleRow[] = await db.personRole.findMany({
    where: {
      personId: { in: [personId, relatedPersonId] },
    },
    include: {
      organization: true,
    },
  });

  const personRoles = roles.filter(role => role.personId === personId);
  const relatedRoles = roles.filter(role => role.personId === relatedPersonId);
  const evidence: SharedRoleEvidence[] = [];

  for (const personRole of personRoles) {
    for (const relatedRole of relatedRoles) {
      if (personRole.organizationId !== relatedRole.organizationId) continue;
      evidence.push({
        organizationName: personRole.organization.nameZh || personRole.organization.name,
        personRole,
        relatedRole,
      });
    }
  }

  return evidence;
}

function validateByRoleEvidence(type: RelationType, sharedRoles: SharedRoleEvidence[]): string[] {
  if (type === 'colleague') {
    const overlap = sharedRoles.find(shared => rolesOverlap(shared.personRole, shared.relatedRole));
    return overlap ? [`overlapping role at ${overlap.organizationName}`] : [];
  }

  if (type === 'cofounder') {
    const cofounder = sharedRoles.find(shared =>
      hasFounderRole(shared.personRole.role) && hasFounderRole(shared.relatedRole.role)
    );
    return cofounder ? [`both have founder roles at ${cofounder.organizationName}`] : [];
  }

  return [];
}

function validateByExternalEvidence(
  input: RelationValidationInput,
  personName: string,
  relatedPersonName: string,
  relationType: RelationType
): string[] {
  if (!EXTERNAL_SOURCES.has(input.source)) return [];

  const evidenceText = [...(input.evidenceTexts || []), input.description || '']
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  const hasUrl = (input.evidenceUrls || []).some(Boolean);
  const mentionsPerson = mentionsName(evidenceText, personName);
  const mentionsRelatedPerson = mentionsName(evidenceText, relatedPersonName);
  const hasKeyword = relationKeywords(relationType).some(keyword => evidenceText.includes(keyword));

  if (input.source === 'exa' && mentionsPerson && mentionsRelatedPerson && hasKeyword) {
    return [`exa text mentions both people and ${relationType}`];
  }

  if (input.source === 'perplexity' && hasUrl && mentionsRelatedPerson && hasKeyword) {
    return [`perplexity returned citations and ${relationType} evidence`];
  }

  return [];
}

function rolesOverlap(a: RoleRow, b: RoleRow): boolean {
  if (!a.startDate || !b.startDate) return false;

  const currentYear = new Date().getFullYear();
  const aStart = a.startDate.getFullYear();
  const bStart = b.startDate.getFullYear();
  const aEnd = a.endDate ? a.endDate.getFullYear() : currentYear;
  const bEnd = b.endDate ? b.endDate.getFullYear() : currentYear;

  return aStart <= bEnd && bStart <= aEnd;
}

function hasFounderRole(role: string): boolean {
  const normalized = role.toLowerCase();
  return [
    'founder',
    'cofounder',
    'co-founder',
    'co founder',
    'founding',
    '联合创始',
    '创始',
  ].some(keyword => normalized.includes(keyword));
}

function mentionsName(text: string, name: string): boolean {
  return text.includes(name.toLowerCase());
}

function relationKeywords(type: RelationType): string[] {
  switch (type) {
    case 'advisor':
    case 'advisee':
      return ['advisor', 'adviser', 'doctoral', 'phd', 'mentor', 'student', '导师', '博士', '学生', '师从'];
    case 'cofounder':
      return ['cofounder', 'co-founder', 'co founder', 'founded', 'founder', '联合创始', '共同创立'];
    case 'colleague':
      return ['colleague', 'worked with', 'worked at', 'same company', '同事', '共事'];
    case 'collaborator':
      return ['collaborator', 'collaborated', 'coauthor', 'co-author', 'paper', 'research', '合作', '论文'];
    case 'successor':
      return ['successor', 'succeeded', '接任', '继任'];
  }
}
