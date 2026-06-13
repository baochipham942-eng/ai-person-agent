import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  NewsletterValidationError,
  getNewsletterSettings,
  normalizeEmail,
  normalizeFrequency,
  updateNewsletterSettings,
} from '@/lib/newsletter';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({
        authenticated: false,
        settings: {
          frequency: 'none',
          email: null,
          unsubscribeToken: null,
          updatedAt: null,
        },
      });
    }

    const settings = await getNewsletterSettings(userId);
    return NextResponse.json({
      authenticated: true,
      settings,
    });
  } catch (error) {
    console.error('Failed to fetch newsletter settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsletter settings' },
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
    const settings = await updateNewsletterSettings(userId, {
      frequency: normalizeFrequency(body?.frequency),
      email: body?.frequency === 'none' ? body?.email ?? null : normalizeEmail(body?.email),
    });

    return NextResponse.json({
      authenticated: true,
      settings,
    });
  } catch (error) {
    if (error instanceof NewsletterValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error('Failed to update newsletter settings:', error);
    return NextResponse.json(
      { error: 'Failed to update newsletter settings' },
      { status: 500 }
    );
  }
}
