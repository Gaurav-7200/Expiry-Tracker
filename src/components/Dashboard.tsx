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
import type { DashboardStats, StoreSettings } from '../types';

interface DashboardProps {
  stats: DashboardStats | null;
  settings: StoreSettings;
  loading: boolean;
  onNavigate: (tab: string) => void;
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  settings,
  loading,
  onNavigate,
}) => {
  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-28 bg-stone-200/80 rounded-2xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-32 bg-stone-200/60 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-stone-200/60 rounded-xl lg:col-span-2" />
          <div className="h-80 bg-stone-200/60 rounded-xl" />
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...stats.salesLast7Days.map((d) => d.revenue), 100);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-linear-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600/60 text-emerald-100 text-xs font-medium mb-2 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" /> Live Grocery Operations Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {settings.storeName}
          </h1>
          <p className="text-emerald-100/90 text-sm mt-1 max-w-xl">
            Real-time batch-wise grocery inventory control, USB barcode scanner receiving, automated FEFO POS billing, and proactive expiry protection.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100 font-bold text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-700" />
            Open POS Register
          </button>
          <button
            type="button"
            onClick={() => onNavigate('receiving')}
            className="px-4 py-2.5 bg-emerald-900/60 hover:bg-emerald-900 text-white border border-emerald-500/40 font-medium text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
          >
            <ScanBarcode className="w-4 h-4 text-emerald-300" />
            Receive Stock
          </button>
        </div>
      </div>

      {/* Critical Expiry Alert Banner (If items expired or expiring <= 7 days) */}
      {(stats.expiredBatchesCount > 0 || stats.expiringWithin7Count > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-950">
                Action Required: Expiry Attention Needed
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                {stats.expiredBatchesCount > 0 && (
                  <span className="font-semibold text-rose-700">
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
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold rounded-lg transition self-start sm:self-center shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            Review Alerts <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Available Stock */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Total Active Stock
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-stone-900">
              {stats.availableStock} <span className="text-xs font-normal text-stone-500">units</span>
            </div>
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
              <span>Across {stats.totalProducts} catalog products</span>
            </p>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Today's Sales
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-stone-900">
              {settings.currency}
              {stats.todayRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <span>{stats.todaySalesCount} completed orders today</span>
            </p>
          </div>
        </div>

        {/* Low-Stock Alert */}
        <div
          onClick={() => onNavigate('products')}
          className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs hover:border-amber-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Low-Stock Items
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-700 group-hover:bg-amber-100 transition">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-900">
              {stats.lowStockCount}
            </div>
            <p className="text-xs text-stone-500 mt-1 flex items-center justify-between">
              <span>At or below reorder level</span>
              <span className="text-amber-700 font-medium text-[11px] group-hover:underline">
                View &rarr;
              </span>
            </p>
          </div>
        </div>

        {/* Expired & Expiring Soon Items */}
        <div
          onClick={() => onNavigate('expiry')}
          className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs hover:border-rose-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Expiry Watch
            </span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-700 group-hover:bg-rose-100 transition">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-rose-700">
                {stats.expiredBatchesCount}
              </span>
              <span className="text-xs text-rose-600 font-semibold">expired</span>
              <span className="text-stone-300">|</span>
              <span className="text-lg font-bold text-amber-700">
                {stats.expiringWithin7Count + stats.expiringWithin30Count}
              </span>
              <span className="text-xs text-amber-700">expiring soon</span>
            </div>
            <p className="text-xs text-stone-500 mt-1 flex items-center justify-between">
              <span>7 & 30 day risk windows</span>
              <span className="text-rose-700 font-medium text-[11px] group-hover:underline">
                Manage &rarr;
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Analytics & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Bar Chart (Last 7 Days) */}
        <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-stone-900">
                  Last 7 Days Revenue Trend
                </h3>
                <p className="text-xs text-stone-500">
                  Daily billings and invoice frequency
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-stone-500">Total Lifetime:</span>
                <p className="text-sm font-bold text-emerald-800">
                  {settings.currency}
                  {stats.totalRevenue.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Custom Bar Chart */}
            <div className="pt-6 pb-2">
              <div className="h-44 flex items-end justify-between gap-3 pt-6 border-b border-stone-200">
                {stats.salesLast7Days.map((day, idx) => {
                  const heightPercent = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                  const isToday = idx === stats.salesLast7Days.length - 1;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition absolute -top-12 z-20 bg-stone-900 text-white text-[11px] py-1 px-2.5 rounded-md pointer-events-none whitespace-nowrap shadow-md">
                        <div className="font-bold">
                          {settings.currency}
                          {day.revenue.toFixed(2)}
                        </div>
                        <div className="text-stone-300 text-[10px]">
                          {day.orders} order(s) • {day.date}
                        </div>
                      </div>

                      {/* Bar */}
                      <div
                        className={`w-full max-w-[42px] rounded-t-md transition-all duration-300 ${
                          isToday
                            ? 'bg-emerald-700 group-hover:bg-emerald-800'
                            : 'bg-emerald-500/70 group-hover:bg-emerald-600'
                        }`}
                        style={{
                          height: `${Math.max(8, heightPercent)}%`,
                        }}
                      />

                      {/* Day Label */}
                      <span
                        className={`text-xs mt-2 font-medium ${
                          isToday ? 'text-emerald-800 font-bold' : 'text-stone-500'
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

          <div className="pt-4 flex items-center justify-between text-xs text-stone-500 border-t border-stone-100 mt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-700" />
              Today's Volume
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/70" />
              Previous Days
            </span>
            <button
              type="button"
              onClick={() => onNavigate('sales')}
              className="text-emerald-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Sales History &rarr;
            </button>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-stone-900">Category Inventory</h3>
                <p className="text-xs text-stone-500">Active stock by grocery section</p>
              </div>
              <Package className="w-5 h-5 text-emerald-700" />
            </div>

            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
              {stats.categoryBreakdown.map((cat) => {
                const totalStockAll = Math.max(1, stats.availableStock);
                const percent = Math.round((cat.totalStock / totalStockAll) * 100);

                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-stone-800 truncate max-w-[160px]">
                        {cat.category}
                      </span>
                      <span className="text-stone-500 font-mono">
                        {cat.totalStock} units ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(3, percent))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 mt-4">
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="w-full py-2 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Browse Products Catalog <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Two Detailed Tables: Urgent Expiries & Low-Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Expiry Watch List */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-stone-50/70 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-sm text-stone-900">
                Imminent Expiry Batches ({stats.urgentExpiryBatches.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('expiry')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              Full Tracker <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-stone-100 max-h-[280px] overflow-y-auto">
            {stats.urgentExpiryBatches.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500">
                No expired or urgently expiring batches at this moment. Fresh inventory!
              </div>
            ) : (
              stats.urgentExpiryBatches.map((batch) => (
                <div key={batch.id} className="p-3.5 hover:bg-stone-50 transition flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-stone-900">{batch.productName}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5 font-mono">
                      Batch #{batch.batchNumber} • Expiry: {batch.expiryDate}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-stone-800">
                      {batch.quantity} {batch.unit}
                    </div>
                    {batch.daysUntilExpiry < 0 ? (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        EXPIRED ({Math.abs(batch.daysUntilExpiry)}d ago)
                      </span>
                    ) : (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
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
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-stone-50/70 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-stone-900">
                Low-Stock Products ({stats.lowStockProducts.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('receiving')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              Receive Stock <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-stone-100 max-h-[280px] overflow-y-auto">
            {stats.lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500">
                All inventory levels are above configured reorder thresholds.
              </div>
            ) : (
              stats.lowStockProducts.map((prod) => (
                <div key={prod.id} className="p-3.5 hover:bg-stone-50 transition flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-stone-900">{prod.name}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      {prod.category} • Barcode: {prod.barcode}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-amber-700">
                      {prod.availableStock} / {prod.reorderLevel} {prod.unit}
                    </div>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
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
