'use server';

import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';
import { createPasswordResetForUser, resendVerificationForUser } from '@/lib/actions/register';

export async function updateUserRoleAction(formData: FormData) {
  const actor = await requireAdmin();
  const userId = stringValue(formData.get('userId'));
  const role = stringValue(formData.get('role'));

  if (!userId || !isUserRole(role)) return;
  if (userId === actor.id && role !== UserRole.ADMIN) return;

  await prisma.$transaction(async (tx) => {
    const previous = await tx.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!previous) return;

    await tx.user.update({
      where: { id: userId },
      data: { role },
    });

    await tx.userAuditLog.create({
      data: {
        actorUserId: actor.id,
        targetUserId: userId,
        action: 'ADMIN_UPDATED_USER_ROLE',
        metadata: {
          previousRole: previous.role,
          nextRole: role,
        } satisfies Prisma.InputJsonObject,
      },
    });
  });

  revalidatePath('/admin/users');
}

export async function updateUserStatusAction(formData: FormData) {
  const actor = await requireAdmin();
  const userId = stringValue(formData.get('userId'));
  const status = stringValue(formData.get('status'));

  if (!userId || !isUserStatus(status)) return;
  if (userId === actor.id && status !== UserStatus.ACTIVE) return;

  await prisma.$transaction(async (tx) => {
    const previous = await tx.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });

    if (!previous) return;

    await tx.user.update({
      where: { id: userId },
      data: { status },
    });

    await tx.userAuditLog.create({
      data: {
        actorUserId: actor.id,
        targetUserId: userId,
        action: 'ADMIN_UPDATED_USER_STATUS',
        metadata: {
          previousStatus: previous.status,
          nextStatus: status,
        } satisfies Prisma.InputJsonObject,
      },
    });
  });

  revalidatePath('/admin/users');
}

export async function updateUserTagsAction(formData: FormData) {
  const actor = await requireAdmin();
  const userId = stringValue(formData.get('userId'));
  const tags = uniqueTags(stringValue(formData.get('tags')));

  if (!userId) return;

  await prisma.$transaction(async (tx) => {
    const previous = await tx.user.findUnique({
      where: { id: userId },
      select: { tags: true },
    });

    if (!previous) return;

    await tx.user.update({
      where: { id: userId },
      data: { tags },
    });

    await tx.userAuditLog.create({
      data: {
        actorUserId: actor.id,
        targetUserId: userId,
        action: 'ADMIN_UPDATED_USER_TAGS',
        metadata: {
          previousTags: previous.tags,
          nextTags: tags,
        } satisfies Prisma.InputJsonObject,
      },
    });
  });

  revalidatePath('/admin/users');
}

export async function resendUserVerificationAction(formData: FormData) {
  const actor = await requireAdmin();
  const userId = stringValue(formData.get('userId'));
  if (!userId) return;

  await resendVerificationForUser(userId, actor.id);
  revalidatePath('/admin/users');
}

export async function sendUserPasswordResetAction(formData: FormData) {
  const actor = await requireAdmin();
  const userId = stringValue(formData.get('userId'));
  if (!userId) return;

  await createPasswordResetForUser(userId, actor.id);
  revalidatePath('/admin/users');
}

function stringValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueTags(value: string): string[] {
  return [...new Set(value
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12))];
}

function isUserRole(value: string): value is UserRole {
  return value === UserRole.USER || value === UserRole.ADMIN;
}

function isUserStatus(value: string): value is UserStatus {
  return value === UserStatus.PENDING_EMAIL
    || value === UserStatus.ACTIVE
    || value === UserStatus.SUSPENDED
    || value === UserStatus.DELETED;
}

