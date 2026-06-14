import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthAccessError, requireUser } from '@/lib/auth/permissions';
import SecurityClient from './SecurityClient';

export const dynamic = 'force-dynamic';

export default async function AccountSecurityPage() {
  try {
    await requireUser();
  } catch (error) {
    if (error instanceof AuthAccessError && error.status === 401) redirect('/login');
    redirect('/');
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <header className="border-b border-stone-200 pb-5">
          <Link href="/" className="text-xs font-medium text-orange-600 hover:text-orange-700">
            返回人物库
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">账号安全</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            管理当前账号的一键登录设备。
          </p>
        </header>

        <SecurityClient />
      </div>
    </main>
  );
}

