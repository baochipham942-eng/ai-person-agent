/**
 * 补充官方 YouTube 频道数据脚本
 *
 * 功能：
 * 1. 从 Wikidata 查找人物的官方 YouTube 频道 ID (P2397)
 * 2. 通过 YouTube Search API 搜索人物官方频道
 * 3. 更新 People.officialLinks
 * 4. 抓取官方频道的视频内容，标记为 isOfficial=true
 *
 * 用法: npx tsx scripts/enrich/fetch_official_youtube.ts [--limit=N] [--force] [--search]
 *   --search: 对无频道的人物使用 YouTube 搜索查找频道
 */

import { prisma } from '../../lib/db/prisma';
import { getChannelVideos, getYouTubeChannel } from '../../lib/datasources/youtube';
import { buildRawPoolIdentity, contentHash } from '../../lib/rawpool-identity';

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_API_KEY = process.env.GOOGLE_API_KEY;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface YouTubeChannelInfo {
  channelId: string;
  channelTitle?: string;
  channelUrl: string;
}

/**
 * 通过 YouTube Search API 搜索人物官方频道
 * 策略：搜索 "{人物名} official channel" 或 "{人物名}"，验证是否是官方频道
 */
async function searchYouTubeChannel(
  personName: string,
  aliases: string[]
): Promise<YouTubeChannelInfo | null> {
  if (!YOUTUBE_API_KEY) {
    console.log('    GOOGLE_API_KEY 未配置');
    return null;
  }

  try {
    // 构建搜索词：优先使用英文名
    const searchNames = [personName, ...aliases].filter(n => n && n.length > 2);

    for (const name of searchNames.slice(0, 2)) {
      const params = new URLSearchParams({
        part: 'snippet',
        q: name,
        type: 'channel',
        maxResults: '5',
        key: YOUTUBE_API_KEY
      });

      const response = await fetch(`${YOUTUBE_API_URL}/search?${params}`);
      if (!response.ok) continue;

      const data = await response.json();
      const channels = data.items || [];

      // 查找匹配的频道
      for (const ch of channels) {
        const channelTitle = ch.snippet?.title?.toLowerCase() || '';
        const channelDesc = ch.snippet?.description?.toLowerCase() || '';
        const nameLower = name.toLowerCase();
        const nameWords = nameLower.split(/\s+/);

        // 验证频道名是否匹配人物名
        const titleMatches = nameWords.every(w => w.length > 2 && channelTitle.includes(w));
        const isVerified = channelDesc.includes('official') ||
                          channelDesc.includes('personal') ||
                          channelTitle.includes('official');

        // 严格匹配：频道名必须包含人物名的所有主要词
        if (titleMatches) {
          const channelId = ch.snippet?.channelId || ch.id?.channelId;
          if (channelId) {
            return {
              channelId,
              channelTitle: ch.snippet?.title,
              channelUrl: `https://www.youtube.com/channel/${channelId}`
            };
          }
        }
      }

      await sleep(200);
    }

    return null;
  } catch (error) {
    console.log('    YouTube 搜索失败:', error);
    return null;
  }
}

/**
 * 从 Wikidata 获取人物的 YouTube 频道 ID (P2397)
 */
async function getYouTubeChannelFromWikidata(qid: string): Promise<YouTubeChannelInfo | null> {
  try {
    const params = new URLSearchParams({
      action: 'wbgetentities',
      ids: qid,
      props: 'claims',
      format: 'json',
      origin: '*',
    });

    const response = await fetch(`${WIKIDATA_API}?${params}`, {
      headers: { 'User-Agent': 'AI-Person-Agent/1.0' }
    });
    const data = await response.json();
    const entity = data.entities?.[qid];

    if (!entity) return null;

    // P2397 - YouTube channel ID
    const youtubeId = entity.claims?.P2397?.[0]?.mainsnak?.datavalue?.value;
    if (youtubeId) {
      return {
        channelId: youtubeId,
        channelUrl: `https://www.youtube.com/channel/${youtubeId}`
      };
    }

    return null;
  } catch (error) {
    console.error(`获取 Wikidata ${qid} YouTube 频道失败:`, error);
    return null;
  }
}

/**
 * 保存视频到 RawPoolItem，标记为官方频道
 */
