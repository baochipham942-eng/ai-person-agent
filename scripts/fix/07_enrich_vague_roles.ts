/**
 * 优化笼统职位描述
 *
 * 问题：很多职位描述过于笼统（如 "Employee", "员工"）
 * 解决：
 * 1. 重新从 Wikidata 获取更精确的 position held (P39) 信息
 * 2. 对于仍然笼统的职位，使用 AI 根据人物背景推测合适的职位
 *
 * 用法: npx tsx scripts/fix/07_enrich_vague_roles.ts [--dry-run] [--use-ai] [--limit=N]
 */

import { prisma } from '../../lib/db/prisma';
import { translateBatch } from '../../lib/ai/translator';
import { chatStructuredCompletion, type ChatMessage } from '../../lib/ai/deepseek';

const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 笼统的职位关键词
const VAGUE_ROLES = [
  'employee', '员工',
  'worker', '工作人员',
  'staff', '职员',
  'member', '成员'
];

function isVagueRole(role: string): boolean {
  const roleLower = role.toLowerCase();
  return VAGUE_ROLES.some(v => roleLower === v || roleLower === v.toLowerCase());
}

interface PositionHeld {
  positionLabel: string;
  orgLabel: string;
  orgQid?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * 从 Wikidata 获取更精确的 position held (P39) 信息
 */
async function getPositionsHeld(qid: string): Promise<PositionHeld[]> {
  const sparql = `
    SELECT ?positionLabel ?orgLabel ?org ?start ?end WHERE {
      wd:${qid} p:P39 ?stmt .
      ?stmt ps:P39 ?position .
      OPTIONAL { ?stmt pq:P642 ?org . }
      OPTIONAL { ?stmt pq:P580 ?start . }
      OPTIONAL { ?stmt pq:P582 ?end . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?start)
  `;

  try {
    const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(sparql)}&format=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AI-Person-Agent/1.0' }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.results.bindings.map((b: any) => ({
      positionLabel: b.positionLabel?.value || '',
      orgLabel: b.orgLabel?.value || '',
      orgQid: b.org?.value?.replace('http://www.wikidata.org/entity/', ''),
      startDate: b.start?.value,
      endDate: b.end?.value
    }));
  } catch (error) {
    console.error(`获取 P39 数据失败:`, error);
    return [];
  }
}

/**
 * 使用 AI 推测更精确的职位
 */
