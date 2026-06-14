'use client';

import { useState } from 'react';
import { Button, Message } from '@arco-design/web-react';
import { useRouter } from 'next/navigation';

export default function RetryButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function retry() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/maintenance/jobs/${jobId}/retry`, { method: 'POST' });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || '重试失败');
      Message.success('已创建重试任务');
      router.refresh();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '重试失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="small" loading={loading} onClick={retry}>
      重试
    </Button>
  );
}

