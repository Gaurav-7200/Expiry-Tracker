import React from 'react';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  ShoppingCart,
  ScanBarcode,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const Dashboard = ({
  stats,
  settings,
  loading,
  onNavigate,
}) => {
  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-28 bg-[#E8E3DA]/80 rounded-2xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-32 bg-[#E8E3DA]/60 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-[#E8E3DA]/60 rounded-xl lg:col-span-2" />
          <div className="h-80 bg-[#E8E3DA]/60 rounded-xl" />
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...stats.salesLast7Days.map((d) => d.revenue), 100);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-[#26364A] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#344860]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-heading text-white">
            {settings.storeName}
          </h1>
          <p className="text-[#DCE8DF]/90 text-sm mt-1 max-w-xl">
            Real-time batch-wise grocery inventory control, USB barcode scanner receiving, automated FEFO POS billing, and proactive expiry protection.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="px-4 py-2.5 bg-[#C76B45] hover:bg-[#B55D37] active:bg-[#B55D37] text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-white" />
            Open POS Register
          </button>
          <button
            type="button"
            onClick={() => onNavigate('intake')}
            className="px-4 py-2.5 bg-[#344860] hover:bg-[#1C2939] text-[#DCE8DF] hover:text-white border border-[#737B83]/40 font-medium text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
          >
            <ScanBarcode className="w-4 h-4 text-[#C76B45]" />
            Stock Intake
          </button>
        </div>
      </div>

      {/* Critical Expiry Alert Banner (If items expired or expiring <= 7 days) */}
      {(stats.expiredBatchesCount > 0 || stats.expiringWithin7Count > 0) && (
        <div className="bg-[#FFF8F0] border border-[#D99A38]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#D99A38]/20 rounded-lg text-[#D99A38] shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-[#D99A38]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#26364A] font-heading">
                Action Required: Expiry Attention Needed
              </h3>
              <p className="text-xs text-[#737B83] mt-0.5">
                {stats.expiredBatchesCount > 0 && (
                  <span className="font-semibold text-[#C75A54]">
                    {stats.expiredBatchesCount} batch(es) already expired!{' '}
                  </span>
                )}
                {stats.expiringWithin7Count > 0 && (
                  <span>
                    {stats.expiringWithin7Count} batch(es) expiring within the next 7 days.
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('expiry')}
            className="px-3.5 py-1.5 bg-[#C76B45] hover:bg-[#B55D37] text-white text-xs font-semibold rounded-lg transition self-start sm:self-center shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            Review Alerts <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Available Stock */}
        <div className="bg-white rounded-xl p-5 border border-[#E8E3DA] shadow-xs hover:border-[#C76B45]/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#737B83] uppercase tracking-wider font-heading">
              Total Active Stock
            </span>
            <div className="p-2 bg-[#DCE8DF] rounded-lg text-[#26364A]">
              <Layers className="w-5 h-5 text-[#26364A]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#26364A]">
              {stats.availableStock} <span className="text-xs font-normal text-[#737B83]">units</span>
            </div>
            <p className="text-xs text-[#737B83] mt-1 flex items-center gap-1">
              <span>Across {stats.totalProducts} catalog products</span>
            </p>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="bg-white rounded-xl p-5 border border-[#E8E3DA] shadow-xs hover:border-[#C76B45]/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#737B83] uppercase tracking-wider font-heading">
              Today's Sales
            </span>
            <div className="p-2 bg-[#DCE8DF] rounded-lg text-[#39845D]">
              <TrendingUp className="w-5 h-5 text-[#39845D]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#26364A]">
              {settings.currency}
              {stats.todayRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-[#39845D] font-medium mt-1 flex items-center gap-1">
              <span>{stats.todaySalesCount} completed orders today</span>
            </p>
          </div>
        </div>

        {/* Low-Stock Alert */}
        <div
          onClick={() => onNavigate('products')}
          className="bg-white rounded-xl p-5 border border-[#E8E3DA] shadow-xs hover:border-[#D99A38] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#737B83] uppercase tracking-wider font-heading">
              Low-Stock Items
            </span>
            <div className="p-2 bg-[#D99A38]/15 rounded-lg text-[#D99A38] group-hover:bg-[#D99A38]/25 transition">
              <AlertCircle className="w-5 h-5 text-[#D99A38]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#D99A38]">
              {stats.lowStockCount}
            </div>
            <p className="text-xs text-[#737B83] mt-1 flex items-center justify-between">
              <span>At or below reorder level</span>
              <span className="text-[#C76B45] font-medium text-[11px] group-hover:underline">
                View &rarr;
              </span>
            </p>
          </div>
        </div>

        {/* Expired & Expiring Soon Items */}
        <div
          onClick={() => onNavigate('expiry')}
          className="bg-white rounded-xl p-5 border border-[#E8E3DA] shadow-xs hover:border-[#C75A54] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#737B83] uppercase tracking-wider font-heading">
              Expiry Watch
            </span>
            <div className="p-2 bg-[#C75A54]/15 rounded-lg text-[#C75A54] group-hover:bg-[#C75A54]/25 transition">
              <Clock className="w-5 h-5 text-[#C75A54]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#C75A54]">
                {stats.expiredBatchesCount}
              </span>
              <span className="text-xs text-[#C75A54] font-semibold">expired</span>
              <span className="text-[#E8E3DA]">|</span>
              <span className="text-lg font-bold text-[#D99A38]">
                {stats.expiringWithin7Count + stats.expiringWithin30Count}
              </span>
              <span className="text-xs text-[#D99A38]">expiring soon</span>
            </div>
            <p className="text-xs text-[#737B83] mt-1 flex items-center justify-between">
              <span>7 & 30 day risk windows</span>
              <span className="text-[#C76B45] font-medium text-[11px] group-hover:underline">
                Manage &rarr;
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Analytics & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Bar Chart (Last 7 Days) */}
        <div className="bg-white rounded-xl p-6 border border-[#E8E3DA] shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-[#26364A] font-heading">
                  Last 7 Days Revenue Trend
                </h3>
                <p className="text-xs text-[#737B83]">
                  Daily billings and invoice frequency
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-[#737B83]">Total Lifetime:</span>
                <p className="text-sm font-bold text-[#39845D]">
                  {settings.currency}
                  {stats.totalRevenue.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Custom Bar Chart */}
            <div className="pt-6 pb-2">
              <div className="h-44 flex items-end justify-between gap-3 pt-6 border-b border-[#E8E3DA]">
                {stats.salesLast7Days.map((day, idx) => {
                  const heightPercent = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                  const isToday = idx === stats.salesLast7Days.length - 1;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition absolute -top-12 z-20 bg-[#26364A] text-white text-[11px] py-1 px-2.5 rounded-md pointer-events-none whitespace-nowrap shadow-md">
                        <div className="font-bold">
                          {settings.currency}
                          {day.revenue.toFixed(2)}
                        </div>
                        <div className="text-[#DCE8DF] text-[10px]">
                          {day.orders} order(s) • {day.date}
                        </div>
                      </div>

                      {/* Bar */}
                      <div
                        className={`w-full max-w-[42px] rounded-t-md transition-all duration-300 ${
                          isToday
                            ? 'bg-[#C76B45] group-hover:bg-[#B55D37]'
                            : 'bg-[#26364A]/80 group-hover:bg-[#26364A]'
                        }`}
                        style={{
                          height: `${Math.max(8, heightPercent)}%`,
                        }}
                      />

                      {/* Day Label */}
                      <span
                        className={`text-xs mt-2 font-medium ${
                          isToday ? 'text-[#C76B45] font-bold' : 'text-[#737B83]'
                        }`}
                      >
                        {day.dayName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs text-[#737B83] border-t border-[#E8E3DA] mt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#C76B45]" />
              Today's Volume
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#26364A]/80" />
              Previous Days
            </span>
            <button
              type="button"
              onClick={() => onNavigate('sales')}
              className="text-[#C76B45] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Sales History &rarr;
            </button>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl p-6 border border-[#E8E3DA] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-[#26364A] font-heading">Category Inventory</h3>
                <p className="text-xs text-[#737B83]">Active stock by grocery section</p>
              </div>
              <Package className="w-5 h-5 text-[#C76B45]" />
            </div>

            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
              {stats.categoryBreakdown.map((cat) => {
                const totalStockAll = Math.max(1, stats.availableStock);
                const percent = Math.round((cat.totalStock / totalStockAll) * 100);

                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#26364A] truncate max-w-[160px]">
                        {cat.category}
                      </span>
                      <span className="text-[#737B83] font-mono">
                        {cat.totalStock} units ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#F6F3EC] rounded-full h-2 overflow-hidden border border-[#E8E3DA]">
                      <div
                        className="bg-[#C76B45] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(3, percent))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8E3DA] mt-4">
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="w-full py-2 bg-[#F6F3EC] hover:bg-[#E8E3DA] text-[#26364A] text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Browse Products Catalog <ArrowRight className="w-3.5 h-3.5 text-[#C76B45]" />
            </button>
          </div>
        </div>
      </div>

      {/* Two Detailed Tables: Urgent Expiries & Low-Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Expiry Watch List */}
        <div className="bg-white rounded-xl border border-[#E8E3DA] shadow-xs overflow-hidden">
          <div className="p-4 bg-[#F6F3EC]/80 border-b border-[#E8E3DA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C75A54]" />
              <h3 className="font-bold text-sm text-[#26364A] font-heading">
                Imminent Expiry Batches ({stats.urgentExpiryBatches.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('expiry')}
              className="text-xs font-semibold text-[#C76B45] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Full Tracker <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-[#E8E3DA] max-h-[280px] overflow-y-auto">
            {stats.urgentExpiryBatches.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#737B83]">
                No expired or urgently expiring batches at this moment. Fresh inventory!
              </div>
            ) : (
              stats.urgentExpiryBatches.map((batch) => (
                <div key={batch.id} className="p-3.5 hover:bg-[#F6F3EC]/50 transition flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-[#26364A]">{batch.productName}</div>
                    <div className="text-[11px] text-[#737B83] mt-0.5 font-mono">
                      Batch #{batch.batchNumber} • Expiry: {batch.expiryDate}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-[#26364A]">
                      {batch.quantity} {batch.unit}
                    </div>
                    {batch.daysUntilExpiry < 0 ? (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#C75A54]/15 text-[#C75A54] border border-[#C75A54]/30">
                        EXPIRED ({Math.abs(batch.daysUntilExpiry)}d ago)
                      </span>
                    ) : (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#D99A38]/15 text-[#D99A38] border border-[#D99A38]/30">
                        In {batch.daysUntilExpiry} days
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low-Stock Reorder Notice */}
        <div className="bg-white rounded-xl border border-[#E8E3DA] shadow-xs overflow-hidden">
          <div className="p-4 bg-[#F6F3EC]/80 border-b border-[#E8E3DA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#D99A38]" />
              <h3 className="font-bold text-sm text-[#26364A] font-heading">
                Low-Stock Products ({stats.lowStockProducts.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('intake')}
              className="text-xs font-semibold text-[#C76B45] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Stock Intake <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-[#E8E3DA] max-h-[280px] overflow-y-auto">
            {stats.lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#737B83]">
                All inventory levels are above configured reorder thresholds.
              </div>
            ) : (
              stats.lowStockProducts.map((prod) => (
                <div key={prod.id} className="p-3.5 hover:bg-[#F6F3EC]/50 transition flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-[#26364A]">{prod.name}</div>
                    <div className="text-[11px] text-[#737B83] mt-0.5">
                      {prod.category} • Barcode: {prod.barcode}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-[#D99A38]">
                      {prod.availableStock} / {prod.reorderLevel} {prod.unit}
                    </div>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#D99A38]/15 text-[#D99A38] border border-[#D99A38]/30">
                      Reorder alert
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