async function saveOfficialVideo(
  personId: string,
  video: any,
  channelTitle: string
) {
  const content = video.description || '';
  const metadata = {
    videoId: video.id,
    thumbnailUrl: video.thumbnailUrl,
    viewCount: video.viewCount,
    duration: video.duration,
    isOfficial: true,  // 标记为官方频道视频
    author: channelTitle,
    channelId: video.channelId
  };
  const identity = buildRawPoolIdentity({ personId, sourceType: 'youtube', url: video.url, metadata });
  const itemMetadata = { ...metadata, rawPoolCanonicalKey: identity.canonicalKey };
  const itemContentHash = contentHash(video.title + content);

  await prisma.rawPoolItem.upsert({
    where: { urlHash: identity.urlHash },
    create: {
      personId,
      sourceType: 'youtube',
      url: video.url,
      urlHash: identity.urlHash,
      contentHash: itemContentHash,
      title: video.title,
      text: content,
      publishedAt: video.publishedAt ? new Date(video.publishedAt) : new Date(),
      metadata: itemMetadata,
      fetchStatus: 'success',
      fetchedAt: new Date()
    },
    update: {
      title: video.title,
      text: content,
      contentHash: itemContentHash,
      metadata: itemMetadata,
      fetchedAt: new Date()
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const force = args.includes('--force'); // 强制更新已有数据
  const useSearch = args.includes('--search'); // 使用 YouTube 搜索查找频道

  console.log('📺 补充官方 YouTube 频道数据\n');
  console.log(`限制人数: ${limit || '无限制'}`);
  console.log(`强制更新: ${force ? '是' : '否'}`);
  console.log(`使用搜索: ${useSearch ? '是' : '否'}\n`);

  // 获取所有有 QID 的人物
  const people = await prisma.people.findMany({
    where: {
      qid: { not: { startsWith: 'ai-gen-' } }, // 排除自动生成的 QID
      status: 'ready'  // ready 表示已就绪的人物
    },
    orderBy: { influenceScore: 'desc' },
    take: limit
  });

  console.log(`📋 找到 ${people.length} 个人物\n`);

  let updatedCount = 0;
  let newChannelCount = 0;
  let newVideoCount = 0;

  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    const links = (person.officialLinks as any[]) || [];
    const existingYouTube = links.find(l => l.type === 'youtube');

    // 如果已有 YouTube 链接且不强制更新，跳过 Wikidata 查询
    if (existingYouTube && !force) {
      // 但仍然检查是否需要抓取视频
      const officialVideoCount = await prisma.rawPoolItem.count({
        where: {
          personId: person.id,
          sourceType: 'youtube',
          metadata: { path: ['isOfficial'], equals: true }
        }
      });

      if (officialVideoCount > 0) {
        console.log(`[${i + 1}/${people.length}] ${person.name}: 已有官方视频 (${officialVideoCount})`);
        continue;
      }
    }

    console.log(`[${i + 1}/${people.length}] ${person.name} (${person.qid})`);

    // 1. 获取 YouTube 频道信息
    let channelInfo: YouTubeChannelInfo | null = null;

    if (existingYouTube?.handle) {
      // 使用已有的频道 ID
      channelInfo = {
        channelId: existingYouTube.handle,
        channelUrl: existingYouTube.url
      };
      console.log(`  使用已有频道: ${existingYouTube.handle}`);
    } else {
      // 方式1: 从 Wikidata 获取
      channelInfo = await getYouTubeChannelFromWikidata(person.qid);
      await sleep(300);

      if (channelInfo) {
        console.log(`  Wikidata 找到频道: ${channelInfo.channelId}`);
      } else if (useSearch) {
        // 方式2: 使用 YouTube 搜索
        console.log(`  Wikidata 未找到，尝试 YouTube 搜索...`);
        channelInfo = await searchYouTubeChannel(person.name, person.aliases || []);
        await sleep(500);

        if (channelInfo) {
          console.log(`  YouTube 搜索找到频道: ${channelInfo.channelTitle} (${channelInfo.channelId})`);
        }
      } else {
        console.log(`  Wikidata 未找到 YouTube 频道（使用 --search 参数启用搜索）`);
      }

      if (channelInfo) {
        newChannelCount++;

        // 更新 officialLinks
        const newLinks = links.filter(l => l.type !== 'youtube');
        newLinks.push({
          type: 'youtube',
          url: channelInfo.channelUrl,
          handle: channelInfo.channelId
        });

        await prisma.people.update({
          where: { id: person.id },
          data: { officialLinks: newLinks }
        });
      } else {
        continue;
      }
    }

    if (!channelInfo) continue;

    // 2. 获取频道详情
    const channel = await getYouTubeChannel(channelInfo.channelId);
    const channelTitle = channel?.title || person.name;
    await sleep(500);

    // 3. 抓取视频
    console.log(`  正在抓取视频...`);
    const videos = await getChannelVideos(channelInfo.channelId, 20);
    await sleep(500);

    if (videos.length === 0) {
      console.log(`  未找到视频`);
      continue;
    }

    console.log(`  找到 ${videos.length} 个视频`);

    // 4. 保存视频
    for (const video of videos) {
      await saveOfficialVideo(person.id, {
        ...video,
        channelId: channelInfo.channelId
      }, channelTitle);
      newVideoCount++;
    }

    updatedCount++;
    console.log(`  ✓ 已保存 ${videos.length} 个官方视频`);

    // Rate limiting
    await sleep(1000);
  }

  console.log('\n📊 处理完成');
  console.log(`  处理人物数: ${people.length}`);
  console.log(`  新增频道数: ${newChannelCount}`);
  console.log(`  更新人物数: ${updatedCount}`);
  console.log(`  新增视频数: ${newVideoCount}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
