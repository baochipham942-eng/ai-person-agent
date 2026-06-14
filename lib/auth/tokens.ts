import crypto from 'crypto';

export function createPlainToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL
    || process.env.SITE_URL
    || process.env.NEXTAUTH_URL
    || 'http://localhost:4001'
  ).replace(/\/+$/, '');
}

