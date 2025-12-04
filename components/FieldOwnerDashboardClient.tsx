'use client';

import { useState, useEffect } from 'react';
import { getAllCourts, createCourt, updatePricing } from '@/app/actions/court';
import { createSportsClub, getMySportsClubs } from '@/app/actions/sports-club';
import { setCancellationPolicy } from '@/app/actions/cancellation';
import { getCancellationRequests, verifyCancellation } from '@/app/actions/cancellation';
import Navigation from './Navigation';
import { useSession } from 'next-auth/react';
import moment from 'moment-jalaali';
import HijriDatePicker from './HijriDatePicker';
import { format } from 'date-fns';

export default function FieldOwnerDashboardClient() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'courts' | 'clubs' | 'cancellations'>('courts');
  
  // Courts state
  const [courts, setCourts] = useState<Array<{ id: string; name: string; type: string; basePricePerHour: number }>>([]);
  const [showCourtForm, setShowCourtForm] = useState(false);
  const [courtName, setCourtName] = useState('');
  const [courtType, setCourtType] = useState<'OPEN' | 'CLOSE' | 'SALON'>('OPEN');
  const [courtPrice, setCourtPrice] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  
  // Clubs state
  const [clubs, setClubs] = useState<Array<{ id: string; name: string; address?: string; phone?: string; email?: string; courtsCount: number }>>([]);
  const [showClubForm, setShowClubForm] = useState(false);
  const [clubName, setClubName] = useState('');
  const [clubAddress, setClubAddress] = useState('');
  const [clubPhone, setClubPhone] = useState('');
  const [clubEmail, setClubEmail] = useState('');
  
  // Cancellation requests
  const [cancellationRequests, setCancellationRequests] = useState<Array<{
    id: string;
    userName: string;
    userEmail: string;
    courtName: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    refundAmount: number;
    cancellationReason: string | null;
    requestedAt: string;
  }>>([]);
  
  // Cancellation policy
  const [showPolicyForm, setShowPolicyForm] = useState<string | null>(null);
  const [policyHours, setPolicyHours] = useState('');
  const [policyRefund, setPolicyRefund] = useState('100');
  const [policyDescription, setPolicyDescription] = useState('');
  
  // Date range filter
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [activeTab, startDate, endDate]);

  async function loadData() {
    setLoading(true);
    setError('');
    
    if (activeTab === 'courts') {
      const result = await getAllCourts();
      if (result.success) {
        setCourts(result.courts);
      }
    } else if (activeTab === 'clubs') {
      const result = await getMySportsClubs();
      if (result.success) {
        setClubs(result.clubs);
      }
    } else if (activeTab === 'cancellations') {
      const result = await getCancellationRequests(
        startDate || undefined,
        endDate || undefined
      );
      if (result.success) {
        setCancellationRequests(result.requests);
      }
    }
    
    setLoading(false);
  }

  async function handleCreateCourt() {
    if (!courtName || !courtPrice) {
      setError('نام و قیمت زمین الزامی است');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('name', courtName);
    formData.append('type', courtType);
    formData.append('basePricePerHour', courtPrice);
    if (selectedClub) {
      formData.append('sportsClubId', selectedClub);
    }

    const result = await createCourt(formData);

    if (result.success) {
      setSuccess(result.message);
      setShowCourtForm(false);
      setCourtName('');
      setCourtType('OPEN');
      setCourtPrice('');
      setSelectedClub('');
      loadData();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleCreateClub() {
    if (!clubName) {
      setError('نام باشگاه الزامی است');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('name', clubName);
    if (clubAddress) formData.append('address', clubAddress);
    if (clubPhone) formData.append('phone', clubPhone);
    if (clubEmail) formData.append('email', clubEmail);

    const result = await createSportsClub(formData);

    if (result.success) {
      setSuccess(result.message);
      setShowClubForm(false);
      setClubName('');
      setClubAddress('');
      setClubPhone('');
      setClubEmail('');
      loadData();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleSetPolicy(courtId: string) {
    if (!policyHours || !policyRefund) {
      setError('ساعات قبل از شروع و درصد بازگشت الزامی است');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('courtId', courtId);
    formData.append('hoursBeforeStart', policyHours);
    formData.append('refundPercentage', policyRefund);
    if (policyDescription) formData.append('description', policyDescription);

    const result = await setCancellationPolicy(formData);

    if (result.success) {
      setSuccess(result.message);
      setShowPolicyForm(null);
      setPolicyHours('');
      setPolicyRefund('100');
      setPolicyDescription('');
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleVerifyCancellation(bookingId: string, approved: boolean) {
    setLoading(true);
    setError('');
    setSuccess('');

    const result = await verifyCancellation(bookingId, approved);

    if (result.success) {
      setSuccess(result.message);
      loadData();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div>
      <Navigation userRole={session?.user?.role} />

      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6 text-center border-b pb-4">
          پنل صاحب زمین
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b">
          <button
            onClick={() => setActiveTab('courts')}
            className={`px-4 py-2 ${activeTab === 'courts' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            زمین‌ها
          </button>
          <button
            onClick={() => setActiveTab('clubs')}
            className={`px-4 py-2 ${activeTab === 'clubs' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            باشگاه‌ها
          </button>
          <button
            onClick={() => setActiveTab('cancellations')}
            className={`px-4 py-2 ${activeTab === 'cancellations' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            درخواست‌های لغو
          </button>
        </div>

        {activeTab === 'courts' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">زمین‌ها</h2>
              <button
                onClick={() => setShowCourtForm(!showCourtForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {showCourtForm ? 'انصراف' : 'افزودن زمین'}
              </button>
            </div>

            {showCourtForm && (
              <div className="mb-4 p-4 border rounded bg-gray-50">
                <div className="space-y-3">
                  <div>
                    <label className="block mb-1">نام زمین</label>
                    <input
                      type="text"
                      value={courtName}
                      onChange={(e) => setCourtName(e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">نوع زمین</label>
                    <select
                      value={courtType}
                      onChange={(e) => setCourtType(e.target.value as 'OPEN' | 'CLOSE' | 'SALON')}
                      className="w-full p-2 border rounded"
                    >
                      <option value="OPEN">باز</option>
                      <option value="CLOSE">بسته</option>
                      <option value="SALON">سالن</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1">قیمت پایه (تومان/ساعت)</label>
                    <input
                      type="number"
                      value={courtPrice}
                      onChange={(e) => setCourtPrice(e.target.value)}
                      className="w-full p-2 border rounded"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">باشگاه (اختیاری)</label>
                    <select
                      value={selectedClub}
                      onChange={(e) => setSelectedClub(e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">بدون باشگاه</option>
                      {clubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleCreateCourt}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                  >
                    ایجاد زمین
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {courts.map((court) => (
                <div key={court.id} className="border p-4 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">
                        {court.name} ({court.type === 'OPEN' ? 'باز' : court.type === 'CLOSE' ? 'بسته' : 'سالن'})
                      </div>
                      <div className="text-sm text-gray-600">
                        قیمت پایه: {court.basePricePerHour.toLocaleString('fa-IR')} تومان/ساعت
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPolicyForm(showPolicyForm === court.id ? null : court.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                    >
                      تنظیم سیاست لغو
                    </button>
                  </div>

                  {showPolicyForm === court.id && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs mb-1">ساعات قبل از شروع (حداقل)</label>
                          <input
                            type="number"
                            value={policyHours}
                            onChange={(e) => setPolicyHours(e.target.value)}
                            className="w-full p-2 border rounded"
                            min="0"
                            placeholder="مثلاً 24"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">درصد بازگشت وجه (0-100)</label>
                          <input
                            type="number"
                            value={policyRefund}
                            onChange={(e) => setPolicyRefund(e.target.value)}
                            className="w-full p-2 border rounded"
                            min="0"
                            max="100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">توضیحات (اختیاری)</label>
                          <textarea
                            value={policyDescription}
                            onChange={(e) => setPolicyDescription(e.target.value)}
                            className="w-full p-2 border rounded"
                            rows={2}
                          />
                        </div>
                        <button
                          onClick={() => handleSetPolicy(court.id)}
                          disabled={loading}
                          className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50"
                        >
                          ذخیره سیاست
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'clubs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">باشگاه‌های ورزشی</h2>
              <button
                onClick={() => setShowClubForm(!showClubForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {showClubForm ? 'انصراف' : 'افزودن باشگاه'}
              </button>
            </div>

            {showClubForm && (
              <div className="mb-4 p-4 border rounded bg-gray-50">
                <div className="space-y-3">
                  <div>
                    <label className="block mb-1">نام باشگاه</label>
                    <input
                      type="text"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">آدرس (اختیاری)</label>
                    <input
                      type="text"
                      value={clubAddress}
                      onChange={(e) => setClubAddress(e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">تلفن (اختیاری)</label>
                    <input
                      type="tel"
                      value={clubPhone}
                      onChange={(e) => setClubPhone(e.target.value)}
                      className="w-full p-2 border rounded"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">ایمیل (اختیاری)</label>
                    <input
                      type="email"
                      value={clubEmail}
                      onChange={(e) => setClubEmail(e.target.value)}
                      className="w-full p-2 border rounded"
                      dir="ltr"
                    />
                  </div>
                  <button
                    onClick={handleCreateClub}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                  >
                    ایجاد باشگاه
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {clubs.map((club) => (
                <div key={club.id} className="border p-4 rounded">
                  <div className="font-bold">{club.name}</div>
                  {club.address && <div className="text-sm text-gray-600">آدرس: {club.address}</div>}
                  {club.phone && <div className="text-sm text-gray-600">تلفن: {club.phone}</div>}
                  {club.email && <div className="text-sm text-gray-600">ایمیل: {club.email}</div>}
                  <div className="text-sm text-gray-600">تعداد زمین: {club.courtsCount}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cancellations' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">درخواست‌های لغو</h2>
            </div>

            <div className="mb-4 p-3 border rounded bg-gray-50">
              <div className="text-sm font-bold mb-2">فیلتر بر اساس تاریخ:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-1">از تاریخ</label>
                  <HijriDatePicker
                    value={startDate}
                    onChange={setStartDate}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">تا تاریخ</label>
                  <HijriDatePicker
                    value={endDate}
                    onChange={setEndDate}
                    min={startDate || undefined}
                    className="w-full"
                  />
                </div>
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="mt-2 text-xs text-blue-600"
                >
                  پاک کردن فیلتر
                </button>
              )}
            </div>

            {loading && cancellationRequests.length === 0 && (
              <div className="text-center p-4">در حال بارگذاری...</div>
            )}

            {!loading && cancellationRequests.length === 0 && (
              <div className="text-center p-4 text-gray-500">
                درخواست لغویی یافت نشد
              </div>
            )}

            <div className="space-y-3">
              {cancellationRequests.map((request) => (
                <div key={request.id} className="border p-4 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold">{request.courtName}</div>
                      <div className="text-sm text-gray-600">
                        کاربر: {request.userName} ({request.userEmail})
                      </div>
                      <div className="text-sm text-gray-600">
                        {moment(request.startTime).format('jYYYY/jMM/jDD - HH:mm')}
                      </div>
                      {request.cancellationReason && (
                        <div className="text-sm text-gray-600 mt-1">
                          دلیل: {request.cancellationReason}
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold">
                        مبلغ بازگشتی: {request.refundAmount.toLocaleString('fa-IR')} تومان
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleVerifyCancellation(request.id, true)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50"
                    >
                      تأیید و بازگشت وجه
                    </button>
                    <button
                      onClick={() => handleVerifyCancellation(request.id, false)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm disabled:opacity-50"
                    >
                      رد درخواست
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

