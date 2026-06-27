import { NextRequest, NextResponse } from 'next/server';
import { getOrCreatePaperGuideViewModel } from '@/lib/paper-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const viewModel = await getOrCreatePaperGuideViewModel(id);
    if (!viewModel) {
      return NextResponse.json({ error: '论文资料不存在' }, { status: 404 });
    }

    return NextResponse.json({ viewModel });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'paper_guide_failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
