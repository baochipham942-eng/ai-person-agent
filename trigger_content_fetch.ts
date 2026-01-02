import { prisma } from './lib/db/prisma';
import { getUserRepos } from './lib/datasources/github';
import { getChannelVideos } from './lib/datasources/youtube';
import crypto from 'crypto';

const YOUTUBE_API_KEY = process.env.GOOGLE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

// Utility to delay execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Resolve YouTube Handle/User to Channel ID
async function resolveYouTubeChannelId(url: string): Promise<string | null> {
    try {
        // 1. Direct Channel ID
        const channelMatch = url.match(/\/channel\/([a-zA-Z0-9_-]+)/);
        if (channelMatch) return channelMatch[1];

        // 2. Handle (@name)
        const handleMatch = url.match(/\/@([a-zA-Z0-9_.-]+)/);
        if (handleMatch && YOUTUBE_API_KEY) {
            const handle = handleMatch[1];
            // Use Search API to find channel by handle (expensive but reliable)
            const response = await fetch(`${YOUTUBE_API_URL}/search?part=snippet&type=channel&q=@${handle}&key=${YOUTUBE_API_KEY}&maxResults=1`);
            const data = await response.json();
            return data.items?.[0]?.snippet?.channelId || null;
        }

        // 3. User (legacy)
        const userMatch = url.match(/\/user\/([a-zA-Z0-9_-]+)/);
        if (userMatch && YOUTUBE_API_KEY) {
            const username = userMatch[1];
            const response = await fetch(`${YOUTUBE_API_URL}/channels?part=id&forUsername=${username}&key=${YOUTUBE_API_KEY}`);
            const data = await response.json();
            return data.items?.[0]?.id || null;
        }
    } catch (e) {
        console.error(`Error resolving YouTube URL ${url}:`, e);
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

    // Get all people
    const people = await prisma.people.findMany({
        orderBy: { name: 'asc' }
    });

    let processedCount = 0;

    for (const person of people) {
        const links = (person.officialLinks as any[]) || [];
        const githubLink = links.find(l => l.type === 'github');
        const youtubeLink = links.find(l => l.type === 'youtube');

        if (!githubLink && !youtubeLink) continue;

        let fetchedSomething = false;

        // 1. GitHub Fetch
        if (githubLink) {
            // Check if we already have GitHub data for this person
            const count = await prisma.rawPoolItem.count({
                where: { personId: person.id, sourceType: 'github' }
            });

            const lastFetched = person.lastFetchedAt ? new Date(person.lastFetchedAt as any) : null;
            if (count === 0 || !lastFetched || lastFetched < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) { // Fetch if empty or older than 7 days
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
                        fetchedSomething = true;
                    }
                    await sleep(1000);
                }
            }
        }

        // 2. YouTube Fetch
        if (youtubeLink) {
            const count = await prisma.rawPoolItem.count({
                where: { personId: person.id, sourceType: 'youtube' }
            });

            const lastFetched = person.lastFetchedAt ? new Date(person.lastFetchedAt as any) : null;
            if (count === 0 || !lastFetched || lastFetched < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
                console.log(`fetching YouTube for ${person.name}...`);
                const channelId = await resolveYouTubeChannelId(youtubeLink.url);
                if (channelId) {
                    const videos = await getChannelVideos(channelId, 10);
                    if (videos.length > 0) {
                        console.log(`  Found ${videos.length} videos`);
                        for (const video of videos) {
                            await saveRawItem(person.id, 'youtube', video);
                        }
                        fetchedSomething = true;
                    }
                    else {
                        console.log(`  No videos found for channel ${channelId}`);
                    }
                } else {
                    console.log(`  Could not resolve channel ID for ${youtubeLink.url}`);
                }
                await sleep(1000);
            }
        }

        if (fetchedSomething) {
            await prisma.people.update({
                where: { id: person.id },
                data: { lastFetchedAt: new Date() }
            });
            processedCount++;
        }
    }

    console.log(`\n=== Completed. Fetched content for ${processedCount} people ===`);
}

main().catch(console.error).finally(() => process.exit(0));
