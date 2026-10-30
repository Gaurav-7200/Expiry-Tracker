import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ScanBarcode,
  Layers,
  Clock,
  CalendarDays,
  ReceiptText,
  Settings,
  Menu,
  X,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles,
  Store,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from './services/api';
import { sounds } from './utils/audio';

import { Dashboard } from './components/Dashboard';
import { PosBilling } from './components/PosBilling';
import { ProductManagement } from './components/ProductManagement';
import { StockIntake } from './components/StockIntake';
import { BatchInventory } from './components/BatchInventory';
import { ExpiryTracker } from './components/ExpiryTracker';
import { ExpiryCalendar } from './components/ExpiryCalendar';
import { SalesHistory } from './components/SalesHistory';
import { StoreSettings } from './components/StoreSettings';

export default function App() {
  // Valid application tab identifiers
  const VALID_TABS = [
    'dashboard',
    'pos',
    'products',
    'intake',
    'batches',
    'expiry',
    'calendar',
    'sales',
    'settings',
  ];

  // Initialize activeTab safely from URL hash or localStorage (aliasing 'receiving' to 'intake')
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      try {
        const hash = window.location.hash.replace('#', '').trim();
        if (hash === 'receiving') return 'intake';
        if (VALID_TABS.includes(hash)) return hash;
      } catch (e) {
        // ignore hash error
      }
      try {
        const saved = localStorage.getItem('stockwise_active_tab');
        if (saved === 'receiving') return 'intake';
        if (saved && VALID_TABS.includes(saved)) return saved;
      } catch (e) {
        // ignore storage error
      }
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [intakeBarcode, setIntakeBarcode] = useState('');
  const [editingProductIdFromIntake, setEditingProductIdFromIntake] = useState(null);
  const [posInitialBarcode, setPosInitialBarcode] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

  // Sync tab changes safely to URL hash and localStorage
  const handleTabChange = useCallback((newTab) => {
    const targetTab = newTab === 'receiving' ? 'intake' : newTab;
    if (!VALID_TABS.includes(targetTab)) return;
    setActiveTab(targetTab);
    if (typeof window !== 'undefined') {
      try {
        window.location.hash = targetTab;
      } catch (e) {
        // ignore hash error
      }
      try {
        localStorage.setItem('stockwise_active_tab', targetTab);
      } catch (e) {
        // ignore storage error
      }
    }
  }, []);

  // Listen to browser back/forward or hash changes
  useEffect(() => {
    const onHashChange = () => {
      try {
        const hash = window.location.hash.replace('#', '').trim();
        const targetTab = hash === 'receiving' ? 'intake' : hash;
        if (targetTab && VALID_TABS.includes(targetTab)) {
          setActiveTab(targetTab);
          try {
            localStorage.setItem('stockwise_active_tab', targetTab);
          } catch (e) {}
        }
      } catch (e) {}
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Core application state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sales, setSales] = useState([]);
  const [settings, setSettings] = useState({
    storeName: 'StockWise Supermarket',
    tagline: 'Fresh Groceries • Smart Inventory • Instant Billing',
    address: 'Shop 14, Central Market Boulevard, Green City',
    phone: '+1 (555) 349-8200',
    email: 'billing@stockwise.grocer',
    gstNumber: 'GSTIN07AABCG1234F1Z',
    currency: '₹',
    currencyCode: 'INR',
    taxRate: 5,
    taxEnabled: true,
    lowStockThreshold: 10,
    receiptFooter: 'Thank you for shopping with StockWise! Freshness guaranteed. Keep bill for quick returns within 3 days.',
  });

  // Load all data from persistent backend without resetting active tab
  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    try {
      const [statsRes, productsRes, batchesRes, salesRes, settingsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getProducts(),
        api.getBatches(),
        api.getSales(),
        api.getSettings(),
      ]);

      setDashboardStats(statsRes);
      setProducts(productsRes);
      setBatches(batchesRes);
      setSales(salesRes);
      setSettings(settingsRes);
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      if (isInitial) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Navigate to Stock Intake with pre-filled barcode
  const handleNavigateToIntake = (barcode) => {
    if (barcode) setIntakeBarcode(barcode);
    handleTabChange('intake');
    setMobileMenuOpen(false);
  };
  const handleNavigateToReceiving = handleNavigateToIntake;

  // Navigate to edit a specific product inside Products Catalog
  const handleNavigateToEditProduct = (productId) => {
    setEditingProductIdFromIntake(productId);
    handleTabChange('products');
    setMobileMenuOpen(false);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    sounds.enabled = next;
    setSoundEnabled(next);
    if (next) sounds.playScanBeep();
  };

  // Sidebar navigation menu items
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'pos',
      label: 'Point of Sale (POS)',
      icon: ShoppingCart,
      badge: 'F2',
      highlight: true,
    },
    {
      id: 'products',
      label: 'Products Catalog',
      icon: Package,
      badge: products.length || null,
    },
    {
      id: 'intake',
      label: 'Stock Intake',
      icon: ScanBarcode,
      badge: null,
    },
    {
      id: 'batches',
      label: 'Batch Inventory',
      icon: Layers,
      badge: batches.length || null,
    },
    {
      id: 'expiry',
      label: 'Expiry Alerts',
      icon: Clock,
      badge:
        dashboardStats && dashboardStats.expiredBatchesCount > 0
          ? `${dashboardStats.expiredBatchesCount} Exp`
          : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'calendar',
      label: 'Expiry Calendar',
      icon: CalendarDays,
      badge: null,
    },
    {
      id: 'sales',
      label: 'Sales History',
      icon: ReceiptText,
      badge: sales.length || null,
    },
    {
      id: 'settings',
      label: 'Store Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen bg-stone-100 flex font-sans text-stone-900 antialiased selection:bg-emerald-200">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-stone-900/60 backdrop-blur-xs lg:hidden no-print"
        />
      )}

      {/* SIDEBAR NAVIGATION (Desktop + Mobile) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-stone-900 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-stone-800 lg:static lg:translate-x-0 no-print ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-5 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-900/40">
                <Store className="w-5 h-5 text-emerald-50" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  StockWise
                  <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-emerald-700/80 text-emerald-200 font-mono">
                    PRO
                  </span>
                </h1>
                <p className="text-[11px] text-stone-400 font-medium">Grocery Inventory & POS</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items List */}
          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    handleTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer group ${
                    isActive
                      ? 'bg-emerald-800/90 text-white shadow-xs border border-emerald-600/50'
                      : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 transition ${
                        isActive ? 'text-emerald-300' : 'text-stone-400 group-hover:text-emerald-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold font-mono ${
                        item.badgeColor ||
                        (isActive
                          ? 'bg-emerald-700 text-emerald-100'
                          : 'bg-stone-800 text-stone-400')
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Details */}
        <div className="p-4 border-t border-stone-800 text-xs text-stone-400 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> FEFO Stock Engine
            </span>
            <span className="text-stone-400 font-mono">v1.2</span>
          </div>

          <div className="text-[10px] text-stone-400 line-clamp-1">
            {settings.storeName}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Navbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between shadow-2xs no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-stone-900">
                  {navItems.find((n) => n.id === activeTab)?.label}
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live Sync
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition cursor-pointer"
              title={soundEnabled ? 'Mute scanner sounds' : 'Enable scanner sounds'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-700" />
              ) : (
                <VolumeX className="w-4 h-4 text-stone-400" />
              )}
            </button>

            {/* Refresh Data button */}
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition cursor-pointer"
              title="Refresh inventory data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-700' : ''}`} />
            </button>
          </div>
        </header>

        {/* View Router */}
        <main className="p-4 md:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={dashboardStats}
              settings={settings}
              loading={loading}
              onNavigate={(tab) => handleTabChange(tab)}
              onRefresh={() => loadData(false)}
            />
          )}

          {activeTab === 'pos' && (
            <PosBilling
              products={products}
              settings={settings}
              initialBarcode={posInitialBarcode}
              onClearInitialBarcode={() => setPosInitialBarcode('')}
              onSaleCompleted={() => loadData(false)}
              onNavigateToReceiving={(code) => handleNavigateToIntake(code)}
            />
          )}

          {activeTab === 'products' && (
            <ProductManagement
              products={products}
              settings={settings}
              onProductsUpdated={() => loadData(false)}
              onNavigateToReceiving={(code) => handleNavigateToIntake(code)}
              onNavigateToIntake={(code) => handleNavigateToIntake(code)}
              initialEditProductId={editingProductIdFromIntake}
              onClearInitialEditProductId={() => setEditingProductIdFromIntake(null)}
            />
          )}

          {(activeTab === 'intake' || activeTab === 'receiving') && (
            <StockIntake
              products={products}
              settings={settings}
              initialBarcode={intakeBarcode}
              onStockUpdated={() => {
                setIntakeBarcode('');
                loadData(false);
              }}
              onNavigateToEditProduct={handleNavigateToEditProduct}
            />
          )}

          {activeTab === 'batches' && (
            <BatchInventory
              batches={batches}
              settings={settings}
              onBatchesUpdated={() => loadData(false)}
            />
          )}

          {activeTab === 'expiry' && (
            <ExpiryTracker
              batches={batches}
              settings={settings}
              onBatchesUpdated={() => loadData(false)}
              onNavigateToCalendar={() => handleTabChange('calendar')}
            />
          )}

          {activeTab === 'calendar' && (
            <ExpiryCalendar
              batches={batches}
              settings={settings}
              onNavigateToProducts={() => handleTabChange('products')}
            />
          )}

          {activeTab === 'sales' && (
            <SalesHistory sales={sales} settings={settings} />
          )}

          {activeTab === 'settings' && (
            <StoreSettings
              settings={settings}
              onSettingsUpdated={(newSettings) => setSettings(newSettings)}
              onResetData={() => loadData(false)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
