'use client';

import { useState } from 'react';
import { Button, Message } from '@arco-design/web-react';
import { useRouter } from 'next/navigation';

export default function ScheduleToggleButton({ scheduleId, enabled }: { scheduleId: string; enabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleSchedule() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/maintenance/schedules/${scheduleId}/toggle`, { method: 'POST' });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || '更新定时任务失败');
      Message.success(enabled ? '定时任务已暂停' : '定时任务已启用');
      router.refresh();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '更新定时任务失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="small" loading={loading} onClick={toggleSchedule}>
      {enabled ? '暂停' : '启用'}
    </Button>
  );
}
