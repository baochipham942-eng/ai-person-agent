import { NextResponse } from 'next/server';
import { fetchNewsletterDeliveryMonitor } from '@/lib/newsletter-monitoring';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await fetchNewsletterDeliveryMonitor({
      limit: Number(searchParams.get('limit') || 40),
      status: searchParams.get('status'),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Newsletter delivery monitor failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsletter deliveries' },
      { status: 500 },
    );
  }
}