async function inferRoleByAI(
  personName: string,
  orgName: string,
  occupation: string[],
  existingRoles: string[]
): Promise<{ role: string; roleZh: string } | null> {
  const systemPrompt = `你是一个 AI 行业专家。根据人物的职业背景，推测其在特定公司的职位。

要求：
1. 返回一个合适的职位名称（英文）和中文翻译
2. 职位应该具体（如 Research Scientist、Software Engineer、VP of Engineering）
3. 如果无法确定，返回 null

返回 JSON: { "role": "英文职位", "roleZh": "中文职位" } 或 null`;

  const userPrompt = `人物: ${personName}
职业/头衔: ${occupation.join(', ')}
公司: ${orgName}
该人物在其他公司的职位: ${existingRoles.slice(0, 5).join(', ')}

请推测该人物在 ${orgName} 的职位。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const result = await chatStructuredCompletion<{ role: string; roleZh: string } | null>(messages, {
      temperature: 0.3,
      maxTokens: 100
    });

    if (result && result.role && result.role.toLowerCase() !== 'employee') {
      return result;
    }
    return null;
  } catch (error) {
    console.error('AI 推测职位失败:', error);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const useAI = args.includes('--use-ai');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  console.log('🔧 优化笼统职位描述\n');
  console.log(`模式: ${dryRun ? '预览(dry-run)' : '实际执行'}`);
  console.log(`使用 AI: ${useAI ? '是' : '否'}`);
  console.log(`限制数量: ${limit || '无限制'}\n`);

  // 1. 查找所有笼统职位的记录
  const vagueRoles = await prisma.personRole.findMany({
    where: {
      OR: VAGUE_ROLES.map(r => ({ role: { equals: r, mode: 'insensitive' as const } }))
    },
    include: {
      person: {
        select: {
          id: true,
          name: true,
          qid: true,
          occupation: true,
          roles: {
            select: { role: true },
            where: {
              NOT: VAGUE_ROLES.map(r => ({ role: { equals: r, mode: 'insensitive' as const } }))
            },
            take: 10
          }
        }
      },
      organization: { select: { name: true, nameZh: true, wikidataQid: true } }
    },
    take: limit
  });

  console.log(`📋 找到 ${vagueRoles.length} 条笼统职位记录\n`);

  let wikidataFixedCount = 0;
  let aiFixedCount = 0;
  let unchangedCount = 0;

  // 按人物分组处理
  const peopleMap = new Map<string, typeof vagueRoles>();
  for (const role of vagueRoles) {
    const personId = role.personId;
    if (!peopleMap.has(personId)) {
      peopleMap.set(personId, []);
    }
    peopleMap.get(personId)!.push(role);
  }

  for (const [personId, roles] of peopleMap) {
    const person = roles[0].person;
    console.log(`\n👤 ${person.name} (${person.qid})`);
    console.log(`   职业: ${person.occupation.join(', ')}`);

    // 先从 Wikidata 获取 P39 信息
    const positions = await getPositionsHeld(person.qid);
    await sleep(300);

    if (positions.length > 0) {
      console.log(`   Wikidata P39 找到 ${positions.length} 条职位记录:`);
      positions.slice(0, 5).forEach(p => {
        console.log(`   - ${p.positionLabel} @ ${p.orgLabel || '(无机构)'}`);
      });
    }

    for (const role of roles) {
      const orgName = role.organization.nameZh || role.organization.name;
      console.log(`\n   处理: ${role.role} @ ${orgName}`);

      // 尝试从 P39 匹配
      const matchedPosition = positions.find(p => {
        if (p.orgQid && p.orgQid === role.organization.wikidataQid) return true;
        if (p.orgLabel && p.orgLabel.toLowerCase().includes(role.organization.name.toLowerCase())) return true;
        if (p.orgLabel && role.organization.name.toLowerCase().includes(p.orgLabel.toLowerCase())) return true;
        return false;
      });

      if (matchedPosition && matchedPosition.positionLabel) {
        // 翻译职位
        const translations = await translateBatch([matchedPosition.positionLabel]);
        const roleZh = translations[0] || matchedPosition.positionLabel;

        console.log(`   ✓ Wikidata 匹配: ${matchedPosition.positionLabel} (${roleZh})`);

        if (!dryRun) {
          await prisma.personRole.update({
            where: { id: role.id },
            data: {
              role: matchedPosition.positionLabel,
              roleZh: roleZh
            }
          });
        }
        wikidataFixedCount++;
        continue;
      }

      // 如果 Wikidata 没找到，尝试 AI 推测
      if (useAI) {
        const existingRoles = person.roles.map(r => r.role);
        const aiResult = await inferRoleByAI(
          person.name,
          role.organization.name,
          person.occupation,
          existingRoles
        );
        await sleep(200);

        if (aiResult) {
          console.log(`   ✓ AI 推测: ${aiResult.role} (${aiResult.roleZh})`);

          if (!dryRun) {
            await prisma.personRole.update({
              where: { id: role.id },
              data: {
                role: aiResult.role,
                roleZh: aiResult.roleZh
              }
            });
          }
          aiFixedCount++;
          continue;
        }
      }

      console.log(`   ✗ 无法确定更精确的职位`);
      unchangedCount++;
    }
  }

  console.log('\n\n📊 处理完成');
  console.log(`  笼统职位总数: ${vagueRoles.length}`);
  console.log(`  Wikidata 修复: ${wikidataFixedCount}`);
  console.log(`  AI 推测修复: ${aiFixedCount}`);
  console.log(`  未能修复: ${unchangedCount}`);

  if (dryRun) {
    console.log('\n提示: 使用 --dry-run 参数仅预览，去掉该参数以实际执行修复');
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
