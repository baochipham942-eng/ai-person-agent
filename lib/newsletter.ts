import crypto from 'crypto';
import { Prisma, type UserProfile } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export type NewsletterFrequency = 'none' | 'weekly';

export interface NewsletterSettings {
  frequency: NewsletterFrequency;
  email: string | null;
  unsubscribeToken: string | null;
  updatedAt: string;
}

interface UpdateNewsletterSettingsInput {
  frequency: NewsletterFrequency;
  email?: string | null;
}

interface UnsubscribePayload {
  v: 1;
  profileId: string;
  userId: string;
  email: string;
  exp: number;
}

const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const VALID_FREQUENCIES = new Set<NewsletterFrequency>(['none', 'weekly']);

export async function getNewsletterSettings(userId: string): Promise<NewsletterSettings> {
  const profile = await getOrCreateUserProfile(userId);
  return profileToSettings(profile);
}

export async function updateNewsletterSettings(
  userId: string,
  input: UpdateNewsletterSettingsInput
): Promise<NewsletterSettings> {
  const frequency = normalizeFrequency(input.frequency);
  const email = normalizeEmail(input.email);

  if (frequency !== 'none' && !email) {
    throw new NewsletterValidationError('开启邮件订阅需要填写邮箱');
  }

  const profile = await getOrCreateUserProfile(userId);
  const updated = await prisma.userProfile.update({
    where: { id: profile.id },
    data: {
      newsletterFrequency: frequency,
      newsletterEmail: frequency === 'none' ? email : email,
    },
  });

  return profileToSettings(updated);
}

export async function unsubscribeNewsletterByToken(token: string): Promise<NewsletterSettings> {
  const payload = verifyUnsubscribeToken(token);
  const profile = await prisma.userProfile.findUnique({
    where: { id: payload.profileId },
  });

  if (!profile || profile.userId !== payload.userId || profile.newsletterEmail !== payload.email) {
    throw new NewsletterValidationError('退订链接已失效');
  }

  const updated = await prisma.userProfile.update({
    where: { id: profile.id },
    data: {
      newsletterFrequency: 'none',
    },
  });

  return profileToSettings(updated);
}

export function normalizeFrequency(value: unknown): NewsletterFrequency {
  return VALID_FREQUENCIES.has(value as NewsletterFrequency) ? value as NewsletterFrequency : 'none';
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new NewsletterValidationError('邮箱格式不正确');
  }
  return email;
}

export function buildUnsubscribeToken(profile: Pick<UserProfile, 'id' | 'userId' | 'newsletterEmail'>): string | null {
  if (!profile.newsletterEmail) return null;

  const payload: UnsubscribePayload = {
    v: 1,
    profileId: profile.id,
    userId: profile.userId,
    email: profile.newsletterEmail,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${signTokenPayload(encoded)}`;
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload {
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) {
    throw new NewsletterValidationError('退订链接无效');
  }

  const expected = signTokenPayload(encoded);
  if (!safeEqual(signature, expected)) {
    throw new NewsletterValidationError('退订链接无效');
  }

  const payload = parsePayload(encoded);
  if (payload.exp < Date.now()) {
    throw new NewsletterValidationError('退订链接已过期');
  }

  return payload;
}

export async function recordNewsletterDelivery(input: {
  userId: string | null;
  email: string;
  frequency: NewsletterFrequency;
  subject: string;
  status: 'dry_run' | 'queued' | 'sent' | 'failed';
  provider?: string | null;
  providerMessageId?: string | null;
  attempts?: number;
  payload?: Prisma.InputJsonValue;
  errorMessage?: string | null;
  lastAttemptAt?: Date | null;
  sentAt?: Date | null;
}) {
  return prisma.newsletterDeliveryLog.create({
    data: {
      userId: input.userId,
      email: input.email,
      frequency: input.frequency,
      subject: input.subject,
      status: input.status,
      provider: input.provider ?? null,
      providerMessageId: input.providerMessageId ?? null,
      attempts: input.attempts ?? 0,
      payload: input.payload ?? Prisma.JsonNull,
      errorMessage: input.errorMessage ?? null,
      lastAttemptAt: input.lastAttemptAt ?? null,
      sentAt: input.sentAt ?? null,
    },
  });
}

export class NewsletterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NewsletterValidationError';
  }
}

async function getOrCreateUserProfile(userId: string): Promise<UserProfile> {
  const existing = await prisma.userProfile.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.userProfile.create({
    data: {
      userId,
    },
  });
}

function profileToSettings(profile: UserProfile): NewsletterSettings {
  const frequency = normalizeFrequency(profile.newsletterFrequency);
  return {
    frequency,
    email: profile.newsletterEmail,
    unsubscribeToken: frequency === 'none' ? null : buildUnsubscribeToken(profile),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function signTokenPayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', newsletterSecret())
    .update(encodedPayload)
    .digest('base64url');
}

function newsletterSecret(): string {
  return process.env.NEWSLETTER_TOKEN_SECRET
    || process.env.AUTH_SECRET
    || process.env.NEXTAUTH_SECRET
    || 'local-newsletter-token-secret';
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parsePayload(encoded: string): UnsubscribePayload {
  try {
    const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<UnsubscribePayload>;
    if (
      value.v !== 1
      || typeof value.profileId !== 'string'
      || typeof value.userId !== 'string'
      || typeof value.email !== 'string'
      || typeof value.exp !== 'number'
    ) {
      throw new Error('Invalid payload');
    }
    return value as UnsubscribePayload;
  } catch {
    throw new NewsletterValidationError('退订链接无效');
  }
}
