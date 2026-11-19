import React, { useState, useRef, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Layers,
  Barcode,
  AlertTriangle,
  Clock,
  CheckCircle,
  X,
  ExternalLink,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/audio';
import { resizeImageToDataUrl } from '../utils/image';

const CATEGORIES = [
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

const UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'box'];

export const ProductManagement = ({
  products,
  settings,
  onProductsUpdated,
  onNavigateToReceiving,
  onNavigateToIntake,
  initialEditProductId,
  onClearInitialEditProductId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('all');

  // Modal state - ONLY for editing existing products
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [modalBarcode, setModalBarcode] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalCategory, setModalCategory] = useState('Grains & Flours');
  const [modalUnit, setModalUnit] = useState('pcs');
  const [modalPackSize, setModalPackSize] = useState('');
  const [modalParentProductId, setModalParentProductId] = useState('');
  const [modalSellingPrice, setModalSellingPrice] = useState('');
  const [modalMrp, setModalMrp] = useState('');
  const [modalReorderLevel, setModalReorderLevel] = useState('10');
  const [modalDescription, setModalDescription] = useState('');
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalImageChanged, setModalImageChanged] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImageToDataUrl(file, 300, 0.8);
      setModalImageUrl(resized);
      setModalImageChanged(true);
    } catch (err) {
      console.warn('[ProductManagement] Image resize error:', err);
      setModalError('Could not process selected image. Please try another image.');
    }
  };

  const handleRemoveImage = () => {
    setModalImageUrl('');
    setModalImageChanged(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNavigateIntake = (barcode) => {
    if (onNavigateToIntake) {
      onNavigateToIntake(barcode);
    } else if (onNavigateToReceiving) {
      onNavigateToReceiving(barcode);
    }
  };

  // Open edit modal directly if initialEditProductId is provided
  useEffect(() => {
    if (initialEditProductId && products && products.length > 0) {
      const prodToEdit = products.find(
        (p) => String(p.id) === String(initialEditProductId) || String(p.barcode) === String(initialEditProductId)
      );
      if (prodToEdit) {
        openEditModal(prodToEdit);
      }
      if (onClearInitialEditProductId) {
        onClearInitialEditProductId();
      }
    }
  }, [initialEditProductId, products]);

  // View batches modal state
  const [inspectProduct, setInspectProduct] = useState(null);

  // Delete confirmation
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const cleanSearch = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !cleanSearch ||
      p.name.toLowerCase().includes(cleanSearch) ||
      p.barcode.includes(cleanSearch) ||
      p.category.toLowerCase().includes(cleanSearch);

    let matchesStock = true;
    if (stockFilter === 'in_stock') matchesStock = p.availableStock > 0;
    if (stockFilter === 'low_stock') matchesStock = p.isLowStock;
    if (stockFilter === 'out_of_stock') matchesStock = p.availableStock === 0;

    return matchesCat && matchesSearch && matchesStock;
  });

  const openEditModal = (product) => {
    setEditingProductId(product.id);
    setModalBarcode(product.barcode);
    setModalName(product.name);
    setModalCategory(product.category);
    setModalUnit(product.unit);
    setModalPackSize(product.packSize || '');
    setModalParentProductId(product.parentProductId || '');
    setModalSellingPrice(product.sellingPrice !== undefined ? product.sellingPrice.toString() : '');
    setModalMrp(product.mrp !== undefined ? product.mrp.toString() : '');
    setModalReorderLevel(product.reorderLevel !== undefined ? product.reorderLevel.toString() : '10');
    setModalDescription(product.description || '');
    setModalImageUrl(product.imageUrl || '');
    setModalImageChanged(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!modalName.trim() || !modalBarcode.trim()) {
      setModalError('Product Name and Barcode are required.');
      return;
    }

    const price = parseFloat(modalSellingPrice);
    if (isNaN(price) || price < 0) {
      setModalError('Selling Price must be a valid non-negative number.');
      return;
    }

    // Check duplicate barcode before submitting
    const cleanBarcode = modalBarcode.trim();
    const existingProduct = products.find(
      (p) => p.barcode === cleanBarcode && p.id !== editingProductId
    );
    if (existingProduct) {
      sounds.playErrorBuzz();
      setModalError(`Barcode "${cleanBarcode}" is already in use by "${existingProduct.name}". Please use a unique barcode.`);
      return;
    }

    setIsSaving(true);
    setModalError(null);

    try {
      const payload = {
        barcode: modalBarcode.trim(),
        name: modalName.trim(),
        category: modalCategory,
        unit: modalUnit,
        packSize: modalPackSize.trim(),
        parentProductId: modalParentProductId.trim(),
        sellingPrice: price,
        mrp: parseFloat(modalMrp) || price,
        reorderLevel: parseInt(modalReorderLevel) || 10,
        description: modalDescription.trim(),
      };

      if (modalImageChanged) {
        payload.imageUrl = modalImageUrl; // "" clears it; dataUrl updates it
      }

      if (editingProductId) {
        await api.updateProduct(editingProductId, payload);
      } else {
        if (modalImageUrl) payload.imageUrl = modalImageUrl;
        await api.createProduct(payload);
      }

      sounds.playSuccessChime();
      setIsModalOpen(false);
      onProductsUpdated();
    } catch (err) {
      sounds.playErrorBuzz();
      setModalError(err.message || 'Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const [deleteError, setDeleteError] = useState(null);

  const handleDeleteProduct = async () => {
    if (!deleteCandidate) return;

    setDeleteError(null);
    try {
      await api.deleteProduct(deleteCandidate.id);
      sounds.playSuccessChime();
      setDeleteCandidate(null);
      onProductsUpdated();
    } catch (err) {
      sounds.playErrorBuzz();
      setDeleteError(err.message || 'Failed to delete product');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-1 border border-emerald-200">
            <Package className="w-3.5 h-3.5" /> Product Inventory Master
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-stone-900 tracking-tight">
            Product Catalog & Pricing
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage product metadata, selling prices, MRP, and view aggregated stock across all batches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => handleNavigateIntake()}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name, barcode, or category..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 transition"
            />
          </div>

          {/* Stock status filter */}
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'All Stock' },
              { id: 'in_stock', label: 'In Stock' },
              { id: 'low_stock', label: 'Low Stock' },
              { id: 'out_of_stock', label: 'Out of Stock' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStockFilter(f.id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                  stockFilter === f.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Product & Barcode</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Selling Price / MRP</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4">Active Batches</th>
                <th className="py-3 px-4">Earliest Expiry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    No products match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  return (
                    <tr key={product.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              loading="lazy"
                              className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0 bg-stone-50 shadow-2xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg border border-stone-200 bg-stone-100 flex items-center justify-center text-stone-500 font-bold text-xs shrink-0">
                              {product.name ? product.name.charAt(0).toUpperCase() : 'P'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-stone-900 text-sm truncate">{product.name}</div>
                            <div className="text-stone-500 font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
                              <Barcode className="w-3.5 h-3.5 text-stone-400" />
                              <span>{product.barcode}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium text-[11px]">
                          {product.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-stone-900">
                          {settings.currency}
                          {product.sellingPrice} <span className="font-normal text-stone-500">/ {product.unit}</span>
                        </div>
                        {product.mrp > product.sellingPrice && (
                          <div className="text-[10px] text-stone-500">
                            MRP: {settings.currency}{product.mrp}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-extrabold text-sm ${
                              product.availableStock === 0
                                ? 'text-rose-700'
                                : product.isLowStock
                                ? 'text-amber-700'
                                : 'text-emerald-800'
                            }`}
                          >
                            {product.availableStock} {product.unit}
                          </span>
                        </div>
                        {product.isLowStock && (
                          <span className="inline-block mt-0.5 text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Reorder threshold: {product.reorderLevel}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setInspectProduct(product)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-[11px] transition cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-stone-500" />
                          <span>{product.batchesCount} Batches</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        {product.earliestExpiry ? (
                          <div>
                            <div className="font-medium text-stone-800">
                              {product.earliestExpiry}
                            </div>
                            {product.daysUntilEarliestExpiry !== null && (
                              <span
                                className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  product.daysUntilEarliestExpiry < 0
                                    ? 'bg-rose-100 text-rose-800'
                                    : product.daysUntilEarliestExpiry <= 7
                                    ? 'bg-amber-100 text-amber-800'
                                    : product.daysUntilEarliestExpiry <= 30
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                {product.daysUntilEarliestExpiry < 0
                                  ? 'Expired batch exists'
                                  : `In ${product.daysUntilEarliestExpiry} days`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400">No active batches</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleNavigateIntake(product.barcode)}
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Add stock / batch for this barcode"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                            title="Edit product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(product)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Edit Product Details</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Barcode (1D EAN / UPC / Code 128) *
                </label>
                <input
                  type="text"
                  required
                  value={modalBarcode}
                  onChange={(e) => {
                    setModalBarcode(e.target.value);
                    setModalError(null);
                  }}
                  placeholder="Product barcode"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Product Title *</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="e.g. Fortune Sunlite Refined Sunflower Oil"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Category *</label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Unit *</label>
                  <select
                    value={modalUnit}
                    onChange={(e) => setModalUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Pack Size Variant (Optional)
                  </label>
                  <input
                    type="text"
                    value={modalPackSize}
                    onChange={(e) => setModalPackSize(e.target.value)}
                    placeholder="e.g. 1 kg, 2 kg, 5 kg, 500 g, 1 L"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <span className="text-[10px] text-stone-500">Retail packaging size shown in POS</span>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Product Family (Optional)
                  </label>
                  <select
                    value={modalParentProductId}
                    onChange={(e) => setModalParentProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="">None (Independent Product)</option>
                    {products
                      .filter((p) => p.id !== editingProductId && !p.parentProductId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.packSize ? `(${p.packSize})` : ''}
                        </option>
                      ))}
                  </select>
                  <span className="text-[10px] text-stone-500">Groups pack sizes under one card</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Selling Price ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={modalSellingPrice}
                    onChange={(e) => setModalSellingPrice(e.target.value)}
                    placeholder="145"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    MRP ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={modalMrp}
                    onChange={(e) => setModalMrp(e.target.value)}
                    placeholder="165"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Reorder Alert Level
                  </label>
                  <input
                    type="number"
                    value={modalReorderLevel}
                    onChange={(e) => setModalReorderLevel(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Description / Specification
                </label>
                <textarea
                  rows={2}
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  placeholder="Product description or packaging notes..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Product Image (Optional)
                </label>
                <div className="flex items-center gap-3">
                  {modalImageUrl ? (
                    <div className="relative w-14 h-14 rounded-xl border border-stone-200 overflow-hidden bg-white shrink-0 shadow-2xs">
                      <img
                        src={modalImageUrl}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl border border-dashed border-stone-300 bg-stone-50 flex items-center justify-center text-stone-400 shrink-0">
                      <ImageIcon className="w-6 h-6 text-stone-300" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      id="edit-modal-image-upload"
                      className="hidden"
                    />
                    <label
                      htmlFor="edit-modal-image-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 text-xs font-semibold rounded-lg cursor-pointer border border-stone-300 transition shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{modalImageUrl ? 'Change photo' : 'Upload or take photo'}</span>
                    </label>
                    {modalImageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="block text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                      >
                        Remove image
                      </button>
                    )}
                    <p className="text-[10px] text-stone-400">
                      Max 300px auto-resized JPEG
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg font-bold transition shadow-xs bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Product Batches Drawer Modal */}
      {inspectProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{inspectProduct.name}</h3>
                <p className="text-xs text-stone-400">
                  Barcode: {inspectProduct.barcode} • Total Stock: {inspectProduct.totalStock}{' '}
                  {inspectProduct.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="p-1 rounded text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700">
                  Individual Batches ({inspectProduct.batches.length})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const code = inspectProduct.barcode;
                    setInspectProduct(null);
                    handleNavigateIntake(code);
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Stock Batch
                </button>
              </div>

              {inspectProduct.batches.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl">
                  No stock batches recorded yet for this product. Use "Stock Intake" to inward batches.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {inspectProduct.batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-stone-900">
                          {batch.batchNumber}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          Purchased: {batch.purchaseDate} • Cost: {settings.currency}
                          {batch.purchasePrice} • Supplier: {batch.supplier || 'N/A'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-stone-900">
                          {batch.quantity} / {batch.initialQuantity} {inspectProduct.unit}
                        </div>
                        <div className="text-[11px] mt-0.5 font-medium">
                          Expiry: <span className="font-bold">{batch.expiryDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-stone-200 shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-full">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-stone-900">Confirm Deletion</h3>
            </div>
            <p className="text-stone-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold">"{deleteCandidate.name}"</span>?
              This will remove the product and all of its associated stock batches.
            </p>
            {deleteError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                {deleteError}
              </div>
            )}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteCandidate(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition cursor-pointer"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
