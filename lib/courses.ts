import { prisma } from '@/lib/db/prisma';
import { normalizeDirectoryTopic } from '@/lib/person-directory-config';

/**
 * 课程作为「学习入口」实体的服务端数据层。
 *
 * Course 是 1:N（每门课属于一个教育者 person），本模块把分散在各人物页的课程
 * 聚合成可浏览的学习中心（/courses），并支持按话题给话题页做横切推荐。
 * 只读；课程本身链接到外部平台（course.url），不建内部详情页。
 */

export interface CourseHubItem {
  id: string;
  title: string;
  titleZh: string | null;
  platform: string;
  url: string;
  type: string;
  level: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  duration: string | null;
  rating: number | null;
  enrollments: number | null;
  topics: string[];
  educator: { id: string; name: string; avatarUrl: string | null } | null;
}

export interface CourseFacets {
  topics: Array<{ value: string; count: number }>;
  levels: Array<{ value: string; count: number }>;
  platforms: Array<{ value: string; count: number }>;
}

export interface CoursesHub {
  courses: CourseHubItem[];
  total: number;
  facets: CourseFacets;
}

interface CourseFilter {
  topic?: string | null;
  level?: string | null;
  type?: string | null;
}

// 教育者只展示 status 可见的人物，避免链到隐藏档；课程量小（数十条）一次取全。
async function fetchAllCourses(): Promise<CourseHubItem[]> {
  const rows = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      titleZh: true,
      platform: true,
      url: true,
      type: true,
      level: true,
      description: true,
      thumbnailUrl: true,
      duration: true,
      rating: true,
      enrollments: true,
      topics: true,
      person: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: [{ rating: 'desc' }, { enrollments: 'desc' }],
  });

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    titleZh: row.titleZh,
    platform: row.platform,
    url: row.url,
    type: row.type,
    level: row.level,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    duration: row.duration,
    rating: row.rating,
    enrollments: row.enrollments,
    topics: row.topics,
    educator: row.person
      ? { id: row.person.id, name: row.person.name, avatarUrl: row.person.avatarUrl }
      : null,
  }));
}

function canonicalTopics(topics: string[]): string[] {
  return Array.from(new Set(topics.map(normalizeDirectoryTopic)));
}

function countBy(values: string[]): Array<{ value: string; count: number }> {
  const map = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    map.set(value, (map.get(value) || 0) + 1);
  }
  return [...map.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
}

export async function fetchCoursesHub(filter: CourseFilter = {}): Promise<CoursesHub> {
  const all = await fetchAllCourses();

  // facets 始终基于全集计算，便于看到每个维度的真实分布
  const facets: CourseFacets = {
    topics: countBy(all.flatMap(course => canonicalTopics(course.topics))),
    levels: countBy(all.map(course => course.level || '').filter(Boolean)),
    platforms: countBy(all.map(course => course.platform)),
  };

  const canonicalTopicFilter = filter.topic ? normalizeDirectoryTopic(filter.topic) : null;
  const courses = all.filter(course => {
    if (canonicalTopicFilter && !canonicalTopics(course.topics).includes(canonicalTopicFilter)) return false;
    if (filter.level && course.level !== filter.level) return false;
    if (filter.type) {
      const isFree = course.type === 'free';
      if (filter.type === 'free' && !isFree) return false;
      if (filter.type === 'paid' && isFree) return false;
    }
    return true;
  });

  return { courses, total: all.length, facets };
}

export async function listCoursesForTopic(topic: string, limit = 6): Promise<CourseHubItem[]> {
  const canonical = normalizeDirectoryTopic(topic);
  const all = await fetchAllCourses();
  return all.filter(course => canonicalTopics(course.topics).includes(canonical)).slice(0, limit);
}
