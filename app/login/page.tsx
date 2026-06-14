'use client';

import { useEffect, useState } from 'react';
import { registerUser, requestPasswordReset, resendVerificationByEmail } from '@/lib/actions/register';
import { signIn } from 'next-auth/react';
import { Button, Input, Message, Avatar } from '@arco-design/web-react';
import { IconUser, IconLock, IconSafe } from '@arco-design/web-react/icon';
import { useRouter } from 'next/navigation';

type RegisterResult = Awaited<ReturnType<typeof registerUser>>;
type PasswordResetRequestResult = Awaited<ReturnType<typeof requestPasswordReset>>;

type LoginView = 'LOGIN' | 'REGISTER' | 'QUICK' | 'VERIFY_NOTICE' | 'FORGOT';

interface QuickUser {
  nickname: string | null;
  avatar: string | null;
  email?: string | null;
  phone?: string | null;
  username: string;
  token: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<LoginView>('LOGIN');
  const [pendingEmail, setPendingEmail] = useState('');
  const [quickUser, setQuickUser] = useState<QuickUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get('verified');
    const reset = params.get('reset');
    if (verified === '1') Message.success('邮箱验证完成，请登录');
    if (reset === '1') Message.success('密码已更新，请登录');
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('quick_login_info');
    if (!stored) return;

