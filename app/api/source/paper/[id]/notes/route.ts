import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPaperNote, deletePaperNote, getPaperNotes } from '@/lib/paper-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SectionTypeSchema = z.enum(['abstract', 'problem', 'method', 'experiment', 'result', 'limitation', 'other']);

const CreateNoteSchema = z.object({
  body: z.string().trim().min(1).max(1400),
  quote: z.string().trim().max(700).nullable().optional(),
  pageNumber: z.number().int().positive().max(2000).nullable().optional(),
  sectionId: z.string().trim().max(160).nullable().optional(),
  sectionTitle: z.string().trim().max(240).nullable().optional(),
  sectionType: SectionTypeSchema.nullable().optional(),
});

const DeleteNoteSchema = z.object({
  noteId: z.string().trim().min(1).max(160),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const notes = await getPaperNotes(id);
  if (!notes) return NextResponse.json({ error: '论文资料不存在' }, { status: 404 });
  return NextResponse.json({ notes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = CreateNoteSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: '笔记格式不正确' }, { status: 400 });
  }

  try {
    const result = await createPaperNote({
      sourceId: id,
      ...body.data,
    });
    if (!result) return NextResponse.json({ error: '论文资料不存在' }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'paper_note_create_failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = DeleteNoteSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: '笔记删除请求格式不正确' }, { status: 400 });
  }

  const result = await deletePaperNote(id, body.data.noteId);
  if (!result) return NextResponse.json({ error: '论文资料不存在' }, { status: 404 });
  return NextResponse.json(result);
}
