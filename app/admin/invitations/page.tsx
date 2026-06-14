import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import {
  createInvitationBatchAction,
  createInvitationCodeAction,
  expireInvitationCodeAction,
  updateInvitationExpiryAction,
} from '@/lib/actions/admin-invitations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AdminInvitationsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminInvitationsPage({ searchParams }: AdminInvitationsPageProps) {
  const resolvedSearchParams = await searchParams;
  const channel = (firstParam(resolvedSearchParams?.channel) || '').trim();
  const state = normalizeState(firstParam(resolvedSearchParams?.state));
  const now = new Date();

  const invitationRows = await prisma.invitationCode.findMany({
    where: {
      ...(channel ? { channel } : {}),
      ...(state === 'expired' ? { expiresAt: { lte: now } } : {}),
    },
    select: {
      id: true,
      code: true,
      type: true,
      maxUsages: true,
      usedCount: true,
      expiresAt: true,
      channel: true,
      note: true,
      createdAt: true,
      createdBy: {
        select: {
          email: true,
          username: true,
          nickname: true,
        },
      },
      uses: {
        select: {
          usedAt: true,
          user: {
            select: {
              email: true,
              username: true,
              nickname: true,
            },
          },
        },
        orderBy: { usedAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const invitations = invitationRows.filter(invite => {
    if (state === 'active') return invite.expiresAt > now && invite.usedCount < invite.maxUsages;
    if (state === 'used_up') return invite.usedCount >= invite.maxUsages;
    return true;
  });

  const channelBreakdown = await prisma.invitationCode.groupBy({
    by: ['channel'],
    _count: { _all: true },
    orderBy: { _count: { channel: 'desc' } },
    take: 30,
  });

  const activeCount = invitations.filter(invite => invite.expiresAt > new Date() && invite.usedCount < invite.maxUsages).length;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin" className="text-xs font-medium text-orange-600 hover:text-orange-700">
              返回后台
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">邀请码管理</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
              管理邮箱注册的邀请码。普通用户注册必须提供有效邀请码，初始管理员邮箱走 bootstrap 白名单。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <StatPill label="全部邀请码" value={invitations.length} />
            <StatPill label="可用邀请码" value={activeCount} />
          </div>
        </header>

        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto]" action="/admin/invitations">
            <select name="channel" defaultValue={channel} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm">
              <option value="">全部渠道</option>
              {channelBreakdown.map(item => (
                <option key={item.channel || 'none'} value={item.channel || ''}>{item.channel || '未设置'} · {item._count._all}</option>
              ))}
            </select>
            <select name="state" defaultValue={state} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm">
              <option value="all">全部状态</option>
              <option value="active">可使用</option>
              <option value="expired">已过期</option>
              <option value="used_up">已使用</option>
            </select>
            <button type="submit" className="h-10 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800">
              筛选
            </button>
            <Link
              href={`/api/admin/invitations/export${channel ? `?channel=${encodeURIComponent(channel)}` : ''}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-stone-200 px-4 text-sm font-semibold text-stone-700 hover:border-orange-200 hover:text-orange-700"
            >
              导出 CSV
            </Link>
          </form>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-stone-950">创建邀请码</h2>
            <form action={createInvitationCodeAction} className="mt-4 grid gap-3">
              <input name="code" placeholder="留空随机" className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm uppercase outline-none focus:border-orange-300" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="maxUsages" type="number" min="1" max="1000" defaultValue="1" className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-300" />
                <input name="expiresAt" type="datetime-local" className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-300" />
              </div>
              <input name="channel" placeholder="渠道，可选" className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-300" />
              <input name="note" placeholder="备注，可选" className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-300" />
              <button type="submit" className="h-10 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800">创建</button>
            </form>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-stone-950">批量生成</h2>
            <form action={createInvitationBatchAction} className="mt-4 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <input name="count" type="number" min="1" max="100" defaultValue="10" className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-300" />
                <input name="maxUsages" type="number" min="1" max="1000" defaultValue="1" className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-300" />
                <input name="expiresAt" type="datetime-local" className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-300" />
              </div>
              <input name="channel" placeholder="渠道，可选" className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-300" />
              <input name="note" placeholder="备注，可选" className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-300" />
              <button type="submit" className="h-10 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800">批量生成</button>
            </form>
          </div>
        </section>

        <section className="grid gap-3">
          {invitations.length > 0 ? invitations.map(invite => {
            const state = getInviteState(invite);
            return (
              <article key={invite.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-mono text-base font-semibold text-stone-950">{invite.code}</h2>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${state.className}`}>
                        {state.label}
                      </span>
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                        {invite.usedCount}/{invite.maxUsages}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-stone-500">
                      {invite.channel || '未设置渠道'} · 创建 {formatDateTime(invite.createdAt)} · 过期 {formatDateTime(invite.expiresAt)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-stone-500">
                      创建人 {formatUser(invite.createdBy)} · 类型 {invite.type}
                    </p>
                    {invite.note && <p className="mt-2 text-xs leading-5 text-stone-600">{invite.note}</p>}
                    <div className="mt-3 grid gap-1.5">
                      {invite.uses.length > 0 ? invite.uses.map(use => (
                        <div key={`${invite.id}-${use.user.email || use.user.username}-${use.usedAt.toISOString()}`} className="rounded-md bg-stone-50 px-3 py-2 text-xs text-stone-500">
                          {formatUser(use.user)} · {formatDateTime(use.usedAt)}
                        </div>
                      )) : (
                        <div className="text-xs text-stone-400">还没有注册使用记录。</div>
                      )}
                    </div>
                  </div>

                  <form action={expireInvitationCodeAction}>
                    <input type="hidden" name="id" value={invite.id} />
                    <button
                      type="submit"
                      disabled={invite.expiresAt <= new Date()}
                      className="h-9 rounded-md border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:text-stone-300"
                    >
                      设为过期
                    </button>
                  </form>
                  <form action={updateInvitationExpiryAction} className="mt-2 flex gap-2">
                    <input type="hidden" name="id" value={invite.id} />
                    <input name="expiresAt" type="datetime-local" className="h-9 rounded-md border border-stone-200 bg-white px-2 text-xs" />
                    <button type="submit" className="h-9 rounded-md border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:border-orange-200 hover:text-orange-700">
                      改过期时间
                    </button>
                  </form>
                </div>
              </article>
            );
          }) : (
            <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
              暂无邀请码。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function normalizeState(value: string | null): 'all' | 'active' | 'expired' | 'used_up' {
  if (value === 'active' || value === 'expired' || value === 'used_up') return value;
  return 'all';
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
      <div className="text-lg font-semibold text-stone-950">{value}</div>
      <div className="mt-0.5 text-[11px] text-stone-500">{label}</div>
    </div>
  );
}

function getInviteState(invite: { usedCount: number; maxUsages: number; expiresAt: Date }) {
  if (invite.expiresAt <= new Date()) {
    return { label: '已过期', className: 'border-stone-200 bg-stone-50 text-stone-600' };
  }
  if (invite.usedCount >= invite.maxUsages) {
    return { label: '已用完', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  }
  return { label: '可使用', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
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
