/**
 * 课程富集核心：为缺课程的人物采集公开课程。
 * 从 scripts/enrich/enrich_courses.ts 抽出，CLI 与后台共用。
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { searchAllCourses, hashUrl, type CourseData } from '@/lib/datasources/course';
import { makeLogger, type PipelineRunHooks } from './hooks';

export interface CoursesEnrichOptions {
  limit: number;
  force: boolean;
  personName?: string;
  /** true=只搜索不写库（dry-run）。 */
  dryRun: boolean;
}

const CONFIG = {
  defaultLimit: 50,
  requestDelay: 2000,
  onlyApproved: true,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getYouTubeChannelId(person: { officialLinks: unknown }): string | undefined {
  const links = person.officialLinks as Array<{ type: string; url: string }> | null;
  if (!links) return undefined;
  const ytLink = links.find((l) => l.type === 'youtube' || l.url?.includes('youtube.com'));
  if (!ytLink?.url) return undefined;
  const match = ytLink.url.match(/youtube\.com\/(?:channel\/|c\/|@)([^/?]+)/);
  return match ? match[1] : undefined;
}

async function saveCourses(personId: string, courses: CourseData[]): Promise<number> {
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

export async function runCoursesEnrich(opts: CoursesEnrichOptions, hooks: PipelineRunHooks = {}): Promise<{ totalFound: number; totalSaved: number }> {
  const log = makeLogger(hooks);
  const limit = opts.limit || CONFIG.defaultLimit;

  const whereClause: Prisma.PeopleWhereInput = {};
  if (opts.personName) {
    whereClause.OR = [
      { name: { contains: opts.personName, mode: 'insensitive' } },
      { aliases: { has: opts.personName } },
    ];
  } else {
    if (CONFIG.onlyApproved) whereClause.status = 'approved';
    if (!opts.force) whereClause.courses = { none: {} };
  }

  const people = await prisma.people.findMany({
    where: whereClause,
    select: { id: true, name: true, aliases: true, officialLinks: true, roleCategory: true, _count: { select: { courses: true } } },
    orderBy: [{ roleCategory: 'asc' }, { influenceScore: 'desc' }],
    take: limit,
  });

  await hooks.setTotal?.(people.length);
  await log('info', `课程富集：${opts.dryRun ? 'DRY-RUN' : 'EXECUTE'} | limit=${limit} force=${opts.force} person=${opts.personName || 'all'} | 命中 ${people.length} 人`);
  if (people.length === 0) {
    await log('warning', '没有需要处理的人物（--force 可刷新已有）');
    return { totalFound: 0, totalSaved: 0 };
  }

  let totalFound = 0, totalSaved = 0;
  for (const [idx, person] of people.entries()) {
    if (await hooks.isCancelled?.()) return { totalFound, totalSaved };
    try {
      const englishName = person.aliases.find((a) => /^[a-zA-Z\s\-']+$/.test(a));
      const youtubeChannelId = getYouTubeChannelId(person);
      const result = await searchAllCourses(person.name, englishName, {
        includeYouTube: !!youtubeChannelId,
        youtubeChannelId,
      });
      if (!result.success) await log('warning', `[${person.name}] 搜索出错: ${result.error}`);

      const found = result.courses.length;
      totalFound += found;
      if (found === 0) {
        await log('info', `[${person.name}] 未找到课程`);
      } else if (opts.dryRun) {
        await log('info', `dry-run: ${person.name} 找到 ${found} 门课程（不写库）`);
      } else {
        const saved = await saveCourses(person.id, result.courses);
        totalSaved += saved;
        await log('info', `[${person.name}] 找到 ${found}，落库 ${saved}`);
      }
    } catch (error) {
      await log('error', `处理 ${person.name} 出错: ${error instanceof Error ? error.message : String(error)}`);
    }
    await hooks.setDone?.(idx + 1);
    if (idx + 1 < people.length) await sleep(CONFIG.requestDelay);
  }

  await log('info', `完成：找到 ${totalFound} 门课程${opts.dryRun ? '（dry-run 未写库）' : `，落库 ${totalSaved}`}`);
  return { totalFound, totalSaved };
}
