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
      <div className="bg-white rounded-2xl p-6 border border-[#E8E3DA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C75A54]/15 text-[#C75A54] text-xs font-semibold mb-1 border border-[#C75A54]/30">
            <Clock className="w-3.5 h-3.5 text-[#C75A54]" /> Expiry Guard & Prevention System
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-[#26364A] tracking-tight font-heading">
            Freshness & Expiry Protection
          </h2>
          <p className="text-xs text-[#737B83] mt-0.5">
            Identify spoiled items for scrap disposal and prioritize clearance discounts for inventory approaching expiry date.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToCalendar}
            className="px-4 py-2 bg-[#F6F3EC] hover:bg-[#E8E3DA] text-[#26364A] font-semibold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer border border-[#E8E3DA]"
          >
            <Calendar className="w-4 h-4 text-[#C76B45]" />
            Open Expiry Calendar
          </button>
          <button
            type="button"
            onClick={handlePrintAudit}
            className="px-4 py-2 bg-[#26364A] hover:bg-[#1C2939] text-white font-semibold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-[#DCE8DF]" />
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
              ? 'bg-[#C75A54]/10 border-[#C75A54] shadow-xs ring-1 ring-[#C75A54]'
              : 'bg-white border-[#E8E3DA] hover:border-[#C75A54]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#C75A54] uppercase tracking-wider font-heading">
              Expired (Immediate Disposal)
            </span>
            <AlertOctagon className="w-5 h-5 text-[#C75A54]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#C75A54]">
              {expiredBatches.length}{' '}
              <span className="text-xs font-normal text-[#C75A54]/80">
                batch{expiredBatches.length === 1 ? '' : 'es'}
              </span>
            </div>
            <p className="text-xs text-[#C75A54] font-medium mt-1">
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
              ? 'bg-amber-50/70 border-[#D99A38] shadow-xs ring-1 ring-[#D99A38]'
              : 'bg-white border-[#E8E3DA] hover:border-[#D99A38]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#D99A38] uppercase tracking-wider font-heading">
              Expiring in ≤ 7 Days
            </span>
            <AlertTriangle className="w-5 h-5 text-[#D99A38]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#D99A38]">
              {urgent7Batches.length}{' '}
              <span className="text-xs font-normal text-[#D99A38]/80">
                batch{urgent7Batches.length === 1 ? '' : 'es'}
              </span>
            </div>
            <p className="text-xs text-[#D99A38] font-medium mt-1">
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
              ? 'bg-[#FBF0EB] border-[#C76B45] shadow-xs ring-1 ring-[#C76B45]'
              : 'bg-white border-[#E8E3DA] hover:border-[#C76B45]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#26364A] uppercase tracking-wider font-heading">
              Expiring in ≤ 30 Days
            </span>
            <Clock className="w-5 h-5 text-[#C76B45]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#26364A]">
              {warning30Batches.length}{' '}
              <span className="text-xs font-normal text-[#737B83]">
                batch{warning30Batches.length === 1 ? '' : 'es'}
              </span>
            </div>
            <p className="text-xs text-[#737B83] font-medium mt-1">
              Stock value: {settings.currency}
              {warning30AtRiskValue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Filter Pills */}
      <div className="flex gap-2 border-b border-[#E8E3DA] pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('expired')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 font-heading ${
            activeTab === 'expired'
              ? 'bg-[#C75A54] text-white shadow-xs'
              : 'bg-white text-[#737B83] hover:text-[#26364A] hover:bg-[#F6F3EC] border border-[#E8E3DA]'
          }`}
        >
          <span>Already Expired ({expiredBatches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('urgent_7')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 font-heading ${
            activeTab === 'urgent_7'
              ? 'bg-[#D99A38] text-white shadow-xs'
              : 'bg-white text-[#737B83] hover:text-[#26364A] hover:bg-[#F6F3EC] border border-[#E8E3DA]'
          }`}
        >
          <span>Expiring in 7 Days ({urgent7Batches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('warning_30')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 font-heading ${
            activeTab === 'warning_30'
              ? 'bg-[#C76B45] text-white shadow-xs'
              : 'bg-white text-[#737B83] hover:text-[#26364A] hover:bg-[#F6F3EC] border border-[#E8E3DA]'
          }`}
        >
          <span>Expiring in 30 Days ({warning30Batches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 font-heading ${
            activeTab === 'all'
              ? 'bg-[#26364A] text-white shadow-xs'
              : 'bg-white text-[#737B83] hover:text-[#26364A] hover:bg-[#F6F3EC] border border-[#E8E3DA]'
          }`}
        >
          <span>All Active Batches ({activeBatches.length})</span>
        </button>
      </div>

      {/* Expiry Items List */}
      <div className="bg-white rounded-2xl border border-[#E8E3DA] shadow-xs overflow-hidden">
        <div className="p-4 bg-[#F6F3EC] border-b border-[#E8E3DA] flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#26364A] font-heading">
            {activeTab === 'expired' && 'Expired Batches (Remove from Shelves)'}
            {activeTab === 'urgent_7' && 'High Urgency Batches (Clearance Sale Needed)'}
            {activeTab === 'warning_30' && 'Watchlist Batches (Approaching 30-Day Window)'}
            {activeTab === 'all' && 'All Batches Chronologically by Expiry Date'}
          </h3>
          <span className="text-xs text-[#737B83] font-mono">
            {displayedBatches.length} record(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F3EC] border-b border-[#E8E3DA] text-[#26364A] uppercase text-[11px] font-semibold font-heading">
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
            <tbody className="divide-y divide-[#E8E3DA]/60">
              {displayedBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#737B83]">
                    <CheckCircle className="w-8 h-8 text-[#39845D] mx-auto mb-2" />
                    <p className="font-semibold text-[#26364A] font-heading">No batches in this category!</p>
                    <p className="text-[11px] text-[#737B83] mt-0.5">
                      Your inventory in this category is clear.
                    </p>
                  </td>
                </tr>
              ) : (
                displayedBatches.map((batch) => {
                  const totalBatchCost = batch.quantity * batch.purchasePrice;

                  return (
                    <tr key={batch.id} className="hover:bg-[#F6F3EC]/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#26364A] font-heading">{batch.productName}</div>
                        <span className="text-[11px] text-[#737B83]">{batch.category}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="font-bold text-[#26364A]">{batch.batchNumber}</div>
                        <div className="text-[#737B83]">{batch.barcode}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-[#26364A]">
                          {batch.quantity} {batch.unit}
                        </div>
                        <div className="text-[10px] text-[#737B83]">
                          Total received: {batch.initialQuantity}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#26364A]">
                          {settings.currency}
                          {totalBatchCost.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#737B83]">
                          @{settings.currency}
                          {batch.purchasePrice}/{batch.unit}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#26364A]">
                        {batch.expiryDate}
                      </td>

                      <td className="py-3.5 px-4">
                        {batch.daysUntilExpiry < 0 || batch.status === 'expired' ? (
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-[#C75A54]/15 text-[#C75A54] border border-[#C75A54]/30">
                            EXPIRED ({Math.abs(batch.daysUntilExpiry)} days ago)
                          </span>
                        ) : batch.daysUntilExpiry <= 7 ? (
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-[#D99A38]/15 text-[#D99A38] border border-[#D99A38]/30">
                            Expiring in {batch.daysUntilExpiry} days!
                          </span>
                        ) : batch.daysUntilExpiry <= 30 ? (
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            Expiring in {batch.daysUntilExpiry} days
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-medium bg-[#DCE8DF] text-[#26364A] border border-[#AEC7B4]">
                            Fresh ({batch.daysUntilExpiry} days)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {batch.daysUntilExpiry < 0 || batch.status === 'expired' ? (
                          <button
                            type="button"
                            onClick={() => setDisposeCandidate(batch)}
                            className="px-3 py-1.5 bg-[#C75A54] hover:bg-[#A7443E] text-white rounded-lg font-semibold text-xs transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Dispose / Write Off
                          </button>
                        ) : batch.daysUntilExpiry <= 7 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D99A38] bg-amber-50 px-2 py-1 rounded border border-amber-200">
                            <Tag className="w-3 h-3 text-[#D99A38]" />
                            Recommend 40% Off
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#737B83] font-medium">
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
        <div className="fixed inset-0 z-50 bg-[#26364A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#E8E3DA] shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-3 text-[#C75A54]">
              <div className="p-2.5 bg-[#C75A54]/15 rounded-full">
                <Trash2 className="w-5 h-5 text-[#C75A54]" />
              </div>
              <h3 className="font-bold text-base text-[#26364A] font-heading">Confirm Disposal</h3>
            </div>
            <p className="text-[#737B83] leading-relaxed">
              Are you sure you want to dispose expired batch <span className="font-mono font-bold text-[#26364A]">{disposeCandidate.batchNumber}</span> of <span className="font-bold text-[#26364A]">"{disposeCandidate.productName}"</span>?
              Remaining quantity of <span className="font-bold text-[#26364A]">{disposeCandidate.quantity} {disposeCandidate.unit}</span> will be written off.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDisposeCandidate(null)}
                className="px-4 py-2 bg-[#F6F3EC] hover:bg-[#E8E3DA] text-[#26364A] rounded-lg font-semibold transition cursor-pointer border border-[#E8E3DA]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDisposing}
                onClick={executeDispose}
                className="px-4 py-2 bg-[#C75A54] hover:bg-[#A7443E] text-white rounded-lg font-semibold transition cursor-pointer"
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
