'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type NewsletterFrequency = 'none' | 'weekly';

interface NewsletterSettingsResponse {
  authenticated: boolean;
  settings: {
    frequency: NewsletterFrequency;
    email: string | null;
    updatedAt: string | null;
  };
  error?: string;
}

interface NewsletterSettingsProps {
  authenticated: boolean | null;
}

export function NewsletterSettings({ authenticated }: NewsletterSettingsProps) {
  const [frequency, setFrequency] = useState<NewsletterFrequency>('none');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      if (authenticated === false) {
        setLoading(false);
        return;
      }
      if (authenticated === null) return;

      setLoading(true);
      try {
        const response = await fetch('/api/user/newsletter', { cache: 'no-store' });
        const result = await response.json() as NewsletterSettingsResponse;
        if (!active) return;
        setFrequency(result.settings?.frequency || 'none');
        setEmail(result.settings?.email || '');
      } catch {
        if (active) setError('订阅设置暂时不可用');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, [authenticated]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/user/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency, email }),
      });
      const result = await response.json() as NewsletterSettingsResponse;

      if (!response.ok) {
        setError(result.error || '保存失败');
        return;
      }

      setFrequency(result.settings.frequency);
      setEmail(result.settings.email || email);
      setMessage(result.settings.frequency === 'weekly' ? '周报已开启' : '邮件订阅已关闭');
    } catch {
      setError('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  if (authenticated === false) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-medium text-stone-900">邮件订阅</div>
        <p className="text-xs leading-5 text-stone-500">登录后可以把关注内容整理成每周邮件。</p>
        <Link href="/login" className="mt-3 inline-flex h-8 items-center rounded-lg bg-stone-900 px-3 text-xs font-medium text-white hover:bg-orange-600">
          登录开启
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-stone-900">邮件订阅</div>
          <div className="mt-0.5 text-xs text-stone-500">关注人物、话题和机构的每周变化</div>
        </div>
        {loading && <span className="text-[11px] text-stone-400">读取中</span>}
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="邮件订阅频率">
        <button
          type="button"
          onClick={() => setFrequency('weekly')}
          className={`h-9 rounded-lg border px-3 text-xs font-medium transition-colors ${
            frequency === 'weekly'
              ? 'border-orange-200 bg-orange-50 text-orange-700'
              : 'border-stone-200 bg-white text-stone-600 hover:border-orange-200 hover:bg-orange-50'
          }`}
        >
          每周
        </button>
        <button
          type="button"
          onClick={() => setFrequency('none')}
          className={`h-9 rounded-lg border px-3 text-xs font-medium transition-colors ${
            frequency === 'none'
              ? 'border-stone-300 bg-stone-100 text-stone-800'
              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
          }`}
        >
          关闭
        </button>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-[11px] font-medium text-stone-500">接收邮箱</span>
        <input
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="name@example.com"
          className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
        />
      </label>

      <button
        type="button"
        onClick={save}
        disabled={loading || saving}
        className="mt-3 h-9 w-full rounded-lg bg-stone-900 px-3 text-xs font-medium text-white transition hover:bg-orange-600 disabled:cursor-wait disabled:bg-stone-300"
      >
        {saving ? '保存中' : '保存订阅'}
      </button>

      {message && <div className="mt-2 text-xs text-green-700">{message}</div>}
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </section>
  );
}
