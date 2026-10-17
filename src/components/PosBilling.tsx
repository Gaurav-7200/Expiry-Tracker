import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  QrCode,
  Banknote,
  Percent,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  User,
  Phone,
  Sparkles,
  ShoppingBag,
  Camera,
} from 'lucide-react';
import type {
  ProductWithStock,
  ProductCategory,
  PaymentMethod,
  StoreSettings,
  Sale,
} from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';
import { ReceiptModal } from './ReceiptModal';
import { CameraScannerModal } from './CameraScannerModal';

interface CartItem {
  product: ProductWithStock;
  quantity: number;
  discount: number; // flat discount
}

interface PosBillingProps {
  products: ProductWithStock[];
  settings: StoreSettings;
  initialBarcode?: string;
  onClearInitialBarcode?: () => void;
  onSaleCompleted: () => void;
  onNavigateToReceiving: (barcode?: string) => void;
}

const CATEGORIES: ('All' | ProductCategory)[] = [
  'All',
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

export const PosBilling: React.FC<PosBillingProps> = ({
  products,
  settings,
  initialBarcode,
  onClearInitialBarcode,
  onSaleCompleted,
  onNavigateToReceiving,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFeedback, setBarcodeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cashierName] = useState('Cashier 1');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Completed sale receipt modal state
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode scanner input for seamless retail operation
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Process initialBarcode passed from global camera scan
  useEffect(() => {
    if (initialBarcode) {
      handleCameraScan(initialBarcode);
      onClearInitialBarcode?.();
    }
  }, [initialBarcode]);

  // Filter products for the catalog grid
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const cleanSearch = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !cleanSearch ||
      p.name.toLowerCase().includes(cleanSearch) ||
      p.barcode.includes(cleanSearch) ||
      p.category.toLowerCase().includes(cleanSearch);
    return matchesCat && matchesSearch;
  });

  // Handle camera video barcode detection
  const handleCameraScan = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    const found = products.find((p) => p.barcode === cleanCode);
    if (found) {
      if (found.availableStock <= 0) {
        sounds.playErrorBuzz();
        setBarcodeFeedback({
          type: 'error',
          message: `Out of stock: "${found.name}" (0 available)`,
        });
      } else {
        addToCart(found);
        setBarcodeFeedback({
          type: 'success',
          message: `Camera Scanned: ${found.name}`,
        });
      }
    } else {
      sounds.playErrorBuzz();
      setBarcodeFeedback({
        type: 'error',
        message: `Barcode "${cleanCode}" not in catalog!`,
      });
    }

    setTimeout(() => {
      setBarcodeFeedback(null);
    }, 4000);
  };

  // Handle USB Barcode Scanner submission or manual Enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const found = products.find((p) => p.barcode === code);
    if (found) {
      if (found.availableStock <= 0) {
        sounds.playErrorBuzz();
        setBarcodeFeedback({
          type: 'error',
          message: `Out of stock: "${found.name}" (0 available unexpired)`,
        });
      } else {
        addToCart(found);
        sounds.playScanBeep();
        setBarcodeFeedback({
          type: 'success',
          message: `Added: ${found.name}`,
        });
      }
    } else {
      sounds.playErrorBuzz();
      setBarcodeFeedback({
        type: 'error',
        message: `Barcode "${code}" not found in catalog!`,
      });
    }

    setBarcodeInput('');
    // Auto-clear feedback after 3 seconds
    setTimeout(() => {
      setBarcodeFeedback(null);
    }, 3500);
  };

  // Add product to cart
  const addToCart = (product: ProductWithStock) => {
    setErrorMessage(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.availableStock) {
          sounds.playErrorBuzz();
          setErrorMessage(
            `Cannot add more "${product.name}". Maximum available stock is ${product.availableStock} ${product.unit}.`
          );
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        if (product.availableStock <= 0) {
          sounds.playErrorBuzz();
          setErrorMessage(`"${product.name}" has no available stock!`);
          return prev;
        }
        return [...prev, { product, quantity: 1, discount: 0 }];
      }
    });
  };

  // Adjust cart item quantity
  const updateQuantity = (productId: string, delta: number) => {
    setErrorMessage(null);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.availableStock) {
              sounds.playErrorBuzz();
              setErrorMessage(
                `Only ${item.product.availableStock} ${item.product.unit} available for "${item.product.name}".`
              );
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Set direct quantity
  const setDirectQuantity = (productId: string, qty: number) => {
    setErrorMessage(null);
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          if (qty <= 0) return item;
          if (qty > item.product.availableStock) {
            sounds.playErrorBuzz();
            setErrorMessage(
              `Maximum available for "${item.product.name}" is ${item.product.availableStock} ${item.product.unit}.`
            );
            return { ...item, quantity: item.product.availableStock };
          }
          return { ...item, quantity: qty };
        }
        return item;
      })
    );
  };

  // Remove item from cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
    setErrorMessage(null);
    setAmountTendered('');
    barcodeInputRef.current?.focus();
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const discountTotal = cart.reduce((sum, item) => sum + item.discount, 0);
  const taxableAmount = Math.max(0, subtotal - discountTotal);
  const taxRate = settings.taxEnabled ? settings.taxRate : 0;
  const taxTotal = parseFloat(((taxableAmount * taxRate) / 100).toFixed(2));
  const grandTotal = parseFloat((taxableAmount + taxTotal).toFixed(2));

  // Change computation for cash
  const tenderedNum = parseFloat(amountTendered) || 0;
  const changeReturned = Math.max(0, parseFloat((tenderedNum - grandTotal).toFixed(2)));

  // Quick cash bill shortcuts
  const setCashAmount = (amount: number) => {
    setAmountTendered(amount.toString());
  };

  // Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage('Cart is empty. Add products to proceed with billing.');
      return;
    }

    if (paymentMethod === 'cash') {
      if (tenderedNum < grandTotal && amountTendered !== '') {
        setErrorMessage(
          `Cash tendered (${settings.currency}${tenderedNum}) is less than total bill (${settings.currency}${grandTotal}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          discount: item.discount,
        })),
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        paymentMethod,
        amountTendered: paymentMethod === 'cash' ? (tenderedNum || grandTotal) : undefined,
        cashier: cashierName,
      };

      const sale = await api.checkout(payload);
      sounds.playSuccessChime();

      setCompletedSale(sale);
      setIsReceiptOpen(true);
      clearCart();
      setCustomerName('');
      setCustomerPhone('');
      onSaleCompleted();
    } catch (err: any) {
      sounds.playErrorBuzz();
      setErrorMessage(err.message || 'Checkout failed. Please check stock levels.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: Product Catalog & Barcode Scanner (7 columns on xl) */}
      <div className="xl:col-span-7 space-y-4">
        {/* Hardware / USB Barcode Scanner Bar */}
        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs">
          <form onSubmit={handleBarcodeSubmit} className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
              <label htmlFor="barcode-scanner-input" className="flex items-center gap-1.5 text-emerald-800">
                <Barcode className="w-4 h-4 text-emerald-700" />
                USB Barcode Scanner / Instant Lookup
              </label>
              <span className="text-[11px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded font-mono">
                Press Enter to scan
              </span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="barcode-scanner-input"
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode with USB scanner or type number (e.g. 8901030383848)..."
                  className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
                />
                <Barcode className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
              </div>

              {/* Live Camera Scanner Button - High Visibility */}
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs rounded-lg transition shadow-sm cursor-pointer flex items-center gap-2 shrink-0 animate-pulse-subtle"
                title="Scan barcode directly with your phone camera or laptop webcam"
              >
                <Camera className="w-4 h-4 text-emerald-200" />
                <span className="font-semibold">📷 Camera Scan</span>
              </button>

              <button
                type="submit"
                className="px-4 py-2.5 bg-stone-800 hover:bg-stone-900 active:bg-black text-white font-semibold text-xs rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                Add
              </button>
            </div>

            {/* Scan Feedback Banner */}
            {barcodeFeedback && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center justify-between transition ${
                  barcodeFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {barcodeFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>{barcodeFeedback.message}</span>
                </div>
                {barcodeFeedback.type === 'error' && (
                  <button
                    type="button"
                    onClick={() => onNavigateToReceiving(barcodeInput)}
                    className="underline font-semibold hover:text-rose-900 ml-2 cursor-pointer"
                  >
                    Receive as new?
                  </button>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Search & Category Filter Pills */}
        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product name, category, or barcode..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
            />
          </div>

          {/* Category Chips Scroll */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl p-8 text-center border border-stone-200 text-stone-500">
              <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">No matching products found</p>
              <p className="text-xs text-stone-400 mt-1">
                Try a different search term or category filter.
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const inStock = product.availableStock > 0;
              const inCart = cart.find((i) => i.product.id === product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => inStock && addToCart(product)}
                  className={`bg-white rounded-xl p-3 border transition flex flex-col justify-between text-left group select-none relative ${
                    inStock
                      ? 'border-stone-200 hover:border-emerald-500 hover:shadow-md cursor-pointer'
                      : 'border-stone-200 bg-stone-50/70 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Cart count badge */}
                  {inCart && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                      {inCart.quantity}
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block truncate">
                      {product.category}
                    </span>
                    <h4 className="font-semibold text-xs text-stone-900 mt-1 line-clamp-2 group-hover:text-emerald-900">
                      {product.name}
                    </h4>
                    <p className="text-[10px] font-mono text-stone-600 mt-0.5">
                      {product.barcode}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-sm text-stone-900">
                        {settings.currency}
                        {product.sellingPrice}
                      </div>
                      {product.mrp > product.sellingPrice && (
                        <div className="text-[10px] text-stone-600 line-through">
                          MRP {settings.currency}
                          {product.mrp}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      {inStock ? (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            product.availableStock <= product.reorderLevel
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {product.availableStock} {product.unit}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                          Out of stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Cart & Checkout Register (5 columns on xl) */}
      <div className="xl:col-span-5 bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
        {/* Register Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-800">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">Billing Register</h3>
              <p className="text-xs text-stone-500">
                {cart.length} item{cart.length === 1 ? '' : 's'} in cart
              </p>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Cart
            </button>
          )}
        </div>

        {/* Customer Information (Optional) */}
        <div className="grid grid-cols-2 gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs">
          <div className="relative">
            <User className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer"
              className="w-full pl-8 pr-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
            />
          </div>
          <div className="relative">
            <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Mobile Phone (optional)"
              className="w-full pl-8 pr-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 divide-y divide-stone-100">
          {cart.length === 0 ? (
            <div className="py-10 text-center text-stone-400 space-y-2">
              <ShoppingCart className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-xs font-semibold text-stone-500">Cart is empty</p>
              <p className="text-[11px] text-stone-400 max-w-[200px] mx-auto">
                Scan barcode or tap products from catalog to start billing.
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const lineTotal = item.product.sellingPrice * item.quantity - item.discount;

              return (
                <div key={item.product.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-stone-900 truncate">
                      {item.product.name}
                    </h5>
                    <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                      <span>
                        {settings.currency}
                        {item.product.sellingPrice} / {item.product.unit}
                      </span>
                      {item.product.earliestExpiry && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded">
                          Exp: {item.product.earliestExpiry}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={item.product.availableStock}
                      value={item.quantity}
                      onChange={(e) =>
                        setDirectQuantity(item.product.id, parseInt(e.target.value) || 1)
                      }
                      className="w-10 py-0.5 text-center font-bold text-xs border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="text-right w-20 shrink-0">
                    <div className="font-extrabold text-stone-900">
                      {settings.currency}
                      {lineTotal.toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-stone-400 hover:text-rose-600 transition p-0.5 mt-0.5 inline-block cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bill Calculations Summary */}
        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal:</span>
            <span className="font-semibold text-stone-800">
              {settings.currency}
              {subtotal.toFixed(2)}
            </span>
          </div>

          {discountTotal > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Item Discounts:</span>
              <span className="font-semibold">
                -{settings.currency}
                {discountTotal.toFixed(2)}
              </span>
            </div>
          )}

          {settings.taxEnabled && (
            <div className="flex justify-between text-stone-600">
              <span>Estimated Tax ({settings.taxRate}%):</span>
              <span className="font-semibold text-stone-800">
                {settings.currency}
                {taxTotal.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-base font-extrabold text-stone-900 pt-2 border-t border-stone-200">
            <span>Payable Amount:</span>
            <span className="text-emerald-800">
              {settings.currency}
              {grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-stone-700 block">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`p-2.5 rounded-xl border font-semibold text-xs flex flex-col items-center gap-1 transition cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs ring-1 ring-emerald-600'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-700" />
              <span>Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('upi')}
              className={`p-2.5 rounded-xl border font-semibold text-xs flex flex-col items-center gap-1 transition cursor-pointer ${
                paymentMethod === 'upi'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs ring-1 ring-emerald-600'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span>UPI / QR</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-2.5 rounded-xl border font-semibold text-xs flex flex-col items-center gap-1 transition cursor-pointer ${
                paymentMethod === 'card'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs ring-1 ring-emerald-600'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <span>Card</span>
            </button>
          </div>
        </div>

        {/* Dynamic Payment Details */}
        {paymentMethod === 'cash' && (
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <label htmlFor="tendered-input" className="font-semibold text-emerald-950">Cash Tendered by Customer</label>
              {changeReturned > 0 && (
                <span className="font-bold text-emerald-800">
                  Change: {settings.currency}{changeReturned.toFixed(2)}
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-2 font-bold text-stone-500">
                {settings.currency}
              </span>
              <input
                id="tendered-input"
                type="number"
                step="any"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                placeholder={grandTotal.toString()}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Quick cash denomination buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setCashAmount(grandTotal)}
                className="px-2 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 rounded text-[11px] font-semibold text-emerald-800 cursor-pointer"
              >
                Exact ({settings.currency}{grandTotal})
              </button>
              {[100, 200, 500, 1000, 2000].map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => setCashAmount(note)}
                  className="px-2 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 rounded text-[11px] font-semibold text-emerald-800 cursor-pointer"
                >
                  +{settings.currency}{note}
                </button>
              ))}
            </div>
          </div>
        )}

        {paymentMethod === 'upi' && (
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-xs flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg border border-emerald-300 shrink-0">
              <QrCode className="w-9 h-9 text-emerald-800" />
            </div>
            <div>
              <p className="font-bold text-emerald-950">Dynamic UPI Merchant QR</p>
              <p className="text-[11px] text-emerald-800">
                Customer scans with GPay / PhonePe / Paytm to transfer {settings.currency}
                {grandTotal.toFixed(2)}.
              </p>
            </div>
          </div>
        )}

        {/* Error message banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Primary Checkout Button */}
        <button
          type="button"
          disabled={cart.length === 0 || isSubmitting}
          onClick={handleCheckout}
          className={`w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
            cart.length === 0 || isSubmitting
              ? 'bg-stone-300 cursor-not-allowed opacity-75'
              : 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing Sale & Deducting FEFO Stock...</span>
            </div>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>Complete Sale & Print Bill ({settings.currency}{grandTotal.toFixed(2)})</span>
            </>
          )}
        </button>
      </div>

      {/* Printable Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          settings={settings}
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          isNewSale={true}
        />
      )}

      {/* Camera Video Barcode Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onScanSuccess={handleCameraScan}
        title="POS Camera Barcode Scanner"
        continuous={true}
      />
    </div>
  );
};
