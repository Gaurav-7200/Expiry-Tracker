import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Edit2,
  Trash2,
  X,
  Package,
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/audio';

export const BatchInventory = ({
  batches,
  settings,
  onBatchesUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');

  // Edit batch modal
  const [editingBatch, setEditingBatch] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [isSaving, setIsSaving] = useState(false);
  const [writeOffCandidate, setWriteOffCandidate] = useState(null);
  const [isWritingOff, setIsWritingOff] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const filteredBatches = batches.filter((b) => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !cleanSearch ||
      b.productName.toLowerCase().includes(cleanSearch) ||
      b.barcode.includes(cleanSearch) ||
      b.batchNumber.toLowerCase().includes(cleanSearch);

    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = b.status === statusFilter;
    }

    let matchesExpiry = true;
    if (expiryFilter !== 'all') {
      matchesExpiry = b.expiryAlert === expiryFilter;
    }

    return matchesSearch && matchesStatus && matchesExpiry;
  });

  const openEditModal = (batch) => {
    setEditingBatch(batch);
    setEditQty(batch.quantity.toString());
    setEditExpiry(batch.expiryDate);
    setEditStatus(batch.status);
    setErrorMessage(null);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (!editingBatch) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await api.updateBatch(editingBatch.id, {
        quantity: parseFloat(editQty) || 0,
        expiryDate: editExpiry,
        status: editStatus,
      });

      sounds.playSuccessChime();
      setEditingBatch(null);
      onBatchesUpdated();
    } catch (err) {
      sounds.playErrorBuzz();
      setErrorMessage(err.message || 'Failed to update batch');
    } finally {
      setIsSaving(false);
    }
  };

  const executeWriteOff = async () => {
    if (!writeOffCandidate) return;

    setIsWritingOff(true);
    setErrorMessage(null);
    try {
      await api.updateBatch(writeOffCandidate.id, {
        quantity: 0,
        status: 'disposed',
      });
      sounds.playSuccessChime();
      setWriteOffCandidate(null);
      onBatchesUpdated();
    } catch (err) {
      sounds.playErrorBuzz();
      setErrorMessage(err.message || 'Failed to write off batch');
    } finally {
      setIsWritingOff(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-1 border border-emerald-200">
            <Layers className="w-3.5 h-3.5" /> Granular Lot Traceability
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-stone-900 tracking-tight">
            Batch-Wise Inventory Ledger
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Every delivery batch is tracked individually with its specific expiry date and purchase price for exact FIFO/FEFO accounting.
          </p>
        </div>

        <div className="text-right text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200">
          <span className="text-stone-500">Total Batches:</span>{' '}
          <span className="font-extrabold text-stone-900">{batches.length}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search batch #, product, or barcode..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 transition"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'All Batches' },
              { id: 'active', label: 'Active' },
              { id: 'expired', label: 'Expired' },
              { id: 'depleted', label: 'Depleted' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                  statusFilter === f.id
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Expiry filter */}
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'All Expiries' },
              { id: 'urgent_7', label: '≤ 7 Days' },
              { id: 'warning_30', label: '≤ 30 Days' },
              { id: 'fresh', label: 'Fresh' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setExpiryFilter(f.id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                  expiryFilter === f.id
                    ? 'bg-emerald-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Product Name & Barcode</th>
                <th className="py-3 px-4">Remaining / Initial</th>
                <th className="py-3 px-4">Cost Price</th>
                <th className="py-3 px-4">Purchase Date</th>
                <th className="py-3 px-4">Expiry Date & Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    No batches match the filters.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  return (
                    <tr key={batch.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                        {batch.batchNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{batch.productName}</div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {batch.barcode} • {batch.category}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-stone-900">
                          {batch.quantity} {batch.unit}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Received: {batch.initialQuantity} {batch.unit}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-stone-700">
                        {settings.currency}
                        {batch.purchasePrice} / {batch.unit}
                      </td>

                      <td className="py-3.5 px-4 text-stone-600">
                        {batch.purchaseDate}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{batch.expiryDate}</div>
                        <div>
                          {batch.daysUntilExpiry < 0 || batch.status === 'expired' ? (
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              EXPIRED ({Math.abs(batch.daysUntilExpiry)}d ago)
                            </span>
                          ) : batch.daysUntilExpiry <= 7 ? (
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Expires in {batch.daysUntilExpiry} days
                            </span>
                          ) : batch.daysUntilExpiry <= 30 ? (
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                              Expires in {batch.daysUntilExpiry} days
                            </span>
                          ) : (
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Fresh ({batch.daysUntilExpiry}d left)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(batch)}
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                            title="Adjust quantity or expiry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {batch.quantity > 0 && (
                            <button
                              type="button"
                              onClick={() => setWriteOffCandidate(batch)}
                              className="px-2 py-1 text-[10px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition cursor-pointer"
                              title="Dispose / Scrap remaining units"
                            >
                              Write Off
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Edit Batch Modal */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-stone-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Edit Batch: {editingBatch.batchNumber}</h3>
                <p className="text-xs text-stone-300">{editingBatch.productName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBatch(null)}
                className="p-1 rounded text-stone-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Available Quantity ({editingBatch.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  value={editExpiry}
                  onChange={(e) => setEditExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="active">Active (Available for sale)</option>
                  <option value="depleted">Depleted (0 quantity)</option>
                  <option value="expired">Expired</option>
                  <option value="disposed">Disposed / Written Off</option>
                </select>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Update Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal for Write-Off (No window.confirm) */}
      {writeOffCandidate && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-stone-200 shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-full">
                <Trash2 className="w-5 h-5 text-rose-700" />
              </div>
              <h3 className="font-bold text-base text-stone-900">Confirm Write Off Batch</h3>
            </div>
            <p className="text-stone-600 leading-relaxed">
              Are you sure you want to write off batch <span className="font-mono font-bold">{writeOffCandidate.batchNumber}</span> of <span className="font-bold">"{writeOffCandidate.productName}"</span>?
              Its remaining <span className="font-bold">{writeOffCandidate.quantity} {writeOffCandidate.unit}</span> will be marked as disposed.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setWriteOffCandidate(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isWritingOff}
                onClick={executeWriteOff}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition cursor-pointer"
              >
                {isWritingOff ? 'Writing Off...' : 'Yes, Write Off'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
