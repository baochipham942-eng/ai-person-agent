'use client';

import { useEffect, useState } from 'react';
import { registerUser, requestPasswordReset, resendVerificationByEmail } from '@/lib/actions/register';
import { signIn } from 'next-auth/react';
import { Button, Input, Message, Avatar } from '@arco-design/web-react';
import { IconUser, IconLock, IconSafe } from '@arco-design/web-react/icon';
import { useRouter } from 'next/navigation';
import { clearUserSessionCache, ensureUserSession } from '@/components/common/userSessionClient';

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
  const [registerError, setRegisterError] = useState<string | null>(null);
  const mailInboxUrl = getMailInboxUrl(pendingEmail);

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

      if (result?.error) {
        Message.error(formatLoginError(result.error));
      } else if (result?.ok) {
        await saveQuickLoginProfile();
        await refreshUserSessionAfterAuth();
        Message.success('登录成功');
        router.push('/');
      } else {
        Message.error('登录失败，请重试');
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

      if (result?.error) {
        Message.error('快捷登录已过期，请重新登录');
        setQuickUser(null);
        localStorage.removeItem('quick_login_info');
        clearUserSessionCache();
        setView('LOGIN');
      } else if (result?.ok) {
        await refreshUserSessionAfterAuth();
        Message.success('登录成功');
        router.push('/');
      } else {
        Message.error('快捷登录已过期，请重新登录');
        setQuickUser(null);
        localStorage.removeItem('quick_login_info');
        clearUserSessionCache();
        setView('LOGIN');
      }
    } catch {
      Message.error('快捷登录已过期，请重新登录');
      setQuickUser(null);
      localStorage.removeItem('quick_login_info');
      clearUserSessionCache();
      setView('LOGIN');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRegisterError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = formData.get('password') as string;
    const inviteCode = (formData.get('inviteCode') as string)?.trim();

    if (!email) {
      const message = '请输入邮箱';
      setRegisterError(message);
      Message.warning(message);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const message = '请输入有效邮箱';
      setRegisterError(message);
      Message.warning(message);
      return;
    }
    if (!password) {
      const message = '请设置密码';
      setRegisterError(message);
      Message.warning(message);
      return;
    }
    if (password.length < 8) {
      const message = '密码至少需要8位';
      setRegisterError(message);
      Message.warning(message);
      return;
    }
    if (!inviteCode) {
      const message = '请输入邀请码，没有邀请码无法完成注册';
      setRegisterError(message);
      Message.warning(message);
      return;
    }

    setIsRegistering(true);

    try {
      const result: RegisterResult = await registerUser(undefined, formData);
      if (result.success) {
        setRegisterError(null);
        setPendingEmail(result.email);
        Message.success(result.message);
        if (!result.emailVerificationRequired) {
          let loginResult: Awaited<ReturnType<typeof signIn>> | undefined;
          try {
            loginResult = await signIn('credentials', {
              username: result.email,
              password,
              redirect: false,
            });
          } catch (error) {
            console.error('Auto sign-in after registration failed:', error);
            Message.success('注册成功，请登录');
            setView('LOGIN');
            return;
          }

          if (loginResult?.error) {
            Message.success('注册成功，请登录');
            setView('LOGIN');
            return;
          }

          if (loginResult?.ok) {
            await saveQuickLoginProfile();
            await refreshUserSessionAfterAuth();
            router.push('/');
            return;
          }

          Message.success('注册成功，请登录');
          setView('LOGIN');
          return;
        }

        setView('VERIFY_NOTICE');
      } else {
        const message = result.error || '注册失败';
        setRegisterError(message);
        Message.error(message);
      }
    } catch (error) {
      console.error('Registration error:', error);
      const message = error instanceof Error ? error.message : '注册发生错误，请稍后重试';
      setRegisterError(message);
      Message.error(message);
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

  async function refreshUserSessionAfterAuth() {
    try {
      await ensureUserSession({ force: true });
    } catch {
      clearUserSessionCache();
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
                className="auth-primary-button h-12 rounded-md text-base"
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
                  className="auth-primary-button mt-2 h-12 rounded-md text-base"
                >
                  {isLoggingIn ? '登录中...' : '登录'}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between text-sm">
                <Button type="text" className="px-0 text-stone-500" onClick={() => setView('FORGOT')}>
                  忘记密码
                </Button>
                <Button
                  type="text"
                  className="px-0 font-medium text-orange-600"
                  onClick={() => {
                    setRegisterError(null);
                    setView('REGISTER');
                  }}
                >
                  立即注册
                </Button>
              </div>
            </div>
          )}

          {view === 'REGISTER' && (
            <div>
              <h2 className="mb-6 text-center text-xl font-bold text-stone-900">新用户注册</h2>
              <form
                onSubmit={handleRegister}
                onChange={() => {
                  if (registerError) setRegisterError(null);
                }}
                className="space-y-4"
                id="registerForm"
              >
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
                  status={registerError?.includes('邀请码') ? 'error' : undefined}
                  style={{ textTransform: 'uppercase' }}
                />
                {registerError && (
                  <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                    {registerError}
                  </div>
                )}

                <Button
                  type="primary"
                  long
                  size="large"
                  htmlType="submit"
                  loading={isRegistering}
                  className="auth-primary-button mt-2 h-12 rounded-md text-base"
                >
                  {isRegistering ? '注册中...' : '注册'}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <Button
                  type="text"
                  className="text-stone-500"
                  onClick={() => {
                    setRegisterError(null);
                    setView('LOGIN');
                  }}
                >
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
                  验证链接已发送到 {pendingEmail || '你的邮箱'}。通常几分钟内到达，收件箱没有就看一下垃圾箱。
                </p>
              </div>
              <div className="mt-6 space-y-4">
                {mailInboxUrl ? (
                  <a
                    href={mailInboxUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="auth-primary-link flex h-12 w-full items-center justify-center rounded-md text-base font-medium"
                  >
                    去邮箱查看
                  </a>
                ) : (
                  <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-center text-sm text-stone-600">
                    请打开你的邮箱，查看来自 AI 人物库的验证邮件。
                  </div>
                )}
                <form onSubmit={handleResendVerification} className="space-y-3">
                  {pendingEmail ? (
                    <input type="hidden" name="email" value={pendingEmail} />
                  ) : (
                    <Input
                      name="email"
                      prefix={<IconUser />}
                      placeholder="注册邮箱"
                      className="h-12 rounded-md border-stone-200 bg-stone-50"
                    />
                  )}
                  <div className="text-center">
                    <p className="text-xs leading-5 text-stone-400">几分钟后还没收到，再重新发送。</p>
                    <Button
                      type="text"
                      htmlType="submit"
                      loading={isResendingVerification}
                      className="mt-1 px-0 text-stone-600 hover:text-stone-950"
                    >
                      {isResendingVerification ? '发送中...' : '重新发送验证邮件'}
                    </Button>
                  </div>
                </form>
              </div>
              <Button
                type="text"
                long
                className="mt-4 text-stone-500"
                onClick={() => setView('LOGIN')}
              >
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
                  className="auth-primary-button mt-2 h-12 rounded-md text-base"
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

function getMailInboxUrl(email: string): string | null {
  const domain = email.split('@')[1]?.trim().toLowerCase();
  if (!domain) return null;

  const providers: Record<string, string> = {
    'qq.com': 'https://mail.qq.com/',
    'foxmail.com': 'https://mail.qq.com/',
    'gmail.com': 'https://mail.google.com/',
    'googlemail.com': 'https://mail.google.com/',
    'outlook.com': 'https://outlook.live.com/mail/',
    'hotmail.com': 'https://outlook.live.com/mail/',
    'live.com': 'https://outlook.live.com/mail/',
    'icloud.com': 'https://www.icloud.com/mail/',
    'me.com': 'https://www.icloud.com/mail/',
    '163.com': 'https://mail.163.com/',
    '126.com': 'https://mail.126.com/',
    'yeah.net': 'https://www.yeah.net/',
    'sina.com': 'https://mail.sina.com.cn/',
    'aliyun.com': 'https://mail.aliyun.com/',
  };

  return providers[domain] || `https://mail.${domain}/`;
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

function formatLoginError(error: string) {
  return error === 'CredentialsSignin' || error === 'CallbackRouteError'
    ? '账号或密码错误，或邮箱尚未验证'
    : '登录失败，请重试';
}
