'use server';

import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { getRandomProfile } from '@/lib/constants/userProfiles';
import { addHours, createPlainToken, hashToken, normalizeEmail } from '@/lib/auth/tokens';
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/auth/email';
import { checkAndRecordAuthRateLimit, getRequestIdentity } from '@/lib/auth/rate-limit';

const PASSWORD_MIN_LENGTH = 8;
const EMAIL_VERIFICATION_REQUIRED = false;

const RegisterSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(PASSWORD_MIN_LENGTH, `密码至少需要${PASSWORD_MIN_LENGTH}位`),
  inviteCode: z.string().trim().optional(),
  nickname: z.string().trim().max(24, '昵称最多 24 个字').optional(),
});

const PasswordResetRequestSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
});

const VerificationResendSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
});

const PasswordResetSchema = z.object({
  token: z.string().min(16, '重置链接无效'),
  password: z.string().min(PASSWORD_MIN_LENGTH, `密码至少需要${PASSWORD_MIN_LENGTH}位`),
});

type DbClient = Prisma.TransactionClient | typeof prisma;

export type RegisterUserResult =
  | {
      success: true;
      email: string;
      verificationSent: boolean;
      emailVerificationRequired: boolean;
      isBootstrapAdmin: boolean;
      message: string;
    }
  | { success: false; error: string };

export type SimpleAuthActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function registerUser(prevState: string | undefined, formData: FormData): Promise<RegisterUserResult> {
  void prevState;

  const email = normalizeEmail(formData.get('email'));
  const password = formData.get('password') as string;
  const inviteCode = (formData.get('inviteCode') as string | null)?.trim();
  const nickname = (formData.get('nickname') as string | null)?.trim();

  const validatedFields = RegisterSchema.safeParse({ email, password, inviteCode, nickname });
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.issues[0].message };
  }

  const isBootstrapAdmin = isBootstrapAdminEmail(email);

  if (!isBootstrapAdmin && !inviteCode) {
    return { success: false, error: '请输入邀请码' };
  }

  const registerLimit = await checkAndRecordAuthRateLimit({
    action: 'register',
    identity: await getRequestIdentity(email),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!registerLimit.allowed) {
    return { success: false, error: '注册请求过于频繁，请稍后再试' };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const quickLoginToken = crypto.randomBytes(32).toString('hex');
  const randomProfile = getRandomProfile();
  const displayName = nickname || randomProfile.nickname;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findFirst({
        where: {
          OR: [
            { email },
            { username: email },
          ],
        },
        select: {
          id: true,
          status: true,
          email: true,
          nickname: true,
          displayName: true,
          avatar: true,
          tags: true,
        },
      });

      if (existingUser) {
        if (canReactivatePendingEmailUser(existingUser)) {
          const nextDisplayName = nickname || existingUser.displayName || existingUser.nickname || displayName;
          const user = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash: hashedPassword,
              quickLoginToken,
              nickname: nextDisplayName,
              displayName: nextDisplayName,
              avatar: existingUser.avatar || randomProfile.avatar,
              status: UserStatus.ACTIVE,
              tags: mergeUserTags(existingUser.tags, ['email-verification-skipped']),
            },
            select: {
              id: true,
              email: true,
            },
          });

          await tx.userAuditLog.create({
            data: {
              targetUserId: user.id,
              action: 'PENDING_EMAIL_REGISTRATION_ACTIVATED',
              metadata: {
                email,
                reason: 'email_verification_paused_retry',
              } satisfies Prisma.InputJsonObject,
            },
          });

          return { user, token: null, reactivated: true };
        }

        throw new Error('该邮箱已注册');
      }

      let invite: { id: string; usedCount: number; maxUsages: number; expiresAt: Date } | null = null;

      if (!isBootstrapAdmin) {
        invite = await tx.invitationCode.findFirst({
          where: {
            code: {
              equals: inviteCode,
              mode: 'insensitive',
            },
          },
          select: {
            id: true,
            usedCount: true,
            maxUsages: true,
            expiresAt: true,
          },
        });

        if (!invite) throw new Error('邀请码无效');
        if (invite.expiresAt < new Date()) throw new Error('邀请码已过期');
        if (invite.usedCount >= invite.maxUsages) throw new Error('邀请码已被使用完');
      }

      const user = await tx.user.create({
        data: {
          username: email,
          email,
          passwordHash: hashedPassword,
          quickLoginToken,
          nickname: displayName,
          displayName,
          avatar: randomProfile.avatar,
          role: isBootstrapAdmin ? UserRole.ADMIN : UserRole.USER,
          status: EMAIL_VERIFICATION_REQUIRED ? UserStatus.PENDING_EMAIL : UserStatus.ACTIVE,
          tags: isBootstrapAdmin
            ? ['bootstrap-admin']
            : EMAIL_VERIFICATION_REQUIRED
              ? ['invited']
              : ['invited', 'email-verification-skipped'],
          userProfile: {
            create: {},
          },
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (invite) {
        await tx.invitationCode.update({
          where: { id: invite.id },
          data: { usedCount: { increment: 1 } },
        });

        await tx.invitationCodeUse.create({
          data: {
            invitationCodeId: invite.id,
            userId: user.id,
          },
        });
      }

      await tx.userAuditLog.create({
        data: {
          targetUserId: user.id,
          action: isBootstrapAdmin ? 'BOOTSTRAP_ADMIN_REGISTERED' : 'USER_REGISTERED',
          metadata: {
            email,
            invitationCodeId: invite?.id ?? null,
          } satisfies Prisma.InputJsonObject,
        },
      });

      const token = EMAIL_VERIFICATION_REQUIRED
        ? await createEmailVerificationToken(tx, user.id)
        : null;
      return { user, token, reactivated: false };
    }, {
      maxWait: 10_000,
      timeout: 20_000,
    });

    if (!EMAIL_VERIFICATION_REQUIRED) {
      await prisma.userAuditLog.create({
        data: {
          targetUserId: result.user.id,
          action: 'EMAIL_VERIFICATION_SKIPPED',
          metadata: {
            email,
            reason: 'temporary_registration_open',
          } satisfies Prisma.InputJsonObject,
        },
      });

      return {
        success: true,
        email,
        verificationSent: false,
        emailVerificationRequired: false,
        isBootstrapAdmin,
        message: result.reactivated ? '账号已激活，正在登录' : '注册成功，正在登录',
      };
    }

    if (!result.token) {
      return { success: false, error: '注册失败，请稍后重试' };
    }

    const emailResult = await sendVerificationEmail(email, result.token);

    await prisma.userAuditLog.create({
      data: {
        targetUserId: result.user.id,
        action: emailResult.sent ? 'EMAIL_VERIFICATION_SENT' : 'EMAIL_VERIFICATION_SEND_FAILED',
        metadata: {
          email,
          error: emailResult.error,
          providerMessageId: emailResult.providerMessageId,
        } satisfies Prisma.InputJsonObject,
      },
    });

    return {
      success: true,
      email,
      verificationSent: emailResult.sent,
      emailVerificationRequired: true,
      isBootstrapAdmin,
      message: emailResult.sent
        ? '注册成功，请去邮箱完成验证'
        : '注册成功，但验证邮件发送失败，请联系管理员重发',
    };
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Error && isExpectedRegistrationError(error.message)) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '注册失败，请稍后重试' };
  }
}

