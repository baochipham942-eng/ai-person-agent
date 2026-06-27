import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { asRecord } from './utils';

export async function mergePaperMetadata(sourceId: string, patch: Record<string, unknown>): Promise<void> {
  const write = async () => {
    const current = await prisma.rawPoolItem.findUnique({
      where: { id: sourceId },
      select: { metadata: true },
    });
    const next = {
      ...asRecord(current?.metadata ?? null),
      ...patch,
    };
    await prisma.rawPoolItem.update({
      where: { id: sourceId },
      data: { metadata: next as Prisma.InputJsonValue },
    });
  };

  try {
    await write();
  } catch (error) {
    if (!isNeonResetError(error)) throw error;
    await prisma.people.count();
    await write();
  }
}

export async function withNeonWakeup<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (!isNeonResetError(error)) throw error;
    await prisma.people.count();
    return action();
  }
}

function isNeonResetError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ECONNRESET|connection.*reset|terminating connection/i.test(message);
}

export function isMissingPaperDocumentTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /PaperDocument|PaperSection|PaperChunk|does not exist|P2021/i.test(message);
}

export function isMissingProductEvidenceSourceTable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error);
  return /ProductEvidenceSource|does not exist|P2021/i.test(message);
}

export function isMissingPaperEntityReviewTable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error);
  return /PaperEntityReview|does not exist|P2021/i.test(message);
}
