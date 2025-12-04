import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import MyBookingsClient from '@/components/MyBookingsClient';

export default async function MyBookingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-center border-b pb-4">
        رزروهای من
      </h1>
      <MyBookingsClient />
    </div>
  );
}

