import { prisma } from '@/lib/db/prisma';
import { createPlainToken, hashToken } from '@/lib/auth/tokens';

export interface QuickLoginDeviceInput {
  userId: string;
  userAgent?: string | null;
  ipHash?: string | null;
  deviceName?: string | null;
}

export async function createQuickLoginDevice(input: QuickLoginDeviceInput) {
  const token = createPlainToken();
  const device = await prisma.quickLoginDevice.create({
    data: {
      userId: input.userId,
      tokenHash: hashToken(token),
      userAgent: input.userAgent || null,
      ipHash: input.ipHash || null,
      deviceName: input.deviceName || inferDeviceName(input.userAgent),
      lastUsedAt: new Date(),
    },
    select: {
      id: true,
      deviceName: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return { token, device };
}

export async function findActiveQuickLoginDevice(token: string) {
  const tokenHash = hashToken(token);
  return prisma.quickLoginDevice.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      user: {
        status: 'ACTIVE',
      },
    },
    include: {
      user: true,
    },
  });
}

export async function markQuickLoginDeviceUsed(deviceId: string) {
  await prisma.quickLoginDevice.update({
    where: { id: deviceId },
    data: {
      lastUsedAt: new Date(),
    },
  });
}

export function inferDeviceName(userAgent: string | null | undefined): string {
  const value = userAgent || '';
  if (value.includes('Chrome')) return 'Chrome';
  if (value.includes('Safari')) return 'Safari';
  if (value.includes('Firefox')) return 'Firefox';
  if (value.includes('Edg')) return 'Edge';
  return '当前浏览器';
}

