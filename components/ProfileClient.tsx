'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { updateProfile, deleteAccount } from '@/app/actions/auth';
import { getUserProfile } from '@/app/actions/user';
import Navigation from './Navigation';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UserProfile {
  name: string | null;
  family: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  height: number | null;
  photo: string | null;
}

export default function ProfileClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState<UserProfile>({
    name: null,
    family: null,
    email: null,
    phone: null,
    dateOfBirth: null,
    gender: null,
    height: null,
    photo: null,
  });
  const [formData, setFormData] = useState<UserProfile>({
    name: null,
    family: null,
    email: null,
    phone: null,
    dateOfBirth: null,
    gender: null,
    height: null,
    photo: null,
  });

  useEffect(() => {
    if (session?.user?.id) {
      loadProfile();
    }
  }, [session]);

  async function loadProfile() {
    if (!session?.user?.id) return;
    
    setLoading(true);
    const result = await getUserProfile();
    
    if (result.success && result.profile) {
      setProfile(result.profile);
      setFormData(result.profile);
    } else {
      setError(result.error || 'خطا در بارگذاری پروفایل');
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!session?.user?.id) return;

    setLoading(true);
    setError('');
    setSuccess('');

    const form = new FormData();
    form.append('userId', session.user.id);
    if (formData.name) form.append('name', formData.name);
    if (formData.family) form.append('family', formData.family);
    if (formData.email) form.append('email', formData.email);
    if (formData.dateOfBirth) form.append('dateOfBirth', formData.dateOfBirth);
    if (formData.gender) form.append('gender', formData.gender);
    if (formData.height) form.append('height', formData.height.toString());

    const result = await updateProfile(form);

    if (result.success) {
      setSuccess(result.message);
      setProfile({ ...formData });
      setEditing(false);
      loadProfile();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleDeleteAccount() {
    if (!session?.user?.id) return;
    
    if (!confirm('آیا از حذف حساب کاربری مطمئن هستید؟ این عمل غیرقابل بازگشت است.')) {
      return;
    }

    setLoading(true);
    const result = await deleteAccount(session.user.id);

    if (result.success) {
      await signOut({ redirect: false });
      router.push('/login');
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  if (loading && !profile.name) {
    return (
      <div>
        <Navigation userRole={session?.user?.role} />
        <div className="p-4 text-center">در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <Navigation userRole={session?.user?.role} />

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded mx-4 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded mx-4 text-sm">
          {success}
        </div>
      )}

      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">پروفایل</h1>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-blue-600 text-sm"
            >
              ویرایش
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium">نام</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border rounded"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">نام خانوادگی</label>
              <input
                type="text"
                value={formData.family || ''}
                onChange={(e) => setFormData({ ...formData, family: e.target.value })}
                className="w-full p-3 border rounded"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">ایمیل (اختیاری)</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 border rounded"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">شماره تلفن</label>
              <input
                type="tel"
                value={formData.phone || ''}
                disabled
                className="w-full p-3 border rounded bg-gray-100"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">شماره تلفن قابل تغییر نیست</p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">تاریخ تولد (اختیاری)</label>
              <input
                type="date"
                value={formData.dateOfBirth ? format(new Date(formData.dateOfBirth), 'yyyy-MM-dd') : ''}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value || null })}
                className="w-full p-3 border rounded"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">جنسیت (اختیاری)</label>
              <select
                value={formData.gender || ''}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value || null })}
                className="w-full p-3 border rounded"
              >
                <option value="">انتخاب کنید</option>
                <option value="MALE">مرد</option>
                <option value="FEMALE">زن</option>
                <option value="OTHER">سایر</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">قد (سانتی‌متر) (اختیاری)</label>
              <input
                type="number"
                min="100"
                max="250"
                value={formData.height || ''}
                onChange={(e) => setFormData({ ...formData, height: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full p-3 border rounded"
                dir="ltr"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  setEditing(false);
                  setFormData({ ...profile });
                }}
                className="flex-1 p-3 border rounded"
              >
                انصراف
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 p-3 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                {loading ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border rounded p-4 bg-white">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">نام:</span>
                  <span className="font-medium">{profile.name || 'نامشخص'}</span>
                </div>
                {profile.family && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">نام خانوادگی:</span>
                    <span className="font-medium">{profile.family}</span>
                  </div>
                )}
                {profile.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">ایمیل:</span>
                    <span className="font-medium" dir="ltr">{profile.email}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">شماره تلفن:</span>
                    <span className="font-medium" dir="ltr">{profile.phone}</span>
                  </div>
                )}
                {profile.dateOfBirth && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاریخ تولد:</span>
                    <span className="font-medium">{format(new Date(profile.dateOfBirth), 'yyyy/MM/dd')}</span>
                  </div>
                )}
                {profile.gender && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">جنسیت:</span>
                    <span className="font-medium">
                      {profile.gender === 'MALE' ? 'مرد' : profile.gender === 'FEMALE' ? 'زن' : 'سایر'}
                    </span>
                  </div>
                )}
                {profile.height && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">قد:</span>
                    <span className="font-medium">{profile.height} سانتی‌متر</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleDeleteAccount}
              className="w-full p-3 bg-red-600 text-white rounded"
            >
              حذف حساب کاربری
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
