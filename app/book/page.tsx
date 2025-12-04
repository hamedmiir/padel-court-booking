import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import BookingPageClient from '@/components/BookingPageClient';

export default async function BookPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-center border-b pb-4">
        رزرو زمین
      </h1>
      <BookingPageClient />
    </div>
  );
}

