import { Prisma, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { hashToken } from '@/lib/auth/tokens';

export type TokenConsumeResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function verifyEmailToken(token: string): Promise<TokenConsumeResult> {
  const tokenValue = token.trim();
  if (!tokenValue) return { success: false, message: '验证链接无效' };

  try {
    const tokenHash = hashToken(tokenValue);

    await prisma.$transaction(async (tx) => {
      const row = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
        },
      });

      if (!row || row.usedAt || row.expiresAt < new Date() || row.user.status === UserStatus.DELETED) {
        throw new Error('验证链接无效或已过期');
      }

      await tx.emailVerificationToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: row.userId },
        data: {
          emailVerifiedAt: new Date(),
          status: row.user.status === UserStatus.PENDING_EMAIL ? UserStatus.ACTIVE : row.user.status,
        },
      });

      await tx.userAuditLog.create({
        data: {
          targetUserId: row.userId,
          action: 'EMAIL_VERIFIED',
          metadata: {
            email: row.user.email,
          } satisfies Prisma.InputJsonObject,
        },
      });
    });

    return { success: true, message: '邮箱验证完成，请登录' };
  } catch (error) {
    console.error('Email verification error:', error);
    if (error instanceof Error && error.message) return { success: false, message: error.message };
    return { success: false, message: '邮箱验证失败，请重新发送验证邮件' };
  }
}

