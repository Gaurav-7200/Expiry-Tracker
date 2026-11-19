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
      <div className="bg-white rounded-2xl p-6 border border-[#E8E3DA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCE8DF] text-[#26364A] text-xs font-semibold mb-1 border border-[#DCE8DF]">
            <CalendarIcon className="w-3.5 h-3.5 text-[#C76B45]" /> Expiry Schedule Matrix
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-[#26364A] tracking-tight font-heading">
            Monthly Expiry Timeline
          </h2>
          <p className="text-xs text-[#737B83] mt-0.5">
            Visualize expiry dates on a calendar. Click on any date to inspect items and prepare shelf rotations.
          </p>
        </div>

        {/* Month Navigation Toolbar */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1.5 bg-[#F6F3EC] hover:bg-[#E8E3DA] text-[#26364A] font-semibold text-xs rounded-lg transition cursor-pointer border border-[#E8E3DA]"
          >
            Today
          </button>
          <div className="flex items-center bg-[#F6F3EC] rounded-lg p-0.5 border border-[#E8E3DA]">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-white rounded-md text-[#26364A] transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4 text-[#737B83]" />
            </button>
            <span className="px-3 py-1 text-xs font-bold text-[#26364A] min-w-[130px] text-center font-heading">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-white rounded-md text-[#26364A] transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Indicator Note */}
      <div className="p-3 bg-[#FAF8F4] border border-[#E8E3DA] rounded-xl text-xs text-[#737B83] flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#C76B45] shrink-0" />
          <span>
            This calendar operates 100% locally from your persistent batch database with zero external Google Calendar credentials needed.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold shrink-0">
          <span className="flex items-center gap-1 text-[#C75A54]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C75A54]" /> Expired
          </span>
          <span className="flex items-center gap-1 text-[#D99A38]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D99A38]" /> ≤7 Days
          </span>
          <span className="flex items-center gap-1 text-amber-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> ≤30 Days
          </span>
          <span className="flex items-center gap-1 text-[#39845D]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#39845D]" /> Fresh
          </span>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-2xl border border-[#E8E3DA] shadow-xs overflow-hidden">
        {/* Day Header Row */}
        <div className="grid grid-cols-7 border-b border-[#E8E3DA] bg-[#F6F3EC] text-center py-2.5 text-xs font-bold text-[#26364A] uppercase tracking-wider font-heading">
          <div className="text-[#C75A54]">Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div className="text-[#26364A]">Sat</div>
        </div>

        {/* 42 Calendar Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#E8E3DA]/60">
          {calendarCells.map((cell, idx) => {
            const isToday = cell.dateStr === todayStr;
            const hasBatches = cell.batches.length > 0;

            // Determine highest urgency in this cell
            let cellBadgeColor = 'bg-[#DCE8DF] text-[#26364A] border-[#AEC7B4]';
            if (cell.batches.some((b) => b.daysUntilExpiry < 0)) {
              cellBadgeColor = 'bg-[#C75A54]/15 text-[#C75A54] border-[#C75A54]/30';
            } else if (cell.batches.some((b) => b.daysUntilExpiry <= 7)) {
              cellBadgeColor = 'bg-[#D99A38]/15 text-[#D99A38] border-[#D99A38]/30';
            } else if (cell.batches.some((b) => b.daysUntilExpiry <= 30)) {
              cellBadgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
            }

            return (
              <div
                key={idx}
                onClick={() =>
                  hasBatches &&
                  setSelectedDayEvents({ dateStr: cell.dateStr, batches: cell.batches })
                }
                className={`min-h-[105px] p-2 flex flex-col justify-between transition ${
                  cell.isCurrentMonth ? 'bg-white' : 'bg-[#F6F3EC]/40 text-[#737B83]/40'
                } ${
                  hasBatches
                    ? 'hover:bg-[#FBF0EB]/60 cursor-pointer'
                    : 'cursor-default'
                } ${isToday ? 'ring-2 ring-[#C76B45] ring-inset bg-[#FBF0EB]/30' : ''}`}
              >
                {/* Cell Day Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold rounded-md px-1.5 py-0.5 ${
                      isToday
                        ? 'bg-[#C76B45] text-white shadow-xs'
                        : cell.isCurrentMonth
                        ? 'text-[#26364A]'
                        : 'text-[#737B83]/60'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {isToday && (
                    <span className="text-[10px] uppercase font-bold text-[#C76B45] tracking-wider font-heading">
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
                    <div className="text-[9px] text-[#737B83] font-mono pl-1 truncate">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#26364A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E8E3DA] shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#26364A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="w-5 h-5 text-[#DCE8DF]" />
                <div>
                  <h3 className="font-bold text-sm font-heading">
                    Expiries for {selectedDayEvents.dateStr}
                  </h3>
                  <p className="text-xs text-[#DCE8DF]/80">
                    {selectedDayEvents.batches.length} batch(es) registered for this date
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="p-1 rounded text-[#DCE8DF] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[380px] overflow-y-auto text-xs">
              {selectedDayEvents.batches.map((batch) => (
                <div
                  key={batch.id}
                  className="p-3.5 bg-[#FAF8F4] rounded-xl border border-[#E8E3DA] space-y-2 hover:bg-[#F6F3EC] transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-[#26364A] text-sm font-heading">
                        {batch.productName}
                      </h4>
                      <div className="text-[#737B83] font-mono text-[11px] mt-0.5">
                        Batch: {batch.batchNumber} • Barcode: {batch.barcode}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-[#26364A] text-sm">
                        {batch.quantity} {batch.unit}
                      </div>
                      <div className="text-[10px] text-[#737B83]">
                        Received: {batch.initialQuantity}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E8E3DA] text-[11px]">
                    <span className="text-[#737B83]">
                      Cost: {settings.currency}{batch.purchasePrice}/{batch.unit} •{' '}
                      {batch.supplier ? `Supplier: ${batch.supplier}` : 'Stock Inward'}
                    </span>

                    {batch.daysUntilExpiry < 0 ? (
                      <span className="px-2 py-0.5 rounded font-bold bg-[#C75A54]/15 text-[#C75A54] border border-[#C75A54]/30">
                        EXPIRED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-bold bg-[#D99A38]/15 text-[#D99A38] border border-[#D99A38]/30">
                        In {batch.daysUntilExpiry} days
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#F6F3EC] border-t border-[#E8E3DA] flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedDayEvents(null);
                  onNavigateToProducts();
                }}
                className="text-xs font-semibold text-[#C76B45] hover:underline"
              >
                View in Products Catalog &rarr;
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-2 bg-white hover:bg-[#E8E3DA] text-[#26364A] font-semibold rounded-lg text-xs cursor-pointer border border-[#E8E3DA]"
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
