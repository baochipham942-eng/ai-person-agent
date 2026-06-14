import Link from 'next/link';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import {
  resendUserVerificationAction,
  sendUserPasswordResetAction,
  updateUserRoleAction,
  updateUserStatusAction,
  updateUserTagsAction,
} from '@/lib/actions/admin-users';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ROLE_LABELS: Record<UserRole | 'all', string> = {
  all: '全部角色',
  USER: '普通用户',
  ADMIN: '管理员',
};

const STATUS_LABELS: Record<UserStatus | 'all', string> = {
  all: '全部状态',
  PENDING_EMAIL: '待验证',
  ACTIVE: '已激活',
  SUSPENDED: '已停用',
  DELETED: '已删除',
};

const STATUS_STYLES: Record<UserStatus, string> = {
  PENDING_EMAIL: 'border-amber-200 bg-amber-50 text-amber-700',
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  SUSPENDED: 'border-stone-200 bg-stone-50 text-stone-600',
  DELETED: 'border-rose-200 bg-rose-50 text-rose-700',
};

interface AdminUsersPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const resolvedSearchParams = await searchParams;
  const role = normalizeRole(firstParam(resolvedSearchParams?.role));
  const status = normalizeStatus(firstParam(resolvedSearchParams?.status));
  const search = (firstParam(resolvedSearchParams?.search) || '').trim();

  const users = await prisma.user.findMany({
    where: {
      ...(role !== 'all' ? { role } : {}),
      ...(status !== 'all' ? { status } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { nickname: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      username: true,
      nickname: true,
      displayName: true,
      role: true,
      status: true,
      tags: true,
      emailVerifiedAt: true,
      createdAt: true,
      lastLoginAt: true,
      invitationCodeUses: {
        select: {
          usedAt: true,
          invitationCode: {
            select: {
              code: true,
              channel: true,
            },
          },
        },
        orderBy: { usedAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          compareReports: true,
          newsletterDeliveries: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const stats = await prisma.user.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const statusCounts = new Map(stats.map(item => [item.status, item._count._all]));

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin" className="text-xs font-medium text-orange-600 hover:text-orange-700">
              返回后台
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">注册用户管理</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
              管理邮箱验证、用户角色、账号状态和运营标签。当前显示最近 100 个用户。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <StatPill label="待验证" value={statusCounts.get(UserStatus.PENDING_EMAIL) || 0} />
            <StatPill label="已激活" value={statusCounts.get(UserStatus.ACTIVE) || 0} />
            <StatPill label="已停用" value={statusCounts.get(UserStatus.SUSPENDED) || 0} />
            <StatPill label="已删除" value={statusCounts.get(UserStatus.DELETED) || 0} />
          </div>
        </header>

        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_160px_160px_auto]" action="/admin/users">
            <input
              name="search"
              defaultValue={search}
              placeholder="搜索邮箱、账号、昵称"
              className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-300"
            />
            <select name="role" defaultValue={role} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm">
              {(['all', UserRole.USER, UserRole.ADMIN] as const).map(item => (
                <option key={item} value={item}>{ROLE_LABELS[item]}</option>
              ))}
            </select>
            <select name="status" defaultValue={status} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm">
              {(['all', UserStatus.PENDING_EMAIL, UserStatus.ACTIVE, UserStatus.SUSPENDED, UserStatus.DELETED] as const).map(item => (
                <option key={item} value={item}>{STATUS_LABELS[item]}</option>
              ))}
            </select>
            <button type="submit" className="h-10 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800">
              筛选
            </button>
          </form>
        </section>

        <section className="grid gap-3">
          {users.length > 0 ? users.map(user => (
            <article key={user.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-all text-base font-semibold text-stone-950">{user.email || user.username}</h2>
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                      {ROLE_LABELS[user.role]}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[user.status]}`}>
                      {STATUS_LABELS[user.status]}
                    </span>
                    {user.emailVerifiedAt && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        邮箱已验证
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    {user.displayName || user.nickname || '未设置昵称'} · 注册 {formatDateTime(user.createdAt)} · 最近登录 {formatMaybeDate(user.lastLoginAt)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    邀请码 {formatInvite(user.invitationCodeUses[0])} · 报告 {user._count.compareReports} · 邮件日志 {user._count.newsletterDeliveries}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {user.tags.length > 0 ? user.tags.map(tag => (
                      <span key={tag} className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">{tag}</span>
                    )) : (
                      <span className="text-xs text-stone-400">暂无标签</span>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 xl:min-w-[520px]">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <form action={updateUserRoleAction} className="flex gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <select name="role" defaultValue={user.role} className="h-9 min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2 text-xs">
                        <option value={UserRole.USER}>普通用户</option>
                        <option value={UserRole.ADMIN}>管理员</option>
                      </select>
                      <button type="submit" className="h-9 rounded-md border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:border-orange-200 hover:text-orange-700">
                        保存
                      </button>
                    </form>

                    <form action={updateUserStatusAction} className="flex gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <select name="status" defaultValue={user.status} className="h-9 min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2 text-xs">
                        <option value={UserStatus.PENDING_EMAIL}>待验证</option>
                        <option value={UserStatus.ACTIVE}>已激活</option>
                        <option value={UserStatus.SUSPENDED}>已停用</option>
                        <option value={UserStatus.DELETED}>已删除</option>
                      </select>
                      <button type="submit" className="h-9 rounded-md border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:border-orange-200 hover:text-orange-700">
                        保存
                      </button>
                    </form>
                  </div>

                  <form action={updateUserTagsAction} className="flex gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <input
                      name="tags"
                      defaultValue={user.tags.join(', ')}
                      placeholder="标签，用逗号分隔"
                      className="h-9 min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2 text-xs outline-none focus:border-orange-300"
                    />
                    <button type="submit" className="h-9 rounded-md border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:border-orange-200 hover:text-orange-700">
                      保存标签
                    </button>
                  </form>

                  <div className="flex flex-wrap gap-2">
                    <form action={resendUserVerificationAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        type="submit"
                        disabled={Boolean(user.emailVerifiedAt)}
                        className="h-9 rounded-md border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:text-stone-300"
                      >
                        重发验证邮件
                      </button>
                    </form>
                    <form action={sendUserPasswordResetAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button type="submit" className="h-9 rounded-md border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:border-orange-200 hover:text-orange-700">
                        发送重置密码邮件
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </article>
          )) : (
            <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
              当前筛选下没有用户。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
      <div className="text-lg font-semibold text-stone-950">{value}</div>
      <div className="mt-0.5 text-[11px] text-stone-500">{label}</div>
    </div>
  );
}

function normalizeRole(value: string | null): UserRole | 'all' {
  if (value === UserRole.USER || value === UserRole.ADMIN) return value;
  return 'all';
}

function normalizeStatus(value: string | null): UserStatus | 'all' {
  if (
    value === UserStatus.PENDING_EMAIL
    || value === UserStatus.ACTIVE
    || value === UserStatus.SUSPENDED
    || value === UserStatus.DELETED
  ) return value;
  return 'all';
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatInvite(value: { usedAt: Date; invitationCode: { code: string; channel: string | null } } | undefined): string {
  if (!value) return '-';
  return `${value.invitationCode.code}${value.invitationCode.channel ? ` · ${value.invitationCode.channel}` : ''}`;
}

function formatMaybeDate(value: Date | null): string {
  return value ? formatDateTime(value) : '-';
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

