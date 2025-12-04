'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface NavigationProps {
  userRole?: string;
}

export default function Navigation({ userRole }: NavigationProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="border-b mb-4 bg-white sticky top-0 z-10">
      <div className="p-3 flex justify-between items-center">
        <div className="flex gap-3 text-sm">
          {userRole === 'ADMIN' ? (
            <Link href="/admin" className="text-blue-600 px-2 py-1">
              مدیریت
            </Link>
          ) : userRole === 'FIELD_OWNER' ? (
            <Link href="/field-owner" className="text-blue-600 px-2 py-1">
              صاحب زمین
            </Link>
          ) : (
            <>
              <Link href="/book" className="text-blue-600 px-2 py-1">
                رزرو
              </Link>
              <Link href="/my-bookings" className="text-blue-600 px-2 py-1">
                رزروهای من
              </Link>
              <Link href="/profile" className="text-blue-600 px-2 py-1">
                پروفایل
              </Link>
            </>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="text-red-600 border border-red-600 px-2 py-1 rounded text-sm"
        >
          خروج
        </button>
      </div>
    </nav>
  );
}
