import { getSiteUrl } from '@/lib/auth/tokens';

interface TransactionalEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}

export interface TransactionalEmailResult {
  sent: boolean;
  providerMessageId: string | null;
  error: string | null;
}

export async function sendVerificationEmail(email: string, token: string): Promise<TransactionalEmailResult> {
  const verifyUrl = `${getSiteUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  return sendTransactionalEmail({
    to: email,
    subject: '验证你的 AI 人物库邮箱',
    text: `请打开下面的链接完成邮箱验证：\n\n${verifyUrl}\n\n如果不是你本人操作，可以忽略这封邮件。`,
    html: buildAuthEmailHtml({
      eyebrow: 'AI 人物库',
      title: '验证你的邮箱',
      body: '点下面的按钮完成邮箱验证。验证后，你就可以登录并使用账号功能。',
      ctaLabel: '验证邮箱',
      ctaUrl: verifyUrl,
    }),
    idempotencyKey: `verify-email:${email}:${token.slice(0, 12)}`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<TransactionalEmailResult> {
  const resetUrl = `${getSiteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return sendTransactionalEmail({
    to: email,
    subject: '重置你的 AI 人物库密码',
    text: `请打开下面的链接重置密码：\n\n${resetUrl}\n\n如果不是你本人操作，可以忽略这封邮件。`,
    html: buildAuthEmailHtml({
      eyebrow: 'AI 人物库',
      title: '重置密码',
      body: '点下面的按钮设置新密码。这个链接会在 1 小时后过期。',
      ctaLabel: '重置密码',
      ctaUrl: resetUrl,
    }),
    idempotencyKey: `reset-password:${email}:${token.slice(0, 12)}`,
  });
}

async function sendTransactionalEmail(input: TransactionalEmailInput): Promise<TransactionalEmailResult> {
  const provider = (process.env.AUTH_EMAIL_PROVIDER || process.env.NEWSLETTER_EMAIL_PROVIDER || '').trim().toLowerCase();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM || process.env.NEWSLETTER_FROM_EMAIL;

  if (provider !== 'resend') {
    return { sent: false, providerMessageId: null, error: 'AUTH_EMAIL_PROVIDER or NEWSLETTER_EMAIL_PROVIDER must be resend' };
  }

  if (!apiKey || !from) {
    return { sent: false, providerMessageId: null, error: 'RESEND_API_KEY and email sender are required' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(process.env.NEWSLETTER_REPLY_TO ? { reply_to: process.env.NEWSLETTER_REPLY_TO } : {}),
      }),
    });

    const data = await safeJson(response);
    if (!response.ok) {
      return {
        sent: false,
        providerMessageId: null,
        error: extractProviderError(data, response.status),
      };
    }

    return {
      sent: true,
      providerMessageId: typeof data?.id === 'string' ? data.id : null,
      error: null,
    };
  } catch (error) {
    return {
      sent: false,
      providerMessageId: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildAuthEmailHtml(input: { eyebrow: string; title: string; body: string; ctaLabel: string; ctaUrl: string }): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#fafaf9;color:#292524;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:28px 20px;">
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:8px;padding:24px;">
        <p style="margin:0 0 8px 0;color:#ea580c;font-size:12px;font-weight:600;">${escapeHtml(input.eyebrow)}</p>
        <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.35;color:#0c0a09;">${escapeHtml(input.title)}</h1>
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.8;color:#57534e;">${escapeHtml(input.body)}</p>
        <a href="${escapeAttribute(input.ctaUrl)}" style="display:inline-block;border-radius:6px;background:#ea580c;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 16px;">${escapeHtml(input.ctaLabel)}</a>
        <p style="margin:20px 0 0 0;font-size:12px;line-height:1.6;color:#78716c;">如果按钮打不开，把这个链接复制到浏览器：<br><span style="word-break:break-all;">${escapeHtml(input.ctaUrl)}</span></p>
      </div>
    </div>
  </body>
</html>`;
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

