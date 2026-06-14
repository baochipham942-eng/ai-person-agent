import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AdminAuditPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  const resolvedSearchParams = await searchParams;
  const action = (firstParam(resolvedSearchParams?.action) || '').trim();
  const search = (firstParam(resolvedSearchParams?.search) || '').trim();

  const logs = await prisma.userAuditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search, mode: 'insensitive' } },
              { actor: { email: { contains: search, mode: 'insensitive' } } },
              { target: { email: { contains: search, mode: 'insensitive' } } },
              { actor: { username: { contains: search, mode: 'insensitive' } } },
              { target: { username: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      actor: {
        select: {
          email: true,
          username: true,
          nickname: true,
        },
      },
      target: {
        select: {
          email: true,
          username: true,
          nickname: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 120,
  });

  const actionBreakdown = await prisma.userAuditLog.groupBy({
    by: ['action'],
    _count: { _all: true },
    orderBy: { _count: { action: 'desc' } },
    take: 20,
  });

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin" className="text-xs font-medium text-orange-600 hover:text-orange-700">
              返回后台
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">审计日志</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
              查看账号、邀请码、邮件、权限变更和数据维护相关操作。当前显示最近 120 条。
            </p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-center">
            <div className="text-lg font-semibold text-stone-950">{logs.length}</div>
            <div className="mt-0.5 text-[11px] text-stone-500">当前结果</div>
          </div>
        </header>

        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/admin/audit">
            <input
              name="search"
              defaultValue={search}
              placeholder="搜索动作、操作者、目标用户"
              className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-300"
            />
            <select name="action" defaultValue={action} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm">
              <option value="">全部动作</option>
              {actionBreakdown.map(item => (
                <option key={item.action} value={item.action}>{item.action} · {item._count._all}</option>
              ))}
            </select>
            <button type="submit" className="h-10 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800">
              筛选
            </button>
          </form>
        </section>

        <section className="grid gap-3">
          {logs.length > 0 ? logs.map(log => (
            <article key={log.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-mono text-sm font-semibold text-stone-950">{log.action}</h2>
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    操作者 {formatUser(log.actor)} · 目标 {formatUser(log.target)}
                  </p>
                  {log.metadata && (
                    <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-stone-50 p-3 text-xs leading-5 text-stone-600">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </article>
          )) : (
            <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
              当前筛选下没有审计日志。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatUser(user: { email: string | null; username: string; nickname: string | null } | null): string {
  if (!user) return '-';
  return user.email || user.nickname || user.username;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

