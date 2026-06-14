import Link from 'next/link';
import ResetPasswordForm from './ResetPasswordForm';

interface ResetPasswordPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedSearchParams = await searchParams;
  const token = firstParam(resolvedSearchParams?.token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-8 text-stone-900">
      <section className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-stone-950">设置新密码</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            密码更新后，需要重新登录。
          </p>
        </div>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="mt-6 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            重置链接无效。
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm font-medium text-orange-600 hover:text-orange-700">
            返回登录
          </Link>
        </div>
      </section>
    </main>
  );
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

