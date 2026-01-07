
import 'dotenv/config';
import { getChannelVideos } from './lib/datasources/youtube';

// Andrew Ng's QID: Q2986518
// Andrej Karpathy's QID: Q56037405

async function fetchFromWikidata(personName: string, qid: string) {
    console.log(`\n--- [Wikidata (Free)] Querying for ${personName} (${qid}) ---`);

    // Query for works (P1455 list of works, or P800 notable work) that are:
    // Q37922 (MOOC), Q1425881 (online course), Q24855325 (series of creative works)
    const sparql = `
        SELECT ?work ?workLabel ?url ?platformLabel WHERE {
            wd:${qid} wdt:P800|wdt:P1455 ?work .
            ?work wdt:P31/wdt:P279* wd:Q37922 . # MOOC or subclass
            OPTIONAL { ?work wdt:P856 ?url }
            OPTIONAL { ?work wdt:P123 ?platform . ?platform rdfs:label ?platformLabel FILTER(LANG(?platformLabel) = "en") }
            SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
    `;

    try {
        const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
        const res = await fetch(url, { headers: { 'User-Agent': 'AI-Person-Agent/1.0' } });
        const data = await res.json();
        const results = data.results?.bindings || [];

        if (results.length === 0) {
            console.log('  No MOOCs/Courses found in Wikidata structured data.');
        } else {
            console.log(`  Found ${results.length} items:`);
            results.forEach((r: any) => {
                console.log(`  - ${r.workLabel.value} (${r.platformLabel?.value || 'Unknown Platform'})`);
                if (r.url) console.log(`    URL: ${r.url.value}`);
            });
        }
    } catch (e: any) {
        console.error('Wikidata error:', e.message);
    }
}

async function fetchFromYouTubeFree(personName: string, channelId?: string) {
    if (!channelId || !process.env.GOOGLE_API_KEY) {
        console.log(`\n--- [YouTube (Free Quota)] Skipping ${personName} (No Channel ID or API Key) ---`);
        return;
    }

    console.log(`\n--- [YouTube (Free Quota)] Searching Playlists for ${personName} ---`);
    const API_KEY = process.env.GOOGLE_API_KEY;
    const API_URL = 'https://www.googleapis.com/youtube/v3';

    try {
        // Search for Playlists in the channel that contain "Course", "Lecture", "Zero to Hero"
        // Note: 'search' cost 100 quota units, 'playlists' cost 1. 
        // Better to list playlists from channel.
        const res = await fetch(`${API_URL}/playlists?part=snippet&channelId=${channelId}&maxResults=20&key=${API_KEY}`);
        const data = await res.json();

        const playlists = data.items || [];
        const potentialCourses = playlists.filter((p: any) => {
            const title = p.snippet.title.toLowerCase();
            return title.includes('course') ||
                title.includes('lecture') ||
                title.includes('series') ||
                title.includes('tutorial') ||
                title.includes('zero to hero') ||
                title.includes('deep learning');
        });

        if (potentialCourses.length === 0) {
            console.log(`  Found ${playlists.length} playlists, but none look like courses.`);
        } else {
            console.log(`  Found ${potentialCourses.length} potential course playlists:`);
            potentialCourses.forEach((p: any) => {
                console.log(`  - [YouTube Playlist] ${p.snippet.title}`);
                console.log(`    URL: https://www.youtube.com/playlist?list=${p.id}`);
            });
        }

    } catch (e: any) {
        console.error('YouTube error:', e.message);
    }
}

async function main() {
    // 1. Andrew Ng
    await fetchFromWikidata('Andrew Ng', 'Q2986518');
    // Andrew Ng doesn't have a personal YouTube channel listed easily, usually DeepLearning.AI

    // 2. Andrej Karpathy
    await fetchFromWikidata('Andrej Karpathy', 'Q56037405');
    // Karpathy's Channel ID: UCPGj956GD47YIInaDnPKS1g (from previous knowledge or resolve)
    await fetchFromYouTubeFree('Andrej Karpathy', 'UCPGj956GD47YIInaDnPKS1g');
}

main();
