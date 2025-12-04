'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { acceptInvitation } from '@/app/actions/booking';
import Link from 'next/link';

interface InvitePageClientProps {
  token: string;
}

export default function InvitePageClient({ token }: InvitePageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  async function handleAccept() {
    setLoading(true);
    setError('');
    setMessage('');

    const result = await acceptInvitation(token);

    if (result.success) {
      setMessage(result.message);
      setTimeout(() => {
        router.push('/my-bookings');
        router.refresh();
      }, 2000);
    } else {
      if (result.requiresAuth) {
        // Redirect to login
        router.push(`/login?callbackUrl=/invite/${token}`);
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-center border-b pb-4">
        دعوت به رزرو
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}

      <div className="border p-4 rounded space-y-4">
        <p className="text-center">
          شما به یک رزرو دعوت شده‌اید. برای پذیرش دعوت، لطفاً وارد شوید یا ثبت‌نام کنید.
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 p-3 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'در حال پردازش...' : 'پذیرش دعوت'}
          </button>
        </div>

        <div className="text-center space-y-2">
          <Link href={`/login?callbackUrl=/invite/${token}`} className="text-blue-600 block">
            ورود به حساب کاربری
          </Link>
          <Link href={`/register?callbackUrl=/invite/${token}`} className="text-blue-600 block">
            ثبت‌نام
          </Link>
        </div>
      </div>
    </div>
  );
}

