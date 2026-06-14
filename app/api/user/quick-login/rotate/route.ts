import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { createQuickLoginDevice } from '@/lib/auth/quick-login';
import { hashToken } from '@/lib/auth/tokens';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { token?: string } | null;
  const token = typeof body?.token === 'string' ? body.token : '';

  if (token) {
    await prisma.quickLoginDevice.updateMany({
      where: {
        userId,
        tokenHash: hashToken(token),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      username: true,
      nickname: true,
      avatar: true,
      phone: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  const { token: nextToken, device } = await createQuickLoginDevice({
    userId,
    userAgent: request.headers.get('user-agent'),
    deviceName: '当前浏览器',
  });

  return NextResponse.json({
    email: user.email,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    phone: user.phone,
    token: nextToken,
    deviceId: device.id,
    deviceName: device.deviceName,
  });
}

