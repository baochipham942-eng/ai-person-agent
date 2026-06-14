'use client';

import { useState } from 'react';
import { Button, Input, Message } from '@arco-design/web-react';
import { IconLock } from '@arco-design/web-react/icon';
import { useRouter } from 'next/navigation';
import { resetPassword } from '@/lib/actions/register';

interface ResetPasswordFormProps {
  token: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('token', token);

    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!password || password.length < 8) {
      Message.warning('密码至少需要8位');
      return;
    }

    if (password !== confirmPassword) {
      Message.warning('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(undefined, formData);
      if (result.success) {
        Message.success(result.message);
        router.push('/login?reset=1');
      } else {
        Message.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <Input.Password
        name="password"
        prefix={<IconLock />}
        placeholder="新密码，至少 8 位"
        className="h-12 rounded-md border-stone-200 bg-stone-50"
      />
      <Input.Password
        name="confirmPassword"
        prefix={<IconLock />}
        placeholder="再次输入新密码"
        className="h-12 rounded-md border-stone-200 bg-stone-50"
      />
      <Button type="primary" long size="large" htmlType="submit" loading={loading} className="h-12 rounded-md text-base">
        {loading ? '更新中...' : '更新密码'}
      </Button>
    </form>
  );
}

