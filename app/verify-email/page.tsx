import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifyEmailToken } from '@/lib/auth/account';

interface VerifyEmailPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const resolvedSearchParams = await searchParams;
  const token = firstParam(resolvedSearchParams?.token);

  if (!token) {
    return <ResultCard title="验证链接无效" detail="链接里缺少验证 token。" success={false} />;
  }

  const result = await verifyEmailToken(token);
  if (result.success) {
    redirect('/login?verified=1');
  }

  return <ResultCard title="邮箱验证失败" detail={result.message} success={false} />;
}

function ResultCard({ title, detail, success }: { title: string; detail: string; success: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-8 text-stone-900">
      <section className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm">
        <div className={`mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
          success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
        }`}>
          {success ? 'OK' : '!'}
        </div>
        <h1 className="text-xl font-semibold text-stone-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">{detail}</p>
        <Link href="/login" className="mt-6 inline-flex rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800">
          返回登录
        </Link>
      </section>
    </main>
  );
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

