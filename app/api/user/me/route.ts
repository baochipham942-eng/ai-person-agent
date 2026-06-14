import { NextResponse } from 'next/server';
import { UserStatus } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      nickname: true,
      displayName: true,
      avatar: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user,
  });
}
