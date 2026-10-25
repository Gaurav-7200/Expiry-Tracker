import React, { useState } from 'react';
import {
  Settings,
  Store,
  DollarSign,
  Receipt,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle,
  Database,
  Calendar,
  AlertTriangle,
  Server,
  Save,
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/audio';

const CURRENCIES = [
  { symbol: '₹', code: 'INR', label: 'Indian Rupee (₹)' },
  { symbol: '$', code: 'USD', label: 'US Dollar ($)' },
  { symbol: '€', code: 'EUR', label: 'Euro (€)' },
  { symbol: '£', code: 'GBP', label: 'British Pound (£)' },
  { symbol: 'A$', code: 'AUD', label: 'Australian Dollar (A$)' },
  { symbol: 'C$', code: 'CAD', label: 'Canadian Dollar (C$)' },
  { symbol: 'AED', code: 'AED', label: 'UAE Dirham (AED)' },
];

export const StoreSettings = ({
  settings,
  onSettingsUpdated,
  onResetData,
}) => {
  const [formData, setFormData] = useState({ ...settings });
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [errorMessage, setErrorMessage] = useState(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    sounds.enabled = next;
    setSoundEnabled(next);
    if (next) sounds.playScanBeep();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const updated = await api.updateSettings(formData);
      sounds.playSuccessChime();
      onSettingsUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      sounds.playErrorBuzz();
      setErrorMessage(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const executeReset = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    try {
      await api.resetData();
      sounds.playSuccessChime();
      setShowResetModal(false);
      onResetData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
    } catch (err) {
      sounds.playErrorBuzz();
      setErrorMessage(err.message || 'Failed to reset sample data');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-1 border border-emerald-200">
            <Settings className="w-3.5 h-3.5" /> Shop Profile & System Preferences
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-stone-900 tracking-tight">
            Store & Receipt Settings
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure grocery branding, printed invoice headers, currency symbols, and reorder thresholds.
          </p>
        </div>

        {/* Audio Toggle */}
        <button
          type="button"
          onClick={handleToggleSound}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-2 cursor-pointer ${
            soundEnabled
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
          }`}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-4 h-4 text-emerald-700" />
              <span>Scanner Sound: On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-stone-400" />
              <span>Scanner Sound: Muted</span>
            </>
          )}
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Profile Card */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-700" />
            Supermarket Branding & Printed Receipt Header
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                Store / Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-semibold"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                Tagline / Subheading
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-stone-700 block mb-1">
                Physical Store Address *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                Store Contact Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                Billing Support Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                Tax Identification Number (GSTIN / VAT ID)
              </label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => handleChange('gstNumber', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                Default Low-Stock Threshold
              </label>
              <input
                type="number"
                min="1"
                value={formData.lowStockThreshold}
                onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Financial & Currency Settings */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-700" />
            Financial & Tax Settings
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                Display Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => {
                  const sel = CURRENCIES.find((c) => c.symbol === e.target.value);
                  handleChange('currency', e.target.value);
                  if (sel) handleChange('currencyCode', sel.code);
                }}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-bold"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.symbol}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                Tax Enabled on POS Billing
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="tax-toggle"
                  checked={formData.taxEnabled}
                  onChange={(e) => handleChange('taxEnabled', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                />
                <label htmlFor="tax-toggle" className="text-xs text-stone-700 font-medium">
                  Calculate and print tax on checkout
                </label>
              </div>
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                max="100"
                disabled={!formData.taxEnabled}
                value={formData.taxRate}
                onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-50"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="font-semibold text-stone-700 block mb-1">
                Printed Receipt Footer Notice
              </label>
              <textarea
                rows={2}
                value={formData.receiptFooter}
                onChange={(e) => handleChange('receiptFooter', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Submit & Save button */}
        <div className="flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Settings updated successfully!
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4 text-emerald-200" />
            {isSaving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Database & Technical Architecture Documentation Card */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4 text-xs">
        <h3 className="font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-700" />
          Technical Architecture & External Integrations Guide
        </h3>

        <div className="space-y-3 text-stone-600 leading-relaxed">
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-700" /> Persistent Storage
            </div>
            <p>
              StockWise currently runs with a robust, persistent JSON file storage engine at{' '}
              <code className="text-emerald-800 font-mono bg-emerald-50 px-1 py-0.5 rounded">
                data/stockwise-db.json
              </code>{' '}
              with atomic rename writes. It prevents negative stock, maintains separate batch records, and persists across reloads.
            </p>
            <p className="text-[11px] text-stone-500">
              To connect external databases (like MongoDB Atlas or Cloud SQL PostgreSQL), set the connection string in your environment variables.
            </p>
          </div>

          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-700" /> Standalone Expiry Calendar
            </div>
            <p>
              The built-in interactive monthly expiry calendar runs standalone without requiring external Google Calendar API keys or OAuth credentials. All batch dates are computed locally from real dates in the database.
            </p>
          </div>
        </div>

        {/* Feedback messages */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {resetSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Sample grocery inventory data restored successfully!</span>
          </div>
        )}

        {/* Demo Data Reset Section */}
        <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-stone-900">Restore Sample Grocery Catalog</h4>
            <p className="text-stone-500 text-[11px]">
              Re-seed 12 realistic grocery products with varied batches (expired, expiring in 3-5 days, 20 days, and fresh).
            </p>
          </div>

          <button
            type="button"
            disabled={isResetting}
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
            {isResetting ? 'Restoring Demo Data...' : 'Reset Demo Grocery Data'}
          </button>
        </div>
      </div>

      {/* In-App Confirmation Modal for Reset (No window.confirm) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-stone-200 shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-100 rounded-full">
                <RotateCcw className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-bold text-base text-stone-900">Confirm Reset Demo Data</h3>
            </div>
            <p className="text-stone-600 leading-relaxed">
              Are you sure you want to restore demo grocery inventory? This will re-seed sample products, batches (some expired, some expiring soon, some fresh), and recent sales.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={executeReset}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition cursor-pointer"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
