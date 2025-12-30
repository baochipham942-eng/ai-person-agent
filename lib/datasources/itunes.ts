/**
 * iTunes Search API 封装
 * 用于获取播客信息
 */

interface PodcastItem {
    id: string; // collectionId
    title: string; // collectionName
    author: string; // artistName
    url: string; // collectionViewUrl (Apple Podcasts link)
    feedUrl: string; // feedUrl
    thumbnailUrl: string; // artworkUrl600
    publishedAt?: Date; // releaseDate
    categories?: string[];
}

const ITUNES_API_URL = 'https://itunes.apple.com/search';

/**
 * 搜索播客
 * @param term 搜索关键词
 * @param limit 最大返回数量
 */
export async function searchPodcasts(
    term: string,
    limit: number = 5
): Promise<PodcastItem[]> {
    try {
        const params = new URLSearchParams({
            term: term,
            media: 'podcast',
            entity: 'podcastEpisode', // 改为搜索单集，以便找到人物作为嘉宾的节目
            limit: String(limit),
            country: 'CN',
        });

        const response = await fetch(`${ITUNES_API_URL}?${params}`);

        if (!response.ok) {
            console.error('iTunes API error:', await response.text());
            return [];
        }

        const data = await response.json();
        const results = data.results || [];

        return results.map((item: any) => ({
            id: String(item.trackId || item.collectionId),
            title: item.trackName || item.collectionName,       // 单集标题
            author: item.collectionName || item.artistName,     // 节目名称
            url: item.trackViewUrl || item.collectionViewUrl,   // 单集链接
            feedUrl: item.feedUrl || '',                        // 可能为空
            thumbnailUrl: item.artworkUrl600 || item.artworkUrl100, // 封面
            publishedAt: item.releaseDate ? new Date(item.releaseDate) : undefined,
            categories: item.genres?.map((g: any) => g.name) || [],
        }));
    } catch (error) {
        console.error('iTunes search error:', error);
        return [];
    }
}