    try {
      const info = JSON.parse(stored) as QuickUser;
      if (info?.token) {
        setQuickUser(info);
        setView('QUICK');
      }
    } catch {
      localStorage.removeItem('quick_login_info');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const username = (formData.get('username') as string)?.trim();
    const password = formData.get('password') as string;

    if (!username) {
      Message.warning('请输入邮箱或账号');
      return;
    }
    if (!password) {
      Message.warning('请输入密码');
      return;
    }
    if (password.length < 8) {
      Message.warning('密码至少需要8位');
      return;
    }

    setIsLoggingIn(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.ok) {
        await saveQuickLoginProfile();
        Message.success('登录成功');
        router.push('/');
      } else {
        Message.error(result?.error === 'CredentialsSignin' ? '账号或密码错误，或邮箱尚未验证' : '登录失败，请重试');
      }
    } catch (error) {
      console.error('Login error:', error);
      Message.error('登录发生错误，请稍后重试');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = async () => {
    if (!quickUser) return;
    setIsLoggingIn(true);

    try {
      const result = await signIn('credentials', {
        quickLoginToken: quickUser.token,
        redirect: false,
      });

      if (result?.ok) {
        Message.success('登录成功');
        router.push('/');
      } else {
        Message.error('快捷登录已过期，请重新登录');
        setQuickUser(null);
        localStorage.removeItem('quick_login_info');
        setView('LOGIN');
      }
    } catch {
      Message.error('快捷登录已过期，请重新登录');
      setQuickUser(null);
      localStorage.removeItem('quick_login_info');
      setView('LOGIN');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = formData.get('password') as string;
    const inviteCode = (formData.get('inviteCode') as string)?.trim();

    if (!email) {
      Message.warning('请输入邮箱');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Message.warning('请输入有效邮箱');
      return;
    }
    if (!password) {
      Message.warning('请设置密码');
      return;
    }
    if (password.length < 8) {
      Message.warning('密码至少需要8位');
      return;
    }
    if (!inviteCode) {
      Message.warning('请输入邀请码；初始管理员邮箱可留空');
    }

    setIsRegistering(true);

    try {
      const result: RegisterResult = await registerUser(undefined, formData);
      if (result.success) {
        setPendingEmail(result.email);
        Message.success(result.message);
        setView('VERIFY_NOTICE');
      } else {
        Message.error(result.error || '注册失败');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Message.error(error instanceof Error ? error.message : '注册发生错误，请稍后重试');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string)?.trim().toLowerCase();

    if (!email) {
      Message.warning('请输入邮箱');
      return;
    }

    setIsRequestingReset(true);

    try {
      const result: PasswordResetRequestResult = await requestPasswordReset(undefined, formData);
      if (result.success) {
        Message.success(result.message);
        setPendingEmail(email);
      } else {
        Message.error(result.error);
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      Message.error('发送重置邮件失败，请稍后重试');
    } finally {
      setIsRequestingReset(false);
    }
  };

  const handleResendVerification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!formData.get('email') && pendingEmail) formData.set('email', pendingEmail);

    const email = (formData.get('email') as string)?.trim().toLowerCase();
    if (!email) {
      Message.warning('请输入邮箱');
      return;
    }

    setIsResendingVerification(true);
    try {
      const result = await resendVerificationByEmail(undefined, formData);
      if (result.success) {
        Message.success(result.message);
        setPendingEmail(email);
        setView('VERIFY_NOTICE');
      } else {
        Message.error(result.error);
      }
    } catch {
      Message.error('验证邮件发送失败，请稍后重试');
    } finally {
      setIsResendingVerification(false);
    }
  };

  async function saveQuickLoginProfile() {
    try {
      const response = await fetch('/api/user/quick-login', { cache: 'no-store' });
      if (!response.ok) return;
      const info = await response.json() as QuickUser;
      if (info?.token) {
        localStorage.setItem('quick_login_info', JSON.stringify(info));
      }
    } catch {
      // Quick login is a convenience. A failure here should not block login.
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="bg-stone-950 px-8 py-8 text-center">
          <h1 className="text-2xl font-bold tracking-wide text-white">AI 人物库</h1>
          <p className="mt-2 text-sm font-light text-stone-300">探索 · 学习 · 成长</p>
        </div>

        <div className="p-8">
          {view === 'QUICK' && quickUser && (
            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center">
                <Avatar size={80} className="mb-3 border-4 border-stone-50 text-3xl shadow-sm">
                  {quickUser.avatar || (quickUser.nickname || quickUser.username).slice(0, 1)}
                </Avatar>
                <h3 className="text-xl font-bold text-stone-800">{quickUser.nickname || quickUser.username}</h3>
                <p className="mt-1 text-sm text-stone-500">{maskAccount(quickUser.email || quickUser.phone || quickUser.username)}</p>
              </div>

              <Button
                type="primary"
                long
                size="large"
                onClick={handleQuickLogin}
                loading={isLoggingIn}
                className="h-12 rounded-md text-base"
              >
                {isLoggingIn ? '登录中...' : '一键登录'}
              </Button>

              <div className="pt-2">
                <Button type="text" size="small" className="text-stone-400 hover:text-stone-600" onClick={() => setView('LOGIN')}>
                  切换账号
                </Button>
              </div>
            </div>
          )}

          {view === 'LOGIN' && (
            <div>
              <h2 className="mb-6 text-center text-xl font-bold text-stone-900">账号登录</h2>
              <form onSubmit={handleLogin} className="space-y-4" id="loginForm">
                <Input
                  name="username"
                  prefix={<IconUser />}
                  placeholder="邮箱 / 手机号 / 账号"
                  className="h-12 rounded-md border-stone-200 bg-stone-50"
                />
                <Input.Password
                  name="password"
                  prefix={<IconLock />}
                  placeholder="密码"
                  className="h-12 rounded-md border-stone-200 bg-stone-50"
                />

                <Button
                  type="primary"
                  long
                  size="large"
                  htmlType="submit"
                  loading={isLoggingIn}
                  disabled={isLoggingIn}
                  className="mt-2 h-12 rounded-md text-base"
                >
                  {isLoggingIn ? '登录中...' : '登录'}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between text-sm">
                <Button type="text" className="px-0 text-stone-500" onClick={() => setView('FORGOT')}>
                  忘记密码
                </Button>
                <div className="flex items-center gap-3">
                  <Button type="text" className="px-0 text-stone-500" onClick={() => setView('VERIFY_NOTICE')}>
                    重发验证
                  </Button>
                  <Button type="text" className="px-0 font-medium text-orange-600" onClick={() => setView('REGISTER')}>
                    立即注册
                  </Button>
                </div>
              </div>
            </div>
          )}

          {view === 'REGISTER' && (
            <div>
              <h2 className="mb-6 text-center text-xl font-bold text-stone-900">新用户注册</h2>
              <form onSubmit={handleRegister} className="space-y-4" id="registerForm">
                <Input
                  name="email"
                  prefix={<IconUser />}
                  placeholder="邮箱"
                  className="h-12 rounded-md border-stone-200 bg-stone-50"
                />
                <Input
                  name="nickname"
                  prefix={<IconUser />}
                  placeholder="昵称，可选"
                  className="h-12 rounded-md border-stone-200 bg-stone-50"
                  maxLength={24}
                />
                <Input.Password
                  name="password"
                  prefix={<IconLock />}
                  placeholder="设置密码，至少 8 位"
                  className="h-12 rounded-md border-stone-200 bg-stone-50"
                />
                <Input
                  name="inviteCode"
                  prefix={<IconSafe />}
                  placeholder="邀请码"
                  className="h-12 rounded-md border-stone-200 bg-stone-50"
                  maxLength={24}
                  style={{ textTransform: 'uppercase' }}
                />

                <Button
                  type="primary"
                  long
                  size="large"
                  htmlType="submit"
                  loading={isRegistering}
                  className="mt-2 h-12 rounded-md text-base"
                >
                  {isRegistering ? '注册中...' : '注册'}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <Button type="text" className="text-stone-500" onClick={() => setView('LOGIN')}>
                  返回登录
                </Button>
              </div>
            </div>
          )}

          {view === 'VERIFY_NOTICE' && (
            <div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-stone-900">去邮箱完成验证</h2>
                <p className="mt-3 text-sm leading-6 text-stone-500">
                  验证链接已发送到 {pendingEmail || '你的邮箱'}。验证后再回来登录。
                </p>
              </div>
              <form onSubmit={handleResendVerification} className="mt-6 space-y-4">
                <Input
                  name="email"
                  defaultValue={pendingEmail}
                  prefix={<IconUser />}
                  placeholder="注册邮箱"
                  className="h-12 rounded-md border-stone-200 bg-stone-50"
                />
                <Button
                  type="primary"
                  long
                  size="large"
                  htmlType="submit"
                  loading={isResendingVerification}
                  className="h-12 rounded-md text-base"
                >
                  {isResendingVerification ? '发送中...' : '重发验证邮件'}
                </Button>
              </form>
              <Button type="text" long className="mt-4 text-stone-500" onClick={() => setView('LOGIN')}>
                返回登录
              </Button>
            </div>
          )}

          {view === 'FORGOT' && (
            <div>
              <h2 className="mb-6 text-center text-xl font-bold text-stone-900">重置密码</h2>
              <form onSubmit={handleForgotPassword} className="space-y-4" id="forgotPasswordForm">
                <Input
                  name="email"
                  prefix={<IconUser />}
                  placeholder="注册邮箱"
                  className="h-12 rounded-md border-stone-200 bg-stone-50"
                />
                <Button
                  type="primary"
                  long
                  size="large"
                  htmlType="submit"
                  loading={isRequestingReset}
                  className="mt-2 h-12 rounded-md text-base"
                >
                  {isRequestingReset ? '发送中...' : '发送重置链接'}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <Button type="text" className="text-stone-500" onClick={() => setView('LOGIN')}>
                  返回登录
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function maskAccount(account: string | null | undefined) {
  if (!account) return '';
  if (account.includes('@')) {
    const [name, domain] = account.split('@');
    if (!domain) return account;
    return `${name.slice(0, 2)}***@${domain}`;
  }
  if (account.length < 7) return account;
  return account.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}
