import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const devices = await prisma.quickLoginDevice.findMany({
    where: { userId },
    select: {
      id: true,
      deviceName: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
    orderBy: [{ revokedAt: 'asc' }, { lastUsedAt: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });

  return NextResponse.json({
    devices: devices.map(device => ({
      id: device.id,
      deviceName: device.deviceName,
      userAgent: device.userAgent,
      createdAt: device.createdAt.toISOString(),
      lastUsedAt: device.lastUsedAt ? device.lastUsedAt.toISOString() : null,
      revokedAt: device.revokedAt ? device.revokedAt.toISOString() : null,
    })),
  });
}

export async function DELETE(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { deviceId?: string } | null;
  const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : '';

  if (!deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
  }

  const result = await prisma.quickLoginDevice.updateMany({
    where: {
      id: deviceId,
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, revoked: result.count });
}

