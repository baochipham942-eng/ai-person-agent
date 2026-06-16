import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { prisma } from '../../lib/db/prisma';
import { getUserRepos } from '../../lib/datasources/github';
import crypto from 'crypto';

loadEnvFiles();

const YOUTUBE_API_KEY = process.env.GOOGLE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
const FETCH_TIMEOUT_MS = 15_000;

// Utility to delay execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function loadEnvFiles() {
    const mode = process.env.NODE_ENV || 'development';
    for (const filename of ['.env', `.env.${mode}`, '.env.local', `.env.${mode}.local`]) {
        const filePath = path.resolve(process.cwd(), filename);
        if (fs.existsSync(filePath)) {
            dotenv.config({ path: filePath, override: true, quiet: true });
        }
    }
}

type OfficialLink = {
    type: string;
    url: string;
    handle?: string;
};

type YouTubeVideo = {
    title: string;
    description: string;
    publishedAt: string;
    url: string;
    thumbnailUrl?: string;
};

type YouTubeResource = {
    channelId?: string;
    handle?: string;
    username?: string;
    playlistId?: string;
    customPath?: string;
};

type YouTubeFetchResult =
    | { ok: true; videos: YouTubeVideo[]; via: string }
    | { ok: false; reason: string };

type CliOptions = {
    forceYoutube: boolean;
    source: 'all' | 'github' | 'youtube';
    person?: string;
    limit?: number;
};

function parseCliOptions(): CliOptions {
    const args = process.argv.slice(2);
    const valueFor = (name: string): string | undefined => {
        const inline = args.find(arg => arg.startsWith(`${name}=`));
        if (inline) return inline.slice(name.length + 1);

        const index = args.indexOf(name);
        return index >= 0 ? args[index + 1] : undefined;
    };

    const source = valueFor('--source');
    const limit = Number(valueFor('--limit'));

    return {
        forceYoutube: args.includes('--force-youtube'),
        source: source === 'github' || source === 'youtube' ? source : 'all',
        person: valueFor('--person'),
        limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    };
}

function getLastFetchDate(lastFetchedAt: unknown, source: string): Date | null {
    const rawValue =
        typeof lastFetchedAt === 'string'
            ? lastFetchedAt
            : lastFetchedAt && typeof lastFetchedAt === 'object' && !Array.isArray(lastFetchedAt)
                ? (lastFetchedAt as Record<string, unknown>)[source]
                : null;

    if (typeof rawValue !== 'string') return null;

    const date = new Date(rawValue);
    return Number.isNaN(date.getTime()) ? null : date;
}

function toLastFetchedAtObject(lastFetchedAt: unknown): Record<string, string> {
    if (!lastFetchedAt || typeof lastFetchedAt !== 'object' || Array.isArray(lastFetchedAt)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(lastFetchedAt as Record<string, unknown>).filter(([, value]) => typeof value === 'string')
    ) as Record<string, string>;
}

function shouldFetch(count: number, lastFetchedAt: unknown, source: string): boolean {
    if (count === 0) return true;

    const lastFetched = getLastFetchDate(lastFetchedAt, source);
    if (!lastFetched) return true;

    return lastFetched.getTime() < Date.now() - REFRESH_INTERVAL_MS;
}

function shouldAttempt(count: number, lastFetchedAt: unknown, source: string): boolean {
    const lastFetched = getLastFetchDate(lastFetchedAt, source);
    if (lastFetched && lastFetched.getTime() >= Date.now() - REFRESH_INTERVAL_MS) return false;

    if (count === 0) {
        const lastAttempted = getLastFetchDate(lastFetchedAt, `${source}AttemptedAt`);
        if (lastAttempted && lastAttempted.getTime() >= Date.now() - REFRESH_INTERVAL_MS) return false;
    }

    return true;
}

