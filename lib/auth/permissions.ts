import { NextResponse } from 'next/server';
import { UserRole, UserStatus } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';

export class AuthAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthAccessError';
    this.status = status;
  }
}

export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new AuthAccessError('请先登录', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      nickname: true,
      displayName: true,
      avatar: true,
      role: true,
      status: true,
      tags: true,
    },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new AuthAccessError('账号不可用', 403);
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== UserRole.ADMIN) {
    throw new AuthAccessError('需要管理员权限', 403);
  }

  return user;
}

export async function requireAdminOrResponse() {
  try {
    return { user: await requireAdmin(), response: null };
  } catch (error) {
    return {
      user: null,
      response: accessErrorResponse(error),
    };
  }
}

export async function requireAdminOrSecretResponse(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.AUTH_SECRET && authHeader === `Bearer ${process.env.AUTH_SECRET}`) {
    return { user: null, response: null };
  }

  return requireAdminOrResponse();
}

export function accessErrorResponse(error: unknown) {
  if (error instanceof AuthAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: '权限校验失败' }, { status: 500 });
}
