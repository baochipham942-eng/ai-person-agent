export type PersonRoleKind =
  | 'employment'
  | 'education'
  | 'board'
  | 'advisor'
  | 'investment'
  | 'project'
  | 'course'
  | 'fellowship'
  | 'membership'
  | 'service';

export type TimelineRoleCategory = 'career' | 'education' | 'investment' | 'affiliation';

export interface PersonRoleKindInput {
  role?: string | null;
  roleZh?: string | null;
  organizationName?: string | null;
  organizationNameZh?: string | null;
  organizationType?: string | null;
  organization?: {
    name?: string | null;
    nameZh?: string | null;
    type?: string | null;
  } | null;
}

function normalizeText(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function roleText(role: PersonRoleKindInput): string {
  return normalizeText(role.role, role.roleZh);
}

function orgText(role: PersonRoleKindInput): string {
  return normalizeText(
    role.organizationName,
    role.organizationNameZh,
    role.organization?.name,
    role.organization?.nameZh
  );
}

function orgTypeText(role: PersonRoleKindInput): string {
  return normalizeText(role.organizationType, role.organization?.type);
}

export function normalizeEmployerName(name: string | null | undefined): string {
  const normalized = (name || '')
    .toLowerCase()
    .replace(/\(.*?\)|（.*?）/g, '')
    .replace(/\b(inc|ltd|llc|corp|co|company)\b\.?/g, '')
    .replace(/公司|集团|有限|股份|责任|科技|文化|传媒|影业/g, '')
    .replace(/[^a-z0-9一-龥]/g, '')
    .trim();

  if (/alphabet|google|deepmind|字母表|谷歌/.test(normalized)) return 'alphabet-google';
  if (/huawei|华为/.test(normalized)) return 'huawei';
  if (/丽泽/.test(normalized)) return 'lize';

  return normalized;
}

export function isStudentRoleTitle(role: string | null | undefined): boolean {
  if (!role) return false;
  return /student|学生|本科|硕士|博士|学士|ph\.?d|m\.?s\.?|b\.?s\.?|mba|degree|alumn|校友/i.test(role);
}

export function isAcademicLikeOrganization(role: PersonRoleKindInput): boolean {
  const type = orgTypeText(role);
  const org = orgText(role);

  if (/university|college|school|academy/.test(type)) return true;
  return /universit|college|school|academy|école|大学|学院|研究院|研究所|学位|中学|高级中学|stanford hai|stanford digital economy lab|human-centered ai|berkeley ai research|\bbair\b|\bmila\b|\bcifar\b|vector institute|institute for advanced study/i.test(org);
}

export function classifyPersonRoleKind(role: PersonRoleKindInput): PersonRoleKind {
  const title = roleText(role);
  const org = orgText(role);
  const combined = `${title} ${org}`;

  if (isStudentRoleTitle(title) || isAcademicLikeOrganization(role)) {
    return 'education';
  }

  if (/army reserve|air force reserve|navy reserve|military reserve|工商联|政协|人大|chamber of commerce/.test(combined)) {
    return 'service';
  }

  if (/joined company|joined/.test(title)) {
    return 'membership';
  }

  if (/board member|board of directors|board chair|chair of the board|董事会|董事局|理事会|trustee|non[- ]executive director|independent director/.test(combined)) {
    return 'board';
  }

  if ((/^director$|^董事$|常务董事|chairman|chairwoman/.test(title)) && !/executive chair/.test(title)) {
    return 'board';
  }

  if (/advisor|adviser|advisory|顾问|顾问委员会/.test(title)) {
    return 'advisor';
  }

  if (/consultant|consulting/.test(title) && /independent|freelance|self-employed|独立|个人/.test(org)) {
    return 'advisor';
  }

  if (/venture partner|investor|angel|投资人|投资合伙人/.test(title) || (/partner|合伙人/.test(title) && /venture|capital|fund|ventures|y combinator|vc|创投|资本|基金/.test(org))) {
    return 'investment';
  }

  if (/instructor|lecturer|course|teacher|讲师|授课|主讲|课程/.test(title)) {
    return 'course';
  }

  if (/principal investigator|project|program|initiative|imagenet|ai2050|m-lab|measurement lab|项目|计划|倡议/.test(combined)) {
    return 'project';
  }

  if (/fellow|fellowship|研究员|访问学者/.test(title)) {
    return 'fellowship';
  }

  if (/member|委员|会员/.test(title) && !/member of technical staff|technical staff member/.test(title)) {
    return 'membership';
  }

  return 'employment';
}

export function isPrimaryEmploymentRole(role: PersonRoleKindInput): boolean {
  return classifyPersonRoleKind(role) === 'employment';
}

export function getTimelineRoleCategory(role: PersonRoleKindInput): TimelineRoleCategory {
  const kind = classifyPersonRoleKind(role);
  if (kind === 'education') return 'education';
  if (kind === 'investment') return 'investment';
  if (kind === 'employment') return 'career';
  return 'affiliation';
}
