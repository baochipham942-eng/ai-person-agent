import { PrismaClient } from '@prisma/client';
import { searchYouTubeVideos } from './lib/datasources/youtube';
import { searchPersonContent } from './lib/datasources/exa';
import { searchOpenAlexAuthor, getAuthorWorks } from './lib/datasources/openalex';
import { searchPodcasts } from './lib/datasources/itunes';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    const personId = 'cmjsme4n800009u972zrrxrei';
    const person = await prisma.people.findUnique({ where: { id: personId } });
    if (!person) return console.log('Person not found');

    console.log(`Supplementing data for ${person.name}...`);

    const qid = person.qid;
    const name = person.name;
    const englishName = 'Andrej Karpathy';

    // 1. YouTube
    const youtubeHandle = person.officialLinks && Array.isArray(person.officialLinks)
        ? (person.officialLinks as any[]).find(l => l.type === 'youtube')?.handle
        : null;

    if (youtubeHandle) {
        console.log('Fetching YouTube...');
        try {
            const videos = await searchYouTubeVideos(englishName, 5);
            for (const v of videos) {
                const urlHash = crypto.createHash('md5').update(v.url).digest('hex');
                await prisma.rawPoolItem.upsert({
                    where: { urlHash },
                    create: {
                        personId,
                        sourceType: 'youtube',
                        url: v.url,
                        urlHash,
                        contentHash: crypto.createHash('md5').update(v.description || v.title).digest('hex'),
                        title: v.title,
                        text: v.description,
                        publishedAt: v.publishedAt ? new Date(v.publishedAt) : new Date(),
                        fetchStatus: 'success',
                        metadata: { isOfficial: true }
                    },
                    update: {}
                });
            }
            console.log(`Saved ${videos.length} videos`);
        } catch (e) {
            console.error('YouTube error:', e);
        }
    }

    // 2. OpenAlex
    console.log('Fetching OpenAlex (Name Search)...');
    try {
        const authors = await searchOpenAlexAuthor(englishName);
        if (authors.length > 0) {
            const author = authors[0];
            console.log(`Found author: ${author.displayName} (${author.worksCount} works)`);
            const works = await getAuthorWorks(author.id);
            for (const w of works) {
                const urlHash = crypto.createHash('md5').update(w.url || w.id).digest('hex');
                await prisma.rawPoolItem.upsert({
                    where: { urlHash },
                    create: {
                        personId,
                        sourceType: 'openalex',
                        url: w.url || w.id,
                        urlHash,
                        contentHash: crypto.createHash('md5').update(w.abstract || w.title).digest('hex'),
                        title: w.title,
                        text: w.abstract || '',
                        publishedAt: new Date(w.publicationDate),
                        fetchStatus: 'success',
                        metadata: {
                            citationCount: w.citationCount,
                            venue: w.venue,
                            authors: w.authors,
                            isOfficial: true
                        }
                    },
                    update: {}
                });
            }
            console.log(`Saved ${works.length} papers`);
        } else {
            console.log('No OpenAlex author found');
        }
    } catch (e) {
        console.error('OpenAlex error:', e);
    }

    // 3. Exa
    console.log('Fetching Exa...');
    try {
        const results = await searchPersonContent(name, ['AndrejKarpathy', 'Karpathy'], []);
        for (const item of results) {
            const urlHash = crypto.createHash('md5').update(item.url).digest('hex');
            await prisma.rawPoolItem.upsert({
                where: { urlHash },
                create: {
                    personId,
                    sourceType: 'exa',
                    url: item.url,
                    urlHash,
                    contentHash: crypto.createHash('md5').update(item.text).digest('hex'),
                    title: item.title,
                    text: item.text,
                    publishedAt: new Date(item.publishedDate || Date.now()),
                    fetchStatus: 'success',
                    metadata: {}
                },
                update: {}
            });
        }
        console.log(`Saved ${results.length} articles`);
    } catch (e) { console.error('Exa error:', e) }

    // 4. Podcast
    console.log('Fetching Podcasts...');
    try {
        const pods = await searchPodcasts(englishName, 5);
        for (const p of pods) {
            const urlHash = crypto.createHash('md5').update(p.url).digest('hex');
            await prisma.rawPoolItem.upsert({
                where: { urlHash },
                create: {
                    personId,
                    sourceType: 'podcast',
                    url: p.url,
                    urlHash,
                    contentHash: crypto.createHash('md5').update(p.title).digest('hex'), // Description missing, use title
                    title: p.title,
                    text: p.title + ' - ' + p.author, // Combine for text
                    publishedAt: p.publishedAt ? new Date(p.publishedAt) : new Date(),
                    fetchStatus: 'success',
                    metadata: { thumbnailUrl: p.thumbnailUrl, categories: p.categories, isOfficial: false }
                },
                update: {}
            });
        }
        console.log(`Saved ${pods.length} podcasts`);
    } catch (e) { console.error('Podcast error:', e) }

    console.log('Done!');
    await prisma.$disconnect();
}
main();
