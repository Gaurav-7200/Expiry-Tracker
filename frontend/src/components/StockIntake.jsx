import React, { useState, useRef, useEffect } from 'react';
import {
  ScanBarcode,
  PackagePlus,
  CheckCircle,
  AlertCircle,
  Search,
  Calendar,
  Layers,
  Info,
  Clock,
  Sparkles,
  Camera,
  Edit2,
  Package,
  Plus,
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/audio';
import { CameraScannerModal } from './CameraScannerModal';

const CATEGORIES = [
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

const UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'box'];

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateBatchCode() {
  return `B${new Date().toISOString().slice(2, 4)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
}

export const StockIntake = ({
  products,
  settings,
  initialBarcode = '',
  onStockUpdated,
  onNavigateToEditProduct,
}) => {
  const [barcode, setBarcode] = useState(initialBarcode);
  const [lastLookedUpBarcode, setLastLookedUpBarcode] = useState('');
  const [lookedUpProduct, setLookedUpProduct] = useState(null);
  const [isNewProductMode, setIsNewProductMode] = useState(false);

  // New product fields (used when barcode is not found)
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Grains & Flours');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [newMrp, setNewMrp] = useState('');
  const [newReorderLevel, setNewReorderLevel] = useState('10');
  const [newDescription, setNewDescription] = useState('');

  // Batch fields
  const [batchNumber, setBatchNumber] = useState(generateBatchCode());
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(getTodayString());
  const [expiryDate, setExpiryDate] = useState(addDaysToDate(180)); // default 6 months
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState(null);

  // Recent received records in this session
  const [receivedHistory, setReceivedHistory] = useState([]);

  const barcodeInputRef = useRef(null);
  const batchNumberInputRef = useRef(null);
  const newProductNameInputRef = useRef(null);

  useEffect(() => {
    barcodeInputRef.current?.focus();
    if (initialBarcode) {
      setBarcode(initialBarcode);
      void handleLookup(initialBarcode);
    }
  }, [initialBarcode]);

  // Reset downstream form fields whenever a different barcode is being investigated
  const resetFormDetails = () => {
    setLookedUpProduct(null);
    setIsNewProductMode(false);
    setNewName('');
    setNewCategory('Grains & Flours');
    setNewUnit('pcs');
    setNewSellingPrice('');
    setNewMrp('');
    setNewReorderLevel('10');
    setNewDescription('');
    setQuantity('');
    setPurchasePrice('');
    setSupplier('');
    setNotes('');
    setBatchNumber(generateBatchCode());
  };

  // Lookup barcode in existing products list first (zero latency), fallback to API
  const handleLookup = async (codeToSearch) => {
    const cleanCode = codeToSearch ? String(codeToSearch).trim() : '';
    if (!cleanCode) {
      resetFormDetails();
      setLastLookedUpBarcode('');
      setStatusFeedback(null);
      return;
    }

    setLastLookedUpBarcode(cleanCode);
    setStatusFeedback(null);

    // 1. Look up in already-loaded products list first (zero latency)
    let found = products.find((p) => p.barcode && String(p.barcode).trim() === cleanCode);
    if (!found && cleanCode.length === 13 && cleanCode.startsWith('0')) {
      const trimmed12 = cleanCode.slice(1);
      found = products.find((p) => p.barcode && String(p.barcode).trim() === trimmed12);
    }

    // 2. Fall back to backend API endpoint
    if (!found) {
      try {
        found = await api.getProductByBarcode(cleanCode);
        if (!found && cleanCode.length === 13 && cleanCode.startsWith('0')) {
          found = await api.getProductByBarcode(cleanCode.slice(1));
        }
      } catch (err) {
        console.warn('[StockIntake] API lookup error:', err);
      }
    }

    if (found) {
      setLookedUpProduct(found);
      setIsNewProductMode(false);
      sounds.playScanBeep();
      // Move focus to Batch Number input; never autofill batch-specific fields
      setTimeout(() => {
        batchNumberInputRef.current?.focus();
      }, 100);
    } else {
      setLookedUpProduct(null);
      setIsNewProductMode(true);
      sounds.playScanBeep();
      setStatusFeedback({
        type: 'info',
        message: `New barcode "${cleanCode}" — not in catalog yet. Enter product details below.`,
      });
      // Move focus to product name input
      setTimeout(() => {
        newProductNameInputRef.current?.focus();
      }, 100);
    }
  };

  const handleBarcodeChange = (e) => {
    const val = e.target.value;
    setBarcode(val);
    // If user changes barcode from the last looked up one, clear previous result
    if (val.trim() !== lastLookedUpBarcode) {
      resetFormDetails();
      setStatusFeedback(null);
    }
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleLookup(barcode);
    }
  };

  const handleCameraScan = (code) => {
    const clean = code ? String(code).trim() : '';
    setBarcode(clean);
    setIsCameraModalOpen(false);
    void handleLookup(clean);
  };

  const handleQuickExpiry = (days) => {
    setExpiryDate(addDaysToDate(days));
  };

  // Action: Save Product Only (without batch)
  const handleSaveProductOnly = async () => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) {
      setStatusFeedback({ type: 'error', message: 'Barcode is required.' });
      return;
    }
    if (!newName.trim()) {
      setStatusFeedback({ type: 'error', message: 'Product title is required.' });
      newProductNameInputRef.current?.focus();
      return;
    }

    const price = parseFloat(newSellingPrice);
    if (isNaN(price) || price < 0) {
      setStatusFeedback({ type: 'error', message: 'Selling price must be a valid non-negative number.' });
      return;
    }

    setLoading(true);
    setStatusFeedback(null);

    try {
      const created = await api.createProduct({
        barcode: cleanBarcode,
        name: newName.trim(),
        category: newCategory,
        unit: newUnit,
        sellingPrice: price,
        mrp: parseFloat(newMrp) || price,
        reorderLevel: parseInt(newReorderLevel) || 10,
        description: newDescription.trim(),
      });

      sounds.playSuccessChime();
      setStatusFeedback({
        type: 'success',
        message: `Product "${created.name}" created successfully without initial stock!`,
      });

      // Switch to existing product view for this barcode so user can add batches later if needed
      setLookedUpProduct(created);
      setIsNewProductMode(false);
      onStockUpdated?.();
    } catch (err) {
      sounds.playErrorBuzz();
      setStatusFeedback({
        type: 'error',
        message: err.message || 'Failed to create product.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Main Form Submit: Save product and add stock (or add stock to existing product)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const cleanBarcode = barcode.trim();

    if (!cleanBarcode) {
      setStatusFeedback({ type: 'error', message: 'Barcode is required.' });
      return;
    }

    if (!lookedUpProduct && !isNewProductMode) {
      setStatusFeedback({
        type: 'error',
        message: 'Please lookup or scan a valid barcode first.',
      });
      return;
    }

    if (isNewProductMode && !newName.trim()) {
      setStatusFeedback({
        type: 'error',
        message: 'Product title is required for registering a new product.',
      });
      newProductNameInputRef.current?.focus();
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setStatusFeedback({ type: 'error', message: 'Received quantity must be greater than 0.' });
      batchNumberInputRef.current?.focus();
      return;
    }

    if (!expiryDate) {
      setStatusFeedback({ type: 'error', message: 'Batch expiry date is required.' });
      return;
    }

    setLoading(true);
    setStatusFeedback(null);

    try {
      const payload = {
        barcode: cleanBarcode,
        batchNumber: batchNumber.trim() || generateBatchCode(),
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

      // Single API call for receiving stock for either new or existing products
      const res = await api.receiveStock(payload);
      sounds.playSuccessChime();

      setStatusFeedback({
        type: 'success',
        message: `Successfully received ${qtyNum} ${res.product.unit} for "${res.product.name}" under batch ${res.batch.batchNumber}!`,
      });

      // Add to session intake history
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

      // Reset form for next intake
      setBarcode('');
      setLastLookedUpBarcode('');
      resetFormDetails();
      onStockUpdated?.();
      barcodeInputRef.current?.focus();
    } catch (err) {
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
            Stock Intake & Product Registration
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Scan barcode with camera or USB scanner. Existing products load instantly; new products register seamlessly alongside their first batch.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
          <Info className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            Separate batches keep expiry dates isolated for automated FEFO billing.
          </span>
        </div>
      </div>

      {/* Main Intake Form Card */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Step 1: Barcode Scan / Lookup Input */}
          <div className="space-y-2">
            <label htmlFor="intake-barcode-input" className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center justify-between">
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
                  id="intake-barcode-input"
                  ref={barcodeInputRef}
                  type="text"
                  value={barcode}
                  onChange={handleBarcodeChange}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder="Scan barcode with camera or USB scanner (e.g. 8901030383848)..."
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
                />
                <ScanBarcode className="w-5 h-5 text-stone-400 absolute left-3 top-3.5" />
              </div>

              {/* Camera Scanner Button */}
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                title="Scan barcode with camera"
              >
                <Camera className="w-4 h-4 text-emerald-200" />
                <span>Scan</span>
              </button>

              <button
                type="button"
                onClick={() => void handleLookup(barcode)}
                className="px-5 py-3 bg-stone-800 hover:bg-stone-900 text-white font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Search className="w-4 h-4" />
                Lookup
              </button>
            </div>
          </div>

          {/* Status Feedback Banner */}
          {statusFeedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                statusFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : statusFeedback.type === 'info'
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusFeedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : statusFeedback.type === 'info' ? (
                <Info className="w-4 h-4 shrink-0 text-blue-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span className="font-semibold">{statusFeedback.message}</span>
            </div>
          )}

          {/* CASE A: Product Found -> Read-only Card with "Edit product details" link */}
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
                    {lookedUpProduct.mrp ? ` • MRP: ${settings.currency}${lookedUpProduct.mrp}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigateToEditProduct?.(lookedUpProduct.id)}
                    className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit product details in catalog</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-emerald-200 text-right self-start md:self-center">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-stone-600 block">
                    Current Active Stock
                  </span>
                  <span className="text-lg font-extrabold text-emerald-800">
                    {lookedUpProduct.availableStock ?? 0} {lookedUpProduct.unit}
                  </span>
                </div>
                <div className="border-l border-stone-200 pl-3">
                  <span className="text-[10px] uppercase font-semibold text-stone-600 block">
                    Existing Batches
                  </span>
                  <span className="text-lg font-bold text-stone-700">
                    {lookedUpProduct.batchesCount ?? (lookedUpProduct.batches?.length || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CASE B: Product NOT Found -> "New Product" Registration Section */}
          {isNewProductMode && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-amber-950">
                    New Product Barcode: <span className="font-mono">{barcode}</span>
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    This barcode does not exist in your catalog yet. Fill in product details below to register it.
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
                    ref={newProductNameInputRef}
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
                    onChange={(e) => setNewCategory(e.target.value)}
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
                    onChange={(e) => setNewUnit(e.target.value)}
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
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-emerald-600 focus:outline-none"
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

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Description / Specification
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Packaging notes, grade, or brand description..."
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Batch Information (shown when product is found OR when registering a new product) */}
          {(lookedUpProduct || isNewProductMode) && (
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
                    ref={batchNumberInputRef}
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

                {/* Purchase Cost */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Purchase Price / Unit ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="Cost per unit"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Inward / Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Expiry Date Section */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    Expiration Date (Critical for FEFO Engine) *
                  </label>

                  {/* Quick Expiry Shortcuts */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-stone-500 text-[10px] font-medium mr-1">Quick Select:</span>
                    {[
                      { days: 30, label: '1 Mo' },
                      { days: 90, label: '3 Mo' },
                      { days: 180, label: '6 Mo' },
                      { days: 365, label: '1 Yr' },
                      { days: 730, label: '2 Yr' },
                    ].map((btn) => (
                      <button
                        key={btn.days}
                        type="button"
                        onClick={() => handleQuickExpiry(btn.days)}
                        className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-300 rounded font-medium transition cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Supplier & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. Metro Cash & Carry, Local Mill"
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
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            {isNewProductMode && (
              <button
                type="button"
                onClick={handleSaveProductOnly}
                disabled={loading || !barcode.trim() || !newName.trim()}
                className={`px-5 py-3 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center justify-center gap-2 ${
                  loading || !barcode.trim() || !newName.trim()
                    ? 'border-stone-200 text-stone-400 bg-stone-100 cursor-not-allowed'
                    : 'border-stone-300 text-stone-800 bg-white hover:bg-stone-50 active:bg-stone-100 shadow-xs'
                }`}
                title="Register this product now without creating an initial stock batch"
              >
                <Package className="w-4 h-4 text-stone-600" />
                <span>Save product only</span>
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !barcode.trim() || (!lookedUpProduct && !isNewProductMode)}
              className={`px-6 py-3 rounded-xl font-bold text-sm text-white shadow-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                loading || !barcode.trim() || (!lookedUpProduct && !isNewProductMode)
                  ? 'bg-stone-300 cursor-not-allowed opacity-75'
                  : 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900'
              }`}
            >
              {loading ? (
                <span>Processing Inward Stock...</span>
              ) : isNewProductMode ? (
                <>
                  <PackagePlus className="w-4 h-4 text-emerald-200" />
                  <span>Save product and add stock</span>
                </>
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
        title="Stock Intake Camera Scanner"
        continuous={false}
      />
    </div>
  );
};
