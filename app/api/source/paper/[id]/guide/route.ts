import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreatePaperGuideViewModel } from '@/lib/paper-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 生成（调用 LLM + 写缓存）仅限登录用户，匿名访问不触发付费生成。
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

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
