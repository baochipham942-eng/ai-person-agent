export interface IdentityNavItem {
  href: string;
  label: string;
  detail?: string;
  match?: 'exact' | 'prefix';
}

export const USER_WORKSPACE_NAV_ITEMS: IdentityNavItem[] = [
  { href: '/watchlist', label: '我的关注', detail: '关注动态和对象管理', match: 'exact' },
  { href: '/compare', label: '新建对比', detail: '选择人物生成报告', match: 'exact' },
  { href: '/compare/reports', label: '我的对比报告', detail: '已生成的人物报告', match: 'prefix' },
  { href: '/watchlist#newsletter-settings', label: '邮件订阅设置', detail: '每周提醒设置', match: 'exact' },
];

export const ADMIN_WORKSPACE_NAV_ITEMS: IdentityNavItem[] = [
  { href: '/admin/maintenance', label: '内容维护', detail: '人物构建、刷新和任务日志', match: 'prefix' },
  { href: '/admin/quality', label: '质量复核', detail: '资料质量问题队列', match: 'prefix' },
  { href: '/admin/influence', label: '影响力校准', detail: '评分和审计校准', match: 'prefix' },
  { href: '/admin/newsletter', label: 'Newsletter 投递', detail: '邮件投递监控', match: 'prefix' },
  { href: '/admin/users', label: '用户管理', detail: '账号、角色和状态', match: 'prefix' },
  { href: '/admin/invitations', label: '邀请码管理', detail: '邀请码创建和停用', match: 'prefix' },
  { href: '/admin/audit', label: '审计日志', detail: '账号和维护操作记录', match: 'prefix' },
  { href: '/admin/operations', label: '上线准备度', detail: '生产检查和迁移状态', match: 'prefix' },
];
