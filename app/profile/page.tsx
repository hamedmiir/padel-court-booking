import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import ProfileClient from '@/components/ProfileClient';

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-center border-b pb-4">
        پروفایل
      </h1>
      <ProfileClient />
    </div>
  );
}

