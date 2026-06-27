import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { answerPaperQuestion } from '@/lib/paper-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  question: z.string().trim().min(1).max(800),
  history: z.array(z.object({
    role: z.enum(['assistant', 'user']),
    content: z.string().max(1400),
  })).max(8).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Chat（调用 LLM + 写缓存）仅限登录用户。
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { id } = await params;
  const body = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: '问题格式不正确' }, { status: 400 });
  }

  try {
    const result = await answerPaperQuestion({
      sourceId: id,
      question: body.data.question,
      history: body.data.history || [],
    });
    if (!result) {
      return NextResponse.json({ error: '论文资料不存在' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'paper_chat_failed';
    const status = message === 'paper_chunks_unavailable' ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
