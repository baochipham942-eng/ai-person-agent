import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOrResponse } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { response } = await requireAdminOrResponse();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel')?.trim();

  const rows = await prisma.invitationCode.findMany({
    where: channel ? { channel } : {},
    select: {
      code: true,
      channel: true,
      note: true,
      maxUsages: true,
      usedCount: true,
      expiresAt: true,
      createdAt: true,
      createdBy: {
        select: {
          email: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const csv = [
    ['code', 'channel', 'note', 'used_count', 'max_usages', 'expires_at', 'created_at', 'created_by'].join(','),
    ...rows.map(row => [
      row.code,
      row.channel || '',
      row.note || '',
      String(row.usedCount),
      String(row.maxUsages),
      row.expiresAt.toISOString(),
      row.createdAt.toISOString(),
      row.createdBy?.email || row.createdBy?.username || '',
    ].map(csvCell).join(',')),
  ].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="invitation-codes.csv"',
    },
  });
}

function csvCell(value: string): string {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