export async function requestPasswordReset(prevState: string | undefined, formData: FormData): Promise<SimpleAuthActionResult> {
  void prevState;

  const email = normalizeEmail(formData.get('email'));
  const validatedFields = PasswordResetRequestSchema.safeParse({ email });
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.issues[0].message };
  }

  const resetLimit = await checkAndRecordAuthRateLimit({
    action: 'password_reset_request',
    identity: await getRequestIdentity(email),
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });

  if (!resetLimit.allowed) {
    return { success: true, message: '如果邮箱已注册，重置链接会发送到该邮箱' };
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        email,
        status: { not: UserStatus.DELETED },
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (user?.email) {
      const recentTokens = await prisma.passwordResetToken.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      });

      if (recentTokens >= 3) {
        return { success: true, message: '如果邮箱已注册，重置链接会发送到该邮箱' };
      }

      const token = await createPasswordResetToken(prisma, user.id);
      const emailResult = await sendPasswordResetEmail(user.email, token);
      await prisma.userAuditLog.create({
        data: {
          targetUserId: user.id,
          action: emailResult.sent ? 'PASSWORD_RESET_SENT' : 'PASSWORD_RESET_SEND_FAILED',
          metadata: {
            email,
            error: emailResult.error,
            providerMessageId: emailResult.providerMessageId,
          } satisfies Prisma.InputJsonObject,
        },
      });
    }

    return { success: true, message: '如果邮箱已注册，重置链接会发送到该邮箱' };
  } catch (error) {
    console.error('Password reset request error:', error);
    return { success: false, error: '发送重置邮件失败，请稍后重试' };
  }
}

export async function resendVerificationByEmail(prevState: string | undefined, formData: FormData): Promise<SimpleAuthActionResult> {
  void prevState;

  const email = normalizeEmail(formData.get('email'));
  const validatedFields = VerificationResendSchema.safeParse({ email });
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.issues[0].message };
  }

  const resendLimit = await checkAndRecordAuthRateLimit({
    action: 'verification_resend',
    identity: await getRequestIdentity(email),
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });

  if (!resendLimit.allowed) {
    return { success: false, error: '验证邮件发送过于频繁，请稍后再试' };
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        email,
        status: { not: UserStatus.DELETED },
      },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        status: true,
      },
    });

    if (!user) {
      return { success: true, message: '如果邮箱已注册且未验证，验证链接会发送到该邮箱' };
    }

    if (user.emailVerifiedAt || user.status === UserStatus.ACTIVE) {
      return { success: false, error: '该邮箱已经验证，可以直接登录' };
    }

    const recentTokens = await prisma.emailVerificationToken.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    });

    if (recentTokens >= 3) {
      return { success: false, error: '验证邮件发送过于频繁，请稍后再试' };
    }

    const result = await resendVerificationForUser(user.id, null);
    if (!result.success) return result;
    return { success: true, message: '验证邮件已发送，请检查邮箱' };
  } catch (error) {
    console.error('Resend verification by email error:', error);
    return { success: false, error: '验证邮件发送失败，请稍后重试' };
  }
}

