import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PAPER_NOTES_LIMIT, PAPER_NOTES_VERSION } from './constants';
import { CachedPaperNotesSchema, normalizeSectionType } from './schemas';
import type { CreatePaperNoteInput, PaperNote } from './types';
import { loadPaperSource } from './source';
import { mergePaperMetadata } from './storage';
import {
  asRecord,
  normalizeNotePage,
  normalizeOptionalNoteText,
  sanitizePaperTextForStorage,
  truncate,
} from './utils';

export async function getPaperNotes(sourceId: string): Promise<PaperNote[] | null> {
  const source = await loadPaperSource(sourceId);
  if (!source) return null;
  return listPaperNotesFromMetadata(source.metadata);
}

export async function createPaperNote(input: CreatePaperNoteInput): Promise<{ note: PaperNote; notes: PaperNote[] } | null> {
  const source = await loadPaperSource(input.sourceId);
  if (!source) return null;

  const now = new Date().toISOString();
  const note: PaperNote = {
    id: randomUUID(),
    body: truncate(sanitizePaperTextForStorage(input.body).trim(), 1400),
    quote: normalizeOptionalNoteText(input.quote, 700),
    pageNumber: normalizeNotePage(input.pageNumber),
    sectionId: normalizeOptionalNoteText(input.sectionId, 160),
    sectionTitle: normalizeOptionalNoteText(input.sectionTitle, 240),
    sectionType: input.sectionType ? normalizeSectionType(input.sectionType) : null,
    createdAt: now,
    updatedAt: now,
  };
  if (!note.body) throw new Error('paper_note_body_empty');

  const existing = listPaperNotesFromMetadata(source.metadata);
  const notes = [note, ...existing.filter(item => item.id !== note.id)].slice(0, PAPER_NOTES_LIMIT);
  await persistPaperNotes(source.id, notes, now);
  return { note, notes };
}

export async function deletePaperNote(sourceId: string, noteId: string): Promise<{ deleted: boolean; notes: PaperNote[] } | null> {
  const source = await loadPaperSource(sourceId);
  if (!source) return null;

  const existing = listPaperNotesFromMetadata(source.metadata);
  const notes = existing.filter(note => note.id !== noteId);
  const deleted = notes.length !== existing.length;
  if (deleted) await persistPaperNotes(source.id, notes);
  return { deleted, notes };
}

export function listPaperNotesFromMetadata(metadata: Prisma.JsonValue | null): PaperNote[] {
  const cached = CachedPaperNotesSchema.safeParse(asRecord(metadata).paperNotes);
  if (!cached.success || cached.data.version !== PAPER_NOTES_VERSION) return [];
  return cached.data.items
    .map(note => ({
      id: note.id,
      body: note.body,
      quote: note.quote,
      pageNumber: note.pageNumber,
      sectionId: note.sectionId,
      sectionTitle: note.sectionTitle,
      sectionType: note.sectionType,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }))
    .filter(note => note.id && note.body)
    .slice(0, PAPER_NOTES_LIMIT);
}

export async function persistPaperNotes(sourceId: string, notes: PaperNote[], updatedAt = new Date().toISOString()): Promise<void> {
  await mergePaperMetadata(sourceId, {
    paperNotes: {
      version: PAPER_NOTES_VERSION,
      updatedAt,
      items: notes.slice(0, PAPER_NOTES_LIMIT),
    },
  });
}
