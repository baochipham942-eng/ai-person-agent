import { NextResponse } from 'next/server';
import {
  NewsletterValidationError,
  unsubscribeNewsletterByToken,
} from '@/lib/newsletter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  const result = await unsubscribe(token);
  const status = result.ok ? 200 : 400;
  const title = result.ok ? '已退订 AI 人物库周报' : '退订失败';

  return new NextResponse(renderHtml(title, result.message), {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await unsubscribe(typeof body?.token === 'string' ? body.token : '');
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { ok: false, message: '退订链接无效' },
      { status: 400 }
    );
  }
}

async function unsubscribe(token: string): Promise<{ ok: boolean; message: string }> {
  try {
    if (!token) {
      throw new NewsletterValidationError('退订链接无效');
    }
    await unsubscribeNewsletterByToken(token);
    return {
      ok: true,
      message: '邮件订阅已关闭。之后你仍然可以在「我的关注」里重新开启周报。',
    };
  } catch (error) {
    if (error instanceof NewsletterValidationError) {
      return {
        ok: false,
        message: error.message,
      };
    }
    console.error('Failed to unsubscribe newsletter:', error);
    return {
      ok: false,
      message: '退订失败，请稍后重试。',
    };
  }
}

function renderHtml(title: string, message: string): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fafaf9; color: #1c1917; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      section { max-width: 420px; border: 1px solid #e7e5e4; border-radius: 8px; background: #fff; padding: 24px; box-shadow: 0 12px 30px rgba(28, 25, 23, 0.08); }
      h1 { margin: 0 0 10px; font-size: 20px; line-height: 1.3; }
      p { margin: 0; color: #57534e; font-size: 14px; line-height: 1.7; }
      a { display: inline-flex; margin-top: 18px; color: #ea580c; font-size: 14px; font-weight: 600; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
        <a href="/watchlist">返回我的关注</a>
      </section>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
