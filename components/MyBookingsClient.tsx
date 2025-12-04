'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import moment from 'moment-jalaali';
import { getUserBookings, updateBooking, respondToInvitation } from '@/app/actions/booking';
import Navigation from './Navigation';
import { useSession } from 'next-auth/react';
import HijriDatePicker from './HijriDatePicker';

interface Participant {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  status: string;
  isUser: boolean;
}

interface Booking {
  id: string;
  courtName: string;
  courtType: string;
  clubName: string;
  cityName: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: string;
  isOwner: boolean;
  owner: {
    name: string | null;
    family: string | null;
    email: string | null;
    phone: string | null;
  };
  participants: Participant[];
  createdAt: string;
}

export default function MyBookingsClient() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingBooking, setEditingBooking] = useState<string | null>(null);
  const [showAddParticipant, setShowAddParticipant] = useState<string | null>(null);
  const [newParticipant, setNewParticipant] = useState({ name: '', email: '', phone: '', gender: '' });
  const [showChangeTime, setShowChangeTime] = useState<string | null>(null);
  const [newTime, setNewTime] = useState({ startTime: '', endTime: '' });

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    const result = await getUserBookings();
    
    if (result.success) {
      setBookings(result.bookings);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleRespondToInvitation(bookingId: string, accept: boolean) {
    setLoading(true);
    setError('');
    const result = await respondToInvitation(bookingId, accept);
    if (result.success) {
      setSuccess(result.message);
      loadBookings();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleRemoveParticipant(bookingId: string, participantId: string) {
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('bookingId', bookingId);
    formData.append('action', 'remove_participant');
    formData.append('participantId', participantId);
    
    const result = await updateBooking(formData);
    if (result.success) {
      setSuccess(result.message);
      loadBookings();
      setEditingBooking(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleAddParticipant(bookingId: string) {
    if (!newParticipant.name.trim()) {
      setError('نام الزامی است');
      return;
    }

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('bookingId', bookingId);
    formData.append('action', 'add_participant');
    formData.append('name', newParticipant.name);
    formData.append('email', newParticipant.email);
    formData.append('phone', newParticipant.phone);
    formData.append('gender', newParticipant.gender);
    
    const result = await updateBooking(formData);
    if (result.success) {
      setSuccess(result.message);
      loadBookings();
      setShowAddParticipant(null);
      setNewParticipant({ name: '', email: '', phone: '', gender: '' });
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleChangeTime(bookingId: string) {
    if (!newTime.startTime || !newTime.endTime) {
      setError('زمان جدید الزامی است');
      return;
    }

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('bookingId', bookingId);
    formData.append('action', 'change_time');
    formData.append('startTime', newTime.startTime);
    formData.append('endTime', newTime.endTime);
    
    const result = await updateBooking(formData);
    if (result.success) {
      setSuccess(result.message);
      loadBookings();
      setShowChangeTime(null);
      setNewTime({ startTime: '', endTime: '' });
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleCancel(bookingId: string) {
    if (!confirm('آیا از لغو این رزرو مطمئن هستید؟')) {
      return;
    }

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('bookingId', bookingId);
    formData.append('action', 'cancel');
    
    const result = await updateBooking(formData);
    if (result.success) {
      setSuccess(result.message);
      loadBookings();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  const now = new Date();
  const upcomingBookings = bookings.filter(
    (b) => new Date(b.startTime) >= now && b.status === 'CONFIRMED'
  );
  const pastBookings = bookings.filter(
    (b) => new Date(b.startTime) < now
  );

  if (loading && bookings.length === 0) {
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
        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3">رزروهای آینده</h2>
            {upcomingBookings.map((booking) => (
              <div key={booking.id} className="border rounded p-3 mb-3 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-sm">{booking.courtName}</div>
                    <div className="text-xs text-gray-600">
                      {booking.clubName} - {booking.cityName}
                    </div>
                    <div className="text-xs text-gray-600">
                      {booking.courtType === 'OPEN' ? 'باز' : booking.courtType === 'CLOSE' ? 'بسته' : 'سالن'}
                    </div>
                  </div>
                  <div className="text-left text-sm">
                    <div>{moment(booking.startTime).format('jYYYY/jMM/jDD')}</div>
                    <div>{format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}</div>
                    <div className="font-bold">{booking.totalPrice.toLocaleString('fa-IR')} تومان</div>
                  </div>
                </div>

                {/* Participants */}
                {booking.participants.length > 0 && (
                  <div className="mb-2 pt-2 border-t">
                    <div className="text-xs font-medium mb-1">بازیکنان:</div>
                    {booking.participants.map((p) => (
                      <div key={p.id} className="text-xs text-gray-600">
                        {p.name || 'بدون نام'} - {p.status === 'ACCEPTED' ? '✓ پذیرفته' : p.status === 'DECLINED' ? '✗ رد شده' : 'در انتظار'}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions for owner */}
                {booking.isOwner && (
                  <div className="pt-2 border-t space-y-2">
                    <button
                      onClick={() => setEditingBooking(editingBooking === booking.id ? null : booking.id)}
                      className="w-full p-2 border rounded text-sm"
                    >
                      {editingBooking === booking.id ? 'بستن' : 'ویرایش'}
                    </button>

                    {editingBooking === booking.id && (
                      <div className="space-y-2 mt-2">
                        {/* Remove participants */}
                        {booking.participants.map((p) => (
                          <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-xs">{p.name}</span>
                            <button
                              onClick={() => handleRemoveParticipant(booking.id, p.id)}
                              className="text-red-600 text-xs"
                            >
                              حذف
                            </button>
                          </div>
                        ))}

                        {/* Add participant */}
                        {booking.participants.length < 3 && (
                          <>
                            {showAddParticipant === booking.id ? (
                              <div className="p-2 bg-gray-50 rounded space-y-2">
                                <input
                                  type="text"
                                  placeholder="نام"
                                  value={newParticipant.name}
                                  onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                                  className="w-full p-2 border rounded text-xs"
                                />
                                <input
                                  type="email"
                                  placeholder="ایمیل (اختیاری)"
                                  value={newParticipant.email}
                                  onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                                  className="w-full p-2 border rounded text-xs"
                                  dir="ltr"
                                />
                                <input
                                  type="tel"
                                  placeholder="شماره تلفن (اختیاری)"
                                  value={newParticipant.phone}
                                  onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                                  className="w-full p-2 border rounded text-xs"
                                  dir="ltr"
                                />
                                <select
                                  value={newParticipant.gender}
                                  onChange={(e) => setNewParticipant({ ...newParticipant, gender: e.target.value })}
                                  className="w-full p-2 border rounded text-xs"
                                >
                                  <option value="">جنسیت (اختیاری)</option>
                                  <option value="MALE">مرد</option>
                                  <option value="FEMALE">زن</option>
                                  <option value="OTHER">سایر</option>
                                </select>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setShowAddParticipant(null);
                                      setNewParticipant({ name: '', email: '', phone: '', gender: '' });
                                    }}
                                    className="flex-1 p-2 border rounded text-xs"
                                  >
                                    انصراف
                                  </button>
                                  <button
                                    onClick={() => handleAddParticipant(booking.id)}
                                    className="flex-1 p-2 bg-blue-600 text-white rounded text-xs"
                                  >
                                    افزودن
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowAddParticipant(booking.id)}
                                className="w-full p-2 border rounded text-sm"
                              >
                                + افزودن بازیکن
                              </button>
                            )}
                          </>
                        )}

                        {/* Change time (6h before) */}
                        {(() => {
                          const hoursUntilStart = (new Date(booking.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
                          return hoursUntilStart >= 6 ? (
                            <>
                              {showChangeTime === booking.id ? (
                                <div className="p-2 bg-gray-50 rounded space-y-2">
                                  <input
                                    type="datetime-local"
                                    value={newTime.startTime}
                                    onChange={(e) => setNewTime({ ...newTime, startTime: e.target.value })}
                                    className="w-full p-2 border rounded text-xs"
                                  />
                                  <input
                                    type="datetime-local"
                                    value={newTime.endTime}
                                    onChange={(e) => setNewTime({ ...newTime, endTime: e.target.value })}
                                    className="w-full p-2 border rounded text-xs"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setShowChangeTime(null);
                                        setNewTime({ startTime: '', endTime: '' });
                                      }}
                                      className="flex-1 p-2 border rounded text-xs"
                                    >
                                      انصراف
                                    </button>
                                    <button
                                      onClick={() => handleChangeTime(booking.id)}
                                      className="flex-1 p-2 bg-blue-600 text-white rounded text-xs"
                                    >
                                      تغییر زمان
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setShowChangeTime(booking.id);
                                    setNewTime({
                                      startTime: format(new Date(booking.startTime), "yyyy-MM-dd'T'HH:mm"),
                                      endTime: format(new Date(booking.endTime), "yyyy-MM-dd'T'HH:mm"),
                                    });
                                  }}
                                  className="w-full p-2 border rounded text-sm"
                                >
                                  تغییر زمان
                                </button>
                              )}
                            </>
                          ) : null;
                        })()}

                        {/* Cancel */}
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="w-full p-2 bg-red-600 text-white rounded text-sm"
                        >
                          لغو رزرو
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions for invited user */}
                {!booking.isOwner && booking.participants.some((p) => p.isUser && p.status === 'PENDING') && (
                  <div className="pt-2 border-t flex gap-2">
                    <button
                      onClick={() => handleRespondToInvitation(booking.id, true)}
                      className="flex-1 p-2 bg-green-600 text-white rounded text-sm"
                    >
                      پذیرفتن
                    </button>
                    <button
                      onClick={() => handleRespondToInvitation(booking.id, false)}
                      className="flex-1 p-2 bg-red-600 text-white rounded text-sm"
                    >
                      رد کردن
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3">رزروهای گذشته</h2>
            {pastBookings.map((booking) => (
              <div key={booking.id} className="border rounded p-3 mb-3 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-sm">{booking.courtName}</div>
                    <div className="text-xs text-gray-600">
                      {booking.clubName} - {booking.cityName}
                    </div>
                  </div>
                  <div className="text-left text-sm">
                    <div>{moment(booking.startTime).format('jYYYY/jMM/jDD')}</div>
                    <div>{format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}</div>
                    <div className="font-bold">{booking.totalPrice.toLocaleString('fa-IR')} تومان</div>
                  </div>
                </div>
                {booking.isOwner && (
                  <button
                    onClick={() => {
                      // TODO: Implement repeat booking
                      alert('این ویژگی به زودی اضافه می‌شود');
                    }}
                    className="w-full mt-2 p-2 border rounded text-sm"
                  >
                    رزرو مجدد
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {bookings.length === 0 && (
          <div className="text-center p-8 text-gray-500">
            رزروی یافت نشد
          </div>
        )}
      </div>
    </div>
  );
}
