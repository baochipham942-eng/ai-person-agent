import crypto from 'crypto';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db/prisma';

interface RateLimitInput {
  action: string;
  identity: string;
  limit: number;
  windowMs: number;
}

export async function checkAndRecordAuthRateLimit(input: RateLimitInput) {
  const key = `${input.action}:${hashKey(input.identity)}`;
  const since = new Date(Date.now() - input.windowMs);

  const count = await prisma.authRateLimitEvent.count({
    where: {
      key,
      action: input.action,
      createdAt: {
        gte: since,
      },
    },
  });

  if (count >= input.limit) {
    return { allowed: false };
  }

  await prisma.authRateLimitEvent.create({
    data: {
      key,
      action: input.action,
    },
  });

  return { allowed: true };
}

export async function getRequestIdentity(email: string): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = headerList.get('x-real-ip')?.trim();
  const userAgent = headerList.get('user-agent')?.trim();
  return `${email}|${forwardedFor || realIp || 'unknown-ip'}|${userAgent || 'unknown-ua'}`;
}

function hashKey(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

