import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'stockwise-db.json');
const DEFAULT_SETTINGS = {
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
};
function getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function addDaysToDate(baseDateStr, days) {
    const d = new Date(baseDateStr);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function calculateDaysDifference(targetDateStr, baseDateStr) {
    const d1 = new Date(baseDateStr + 'T00:00:00');
    const d2 = new Date(targetDateStr + 'T00:00:00');
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
export class Database {
    data;
    constructor() {
        this.data = this.loadDatabase();
    }
    ensureDataDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    }
    loadDatabase() {
        this.ensureDataDir();
        if (fs.existsSync(DB_FILE)) {
            try {
                const raw = fs.readFileSync(DB_FILE, 'utf-8');
                const parsed = JSON.parse(raw);
                if (parsed.products && parsed.batches && parsed.sales && parsed.settings) {
                    return parsed;
                }
            }
            catch (err) {
                console.error('Failed reading DB file, reinitializing default seed:', err);
            }
        }
        const seeded = this.createInitialSeed();
        this.saveDatabase(seeded);
        return seeded;
    }
    saveDatabase(dataToSave = this.data) {
        this.ensureDataDir();
        const tempFile = `${DB_FILE}.tmp`;
        fs.writeFileSync(tempFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
        fs.renameSync(tempFile, DB_FILE);
    }
    resetToDefault() {
        this.data = this.createInitialSeed();
        this.saveDatabase();
    }
    createInitialSeed() {
        const today = getTodayString();
        const products = [
            {
                id: 'prod_1',
                barcode: '8901030383848',
                name: 'India Gate Basmati Rice Feast Rozzana',
                category: 'Grains & Flours',
                unit: 'kg',
                packSize: '1 kg pack',
                sellingPrice: 135,
                mrp: 155,
                reorderLevel: 15,
                description: 'Aged long-grain aromatic basmati rice for daily meals',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'prod_2',
                barcode: '8901725181222',
                name: 'Aashirvaad Shudh Chakki Atta (100% Whole Wheat)',
                category: 'Grains & Flours',
                unit: 'kg',
                packSize: '1 kg pack',
                sellingPrice: 48,
                mrp: 54,
                reorderLevel: 20,
                description: 'Stone ground whole wheat flour with natural dietary fiber',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'prod_3',
                barcode: '8901262010053',
                name: 'Amul Taaza Homogenised Toned Milk',
                category: 'Dairy & Eggs',
                unit: 'L',
                packSize: '1 L pack',
                sellingPrice: 72,
                mrp: 75,
                reorderLevel: 12,
                description: 'UHT treated long life toned milk 1 Liter pack',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'prod_4',
                barcode: '8901262020021',
                name: 'Amul Salted Pasteurized Butter',
                category: 'Dairy & Eggs',
                unit: 'pack',
                packSize: '500 g slab',
                sellingPrice: 285,
                mrp: 300,
                reorderLevel: 8,
                description: 'Rich creamy salted butter 500g slab',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'prod_5',
                barcode: '8901058852951',
                name: 'Fortune Sunlite Refined Sunflower Oil',
                category: 'Oils & Ghee',
                unit: 'L',
                packSize: '1 L bottle',
                sellingPrice: 145,
                mrp: 165,
                reorderLevel: 10,
                description: 'Light and healthy cooking oil rich in Vitamin E',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'prod_6',
                barcode: '8901063142054',
                name: 'Britannia 100% Whole Wheat Brown Bread',
                category: 'Bakery & Bread',
                unit: 'pack',
                packSize: '400 g loaf',
                sellingPrice: 50,
                mrp: 55,
                reorderLevel: 10,
                description: 'Fresh sliced brown bread loaf 400g with wheat bran',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'prod_7',
                barcode: '8901030012540',
                name: 'Brooke Bond Red Label Natural Care Tea',
                category: 'Beverages & Tea',
                unit: 'pack',
                packSize: '500 g pack',
                sellingPrice: 310,
                mrp: 340,
                reorderLevel: 8,
                description: 'Black tea infused with 5 Ayurvedic herbs 500g',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'prod_8',
                barcode: '8901058859103',
                name: 'Tata Sampann Unpolished Toor Dal',
                category: 'Pulses & Lentils',
                unit: 'kg',
                sellingPrice: 175,
                mrp: 195,
                reorderLevel: 12,
                description: 'Pure protein unpolished arhar toor dal',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'prod_9',
                barcode: '8901058863216',
                name: 'Maggi 2-Minute Masala Instant Noodles (4-Pack)',
                category: 'Snacks & Packaged',
                unit: 'pack',
                sellingPrice: 56,
                mrp: 60,
                reorderLevel: 15,
                description: 'Favorite masala instant noodles 280g value pack',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'prod_10',
                barcode: '8901030825416',
                name: 'Surf Excel Matic Top Load Liquid Detergent',
                category: 'Personal & Household',
                unit: 'L',
                sellingPrice: 220,
                mrp: 245,
                reorderLevel: 6,
                description: 'Tough stain removal liquid laundry detergent 1L bottle',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'prod_11',
                barcode: '8901725112349',
                name: 'Catch Super Garam Masala Powder',
                category: 'Spices & Condiments',
                unit: 'pack',
                sellingPrice: 85,
                mrp: 95,
                reorderLevel: 10,
                description: 'Aromatic roasted whole spice blend 100g carton',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'prod_12',
                barcode: '8902080004128',
                name: 'Farm Fresh Organic Brown Eggs (Tray of 12)',
                category: 'Dairy & Eggs',
                unit: 'box',
                sellingPrice: 130,
                mrp: 140,
                reorderLevel: 10,
                description: 'Free range, nutrient-rich brown eggs tray',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ];
        // Create batches with varied realistic dates relative to "today"
        // - Expired items (< today)
        // - Expiring in 2-6 days (<= 7 days)
        // - Expiring in 14-25 days (<= 30 days)
        // - Fresh items (60 - 365 days)
        const batches = [
            // Basmati Rice: 2 batches (1 fresh, 1 expiring in 25 days)
            {
                id: 'batch_1',
                productId: 'prod_1',
                batchNumber: 'RICE-2026-B1',
                initialQuantity: 40,
                quantity: 14,
                purchasePrice: 110,
                purchaseDate: addDaysToDate(today, -120),
                expiryDate: addDaysToDate(today, 25), // Expiring in 25 days (within 30)
                supplier: 'Agro Foods Distributors',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
            {
                id: 'batch_2',
                productId: 'prod_1',
                batchNumber: 'RICE-2026-B2',
                initialQuantity: 50,
                quantity: 48,
                purchasePrice: 112,
                purchaseDate: addDaysToDate(today, -20),
                expiryDate: addDaysToDate(today, 280), // Fresh
                supplier: 'Punjab Agro Direct',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
            // Wheat Atta: 2 batches (1 expiring in 6 days!, 1 fresh)
            {
                id: 'batch_3',
                productId: 'prod_2',
                batchNumber: 'ATTA-OCT-01',
                initialQuantity: 30,
                quantity: 8,
                purchasePrice: 38,
                purchaseDate: addDaysToDate(today, -80),
                expiryDate: addDaysToDate(today, 5), // Expiring in 5 days (within 7 days!)
                supplier: 'ITC Direct Supply',
                status: 'active',
                notes: 'Priority clearance on shelf 2',
                createdAt: new Date().toISOString(),
            },
            {
                id: 'batch_4',
                productId: 'prod_2',
                batchNumber: 'ATTA-NOV-02',
                initialQuantity: 60,
                quantity: 55,
                purchasePrice: 39,
                purchaseDate: addDaysToDate(today, -10),
                expiryDate: addDaysToDate(today, 90), // Fresh
                supplier: 'ITC Direct Supply',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
            // Amul Milk: 2 batches (1 EXPIRED 3 days ago, 1 expiring in 4 days)
            {
                id: 'batch_5',
                productId: 'prod_3',
                batchNumber: 'MILK-EXP-99',
                initialQuantity: 25,
                quantity: 5,
                purchasePrice: 58,
                purchaseDate: addDaysToDate(today, -95),
                expiryDate: addDaysToDate(today, -3), // EXPIRED 3 days ago!
                supplier: 'Gujarat Milk Federation',
                status: 'expired',
                notes: 'Hold for return / vendor credit memo',
                createdAt: new Date().toISOString(),
            },
            {
                id: 'batch_6',
                productId: 'prod_3',
                batchNumber: 'MILK-OCT-18',
                initialQuantity: 35,
                quantity: 22,
                purchasePrice: 59,
                purchaseDate: addDaysToDate(today, -30),
                expiryDate: addDaysToDate(today, 4), // Expiring in 4 days!
                supplier: 'Gujarat Milk Federation',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
            // Amul Butter: 1 batch (expiring in 18 days)
            {
                id: 'batch_7',
                productId: 'prod_4',
                batchNumber: 'BUTTER-B44',
                initialQuantity: 20,
                quantity: 6, // Low stock trigger
                purchasePrice: 240,
                purchaseDate: addDaysToDate(today, -60),
                expiryDate: addDaysToDate(today, 18), // Expiring in 18 days (within 30)
                supplier: 'Dairy Cold Chain Logistics',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
            // Fortune Sunflower Oil: 1 batch fresh
            {
                id: 'batch_8',
                productId: 'prod_5',
                batchNumber: 'OIL-2026-N1',
                initialQuantity: 40,
                quantity: 28,
                purchasePrice: 120,
                purchaseDate: addDaysToDate(today, -15),
                expiryDate: addDaysToDate(today, 210), // Fresh
                supplier: 'Adani Wilmar Agency',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
            // Britannia Brown Bread: 2 batches (1 EXPIRED yesterday, 1 expiring in 2 days!)
            {
                id: 'batch_9',
                productId: 'prod_6',
                batchNumber: 'BREAD-WK40',
                initialQuantity: 20,
                quantity: 4,
                purchasePrice: 38,
                purchaseDate: addDaysToDate(today, -6),
                expiryDate: addDaysToDate(today, -1), // EXPIRED yesterday!
                supplier: 'Daily Bakers Logistics',
                status: 'expired',
                notes: 'Damaged/Expired bread for scrap log',
                createdAt: new Date().toISOString(),
            },
            {
                id: 'batch_10',
                productId: 'prod_6',
                batchNumber: 'BREAD-WK41',
                initialQuantity: 25,
                quantity: 18,
                purchasePrice: 38,
                purchaseDate: addDaysToDate(today, -1),
                expiryDate: addDaysToDate(today, 2), // Expiring in 2 days (urgent within 7!)
                supplier: 'Daily Bakers Logistics',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
            // Red Label Tea: 1 batch fresh
            {
                id: 'batch_11',
                productId: 'prod_7',
                batchNumber: 'TEA-HUL-78',
                initialQuantity: 30,
                quantity: 19,
                purchasePrice: 250,
                purchaseDate: addDaysToDate(today, -45),
                expiryDate: addDaysToDate(today, 320), // Fresh
                supplier: 'Hindustan Unilever Depot',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
            // Tata Toor Dal: 1 batch (expiring in 12 days)
            {
                id: 'batch_12',
                productId: 'prod_8',
                batchNumber: 'DAL-TT-08',
                initialQuantity: 25,
                quantity: 7, // Low stock
                purchasePrice: 145,
                purchaseDate: addDaysToDate(today, -90),
                expiryDate: addDaysToDate(today, 12), // Expiring in 12 days (within 30)
                supplier: 'Tata Consumer Products',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
            // Maggi Noodles: 1 batch (fresh)
            {
                id: 'batch_13',
                productId: 'prod_9',
                batchNumber: 'MAGGI-NST-12',
                initialQuantity: 80,
                quantity: 62,
                purchasePrice: 44,
                purchaseDate: addDaysToDate(today, -20),
                expiryDate: addDaysToDate(today, 180), // Fresh
                supplier: 'Nestle India Distribution',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
            // Surf Excel Detergent: 1 batch (fresh)
            {
                id: 'batch_14',
                productId: 'prod_10',
                batchNumber: 'SURF-HUL-55',
                initialQuantity: 20,
                quantity: 14,
                purchasePrice: 175,
                purchaseDate: addDaysToDate(today, -30),
                expiryDate: addDaysToDate(today, 450), // Fresh
                supplier: 'Hindustan Unilever Depot',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
            // Catch Garam Masala: 1 batch (expiring in 28 days)
            {
                id: 'batch_15',
                productId: 'prod_11',
                batchNumber: 'MASALA-C22',
                initialQuantity: 25,
                quantity: 9, // Low stock
                purchasePrice: 65,
                purchaseDate: addDaysToDate(today, -110),
                expiryDate: addDaysToDate(today, 28), // Expiring in 28 days
                supplier: 'DS Group Spices',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
            // Organic Eggs: 1 batch expiring in 3 days!
            {
                id: 'batch_16',
                productId: 'prod_12',
                batchNumber: 'EGGS-TR-102',
                initialQuantity: 30,
                quantity: 12,
                purchasePrice: 95,
                purchaseDate: addDaysToDate(today, -4),
                expiryDate: addDaysToDate(today, 3), // Expiring in 3 days!
                supplier: 'Valley Organic Poultry Farm',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
        ];
        // Seed realistic previous sales (today and this week)
        const sales = [
            {
                id: 'sale_1',
                invoiceNumber: 'INV-20261012-0001',
                date: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
                customerName: 'Aarav Sharma',
                customerPhone: '+91 98231 09871',
                cashier: 'Pooja V.',
                paymentMethod: 'upi',
                subtotal: 620,
                discountTotal: 20,
                taxRate: 5,
                taxTotal: 30,
                grandTotal: 630,
                status: 'completed',
                items: [
                    {
                        productId: 'prod_1',
                        productName: 'India Gate Basmati Rice Feast Rozzana',
                        barcode: '8901030383848',
                        unit: 'kg',
                        quantity: 2,
                        sellingPrice: 135,
                        discount: 0,
                        total: 270,
                        batchAllocations: [
                            {
                                batchId: 'batch_1',
                                batchNumber: 'RICE-2026-B1',
                                quantity: 2,
                                expiryDate: addDaysToDate(today, 25),
                                purchasePrice: 110,
                            },
                        ],
                    },
                    {
                        productId: 'prod_4',
                        productName: 'Amul Salted Pasteurized Butter',
                        barcode: '8901262020021',
                        unit: 'pack',
                        quantity: 1,
                        sellingPrice: 285,
                        discount: 10,
                        total: 275,
                        batchAllocations: [
                            {
                                batchId: 'batch_7',
                                batchNumber: 'BUTTER-B44',
                                quantity: 1,
                                expiryDate: addDaysToDate(today, 18),
                                purchasePrice: 240,
                            },
                        ],
                    },
                    {
                        productId: 'prod_3',
                        productName: 'Amul Taaza Homogenised Toned Milk',
                        barcode: '8901262010053',
                        unit: 'L',
                        quantity: 1,
                        sellingPrice: 72,
                        discount: 0,
                        total: 72,
                        batchAllocations: [
                            {
                                batchId: 'batch_6',
                                batchNumber: 'MILK-OCT-18',
                                quantity: 1,
                                expiryDate: addDaysToDate(today, 4),
                                purchasePrice: 59,
                            },
                        ],
                    },
                ],
            },
            {
                id: 'sale_2',
                invoiceNumber: 'INV-20261012-0002',
                date: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
                customerName: 'Sneha Patel',
                customerPhone: '+91 97120 44552',
                cashier: 'Pooja V.',
                paymentMethod: 'cash',
                amountTendered: 500,
                changeReturned: 115,
                subtotal: 371,
                discountTotal: 5,
                taxRate: 5,
                taxTotal: 18.3,
                grandTotal: 384.3,
                status: 'completed',
                items: [
                    {
                        productId: 'prod_2',
                        productName: 'Aashirvaad Shudh Chakki Atta (100% Whole Wheat)',
                        barcode: '8901725181222',
                        unit: 'kg',
                        quantity: 5,
                        sellingPrice: 48,
                        discount: 0,
                        total: 240,
                        batchAllocations: [
                            {
                                batchId: 'batch_3',
                                batchNumber: 'ATTA-OCT-01',
                                quantity: 5,
                                expiryDate: addDaysToDate(today, 5),
                                purchasePrice: 38,
                            },
                        ],
                    },
                    {
                        productId: 'prod_9',
                        productName: 'Maggi 2-Minute Masala Instant Noodles (4-Pack)',
                        barcode: '8901058863216',
                        unit: 'pack',
                        quantity: 2,
                        sellingPrice: 56,
                        discount: 0,
                        total: 112,
                        batchAllocations: [
                            {
                                batchId: 'batch_13',
                                batchNumber: 'MAGGI-NST-12',
                                quantity: 2,
                                expiryDate: addDaysToDate(today, 180),
                                purchasePrice: 44,
                            },
                        ],
                    },
                ],
            },
        ];
        return {
            products,
            batches,
            sales,
            settings: { ...DEFAULT_SETTINGS },
            lastInvoiceSequence: 2,
        };
    }
    // --- Products Methods ---
    getProducts() {
        const today = getTodayString();
        return this.data.products.map((p) => {
            const productBatches = this.data.batches.filter((b) => b.productId === p.id);
            let totalStock = 0;
            let availableStock = 0;
            let expiredStock = 0;
            let nearExpiryStock = 0;
            let earliestExpiry = null;
            let hasExpiredBatches = false;
            let hasNearExpiryBatches = false;
            // Active non-depleted batches
            const activeBatches = productBatches.filter((b) => b.quantity > 0 && b.status !== 'disposed');
            // Sort by expiry
            activeBatches.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
            for (const b of productBatches) {
                totalStock += b.quantity;
                const days = calculateDaysDifference(b.expiryDate, today);
                if (days < 0 || b.status === 'expired') {
                    expiredStock += b.quantity;
                    hasExpiredBatches = true;
                }
                else {
                    availableStock += b.quantity;
                    if (days <= 30) {
                        nearExpiryStock += b.quantity;
                        hasNearExpiryBatches = true;
                    }
                }
            }
            // Earliest active valid batch expiry
            const validBatches = activeBatches.filter((b) => calculateDaysDifference(b.expiryDate, today) >= 0);
            if (validBatches.length > 0) {
                earliestExpiry = validBatches[0].expiryDate;
            }
            else if (activeBatches.length > 0) {
                earliestExpiry = activeBatches[0].expiryDate;
            }
            const daysUntilEarliestExpiry = earliestExpiry
                ? calculateDaysDifference(earliestExpiry, today)
                : null;
            return {
                ...p,
                totalStock,
                availableStock,
                expiredStock,
                nearExpiryStock,
                batchesCount: productBatches.length,
                batches: productBatches,
                earliestExpiry,
                daysUntilEarliestExpiry,
                isLowStock: availableStock <= p.reorderLevel,
                hasExpiredBatches,
                hasNearExpiryBatches,
            };
        });
    }
    getProductById(id) {
        return this.data.products.find((p) => p.id === id);
    }
    getProductByBarcode(barcode) {
        const list = this.getProducts();
        const cleanBarcode = barcode.trim();
        return list.find((p) => p.barcode === cleanBarcode);
    }
    createProduct(payload) {
        const cleanBarcode = payload.barcode.trim();
        const existing = this.data.products.find((p) => p.barcode === cleanBarcode);
        if (existing) {
            throw new Error(`A product with barcode "${cleanBarcode}" already exists: ${existing.name}`);
        }
        const newProduct = {
            ...payload,
            id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            barcode: cleanBarcode,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.data.products.push(newProduct);
        this.saveDatabase();
        return newProduct;
    }
    updateProduct(id, payload) {
        const index = this.data.products.findIndex((p) => p.id === id);
        if (index === -1) {
            throw new Error(`Product with ID ${id} not found.`);
        }
        if (payload.barcode) {
            const cleanBarcode = payload.barcode.trim();
            const duplicate = this.data.products.find((p) => p.barcode === cleanBarcode && p.id !== id);
            if (duplicate) {
                throw new Error(`Another product "${duplicate.name}" already uses barcode "${cleanBarcode}"`);
            }
            payload.barcode = cleanBarcode;
        }
        this.data.products[index] = {
            ...this.data.products[index],
            ...payload,
            updatedAt: new Date().toISOString(),
        };
        this.saveDatabase();
        return this.data.products[index];
    }
    deleteProduct(id) {
        const product = this.data.products.find((p) => p.id === id);
        if (!product) {
            throw new Error(`Product not found.`);
        }
        // Cascade delete batches
        this.data.products = this.data.products.filter((p) => p.id !== id);
        this.data.batches = this.data.batches.filter((b) => b.productId !== id);
        this.saveDatabase();
    }
    // --- Batches Methods ---
    getBatches() {
        const today = getTodayString();
        return this.data.batches.map((batch) => {
            const prod = this.data.products.find((p) => p.id === batch.productId);
            const daysUntilExpiry = calculateDaysDifference(batch.expiryDate, today);
            let expiryAlert = 'fresh';
            if (daysUntilExpiry < 0 || batch.status === 'expired') {
                expiryAlert = 'expired';
            }
            else if (daysUntilExpiry <= 7) {
                expiryAlert = 'urgent_7';
            }
            else if (daysUntilExpiry <= 30) {
                expiryAlert = 'warning_30';
            }
            return {
                ...batch,
                productName: prod ? prod.name : 'Unknown Product',
                barcode: prod ? prod.barcode : 'N/A',
                category: prod ? prod.category : 'Personal & Household',
                unit: prod ? prod.unit : 'pcs',
                sellingPrice: prod ? prod.sellingPrice : 0,
                daysUntilExpiry,
                expiryAlert,
            };
        });
    }
    getBatchesByProductId(productId) {
        return this.data.batches.filter((b) => b.productId === productId);
    }
    createBatch(payload) {
        const today = getTodayString();
        const daysUntilExpiry = calculateDaysDifference(payload.expiryDate, today);
        const initialStatus = daysUntilExpiry < 0 ? 'expired' : 'active';
        const newBatch = {
            ...payload,
            id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            status: payload.status || initialStatus,
            createdAt: new Date().toISOString(),
        };
        this.data.batches.push(newBatch);
        this.saveDatabase();
        return newBatch;
    }
    updateBatch(id, payload) {
        const index = this.data.batches.findIndex((b) => b.id === id);
        if (index === -1) {
            throw new Error(`Batch ${id} not found.`);
        }
        const today = getTodayString();
        const current = this.data.batches[index];
        const updated = { ...current, ...payload };
        if (payload.expiryDate) {
            const diff = calculateDaysDifference(updated.expiryDate, today);
            if (diff < 0 && updated.status === 'active') {
                updated.status = 'expired';
            }
        }
        if (updated.quantity <= 0 && updated.status === 'active') {
            updated.status = 'depleted';
        }
        this.data.batches[index] = updated;
        this.saveDatabase();
        return updated;
    }
    deleteBatch(id) {
        const exists = this.data.batches.some((b) => b.id === id);
        if (!exists) {
            throw new Error(`Batch not found.`);
        }
        this.data.batches = this.data.batches.filter((b) => b.id !== id);
        this.saveDatabase();
    }
    // Stock Receiving helper: receives new stock batch for an existing or new product
    receiveStock(payload) {
        const cleanBarcode = payload.barcode.trim();
        let product = this.data.products.find((p) => p.barcode === cleanBarcode);
        let isNewProduct = false;
        if (!product) {
            if (!payload.productDetails || !payload.productDetails.name) {
                throw new Error(`No existing product found with barcode "${cleanBarcode}". Please provide product details to create it.`);
            }
            product = this.createProduct({
                barcode: cleanBarcode,
                name: payload.productDetails.name,
                category: payload.productDetails.category || 'Grains & Flours',
                unit: payload.productDetails.unit || 'pcs',
                sellingPrice: Number(payload.productDetails.sellingPrice) || 0,
                mrp: Number(payload.productDetails.mrp) || Number(payload.productDetails.sellingPrice) || 0,
                reorderLevel: Number(payload.productDetails.reorderLevel) || 10,
                description: payload.productDetails.description || '',
            });
            isNewProduct = true;
        }
        if (payload.quantity <= 0) {
            throw new Error('Received quantity must be greater than zero.');
        }
        const today = getTodayString();
        const daysUntilExpiry = calculateDaysDifference(payload.expiryDate, today);
        const batch = this.createBatch({
            productId: product.id,
            batchNumber: payload.batchNumber.trim() || `BATCH-${Date.now().toString().slice(-6)}`,
            initialQuantity: Number(payload.quantity),
            quantity: Number(payload.quantity),
            purchasePrice: Number(payload.purchasePrice) || 0,
            purchaseDate: payload.purchaseDate || today,
            expiryDate: payload.expiryDate,
            supplier: payload.supplier || '',
            notes: payload.notes || '',
            status: daysUntilExpiry < 0 ? 'expired' : 'active',
        });
        return { product, batch, isNewProduct };
    }
    // --- Sales & Checkout Methods ---
    getSales() {
        return [...this.data.sales].sort((a, b) => b.date.localeCompare(a.date));
    }
    getSaleById(id) {
        return this.data.sales.find((s) => s.id === id);
    }
    checkoutSale(payload) {
        if (!payload.items || payload.items.length === 0) {
            throw new Error('Cart is empty. Please add items before checking out.');
        }
        const today = getTodayString();
        const processedItems = [];
        const batchUpdates = [];
        // Validate and calculate FIFO deduction
        for (const cartItem of payload.items) {
            const product = this.data.products.find((p) => p.id === cartItem.productId);
            if (!product) {
                throw new Error(`Product with ID "${cartItem.productId}" not found.`);
            }
            if (cartItem.quantity <= 0) {
                throw new Error(`Invalid quantity for ${product.name}. Must be at least 1.`);
            }
            // Find all available batches for this product
            // Only active batches that are not expired and have quantity > 0
            const candidateBatchesWithIndex = [];
            this.data.batches.forEach((b, idx) => {
                if (b.productId === product.id &&
                    b.quantity > 0 &&
                    b.status !== 'expired' &&
                    b.status !== 'disposed' &&
                    calculateDaysDifference(b.expiryDate, today) >= 0) {
                    candidateBatchesWithIndex.push({ batch: b, index: idx });
                }
            });
            // Sort by expiry date ascending (FEFO - First Expiring, First Out)
            candidateBatchesWithIndex.sort((a, b) => a.batch.expiryDate.localeCompare(b.batch.expiryDate));
            const totalAvailable = candidateBatchesWithIndex.reduce((sum, item) => sum + item.batch.quantity, 0);
            if (totalAvailable < cartItem.quantity) {
                throw new Error(`Insufficient stock for "${product.name}". Required: ${cartItem.quantity} ${product.unit}, Available unexpired: ${totalAvailable} ${product.unit}.`);
            }
            // Allocate from batches
            let remainingToDeduct = cartItem.quantity;
            const allocations = [];
            for (const item of candidateBatchesWithIndex) {
                if (remainingToDeduct <= 0)
                    break;
                const take = Math.min(item.batch.quantity, remainingToDeduct);
                const newQty = item.batch.quantity - take;
                remainingToDeduct -= take;
                allocations.push({
                    batchId: item.batch.id,
                    batchNumber: item.batch.batchNumber,
                    quantity: take,
                    expiryDate: item.batch.expiryDate,
                    purchasePrice: item.batch.purchasePrice,
                });
                batchUpdates.push({
                    batchIndex: item.index,
                    newQuantity: newQty,
                    newStatus: newQty === 0 ? 'depleted' : 'active',
                });
            }
            const itemDiscount = Number(cartItem.discount) || 0;
            const lineTotal = product.sellingPrice * cartItem.quantity - itemDiscount;
            processedItems.push({
                productId: product.id,
                productName: product.name,
                barcode: product.barcode,
                unit: product.unit,
                quantity: cartItem.quantity,
                sellingPrice: product.sellingPrice,
                discount: itemDiscount,
                total: Math.max(0, lineTotal),
                batchAllocations: allocations,
            });
        }
        // Apply batch updates
        for (const update of batchUpdates) {
            this.data.batches[update.batchIndex].quantity = update.newQuantity;
            this.data.batches[update.batchIndex].status = update.newStatus;
        }
        // Calculate totals
        const subtotal = processedItems.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
        const discountTotal = processedItems.reduce((sum, item) => sum + item.discount, 0);
        const taxableAmount = Math.max(0, subtotal - discountTotal);
        const taxRate = this.data.settings.taxEnabled ? this.data.settings.taxRate : 0;
        const taxTotal = parseFloat(((taxableAmount * taxRate) / 100).toFixed(2));
        const grandTotal = parseFloat((taxableAmount + taxTotal).toFixed(2));
        // Calculate change if cash
        let changeReturned = undefined;
        if (payload.paymentMethod === 'cash' && payload.amountTendered !== undefined) {
            if (payload.amountTendered < grandTotal) {
                throw new Error(`Amount tendered (${payload.amountTendered}) is less than grand total (${grandTotal}).`);
            }
            changeReturned = parseFloat((payload.amountTendered - grandTotal).toFixed(2));
        }
        // Generate unique invoice number
        this.data.lastInvoiceSequence = (this.data.lastInvoiceSequence || 0) + 1;
        const dateCode = today.replace(/-/g, '');
        const seqStr = String(this.data.lastInvoiceSequence).padStart(4, '0');
        const invoiceNumber = `INV-${dateCode}-${seqStr}`;
        const newSale = {
            id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            invoiceNumber,
            date: new Date().toISOString(),
            customerName: payload.customerName || 'Walk-in Customer',
            customerPhone: payload.customerPhone || '',
            items: processedItems,
            subtotal,
            discountTotal,
            taxRate,
            taxTotal,
            grandTotal,
            paymentMethod: payload.paymentMethod,
            amountTendered: payload.amountTendered,
            changeReturned,
            cashier: payload.cashier || 'Admin / Cashier',
            notes: payload.notes || '',
            status: 'completed',
        };
        this.data.sales.push(newSale);
        this.saveDatabase();
        return newSale;
    }
    // --- Dashboard Stats Methods ---
    getDashboardStats() {
        const today = getTodayString();
        const productsWithStock = this.getProducts();
        const batchesWithProduct = this.getBatches();
        const sales = this.getSales();
        let availableStock = 0;
        let lowStockCount = 0;
        for (const p of productsWithStock) {
            availableStock += p.availableStock;
            if (p.isLowStock) {
                lowStockCount++;
            }
        }
        // Expiry breakdown
        let expiredBatchesCount = 0;
        let expiringWithin7Count = 0;
        let expiringWithin30Count = 0;
        const urgentExpiryBatches = [];
        for (const b of batchesWithProduct) {
            if (b.quantity <= 0)
                continue; // skip depleted
            if (b.daysUntilExpiry < 0 || b.status === 'expired') {
                expiredBatchesCount++;
                urgentExpiryBatches.push(b);
            }
            else if (b.daysUntilExpiry <= 7) {
                expiringWithin7Count++;
                urgentExpiryBatches.push(b);
            }
            else if (b.daysUntilExpiry <= 30) {
                expiringWithin30Count++;
            }
        }
        // Sort urgent batches (expired first, then nearest expiry)
        urgentExpiryBatches.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
        // Sales stats
        let todaySalesCount = 0;
        let todayRevenue = 0;
        let totalRevenue = 0;
        for (const s of sales) {
            if (s.status === 'completed') {
                totalRevenue += s.grandTotal;
                const saleDateStr = s.date.slice(0, 10);
                if (saleDateStr === today) {
                    todaySalesCount++;
                    todayRevenue += s.grandTotal;
                }
            }
        }
        // Last 7 days breakdown
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const salesLast7Days = [];
        for (let i = 6; i >= 0; i--) {
            const dateStr = addDaysToDate(today, -i);
            const d = new Date(dateStr + 'T00:00:00');
            const dayName = dayNames[d.getDay()];
            let dayRev = 0;
            let dayOrders = 0;
            for (const s of sales) {
                if (s.status === 'completed' && s.date.slice(0, 10) === dateStr) {
                    dayRev += s.grandTotal;
                    dayOrders++;
                }
            }
            salesLast7Days.push({
                date: dateStr,
                dayName,
                revenue: parseFloat(dayRev.toFixed(2)),
                orders: dayOrders,
            });
        }
        // Category breakdown
        const catMap = new Map();
        for (const p of productsWithStock) {
            const prev = catMap.get(p.category) || { count: 0, totalStock: 0 };
            catMap.set(p.category, {
                count: prev.count + 1,
                totalStock: prev.totalStock + p.availableStock,
            });
        }
        const categoryBreakdown = Array.from(catMap.entries()).map(([category, val]) => ({
            category,
            count: val.count,
            totalStock: val.totalStock,
        }));
        return {
            totalProducts: this.data.products.length,
            availableStock,
            todaySalesCount,
            todayRevenue: parseFloat(todayRevenue.toFixed(2)),
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            lowStockCount,
            expiredBatchesCount,
            expiringWithin7Count,
            expiringWithin30Count,
            recentSales: sales.slice(0, 8),
            lowStockProducts: productsWithStock.filter((p) => p.isLowStock).slice(0, 10),
            urgentExpiryBatches: urgentExpiryBatches.slice(0, 15),
            salesLast7Days,
            categoryBreakdown,
        };
    }
    // --- Settings Methods ---
    getSettings() {
        return { ...this.data.settings };
    }
    updateSettings(payload) {
        this.data.settings = {
            ...this.data.settings,
            ...payload,
        };
        this.saveDatabase();
        return this.data.settings;
    }
}
export const db = new Database();
