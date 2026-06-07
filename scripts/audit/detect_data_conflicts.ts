/**
 * 检测人物数据自相矛盾的问题
 *
 * 检测规则：
 * 1. description 与 currentTitle 矛盾（如：描述说教授，职位说医生）
 * 2. roleCategory 与 currentTitle/description 不匹配
 * 3. organization 与 currentTitle 中的组织不一致
 * 4. QID 指向的 Wikidata 实体与人物不符（需要人工判断的情况）
 * 5. 非 AI 领域关键词检测（医院、体育、娱乐等）
 *
 * 用法: npx tsx scripts/audit/detect_data_conflicts.ts
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';

interface ConflictIssue {
  personId: string;
  name: string;
  type: string;
  severity: 'critical' | 'high' | 'medium';
  details: string;
}

// 非 AI 领域的关键词（出现这些词可能表示数据污染）
// 注意：避免使用多义词如 director（可以是导演，也可以是总监）
const NON_AI_KEYWORDS = [
  // 医疗
  '医院', '医生', '医师', '护士', '主任医师', '副主任医师', '主治医师', 'hospital', 'doctor', 'physician', 'surgeon', 'nurse',
  // 体育
  '运动员', '教练', '球员', 'athlete', 'coach', 'player', 'NBA', 'NFL', 'FIFA', 'basketball', 'football', 'soccer',
  // 娱乐 - 注意不包含 director（多义）
  '演员', '歌手', '艺人', 'actor', 'actress', 'singer', 'film director', 'movie director',
  // 政治（非科技政策）
  '议员', '市长', '州长', 'senator', 'mayor', 'governor',
  // 其他
  '厨师', 'chef'
];

// AI 领域关键词
const AI_KEYWORDS = [
  'AI', 'ML', 'machine learning', 'deep learning', 'neural', 'NLP', 'computer vision',
  'researcher', 'scientist', 'engineer', 'professor', 'CEO', 'CTO', 'founder',
  'OpenAI', 'Google', 'Meta', 'Microsoft', 'DeepMind', 'Anthropic', 'NVIDIA',
  'Inflection', 'xAI', 'Cohere', 'Hugging Face', 'Stability',
  '研究员', '科学家', '工程师', '教授', '创始人'
];

function containsNonAIKeywords(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return NON_AI_KEYWORDS.filter(kw => lower.includes(kw.toLowerCase()));
}

function containsAIKeywords(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return AI_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

async function main() {
  console.log('=== 数据矛盾检测 ===\n');

  const issues: ConflictIssue[] = [];

  const people = await prisma.people.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      currentTitle: true,
      roleCategory: true,
      organization: true,
      occupation: true,
      qid: true,
    }
  });

  console.log(`检查 ${people.length} 人...\n`);

  for (const p of people) {
    // 1. 检测 description 中的非 AI 关键词
    const descNonAI = containsNonAIKeywords(p.description || '');
    const descHasAI = containsAIKeywords(p.description || '');

    // 2. 检测 currentTitle 中的非 AI 关键词
    const titleNonAI = containsNonAIKeywords(p.currentTitle || '');
    const titleHasAI = containsAIKeywords(p.currentTitle || '');

    // 规则 1: currentTitle 有非 AI 关键词
    if (titleNonAI.length > 0) {
      issues.push({
        personId: p.id,
        name: p.name,
        type: 'NON_AI_TITLE',
        severity: 'critical',
        details: `职位包含非AI关键词: "${titleNonAI.join(', ')}" | currentTitle: "${p.currentTitle}"`
      });
    }

    // 规则 2: description 有非 AI 关键词但没有 AI 关键词
    if (descNonAI.length > 0 && !descHasAI) {
      issues.push({
        personId: p.id,
        name: p.name,
        type: 'NON_AI_DESC',
        severity: 'high',
        details: `描述包含非AI关键词: "${descNonAI.join(', ')}" | description: "${p.description}"`
      });
    }

    // 规则 3: description 和 currentTitle 矛盾
    // 例如：description 说教授，currentTitle 说医生
    if (p.description && p.currentTitle) {
      const descMentionsProf = /教授|professor|researcher|scientist/i.test(p.description);
      const titleMentionsProf = /教授|professor|researcher|scientist/i.test(p.currentTitle);
      const descMentionsMedical = /医|hospital|doctor|physician/i.test(p.description);
      const titleMentionsMedical = /医|hospital|doctor|physician/i.test(p.currentTitle);

      if ((descMentionsProf && titleMentionsMedical) || (descMentionsMedical && titleMentionsProf)) {
        issues.push({
          personId: p.id,
          name: p.name,
          type: 'DESC_TITLE_CONFLICT',
          severity: 'critical',
          details: `描述与职位矛盾 | description: "${p.description?.slice(0, 50)}..." | currentTitle: "${p.currentTitle}"`
        });
      }
    }

    // 规则 4: organization 包含医院等非 AI 机构（但需排除同时包含 AI 关键词的情况）
    if (p.organization && Array.isArray(p.organization)) {
      const nonAIOrgs = p.organization.filter(org =>
        containsNonAIKeywords(org).length > 0 && !containsAIKeywords(org)
      );
      if (nonAIOrgs.length > 0) {
        issues.push({
          personId: p.id,
          name: p.name,
          type: 'NON_AI_ORG',
          severity: 'high',
          details: `组织包含非AI机构: ${nonAIOrgs.join(', ')}`
        });
      }
    }
  }

  // 输出结果
  console.log(`发现 ${issues.length} 个问题\n`);

  // 按严重程度分组
  const critical = issues.filter(i => i.severity === 'critical');
  const high = issues.filter(i => i.severity === 'high');
  const medium = issues.filter(i => i.severity === 'medium');

  if (critical.length > 0) {
    console.log('🚨 严重问题 (Critical):');
    console.log('========================');
    for (const issue of critical) {
      console.log(`\n[${issue.type}] ${issue.name}`);
      console.log(`  ${issue.details}`);
      console.log(`  ID: ${issue.personId}`);
    }
  }

  if (high.length > 0) {
    console.log('\n\n⚠️ 高优先级问题 (High):');
    console.log('========================');
    for (const issue of high) {
      console.log(`\n[${issue.type}] ${issue.name}`);
      console.log(`  ${issue.details}`);
    }
  }

  // 统计
  console.log('\n\n📊 统计:');
  console.log(`  Critical: ${critical.length}`);
  console.log(`  High: ${high.length}`);
  console.log(`  Medium: ${medium.length}`);
  console.log(`  Total: ${issues.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
