/**
 * Course Data Source
 *
 * 从多个来源获取人物的公开课程：
 * - Perplexity AI 搜索（主要来源）
 * - YouTube 播放列表（免费课程）
 * - 未来可扩展：Coursera API, edX API 等
 */

import crypto from 'crypto';
import { searchPerplexity } from './perplexity';

// ============== 类型定义 ==============

export type CoursePlatform =
  | 'coursera'
  | 'edx'
  | 'udacity'
  | 'youtube'
  | 'fast.ai'
  | 'stanford'
  | 'mit'
  | 'udemy'
  | 'deeplearning.ai'
  | 'other';

export type CourseType = 'free' | 'paid' | 'freemium';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseCategory = 'ml' | 'dl' | 'nlp' | 'cv' | 'rl' | 'llm' | 'other';

export interface CourseData {
  title: string;
  titleZh?: string;
  platform: CoursePlatform;
  url: string;
  type: CourseType;
  level?: CourseLevel;
  category?: CourseCategory;
  description?: string;
  duration?: string;
  language?: string;
  enrollments?: number;
  rating?: number;
  prerequisite?: string;
  learningOrder?: number;
  topics?: string[];
  publishedAt?: Date;
  source: string;
  confidence: number;
}

export interface CourseSearchResult {
  courses: CourseData[];
  source: string;
  success: boolean;
  error?: string;
}

// ============== 工具函数 ==============

export function hashUrl(url: string): string {
  let normalized = url;
  try {
    const u = new URL(url);
    // 移除 tracking params
    u.searchParams.delete('utm_source');
    u.searchParams.delete('utm_medium');
    u.searchParams.delete('utm_campaign');
    normalized = u.href.replace(/\/$/, '');
  } catch {
    // 无效 URL 直接使用原始值
  }
  return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * 从 URL 推断平台
 */
export function inferPlatform(url: string): CoursePlatform {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('coursera.org')) return 'coursera';
  if (lowerUrl.includes('edx.org')) return 'edx';
  if (lowerUrl.includes('udacity.com')) return 'udacity';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('fast.ai')) return 'fast.ai';
  if (lowerUrl.includes('stanford.edu')) return 'stanford';
  if (lowerUrl.includes('mit.edu') || lowerUrl.includes('ocw.mit.edu')) return 'mit';
  if (lowerUrl.includes('udemy.com')) return 'udemy';
  if (lowerUrl.includes('deeplearning.ai')) return 'deeplearning.ai';
  return 'other';
}

/**
 * 从 URL 推断课程类型（免费/付费）
 */
export function inferCourseType(url: string, platform: CoursePlatform): CourseType {
  // YouTube 和学校课程通常免费
  if (['youtube', 'fast.ai', 'stanford', 'mit'].includes(platform)) {
    return 'free';
  }
  // Coursera/edX 通常 freemium（可旁听但证书付费）
  if (['coursera', 'edx'].includes(platform)) {
    return 'freemium';
  }
  // Udemy/Udacity 通常付费
  if (['udemy', 'udacity'].includes(platform)) {
    return 'paid';
  }
  return 'paid';
}

// ============== Perplexity 课程搜索 ==============

const COURSE_SEARCH_PROMPT = `You are a course research assistant. Search for online courses created, taught, or significantly contributed to by the specified person.

IMPORTANT RULES:
1. Only include courses where this person is the PRIMARY instructor or creator
2. Include both free and paid courses
3. Prioritize well-known platforms: Coursera, edX, YouTube, Udacity, fast.ai, Stanford Online, MIT OCW, deeplearning.ai
4. Return accurate URLs - verify they are real course links
5. Include relevant metadata when available

Return a JSON object with this exact structure:
{
  "courses": [
    {
      "title": "Course title in English",
      "titleZh": "中文标题（如有）",
      "url": "https://...",
      "platform": "coursera|edx|youtube|udacity|fast.ai|stanford|mit|udemy|deeplearning.ai|other",
      "type": "free|paid|freemium",
      "level": "beginner|intermediate|advanced",
      "description": "Brief course description",
      "duration": "12 weeks or 40 hours",
      "enrollments": 500000,
      "rating": 4.8,
      "learningOrder": 1,
      "topics": ["Deep Learning", "Neural Networks"],
      "prerequisite": "Basic Python, Linear Algebra"
    }
  ]
}

If no courses found, return: {"courses": []}
Only return valid JSON, no other text.`;

