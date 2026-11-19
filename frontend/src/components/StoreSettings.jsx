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
      <div className="bg-white rounded-2xl p-6 border border-[#E8E3DA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCE8DF] text-[#26364A] text-xs font-semibold mb-1 border border-[#DCE8DF]">
            <Settings className="w-3.5 h-3.5 text-[#C76B45]" /> Shop Profile & System Preferences
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-[#26364A] tracking-tight font-heading">
            Store & Receipt Settings
          </h2>
          <p className="text-xs text-[#737B83] mt-0.5">
            Configure grocery branding, printed invoice headers, currency symbols, and reorder thresholds.
          </p>
        </div>

        {/* Audio Toggle */}
        <button
          type="button"
          onClick={handleToggleSound}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-2 cursor-pointer ${
            soundEnabled
              ? 'bg-[#FBF0EB] text-[#C76B45] border-[#C76B45]/30 hover:bg-[#FBF0EB]/80'
              : 'bg-[#F6F3EC] text-[#737B83] border-[#E8E3DA] hover:bg-[#E8E3DA]'
          }`}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-4 h-4 text-[#C76B45]" />
              <span>Scanner Sound: On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-[#737B83]" />
              <span>Scanner Sound: Muted</span>
            </>
          )}
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Profile Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8E3DA] shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-[#26364A] uppercase tracking-wider flex items-center gap-2 font-heading">
            <Store className="w-4 h-4 text-[#C76B45]" />
            Supermarket Branding & Printed Receipt Header
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[#26364A] block mb-1">
                Store / Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45] font-semibold"
              />
            </div>

            <div>
              <label className="font-semibold text-[#26364A] block mb-1">
                Tagline / Subheading
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-[#26364A] block mb-1">
                Physical Store Address *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#26364A] block mb-1">
                Store Contact Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#26364A] block mb-1">
                Billing Support Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#26364A] block mb-1">
                Tax Identification Number (GSTIN / VAT ID)
              </label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => handleChange('gstNumber', e.target.value)}
                className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg font-mono text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#26364A] block mb-1">
                Default Low-Stock Threshold
              </label>
              <input
                type="number"
                min="1"
                value={formData.lowStockThreshold}
                onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
              />
            </div>
          </div>
        </div>

        {/* Financial & Currency Settings */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8E3DA] shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-[#26364A] uppercase tracking-wider flex items-center gap-2 font-heading">
            <DollarSign className="w-4 h-4 text-[#C76B45]" />
            Financial & Tax Settings
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[#26364A] block mb-1">
                Display Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => {
                  const sel = CURRENCIES.find((c) => c.symbol === e.target.value);
                  handleChange('currency', e.target.value);
                  if (sel) handleChange('currencyCode', sel.code);
                }}
                className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45] font-bold"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.symbol}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#26364A] block mb-1">
                Tax Enabled on POS Billing
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="tax-toggle"
                  checked={formData.taxEnabled}
                  onChange={(e) => handleChange('taxEnabled', e.target.checked)}
                  className="w-4 h-4 text-[#C76B45] rounded border-[#E8E3DA] focus:ring-[#C76B45]"
                />
                <label htmlFor="tax-toggle" className="text-xs text-[#26364A] font-medium">
                  Calculate and print tax on checkout
                </label>
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#26364A] block mb-1">
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
                className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45] disabled:opacity-50"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="font-semibold text-[#26364A] block mb-1">
                Printed Receipt Footer Notice
              </label>
              <textarea
                rows={2}
                value={formData.receiptFooter}
                onChange={(e) => handleChange('receiptFooter', e.target.value)}
                className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
              />
            </div>
          </div>
        </div>

        {/* Submit & Save button */}
        <div className="flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#26364A] bg-[#DCE8DF] px-3 py-1.5 rounded-lg border border-[#AEC7B4]">
                <CheckCircle className="w-4 h-4 text-[#39845D]" /> Settings updated successfully!
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#C76B45] hover:bg-[#B55D37] active:bg-[#C76B45] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer font-heading"
          >
            <Save className="w-4 h-4 text-white" />
            {isSaving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Database & Technical Architecture Documentation Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8E3DA] shadow-xs space-y-4 text-xs">
        <h3 className="font-bold text-[#26364A] uppercase tracking-wider flex items-center gap-2 font-heading">
          <Server className="w-4 h-4 text-[#C76B45]" />
          Technical Architecture & External Integrations Guide
        </h3>

        <div className="space-y-3 text-[#737B83] leading-relaxed">
          <div className="p-3.5 bg-[#FAF8F4] rounded-xl border border-[#E8E3DA] space-y-1.5">
            <div className="font-bold text-[#26364A] flex items-center gap-1.5 font-heading">
              <Database className="w-4 h-4 text-[#C76B45]" /> Persistent Storage
            </div>
            <p>
              StockWise currently runs with a robust, persistent JSON file storage engine at{' '}
              <code className="text-[#C76B45] font-mono bg-[#FBF0EB] px-1 py-0.5 rounded border border-[#E8E3DA]">
                data/stockwise-db.json
              </code>{' '}
              with atomic rename writes. It prevents negative stock, maintains separate batch records, and persists across reloads.
            </p>
            <p className="text-[11px] text-[#737B83]">
              To connect external databases (like MongoDB Atlas or Cloud SQL PostgreSQL), set the connection string in your environment variables.
            </p>
          </div>

          <div className="p-3.5 bg-[#FAF8F4] rounded-xl border border-[#E8E3DA] space-y-1.5">
            <div className="font-bold text-[#26364A] flex items-center gap-1.5 font-heading">
              <Calendar className="w-4 h-4 text-[#C76B45]" /> Standalone Expiry Calendar
            </div>
            <p>
              The built-in interactive monthly expiry calendar runs standalone without requiring external Google Calendar API keys or OAuth credentials. All batch dates are computed locally from real dates in the database.
            </p>
          </div>
        </div>

        {/* Feedback messages */}
        {errorMessage && (
          <div className="p-3 bg-[#C75A54]/10 border border-[#C75A54]/25 rounded-xl text-[#C75A54] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#C75A54] shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {resetSuccess && (
          <div className="p-3 bg-[#DCE8DF] border border-[#AEC7B4] rounded-xl text-[#26364A] text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#39845D] shrink-0" />
            <span>Sample grocery inventory data restored successfully!</span>
          </div>
        )}

        {/* Demo Data Reset Section */}
        <div className="pt-4 border-t border-[#E8E3DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-[#26364A] font-heading">Restore Sample Grocery Catalog</h4>
            <p className="text-[#737B83] text-[11px]">
              Re-seed 12 realistic grocery products with varied batches (expired, expiring in 3-5 days, 20 days, and fresh).
            </p>
          </div>

          <button
            type="button"
            disabled={isResetting}
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 bg-[#F6F3EC] hover:bg-[#E8E3DA] text-[#26364A] rounded-xl font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 border border-[#E8E3DA]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#737B83]" />
            {isResetting ? 'Restoring Demo Data...' : 'Reset Demo Grocery Data'}
          </button>
        </div>
      </div>

      {/* In-App Confirmation Modal for Reset (No window.confirm) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-[#26364A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#E8E3DA] shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-3 text-[#D99A38]">
              <div className="p-2.5 bg-amber-50 rounded-full border border-amber-200">
                <RotateCcw className="w-5 h-5 text-[#D99A38]" />
              </div>
              <h3 className="font-bold text-base text-[#26364A] font-heading">Confirm Reset Demo Data</h3>
            </div>
            <p className="text-[#737B83] leading-relaxed">
              Are you sure you want to restore demo grocery inventory? This will re-seed sample products, batches (some expired, some expiring soon, some fresh), and recent sales.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-[#F6F3EC] hover:bg-[#E8E3DA] text-[#26364A] rounded-lg font-semibold transition cursor-pointer border border-[#E8E3DA]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={executeReset}
                className="px-4 py-2 bg-[#D99A38] hover:bg-amber-600 text-white rounded-lg font-semibold transition cursor-pointer"
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