export async function resetPassword(prevState: string | undefined, formData: FormData): Promise<SimpleAuthActionResult> {
  void prevState;

  const token = (formData.get('token') as string | null)?.trim() || '';
  const password = formData.get('password') as string;
  const validatedFields = PasswordResetSchema.safeParse({ token, password });
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.issues[0].message };
  }

  try {
    const tokenHash = hashToken(token);
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      const row = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!row || row.usedAt || row.expiresAt < new Date() || row.user.status === UserStatus.DELETED) {
        throw new Error('重置链接无效或已过期');
      }

      await tx.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: row.userId },
        data: {
          passwordHash: hashedPassword,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });

      await tx.userAuditLog.create({
        data: {
          targetUserId: row.userId,
          action: 'PASSWORD_RESET_COMPLETED',
        },
      });
    });

    return { success: true, message: '密码已更新，请重新登录' };
  } catch (error) {
    console.error('Password reset error:', error);
    if (error instanceof Error && error.message) return { success: false, error: error.message };
    return { success: false, error: '重置密码失败，请稍后重试' };
  }
}

export async function resendVerificationForUser(userId: string, actorUserId?: string | null): Promise<SimpleAuthActionResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        status: true,
      },
    });

    if (!user || !user.email || user.status === UserStatus.DELETED) {
      return { success: false, error: '用户不存在或邮箱不可用' };
    }

    if (user.emailVerifiedAt) {
      return { success: false, error: '该用户邮箱已验证' };
    }

    const token = await createEmailVerificationToken(prisma, user.id);
    const emailResult = await sendVerificationEmail(user.email, token);

    await prisma.userAuditLog.create({
      data: {
        actorUserId,
        targetUserId: user.id,
        action: emailResult.sent ? 'EMAIL_VERIFICATION_RESENT' : 'EMAIL_VERIFICATION_RESEND_FAILED',
        metadata: {
          email: user.email,
          error: emailResult.error,
          providerMessageId: emailResult.providerMessageId,
        } satisfies Prisma.InputJsonObject,
      },
    });

    return emailResult.sent
      ? { success: true, message: '验证邮件已发送' }
      : { success: false, error: emailResult.error || '验证邮件发送失败' };
  } catch (error) {
    console.error('Resend verification error:', error);
    return { success: false, error: '验证邮件发送失败' };
  }
}

export async function createPasswordResetForUser(userId: string, actorUserId?: string | null): Promise<SimpleAuthActionResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    if (!user || !user.email || user.status === UserStatus.DELETED) {
      return { success: false, error: '用户不存在或邮箱不可用' };
    }

    const token = await createPasswordResetToken(prisma, user.id);
    const emailResult = await sendPasswordResetEmail(user.email, token);

    await prisma.userAuditLog.create({
      data: {
        actorUserId,
        targetUserId: user.id,
        action: emailResult.sent ? 'ADMIN_PASSWORD_RESET_SENT' : 'ADMIN_PASSWORD_RESET_SEND_FAILED',
        metadata: {
          email: user.email,
          error: emailResult.error,
          providerMessageId: emailResult.providerMessageId,
        } satisfies Prisma.InputJsonObject,
      },
    });

    return emailResult.sent
      ? { success: true, message: '重置密码邮件已发送' }
      : { success: false, error: emailResult.error || '重置密码邮件发送失败' };
  } catch (error) {
    console.error('Admin password reset error:', error);
    return { success: false, error: '重置密码邮件发送失败' };
  }
}

export async function createEmailVerificationToken(client: DbClient, userId: string): Promise<string> {
  const token = createPlainToken();
  await client.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: addHours(new Date(), 24),
    },
  });
  return token;
}

export async function createPasswordResetToken(client: DbClient, userId: string): Promise<string> {
  const token = createPlainToken();
  await client.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: addHours(new Date(), 1),
    },
  });
  return token;
}

function isBootstrapAdminEmail(email: string): boolean {
  const configured = (process.env.INITIAL_ADMIN_EMAILS || '')
    .split(',')
    .map(item => normalizeEmail(item))
    .filter(Boolean);

  return configured.includes(email);
}

function isExpectedRegistrationError(message: string): boolean {
  return [
    '该邮箱已注册',
    '邀请码无效',
    '邀请码已过期',
    '邀请码已被使用完',
  ].includes(message);
}

function canReactivatePendingEmailUser(user: { status: UserStatus }): boolean {
  return !EMAIL_VERIFICATION_REQUIRED && user.status === UserStatus.PENDING_EMAIL;
}

function mergeUserTags(currentTags: string[], nextTags: string[]): string[] {
  return [...new Set([...currentTags, ...nextTags])].slice(0, 12);
}
