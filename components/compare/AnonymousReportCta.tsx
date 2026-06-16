'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function AnonymousReportCta() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    let active = true;

    void fetch('/api/user/me', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!active) return;
        setShouldShow(!data?.authenticated);
      })
      .catch(() => {
        if (active) setShouldShow(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!shouldShow) return null;

  return (
    <section className="mt-5 rounded-lg border border-orange-100 bg-orange-50 px-5 py-5">
      <h2 className="text-base font-semibold text-orange-950">登录后可以生成自己的对比报告</h2>
      <p className="mt-2 text-sm leading-6 text-orange-800">
        选择 2 到 3 位人物，系统会整理公开资料、补充近期信息，并保存成可分享的报告。
      </p>
      <Link href="/login" className="mt-4 inline-flex rounded-lg bg-[#201c17] px-4 py-2 text-sm font-medium text-[#fff8ea] hover:bg-orange-700">
        登录或注册
      </Link>
    </section>
  );
}
