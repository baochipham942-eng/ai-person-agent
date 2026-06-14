'use client';

import { useState } from 'react';
import { Button, Message } from '@arco-design/web-react';
import { useRouter } from 'next/navigation';

export default function CancelJobButton({ jobId, status }: { jobId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const disabled = status === 'cancelling' || status === 'cancelled';

  async function cancelJob() {
    if (disabled) return;
    if (!window.confirm('确认取消这个维护任务？运行中的任务会在当前人物处理后停止。')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/maintenance/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'admin_cancel' }),
      });
      const data = await response.json().catch(() => null) as { error?: string; status?: string } | null;
      if (!response.ok) throw new Error(data?.error || '取消失败');
      Message.success(data?.status === 'cancelled' ? '任务已取消' : '已请求取消');
      router.refresh();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '取消失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="small" status="danger" loading={loading} disabled={disabled} onClick={cancelJob}>
      {status === 'cancelling' ? '取消中' : '取消'}
    </Button>
  );
}
