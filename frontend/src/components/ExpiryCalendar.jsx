import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  X,
  Layers,
  Info,
  CheckCircle,
  Package,
} from 'lucide-react';

export const ExpiryCalendar = ({
  batches,
  settings,
  onNavigateToProducts,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 for Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  // Map batches by expiryDate string (YYYY-MM-DD)
  const batchesByDate = new Map();
  batches.forEach((b) => {
    if (b.quantity <= 0 || b.status === 'disposed') return;
    const existing = batchesByDate.get(b.expiryDate) || [];
    existing.push(b);
    batchesByDate.set(b.expiryDate, existing);
  });

  // Build grid days (42 cells: 6 weeks x 7 days)
  const calendarCells = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevM = month === 0 ? 11 : month - 1;
    const prevY = month === 0 ? year - 1 : year;
    const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      dayNum,
      dateStr,
      isCurrentMonth: false,
      batches: batchesByDate.get(dateStr) || [],
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      dayNum,
      dateStr,
      isCurrentMonth: true,
      batches: batchesByDate.get(dateStr) || [],
    });
  }

  // Next month leading days to complete grid
  const remainingCells = 42 - calendarCells.length;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const nextM = month === 11 ? 0 : month + 1;
    const nextY = month === 11 ? year + 1 : year;
    const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      dayNum,
      dateStr,
      isCurrentMonth: false,
      batches: batchesByDate.get(dateStr) || [],
    });
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-1 border border-emerald-200">
            <CalendarIcon className="w-3.5 h-3.5" /> Expiry Schedule Matrix
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-stone-900 tracking-tight">
            Monthly Expiry Timeline
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Visualize expiry dates on a calendar. Click on any date to inspect items and prepare shelf rotations.
          </p>
        </div>

        {/* Month Navigation Toolbar */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-lg transition cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-white rounded-md text-stone-700 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-bold text-stone-900 min-w-[130px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-white rounded-md text-stone-700 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Indicator Note */}
      <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            This calendar operates 100% locally from your persistent batch database with zero external Google Calendar credentials needed.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expired
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> ≤7 Days
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> ≤30 Days
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Fresh
          </span>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Day Header Row */}
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center py-2.5 text-xs font-bold text-stone-600 uppercase tracking-wider">
          <div className="text-rose-600">Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div className="text-stone-700">Sat</div>
        </div>

        {/* 42 Calendar Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-stone-100">
          {calendarCells.map((cell, idx) => {
            const isToday = cell.dateStr === todayStr;
            const hasBatches = cell.batches.length > 0;

            // Determine highest urgency in this cell
            let cellBadgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
            if (cell.batches.some((b) => b.daysUntilExpiry < 0)) {
              cellBadgeColor = 'bg-rose-100 text-rose-900 border-rose-300';
            } else if (cell.batches.some((b) => b.daysUntilExpiry <= 7)) {
              cellBadgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
            } else if (cell.batches.some((b) => b.daysUntilExpiry <= 30)) {
              cellBadgeColor = 'bg-yellow-100 text-yellow-900 border-yellow-300';
            }

            return (
              <div
                key={idx}
                onClick={() =>
                  hasBatches &&
                  setSelectedDayEvents({ dateStr: cell.dateStr, batches: cell.batches })
                }
                className={`min-h-[105px] p-2 flex flex-col justify-between transition ${
                  cell.isCurrentMonth ? 'bg-white' : 'bg-stone-50/50 text-stone-300'
                } ${
                  hasBatches
                    ? 'hover:bg-emerald-50/40 cursor-pointer'
                    : 'cursor-default'
                } ${isToday ? 'ring-2 ring-emerald-600 ring-inset bg-emerald-50/20' : ''}`}
              >
                {/* Cell Day Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold rounded-md px-1.5 py-0.5 ${
                      isToday
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : cell.isCurrentMonth
                        ? 'text-stone-800'
                        : 'text-stone-400'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {isToday && (
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                      Today
                    </span>
                  )}
                </div>

                {/* Expiry Event Indicators */}
                <div className="mt-1 space-y-1 flex-1">
                  {hasBatches && (
                    <div
                      className={`p-1 rounded-md text-[10px] font-semibold border flex items-center justify-between gap-1 shadow-2xs ${cellBadgeColor}`}
                    >
                      <span className="truncate">
                        {cell.batches.length === 1
                          ? cell.batches[0].productName
                          : `${cell.batches.length} Products Expire`}
                      </span>
                      <span className="font-bold shrink-0">
                        ({cell.batches.reduce((sum, b) => sum + b.quantity, 0)})
                      </span>
                    </div>
                  )}

                  {cell.batches.length > 1 && (
                    <div className="text-[9px] text-stone-500 font-mono pl-1 truncate">
                      +{cell.batches.length - 1} more lot(s)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Event Drawer / Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-bold text-sm">
                    Expiries for {selectedDayEvents.dateStr}
                  </h3>
                  <p className="text-xs text-emerald-200">
                    {selectedDayEvents.batches.length} batch(es) registered for this date
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="p-1 rounded text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[380px] overflow-y-auto text-xs">
              {selectedDayEvents.batches.map((batch) => (
                <div
                  key={batch.id}
                  className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 hover:bg-stone-100 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm">
                        {batch.productName}
                      </h4>
                      <div className="text-stone-500 font-mono text-[11px] mt-0.5">
                        Batch: {batch.batchNumber} • Barcode: {batch.barcode}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-stone-900 text-sm">
                        {batch.quantity} {batch.unit}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        Received: {batch.initialQuantity}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-[11px]">
                    <span className="text-stone-600">
                      Cost: {settings.currency}{batch.purchasePrice}/{batch.unit} •{' '}
                      {batch.supplier ? `Supplier: ${batch.supplier}` : 'Stock Inward'}
                    </span>

                    {batch.daysUntilExpiry < 0 ? (
                      <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800">
                        EXPIRED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
                        In {batch.daysUntilExpiry} days
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedDayEvents(null);
                  onNavigateToProducts();
                }}
                className="text-xs font-semibold text-emerald-800 hover:underline"
              >
                View in Products Catalog &rarr;
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
