import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserWatchlist, mergeUserWatchlist } from '@/lib/user-profile';
import { emptyWatchlist, normalizeWatchlist } from '@/lib/watchlist';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({
        authenticated: false,
        watchlist: emptyWatchlist(),
      });
    }

    const watchlist = await getUserWatchlist(userId);
    return NextResponse.json({
      authenticated: true,
      watchlist,
    });
  } catch (error) {
    console.error('Failed to fetch watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const localWatchlist = normalizeWatchlist(body?.watchlist);
    const watchlist = await mergeUserWatchlist(userId, localWatchlist);

    return NextResponse.json({
      authenticated: true,
      watchlist,
    });
  } catch (error) {
    console.error('Failed to merge watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to merge watchlist' },
      { status: 500 }
    );
  }
}
