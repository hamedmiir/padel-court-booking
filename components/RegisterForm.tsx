'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/app/actions/auth';
import Link from 'next/link';

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await register(formData);

    if (result.success) {
      router.push('/login');
    } else {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="border p-4 rounded">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block mb-2">
            نام
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label htmlFor="email" className="block mb-2">
            ایمیل
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full p-2 border rounded"
            dir="ltr"
          />
        </div>

        <div>
          <label htmlFor="password" className="block mb-2">
            رمز عبور
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            minLength={6}
            className="w-full p-2 border rounded"
            dir="ltr"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/login" className="text-blue-600">
          قبلاً ثبت‌نام کرده‌اید؟ وارد شوید
        </Link>
      </div>
    </div>
  );
}

