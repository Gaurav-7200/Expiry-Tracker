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
      <div className="bg-white rounded-2xl p-6 border border-[#E8E3DA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCE8DF] text-[#26364A] text-xs font-semibold mb-1 border border-[#AEC7B4]">
            <Package className="w-3.5 h-3.5 text-[#C76B45]" /> Product Inventory Master
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-[#26364A] tracking-tight font-heading">
            Product Catalog & Pricing
          </h2>
          <p className="text-xs text-[#737B83] mt-0.5">
            Manage product metadata, selling prices, MRP, and view aggregated stock across all batches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => handleNavigateIntake()}
            className="px-4 py-2.5 bg-[#C76B45] hover:bg-[#B55D37] active:bg-[#C76B45] text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer font-heading"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-[#E8E3DA] shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[#737B83] absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name, barcode, or category..."
              className="w-full pl-9 pr-4 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-xs text-[#26364A] placeholder-[#737B83] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45] transition"
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
                    ? 'bg-[#26364A] text-white shadow-xs font-semibold'
                    : 'bg-[#F6F3EC] text-[#737B83] hover:text-[#26364A] hover:bg-[#E8E3DA]/60 border border-[#E8E3DA]'
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
                  ? 'bg-[#C76B45] text-white font-semibold shadow-xs'
                  : 'bg-[#F6F3EC] text-[#737B83] hover:text-[#26364A] hover:bg-[#E8E3DA]/60 border border-[#E8E3DA]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-[#E8E3DA] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F3EC] border-b border-[#E8E3DA] text-[#26364A] uppercase text-[11px] font-semibold font-heading">
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
            <tbody className="divide-y divide-[#E8E3DA]/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#737B83]">
                    No products match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  return (
                    <tr key={product.id} className="hover:bg-[#F6F3EC]/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              loading="lazy"
                              className="w-10 h-10 rounded-lg object-cover border border-[#E8E3DA] shrink-0 bg-[#F6F3EC] shadow-2xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg border border-[#E8E3DA] bg-[#F6F3EC] flex items-center justify-center text-[#26364A] font-bold text-xs shrink-0 font-heading">
                              {product.name ? product.name.charAt(0).toUpperCase() : 'P'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-[#26364A] text-sm truncate font-heading">{product.name}</div>
                            <div className="text-[#737B83] font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
                              <Barcode className="w-3.5 h-3.5 text-[#737B83]" />
                              <span>{product.barcode}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#F6F3EC] text-[#26364A] font-medium text-[11px] border border-[#E8E3DA]">
                          {product.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-[#26364A]">
                          {settings.currency}
                          {product.sellingPrice} <span className="font-normal text-[#737B83]">/ {product.unit}</span>
                        </div>
                        {product.mrp > product.sellingPrice && (
                          <div className="text-[10px] text-[#737B83] line-through">
                            MRP: {settings.currency}{product.mrp}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-extrabold text-sm ${
                              product.availableStock === 0
                                ? 'text-[#C75A54]'
                                : product.isLowStock
                                ? 'text-[#D99A38]'
                                : 'text-[#39845D]'
                            }`}
                          >
                            {product.availableStock} {product.unit}
                          </span>
                        </div>
                        {product.isLowStock && (
                          <span className="inline-block mt-0.5 text-[10px] text-[#D99A38] bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Reorder threshold: {product.reorderLevel}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setInspectProduct(product)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F6F3EC] hover:bg-[#E8E3DA] text-[#26364A] font-semibold text-[11px] transition cursor-pointer border border-[#E8E3DA]"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#737B83]" />
                          <span>{product.batchesCount} Batches</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        {product.earliestExpiry ? (
                          <div>
                            <div className="font-medium text-[#26364A]">
                              {product.earliestExpiry}
                            </div>
                            {product.daysUntilEarliestExpiry !== null && (
                              <span
                                className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  product.daysUntilEarliestExpiry < 0
                                    ? 'bg-[#C75A54]/15 text-[#C75A54] border border-[#C75A54]/30'
                                    : product.daysUntilEarliestExpiry <= 7
                                    ? 'bg-[#D99A38]/15 text-[#D99A38] border border-[#D99A38]/30'
                                    : product.daysUntilEarliestExpiry <= 30
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-[#DCE8DF] text-[#26364A] border border-[#AEC7B4]'
                                }`}
                              >
                                {product.daysUntilEarliestExpiry < 0
                                  ? 'Expired batch exists'
                                  : `In ${product.daysUntilEarliestExpiry} days`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#737B83]">No active batches</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleNavigateIntake(product.barcode)}
                            className="p-1.5 text-[#C76B45] hover:text-[#B55D37] hover:bg-[#FBF0EB] rounded-lg transition cursor-pointer"
                            title="Add stock / batch for this barcode"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            className="p-1.5 text-[#737B83] hover:text-[#26364A] hover:bg-[#F6F3EC] rounded-lg transition cursor-pointer"
                            title="Edit product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(product)}
                            className="p-1.5 text-[#737B83] hover:text-[#C75A54] hover:bg-[#C75A54]/10 rounded-lg transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#26364A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E8E3DA] shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#26364A] text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-heading">Edit Product Details</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-[#DCE8DF] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-[#C75A54]/10 border border-[#C75A54]/25 rounded-xl text-[#C75A54] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#C75A54]" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="font-semibold text-[#26364A] block mb-1">
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
                  className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg font-mono text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#26364A] block mb-1">Product Title *</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="e.g. Fortune Sunlite Refined Sunflower Oil"
                  className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26364A] block mb-1">Category *</label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#26364A] block mb-1">Unit *</label>
                  <select
                    value={modalUnit}
                    onChange={(e) => setModalUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
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
                  <label className="font-semibold text-[#26364A] block mb-1">
                    Pack Size Variant (Optional)
                  </label>
                  <input
                    type="text"
                    value={modalPackSize}
                    onChange={(e) => setModalPackSize(e.target.value)}
                    placeholder="e.g. 1 kg, 2 kg, 5 kg, 500 g, 1 L"
                    className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
                  />
                  <span className="text-[10px] text-[#737B83]">Retail packaging size shown in POS</span>
                </div>

                <div>
                  <label className="font-semibold text-[#26364A] block mb-1">
                    Product Family (Optional)
                  </label>
                  <select
                    value={modalParentProductId}
                    onChange={(e) => setModalParentProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
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
                  <span className="text-[10px] text-[#737B83]">Groups pack sizes under one card</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-[#26364A] block mb-1">
                    Selling Price ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={modalSellingPrice}
                    onChange={(e) => setModalSellingPrice(e.target.value)}
                    placeholder="145"
                    className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg font-bold text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#26364A] block mb-1">
                    MRP ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={modalMrp}
                    onChange={(e) => setModalMrp(e.target.value)}
                    placeholder="165"
                    className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#26364A] block mb-1">
                    Reorder Alert Level
                  </label>
                  <input
                    type="number"
                    value={modalReorderLevel}
                    onChange={(e) => setModalReorderLevel(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#26364A] block mb-1">
                  Description / Specification
                </label>
                <textarea
                  rows={2}
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  placeholder="Product description or packaging notes..."
                  className="w-full px-3 py-2 bg-[#F6F3EC]/50 border border-[#E8E3DA] rounded-lg text-[#26364A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B45]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#26364A] block mb-1">
                  Product Image (Optional)
                </label>
                <div className="flex items-center gap-3">
                  {modalImageUrl ? (
                    <div className="relative w-14 h-14 rounded-xl border border-[#E8E3DA] overflow-hidden bg-white shrink-0 shadow-2xs">
                      <img
                        src={modalImageUrl}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl border border-dashed border-[#E8E3DA] bg-[#F6F3EC] flex items-center justify-center text-[#737B83] shrink-0">
                      <ImageIcon className="w-6 h-6 text-[#737B83]/50" />
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F6F3EC] hover:bg-[#E8E3DA] active:bg-[#E8E3DA] text-[#26364A] text-xs font-semibold rounded-lg cursor-pointer border border-[#E8E3DA] transition shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#C76B45]" />
                      <span>{modalImageUrl ? 'Change photo' : 'Upload or take photo'}</span>
                    </label>
                    {modalImageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="block text-[11px] text-[#C75A54] hover:text-[#A7443E] font-semibold cursor-pointer"
                      >
                        Remove image
                      </button>
                    )}
                    <p className="text-[10px] text-[#737B83]">
                      Max 300px auto-resized JPEG
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8E3DA] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#F6F3EC] hover:bg-[#E8E3DA] text-[#26364A] font-medium transition cursor-pointer border border-[#E8E3DA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg font-bold transition shadow-xs bg-[#C76B45] hover:bg-[#B55D37] text-white cursor-pointer font-heading"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#26364A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#E8E3DA] shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#26364A] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-heading">{inspectProduct.name}</h3>
                <p className="text-xs text-[#DCE8DF]/80">
                  Barcode: {inspectProduct.barcode} • Total Stock: {inspectProduct.totalStock}{' '}
                  {inspectProduct.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="p-1 rounded text-[#DCE8DF] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#26364A] font-heading">
                  Individual Batches ({inspectProduct.batches.length})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const code = inspectProduct.barcode;
                    setInspectProduct(null);
                    handleNavigateIntake(code);
                  }}
                  className="text-xs font-semibold text-[#C76B45] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Stock Batch
                </button>
              </div>

              {inspectProduct.batches.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#737B83] bg-[#F6F3EC] rounded-xl border border-[#E8E3DA]">
                  No stock batches recorded yet for this product. Use "Stock Intake" to inward batches.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {inspectProduct.batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="p-3 bg-[#F6F3EC] rounded-xl border border-[#E8E3DA] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-[#26364A]">
                          {batch.batchNumber}
                        </div>
                        <div className="text-[11px] text-[#737B83] mt-0.5">
                          Purchased: {batch.purchaseDate} • Cost: {settings.currency}
                          {batch.purchasePrice} • Supplier: {batch.supplier || 'N/A'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-[#26364A]">
                          {batch.quantity} / {batch.initialQuantity} {inspectProduct.unit}
                        </div>
                        <div className="text-[11px] mt-0.5 font-medium text-[#737B83]">
                          Expiry: <span className="font-bold text-[#26364A]">{batch.expiryDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-[#F6F3EC] border-t border-[#E8E3DA] flex justify-end">
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="px-4 py-2 bg-white hover:bg-[#E8E3DA] text-[#26364A] rounded-lg text-xs font-semibold transition cursor-pointer border border-[#E8E3DA]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-[#26364A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#E8E3DA] shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-3 text-[#C75A54]">
              <div className="p-2.5 bg-[#C75A54]/15 rounded-full">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#26364A] font-heading">Confirm Deletion</h3>
            </div>
            <p className="text-[#737B83] leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-[#26364A]">"{deleteCandidate.name}"</span>?
              This will remove the product and all of its associated stock batches.
            </p>
            {deleteError && (
              <div className="p-2.5 bg-[#C75A54]/10 border border-[#C75A54]/25 rounded-lg text-[#C75A54] text-xs">
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
                className="px-4 py-2 bg-[#F6F3EC] hover:bg-[#E8E3DA] text-[#26364A] rounded-lg font-semibold transition cursor-pointer border border-[#E8E3DA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                className="px-4 py-2 bg-[#C75A54] hover:bg-[#A7443E] text-white rounded-lg font-semibold transition cursor-pointer"
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
