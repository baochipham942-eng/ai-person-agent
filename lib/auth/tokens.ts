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
  const candidates = [
    process.env.PRODUCTION_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.NEXTAUTH_URL,
    withHttps(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    withHttps(process.env.VERCEL_URL),
  ]
    .map(normalizeSiteUrl)
    .filter((value): value is string => Boolean(value));

  if (isProductionRuntime()) {
    const publicUrl = candidates.find(candidate => !isLocalSiteUrl(candidate));
    if (publicUrl) return publicUrl;
  }

  return candidates[0] || 'http://localhost:4001';
}

function normalizeSiteUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    url.pathname = url.pathname.replace(/\/+$/, '');
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function withHttps(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(value) ? value : `https://${value}`;
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production'
    || process.env.VERCEL === '1'
    || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
    || Boolean(process.env.FC_FUNCTION_NAME);
}

function isLocalSiteUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '0.0.0.0'
      || hostname === '::1';
  } catch {
    return false;
  }
}