function normalizeOfficialLinks(officialLinks: unknown): OfficialLink[] {
    if (Array.isArray(officialLinks)) {
        return officialLinks.filter((link): link is OfficialLink =>
            link &&
            typeof link === 'object' &&
            typeof (link as OfficialLink).type === 'string' &&
            typeof (link as OfficialLink).url === 'string'
        );
    }

    if (!officialLinks || typeof officialLinks !== 'object') {
        return [];
    }

    return Object.entries(officialLinks as Record<string, unknown>).flatMap(([type, value]) => {
        const normalizedType = type === 'twitter' ? 'x' : type;

        if (typeof value === 'string') {
            return [{ type: normalizedType, url: value }];
        }

        if (value && typeof value === 'object' && typeof (value as { url?: unknown }).url === 'string') {
            return [{
                type: typeof (value as { type?: unknown }).type === 'string'
                    ? (value as { type: string }).type
                    : normalizedType,
                url: (value as { url: string }).url,
                handle: typeof (value as { handle?: unknown }).handle === 'string'
                    ? (value as { handle: string }).handle
                    : undefined,
            }];
        }

        return [];
    });
}

function parseYouTubeResource(url: string, handle?: string): YouTubeResource {
    const resource: YouTubeResource = {};

    if (handle) {
        if (/^UC[a-zA-Z0-9_-]{20,}$/.test(handle)) {
            resource.channelId = handle;
        } else {
            resource.handle = handle.replace(/^@/, '');
        }
    }

    try {
        const parsed = new URL(url);
        const playlistId = parsed.searchParams.get('list');
        if (playlistId) resource.playlistId = playlistId;

        const segments = parsed.pathname
            .split('/')
            .map(segment => decodeURIComponent(segment))
            .filter(Boolean);

        const channelIndex = segments.indexOf('channel');
        if (channelIndex >= 0 && segments[channelIndex + 1]) {
            resource.channelId = segments[channelIndex + 1];
        }

        const userIndex = segments.indexOf('user');
        if (userIndex >= 0 && segments[userIndex + 1]) {
            resource.username = segments[userIndex + 1];
        }

        const handleSegment = segments.find(segment => segment.startsWith('@'));
        if (handleSegment) {
            resource.handle = handleSegment.replace(/^@/, '');
        }

        const customIndex = segments.indexOf('c');
        if (customIndex >= 0 && segments[customIndex + 1]) {
            resource.customPath = segments[customIndex + 1];
        }
    } catch {
        return resource;
    }

    return resource;
}

async function fetchJson(url: string, label: string): Promise<{ ok: true; data: any } | { ok: false; reason: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'AI-Person-Agent/1.0' },
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            return {
                ok: false,
                reason: compactHttpError(label, response.status, body),
            };
        }

        return { ok: true, data: await response.json() };
    } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        return { ok: false, reason: `${label}_error:${error}` };
    } finally {
        clearTimeout(timeout);
    }
}

function compactHttpError(label: string, status: number, body: string): string {
    const normalizedBody = body.replace(/\s+/g, ' ');

    if (status === 403 && /has not been used|disabled/i.test(normalizedBody)) {
        return `${label}_api_not_enabled`;
    }

    if (status === 403 && /Requests to this API|blocked/i.test(normalizedBody)) {
        return `${label}_api_method_blocked`;
    }

    if (status === 403) return `${label}_forbidden`;
    if (status === 404) return `${label}_not_found`;
    if (status === 429) return `${label}_rate_limited`;

    return `${label}_http_${status}`;
}

async function resolveChannelIdByHandle(handle: string): Promise<{ channelId: string | null; reason?: string }> {
    if (!YOUTUBE_API_KEY) return { channelId: null, reason: 'youtube_api_key_missing' };

    const normalized = handle.replace(/^@/, '');
    let firstFailureReason: string | undefined;
    for (const value of [normalized, `@${normalized}`]) {
        const params = new URLSearchParams({
            part: 'id',
            forHandle: value,
            key: YOUTUBE_API_KEY,
        });
        const result = await fetchJson(`${YOUTUBE_API_URL}/channels?${params}`, 'youtube_handle');
        if (result.ok && result.data.items?.[0]?.id) return { channelId: result.data.items[0].id };
        if (!result.ok) firstFailureReason ??= result.reason;
    }

    return { channelId: null, reason: firstFailureReason };
}

