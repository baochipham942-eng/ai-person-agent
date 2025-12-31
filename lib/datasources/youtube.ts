/**
 * YouTube Data API v3 封装
 * 用于获取频道和视频信息
 */

interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    publishedAt: string;
    url: string;
    thumbnailUrl?: string;
    viewCount?: number;
    duration?: string;
}

interface YouTubeChannel {
    id: string;
    title: string;
    description: string;
    subscriberCount?: number;
    videoCount?: number;
    thumbnailUrl?: string;
}

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * 获取 YouTube 频道信息
 * @param channelId 频道 ID
 */
export async function getYouTubeChannel(channelId: string): Promise<YouTubeChannel | null> {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.warn('GOOGLE_API_KEY not configured');
        return null;
    }

    try {
        const params = new URLSearchParams({
            part: 'snippet,statistics',
            id: channelId,
            key: apiKey,
        });

        const response = await fetch(`${YOUTUBE_API_URL}/channels?${params}`);

        if (!response.ok) {
            console.error('YouTube API error:', await response.text());
            return null;
        }

        const data = await response.json();
        const channel = data.items?.[0];

        if (!channel) {
            return null;
        }

        return {
            id: channel.id,
            title: channel.snippet?.title || '',
            description: channel.snippet?.description || '',
            subscriberCount: parseInt(channel.statistics?.subscriberCount) || undefined,
            videoCount: parseInt(channel.statistics?.videoCount) || undefined,
            thumbnailUrl: channel.snippet?.thumbnails?.default?.url,
        };
    } catch (error) {
        console.error('YouTube getChannel error:', error);
        return null;
    }
}

/**
 * 获取频道的视频列表
 * @param channelId 频道 ID
 * @param maxResults 最大返回数量
 */
export async function getChannelVideos(
    channelId: string,
    maxResults: number = 20
): Promise<YouTubeVideo[]> {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.warn('GOOGLE_API_KEY not configured');
        return [];
    }

    try {
        // 1. 获取上传播放列表 ID
        const channelParams = new URLSearchParams({
            part: 'contentDetails',
            id: channelId,
            key: apiKey,
        });

        const channelResponse = await fetch(`${YOUTUBE_API_URL}/channels?${channelParams}`);
        const channelData = await channelResponse.json();
        const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

        if (!uploadsPlaylistId) {
            return [];
        }

        // 2. 获取播放列表视频
        const playlistParams = new URLSearchParams({
            part: 'snippet',
            playlistId: uploadsPlaylistId,
            maxResults: String(maxResults),
            key: apiKey,
        });

        const playlistResponse = await fetch(`${YOUTUBE_API_URL}/playlistItems?${playlistParams}`);
        const playlistData = await playlistResponse.json();
        const items = playlistData.items || [];

        return items.map((item: any) => ({
            id: item.snippet?.resourceId?.videoId || '',
            title: item.snippet?.title || '',
            description: item.snippet?.description || '',
            publishedAt: item.snippet?.publishedAt || '',
            url: `https://www.youtube.com/watch?v=${item.snippet?.resourceId?.videoId}`,
            thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
        }));
    } catch (error) {
        console.error('YouTube getChannelVideos error:', error);
        return [];
    }
}

/**
 * 搜索 YouTube 视频
 * @param query 搜索关键词
 * @param maxResults 最大返回数量
 */
export async function searchYouTubeVideos(
    query: string,
    maxResults: number = 10
): Promise<YouTubeVideo[]> {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.warn('GOOGLE_API_KEY not configured');
        return [];
    }

    try {
        const params = new URLSearchParams({
            part: 'snippet',
            q: `${query} (AI | "Artificial Intelligence" | LLM | "Machine Learning")`,
            type: 'video',
            maxResults: String(maxResults),
            order: 'relevance',
            key: apiKey,
        });

        const response = await fetch(`${YOUTUBE_API_URL}/search?${params}`);

        if (!response.ok) {
            console.error('YouTube search error:', await response.text());
            return [];
        }

        const data = await response.json();
        const items = data.items || [];

        return items.map((item: any) => ({
            id: item.id?.videoId || '',
            title: item.snippet?.title || '',
            description: item.snippet?.description || '',
            publishedAt: item.snippet?.publishedAt || '',
            url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
            thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
        }));
    } catch (error) {
        console.error('YouTube search error:', error);
        return [];
    }
}
