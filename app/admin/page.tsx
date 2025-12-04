import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AdminDashboardClient from '@/components/AdminDashboardClient';

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-center border-b pb-4">
        پنل مدیریت
      </h1>
      <AdminDashboardClient />
    </div>
  );
}

