import type {
  Product,
  ProductWithStock,
  Batch,
  BatchWithProduct,
  Sale,
  StoreSettings,
  DashboardStats,
} from '../types';

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed with status ${res.status}`);
  }
  return json.data as T;
}

export const api = {
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/dashboard/stats');
    return handleResponse<DashboardStats>(res);
  },

  async getProducts(): Promise<ProductWithStock[]> {
    const res = await fetch('/api/products');
    return handleResponse<ProductWithStock[]>(res);
  },

  async getProductByBarcode(barcode: string): Promise<ProductWithStock> {
    const res = await fetch(`/api/products/barcode/${encodeURIComponent(barcode)}`);
    return handleResponse<ProductWithStock>(res);
  },

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
  },

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete product');
    }
  },

  async getBatches(): Promise<BatchWithProduct[]> {
    const res = await fetch('/api/batches');
    return handleResponse<BatchWithProduct[]>(res);
  },

  async createBatch(data: Omit<Batch, 'id' | 'createdAt' | 'status'>): Promise<Batch> {
    const res = await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Batch>(res);
  },

  async updateBatch(id: string, data: Partial<Batch>): Promise<Batch> {
    const res = await fetch(`/api/batches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Batch>(res);
  },

  async deleteBatch(id: string): Promise<void> {
    const res = await fetch(`/api/batches/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete batch');
    }
  },

  async receiveStock(payload: {
    barcode: string;
    productDetails?: {
      name: string;
      category: any;
      unit: any;
      sellingPrice: number;
      mrp: number;
      reorderLevel?: number;
      description?: string;
    };
    batchNumber: string;
    quantity: number;
    purchasePrice: number;
    purchaseDate: string;
    expiryDate: string;
    supplier?: string;
    notes?: string;
  }): Promise<{ product: Product; batch: Batch; isNewProduct: boolean }> {
    const res = await fetch('/api/batches/receive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ product: Product; batch: Batch; isNewProduct: boolean }>(res);
  },

  async getSales(): Promise<Sale[]> {
    const res = await fetch('/api/sales');
    return handleResponse<Sale[]>(res);
  },

  async getSaleById(id: string): Promise<Sale> {
    const res = await fetch(`/api/sales/${id}`);
    return handleResponse<Sale>(res);
  },

  async checkout(payload: {
    items: {
      productId: string;
      quantity: number;
      discount?: number;
    }[];
    customerName?: string;
    customerPhone?: string;
    paymentMethod: 'cash' | 'upi' | 'card' | 'split';
    amountTendered?: number;
    cashier?: string;
    notes?: string;
  }): Promise<Sale> {
    const res = await fetch('/api/sales/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Sale>(res);
  },

  async getSettings(): Promise<StoreSettings> {
    const res = await fetch('/api/settings');
    return handleResponse<StoreSettings>(res);
  },

  async updateSettings(data: Partial<StoreSettings>): Promise<StoreSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<StoreSettings>(res);
  },

  async resetData(): Promise<void> {
    const res = await fetch('/api/reset-data', { method: 'POST' });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to reset demo data');
    }
  },
};
