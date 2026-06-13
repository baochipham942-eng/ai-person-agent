import { translateBatch } from '@/lib/ai/translator';

export interface CareerItem {
  type: 'education' | 'career' | 'award';
  title: string;          // School or Company or Award Name
  subtitle?: string;      // Degree or Position
  location?: string;
  startDate?: string;     // ISO Date string
  endDate?: string;       // ISO Date string
  description?: string;
}

// 新增：带原始英文的结构化数据
export interface RawCareerData {
  type: 'education' | 'career' | 'career_position' | 'award';
  orgName: string;           // 英文机构名
  orgQid?: string;           // 机构 Wikidata QID
  role?: string;             // 英文职位
  startDate?: string;
  endDate?: string;
}

const ORG_ALIASES = new Map<string, string>([
  ['openai foundation', 'OpenAI'],
  ['openai基金会', 'OpenAI'],
  ['开放人工智能基金会', 'OpenAI'],
  ['tesla, inc.', 'Tesla'],
  ['特斯拉公司', 'Tesla'],
]);

const POSITION_AS_ORG = new Set([
  'chief executive officer',
  'ceo',
  'chief technology officer',
  'cto',
  'founder',
  'co-founder',
  'research scientist',
  'computer scientist',
  'entrepreneur',
  'professor',
  'researcher',
  'engineer',
  'student',
  'employee',
]);

const VAGUE_CAREER_ROLES = new Set(['employee', 'staff', 'worker', '员工', '雇员']);
const VAGUE_EDUCATION_ROLES = new Set(['student', '学生']);

async function loadPrisma() {
  const db = await import('@/lib/db/prisma');
  return db.prisma;
}

function cleanName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeCareerOrgName(orgName: string): string {
  const cleaned = cleanName(orgName);
  return ORG_ALIASES.get(cleaned.toLowerCase()) || cleaned;
}

export function normalizeCareerRole(role: string | undefined, type: RawCareerData['type']): string {
  const cleaned = cleanName(role || '');
  if (cleaned) return cleaned;
  return type === 'education' ? 'Student' : 'Employee';
}

export function isVagueCareerRole(role: string | undefined, type: RawCareerData['type']): boolean {
  const normalized = cleanName(role || '').toLowerCase();
  if (!normalized) return true;
  if (type === 'education') return VAGUE_EDUCATION_ROLES.has(normalized);
  return VAGUE_CAREER_ROLES.has(normalized);
}

function normalizeRawCareerData(rawData: RawCareerData[]): RawCareerData[] {
  const seen = new Set<string>();
  const normalized: RawCareerData[] = [];

  for (const item of rawData) {
    const orgName = normalizeCareerOrgName(item.orgName);
    if (!orgName) continue;

    const orgKey = orgName.toLowerCase();
    if (item.type !== 'education' && POSITION_AS_ORG.has(orgKey) && !item.role) continue;

    const role = item.role ? normalizeCareerRole(item.role, item.type) : undefined;
    const key = [
      item.type,
      orgKey,
      (role || '').toLowerCase(),
      item.startDate || '',
      item.endDate || '',
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ ...item, orgName, role });
  }

  return normalized;
}

function safeDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const normalized = dateStr
    .replace(/^\+/, '')
    .replace(/-00-00/, '-01-01')
    .replace(/-00T/, '-01T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameDate(a: Date | null, b: Date | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

function rangesProbablySame(
  aStart: Date | null,
  aEnd: Date | null,
  bStart: Date | null,
  bEnd: Date | null
): boolean {
  if (sameDate(aStart, bStart)) return true;
  if (!aStart || !bStart) return true;
  const aEndValue = aEnd?.getTime() ?? Number.POSITIVE_INFINITY;
  const bEndValue = bEnd?.getTime() ?? Number.POSITIVE_INFINITY;
  return aStart.getTime() <= bEndValue && bStart.getTime() <= aEndValue;
}

/**
 * 从 Wikidata 抓取原始职业数据（不翻译）
 */
export async function fetchRawCareerData(qid: string): Promise<RawCareerData[]> {
  try {
    const sparql = `
      SELECT ?type ?item ?itemLabel ?roleLabel ?relatedItem ?relatedItemLabel ?start ?end WHERE {
        BIND(wd:${qid} AS ?person)
        
        {
          # Education (P69)
          ?person p:P69 ?stmt .
          ?stmt ps:P69 ?item .
          OPTIONAL { ?stmt pq:P512 ?role . } # Degree
          OPTIONAL { ?stmt pq:P580 ?start . }
          OPTIONAL { ?stmt pq:P582 ?end . }
          BIND("education" AS ?type)
        }
        UNION
        {
          # Employer (P108)
          ?person p:P108 ?stmt .
          ?stmt ps:P108 ?item .
          OPTIONAL { ?stmt pq:P39 ?role . }
          OPTIONAL { ?stmt pq:P580 ?start . }
          OPTIONAL { ?stmt pq:P582 ?end . }
          BIND("career" AS ?type)
        }
        UNION
        {
          # Position held (P39) - Critical for "CEO of OpenAI"
          ?person p:P39 ?stmt .
          ?stmt ps:P39 ?item .
          OPTIONAL { ?stmt pq:P642 ?relatedItem . } # "of" (e.g. CEO of Google)
          OPTIONAL { ?stmt pq:P580 ?start . }
          OPTIONAL { ?stmt pq:P582 ?end . }
          BIND("career_position" AS ?type)
        }

        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      ORDER BY DESC(?start)
    `;

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AiPersonAgent/1.0' }
    });

    if (!response.ok) return [];

    const data = await response.json();
    const items: RawCareerData[] = [];
    const seen = new Set<string>();

    for (const binding of data.results.bindings) {
      let orgName = binding.itemLabel?.value || '';
      let orgQid = binding.item?.value?.replace('http://www.wikidata.org/entity/', '');
      let role = binding.roleLabel?.value;
      const type = binding.type?.value as RawCareerData['type'];

      // Position held (P39): item = role, relatedItem = organization
      if (type === 'career_position' && binding.relatedItemLabel?.value) {
        role = orgName; // "chief executive officer"
        orgName = binding.relatedItemLabel.value; // "OpenAI"
        orgQid = binding.relatedItem?.value?.replace('http://www.wikidata.org/entity/', '');
      } else if (type === 'career_position') {
        continue;
      }

      // Skip if no org name
      if (!orgName) continue;

      // Dedup key
      const key = `${orgName}-${role || ''}-${binding.start?.value || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        type,
        orgName,
        orgQid,
        role,
        startDate: binding.start?.value,
        endDate: binding.end?.value,
      });
    }

    return items;
  } catch (error) {
    console.error('Error fetching raw career data:', error);
    return [];
  }
}

/**
 * 保存职业数据到 Organization + PersonRole 表
 */
export async function savePersonRoles(
  personId: string,
  rawData: RawCareerData[]
): Promise<void> {
  const normalizedData = normalizeRawCareerData(rawData);
  if (normalizedData.length === 0) return;

  // 1. 收集需要翻译的文本
  const textsToTranslate = new Set<string>();
  normalizedData.forEach(item => {
    textsToTranslate.add(item.orgName);
    if (item.role) textsToTranslate.add(item.role);
  });

  // 2. 批量翻译
  const uniqueTexts = [...textsToTranslate];
  const translations = await translateBatch(uniqueTexts);

  // 3. 重建翻译映射
  const translateMap = new Map<string, string>();
  uniqueTexts.forEach((text, idx) => {
    translateMap.set(text, translations[idx] || text);
  });

  // 4. 保存到数据库
  const prisma = await loadPrisma();
  for (const item of normalizedData) {
    const orgType = item.type === 'education' ? 'university' : 'company';

    const nameZh = translateMap.get(item.orgName);
    const org = item.orgQid
      ? await prisma.organization.upsert({
        where: { wikidataQid: item.orgQid },
        create: {
          name: item.orgName,
          nameZh,
          type: orgType,
          wikidataQid: item.orgQid,
        },
        update: {
          name: item.orgName,
          nameZh,
        },
      })
      : await findOrCreateOrganization(prisma, item.orgName, nameZh, orgType);

    // Create or Update PersonRole
    const startDate = safeDate(item.startDate);
    const endDate = safeDate(item.endDate);
    const role = normalizeCareerRole(item.role, item.type);
    const roleZh = translateMap.get(item.role || '') || (item.type === 'education' ? '学生' : '员工');
    const vagueIncoming = isVagueCareerRole(role, item.type);

    const rolesAtOrg = await prisma.personRole.findMany({
      where: { personId, organizationId: org.id },
      select: { id: true, role: true, roleZh: true, startDate: true, endDate: true },
    });

    const richerExisting = rolesAtOrg.find(existing =>
      !isVagueCareerRole(existing.role, item.type) &&
      rangesProbablySame(startDate, endDate, existing.startDate, existing.endDate)
    );

    if (vagueIncoming && richerExisting) continue;

    const vagueExisting = !vagueIncoming
      ? rolesAtOrg.find(existing =>
        isVagueCareerRole(existing.role, item.type) &&
        rangesProbablySame(startDate, endDate, existing.startDate, existing.endDate)
      )
      : undefined;

    if (vagueExisting) {
      await prisma.personRole.update({
        where: { id: vagueExisting.id },
        data: {
          role,
          roleZh,
          startDate: vagueExisting.startDate ?? startDate,
          endDate: vagueExisting.endDate ?? endDate,
        },
      });
      continue;
    }

    // Find existing role
    const existing = rolesAtOrg.find(candidate =>
      candidate.role === role && sameDate(candidate.startDate, startDate)
    );

    if (existing) {
      // Update existing
      await prisma.personRole.update({
        where: { id: existing.id },
        data: {
          roleZh,
          endDate: existing.endDate ?? endDate,
        },
      });
    } else {
      // Create new
      await prisma.personRole.create({
        data: {
          personId,
          organizationId: org.id,
          role,
          roleZh,
          startDate,
          endDate,
          source: 'wikidata',
        },
      });
    }
  }
}

async function findOrCreateOrganization(
  prisma: Awaited<ReturnType<typeof loadPrisma>>,
  name: string,
  nameZh: string | undefined,
  type: string
) {
  const existing = await prisma.organization.findFirst({
    where: {
      OR: [
        { name },
        ...(nameZh ? [{ nameZh }] : []),
      ],
    },
  });

  if (existing) {
    return await prisma.organization.update({
      where: { id: existing.id },
      data: { name, nameZh: nameZh || existing.nameZh, type: existing.type || type },
    });
  }

  return await prisma.organization.create({
    data: { name, nameZh, type },
  });
}

/**
 * 原有兼容接口：返回翻译后的 CareerItem 数组
 * @deprecated 建议使用 fetchRawCareerData + savePersonRoles
 */
export async function getPersonCareer(qid: string): Promise<CareerItem[]> {
  const rawData = await fetchRawCareerData(qid);

  // 翻译
  const textsToTranslate: string[] = [];
  rawData.forEach(item => {
    textsToTranslate.push(item.orgName);
    if (item.role) textsToTranslate.push(item.role);
  });

  const translations = await translateBatch(textsToTranslate);

  let idx = 0;
  return rawData.map(item => {
    const title = translations[idx++] || item.orgName;
    const subtitle = item.role ? (translations[idx++] || item.role) : undefined;

    return {
      type: item.type === 'career_position' ? 'career' : item.type,
      title,
      subtitle,
      startDate: item.startDate,
      endDate: item.endDate,
    } as CareerItem;
  });
}
