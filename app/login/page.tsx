'use client';

import { useState, useEffect } from 'react';
import { registerUser } from '@/lib/actions/register';
import { signIn } from 'next-auth/react';
import { Button, Input, Message, Avatar } from '@arco-design/web-react';
import { IconUser, IconLock, IconPhone, IconSafe } from '@arco-design/web-react/icon';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'QUICK'>('LOGIN');

    // Quick Login State
    const [quickUser, setQuickUser] = useState<{ nickname: string; avatar: string; phone: string; token: string } | null>(null);

    // Loading States
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    // Load Quick Login Info on Mount
    useEffect(() => {
        const stored = localStorage.getItem('quick_login_info');
        if (stored) {
            try {
                const info = JSON.parse(stored);
                if (info && info.token) {
                    setQuickUser(info);
                    setView('QUICK');
                }
            } catch {
                localStorage.removeItem('quick_login_info');
            }
        }
    }, []);

    // 标准登录处理
    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const username = (formData.get('username') as string)?.trim();
        const password = formData.get('password') as string;

        if (!username) {
            Message.warning('请输入手机号或账号');
            return;
        }
        if (!password) {
            Message.warning('请输入密码');
            return;
        }
        if (password.length < 6) {
            Message.warning('密码至少需要6位');
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
                Message.success('登录成功！');
                router.push('/');
            } else {
                Message.error(result?.error === 'CredentialsSignin' ? '账号或密码错误' : '登录失败，请重试');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            Message.error('登录发生错误，请稍后重试');
        } finally {
            setIsLoggingIn(false);
        }
    };

    // 快捷登录处理
    const handleQuickLogin = async () => {
        if (!quickUser) return;
        setIsLoggingIn(true);

        try {
            const result = await signIn('credentials', {
                quickLoginToken: quickUser.token,
                redirect: false,
            });

            if (result?.ok) {
                Message.success('登录成功！');
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

    // 注册处理
    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const phone = (formData.get('phone') as string)?.trim();
        const password = formData.get('password') as string;
        const inviteCode = (formData.get('inviteCode') as string)?.trim();

        if (!phone) {
            Message.warning('请输入手机号');
            return;
        }
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            Message.warning('请输入有效的11位手机号');
            return;
        }
        if (!password) {
            Message.warning('请设置密码');
            return;
        }
        if (password.length < 6) {
            Message.warning('密码至少需要6位');
            return;
        }
        if (!inviteCode) {
            Message.warning('请输入邀请码');
            return;
        }

        setIsRegistering(true);

        try {
            const result: any = await registerUser(undefined, formData);
            if (result.success && result.user) {
                Message.success('注册成功！');

                // Save to LocalStorage
                const userInfo = {
                    nickname: result.user.nickname,
                    avatar: result.user.avatar,
                    phone: result.user.username,
                    token: result.user.quickLoginToken
                };
                localStorage.setItem('quick_login_info', JSON.stringify(userInfo));

                // Auto Login
                const loginResult = await signIn('credentials', {
                    quickLoginToken: result.user.quickLoginToken,
                    redirect: false,
                });

                if (loginResult?.ok) {
                    Message.success('自动登录成功！');
                    router.push('/');
                } else {
                    Message.warning('注册成功，请手动登录');
                    setView('LOGIN');
                }
            } else {
                Message.error(result.error || '注册失败');
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            Message.error(error?.message || '注册发生错误，请稍后重试');
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 px-8 py-10 text-center">
                    <h1 className="text-2xl font-bold text-white tracking-wider">AI 人物库</h1>
                    <p className="text-blue-100 text-sm mt-2 font-light">探索 · 学习 · 成长</p>
                </div>

                <div className="p-8">
                    {/* QUICK LOGIN VIEW */}
                    {view === 'QUICK' && quickUser && (
                        <div className="space-y-6 text-center">
                            <div className="flex flex-col items-center">
                                <Avatar size={80} className="mb-3 text-3xl shadow-md border-4 border-blue-50">
                                    {quickUser.avatar}
                                </Avatar>
                                <h3 className="text-xl font-bold text-gray-800">{quickUser.nickname}</h3>
                                <p className="text-gray-500 text-sm mt-1">{maskPhone(quickUser.phone)}</p>
                            </div>

                            <Button
                                type="primary"
                                long
                                size="large"
                                onClick={handleQuickLogin}
                                loading={isLoggingIn}
                                className="rounded-xl h-12 text-base"
                            >
                                {isLoggingIn ? '登录中...' : '一键登录'}
                            </Button>

                            <div className="pt-2">
                                <Button type="text" size="small" className="text-gray-400 hover:text-gray-600" onClick={() => setView('LOGIN')}>
                                    切换账号
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* LOGIN VIEW */}
                    {view === 'LOGIN' && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">账号登录</h2>
                            <form onSubmit={handleLogin} className="space-y-4" id="loginForm">
                                <Input
                                    name="username"
                                    prefix={<IconUser />}
                                    placeholder="手机号 / 账号"
                                    className="h-12 rounded-xl bg-gray-50 border-gray-200"
                                />
                                <Input.Password
                                    name="password"
                                    prefix={<IconLock />}
                                    placeholder="密码"
                                    className="h-12 rounded-xl bg-gray-50 border-gray-200"
                                />

                                <Button
                                    type="primary"
                                    long
                                    size="large"
                                    htmlType="submit"
                                    loading={isLoggingIn}
                                    disabled={isLoggingIn}
                                    className="rounded-xl h-12 text-base mt-2"
                                >
                                    {isLoggingIn ? '登录中...' : '登录'}
                                </Button>
                            </form>

                            <div className="mt-6 flex items-center justify-between text-sm">
                                <span className="text-gray-400">还没有账号？</span>
                                <Button type="text" className="px-0 text-blue-600 font-medium" onClick={() => setView('REGISTER')}>
                                    立即注册
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* REGISTER VIEW */}
                    {view === 'REGISTER' && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">新用户注册</h2>
                            <form onSubmit={handleRegister} className="space-y-4" id="registerForm">
                                <Input
                                    name="phone"
                                    prefix={<IconPhone />}
                                    placeholder="手机号"
                                    className="h-12 rounded-xl bg-gray-50 border-gray-200"
                                    maxLength={11}
                                />
                                <Input.Password
                                    name="password"
                                    prefix={<IconLock />}
                                    placeholder="设置密码 (6位以上)"
                                    className="h-12 rounded-xl bg-gray-50 border-gray-200"
                                />
                                <Input
                                    name="inviteCode"
                                    prefix={<IconSafe />}
                                    placeholder="邀请码"
                                    className="h-12 rounded-xl bg-gray-50 border-gray-200"
                                    maxLength={8}
                                    style={{ textTransform: 'uppercase' }}
                                />

                                <Button
                                    type="primary"
                                    long
                                    size="large"
                                    htmlType="submit"
                                    loading={isRegistering}
                                    className="rounded-xl h-12 text-base mt-2"
                                >
                                    {isRegistering ? '注册中...' : '注册并登录'}
                                </Button>
                            </form>
                            <div className="mt-6 text-center">
                                <Button type="text" className="text-gray-500" onClick={() => setView('LOGIN')}>
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

function maskPhone(phone: string) {
    if (!phone || phone.length < 7) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}
