import { translateBatch } from '@/lib/ai/translator';
import { prisma } from '@/lib/db/prisma';

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
  if (rawData.length === 0) return;

  // 1. 收集需要翻译的文本
  const textsToTranslate: string[] = [];
  rawData.forEach(item => {
    textsToTranslate.push(item.orgName);
    if (item.role) textsToTranslate.push(item.role);
  });

  // 2. 批量翻译
  const translations = await translateBatch(textsToTranslate);

  // 3. 重建翻译映射
  const translateMap = new Map<string, string>();
  let idx = 0;
  rawData.forEach(item => {
    translateMap.set(item.orgName, translations[idx++] || item.orgName);
    if (item.role) {
      translateMap.set(item.role, translations[idx++] || item.role);
    }
  });

  // 4. 保存到数据库
  for (const item of rawData) {
    const orgType = item.type === 'education' ? 'university' : 'company';

    // Upsert Organization
    const org = await prisma.organization.upsert({
      where: { wikidataQid: item.orgQid || `no-qid-${item.orgName}` },
      create: {
        name: item.orgName,
        nameZh: translateMap.get(item.orgName),
        type: orgType,
        wikidataQid: item.orgQid,
      },
      update: {
        // 更新中文名（如果之前没有）
        nameZh: translateMap.get(item.orgName),
      },
    });

    // Create or Update PersonRole (handle null startDate manually since compound unique can't have null)
    const startDate = item.startDate ? new Date(item.startDate) : null;
    const endDate = item.endDate ? new Date(item.endDate) : null;
    const role = item.role || (item.type === 'education' ? 'student' : 'employee');
    const roleZh = translateMap.get(item.role || '') || (item.type === 'education' ? '学生' : '员工');

    // Find existing role
    const existing = await prisma.personRole.findFirst({
      where: {
        personId,
        organizationId: org.id,
        role,
        startDate,
      },
    });

    if (existing) {
      // Update existing
      await prisma.personRole.update({
        where: { id: existing.id },
        data: {
          roleZh,
          endDate,
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
