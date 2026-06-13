import { Prisma } from '@prisma/client';

export type NewsletterEmailProvider = 'dry_run' | 'resend';
export type NewsletterDeliveryStatus = 'dry_run' | 'queued' | 'sent' | 'failed';

export interface NewsletterEmailEvent {
  personName: string;
  title: string;
  url: string;
  sourceLabel?: string | null;
  occurredAt?: string | null;
}

export interface NewsletterEmailDraft {
  email: string;
  subject: string;
  textBody: string;
  unsubscribeUrl: string;
  preview: string[];
  events: NewsletterEmailEvent[];
}

export interface NewsletterSendResult {
  provider: NewsletterEmailProvider;
  status: NewsletterDeliveryStatus;
  providerMessageId: string | null;
  attempts: number;
  errorMessage: string | null;
  sentAt: Date | null;
}

export function resolveNewsletterProvider(sendRequested = false): NewsletterEmailProvider {
  if (!sendRequested) return 'dry_run';
  const provider = (process.env.NEWSLETTER_EMAIL_PROVIDER || '').trim().toLowerCase();
  return provider === 'resend' ? 'resend' : 'dry_run';
}

export function newsletterSendingEnabled(): boolean {
  return process.env.NEWSLETTER_SEND_ENABLED === 'true';
}

export async function sendNewsletterEmail(
  draft: NewsletterEmailDraft,
  options: { sendRequested?: boolean; deliveryKey?: string | null } = {},
): Promise<NewsletterSendResult> {
  const provider = resolveNewsletterProvider(Boolean(options.sendRequested));

  if (provider === 'dry_run') {
    return {
      provider,
      status: 'dry_run',
      providerMessageId: null,
      attempts: 0,
      errorMessage: null,
      sentAt: null,
    };
  }

  if (!newsletterSendingEnabled()) {
    return {
      provider,
      status: 'failed',
      providerMessageId: null,
      attempts: 0,
      errorMessage: 'NEWSLETTER_SEND_ENABLED must be true before sending email',
      sentAt: null,
    };
  }

  return sendWithResendWithRetry(draft, options.deliveryKey);
}

export function buildNewsletterHtml(draft: NewsletterEmailDraft): string {
  const rows = draft.events.slice(0, 8).map(event => `
    <li style="margin:0 0 16px 0;">
      <div style="font-weight:600;color:#1c1917;">${escapeHtml(event.personName)}</div>
      <a href="${escapeAttribute(event.url)}" style="color:#ea580c;text-decoration:none;">${escapeHtml(event.title)}</a>
      ${event.sourceLabel ? `<div style="margin-top:4px;color:#78716c;font-size:12px;">${escapeHtml(event.sourceLabel)}</div>` : ''}
    </li>
  `).join('');

  return `<!doctype html>
<html>
  <body style="margin:0;background:#fafaf9;color:#292524;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:28px 20px;">
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:8px;padding:24px;">
        <p style="margin:0 0 8px 0;color:#ea580c;font-size:12px;font-weight:600;">AI 人物库周报</p>
        <h1 style="margin:0 0 18px 0;font-size:22px;line-height:1.35;color:#0c0a09;">${escapeHtml(draft.subject)}</h1>
        <ol style="margin:0;padding-left:20px;">${rows || '<li style="color:#78716c;">本期没有新的关注动态。</li>'}</ol>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e7e5e4;font-size:12px;line-height:1.6;color:#78716c;">
          这封邮件来自你的 AI 人物库关注列表。<a href="${escapeAttribute(draft.unsubscribeUrl)}" style="color:#78716c;">退订</a>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export function buildDeliveryPayload(draft: NewsletterEmailDraft, result: NewsletterSendResult): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify({
    provider: result.provider,
    providerMessageId: result.providerMessageId,
    preview: draft.preview,
    unsubscribeUrl: draft.unsubscribeUrl,
    events: draft.events.map(event => ({
      personName: event.personName,
      title: event.title,
      url: event.url,
      sourceLabel: event.sourceLabel,
      occurredAt: event.occurredAt,
    })),
  })) as Prisma.InputJsonValue;
}

async function sendWithResend(
  draft: NewsletterEmailDraft,
  deliveryKey: string | null | undefined,
): Promise<NewsletterSendResult & { retryable: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  if (!apiKey || !from) {
    return {
      provider: 'resend',
      status: 'failed',
      providerMessageId: null,
      attempts: 0,
      errorMessage: 'RESEND_API_KEY and NEWSLETTER_FROM_EMAIL are required',
      sentAt: null,
      retryable: false,
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(deliveryKey ? { 'Idempotency-Key': deliveryKey } : {}),
      },
      body: JSON.stringify({
        from,
        to: [draft.email],
        subject: draft.subject,
        html: buildNewsletterHtml(draft),
        text: draft.textBody,
        ...(process.env.NEWSLETTER_REPLY_TO ? { reply_to: process.env.NEWSLETTER_REPLY_TO } : {}),
      }),
    });

    const data = await safeJson(response);
    if (!response.ok) {
      return {
        provider: 'resend',
        status: 'failed',
        providerMessageId: null,
        attempts: 1,
        errorMessage: extractProviderError(data, response.status),
        sentAt: null,
        retryable: response.status === 429 || response.status >= 500,
      };
    }

    return {
      provider: 'resend',
      status: 'sent',
      providerMessageId: typeof data?.id === 'string' ? data.id : null,
      attempts: 1,
      errorMessage: null,
      sentAt: new Date(),
      retryable: false,
    };
  } catch (error) {
    return {
      provider: 'resend',
      status: 'failed',
      providerMessageId: null,
      attempts: 1,
      errorMessage: error instanceof Error ? error.message : String(error),
      sentAt: null,
      retryable: true,
    };
  }
}

async function sendWithResendWithRetry(
  draft: NewsletterEmailDraft,
  deliveryKey: string | null | undefined,
): Promise<NewsletterSendResult> {
  const maxAttempts = clampInteger(process.env.NEWSLETTER_SEND_MAX_ATTEMPTS, 1, 3, 2);
  let lastResult: NewsletterSendResult & { retryable: boolean } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    lastResult = await sendWithResend(draft, deliveryKey);
    if (lastResult.status === 'sent' || !lastResult.retryable) {
      return { ...lastResult, attempts: attempt };
    }
  }

  return {
    provider: 'resend',
    status: 'failed',
    providerMessageId: lastResult?.providerMessageId ?? null,
    attempts: maxAttempts,
    errorMessage: lastResult?.errorMessage ?? 'Email send failed',
    sentAt: null,
  };
}

async function safeJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractProviderError(data: Record<string, unknown> | null, status: number): string {
  if (data && typeof data.message === 'string') return data.message;
  if (data && typeof data.error === 'string') return data.error;
  return `Email provider returned HTTP ${status}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function clampInteger(value: string | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
