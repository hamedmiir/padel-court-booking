'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import moment from 'moment-jalaali';
import { getMatchesLookingForPlayers, joinMatch } from '@/app/actions/booking';
import Navigation from './Navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import HijriDatePicker from './HijriDatePicker';

interface Match {
  id: string;
  courtName: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  ownerName: string;
  currentPlayers: number;
  maxPlayers?: number;
  participants: Array<{ name: string; email?: string }>;
}

export default function FindPlayersClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadMatches();
  }, [selectedDate]);

  async function loadMatches() {
    setLoading(true);
    setError('');
    const result = await getMatchesLookingForPlayers(selectedDate);
    
    if (result.success) {
      setMatches(result.matches);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleJoinMatch(matchId: string) {
    if (!confirm('آیا می‌خواهید به این رزرو بپیوندید؟')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const result = await joinMatch(matchId);

    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => {
        router.push('/my-bookings');
        router.refresh();
      }, 2000);
    } else {
      setError(result.error);
      loadMatches(); // Refresh to update player counts
    }
    setLoading(false);
  }

  return (
    <div>
      <Navigation userRole={session?.user?.role} />

      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6 text-center border-b pb-4">
          پیدا کردن بازیکن
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

        <div className="mb-4">
          <label htmlFor="date" className="block mb-2">
            فیلتر بر اساس تاریخ (شمسی)
          </label>
          <HijriDatePicker
            id="date"
            value={selectedDate}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={setSelectedDate}
            className="w-full"
          />
        </div>

        {loading && matches.length === 0 && (
          <div className="text-center p-4">در حال بارگذاری...</div>
        )}

        {!loading && matches.length === 0 && (
          <div className="text-center p-4 text-gray-500">
            رزروی برای این تاریخ یافت نشد
          </div>
        )}

        <div className="space-y-3">
          {matches.map((match) => (
            <div key={match.id} className="border p-4 rounded">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold">{match.courtName}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {moment(match.startTime).format('jYYYY/jMM/jDD - HH:mm')} تا{' '}
                    {format(new Date(match.endTime), 'HH:mm')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    صاحب رزرو: {match.ownerName}
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">
                    بازیکنان: {match.currentPlayers}
                    {match.maxPlayers && ` / ${match.maxPlayers}`}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {match.totalPrice.toLocaleString('fa-IR')} تومان
                  </div>
                </div>
              </div>

              {match.participants.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm font-bold mb-1">بازیکنان فعلی:</div>
                  <div className="text-xs space-y-1">
                    <div>• {match.ownerName} (صاحب رزرو)</div>
                    {match.participants.map((p, idx) => (
                      <div key={idx}>• {p.name} {p.email && `(${p.email})`}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 pt-3 border-t">
                <button
                  onClick={() => handleJoinMatch(match.id)}
                  disabled={loading || (match.maxPlayers ? match.currentPlayers >= match.maxPlayers : false)}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    match.maxPlayers && match.currentPlayers >= match.maxPlayers
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  {match.maxPlayers && match.currentPlayers >= match.maxPlayers
                    ? 'رزرو کامل است'
                    : 'پیوستن به رزرو'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

