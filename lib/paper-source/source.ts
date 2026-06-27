import { prisma } from '@/lib/db/prisma';
import type { PaperSourceRecord } from './types';
import { withNeonWakeup } from './storage';

export async function loadPaperSource(id: string): Promise<PaperSourceRecord | null> {
  const source = await withNeonWakeup(() => prisma.rawPoolItem.findUnique({
    where: { id },
    select: {
      id: true,
      sourceType: true,
      title: true,
      url: true,
      text: true,
      publishedAt: true,
      metadata: true,
      person: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          currentTitle: true,
        },
      },
    },
  }));

  if (!source || source.sourceType !== 'openalex') return null;
  return source;
}

export function internalPaperSourceHref(sourceItemId: string | null | undefined): string | null {
  if (!sourceItemId) return null;
  return `/source/paper/${sourceItemId}`;
}
