'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getAllCourts, createCourt, updatePricing, getAllBookings } from '@/app/actions/court';
import Navigation from './Navigation';
import { useSession } from 'next-auth/react';
import HijriDatePicker from './HijriDatePicker';

interface Court {
  id: string;
  name: string;
  basePricePerHour: number;
  pricingRules: Array<{
    id: string;
    startTime: string;
    endTime: string;
    multiplier: number;
  }>;
}

interface Booking {
  id: string;
  userName: string;
  userEmail: string;
  courtName: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: string;
  createdAt: string;
}

export default function AdminDashboardClient() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'bookings' | 'courts'>('bookings');
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showAddCourt, setShowAddCourt] = useState(false);
  const [showAddPricing, setShowAddPricing] = useState(false);
  const [selectedCourtForPricing, setSelectedCourtForPricing] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [activeTab, startDate, endDate]);

  async function loadData() {
    setLoading(true);
    setError('');

    if (activeTab === 'bookings') {
      const result = await getAllBookings(
        startDate || undefined,
        endDate || undefined
      );
      if (result.success && result.bookings) {
        setBookings(result.bookings);
      } else {
        setError(result.error || 'خطا در دریافت رزروها');
      }
    } else {
      const result = await getAllCourts();
      if (result.success && result.courts) {
        setCourts(result.courts);
      } else {
        setError(result.error || 'خطا در دریافت زمین‌ها');
      }
    }

    setLoading(false);
  }

  async function handleAddCourt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData(e.currentTarget);
    const result = await createCourt(formData);

    if (result.success) {
      setSuccess(result.message);
      setShowAddCourt(false);
      loadData();
      e.currentTarget.reset();
    } else {
      setError(result.error);
    }
  }

  async function handleAddPricing(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData(e.currentTarget);
    formData.append('courtId', selectedCourtForPricing);

    const result = await updatePricing(formData);

    if (result.success) {
      setSuccess(result.message);
      setShowAddPricing(false);
      setSelectedCourtForPricing('');
      loadData();
      e.currentTarget.reset();
    } else {
      setError(result.error);
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'در انتظار';
      case 'CONFIRMED':
        return 'تأیید شده';
      case 'CANCELLED':
        return 'لغو شده';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <Navigation userRole={session?.user?.role} />

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

      <div className="mb-4 border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 ${activeTab === 'bookings' ? 'border-b-2 border-blue-600' : ''}`}
          >
            رزروها
          </button>
          <button
            onClick={() => setActiveTab('courts')}
            className={`px-4 py-2 ${activeTab === 'courts' ? 'border-b-2 border-blue-600' : ''}`}
          >
            زمین‌ها
          </button>
        </div>
      </div>

      {activeTab === 'bookings' && (
        <div>
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

          {loading && bookings.length === 0 && (
            <div className="text-center p-4">در حال بارگذاری...</div>
          )}

          {!loading && bookings.length === 0 && (
            <div className="text-center p-4 text-gray-500">
              رزروی یافت نشد
            </div>
          )}

          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="border p-4 rounded">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold">{booking.courtName}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {booking.userName} ({booking.userEmail})
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {format(new Date(booking.startTime), 'yyyy/MM/dd - HH:mm')} تا{' '}
                      {format(new Date(booking.endTime), 'HH:mm')}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${getStatusColor(booking.status)}`}
                  >
                    {getStatusText(booking.status)}
                  </span>
                </div>
                <div className="mt-3 font-bold">
                  {booking.totalPrice.toLocaleString('fa-IR')} تومان
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'courts' && (
        <div>
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setShowAddCourt(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              افزودن زمین
            </button>
            <button
              onClick={() => setShowAddPricing(true)}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              افزودن قانون قیمت
            </button>
          </div>

          {showAddCourt && (
            <div className="mb-4 border p-4 rounded">
              <h3 className="font-bold mb-3">افزودن زمین جدید</h3>
              <form onSubmit={handleAddCourt} className="space-y-3">
                <div>
                  <label htmlFor="courtName" className="block mb-1">
                    نام زمین
                  </label>
                  <input
                    type="text"
                    id="courtName"
                    name="name"
                    required
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label htmlFor="basePrice" className="block mb-1">
                    قیمت پایه (تومان)
                  </label>
                  <input
                    type="number"
                    id="basePrice"
                    name="basePricePerHour"
                    required
                    min="0"
                    step="0.01"
                    className="w-full p-2 border rounded"
                    dir="ltr"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    افزودن
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCourt(false)}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          )}

          {showAddPricing && (
            <div className="mb-4 border p-4 rounded">
              <h3 className="font-bold mb-3">افزودن قانون قیمت‌گذاری</h3>
              <form onSubmit={handleAddPricing} className="space-y-3">
                <div>
                  <label htmlFor="pricingCourt" className="block mb-1">
                    انتخاب زمین
                  </label>
                  <select
                    id="pricingCourt"
                    value={selectedCourtForPricing}
                    onChange={(e) => setSelectedCourtForPricing(e.target.value)}
                    required
                    className="w-full p-2 border rounded"
                  >
                    <option value="">انتخاب کنید</option>
                    {courts.map((court) => (
                      <option key={court.id} value={court.id}>
                        {court.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="startTime" className="block mb-1">
                    زمان شروع (HH:mm)
                  </label>
                  <input
                    type="text"
                    id="startTime"
                    name="startTime"
                    required
                    pattern="^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
                    placeholder="18:00"
                    className="w-full p-2 border rounded"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label htmlFor="endTime" className="block mb-1">
                    زمان پایان (HH:mm)
                  </label>
                  <input
                    type="text"
                    id="endTime"
                    name="endTime"
                    required
                    pattern="^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
                    placeholder="23:00"
                    className="w-full p-2 border rounded"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label htmlFor="multiplier" className="block mb-1">
                    ضریب قیمت
                  </label>
                  <input
                    type="number"
                    id="multiplier"
                    name="multiplier"
                    required
                    min="0.1"
                    step="0.1"
                    placeholder="1.5"
                    className="w-full p-2 border rounded"
                    dir="ltr"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded"
                  >
                    افزودن
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPricing(false);
                      setSelectedCourtForPricing('');
                    }}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading && courts.length === 0 && (
            <div className="text-center p-4">در حال بارگذاری...</div>
          )}

          <div className="space-y-3">
            {courts.map((court) => (
              <div key={court.id} className="border p-4 rounded">
                <div className="font-bold mb-2">{court.name}</div>
                <div className="text-sm text-gray-600 mb-3">
                  قیمت پایه: {court.basePricePerHour.toLocaleString('fa-IR')} تومان
                </div>
                {court.pricingRules.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-bold mb-2">قوانین قیمت:</div>
                    <div className="space-y-1">
                      {court.pricingRules.map((rule) => (
                        <div key={rule.id} className="text-sm bg-gray-100 p-2 rounded">
                          {rule.startTime} - {rule.endTime}: {rule.multiplier}x
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

