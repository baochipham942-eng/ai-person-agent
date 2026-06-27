import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { translatePaperToChinese } from '@/lib/paper-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  scope: z.enum(['page', 'abstract']),
  pageNumber: z.number().int().positive().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: '翻译请求格式不正确' }, { status: 400 });
  }

  try {
    const result = await translatePaperToChinese({
      sourceId: id,
      scope: body.data.scope,
      pageNumber: body.data.pageNumber ?? null,
    });
    if (!result) {
      return NextResponse.json({ error: '论文资料不存在' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'paper_translation_failed';
    const status = /unavailable|empty/.test(message) ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