async function resolveChannelIdByUsername(username: string): Promise<{ channelId: string | null; reason?: string }> {
    if (!YOUTUBE_API_KEY) return { channelId: null, reason: 'youtube_api_key_missing' };

    const params = new URLSearchParams({
        part: 'id',
        forUsername: username,
        key: YOUTUBE_API_KEY,
    });
    const result = await fetchJson(`${YOUTUBE_API_URL}/channels?${params}`, 'youtube_username');
    return result.ok
        ? { channelId: result.data.items?.[0]?.id || null }
        : { channelId: null, reason: result.reason };
}

async function resolveChannelIdFromPage(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 AI-Person-Agent/1.0' },
        });
        if (!response.ok) return null;

        const html = await response.text();
        return html.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/)?.[1]
            || html.match(/<meta itemprop="channelId" content="(UC[a-zA-Z0-9_-]+)">/)?.[1]
            || null;
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

async function searchChannelId(query: string): Promise<{ channelId: string | null; reason?: string }> {
    if (!YOUTUBE_API_KEY) return { channelId: null, reason: 'youtube_api_key_missing' };

    const params = new URLSearchParams({
        part: 'snippet',
        type: 'channel',
        q: query,
        maxResults: '1',
        key: YOUTUBE_API_KEY,
    });
    const result = await fetchJson(`${YOUTUBE_API_URL}/search?${params}`, 'youtube_channel_search');
    return result.ok
        ? { channelId: result.data.items?.[0]?.snippet?.channelId || null }
        : { channelId: null, reason: result.reason };
}

async function resolveYouTubeChannelId(url: string, handle?: string): Promise<{ channelId: string | null; reason?: string }> {
    const resource = parseYouTubeResource(url, handle);

    if (resource.channelId) return { channelId: resource.channelId };

    if (!YOUTUBE_API_KEY) {
        const pageChannelId = await resolveChannelIdFromPage(url);
        return pageChannelId
            ? { channelId: pageChannelId }
            : { channelId: null, reason: 'youtube_api_key_missing' };
    }

    if (resource.handle) {
        const handleResult = await resolveChannelIdByHandle(resource.handle);
        if (handleResult.channelId) return { channelId: handleResult.channelId };

        const pageChannelId = await resolveChannelIdFromPage(url);
        if (pageChannelId) return { channelId: pageChannelId };

        const searchResult = await searchChannelId(`@${resource.handle}`);
        if (searchResult.channelId) return { channelId: searchResult.channelId };

        return {
            channelId: null,
            reason: handleResult.reason || searchResult.reason || `handle_not_resolved:${resource.handle}`,
        };
    }

    if (resource.username) {
        const usernameResult = await resolveChannelIdByUsername(resource.username);
        if (usernameResult.channelId) return { channelId: usernameResult.channelId };
        return { channelId: null, reason: usernameResult.reason || `username_not_resolved:${resource.username}` };
    }

    if (resource.customPath) {
        const pageChannelId = await resolveChannelIdFromPage(url);
        if (pageChannelId) return { channelId: pageChannelId };

        const searchResult = await searchChannelId(resource.customPath);
        if (searchResult.channelId) return { channelId: searchResult.channelId };
        return { channelId: null, reason: searchResult.reason || `custom_path_not_resolved:${resource.customPath}` };
    }

    return { channelId: null, reason: 'unsupported_youtube_url' };
}

