'use client';

import { useState, useEffect } from 'react';
import { format, addDays, addWeeks, startOfWeek } from 'date-fns';
import { getAllCities } from '@/app/actions/city';
import { getClubsByCity } from '@/app/actions/city';
import { getAvailableSlotsAction } from '@/app/actions/booking';
import { createBooking } from '@/app/actions/booking';
import Navigation from './Navigation';
import { useSession } from 'next-auth/react';
import HijriDatePicker from './HijriDatePicker';

interface Participant {
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
}

export default function BookingPageClient() {
  const { data: session } = useSession();
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [clubs, setClubs] = useState<Array<{ id: string; name: string; courts: any[] }>>([]);
  const [selectedClub, setSelectedClub] = useState<string>('');
  const [selectedCourt, setSelectedCourt] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<Array<{ start: string; end: string; available: boolean; price: number }>>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [newParticipant, setNewParticipant] = useState<Participant>({ name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      loadClubs();
    } else {
      setClubs([]);
      setSelectedClub('');
      setSelectedCourt('');
    }
  }, [selectedCity]);

  useEffect(() => {
    if (selectedCourt && selectedDate) {
      loadSlots();
    } else {
      setSlots([]);
    }
  }, [selectedCourt, selectedDate]);

  async function loadCities() {
    const result = await getAllCities();
    if (result.success && result.cities) {
      setCities(result.cities);
      if (result.cities.length > 0) {
        setSelectedCity(result.cities[0].id);
      }
    }
  }

  async function loadClubs() {
    if (!selectedCity) return;
    setLoading(true);
    const result = await getClubsByCity(selectedCity);
    if (result.success && result.clubs) {
      setClubs(result.clubs);
    }
    setLoading(false);
  }

  async function loadSlots() {
    if (!selectedCourt) return;
    setLoading(true);
    setError('');
    const result = await getAvailableSlotsAction(selectedCourt, selectedDate);
    if (result.success) {
      setSlots(result.slots);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  function addParticipant() {
    if (!newParticipant.name.trim()) {
      setError('نام الزامی است');
      return;
    }
    if (participants.length >= 3) {
      setError('حداکثر ۳ نفر می‌توانید دعوت کنید');
      return;
    }
    setParticipants([...participants, { ...newParticipant }]);
    setNewParticipant({ name: '' });
    setShowParticipantForm(false);
  }

  function removeParticipant(index: number) {
    setParticipants(participants.filter((_, i) => i !== index));
  }

  async function handleBookSlot(startTime: string, endTime: string, price: number) {
    if (!selectedCourt) return;

    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('courtId', selectedCourt);
    formData.append('startTime', startTime);
    formData.append('endTime', endTime);
    formData.append('participants', JSON.stringify(participants));

    const result = await createBooking(formData);

    if (result.success) {
      setSuccess(result.message);
      setParticipants([]);
      loadSlots();
      setTimeout(() => {
        window.location.href = '/my-bookings';
      }, 2000);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  // Get next 4 weeks dates
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 6 }); // Saturday
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const weekStartDate = addWeeks(weekStart, i);
    return Array.from({ length: 7 }, (_, j) => addDays(weekStartDate, j));
  });

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

      <div className="space-y-4 p-4">
        {/* City Selection */}
        <div>
          <label htmlFor="city" className="block mb-2 text-sm font-medium">
            انتخاب شهر
          </label>
          <select
            id="city"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full p-3 border rounded text-base"
          >
            <option value="">انتخاب کنید</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        {/* Club Selection */}
        {selectedCity && (
          <div>
            <label htmlFor="club" className="block mb-2 text-sm font-medium">
              انتخاب باشگاه
            </label>
            <select
              id="club"
              value={selectedClub}
              onChange={(e) => {
                setSelectedClub(e.target.value);
                setSelectedCourt('');
              }}
              className="w-full p-3 border rounded text-base"
            >
              <option value="">انتخاب کنید</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Court Selection */}
        {selectedClub && (
          <div>
            <label htmlFor="court" className="block mb-2 text-sm font-medium">
              انتخاب زمین
            </label>
            <select
              id="court"
              value={selectedCourt}
              onChange={(e) => setSelectedCourt(e.target.value)}
              className="w-full p-3 border rounded text-base"
            >
              <option value="">انتخاب کنید</option>
              {clubs
                .find((c) => c.id === selectedClub)
                ?.courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name} ({court.type === 'OPEN' ? 'باز' : court.type === 'CLOSE' ? 'بسته' : 'سالن'}) - {court.basePricePerHour.toLocaleString('fa-IR')} تومان
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Date Selection - 4 Week Calendar */}
        {selectedCourt && (
          <div>
            <label className="block mb-2 text-sm font-medium">
              انتخاب تاریخ (۴ هفته آینده)
            </label>
            <div className="border rounded p-2">
              <HijriDatePicker
                value={selectedDate}
                min={format(today, 'yyyy-MM-dd')}
                max={format(addWeeks(today, 4), 'yyyy-MM-dd')}
                onChange={setSelectedDate}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Participants */}
        {selectedCourt && (
          <div className="border rounded p-3 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">دعوت بازیکن (حداکثر ۳ نفر)</label>
              {participants.length < 3 && (
                <button
                  onClick={() => setShowParticipantForm(true)}
                  className="text-sm text-blue-600"
                >
                  + افزودن
                </button>
              )}
            </div>

            {showParticipantForm && (
              <div className="mb-3 p-3 bg-white rounded border space-y-2">
                <input
                  type="text"
                  placeholder="نام"
                  value={newParticipant.name}
                  onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                />
                <input
                  type="email"
                  placeholder="ایمیل (اختیاری)"
                  value={newParticipant.email || ''}
                  onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                  dir="ltr"
                />
                <input
                  type="tel"
                  placeholder="شماره تلفن (اختیاری)"
                  value={newParticipant.phone || ''}
                  onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                  dir="ltr"
                />
                <select
                  value={newParticipant.gender || ''}
                  onChange={(e) => setNewParticipant({ ...newParticipant, gender: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="">جنسیت (اختیاری)</option>
                  <option value="MALE">مرد</option>
                  <option value="FEMALE">زن</option>
                  <option value="OTHER">سایر</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowParticipantForm(false);
                      setNewParticipant({ name: '' });
                    }}
                    className="flex-1 p-2 border rounded text-sm"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={addParticipant}
                    className="flex-1 p-2 bg-blue-600 text-white rounded text-sm"
                  >
                    افزودن
                  </button>
                </div>
              </div>
            )}

            {participants.map((p, i) => (
              <div key={i} className="flex justify-between items-center p-2 bg-white rounded mb-1">
                <span className="text-sm">{p.name}</span>
                <button
                  onClick={() => removeParticipant(i)}
                  className="text-red-600 text-sm"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Available Slots */}
        {selectedCourt && selectedDate && (
          <div>
            <h3 className="text-base font-bold mb-3">زمان‌های موجود</h3>
            {loading && !slots.length ? (
              <div className="text-center p-4 text-sm">در حال بارگذاری...</div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => handleBookSlot(slot.start, slot.end, slot.price)}
                    disabled={!slot.available || loading}
                    className={`p-3 border rounded text-sm ${
                      slot.available
                        ? 'bg-white hover:bg-gray-50'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    } ${loading ? 'opacity-50' : ''}`}
                  >
                    <div className="font-bold">
                      {format(new Date(slot.start), 'HH:mm')} -{' '}
                      {format(new Date(slot.end), 'HH:mm')}
                    </div>
                    <div className="text-xs mt-1">
                      {slot.available
                        ? `${slot.price.toLocaleString('fa-IR')} تومان`
                        : 'غیرقابل رزرو'}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 text-gray-500 text-sm">
                زمان‌های موجودی برای این تاریخ یافت نشد
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
