'use client';

import { useEffect, useState } from 'react';
import { Button, Message } from '@arco-design/web-react';

interface QuickLoginDevice {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export default function SecurityClient() {
  const [devices, setDevices] = useState<QuickLoginDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    void loadDevices();
  }, []);

  async function loadDevices() {
    setLoading(true);
    try {
      const response = await fetch('/api/user/quick-login/devices', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load devices');
      const data = await response.json() as { devices: QuickLoginDevice[] };
      setDevices(data.devices || []);
    } catch {
      Message.error('读取快捷登录设备失败');
    } finally {
      setLoading(false);
    }
  }

  async function revokeDevice(deviceId: string) {
    setRevokingId(deviceId);
    try {
      const response = await fetch('/api/user/quick-login/devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      if (!response.ok) throw new Error('Failed to revoke device');
      Message.success('已撤销该设备的一键登录');
      await loadDevices();
    } catch {
      Message.error('撤销失败，请稍后重试');
    } finally {
      setRevokingId(null);
    }
  }

  async function rotateCurrentToken() {
    setRotating(true);
    try {
      const stored = localStorage.getItem('quick_login_info');
      const current = stored ? JSON.parse(stored) as { token?: string } : {};
      const response = await fetch('/api/user/quick-login/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: current.token || '' }),
      });
      if (!response.ok) throw new Error('Failed to rotate token');
      const next = await response.json();
      localStorage.setItem('quick_login_info', JSON.stringify(next));
      Message.success('当前浏览器的一键登录已轮换');
      await loadDevices();
    } catch {
      Message.error('轮换失败，请稍后重试');
    } finally {
      setRotating(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-950">一键登录设备</h2>
          <p className="mt-1 text-xs leading-5 text-stone-500">密码登录后会为当前浏览器生成一个可撤销的快捷登录 token。</p>
        </div>
        <div className="flex gap-2">
          <Button size="small" onClick={rotateCurrentToken} loading={rotating}>
            轮换当前 token
          </Button>
          <Button size="small" onClick={loadDevices} loading={loading}>
            刷新
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {devices.length > 0 ? devices.map(device => (
          <article key={device.id} className="rounded-md border border-stone-100 bg-stone-50 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium text-stone-950">{device.deviceName || '浏览器设备'}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    device.revokedAt
                      ? 'border-stone-200 bg-white text-stone-400'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}>
                    {device.revokedAt ? '已撤销' : '可用'}
                  </span>
                </div>
                <p className="mt-1 break-all text-xs leading-5 text-stone-500">{device.userAgent || '未记录浏览器信息'}</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  创建 {formatDateTime(device.createdAt)} · 最近使用 {device.lastUsedAt ? formatDateTime(device.lastUsedAt) : '-'}
                </p>
              </div>
              <Button
                size="small"
                disabled={Boolean(device.revokedAt)}
                loading={revokingId === device.id}
                onClick={() => revokeDevice(device.id)}
              >
                撤销
              </Button>
            </div>
          </article>
        )) : (
          <div className="rounded-md border border-stone-100 bg-stone-50 p-4 text-sm text-stone-500">
            {loading ? '正在读取设备。' : '还没有一键登录设备。'}
          </div>
        )}
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
