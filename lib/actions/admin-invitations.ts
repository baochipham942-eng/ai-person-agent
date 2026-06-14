'use server';

import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';

export async function createInvitationCodeAction(formData: FormData) {
  const actor = await requireAdmin();
  const codeInput = stringValue(formData.get('code')).toUpperCase();
  const code = codeInput || generateInviteCode();
  const channel = stringValue(formData.get('channel')) || null;
  const note = stringValue(formData.get('note')) || null;
  const maxUsages = clampInteger(stringValue(formData.get('maxUsages')), 1, 1000, 1);
  const expiresAt = parseDate(stringValue(formData.get('expiresAt'))) || addDays(new Date(), 30);

  await prisma.$transaction(async (tx) => {
    await tx.invitationCode.create({
      data: {
        code,
        channel,
        note,
        maxUsages,
        expiresAt,
        createdById: actor.id,
      },
    });

    await tx.userAuditLog.create({
      data: {
        actorUserId: actor.id,
        action: 'ADMIN_CREATED_INVITATION_CODE',
        metadata: {
          code,
          channel,
          maxUsages,
          expiresAt: expiresAt.toISOString(),
        } satisfies Prisma.InputJsonObject,
      },
    });
  });

  revalidatePath('/admin/invitations');
}

export async function createInvitationBatchAction(formData: FormData) {
  const actor = await requireAdmin();
  const channel = stringValue(formData.get('channel')) || null;
  const note = stringValue(formData.get('note')) || null;
  const count = clampInteger(stringValue(formData.get('count')), 1, 100, 10);
  const maxUsages = clampInteger(stringValue(formData.get('maxUsages')), 1, 1000, 1);
  const expiresAt = parseDate(stringValue(formData.get('expiresAt'))) || addDays(new Date(), 30);
  const codes = Array.from({ length: count }, () => generateInviteCode());

  await prisma.$transaction(async (tx) => {
    await tx.invitationCode.createMany({
      data: codes.map(code => ({
        code,
        channel,
        note,
        maxUsages,
        expiresAt,
        createdById: actor.id,
      })),
    });

    await tx.userAuditLog.create({
      data: {
        actorUserId: actor.id,
        action: 'ADMIN_CREATED_INVITATION_BATCH',
        metadata: {
          count,
          channel,
          maxUsages,
          expiresAt: expiresAt.toISOString(),
          codes,
        } satisfies Prisma.InputJsonObject,
      },
    });
  });

  revalidatePath('/admin/invitations');
}

export async function updateInvitationExpiryAction(formData: FormData) {
  const actor = await requireAdmin();
  const id = stringValue(formData.get('id'));
  const expiresAt = parseDate(stringValue(formData.get('expiresAt')));
  if (!id || !expiresAt) return;

  await prisma.$transaction(async (tx) => {
    const previous = await tx.invitationCode.findUnique({
      where: { id },
      select: {
        code: true,
        expiresAt: true,
      },
    });

    if (!previous) return;

    await tx.invitationCode.update({
      where: { id },
      data: { expiresAt },
    });

    await tx.userAuditLog.create({
      data: {
        actorUserId: actor.id,
        action: 'ADMIN_UPDATED_INVITATION_EXPIRY',
        metadata: {
          code: previous.code,
          previousExpiresAt: previous.expiresAt.toISOString(),
          nextExpiresAt: expiresAt.toISOString(),
        } satisfies Prisma.InputJsonObject,
      },
    });
  });

  revalidatePath('/admin/invitations');
}

export async function expireInvitationCodeAction(formData: FormData) {
  const actor = await requireAdmin();
  const id = stringValue(formData.get('id'));
  if (!id) return;

  await prisma.$transaction(async (tx) => {
    const invite = await tx.invitationCode.update({
      where: { id },
      data: { expiresAt: new Date() },
      select: {
        code: true,
      },
    });

    await tx.userAuditLog.create({
      data: {
        actorUserId: actor.id,
        action: 'ADMIN_EXPIRED_INVITATION_CODE',
        metadata: {
          code: invite.code,
        } satisfies Prisma.InputJsonObject,
      },
    });
  });

  revalidatePath('/admin/invitations');
}

function generateInviteCode(): string {
  return `AI${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function stringValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function clampInteger(value: string, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
