import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  CheckCircle,
  TrendingDown,
  Trash2,
  Tag,
  DollarSign,
  Printer,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/audio';

export const ExpiryTracker = ({
  batches,
  settings,
  onBatchesUpdated,
  onNavigateToCalendar,
}) => {
  const [activeTab, setActiveTab] = useState('expired');

  const [disposeCandidate, setDisposeCandidate] = useState(null);
  const [isDisposing, setIsDisposing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filter batches with remaining stock
  const activeBatches = batches.filter((b) => b.quantity > 0 && b.status !== 'disposed');

  const expiredBatches = activeBatches.filter(
    (b) => b.daysUntilExpiry < 0 || b.status === 'expired'
  );
  const urgent7Batches = activeBatches.filter(
    (b) => b.daysUntilExpiry >= 0 && b.daysUntilExpiry <= 7
  );
  const warning30Batches = activeBatches.filter(
    (b) => b.daysUntilExpiry > 7 && b.daysUntilExpiry <= 30
  );

  // Compute financial values
  const expiredLossValue = expiredBatches.reduce(
    (sum, b) => sum + b.quantity * b.purchasePrice,
    0
  );
  const urgent7AtRiskValue = urgent7Batches.reduce(
    (sum, b) => sum + b.quantity * b.purchasePrice,
    0
  );
  const warning30AtRiskValue = warning30Batches.reduce(
    (sum, b) => sum + b.quantity * b.purchasePrice,
    0
  );

  let displayedBatches = activeBatches;
  if (activeTab === 'expired') displayedBatches = expiredBatches;
  if (activeTab === 'urgent_7') displayedBatches = urgent7Batches;
  if (activeTab === 'warning_30') displayedBatches = warning30Batches;

  // Dispose expired batch
  const executeDispose = async () => {
    if (!disposeCandidate) return;

    setIsDisposing(true);
    setErrorMessage(null);
    try {
      await api.updateBatch(disposeCandidate.id, {
        quantity: 0,
        status: 'disposed',
      });
      sounds.playSuccessChime();
      setDisposeCandidate(null);
      onBatchesUpdated();
    } catch (err) {
      sounds.playErrorBuzz();
      setErrorMessage(err.message || 'Failed to dispose batch');
    } finally {
      setIsDisposing(false);
    }
  };

  const handlePrintAudit = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-xs font-semibold mb-1 border border-rose-200">
            <Clock className="w-3.5 h-3.5" /> Expiry Guard & Prevention System
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-stone-900 tracking-tight">
            Freshness & Expiry Protection
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Identify spoiled items for scrap disposal and prioritize clearance discounts for inventory approaching expiry date.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToCalendar}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-emerald-700" />
            Open Expiry Calendar
          </button>
          <button
            type="button"
            onClick={handlePrintAudit}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Expiry Report
          </button>
        </div>
      </div>

      {/* Financial Risk & Count KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Expired Items Loss */}
        <div
          onClick={() => setActiveTab('expired')}
          className={`p-5 rounded-xl border transition cursor-pointer ${
            activeTab === 'expired'
              ? 'bg-rose-50/70 border-rose-400 shadow-sm ring-1 ring-rose-400'
              : 'bg-white border-stone-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Expired (Immediate Disposal)
            </span>
            <AlertOctagon className="w-5 h-5 text-rose-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-rose-800">
              {expiredBatches.length}{' '}
              <span className="text-xs font-normal text-rose-600">
                batch{expiredBatches.length === 1 ? '' : 'es'}
              </span>
            </div>
            <p className="text-xs text-rose-700 font-medium mt-1">
              Estimated write-off loss: {settings.currency}
              {expiredLossValue.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Expiring in 7 Days */}
        <div
          onClick={() => setActiveTab('urgent_7')}
          className={`p-5 rounded-xl border transition cursor-pointer ${
            activeTab === 'urgent_7'
              ? 'bg-amber-50/70 border-amber-400 shadow-sm ring-1 ring-amber-400'
              : 'bg-white border-stone-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Expiring in ≤ 7 Days
            </span>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-900">
              {urgent7Batches.length}{' '}
              <span className="text-xs font-normal text-amber-700">
                batch{urgent7Batches.length === 1 ? '' : 'es'}
              </span>
            </div>
            <p className="text-xs text-amber-700 font-medium mt-1">
              Stock at risk: {settings.currency}
              {urgent7AtRiskValue.toFixed(2)} (Prompt discount)
            </p>
          </div>
        </div>

        {/* Expiring in 30 Days */}
        <div
          onClick={() => setActiveTab('warning_30')}
          className={`p-5 rounded-xl border transition cursor-pointer ${
            activeTab === 'warning_30'
              ? 'bg-yellow-50/70 border-yellow-400 shadow-sm ring-1 ring-yellow-400'
              : 'bg-white border-stone-200 hover:border-yellow-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-yellow-800 uppercase tracking-wider">
              Expiring in ≤ 30 Days
            </span>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-stone-900">
              {warning30Batches.length}{' '}
              <span className="text-xs font-normal text-stone-600">
                batch{warning30Batches.length === 1 ? '' : 'es'}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-1">
              Stock value: {settings.currency}
              {warning30AtRiskValue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Filter Pills */}
      <div className="flex gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('expired')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'expired'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <span>Already Expired ({expiredBatches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('urgent_7')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'urgent_7'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <span>Expiring in 7 Days ({urgent7Batches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('warning_30')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'warning_30'
              ? 'bg-yellow-600 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <span>Expiring in 30 Days ({warning30Batches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-stone-800 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <span>All Active Batches ({activeBatches.length})</span>
        </button>
      </div>

      {/* Expiry Items List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-stone-900">
            {activeTab === 'expired' && 'Expired Batches (Remove from Shelves)'}
            {activeTab === 'urgent_7' && 'High Urgency Batches (Clearance Sale Needed)'}
            {activeTab === 'warning_30' && 'Watchlist Batches (Approaching 30-Day Window)'}
            {activeTab === 'all' && 'All Batches Chronologically by Expiry Date'}
          </h3>
          <span className="text-xs text-stone-500 font-mono">
            {displayedBatches.length} record(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Product Name & Category</th>
                <th className="py-3 px-4">Barcode / Batch #</th>
                <th className="py-3 px-4">Remaining Quantity</th>
                <th className="py-3 px-4">Purchase Cost & Total Value</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Urgency Status</th>
                <th className="py-3 px-4 text-right">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {displayedBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-stone-700">No batches in this category!</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Your inventory in this category is clear.
                    </p>
                  </td>
                </tr>
              ) : (
                displayedBatches.map((batch) => {
                  const totalBatchCost = batch.quantity * batch.purchasePrice;

                  return (
                    <tr key={batch.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{batch.productName}</div>
                        <span className="text-[11px] text-stone-500">{batch.category}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="font-bold text-stone-800">{batch.batchNumber}</div>
                        <div className="text-stone-400">{batch.barcode}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-stone-900">
                          {batch.quantity} {batch.unit}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Total received: {batch.initialQuantity}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">
                          {settings.currency}
                          {totalBatchCost.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          @{settings.currency}
                          {batch.purchasePrice}/{batch.unit}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        {batch.expiryDate}
                      </td>

                      <td className="py-3.5 px-4">
                        {batch.daysUntilExpiry < 0 || batch.status === 'expired' ? (
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            EXPIRED ({Math.abs(batch.daysUntilExpiry)} days ago)
                          </span>
                        ) : batch.daysUntilExpiry <= 7 ? (
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            Expiring in {batch.daysUntilExpiry} days!
                          </span>
                        ) : batch.daysUntilExpiry <= 30 ? (
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                            Expiring in {batch.daysUntilExpiry} days
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Fresh ({batch.daysUntilExpiry} days)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {batch.daysUntilExpiry < 0 || batch.status === 'expired' ? (
                          <button
                            type="button"
                            onClick={() => setDisposeCandidate(batch)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Dispose / Write Off
                          </button>
                        ) : batch.daysUntilExpiry <= 7 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                            <Tag className="w-3 h-3 text-amber-700" />
                            Recommend 40% Off
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-500 font-medium">
                            Normal FIFO shelf rotation
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-App Confirmation Modal for Disposal (No window.confirm) */}
      {disposeCandidate && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-stone-200 shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-full">
                <Trash2 className="w-5 h-5 text-rose-700" />
              </div>
              <h3 className="font-bold text-base text-stone-900">Confirm Disposal</h3>
            </div>
            <p className="text-stone-600 leading-relaxed">
              Are you sure you want to dispose expired batch <span className="font-mono font-bold">{disposeCandidate.batchNumber}</span> of <span className="font-bold">"{disposeCandidate.productName}"</span>?
              Remaining quantity of <span className="font-bold">{disposeCandidate.quantity} {disposeCandidate.unit}</span> will be written off.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDisposeCandidate(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDisposing}
                onClick={executeDispose}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition cursor-pointer"
              >
                {isDisposing ? 'Disposing...' : 'Yes, Dispose Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
