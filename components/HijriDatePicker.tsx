'use client';

import { useState, useEffect, useRef } from 'react';
import moment from 'moment-jalaali';

interface HijriDatePickerProps {
  value: string; // ISO date string (yyyy-MM-dd)
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  className?: string;
  id?: string;
}

export default function HijriDatePicker({
  value,
  onChange,
  min,
  max,
  className = '',
  id,
}: HijriDatePickerProps) {
  const [hijriDate, setHijriDate] = useState({ year: '', month: '', day: '' });
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPicker]);

  // Convert Gregorian to Hijri
  useEffect(() => {
    if (value) {
      const m = moment(value, 'YYYY-MM-DD');
      setHijriDate({
        year: m.format('jYYYY'),
        month: m.format('jMM'),
        day: m.format('jDD'),
      });
    } else {
      const today = moment();
      setHijriDate({
        year: today.format('jYYYY'),
        month: today.format('jMM'),
        day: today.format('jDD'),
      });
    }
  }, [value]);

  // Convert Hijri to Gregorian
  function handleHijriChange(year: string, month: string, day: string) {
    if (year && month && day) {
      try {
        const hijriMoment = moment(`${year}/${month}/${day}`, 'jYYYY/jMM/jDD');
        if (hijriMoment.isValid()) {
          const gregorianDate = hijriMoment.format('YYYY-MM-DD');
          onChange(gregorianDate);
        }
      } catch (e) {
        // Invalid date
      }
    }
  }

  // Generate month days
  function getMonthDays(year: number, month: number) {
    const m = moment(`${year}/${month}/1`, 'jYYYY/jMM/jDD');
    
    // Calculate days in month by finding the last valid day
    let daysInMonth = 29; // Minimum days in a Jalali month
    for (let day = 30; day <= 31; day++) {
      const testDate = moment(`${year}/${month}/${day}`, 'jYYYY/jMM/jDD');
      if (testDate.isValid() && parseInt(testDate.format('jMM')) === month) {
        daysInMonth = day;
      } else {
        break;
      }
    }
    
    const firstDay = m.day(); // 0 = Saturday, 6 = Friday
    const days: (number | null)[] = [];

    // Add empty cells for days before month start
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }

  const yearNum = parseInt(hijriDate.year) || moment().jYear();
  const monthNum = parseInt(hijriDate.month) || moment().jMonth() + 1;
  const dayNum = parseInt(hijriDate.day) || moment().jDate();

  const monthDays = getMonthDays(yearNum, monthNum);
  const monthNames = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
  ];

  const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  return (
    <div className="relative" ref={pickerRef}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker(!showPicker);
        }}
        className={`cursor-pointer p-2 border rounded ${className}`}
      >
        <input
          type="text"
          id={id}
          readOnly
          value={
            hijriDate.year && hijriDate.month && hijriDate.day
              ? `${hijriDate.year}/${hijriDate.month}/${hijriDate.day}`
              : ''
          }
          placeholder="انتخاب تاریخ شمسی"
          className="w-full cursor-pointer"
        />
      </div>

      {showPicker && (
        <div 
          className="absolute z-50 bg-white border rounded-lg shadow-lg p-4 mt-1 w-80"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => {
                const newMonth = monthNum === 1 ? 12 : monthNum - 1;
                const newYear = monthNum === 1 ? yearNum - 1 : yearNum;
                handleHijriChange(newYear.toString(), newMonth.toString(), '1');
              }}
              className="px-2 py-1 border rounded"
            >
              ‹
            </button>
            <div className="font-bold">
              {monthNames[monthNum - 1]} {yearNum}
            </div>
            <button
              onClick={() => {
                const newMonth = monthNum === 12 ? 1 : monthNum + 1;
                const newYear = monthNum === 12 ? yearNum + 1 : yearNum;
                handleHijriChange(newYear.toString(), newMonth.toString(), '1');
              }}
              className="px-2 py-1 border rounded"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-bold p-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, idx) => {
              if (day === null) {
                return <div key={idx} className="p-2"></div>;
              }

              const isSelected = day === dayNum;
              const fullDate = moment(
                `${yearNum}/${monthNum}/${day}`,
                'jYYYY/jMM/jDD'
              );
              const gregorianDate = fullDate.format('YYYY-MM-DD');

              // Check min/max constraints
              let isDisabled = false;
              if (min && gregorianDate < min) isDisabled = true;
              if (max && gregorianDate > max) isDisabled = true;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isDisabled) {
                      handleHijriChange(
                        yearNum.toString(),
                        monthNum.toString(),
                        day.toString()
                      );
                      setShowPicker(false);
                    }
                  }}
                  disabled={isDisabled}
                  className={`p-2 rounded text-sm ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isDisabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              type="number"
              value={hijriDate.year}
              onChange={(e) => {
                const newYear = e.target.value;
                setHijriDate({ ...hijriDate, year: newYear });
                if (newYear && hijriDate.month && hijriDate.day) {
                  handleHijriChange(newYear, hijriDate.month, hijriDate.day);
                }
              }}
              placeholder="سال"
              className="flex-1 p-2 border rounded"
              min="1300"
              max="1500"
            />
            <select
              value={hijriDate.month}
              onChange={(e) => {
                const newMonth = e.target.value;
                setHijriDate({ ...hijriDate, month: newMonth });
                if (hijriDate.year && newMonth && hijriDate.day) {
                  handleHijriChange(hijriDate.year, newMonth, hijriDate.day);
                }
              }}
              className="flex-1 p-2 border rounded"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={hijriDate.day}
              onChange={(e) => {
                const newDay = e.target.value;
                setHijriDate({ ...hijriDate, day: newDay });
                if (hijriDate.year && hijriDate.month && newDay) {
                  handleHijriChange(hijriDate.year, hijriDate.month, newDay);
                }
              }}
              placeholder="روز"
              className="w-20 p-2 border rounded"
              min="1"
              max="31"
            />
          </div>

          <button
            onClick={() => setShowPicker(false)}
            className="mt-4 w-full px-4 py-2 bg-gray-200 rounded"
          >
            بستن
          </button>
        </div>
      )}
    </div>
  );
}