async function getPlaylistVideos(playlistId: string, maxResults: number): Promise<YouTubeFetchResult> {
    if (!YOUTUBE_API_KEY) return { ok: false, reason: 'youtube_api_key_missing' };

    const params = new URLSearchParams({
        part: 'snippet',
        playlistId,
        maxResults: String(maxResults),
        key: YOUTUBE_API_KEY,
    });
    const result = await fetchJson(`${YOUTUBE_API_URL}/playlistItems?${params}`, 'youtube_playlist_items');
    if (!result.ok) return result;

    const items = result.data.items || [];
    if (items.length === 0) return { ok: false, reason: `playlist_has_no_items:${playlistId}` };

    return {
        ok: true,
        via: `playlist:${playlistId}`,
        videos: items.map((item: any) => {
            const videoId = item.snippet?.resourceId?.videoId || '';
            return {
                title: item.snippet?.title || '',
                description: item.snippet?.description || '',
                publishedAt: item.snippet?.publishedAt || '',
                url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : `https://www.youtube.com/playlist?list=${playlistId}`,
                thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
            };
        }),
    };
}

async function getChannelVideosDetailed(channelId: string, maxResults: number): Promise<YouTubeFetchResult> {
    if (!YOUTUBE_API_KEY) return { ok: false, reason: 'youtube_api_key_missing' };

    const channelParams = new URLSearchParams({
        part: 'contentDetails',
        id: channelId,
        key: YOUTUBE_API_KEY,
    });
    const channelResult = await fetchJson(`${YOUTUBE_API_URL}/channels?${channelParams}`, 'youtube_channel_details');
    if (!channelResult.ok) return channelResult;

    const uploadsPlaylistId = channelResult.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) return { ok: false, reason: `channel_has_no_uploads_playlist:${channelId}` };

    const playlistResult = await getPlaylistVideos(uploadsPlaylistId, maxResults);
    if (!playlistResult.ok) return playlistResult;

    return {
        ok: true,
        via: `channel:${channelId}`,
        videos: playlistResult.videos,
    };
}

async function fetchYouTubeVideos(url: string, handle?: string, maxResults = 10): Promise<YouTubeFetchResult> {
    const resource = parseYouTubeResource(url, handle);

    if (resource.playlistId) {
        return getPlaylistVideos(resource.playlistId, maxResults);
    }

    const resolved = await resolveYouTubeChannelId(url, handle);
    if (!resolved.channelId) {
        return { ok: false, reason: resolved.reason || 'channel_not_resolved' };
    }

    return getChannelVideosDetailed(resolved.channelId, maxResults);
}

async function checkYouTubeApiAvailability(): Promise<string | null> {
    if (!YOUTUBE_API_KEY) return 'youtube_api_key_missing';

    const params = new URLSearchParams({
        part: 'contentDetails',
        id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
        key: YOUTUBE_API_KEY,
    });
    const result = await fetchJson(`${YOUTUBE_API_URL}/channels?${params}`, 'youtube_api_preflight');
    if (result.ok) return null;

    if (result.reason.endsWith('_api_not_enabled')) {
        return result.reason;
    }

    return null;
}

// Save RawPoolItem
async function saveRawItem(personId: string, sourceType: string, item: any) {
    const urlHash = crypto.createHash('md5').update(item.url).digest('hex');
    const content = item.description || item.text || '';
    const contentHash = crypto.createHash('md5').update((item.title + content).slice(0, 1000)).digest('hex');

    await prisma.rawPoolItem.upsert({
        where: { urlHash },
        create: {
            personId,
            sourceType,
            url: item.url,
            urlHash,
            contentHash,
            title: item.title,
            text: content,
            publishedAt: new Date(item.publishedAt || item.updatedAt || new Date()),
            metadata: {
                thumbnailUrl: item.thumbnailUrl,
                stars: item.stars,
                language: item.language,
                viewCount: item.viewCount,
                duration: item.duration
            },
            fetchStatus: 'success',
            fetchedAt: new Date()
        },
        update: {
            title: item.title,
            text: content,
            metadata: {
                thumbnailUrl: item.thumbnailUrl,
                stars: item.stars,
                language: item.language,
                viewCount: item.viewCount
            },
            fetchedAt: new Date()
        }
    });
}

