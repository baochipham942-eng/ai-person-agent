/**
 * 批量采集人物的公开课程信息
 *
 * 数据来源：
 * - Perplexity AI 搜索（主要来源，付费 + 免费课程）
 * - YouTube 播放列表（免费课程）
 *
 * 用法:
 *   bun scripts/enrich/enrich_courses.ts              # 处理所有缺少课程的人物
 *   bun scripts/enrich/enrich_courses.ts --limit 10   # 限制处理数量
 *   bun scripts/enrich/enrich_courses.ts --force      # 强制刷新已有数据
 *   bun scripts/enrich/enrich_courses.ts --person "Andrew Ng"  # 处理指定人物
 */

import { prisma } from '../../lib/db/prisma';
import {
  searchAllCourses,
  hashUrl,
  type CourseData,
} from '../../lib/datasources/course';

// ============== 配置 ==============

const CONFIG = {
  // 默认处理数量
  defaultLimit: 50,
  // 请求间隔（毫秒），避免 API 限流
  requestDelay: 2000,
  // 只处理 approved 状态的人物
  onlyApproved: true,
  // 优先处理有教育背景的人物（教授、研究员更可能有课程）
  priorityRoles: ['professor', 'researcher', 'evangelist'],
};

// ============== 工具函数 ==============

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(): { limit: number; force: boolean; personName?: string } {
  const args = process.argv.slice(2);
  let limit = CONFIG.defaultLimit;
  let force = false;
  let personName: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--force') {
      force = true;
    } else if (args[i] === '--person' && args[i + 1]) {
      personName = args[i + 1];
      i++;
    }
  }

  return { limit, force, personName };
}

// ============== 主逻辑 ==============

async function getYouTubeChannelId(person: {
  officialLinks: unknown;
}): Promise<string | undefined> {
  const links = person.officialLinks as Array<{ type: string; url: string }> | null;
  if (!links) return undefined;

  const ytLink = links.find(
    (l) => l.type === 'youtube' || l.url?.includes('youtube.com')
  );
  if (!ytLink?.url) return undefined;

  // 提取 channel ID
  const match = ytLink.url.match(/youtube\.com\/(?:channel\/|c\/|@)([^/?]+)/);
  return match ? match[1] : undefined;
}

async function saveCourses(
  personId: string,
  courses: CourseData[]
): Promise<number> {
  let savedCount = 0;

  for (const course of courses) {
    const urlHash = hashUrl(course.url);

    try {
      await prisma.course.upsert({
        where: { urlHash },
        create: {
          personId,
          title: course.title,
          titleZh: course.titleZh,
          platform: course.platform,
          url: course.url,
          urlHash,
          type: course.type,
          level: course.level,
          category: course.category,
          description: course.description,
          duration: course.duration,
          language: course.language,
          enrollments: course.enrollments,
          rating: course.rating,
          prerequisite: course.prerequisite,
          learningOrder: course.learningOrder,
          topics: course.topics || [],
          source: course.source,
          confidence: course.confidence,
          publishedAt: course.publishedAt,
          verified: false,
        },
        update: {
          // 只更新部分字段，保留人工验证状态
          title: course.title,
          titleZh: course.titleZh,
          description: course.description,
          duration: course.duration,
          enrollments: course.enrollments,
          rating: course.rating,
          topics: course.topics || [],
          lastUpdatedAt: new Date(),
        },
      });
      savedCount++;
    } catch (error) {
      console.error(`  ❌ Failed to save course: ${course.title}`, error);
    }
  }

  return savedCount;
}

async function processPerson(person: {
  id: string;
  name: string;
  aliases: string[];
  officialLinks: unknown;
  roleCategory: string | null;
}): Promise<{ found: number; saved: number }> {
  console.log(`\n📚 Processing: ${person.name}`);

  // 获取英文名（如果有）
  const englishName = person.aliases.find((a) => /^[a-zA-Z\s\-']+$/.test(a));

  // 获取 YouTube 频道 ID
  const youtubeChannelId = await getYouTubeChannelId(person);

  // 搜索课程
  const result = await searchAllCourses(person.name, englishName, {
    includeYouTube: !!youtubeChannelId,
    youtubeChannelId,
  });

  if (!result.success) {
    console.log(`  ⚠️  Search error: ${result.error}`);
  }

  if (result.courses.length === 0) {
    console.log(`  ℹ️  No courses found`);
    return { found: 0, saved: 0 };
  }

  console.log(`  ✅ Found ${result.courses.length} courses:`);
  result.courses.forEach((c, i) => {
    const typeIcon = c.type === 'free' ? '🆓' : c.type === 'paid' ? '💰' : '🔄';
    console.log(`     ${i + 1}. [${c.platform}] ${typeIcon} ${c.title}`);
  });

  // 保存到数据库
  const savedCount = await saveCourses(person.id, result.courses);
  console.log(`  💾 Saved ${savedCount} courses to database`);

  return { found: result.courses.length, saved: savedCount };
}

async function main() {
  const { limit, force, personName } = parseArgs();

  console.log('🎓 Course Enrichment Script');
  console.log('===========================');
  console.log(`Options: limit=${limit}, force=${force}, person=${personName || 'all'}`);

  // 构建查询条件
  const whereClause: Parameters<typeof prisma.people.findMany>[0]['where'] = {};

  if (personName) {
    whereClause.OR = [
      { name: { contains: personName, mode: 'insensitive' } },
      { aliases: { has: personName } },
    ];
  } else {
    if (CONFIG.onlyApproved) {
      whereClause.status = 'approved';
    }

    // 如果不是强制刷新，只处理没有课程的人物
    if (!force) {
      whereClause.courses = { none: {} };
    }
  }

  // 查询人物列表
  const people = await prisma.people.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      aliases: true,
      officialLinks: true,
      roleCategory: true,
      _count: { select: { courses: true } },
    },
    orderBy: [
      // 优先处理教授和研究员
      { roleCategory: 'asc' },
      { influenceScore: 'desc' },
    ],
    take: limit,
  });

  console.log(`\nFound ${people.length} people to process\n`);

  if (people.length === 0) {
    console.log('No people to process. Use --force to refresh existing data.');
    process.exit(0);
  }

  // 统计
  let totalFound = 0;
  let totalSaved = 0;
  let processed = 0;
  let errors = 0;

  for (const person of people) {
    try {
      const result = await processPerson(person);
      totalFound += result.found;
      totalSaved += result.saved;
      processed++;

      // 请求间隔
      if (processed < people.length) {
        await sleep(CONFIG.requestDelay);
      }
    } catch (error) {
      console.error(`\n❌ Error processing ${person.name}:`, error);
      errors++;
    }
  }

  // 最终统计
  console.log('\n===========================');
  console.log('📊 Summary:');
  console.log(`   Processed: ${processed} people`);
  console.log(`   Courses found: ${totalFound}`);
  console.log(`   Courses saved: ${totalSaved}`);
  console.log(`   Errors: ${errors}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
