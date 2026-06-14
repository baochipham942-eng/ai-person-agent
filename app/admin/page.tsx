import Link from 'next/link';

const ADMIN_LINKS = [
  { href: '/admin/users', title: '注册用户管理', detail: '查看用户、角色、状态、标签和验证邮件' },
  { href: '/admin/invitations', title: '邀请码管理', detail: '创建邀请码、查看使用情况、停用过期邀请码' },
  { href: '/admin/audit', title: '审计日志', detail: '查看账号、邀请码、邮件和维护操作记录' },
  { href: '/admin/maintenance', title: '内容维护', detail: '新人物构建、已有资料刷新、媒体渠道更新和任务日志' },
  { href: '/admin/quality', title: '质量复核队列', detail: '查看人物资料质量问题和复核优先级' },
  { href: '/admin/influence', title: '影响力校准', detail: '校准人物影响力评分和审计结果' },
  { href: '/admin/newsletter', title: 'Newsletter 投递', detail: '查看邮件投递状态和失败记录' },
  { href: '/admin/operations', title: '上线准备度', detail: '检查生产迁移、回填、投递和报告状态' },
];

export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="border-b border-stone-200 pb-5">
          <Link href="/" className="text-xs font-medium text-orange-600 hover:text-orange-700">
            返回人物库
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">后台管理</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
            用户、邀请码、质量复核、内容维护和上线运维入口集中在这里。
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ADMIN_LINKS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-stone-200 bg-white p-4 transition hover:border-orange-200 hover:shadow-sm"
            >
              <h2 className="text-sm font-semibold text-stone-950">{item.title}</h2>
              <p className="mt-2 text-xs leading-5 text-stone-500">{item.detail}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
