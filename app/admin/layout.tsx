import { redirect } from 'next/navigation';
import { AuthAccessError, requireAdmin } from '@/lib/auth/permissions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthAccessError && error.status === 401) redirect('/login');
    redirect('/');
  }

  return children;
}
