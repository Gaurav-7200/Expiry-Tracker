export type ProductCategory =
  | 'Grains & Flours'
  | 'Dairy & Eggs'
  | 'Oils & Ghee'
  | 'Bakery & Bread'
  | 'Beverages & Tea'
  | 'Snacks & Packaged'
  | 'Pulses & Lentils'
  | 'Spices & Condiments'
  | 'Personal & Household';

export type ProductUnit = 'pcs' | 'kg' | 'g' | 'L' | 'ml' | 'pack' | 'box';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  sellingPrice: number;
  mrp: number;
  reorderLevel: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type BatchStatus = 'active' | 'depleted' | 'expired' | 'disposed';

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  initialQuantity: number;
  quantity: number; // remaining available
  purchasePrice: number;
  purchaseDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  supplier?: string;
  notes?: string;
  status: BatchStatus;
  createdAt: string;
}

export interface BatchWithProduct extends Batch {
  productName: string;
  barcode: string;
  category: ProductCategory;
  unit: ProductUnit;
  sellingPrice: number;
  daysUntilExpiry: number;
  expiryAlert: 'expired' | 'urgent_7' | 'warning_30' | 'fresh';
}

export interface ProductWithStock extends Product {
  totalStock: number;
  availableStock: number; // excludes expired batches
  expiredStock: number;
  nearExpiryStock: number; // expiring <= 30 days
  batchesCount: number;
  batches: Batch[];
  earliestExpiry: string | null;
  daysUntilEarliestExpiry: number | null;
  isLowStock: boolean;
  hasExpiredBatches: boolean;
  hasNearExpiryBatches: boolean;
}

export interface SaleItemAllocation {
  batchId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  purchasePrice: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  barcode: string;
  unit: ProductUnit;
  quantity: number;
  sellingPrice: number;
  discount: number; // flat discount per item or line
  total: number;
  batchAllocations: SaleItemAllocation[];
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'split';

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string; // ISO string
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxRate: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  changeReturned?: number;
  cashier: string;
  notes?: string;
  status: 'completed' | 'cancelled' | 'refunded';
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  currency: string;
  currencyCode: string;
  taxRate: number;
  taxEnabled: boolean;
  lowStockThreshold: number;
  receiptFooter: string;
}

export interface DashboardStats {
  totalProducts: number;
  availableStock: number;
  todaySalesCount: number;
  todayRevenue: number;
  totalRevenue: number;
  lowStockCount: number;
  expiredBatchesCount: number;
  expiringWithin7Count: number;
  expiringWithin30Count: number;
  recentSales: Sale[];
  lowStockProducts: ProductWithStock[];
  urgentExpiryBatches: BatchWithProduct[];
  salesLast7Days: {
    date: string;
    dayName: string;
    revenue: number;
    orders: number;
  }[];
  categoryBreakdown: {
    category: ProductCategory;
    count: number;
    totalStock: number;
  }[];
}