export async function searchCoursesWithPerplexity(
  personName: string,
  englishName?: string
): Promise<CourseSearchResult> {
  try {
    const searchName = englishName || personName;
    const query = `Find all online courses (MOOCs, video lectures, tutorials) created or taught by "${searchName}". Include courses on Coursera, edX, YouTube, Udacity, Stanford Online, MIT OpenCourseWare, fast.ai, deeplearning.ai, and other platforms. Return complete information for each course.`;

    const result = await searchPerplexity(query, COURSE_SEARCH_PROMPT, {
      temperature: 0.1,
      return_citations: true,
    });

    if (!result.content) {
      return { courses: [], source: 'perplexity', success: true };
    }

    // 解析 JSON 响应
    let parsed: { courses: Array<Record<string, unknown>> };
    try {
      // 尝试提取 JSON
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[CourseSearch] No JSON found in response');
        return { courses: [], source: 'perplexity', success: true };
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[CourseSearch] JSON parse error:', parseError);
      return {
        courses: [],
        source: 'perplexity',
        success: false,
        error: 'Failed to parse response',
      };
    }

    // 转换为 CourseData
    const courses: CourseData[] = (parsed.courses || [])
      .filter((c) => c.url && c.title)
      .map((c) => {
        const platform = (c.platform as CoursePlatform) || inferPlatform(c.url as string);
        return {
          title: c.title as string,
          titleZh: c.titleZh as string | undefined,
          platform,
          url: c.url as string,
          type: (c.type as CourseType) || inferCourseType(c.url as string, platform),
          level: c.level as CourseLevel | undefined,
          category: c.category as CourseCategory | undefined,
          description: c.description as string | undefined,
          duration: c.duration as string | undefined,
          language: c.language as string | undefined,
          enrollments: typeof c.enrollments === 'number' ? c.enrollments : undefined,
          rating: typeof c.rating === 'number' ? c.rating : undefined,
          prerequisite: c.prerequisite as string | undefined,
          learningOrder: typeof c.learningOrder === 'number' ? c.learningOrder : undefined,
          topics: Array.isArray(c.topics) ? c.topics as string[] : undefined,
          source: 'perplexity',
          confidence: 0.85,
        };
      });

    return { courses, source: 'perplexity', success: true };
  } catch (error) {
    console.error('[CourseSearch] Perplexity error:', error);
    return {
      courses: [],
      source: 'perplexity',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============== YouTube 播放列表搜索（免费课程） ==============

interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  itemCount: number;
  publishedAt: string;
}

const YOUTUBE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * 获取 YouTube 频道的播放列表
 */
export async function getYouTubePlaylists(channelId: string): Promise<YouTubePlaylist[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('[CourseSearch] GOOGLE_API_KEY not configured');
    return [];
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=50&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('[CourseSearch] YouTube API error:', response.status);
      return [];
    }

    const data = await response.json();
    return (data.items || []).map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown>;
      const contentDetails = item.contentDetails as Record<string, unknown>;
      const thumbnails = snippet.thumbnails as Record<string, Record<string, unknown>> | undefined;
      return {
        id: item.id as string,
        title: snippet.title as string,
        description: snippet.description as string,
        thumbnailUrl: thumbnails?.medium?.url as string | undefined,
        itemCount: contentDetails?.itemCount as number || 0,
        publishedAt: snippet.publishedAt as string,
      };
    });
  } catch (error) {
    console.error('[CourseSearch] YouTube API error:', error);
    return [];
  }
}

/**
 * 判断播放列表是否为课程
 */
function isCourseLikePlaylist(playlist: YouTubePlaylist): boolean {
  const title = playlist.title.toLowerCase();
  const desc = playlist.description.toLowerCase();
  const combined = `${title} ${desc}`;

  // 课程关键词
  const courseKeywords = [
    'course',
    'lecture',
    'tutorial',
    'lesson',
    'class',
    'series',
    'bootcamp',
    'workshop',
    'zero to hero',
    'from scratch',
    'complete guide',
    'masterclass',
    '教程',
    '课程',
    '讲座',
  ];

  // 至少需要 5 个视频
  if (playlist.itemCount < 5) return false;

  return courseKeywords.some((kw) => combined.includes(kw));
}

/**
 * 从 YouTube 频道获取课程类播放列表
 */
export async function searchCoursesFromYouTube(
  channelId: string
): Promise<CourseSearchResult> {
  try {
    const playlists = await getYouTubePlaylists(channelId);
    const coursePlaylists = playlists.filter(isCourseLikePlaylist);

    const courses: CourseData[] = coursePlaylists.map((pl) => ({
      title: pl.title,
      platform: 'youtube',
      url: `https://www.youtube.com/playlist?list=${pl.id}`,
      type: 'free',
      description: pl.description?.slice(0, 500),
      duration: `${pl.itemCount} videos`,
      topics: [],
      publishedAt: new Date(pl.publishedAt),
      source: 'youtube',
      confidence: 0.7,
    }));

    return { courses, source: 'youtube', success: true };
  } catch (error) {
    console.error('[CourseSearch] YouTube error:', error);
    return {
      courses: [],
      source: 'youtube',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============== 综合搜索 ==============

export interface CourseSearchOptions {
  includeYouTube?: boolean;
  youtubeChannelId?: string;
}

/**
 * 综合搜索课程（Perplexity + YouTube）
 */
export async function searchAllCourses(
  personName: string,
  englishName?: string,
  options: CourseSearchOptions = {}
): Promise<CourseSearchResult> {
  const allCourses: CourseData[] = [];
  const errors: string[] = [];

  // 1. Perplexity 搜索（主要来源）
  const perplexityResult = await searchCoursesWithPerplexity(personName, englishName);
  if (perplexityResult.success) {
    allCourses.push(...perplexityResult.courses);
  } else if (perplexityResult.error) {
    errors.push(`Perplexity: ${perplexityResult.error}`);
  }

  // 2. YouTube 播放列表（可选）
  if (options.includeYouTube && options.youtubeChannelId) {
    const youtubeResult = await searchCoursesFromYouTube(options.youtubeChannelId);
    if (youtubeResult.success) {
      // 去重：避免与 Perplexity 结果重复
      const existingUrls = new Set(allCourses.map((c) => c.url));
      const newCourses = youtubeResult.courses.filter((c) => !existingUrls.has(c.url));
      allCourses.push(...newCourses);
    } else if (youtubeResult.error) {
      errors.push(`YouTube: ${youtubeResult.error}`);
    }
  }

  // URL 去重
  const urlMap = new Map<string, CourseData>();
  for (const course of allCourses) {
    const hash = hashUrl(course.url);
    // 保留置信度更高的
    if (!urlMap.has(hash) || (urlMap.get(hash)!.confidence < course.confidence)) {
      urlMap.set(hash, course);
    }
  }

  return {
    courses: Array.from(urlMap.values()),
    source: 'combined',
    success: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}