async function main() {
    console.log('=== Triggering Content Fetch for New Channels ===\n');
    const options = parseCliOptions();

    // Get all people
    let people = await prisma.people.findMany({
        orderBy: { name: 'asc' }
    });
    if (options.person) {
        const personFilter = options.person.toLowerCase();
        people = people.filter(person => person.name.toLowerCase().includes(personFilter));
    }
    if (options.limit) {
        people = people.slice(0, options.limit);
    }

    let processedCount = 0;
    let youtubeFetchedCount = 0;
    let youtubeFailedCount = 0;
    const youtubeGlobalFailureReason = options.source === 'github'
        ? null
        : await checkYouTubeApiAvailability();
    if (youtubeGlobalFailureReason) {
        console.log(`YouTube API preflight failed: ${youtubeGlobalFailureReason}`);
    }

    for (const person of people) {
        const links = normalizeOfficialLinks(person.officialLinks);
        const githubLink = links.find(l => l.type === 'github');
        const youtubeLink = links.find(l => l.type === 'youtube');

        if (!githubLink && !youtubeLink) continue;

        const fetchedSources: string[] = [];
        const cursorUpdates: Record<string, string> = {};
        const cursorDeletes = new Set<string>();

        // 1. GitHub Fetch
        if (githubLink && options.source !== 'youtube') {
            // Check if we already have GitHub data for this person
            const count = await prisma.rawPoolItem.count({
                where: { personId: person.id, sourceType: 'github' }
            });

            if (shouldFetch(count, person.lastFetchedAt, 'github')) { // Fetch if empty or older than 7 days
                console.log(`fetching GitHub for ${person.name}...`);
                const handleMatch = githubLink.handle || githubLink.url.match(/github\.com\/([^\/]+)/)?.[1];
                if (handleMatch) {
                    const repos = await getUserRepos(handleMatch, 10);
                    if (repos.length > 0) {
                        console.log(`  Found ${repos.length} repos`);
                        for (const repo of repos) {
                            await saveRawItem(person.id, 'github', {
                                ...repo,
                                title: repo.fullName || repo.name
                            });
                        }
                        fetchedSources.push('github');
                        cursorUpdates.github = new Date().toISOString();
                    }
                    await sleep(1000);
                }
            }
        }

        // 2. YouTube Fetch
        if (youtubeLink && options.source !== 'github') {
            const count = await prisma.rawPoolItem.count({
                where: { personId: person.id, sourceType: 'youtube' }
            });

            if (options.forceYoutube || shouldAttempt(count, person.lastFetchedAt, 'youtube')) {
                console.log(`fetching YouTube for ${person.name}...`);
                const result: YouTubeFetchResult = youtubeGlobalFailureReason
                    ? { ok: false, reason: youtubeGlobalFailureReason }
                    : await fetchYouTubeVideos(youtubeLink.url, youtubeLink.handle, 10);
                const now = new Date().toISOString();
                cursorUpdates.youtubeAttemptedAt = now;

                if (result.ok) {
                    console.log(`  Found ${result.videos.length} videos via ${result.via}`);
                    for (const video of result.videos) {
                        await saveRawItem(person.id, 'youtube', video);
                    }
                    fetchedSources.push('youtube');
                    cursorUpdates.youtube = now;
                    cursorDeletes.add('youtubeLastError');
                    youtubeFetchedCount++;
                } else {
                    console.log(`  YouTube skipped: ${result.reason}`);
                    cursorUpdates.youtubeLastError = result.reason;
                    youtubeFailedCount++;
                }
                await sleep(1000);
            }
        }

        if (fetchedSources.length > 0 || Object.keys(cursorUpdates).length > 0 || cursorDeletes.size > 0) {
            const nextLastFetchedAt = {
                ...toLastFetchedAtObject(person.lastFetchedAt),
                ...cursorUpdates,
            };
            for (const key of cursorDeletes) {
                delete nextLastFetchedAt[key];
            }

            await prisma.people.update({
                where: { id: person.id },
                data: { lastFetchedAt: nextLastFetchedAt }
            });
            if (fetchedSources.length > 0) processedCount++;
        }
    }

    console.log(`\n=== Completed. Fetched content for ${processedCount} people. YouTube fetched ${youtubeFetchedCount}, failed/skipped ${youtubeFailedCount}. ===`);
}

main()
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
