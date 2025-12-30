import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
        return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    try {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AI-Person-Agent',
        };

        // If you have a GITHUB_TOKEN in env, use it to increase rate limits
        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        // Fetch repos sorted by stars (popularity)
        // Note: 'sort=stars' is only available for search endpoint. 
        // For user repos list, sort options are: created, updated, pushed, full_name.
        // We will fetch list then sort locally, or use search api. 
        // Using user repos endpoint is safer for getting all user's repos.
        // Let's fetch 30 repos sorted by pushed first to see active ones, or just fetch top 100.

        // Actually for "showcase" people usually want to see most stared repos.
        // Let's use the search API restricted to user: `user:{username}`
        const searchRes = await fetch(
            `https://api.github.com/search/repositories?q=user:${username}&sort=stars&order=desc&per_page=20`,
            { headers }
        );

        if (!searchRes.ok) {
            const error = await searchRes.json();
            throw new Error(error.message || searchRes.statusText);
        }

        const data = await searchRes.json();

        // Return refined structure
        const repos = data.items.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count,
            language: repo.language,
            updated_at: repo.updated_at,
            topics: repo.topics,
        }));

        return NextResponse.json({ repos });
    } catch (error) {
        console.error('GitHub API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch GitHub repositories' },
            { status: 500 }
        );
    }
}
