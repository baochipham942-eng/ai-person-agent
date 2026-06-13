/**
 * 批量采集人物的教育背景数据
 *
 * 数据来源：
 * - Perplexity AI（主要来源，结构化数据）
 * - Wikidata（辅助验证）
 *
 * 用法:
 *   npx tsx scripts/enrich/enrich_education.ts              # 处理所有缺少教育数据的人物
 *   npx tsx scripts/enrich/enrich_education.ts --limit 10   # 限制处理数量
 *   npx tsx scripts/enrich/enrich_education.ts --force      # 强制刷新已有数据
 *   npx tsx scripts/enrich/enrich_education.ts --quiet      # 静默模式
 *   npx tsx scripts/enrich/enrich_education.ts --person "Geoffrey Hinton"  # 处理指定人物
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import { Prisma } from '@prisma/client';
import { searchPerplexity } from '../../lib/datasources/perplexity';

interface Education {
  degree: string;           // 学位：PhD, MS, BS, MBA 等
  field?: string;           // 专业：Computer Science, AI, etc.
  institution: string;      // 学校名称
  institutionZh?: string;   // 学校中文名
  year?: number | string;   // 毕业年份
  yearStart?: number;       // 入学年份
  advisor?: string;         // 导师
  thesis?: string;          // 论文题目
}

// ============== 配置 ==============

const CONFIG = {
  defaultLimit: 50,
  requestDelay: 1500, // API 限流间隔
};

// ============== 解析参数 ==============

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = CONFIG.defaultLimit;
  let force = false;
  let quiet = false;
  let personName: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--force') {
      force = true;
    } else if (args[i] === '--quiet') {
      quiet = true;
    } else if (args[i] === '--person' && args[i + 1]) {
      personName = args[i + 1];
      i++;
    }
  }

  return { limit, force, quiet, personName };
}

// ============== Perplexity 查询 ==============

const SYSTEM_PROMPT = `You are a precise research assistant. Your task is to find educational background information for AI/tech professionals.

Respond ONLY in valid JSON format with this structure:
{
  "education": [
    {
      "degree": "PhD",
      "field": "Computer Science",
      "institution": "Stanford University",
      "institutionZh": "斯坦福大学",
      "year": 2015,
      "yearStart": 2010,
      "advisor": "Andrew Ng",
      "thesis": "Deep Learning for Visual Recognition"
    }
  ]
}

Important:
- degree: Use standard abbreviations (PhD, MS, BS, MBA, BA, etc.)
- field: Academic field/major
- institution: Full official name in English
- institutionZh: Chinese translation if it's a well-known university
- year: Graduation year (number)
- yearStart: Enrollment year if known
- advisor: PhD/Master advisor if known
- thesis: Dissertation/thesis title if known

If no education info found, return: {"education": []}`;

async function queryPerplexityForEducation(personName: string, aliases: string[]): Promise<Education[]> {
  const englishName = aliases.find(a => /^[a-zA-Z\s\-']+$/.test(a)) || personName;

  const query = `What is the educational background of ${englishName} (${personName})?
I need their complete academic history including:
1. All degrees (PhD, Masters, Bachelors)
2. Universities/institutions attended
3. Graduation years
4. PhD advisor (if applicable)
5. Thesis/dissertation title (if applicable)

Focus on AI/tech researchers and professionals. Provide accurate, verified information only.`;

  try {
    const response = await searchPerplexity(query, SYSTEM_PROMPT, {
      temperature: 0.1,
      return_citations: true,
    });

    const content = response.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const education = parsed.education || [];

    // 验证和清洗数据
    return education
      .filter((e: any) => e.institution && e.degree)
      .map((e: any) => ({
        degree: normalizeDegree(e.degree),
        field: e.field || undefined,
        institution: e.institution,
        institutionZh: e.institutionZh || getChineseUniversityName(e.institution),
        year: e.year || undefined,
        yearStart: e.yearStart || undefined,
        advisor: e.advisor || undefined,
        thesis: e.thesis || undefined,
      }));

  } catch (error) {
    console.error(`  ❌ Perplexity API 错误:`, error);
    return [];
  }
}

// ============== 辅助函数 ==============

function normalizeDegree(degree: string): string {
  const degreeMap: Record<string, string> = {
    'doctor of philosophy': 'PhD',
    'ph.d.': 'PhD',
    'ph.d': 'PhD',
    'phd': 'PhD',
    'doctorate': 'PhD',
    'master of science': 'MS',
    'm.s.': 'MS',
    'm.s': 'MS',
    'ms': 'MS',
    'master of arts': 'MA',
    'm.a.': 'MA',
    'ma': 'MA',
    'master of business administration': 'MBA',
    'm.b.a.': 'MBA',
    'mba': 'MBA',
    'bachelor of science': 'BS',
    'b.s.': 'BS',
    'b.s': 'BS',
    'bs': 'BS',
    'bachelor of arts': 'BA',
    'b.a.': 'BA',
    'ba': 'BA',
    'bachelor of engineering': 'BEng',
    'b.eng': 'BEng',
    'master of engineering': 'MEng',
    'm.eng': 'MEng',
  };

  const lower = degree.toLowerCase().trim();
  return degreeMap[lower] || degree;
}

function getChineseUniversityName(englishName: string): string | undefined {
  const universityMap: Record<string, string> = {
    'Stanford University': '斯坦福大学',
    'MIT': '麻省理工学院',
    'Massachusetts Institute of Technology': '麻省理工学院',
    'Carnegie Mellon University': '卡内基梅隆大学',
    'UC Berkeley': '加州大学伯克利分校',
    'University of California, Berkeley': '加州大学伯克利分校',
    'Harvard University': '哈佛大学',
    'Princeton University': '普林斯顿大学',
    'Yale University': '耶鲁大学',
    'Columbia University': '哥伦比亚大学',
    'University of Toronto': '多伦多大学',
    'University of Oxford': '牛津大学',
    'Oxford University': '牛津大学',
    'University of Cambridge': '剑桥大学',
    'Cambridge University': '剑桥大学',
    'Tsinghua University': '清华大学',
    'Peking University': '北京大学',
    'Zhejiang University': '浙江大学',
    'Shanghai Jiao Tong University': '上海交通大学',
    'Fudan University': '复旦大学',
    'University of Science and Technology of China': '中国科学技术大学',
    'USTC': '中国科学技术大学',
    'Nanjing University': '南京大学',
    'Chinese University of Hong Kong': '香港中文大学',
    'CUHK': '香港中文大学',
    'University of Hong Kong': '香港大学',
    'HKU': '香港大学',
    'National University of Singapore': '新加坡国立大学',
    'NUS': '新加坡国立大学',
    'ETH Zurich': '苏黎世联邦理工学院',
    'University of Michigan': '密歇根大学',
    'University of Washington': '华盛顿大学',
    'Georgia Institute of Technology': '佐治亚理工学院',
    'Georgia Tech': '佐治亚理工学院',
    'Cornell University': '康奈尔大学',
    'University of Illinois Urbana-Champaign': '伊利诺伊大学厄巴纳-香槟分校',
    'UIUC': '伊利诺伊大学厄巴纳-香槟分校',
    'UCLA': '加州大学洛杉矶分校',
    'University of California, Los Angeles': '加州大学洛杉矶分校',
    'New York University': '纽约大学',
    'NYU': '纽约大学',
    'Caltech': '加州理工学院',
    'California Institute of Technology': '加州理工学院',
    'University of Montreal': '蒙特利尔大学',
    'McGill University': '麦吉尔大学',
  };

  // 尝试精确匹配
  if (universityMap[englishName]) {
    return universityMap[englishName];
  }

  // 尝试部分匹配
  for (const [en, zh] of Object.entries(universityMap)) {
    if (englishName.toLowerCase().includes(en.toLowerCase()) ||
        en.toLowerCase().includes(englishName.toLowerCase())) {
      return zh;
    }
  }

  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============== 主逻辑 ==============

async function main() {
  const { limit, force, quiet, personName } = parseArgs();

  const log = (msg: string) => { if (!quiet) console.log(msg); };

  console.log('🎓 Education Enrichment Script');
  console.log('===============================');
  console.log(`Options: limit=${limit}, force=${force}, quiet=${quiet}, person=${personName || 'all'}`);

  // 构建查询条件
  const whereClause: any = {};

  if (personName) {
    whereClause.OR = [
      { name: { contains: personName, mode: 'insensitive' } },
      { aliases: { has: personName } },
    ];
  } else if (!force) {
    // 只处理没有教育数据的人物（数据库 NULL，需用 DbNull）
    whereClause.education = { equals: Prisma.DbNull };
  }

  const people = await prisma.people.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      aliases: true,
      education: true,
    },
    orderBy: { influenceScore: 'desc' },
    take: limit,
  });

  console.log(`\n找到 ${people.length} 人需要补充教育数据\n`);

  if (people.length === 0) {
    console.log('没有需要处理的人物。使用 --force 强制刷新已有数据。');
    await prisma.$disconnect();
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < people.length; i++) {
    const person = people[i];

    if (quiet && i % 10 === 0) {
      console.log(`进度: ${i}/${people.length}`);
    }

    log(`[${i + 1}/${people.length}] 处理: ${person.name}`);

    try {
      const education = await queryPerplexityForEducation(person.name, person.aliases);

      if (education.length === 0) {
        log(`  ⏭️ 未找到教育信息`);
        skippedCount++;
        continue;
      }

      // 更新数据库
      await prisma.people.update({
        where: { id: person.id },
        data: { education: education as any },
      });

      log(`  ✅ 找到 ${education.length} 条教育记录:`);
      for (const edu of education) {
        log(`     - ${edu.degree} ${edu.field || ''} @ ${edu.institution} (${edu.year || '?'})`);
      }

      updatedCount++;

      // API 限流
      await sleep(CONFIG.requestDelay);

    } catch (error) {
      log(`  ❌ 错误: ${error}`);
      errorCount++;
    }
  }

  console.log('\n===============================');
  console.log('📊 统计:');
  console.log(`  ✅ 更新: ${updatedCount} 人`);
  console.log(`  ⏭️ 跳过: ${skippedCount} 人`);
  console.log(`  ❌ 错误: ${errorCount} 人`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
