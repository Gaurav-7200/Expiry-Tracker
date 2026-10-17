import React, { useState, useRef, useEffect } from 'react';
import {
  ScanBarcode,
  PackagePlus,
  CheckCircle,
  AlertCircle,
  Search,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  Camera,
} from 'lucide-react';
import type {
  ProductWithStock,
  ProductCategory,
  ProductUnit,
  StoreSettings,
  Batch,
  Product,
} from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';
import { CameraScannerModal } from './CameraScannerModal';

interface StockReceivingProps {
  products: ProductWithStock[];
  settings: StoreSettings;
  initialBarcode?: string;
  onStockUpdated: () => void;
}

const CATEGORIES: ProductCategory[] = [
  'Grains & Flours',
  'Dairy & Eggs',
  'Oils & Ghee',
  'Bakery & Bread',
  'Beverages & Tea',
  'Snacks & Packaged',
  'Pulses & Lentils',
  'Spices & Condiments',
  'Personal & Household',
];

const UNITS: ProductUnit[] = ['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'box'];

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const StockReceiving: React.FC<StockReceivingProps> = ({
  products,
  settings,
  initialBarcode = '',
  onStockUpdated,
}) => {
  const [barcode, setBarcode] = useState(initialBarcode);
  const [lookedUpProduct, setLookedUpProduct] = useState<ProductWithStock | null>(null);
  const [isNewProductMode, setIsNewProductMode] = useState(false);

  // New product fields (only used if barcode is not existing)
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('Grains & Flours');
  const [newUnit, setNewUnit] = useState<ProductUnit>('pcs');
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [newMrp, setNewMrp] = useState('');
  const [newReorderLevel, setNewReorderLevel] = useState('10');
  const [newDescription, setNewDescription] = useState('');

  // Batch fields
  const [batchNumber, setBatchNumber] = useState(
    `B${new Date().toISOString().slice(2, 4)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(getTodayString());
  const [expiryDate, setExpiryDate] = useState(addDaysToDate(180)); // default 6 months
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Recent received records in this session
  const [receivedHistory, setReceivedHistory] = useState<
    Array<{
      productName: string;
      barcode: string;
      batchNumber: string;
      quantity: number;
      unit: string;
      expiryDate: string;
      time: string;
    }>
  >([]);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barcodeInputRef.current?.focus();
    if (initialBarcode) {
      handleLookup(initialBarcode);
    }
  }, [initialBarcode]);

  // Lookup barcode in existing products list
  const handleLookup = (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim();
    if (!cleanCode) {
      setLookedUpProduct(null);
      setIsNewProductMode(false);
      return;
    }

    const found = products.find((p) => p.barcode === cleanCode);
    if (found) {
      setLookedUpProduct(found);
      setIsNewProductMode(false);
      // Pre-fill cost price estimate if previous batches exist
      if (found.batches && found.batches.length > 0) {
        setPurchasePrice(found.batches[found.batches.length - 1].purchasePrice.toString());
      }
      sounds.playScanBeep();
    } else {
      setLookedUpProduct(null);
      setIsNewProductMode(true);
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup(barcode);
    }
  };

  const handleCameraScan = (code: string) => {
    setBarcode(code);
    handleLookup(code);
  };

  const handleQuickExpiry = (days: number) => {
    setExpiryDate(addDaysToDate(days));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBarcode = barcode.trim();

    if (!cleanBarcode) {
      setStatusFeedback({ type: 'error', message: 'Barcode is required.' });
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setStatusFeedback({ type: 'error', message: 'Quantity received must be greater than 0.' });
      return;
    }

    if (!expiryDate) {
      setStatusFeedback({ type: 'error', message: 'Batch expiry date is required.' });
      return;
    }

    if (isNewProductMode && !newName.trim()) {
      setStatusFeedback({
        type: 'error',
        message: 'Product name is required for new barcode registration.',
      });
      return;
    }

    setLoading(true);
    setStatusFeedback(null);

    try {
      const payload: any = {
        barcode: cleanBarcode,
        batchNumber: batchNumber.trim(),
        quantity: qtyNum,
        purchasePrice: parseFloat(purchasePrice) || 0,
        purchaseDate,
        expiryDate,
        supplier: supplier.trim(),
        notes: notes.trim(),
      };

      if (isNewProductMode) {
        payload.productDetails = {
          name: newName.trim(),
          category: newCategory,
          unit: newUnit,
          sellingPrice: parseFloat(newSellingPrice) || 0,
          mrp: parseFloat(newMrp) || parseFloat(newSellingPrice) || 0,
          reorderLevel: parseInt(newReorderLevel) || 10,
          description: newDescription.trim(),
        };
      }

      const res = await api.receiveStock(payload);
      sounds.playSuccessChime();

      setStatusFeedback({
        type: 'success',
        message: `Successfully received ${qtyNum} ${res.product.unit} for "${res.product.name}" under batch ${res.batch.batchNumber}!`,
      });

      // Add to session history
      setReceivedHistory((prev) => [
        {
          productName: res.product.name,
          barcode: res.product.barcode,
          batchNumber: res.batch.batchNumber,
          quantity: res.batch.quantity,
          unit: res.product.unit,
          expiryDate: res.batch.expiryDate,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);

      // Reset form
      setBarcode('');
      setLookedUpProduct(null);
      setIsNewProductMode(false);
      setNewName('');
      setNewSellingPrice('');
      setNewMrp('');
      setQuantity('');
      setPurchasePrice('');
      setSupplier('');
      setNotes('');
      // Generate next batch code
      setBatchNumber(
        `B${new Date().toISOString().slice(2, 4)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`
      );

      onStockUpdated();
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      sounds.playErrorBuzz();
      setStatusFeedback({
        type: 'error',
        message: err.message || 'Failed to receive inward stock.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-1 border border-emerald-200">
            <PackagePlus className="w-3.5 h-3.5" /> Inward Inventory Intake
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-stone-900 tracking-tight">
            Stock Receiving & Batch Inwarding
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Scan barcode with USB scanner or type manually. Never creates duplicate products for existing barcodes!
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
          <Info className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            Separate batches keep expiry dates isolated for FEFO billing.
          </span>
        </div>
      </div>

      {/* Main Receiving Form Card */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Step 1: Barcode Scan / Lookup Input */}
          <div className="space-y-2">
            <label htmlFor="receiving-barcode-input" className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ScanBarcode className="w-4 h-4 text-emerald-700" />
                Step 1: Scan or Enter Product Barcode
              </span>
              <span className="text-[11px] font-normal text-stone-600 font-mono">
                Press Enter or click "Lookup"
              </span>
            </label>

            <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  id="receiving-barcode-input"
                  ref={barcodeInputRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder="Scan barcode with USB scanner (e.g. 8901030383848)..."
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
                />
                <ScanBarcode className="w-5 h-5 text-stone-400 absolute left-3 top-3.5" />
              </div>

              {/* Live Camera Scanner Button - High Visibility */}
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                title="Scan barcode directly using phone camera or computer webcam"
              >
                <Camera className="w-4 h-4 text-emerald-200" />
                <span>📷 Camera Scan</span>
              </button>

              <button
                type="button"
                onClick={() => handleLookup(barcode)}
                className="px-5 py-3 bg-stone-800 hover:bg-stone-900 text-white font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Search className="w-4 h-4" />
                Lookup
              </button>
            </div>
          </div>

          {/* Product Lookup Result Status */}
          {lookedUpProduct && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-100 rounded-lg text-emerald-800 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 uppercase">
                      Existing Product Found
                    </span>
                    <span className="text-xs font-mono text-stone-500">
                      ID: {lookedUpProduct.id}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-stone-900 mt-1">
                    {lookedUpProduct.name}
                  </h4>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Category: <span className="font-semibold">{lookedUpProduct.category}</span> • Selling Price:{' '}
                    <span className="font-semibold">
                      {settings.currency}
                      {lookedUpProduct.sellingPrice}
                    </span>{' '}
                    / {lookedUpProduct.unit}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-emerald-200 text-right self-start md:self-center">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-stone-600 block">
                    Current Active Stock
                  </span>
                  <span className="text-lg font-extrabold text-emerald-800">
                    {lookedUpProduct.availableStock} {lookedUpProduct.unit}
                  </span>
                </div>
                <div className="border-l border-stone-200 pl-3">
                  <span className="text-[10px] uppercase font-semibold text-stone-600 block">
                    Existing Batches
                  </span>
                  <span className="text-lg font-bold text-stone-700">
                    {lookedUpProduct.batchesCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isNewProductMode && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-amber-950">
                    New Product Barcode: "{barcode}"
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    This barcode does not exist in your catalog yet. Fill in product details below to create it alongside its first batch!
                  </p>
                </div>
              </div>

              {/* New Product Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Organic Brown Basmati Rice 5kg"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Unit of Measurement *
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as ProductUnit)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Selling Price ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(e.target.value)}
                    placeholder="120"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    MRP ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newMrp}
                    onChange={(e) => setNewMrp(e.target.value)}
                    placeholder="140"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Reorder Alert Level
                  </label>
                  <input
                    type="number"
                    value={newReorderLevel}
                    onChange={(e) => setNewReorderLevel(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Batch Information */}
          <div className="space-y-4 pt-2 border-t border-stone-200">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-700" />
              Step 2: Enter Batch & Expiry Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Batch Number */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Batch Number / Lot Code *
                </label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BATCH-OCT26-01"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono focus:bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Received Quantity *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-bold focus:bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Purchase Cost Price */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Cost / Purchase Price ({settings.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="e.g. 95"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Purchase Date */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Inward Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Expiry Date */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-700">
                    Expiry Date (Required for Expiry Tracking) *
                  </label>
                  <span className="text-[10px] text-stone-500">
                    Quick shortcuts below:
                  </span>
                </div>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />

                {/* Expiry Shortcut Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: '+7 Days', days: 7 },
                    { label: '+15 Days', days: 15 },
                    { label: '+1 Month', days: 30 },
                    { label: '+3 Months', days: 90 },
                    { label: '+6 Months', days: 180 },
                    { label: '+1 Year', days: 365 },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => handleQuickExpiry(s.days)}
                      className="px-2 py-0.5 bg-stone-100 hover:bg-emerald-100 hover:text-emerald-800 border border-stone-200 rounded text-[10px] font-medium transition cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Supplier & Notes */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Supplier / Distributor Name
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Metro Wholesale / ITC"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Storage Rack / Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Aisle 3, Shelf B"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Feedback message */}
          {statusFeedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                statusFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusFeedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusFeedback.message}</span>
            </div>
          )}

          {/* Submit Inward Batch Button */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={loading || !barcode.trim()}
              className={`px-6 py-3 rounded-xl font-bold text-sm text-white shadow-sm transition flex items-center gap-2 cursor-pointer ${
                loading || !barcode.trim()
                  ? 'bg-stone-300 cursor-not-allowed opacity-75'
                  : 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900'
              }`}
            >
              {loading ? (
                <span>Adding Inward Stock Batch...</span>
              ) : (
                <>
                  <PackagePlus className="w-4 h-4 text-emerald-200" />
                  <span>Receive Stock & Add Batch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Session Inward Receiving History */}
      {receivedHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900">
              Stock Batches Received This Session ({receivedHistory.length})
            </h3>
            <span className="text-[11px] text-stone-500">Live Intake Log</span>
          </div>

          <div className="divide-y divide-stone-100">
            {receivedHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 hover:bg-stone-50 transition flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-stone-900">{item.productName}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5 font-mono">
                    Barcode: {item.barcode} • Batch: {item.batchNumber} • Expiry: {item.expiryDate}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-emerald-800">
                    +{item.quantity} {item.unit}
                  </div>
                  <div className="text-[10px] text-stone-400">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Video Camera Barcode Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onScanSuccess={handleCameraScan}
        title="Stock Receiving Camera Scanner"
        continuous={false}
      />
    </div>
  );
};
