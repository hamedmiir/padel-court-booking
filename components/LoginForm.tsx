'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendOtp, verifyOtp } from '@/app/actions/otp';
import { signInUser } from '@/app/actions/auth';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<'identifier' | 'otp' | 'complete'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  async function handleSendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('identifier', identifier.trim());

    const result = await sendOtp(formData);

    if (result.success) {
      setStep('otp');
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('identifier', identifier.trim());
    formData.append('code', otp);

    const result = await verifyOtp(formData);

    if (result.success) {
      setUserId(result.userId);
      setIsNewUser(result.isNewUser);
      
      // Sign in with NextAuth
      await signIn('credentials', {
        userId: result.userId,
        redirect: false,
      });

      if (result.isNewUser) {
        setStep('complete');
      } else {
        router.push('/');
        router.refresh();
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleSkipProfile() {
    if (userId) {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <div className="border p-4 rounded max-w-md mx-auto">
      {step === 'identifier' && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <h2 className="text-xl font-bold mb-4 text-center">ورود / ثبت‌نام</h2>
          
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="identifier" className="block mb-2 text-sm">
              ایمیل یا شماره تلفن
            </label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full p-3 border rounded text-base"
              dir="ltr"
              placeholder="09123456789 یا example@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-blue-600 text-white rounded disabled:opacity-50 font-medium"
          >
            {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <h2 className="text-xl font-bold mb-4 text-center">ورود کد تأیید</h2>
          
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="otp" className="block mb-2 text-sm">
              کد ۶ رقمی ارسال شده
            </label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className="w-full p-3 border rounded text-center text-2xl tracking-widest"
              dir="ltr"
              placeholder="000000"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep('identifier');
                setOtp('');
                setError('');
              }}
              className="flex-1 p-3 border rounded"
            >
              بازگشت
            </button>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="flex-1 p-3 bg-blue-600 text-white rounded disabled:opacity-50 font-medium"
            >
              {loading ? 'در حال بررسی...' : 'تأیید'}
            </button>
          </div>
        </form>
      )}

      {step === 'complete' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4 text-center">خوش آمدید!</h2>
          <p className="text-sm text-gray-600 text-center">
            برای تکمیل ثبت‌نام، می‌توانید اطلاعات خود را در پروفایل تکمیل کنید
          </p>
          <button
            onClick={handleSkipProfile}
            className="w-full p-3 bg-blue-600 text-white rounded font-medium"
          >
            ادامه
          </button>
        </div>
      )}
    </div>
  );
}
