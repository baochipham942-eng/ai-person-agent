/**
 * YouTube Search Skill
 *
 * YouTube Data API 搜索能力：
 * - 获取频道信息
 * - 获取频道视频列表
 * - 搜索视频
 * - 支持增量更新
 */

// ============== 类型定义 ==============

export interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    publishedAt: string;
    url: string;
    thumbnailUrl?: string;
    viewCount?: number;
    duration?: string;
}

export interface YouTubeChannel {
    id: string;
    title: string;
    description: string;
    subscriberCount?: number;
    videoCount?: number;
    thumbnailUrl?: string;
}

export interface YouTubeSearchConfig {
    apiKey?: string;
    apiUrl?: string;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<Omit<YouTubeSearchConfig, 'apiKey'>> & { apiKey?: string } = {
    apiKey: undefined,
    apiUrl: 'https://www.googleapis.com/youtube/v3',
};

// ============== Skill 实现 ==============

export class YouTubeSearchSkill {
    private config: typeof DEFAULT_CONFIG;

    constructor(config: YouTubeSearchConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 获取频道信息
     */
    async getChannel(channelId: string): Promise<YouTubeChannel | null> {
        const apiKey = this.config.apiKey || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            console.warn('[YouTubeSearch] GOOGLE_API_KEY not configured');
            return null;
        }

        try {
            const params = new URLSearchParams({
                part: 'snippet,statistics',
                id: channelId,
                key: apiKey,
            });

            const response = await fetch(`${this.config.apiUrl}/channels?${params}`);

            if (!response.ok) {
                console.error('[YouTubeSearch] API error:', await response.text());
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
                thumbnailUrl: channel.snippet?.thumbnails?.high?.url ||
                    channel.snippet?.thumbnails?.medium?.url ||
                    channel.snippet?.thumbnails?.default?.url,
            };
        } catch (error) {
            console.error('[YouTubeSearch] getChannel error:', error);
            return null;
        }
    }

    /**
     * 获取频道视频列表
     */
    async getChannelVideos(
        channelId: string,
        options: {
            maxResults?: number;
            since?: Date;
        } = {}
    ): Promise<YouTubeVideo[]> {
        const apiKey = this.config.apiKey || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            console.warn('[YouTubeSearch] GOOGLE_API_KEY not configured');
            return [];
        }

        const maxResults = options.maxResults || 20;

        try {
            // 1. 获取上传播放列表 ID
            const channelParams = new URLSearchParams({
                part: 'contentDetails',
                id: channelId,
                key: apiKey,
            });

            const channelResponse = await fetch(`${this.config.apiUrl}/channels?${channelParams}`);
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

            const playlistResponse = await fetch(`${this.config.apiUrl}/playlistItems?${playlistParams}`);
            const playlistData = await playlistResponse.json();
            let items = playlistData.items || [];

            // 客户端过滤
            if (options.since) {
                items = items.filter((item: any) => {
                    const publishedAt = item.snippet?.publishedAt;
                    return publishedAt && new Date(publishedAt) > options.since!;
                });
            }

            return items.map((item: any) => ({
                id: item.snippet?.resourceId?.videoId || '',
                title: item.snippet?.title || '',
                description: item.snippet?.description || '',
                publishedAt: item.snippet?.publishedAt || '',
                url: `https://www.youtube.com/watch?v=${item.snippet?.resourceId?.videoId}`,
                thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
            }));
        } catch (error) {
            console.error('[YouTubeSearch] getChannelVideos error:', error);
            return [];
        }
    }

    /**
     * 搜索视频
     */
    async searchVideos(
        query: string,
        options: {
            maxResults?: number;
            since?: Date;
            aiRelated?: boolean;
        } = {}
    ): Promise<YouTubeVideo[]> {
        const apiKey = this.config.apiKey || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            console.warn('[YouTubeSearch] GOOGLE_API_KEY not configured');
            return [];
        }

        const maxResults = options.maxResults || 10;

        try {
            let searchQuery = query;
            if (options.aiRelated !== false) {
                searchQuery = `${query} (AI | "Artificial Intelligence" | LLM | "Machine Learning")`;
            }

            const params = new URLSearchParams({
                part: 'snippet',
                q: searchQuery,
                type: 'video',
                maxResults: String(maxResults * 3), // 获取更多以便过滤
                order: 'relevance',
                relevanceLanguage: 'zh',
                key: apiKey,
            });

            if (options.since) {
                params.set('publishedAfter', options.since.toISOString());
            }

            const response = await fetch(`${this.config.apiUrl}/search?${params}`);

            if (!response.ok) {
                console.error('[YouTubeSearch] Search error:', await response.text());
                return [];
            }

            const data = await response.json();
            let items = data.items || [];

            // 语言过滤
            items = items.filter((item: any) => {
                const title = item.snippet?.title || '';
                return this.isChineseOrEnglish(title);
            });

            return items.slice(0, maxResults).map((item: any) => ({
                id: item.id?.videoId || '',
                title: item.snippet?.title || '',
                description: item.snippet?.description || '',
                publishedAt: item.snippet?.publishedAt || '',
                url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
                thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
            }));
        } catch (error) {
            console.error('[YouTubeSearch] searchVideos error:', error);
            return [];
        }
    }

    /**
     * 检测是否为中英文内容
     */
    private isChineseOrEnglish(text: string): boolean {
        if (!text || text.trim().length === 0) {
            return true;
        }

        const hasKana = /[\u3040-\u30fa\u30fc-\u30ff]/.test(text);
        const hasHangul = /[\uac00-\ud7af]/.test(text);
        const hasCyrillic = /[\u0400-\u04ff]/.test(text);

        return !(hasKana || hasHangul || hasCyrillic);
    }
}

// 导出默认实例
export const youtubeSearch = new YouTubeSearchSkill();
