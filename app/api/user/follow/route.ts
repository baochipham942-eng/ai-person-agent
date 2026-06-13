import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { setUserFollow } from '@/lib/user-profile';
import { normalizeWatchTarget, type WatchTargetType } from '@/lib/watchlist';

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set<WatchTargetType>(['person', 'topic', 'organization']);

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
    const type = body?.type;
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const label = typeof body?.label === 'string' ? body.label.trim() : id;
    const href = typeof body?.href === 'string' ? body.href : '';
    const following = Boolean(body?.following);

    if (!VALID_TYPES.has(type) || !id) {
      return NextResponse.json(
        { error: 'Invalid follow target' },
        { status: 400 }
      );
    }

    const target = normalizeWatchTarget({
      type,
      id,
      label,
      href,
    });
    const watchlist = await setUserFollow(userId, target, following);

    return NextResponse.json({
      authenticated: true,
      watchlist,
    });
  } catch (error) {
    console.error('Failed to update follow state:', error);
    return NextResponse.json(
      { error: 'Failed to update follow state' },
      { status: 500 }
    );
  }
}
