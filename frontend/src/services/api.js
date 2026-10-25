const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function apiUrl(endpoint) {
  return `${API_BASE}${endpoint}`;
}

async function handleResponse(res) {
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed with status ${res.status}`);
  }
  return json.data;
}

export const api = {
  async getDashboardStats() {
    const res = await fetch(apiUrl('/api/dashboard/stats'));
    return handleResponse(res);
  },

  async getProducts() {
    const res = await fetch(apiUrl('/api/products'));
    return handleResponse(res);
  },

  async getProductByBarcode(barcode) {
    const res = await fetch(apiUrl(`/api/products/barcode/${encodeURIComponent(barcode)}`));
    return handleResponse(res);
  },

  async createProduct(data) {
    const res = await fetch(apiUrl('/api/products'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateProduct(id, data) {
    const res = await fetch(apiUrl(`/api/products/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteProduct(id) {
    const res = await fetch(apiUrl(`/api/products/${id}`), { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete product');
    }
  },

  async getBatches() {
    const res = await fetch(apiUrl('/api/batches'));
    return handleResponse(res);
  },

  async createBatch(data) {
    const res = await fetch(apiUrl('/api/batches'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateBatch(id, data) {
    const res = await fetch(apiUrl(`/api/batches/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteBatch(id) {
    const res = await fetch(apiUrl(`/api/batches/${id}`), { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete batch');
    }
  },

  async receiveStock(payload) {
    const res = await fetch(apiUrl('/api/batches/receive'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getSales() {
    const res = await fetch(apiUrl('/api/sales'));
    return handleResponse(res);
  },

  async getSaleById(id) {
    const res = await fetch(apiUrl(`/api/sales/${id}`));
    return handleResponse(res);
  },

  async checkout(payload) {
    const res = await fetch(apiUrl('/api/sales/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getSettings() {
    const res = await fetch(apiUrl('/api/settings'));
    return handleResponse(res);
  },

  async updateSettings(data) {
    const res = await fetch(apiUrl('/api/settings'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async resetData() {
    const res = await fetch(apiUrl('/api/reset-data'), { method: 'POST' });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to reset demo data');
    }
  },
};
